"use client";

/**
 * Rooms from the backend (/api/v1/voice-rooms), shown in the app next to the
 * sample rooms.
 *
 * - Loads the public room list (with loading, error and retry), maps each one
 *   to the app's Room shape and hands them to the app store, so the existing
 *   room cards, room screen and mini player work for them unchanged.
 * - The backend doesn't send participant counts, covers or categories. Counts
 *   stay at 0 and the cards show the capacity instead; cover, category and
 *   seat count you picked when creating a room are remembered on this device.
 * - Leaving a backend room calls POST /leave once (closing your own temporary
 *   room calls POST /close instead), then refreshes the list. The LiveKit
 *   connection itself is closed by the room screen (useLiveVoice).
 */
import type { VipProfileFields } from "@/lib/api/users";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { closeRoom, getPublicRooms, leaveRoom, roomErrorText, type VoiceRoom, type VoiceRoomType } from "@/lib/api/voice-rooms";
import { useMe } from "./me-store";
import { ME_ID, useApp } from "./store";
import type { Cover, CoverMotif, CoverTheme, Gender, NameFont, Room, RoomType } from "./types";
import type { AvatarLook } from "@/components/mock/Avatar";

const PREFS_KEY = "panchayat-server-room-prefs-v1";
/** Room ids in the app are prefixed so they never clash with the sample rooms. */
export const SERVER_ROOM_PREFIX = "srv-";
export const serverRoomAppId = (id: string) => `${SERVER_ROOM_PREFIX}${id}`;
/** The app's person id for a backend user, e.g. "srv-user:42". */
export const userPersonId = (userId: string) => `srv-user:${userId}`;
export const SERVER_USER_PREFIX = "srv-user:";
/** The person id for a room's owner, known only by backend id. */
export const ownerPersonId = (ownerId?: string) => userPersonId(ownerId ?? "unknown");
/**
 * The backend user id inside a LiveKit identity. The backend sets the identity
 * when it makes the token; both "42" and "user-42" are understood.
 */
export const identityUserId = (identity: string) => identity.replace(/^user[-_:]/i, "");

/** Names and pictures for backend users, from the participants API (or LiveKit), keyed by person id. */
/**
 * What the backend told us about a user: from room participants (name, picture)
 * and, once their profile is opened, GET /users/{id}/profile.
 */
export type ServerPerson = {
  name?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  nameFont?: NameFont;
  gender?: Gender;
  look?: Partial<AvatarLook>;
  /** VIP status and cosmetics from their public profile (GET /users/{id}/profile). Replaced on every load. */
  vip?: Partial<VipProfileFields>;
};
const PeopleCtx = createContext<Record<string, ServerPerson>>({});
/** Read-only lookup used by usePeople(). Empty outside the provider. */
export const useServerPeople = () => useContext(PeopleCtx);

/** What you picked on the create screen that the backend doesn't store. */
export type ServerRoomPrefs = { cover?: Cover; category?: string; seats?: number; permanent?: boolean };

const THEMES: CoverTheme[] = ["dusk", "rose", "gold", "night", "monsoon", "ember"];
const MOTIFS: CoverMotif[] = ["banyan", "lanterns", "temple", "river", "kites", "huts"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const APP_TYPE: Record<VoiceRoomType, RoomType> = { VOICE: "voice", WATCH: "watch", KHARIDARI: "kharidari" };
export const SERVER_TYPE: Record<RoomType, VoiceRoomType> = { voice: "VOICE", watch: "WATCH", kharidari: "KHARIDARI" };

/** The app's Room for a backend room. `myId` is the signed-in user's backend id, used to spot rooms you own. */
export function toAppRoom(v: VoiceRoom, myId: string | undefined, prefs: ServerRoomPrefs = {}): Room {
  const mine = Boolean(myId && v.ownerId && v.ownerId === myId);
  const h = hash(v.id);
  const host = mine ? ME_ID : ownerPersonId(v.ownerId);
  const numeric = /^\d+$/.test(v.id) ? v.id : String(100000 + (h % 900000));
  return {
    id: serverRoomAppId(v.id),
    code: numeric,
    name: v.name,
    topic: v.description ?? "",
    hostId: host,
    type: APP_TYPE[v.roomType],
    category: prefs.category ?? "Live",
    cover: prefs.cover ?? { theme: THEMES[h % THEMES.length], motif: MOTIFS[(h >> 3) % MOTIFS.length] },
    // No participant counts in the backend response: never invent one
    members: 0,
    seats: Math.max(2, Math.min(12, prefs.seats ?? Math.min(v.maxParticipants ?? 10, 10))),
    vip: false,
    live: true,
    isPrivate: v.isPrivate,
    permanent: prefs.permanent ?? true,
    basePoints: 0,
    seated: [host],
    createdByMe: mine,
    settings: { background: "brief" },
    server: { id: v.id, ownerId: v.ownerId, mine, status: v.status, description: v.description, maxParticipants: v.maxParticipants },
  };
}

type ListState = { status: "idle" | "loading" | "ready" | "error"; error: string; rooms: VoiceRoom[]; loadedAt: number };

type ServerRoomsValue = ListState & {
  refresh: () => Promise<void>;
  /** Remember create-screen choices for a room you just created. */
  rememberPrefs: (id: string, prefs: ServerRoomPrefs) => void;
  /** Add a room you just created without waiting for the next list load. */
  addCreated: (v: VoiceRoom) => void;
  /** The backend id of the signed-in user, when the profile has loaded. */
  myId?: string;
  /**
   * Owner only: POST /close for the room you're in, then leave it. Resolves
   * false (with an error toast) when the backend refused. This closes the room
   * in the backend; it does not by itself disconnect other people's LiveKit
   * calls, that depends on the backend.
   */
  closeActive: () => Promise<boolean>;
  closing: boolean;
  /** Remember names and pictures for backend users so every screen can show them. */
  rememberPeople: (people: Record<string, ServerPerson>) => void;
};

const Ctx = createContext<ServerRoomsValue | null>(null);

function readPrefs(): Record<string, ServerRoomPrefs> {
  try {
    const v = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}");
    return v && typeof v === "object" ? (v as Record<string, ServerRoomPrefs>) : {};
  } catch {
    return {};
  }
}

export function ServerRoomsProvider({ children }: { children: ReactNode }) {
  const { session, setServerRooms, activeRoomId, roomById, toast, leaveRoom: exitRoom } = useApp();
  const me = useMe();
  const myId = me.profile.data?.id !== undefined ? String(me.profile.data.id) : undefined;
  const [list, setList] = useState<ListState>({ status: "idle", error: "", rooms: [], loadedAt: 0 });
  const [prefs, setPrefs] = useState<Record<string, ServerRoomPrefs>>({});
  const signedIn = Boolean(session?.profileCompleted);

  useEffect(() => setPrefs(readPrefs()), []);

  const refresh = useCallback(async () => {
    setList((l) => ({ ...l, status: "loading", error: "" }));
    try {
      const rooms = await getPublicRooms();
      setList({ status: "ready", error: "", rooms, loadedAt: Date.now() });
    } catch (e) {
      setList((l) => ({ ...l, status: "error", error: roomErrorText(e, "load") }));
    }
  }, []);

  useEffect(() => {
    if (signedIn) void refresh();
  }, [signedIn, refresh]);

  const rememberPrefs = useCallback((id: string, p: ServerRoomPrefs) => {
    setPrefs((all) => {
      const next = { ...all, [id]: p };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: the room still works, it just looks default */
      }
      return next;
    });
  }, []);

  // Rooms kept even when the public list doesn't include them: ones you created
  // (private rooms never appear in it) and the room you're in, so a refresh
  // never pulls the room out from under you mid-call.
  const [pinned, setPinned] = useState<Record<string, VoiceRoom>>({});
  const addCreated = useCallback((v: VoiceRoom) => {
    setPinned((p) => ({ ...p, [v.id]: v }));
    setList((l) => ({ ...l, status: l.status === "idle" ? "ready" : l.status, rooms: [v, ...l.rooms.filter((r) => r.id !== v.id)] }));
  }, []);
  const activeServerId = activeRoomId?.startsWith(SERVER_ROOM_PREFIX) ? activeRoomId.slice(SERVER_ROOM_PREFIX.length) : null;
  useEffect(() => {
    if (!activeServerId) return;
    const v = list.rooms.find((r) => r.id === activeServerId);
    if (v) setPinned((p) => (p[v.id] === v ? p : { ...p, [v.id]: v }));
  }, [activeServerId, list.rooms]);
  const unpin = useCallback((id: string) => {
    setPinned((p) => {
      if (!(id in p)) return p;
      const next = { ...p };
      delete next[id];
      return next;
    });
  }, []);

  // Hand the mapped rooms to the app store
  const mapped = useMemo(() => {
    const extra = Object.values(pinned).filter((v) => !list.rooms.some((r) => r.id === v.id));
    return [...list.rooms, ...extra].map((v) => toAppRoom(v, myId, prefs[v.id]));
  }, [list.rooms, pinned, myId, prefs]);
  useEffect(() => setServerRooms(mapped), [mapped, setServerRooms]);

  // When you leave a backend room (the active room changes away from it), tell the backend once
  const prevActive = useRef<string | null>(null);
  const leaving = useRef(new Set<string>());
  /** Rooms just closed with closeActive: leaving them needs no /leave call. */
  const closed = useRef(new Set<string>());
  useEffect(() => {
    const prev = prevActive.current;
    prevActive.current = activeRoomId;
    if (!prev || prev === activeRoomId || !prev.startsWith(SERVER_ROOM_PREFIX)) return;
    const room = roomById(prev);
    const serverId = room?.server?.id ?? prev.slice(SERVER_ROOM_PREFIX.length);
    if (closed.current.delete(serverId)) {
      unpin(serverId);
      void refresh();
      return;
    }
    if (leaving.current.has(serverId)) return;
    leaving.current.add(serverId);
    // Your own temporary room closes when you leave it, as on the create screen
    const close = Boolean(room?.server?.mine && room.permanent === false);
    (close ? closeRoom(serverId) : leaveRoom(serverId))
      .then(() => {
        if (close) toast("Room closed");
        if (close || !room?.server?.mine) unpin(serverId);
      })
      .catch((e) => toast(roomErrorText(e, close ? "close" : "leave"), "error"))
      .finally(() => {
        leaving.current.delete(serverId);
        void refresh();
      });
  }, [activeRoomId, roomById, refresh, toast, unpin]);

  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeActive = useCallback(async () => {
    if (!activeServerId || closingRef.current) return false;
    closingRef.current = true;
    setClosing(true);
    try {
      await closeRoom(activeServerId);
      closed.current.add(activeServerId);
      toast("Room closed");
      exitRoom();
      return true;
    } catch (e) {
      toast(roomErrorText(e, "close"), "error");
      return false;
    } finally {
      closingRef.current = false;
      setClosing(false);
    }
  }, [activeServerId, toast, exitRoom]);

  const [people, setPeople] = useState<Record<string, ServerPerson>>({});
  const rememberPeople = useCallback((add: Record<string, ServerPerson>) => {
    setPeople((all) => {
      let changed = false;
      const next = { ...all };
      for (const [id, p] of Object.entries(add)) {
        const old = all[id];
        // Keep what's known when a later source doesn't have it
        const merged: ServerPerson = { ...old };
        for (const [k, v] of Object.entries(p)) if (v !== undefined) (merged as Record<string, unknown>)[k] = v;
        if (JSON.stringify(old ?? {}) !== JSON.stringify(merged)) {
          next[id] = merged;
          changed = true;
        }
      }
      return changed ? next : all;
    });
  }, []);

  const value = useMemo<ServerRoomsValue>(
    () => ({ ...list, refresh, rememberPrefs, addCreated, myId, closeActive, closing, rememberPeople }),
    [list, refresh, rememberPrefs, addCreated, myId, closeActive, closing, rememberPeople],
  );
  return (
    <Ctx.Provider value={value}>
      <PeopleCtx.Provider value={people}>{children}</PeopleCtx.Provider>
    </Ctx.Provider>
  );
}

export function useServerRooms() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useServerRooms must be used inside <ServerRoomsProvider>");
  return v;
}
