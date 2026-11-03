"use client";

/**
 * A backend room's live state (seats, mic queue, admins…) for the room you're in.
 *
 * Loaded over REST once your join has gone through, then kept current from
 * /topic/voice-rooms/{id}/state. Each change you make answers with the new
 * state too, so your own taps show at once. Messages carry a version that
 * only goes up, so a late, older one never undoes a newer one.
 *
 * Everything is translated to the app's person ids: ME_ID for you,
 * "srv-user:<id>" for everyone else.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { isClosedNotice, readRoomState, roomStateApi, roomStateTopic, type RoomEvent, type RoomState } from "@/lib/api/room-state";
import { subscribe, useStompStatus } from "@/lib/realtime/stomp";
import { SERVER_USER_PREFIX, userPersonId } from "@/lib/app/server-rooms";
import { ME_ID } from "@/lib/app/store";

export type LiveRoomState = {
  ownerId: string;
  admins: string[];
  seats: (string | null)[];
  closedSeats: number[];
  mutedSeats: number[];
  micOrder: boolean;
  queue: { id: string; seat: number }[];
  open: boolean;
  /** Seat invites waiting for an answer; expiresAt is on this device's clock. */
  invites: { id: string; seat: number; by: string; expiresAt: number }[];
};

/** A change someone made, in person ids, for system lines and notices. */
export type LiveRoomEvent = Omit<RoomEvent, "actorId" | "targetId"> & { actorId?: string; targetId?: string };

export type RoomStateHook = {
  state: LiveRoomState | null;
  /** Calls the server; returns false (after onError) when it refused. */
  run: (action: (roomId: string) => Promise<RoomState>) => Promise<boolean>;
  /** Backend user id for a person id ("srv-user:12" → "12", ME_ID → yours). */
  userIdOf: (personId: string) => string | undefined;
};

export function useRoomState(
  serverRoomId: string | null,
  ready: boolean,
  myServerId: string | undefined,
  onEvent: (e: LiveRoomEvent) => void,
  onError: (message: string) => void,
  onClosed: () => void,
): RoomStateHook {
  const [raw, setRaw] = useState<RoomState | null>(null);
  const version = useRef(-1);
  /** Newest version whose event was already reported. */
  const reported = useRef(-1);
  /** Server clock minus this device's clock. */
  const offset = useRef(0);
  const stomp = useStompStatus();
  const handlers = useRef({ onEvent, onError, onClosed });
  handlers.current = { onEvent, onError, onClosed };
  const me = useRef(myServerId);
  me.current = myServerId;

  const toPerson = useCallback((userId: string) => (userId === me.current ? ME_ID : userPersonId(userId)), []);
  const userIdOf = useCallback(
    (personId: string) => (personId === ME_ID ? me.current : personId.startsWith(SERVER_USER_PREFIX) ? personId.slice(SERVER_USER_PREFIX.length) : undefined),
    [],
  );

  const apply = useCallback(
    (s: RoomState, fromBroadcast: boolean) => {
      // Events are reported from the broadcast only (your own action's answer carries the same one), once each
      const report = fromBroadcast && s.event && s.version > reported.current;
      if (report) reported.current = s.version;
      if (s.version >= version.current) {
        version.current = s.version;
        offset.current = s.serverTime - Date.now();
        setRaw(s);
      }
      if (report && s.event) {
        const e = s.event;
        handlers.current.onEvent({ ...e, actorId: e.actorId ? toPerson(e.actorId) : undefined, targetId: e.targetId ? toPerson(e.targetId) : undefined });
      }
    },
    [toPerson],
  );

  // A different room: start over
  useEffect(() => {
    version.current = -1;
    reported.current = -1;
    setRaw(null);
  }, [serverRoomId]);

  // Load once in the room, and again after the realtime connection comes back (changes may have been missed)
  useEffect(() => {
    if (!serverRoomId || !ready) return;
    let off = false;
    roomStateApi
      .get(serverRoomId)
      .then((s) => !off && apply(s, false))
      .catch(() => {
        /* the next change or reconnect loads it again */
      });
    return () => {
      off = true;
    };
  }, [serverRoomId, ready, stomp === "connected", apply]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live changes from everyone in the room. Listens for the whole visit, not only while voice is connected:
  // a kick drops the voice call first, and the "you were removed" message must still arrive.
  useEffect(() => {
    if (!serverRoomId) return;
    return subscribe(roomStateTopic(serverRoomId), (body) => {
      const s = readRoomState(body);
      if (!s || s.roomId !== serverRoomId) return;
      if (isClosedNotice(s)) {
        handlers.current.onClosed();
        return;
      }
      apply(s, true);
    });
  }, [serverRoomId, apply]);

  const run = useCallback(
    async (action: (roomId: string) => Promise<RoomState>) => {
      if (!serverRoomId) return false;
      try {
        apply(await action(serverRoomId), false);
        return true;
      } catch (e) {
        handlers.current.onError(e instanceof ApiError || e instanceof Error ? e.message : "That didn't work. Try again.");
        return false;
      }
    },
    [serverRoomId, apply],
  );

  const state = useMemo<LiveRoomState | null>(() => {
    if (!raw) return null;
    return {
      ownerId: toPerson(raw.ownerId),
      admins: raw.admins.map(toPerson),
      seats: raw.seats.map((u) => (u ? toPerson(u) : null)),
      closedSeats: raw.closedSeats,
      mutedSeats: raw.mutedSeats,
      micOrder: raw.micOrder,
      queue: raw.queue.map((q) => ({ id: toPerson(q.userId), seat: q.seat })),
      open: raw.open,
      invites: raw.invites.map((q) => ({ id: toPerson(q.userId), seat: q.seat, by: toPerson(q.byUserId), expiresAt: q.expiresAt - offset.current })),
    };
    // myServerId changes who "me" is
  }, [raw, toPerson, myServerId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, run, userIdOf };
}
