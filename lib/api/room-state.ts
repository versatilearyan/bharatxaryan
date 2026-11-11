/**
 * Live room state from the backend: seats, mic order queue, closed and muted
 * seats, admins, kick and ban (/api/v1/voice-rooms/{id}/...).
 *
 * The server owns all of it and enforces the rules (including who may talk,
 * through LiveKit permissions). Every change answers with the new state and is
 * also broadcast to /topic/voice-rooms/{id}/state, so every phone in the room
 * shows the same seats.
 *
 * User ids here are the backend's ("12"), not the app's person ids.
 * A 403 from these calls is a refusal ("Only the owner or an admin…"), never a
 * reason to sign out, so every call sets forbiddenIsAccess.
 */
import { api } from "./client";

export type RoomEventType =
  | "NEWBIE_WELCOME"
  | "JOINED"
  | "LEFT"
  | "SEAT_TAKEN"
  | "SEAT_MOVED"
  | "SEAT_LEFT"
  | "MIC_REQUESTED"
  | "MIC_REQUEST_CANCELLED"
  | "MIC_APPROVED"
  | "MIC_DECLINED"
  | "MIC_ORDER"
  | "SEAT_CLOSED"
  | "SEAT_OPENED"
  | "SEAT_MUTED"
  | "SEAT_UNMUTED"
  | "SEAT_INVITED"
  | "SEAT_INVITE_ACCEPTED"
  | "SEAT_INVITE_DECLINED"
  | "SEAT_INVITE_CANCELLED"
  | "REMOVED_FROM_MIC"
  | "ADMIN_ADDED"
  | "ADMIN_REMOVED"
  | "KICKED"
  | "BANNED"
  | "UNBANNED";

export type RoomEvent = { type: RoomEventType; actorId?: string; targetId?: string; seat?: number; on?: boolean };

export type RoomState = {
  roomId: string;
  /** Only goes up: an older message arriving late is ignored. */
  version: number;
  ownerId: string;
  admins: string[];
  /** seats[i]: the user id on seat i, or null. Seat 0 is the owner's. */
  seats: (string | null)[];
  closedSeats: number[];
  mutedSeats: number[];
  micOrder: boolean;
  /** Waiting for a seat, oldest first. seat -1 = any seat. */
  queue: { userId: string; seat: number }[];
  /** The owner or an admin is in the room. */
  open: boolean;
  /** Seat invites waiting for an answer. expiresAt is on the server's clock (ms). */
  invites: { userId: string; seat: number; byUserId: string; expiresAt: number }[];
  /** The server's clock when this was sent (ms). */
  serverTime: number;
  event?: RoomEvent | null;
};

/** The server closed the room for good. */
export type RoomClosedNotice = { roomId: string; closed: true };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const id = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const ints = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0) : []);

/** Reads a state message or answer; null when it isn't one. */
export function readRoomState(raw: unknown): RoomState | RoomClosedNotice | null {
  const d = obj(raw);
  if (!d) return null;
  const roomId = id(d.roomId);
  if (!roomId) return null;
  if (d.closed === true) return { roomId, closed: true };
  if (!Array.isArray(d.seats) || typeof d.version !== "number") return null;
  const ev = obj(d.event);
  const type = typeof ev?.type === "string" ? (ev.type as RoomEventType) : undefined;
  return {
    roomId,
    version: d.version,
    ownerId: id(d.ownerId) ?? "",
    admins: Array.isArray(d.admins) ? d.admins.map(id).filter((x): x is string => Boolean(x)) : [],
    seats: d.seats.map((s) => id(s) ?? null),
    closedSeats: ints(d.closedSeats),
    mutedSeats: ints(d.mutedSeats),
    micOrder: d.micOrder === true,
    queue: Array.isArray(d.queue)
      ? d.queue.flatMap((q) => {
          const o = obj(q);
          const u = id(o?.userId);
          return u ? [{ userId: u, seat: typeof o?.seat === "number" ? o.seat : -1 }] : [];
        })
      : [],
    open: d.open === true,
    invites: Array.isArray(d.invites)
      ? d.invites.flatMap((q) => {
          const o = obj(q);
          const u = id(o?.userId);
          const by = id(o?.byUserId);
          return u && by && typeof o?.seat === "number" && typeof o?.expiresAt === "number" ? [{ userId: u, seat: o.seat, byUserId: by, expiresAt: o.expiresAt }] : [];
        })
      : [],
    serverTime: typeof d.serverTime === "number" ? d.serverTime : Date.now(),
    event: type ? { type, actorId: id(ev?.actorId), targetId: id(ev?.targetId), seat: typeof ev?.seat === "number" ? ev.seat : undefined, on: typeof ev?.on === "boolean" ? ev.on : undefined } : null,
  };
}

export const isClosedNotice = (s: RoomState | RoomClosedNotice): s is RoomClosedNotice => "closed" in s;

export const roomStateTopic = (roomId: string) => `/topic/voice-rooms/${encodeURIComponent(roomId)}/state`;

const base = (roomId: string) => `/api/v1/voice-rooms/${encodeURIComponent(roomId)}`;
const opts = { auth: true, forbiddenIsAccess: true } as const;

async function call(roomId: string, path: string, method: "GET" | "POST" | "PUT" | "DELETE" = "POST", body?: unknown): Promise<RoomState> {
  const raw = await api<unknown>(`${base(roomId)}${path}`, { ...opts, method, body });
  const s = readRoomState(raw);
  if (!s || isClosedNotice(s)) throw new Error("The room sent a reply the app couldn't read.");
  return s;
}

const n = (userId: string) => (/^\d+$/.test(userId) ? Number(userId) : userId);

export type RoomBanRow = { userId: string; name: string; avatarUrl?: string; expiresAt?: string | null; createdAt?: string };

export const roomStateApi = {
  /** Everyone who is blocked from the room right now (banned, or kicked for a while). Owner and admins only. */
  bans: async (roomId: string): Promise<RoomBanRow[]> => {
    const raw = await api<unknown>(`${base(roomId)}/bans`, { ...opts, method: "GET" });
    return Array.isArray(raw)
      ? raw.flatMap((x) => {
          const o = x && typeof x === "object" ? (x as Record<string, unknown>) : null;
          if (!o || o.userId == null) return [];
          return [{ userId: String(o.userId), name: typeof o.name === "string" ? o.name : "Someone", avatarUrl: typeof o.avatarUrl === "string" ? o.avatarUrl : undefined, expiresAt: typeof o.expiresAt === "string" ? o.expiresAt : null, createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined }];
        })
      : [];
  },
  get: (roomId: string) => call(roomId, "/state", "GET"),
  takeSeat: (roomId: string, seat: number) => call(roomId, `/seats/${seat}/take`),
  leaveSeat: (roomId: string) => call(roomId, "/seats/leave"),
  cancelMicRequest: (roomId: string) => call(roomId, "/mic-queue/cancel"),
  approveMicRequest: (roomId: string, userId: string) => call(roomId, `/mic-queue/${encodeURIComponent(userId)}/approve`),
  declineMicRequest: (roomId: string, userId: string) => call(roomId, `/mic-queue/${encodeURIComponent(userId)}/decline`),
  setMicOrder: (roomId: string, on: boolean) => call(roomId, "/mic-order", "PUT", { on }),
  setSeatClosed: (roomId: string, seat: number, on: boolean) => call(roomId, `/seats/${seat}/closed`, "PUT", { on }),
  setSeatMuted: (roomId: string, seat: number, on: boolean) => call(roomId, `/seats/${seat}/muted`, "PUT", { on }),
  inviteToSeat: (roomId: string, userId: string, seat?: number) => call(roomId, "/seats/invite", "POST", { userId: n(userId), seat }),
  acceptSeatInvite: (roomId: string) => call(roomId, "/seats/invite/accept"),
  declineSeatInvite: (roomId: string) => call(roomId, "/seats/invite/decline"),
  cancelSeatInvite: (roomId: string, userId: string) => call(roomId, "/seats/invite/cancel", "POST", { userId: n(userId) }),
  removeFromMic: (roomId: string, userId: string) => call(roomId, "/seats/remove", "POST", { userId: n(userId) }),
  setAdmin: (roomId: string, userId: string, on: boolean) => call(roomId, `/admins/${encodeURIComponent(userId)}`, "PUT", { on }),
  kick: (roomId: string, userId: string) => call(roomId, "/kick", "POST", { userId: n(userId) }),
  ban: (roomId: string, userId: string) => call(roomId, "/bans", "POST", { userId: n(userId) }),
  unban: (roomId: string, userId: string) => call(roomId, `/bans/${encodeURIComponent(userId)}`, "DELETE"),
};
