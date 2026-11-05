"use client";

import { subscribe } from "@/lib/realtime/stomp";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getParticipantCount, getParticipants, getRoomById, isOpenRoom, roomErrorText, type VoiceRoomParticipant } from "@/lib/api/voice-rooms";
import { identityUserId, userPersonId, useServerRooms, type ServerPerson } from "@/lib/app/server-rooms";
import { ME_ID } from "@/lib/app/store";
import { onSync } from "@/lib/app/sync";
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
 *
 * Cosmetics come only from the participants API. Switching rooms clears the
 * previous room's records at once, and only the newest answer is ever used,
 * so a slow older answer can't bring back a cosmetic someone took off. After
 * you change your cosmetics or profile the list is loaded again; after your
 * join goes through the public room list is refreshed (its counts change).
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
  /** This person's own VIP level and cosmetics from their participants record (absent until it loads). */
  vip?: Pick<VoiceRoomParticipant, "vipLevel" | "badgeUrl" | "frameUrl" | "bubbleUrl" | "entryAnimationUrl" | "rewardEffects">;
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

export function useRoomParticipants(serverRoomId: string | null, voice: LiveVoice | null, myIdIn: string | undefined): RoomParticipants | null {
  const { rememberPeople, refresh: refreshRoomList } = useServerRooms();
  // Your backend id: from GET /users/me, or else your own LiveKit identity, so you never appear twice while /users/me loads
  const localIdentity = voice?.people.find((p) => p.isLocal)?.identity;
  const myId = myIdIn ?? (localIdentity ? identityUserId(localIdentity) : undefined);
  const [records, setRecords] = useState<VoiceRoomParticipant[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<RoomParticipants["status"]>("loading");
  const [error, setError] = useState("");
  const [roomClosed, setRoomClosed] = useState(false);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const lastKey = useRef("");

  // A different room (or none): forget the last room's people, count and state before anything else renders
  const [shownRoom, setShownRoom] = useState(serverRoomId);
  if (shownRoom !== serverRoomId) {
    setShownRoom(serverRoomId);
    setRecords([]);
    setCount(null);
    setStatus("loading");
    setError("");
    setRoomClosed(false);
  }
  useEffect(() => {
    seq.current++; // answers still on their way for the previous room are ignored
    lastKey.current = "";
  }, [serverRoomId]);

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

  // Once per room, when your join has gone through: the public list's counts changed
  const joinedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!serverRoomId || !voice || voice.status !== "connected" || joinedFor.current === serverRoomId) return;
    joinedFor.current = serverRoomId;
    void refreshRoomList();
  }, [serverRoomId, voice, refreshRoomList]);

  // You wore or took off a cosmetic, or changed your profile: load the list again (the backend's record for you changed)
  useEffect(() => (serverRoomId ? onSync(["my-cosmetics", "my-profile"], () => setTick((n) => n + 1)) : undefined), [serverRoomId]);
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

  // Someone joined, left or was removed: the server says so on the room's state channel.
  // Reload at once (this works even when voice isn't connected), and every 20 s as a backstop.
  useEffect(() => {
    if (!serverRoomId) return;
    let t: number | undefined;
    const un = subscribe(`/topic/voice-rooms/${serverRoomId}/state`, (body) => {
      const ev = (body as { event?: { type?: string } } | null)?.event?.type;
      if (ev && /^(JOINED|LEFT|KICKED|BANNED|REMOVED)$/.test(ev)) {
        window.clearTimeout(t);
        t = window.setTimeout(() => setTick((n) => n + 1), 300);
      }
    });
    const poll = window.setInterval(() => setTick((n) => n + 1), 20_000);
    return () => {
      un();
      window.clearTimeout(t);
      window.clearInterval(poll);
    };
  }, [serverRoomId]);

  // Reload when LiveKit's set of connected people changes (someone joined or left)
  // (keyed on the set of identities only, so speaking or mic changes don't trigger a reload)
  const connectedKey = voice?.status === "connected" ? voice.people.map((p) => p.identity).sort().join("|") : "";
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
        vip: { vipLevel: r.vipLevel, badgeUrl: r.badgeUrl, frameUrl: r.frameUrl, bubbleUrl: r.bubbleUrl, entryAnimationUrl: r.entryAnimationUrl, rewardEffects: r.rewardEffects },
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
