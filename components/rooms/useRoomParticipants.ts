"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getParticipantCount, getParticipants, getRoomById, isOpenRoom, roomErrorText, type VoiceRoomParticipant } from "@/lib/api/voice-rooms";
import { identityUserId, userPersonId, useServerRooms, type ServerPerson } from "@/lib/app/server-rooms";
import { ME_ID } from "@/lib/app/store";
import type { LiveVoice } from "./useLiveVoice";

/**
 * Who is in a backend room, from two sources that mean different things:
 *
 * - The participants API (GET /voice-rooms/{id}/participants and /count):
 *   application records with names, roles and the stored mute flag. A record
 *   doesn't prove someone is connected right now.
 * - LiveKit: who is connected to the call right now, their mic and speaking state.
 *
 * Both are merged into one list keyed by backend user id, so nobody appears
 * twice. The API is loaded when the room opens and again whenever LiveKit says
 * someone joined or left (no polling). Someone only LiveKit knows about still
 * gets a card, named from LiveKit or "User <id>".
 */
export type RoomMember = {
  /** Stable key and person id: ME_ID for you, "srv-user:<id>" for everyone else. */
  personId: string;
  userId: string;
  name?: string;
  avatarUrl?: string;
  /** Backend role, e.g. OWNER, ADMIN, LISTENER. */
  role?: string;
  /** In the participants API answer. */
  inBackend: boolean;
  /** Connected to the LiveKit call right now. */
  connected: boolean;
  micOn: boolean;
  speaking: boolean;
  /** The mic track SID, for a moderator mute. */
  micSid?: string;
  /** Muted by a moderator, as stored by the backend. */
  modMuted?: boolean;
  joinedAt?: string;
};

export type RoomParticipants = {
  status: "loading" | "ready" | "error";
  error: string;
  members: RoomMember[];
  /** From GET /participants/count: database records, not live connections. */
  count: number | null;
  /** People connected to the LiveKit call right now, you included. */
  connectedCount: number;
  /** Set when GET /voice-rooms/{id} says the room is no longer active. */
  roomClosed: boolean;
  refresh: () => void;
};

export function useRoomParticipants(serverRoomId: string | null, voice: LiveVoice | null, myId: string | undefined): RoomParticipants | null {
  const { rememberPeople } = useServerRooms();
  const [records, setRecords] = useState<VoiceRoomParticipant[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<RoomParticipants["status"]>("loading");
  const [error, setError] = useState("");
  const [roomClosed, setRoomClosed] = useState(false);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  // Room details once on open: a closed room says so instead of trying to look live
  useEffect(() => {
    if (!serverRoomId) return;
    let off = false;
    getRoomById(serverRoomId)
      .then((r) => !off && setRoomClosed(!isOpenRoom(r)))
      .catch(() => {
        /* the participants call below reports errors */
      });
    return () => {
      off = true;
    };
  }, [serverRoomId]);

  // Participants and count, first asked once our own join has gone through
  // (the backend records the join), and only the newest answer is used.
  const phase = !voice || voice.status === "connected" || voice.status === "reconnecting" ? "in" : voice.status === "error" || voice.status === "disconnected" ? "out" : "wait";
  useEffect(() => {
    if (!serverRoomId || phase === "wait") return;
    const mine = ++seq.current;
    Promise.allSettled([getParticipants(serverRoomId), getParticipantCount(serverRoomId)]).then(([list, n]) => {
      if (mine !== seq.current) return;
      if (list.status === "fulfilled") {
        setRecords(list.value);
        setStatus("ready");
        setError("");
      } else {
        setStatus("error");
        setError(roomErrorText(list.reason, "participants"));
      }
      setCount(n.status === "fulfilled" ? n.value : null);
    });
  }, [serverRoomId, tick, phase]);

  // Reload when LiveKit's set of connected people changes (someone joined or left)
  // (keyed on the set of identities only, so speaking or mic changes don't trigger a reload)
  const connectedKey = voice?.status === "connected" ? voice.people.map((p) => p.identity).sort().join("|") : "";
  const lastKey = useRef("");
  useEffect(() => {
    if (!serverRoomId || !connectedKey) return;
    const prev = lastKey.current;
    lastKey.current = connectedKey;
    if (!prev || prev === connectedKey) return;
    // Short wait so the backend has recorded the join or leave before we ask
    const t = window.setTimeout(() => setTick((n) => n + 1), 600);
    return () => window.clearTimeout(t);
  }, [connectedKey, serverRoomId]);

  const members = useMemo(() => {
    const byId = new Map<string, RoomMember>();
    const key = (userId: string) => (myId && userId === myId ? ME_ID : userPersonId(userId));
    for (const r of records) {
      byId.set(r.userId, {
        personId: key(r.userId),
        userId: r.userId,
        name: r.name,
        avatarUrl: r.avatarUrl,
        role: r.role,
        inBackend: true,
        connected: false,
        micOn: false,
        speaking: false,
        modMuted: r.muted,
        joinedAt: r.joinedAt,
      });
    }
    for (const p of voice?.people ?? []) {
      const userId = p.isLocal && myId ? myId : identityUserId(p.identity);
      const m = byId.get(userId);
      const live = { connected: true, micOn: p.micOn, speaking: p.speaking, micSid: p.micSid };
      // LiveKit's name is the fallback when the backend sent none (it is "User <identity>" from the SDK hook otherwise)
      const lkName = p.name && !p.name.startsWith("User ") ? p.name : undefined;
      if (m) byId.set(userId, { ...m, ...live, name: m.name ?? lkName });
      else byId.set(userId, { personId: p.isLocal ? ME_ID : key(userId), userId, name: lkName, inBackend: false, ...live });
    }
    return [...byId.values()].sort((a, b) => (a.joinedAt ?? "~").localeCompare(b.joinedAt ?? "~"));
  }, [records, voice?.people, myId]);

  // Share names and pictures with the rest of the app (seats, profile card, chat)
  useEffect(() => {
    const add: Record<string, ServerPerson> = {};
    for (const m of members) if (m.personId !== ME_ID && (m.name || m.avatarUrl)) add[m.personId] = { name: m.name, avatarUrl: m.avatarUrl };
    if (Object.keys(add).length) rememberPeople(add);
  }, [members, rememberPeople]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  if (!serverRoomId) return null;
  return { status, error, members, count, connectedCount: voice?.people.length ?? 0, roomClosed, refresh };
}
