/**
 * Voice rooms (/api/v1/voice-rooms/*): list, details, create, join, leave, close.
 *
 * All calls go through the shared client (lib/api/client.ts), so they use the
 * configured backend URL, send the signed-in user's JWT, and turn errors into
 * safe messages. Leave and close answer 204 No Content; the client returns
 * null for an empty body, so nothing tries to parse JSON there.
 *
 * The backend's Java DTOs weren't available when this was written, so every
 * field is read defensively and the names this file accepts are listed in one
 * place (JOIN_FIELDS and ROOM_FIELDS). If the DTO uses another name, add it
 * there. A join answer without a server URL and a token is treated as an
 * error, never as a successful join.
 */
import { ApiError, api } from "./client";

export type VoiceRoomType = "VOICE" | "WATCH" | "KHARIDARI";
export const VOICE_ROOM_TYPES: VoiceRoomType[] = ["VOICE", "WATCH", "KHARIDARI"];

/** What POST /voice-rooms takes. Names match the backend's create DTO. */
export type CreateVoiceRoomRequest = {
  name: string;
  description?: string;
  roomType: VoiceRoomType;
  isPrivate: boolean;
  maxParticipants: number;
};

export const ROOM_NAME_MAX = 60;
export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 50;

export type VoiceRoom = {
  id: string;
  name: string;
  description?: string;
  roomType: VoiceRoomType;
  isPrivate: boolean;
  maxParticipants?: number;
  ownerId?: string;
  /** e.g. ACTIVE or CLOSED, as the backend sends it. */
  status?: string;
  createdAt?: string;
  /* Settings the owner or an admin chose (shared with everyone). */
  category?: string;
  coverTheme?: string;
  coverMotif?: string;
  coverImageUrl?: string;
  announcement?: string;
  /** The room is locked with a password (the password itself is never sent here). */
  hasPassword: boolean;
  /** Display and chat settings: background, banText, noImages, ... */
  settings: Record<string, unknown>;
  memberCount?: number;
  fanCount?: number;
  /** Room points from gifts (the room level comes from these). */
  points?: number;
};

/** What POST /voice-rooms/{id}/join returns: where and how to connect to LiveKit. */
export type JoinVoiceRoomResponse = {
  serverUrl: string;
  token: string;
  roomName?: string;
  ttlSeconds?: number;
};

/** Accepted JSON names for each join field, first match wins. */
export const JOIN_FIELDS = {
  serverUrl: ["serverUrl", "livekitUrl", "liveKitUrl", "livekitServerUrl", "url", "wsUrl"],
  token: ["token", "accessToken", "participantToken", "livekitToken"],
  roomName: ["roomName", "livekitRoomName", "liveKitRoomName"],
  ttlSeconds: ["tokenTtlSeconds", "ttlSeconds", "tokenTtl", "ttl", "expiresIn"],
} as const;

/** One person in a room, from GET /voice-rooms/{id}/participants (application data, not live connection state). */
export type VoiceRoomParticipant = {
  userId: string;
  /** Display name, when the backend sends one. Never invented. */
  name?: string;
  avatarUrl?: string;
  /** e.g. OWNER, ADMIN, SPEAKER, LISTENER, as the backend sends it. */
  role?: string;
  /** Muted by a moderator, as stored by the backend. */
  muted?: boolean;
  /** e.g. ACTIVE or LEFT, as the backend sends it. */
  status?: string;
  joinedAt?: string;
  /**
   * The participant's own VIP level and cosmetics, as the backend sends them for
   * this person (never the viewer's). null when they have none. Links are kept
   * only when they are https; anything else counts as missing.
   */
  vipLevel: number | null;
  badgeUrl: string | null;
  frameUrl: string | null;
  bubbleUrl: string | null;
  entryAnimationUrl: string | null;
};

/** What PATCH /voice-rooms/{id}/mute takes. */
export type MuteParticipantRequest = { userId: string | number; trackSid: string; muted: boolean };

/** Accepted JSON names for participant fields, first match wins. Add the backend's names here if they differ. */
export const PARTICIPANT_FIELDS = {
  userId: ["userId", "user_id", "participantId", "id"],
  name: ["displayName", "fullName", "name", "username", "userName", "nickname"],
  avatarUrl: ["avatarUrl", "avatar", "profileImageUrl", "photoUrl", "imageUrl"],
  role: ["role", "participantRole"],
  muted: ["muted", "isMuted"],
  status: ["status", "participantStatus"],
  joinedAt: ["joinedAt", "createdAt"],
} as const;

/** Only https links are used for pictures and animations. */
const httpsUrl = (v: unknown) => {
  const u = str(v);
  return u && /^https:\/\//i.test(u) ? u : null;
};
const vipLevelOf = (v: unknown) => {
  const n = num(v);
  return n !== undefined && Number.isInteger(n) && n >= 1 ? n : null;
};

/** Accepted JSON names for room fields that vary between DTO styles. */
export const ROOM_FIELDS = {
  isPrivate: ["isPrivate", "private", "privateRoom"],
  ownerId: ["ownerId", "ownerUserId", "createdBy", "hostId"],
  status: ["status", "roomStatus"],
} as const;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);
const firstOf = (r: Record<string, unknown>, keys: readonly string[]) => keys.map((k) => r[k]).find((v) => v !== undefined && v !== null);

function list(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const k of ["data", "content", "items", "rooms"]) {
      const v = d[k];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object" && Array.isArray((v as Record<string, unknown>).content)) return (v as Record<string, unknown>).content as unknown[];
    }
  }
  return [];
}

function one(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (d.id === undefined && d.data && typeof d.data === "object" && !Array.isArray(d.data)) return d.data as Record<string, unknown>;
  return d;
}

export function readRoomType(v: unknown): VoiceRoomType | undefined {
  const t = typeof v === "string" ? v.trim().toUpperCase() : "";
  return (VOICE_ROOM_TYPES as string[]).includes(t) ? (t as VoiceRoomType) : undefined;
}

export function readVoiceRoom(raw: unknown): VoiceRoom | null {
  const r = one(raw);
  if (!r) return null;
  const id = str(r.id);
  const name = str(r.name);
  if (!id || !name) return null;
  const priv = firstOf(r, ROOM_FIELDS.isPrivate);
  return {
    id,
    name,
    description: str(r.description),
    roomType: readRoomType(r.roomType ?? r.type) ?? "VOICE",
    isPrivate: priv === true || priv === "true",
    maxParticipants: num(r.maxParticipants ?? r.capacity),
    ownerId: str(firstOf(r, ROOM_FIELDS.ownerId)),
    status: str(firstOf(r, ROOM_FIELDS.status))?.toUpperCase(),
    createdAt: str(r.createdAt),
    category: str(r.category),
    coverTheme: str(r.coverTheme),
    coverMotif: str(r.coverMotif),
    coverImageUrl: httpsUrl(r.coverImageUrl) ?? undefined,
    announcement: str(r.announcement),
    hasPassword: r.hasPassword === true,
    settings: r.settings && typeof r.settings === "object" && !Array.isArray(r.settings) ? (r.settings as Record<string, unknown>) : {},
    memberCount: num(r.memberCount),
    fanCount: num(r.fanCount),
    points: num(r.points),
  };
}

export function readParticipant(raw: unknown): VoiceRoomParticipant | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  // A nested user object is common in Spring DTOs: { user: { id, fullName } }
  const u = r.user && typeof r.user === "object" ? (r.user as Record<string, unknown>) : {};
  const pick = (keys: readonly string[]) => firstOf(r, keys) ?? firstOf(u, keys);
  const userId = str(firstOf(r, PARTICIPANT_FIELDS.userId.filter((k) => k !== "id")) ?? u.id ?? r.id);
  if (!userId) return null;
  const muted = pick(PARTICIPANT_FIELDS.muted);
  const avatar = str(pick(PARTICIPANT_FIELDS.avatarUrl));
  return {
    vipLevel: vipLevelOf(r.vipLevel),
    badgeUrl: httpsUrl(r.badgeUrl),
    frameUrl: httpsUrl(r.frameUrl),
    bubbleUrl: httpsUrl(r.bubbleUrl),
    entryAnimationUrl: httpsUrl(r.entryAnimationUrl),
    userId,
    name: str(pick(PARTICIPANT_FIELDS.name)),
    // Only real web addresses are used as pictures
    avatarUrl: avatar && /^https:\/\//i.test(avatar) ? avatar : undefined,
    role: str(pick(PARTICIPANT_FIELDS.role))?.toUpperCase(),
    muted: muted === true || muted === "true" ? true : muted === false || muted === "false" ? false : undefined,
    status: str(pick(PARTICIPANT_FIELDS.status))?.toUpperCase(),
    joinedAt: str(pick(PARTICIPANT_FIELDS.joinedAt)),
  };
}

/** Participants who have left are not shown as in the room. */
export const isPresent = (p: VoiceRoomParticipant) => !p.status || !["LEFT", "REMOVED", "KICKED", "INACTIVE", "DISCONNECTED"].includes(p.status);

/** Closed rooms never show as active ones. */
export const isOpenRoom = (r: VoiceRoom) => !r.status || !["CLOSED", "ENDED", "INACTIVE", "DELETED"].includes(r.status);

function readJoin(raw: unknown): JoinVoiceRoomResponse {
  const r = one(raw) ?? {};
  const serverUrl = str(firstOf(r, JOIN_FIELDS.serverUrl));
  const token = str(firstOf(r, JOIN_FIELDS.token));
  if (!serverUrl || !token || !/^(wss?|https?):\/\//i.test(serverUrl)) {
    throw new ApiError("The server didn't send voice connection details. Try again in a moment.", 200, "http");
  }
  return { serverUrl, token, roomName: str(firstOf(r, JOIN_FIELDS.roomName)), ttlSeconds: num(firstOf(r, JOIN_FIELDS.ttlSeconds)) };
}

/** Name and capacity checks shared by the form and createRoom. Returns field → message. */
export function validateCreateRoom(p: CreateVoiceRoomRequest): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = p.name.trim();
  if (!name) errors.name = "Give your room a name";
  else if (name.length > ROOM_NAME_MAX) errors.name = `Keep the name under ${ROOM_NAME_MAX} characters`;
  if (!Number.isInteger(p.maxParticipants) || p.maxParticipants < MIN_PARTICIPANTS || p.maxParticipants > MAX_PARTICIPANTS)
    errors.maxParticipants = `Pick between ${MIN_PARTICIPANTS} and ${MAX_PARTICIPANTS} people`;
  if (!VOICE_ROOM_TYPES.includes(p.roomType)) errors.roomType = "Pick a room type";
  return errors;
}

const path = (id: string) => `/api/v1/voice-rooms/${encodeURIComponent(id)}`;

/** One list request at a time: callers that ask while one is running share it. */
let listInFlight: Promise<VoiceRoom[]> | null = null;

/**
 * GET with a documented path first and the path this app used before as the
 * fallback, only when the first answers 404/405 (the route doesn't exist). The
 * one that worked is remembered for the rest of the visit.
 */
const preferred: Record<string, string> = {};
async function getEither(key: string, primary: string, fallback: string): Promise<unknown> {
  const opts = { auth: true, forbiddenIsAccess: true } as const;
  if (preferred[key] === "fallback") return api<unknown>(fallback, opts);
  try {
    const d = await api<unknown>(primary, opts);
    preferred[key] = "primary";
    return d;
  } catch (e) {
    if (preferred[key] !== "primary" && e instanceof ApiError && (e.status === 404 || e.status === 405)) {
      const d = await api<unknown>(fallback, opts);
      preferred[key] = "fallback";
      return d;
    }
    throw e;
  }
}

/** Public rooms: GET /voice-rooms/public (falls back to GET /voice-rooms). */
export function getPublicRooms(): Promise<VoiceRoom[]> {
  listInFlight ??= getEither("list", "/api/v1/voice-rooms/public", "/api/v1/voice-rooms")
    .then((d) => list(d).map(readVoiceRoom).filter((r): r is VoiceRoom => r !== null && isOpenRoom(r)))
    .finally(() => {
      listInFlight = null;
    });
  return listInFlight;
}

export async function getRoomById(roomId: string): Promise<VoiceRoom> {
  const r = readVoiceRoom(await api<unknown>(path(roomId), { auth: true, forbiddenIsAccess: true }));
  if (!r) throw new ApiError("That room couldn't be loaded.", 200, "http");
  return r;
}

export async function createRoom(payload: CreateVoiceRoomRequest): Promise<VoiceRoom> {
  const errors = validateCreateRoom(payload);
  if (Object.keys(errors).length) throw new ApiError(Object.values(errors)[0], 400, "http", errors);
  const body: CreateVoiceRoomRequest = {
    name: payload.name.trim(),
    roomType: payload.roomType,
    isPrivate: payload.isPrivate,
    maxParticipants: payload.maxParticipants,
    ...(payload.description?.trim() ? { description: payload.description.trim() } : {}),
  };
  const r = readVoiceRoom(await api<unknown>("/api/v1/voice-rooms", { method: "POST", auth: true, body, forbiddenIsAccess: true }));
  if (!r) throw new ApiError("The room was created, but the server's answer couldn't be read. Refresh the room list.", 200, "http");
  return r;
}

/** Passwords entered this visit, per room, sent again when voice joins or reconnects. Never stored. */
const roomPasswords = new Map<string, string>();
export const rememberRoomPassword = (roomId: string, password: string) => roomPasswords.set(roomId, password);

export async function joinRoom(roomId: string): Promise<JoinVoiceRoomResponse> {
  const password = roomPasswords.get(roomId);
  return readJoin(await api<unknown>(`${path(roomId)}/join`, { method: "POST", auth: true, forbiddenIsAccess: true, body: password ? { password } : undefined }));
}

/* ---- Settings, password, cover, join and follow ---- */

/** Fields left out are not changed. password "" removes it; announcement "" clears it. */
export type RoomSettingsPatch = {
  name?: string;
  description?: string;
  category?: string;
  coverTheme?: string;
  coverMotif?: string;
  removeCoverImage?: boolean;
  announcement?: string;
  password?: string;
  settings?: Record<string, unknown>;
};

async function roomAnswer(p: Promise<unknown>): Promise<VoiceRoom> {
  const r = readVoiceRoom(await p);
  if (!r) throw new ApiError("The room's answer couldn't be read.", 200, "http");
  return r;
}

/** Owner and admins: change room settings. Everyone in the room gets the new version live. */
export const updateRoomSettings = (roomId: string, patch: RoomSettingsPatch) =>
  roomAnswer(api<unknown>(`${path(roomId)}/settings`, { method: "PATCH", auth: true, forbiddenIsAccess: true, body: patch }));

/** Owner and admins: upload a cover picture (JPG, PNG or WebP, up to 5 MB). */
export function uploadRoomCover(roomId: string, file: Blob): Promise<VoiceRoom> {
  const form = new FormData();
  form.append("file", file, "cover.jpg");
  return roomAnswer(api<unknown>(`${path(roomId)}/cover`, { method: "POST", auth: true, forbiddenIsAccess: true, body: form, timeoutMs: 60_000 }));
}

/** Owner and admins: the room's current password (null when there's none). */
export async function getRoomPassword(roomId: string): Promise<string | null> {
  const d = one(await api<unknown>(`${path(roomId)}/settings/private`, { auth: true, forbiddenIsAccess: true }));
  return d && typeof d.password === "string" ? d.password : null;
}

/** true when the password is right (and remembered for joining); false when wrong. */
export async function checkRoomPassword(roomId: string, password: string): Promise<boolean> {
  try {
    await api<unknown>(`${path(roomId)}/password-check`, { method: "POST", auth: true, forbiddenIsAccess: true, body: { password } });
    rememberRoomPassword(roomId, password);
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.status === 423) return false;
    throw e;
  }
}

export const setRoomMembership = (roomId: string, on: boolean) =>
  roomAnswer(api<unknown>(`${path(roomId)}/membership`, { method: on ? "PUT" : "DELETE", auth: true, forbiddenIsAccess: true }));

export const setRoomFollow = (roomId: string, on: boolean) =>
  roomAnswer(api<unknown>(`${path(roomId)}/follow`, { method: on ? "PUT" : "DELETE", auth: true, forbiddenIsAccess: true }));

/** Backend room ids you joined and follow. */
export async function getMyRoomRelations(): Promise<{ joined: string[]; followed: string[] }> {
  const d = one(await api<unknown>("/api/v1/voice-rooms/me/relations", { auth: true, forbiddenIsAccess: true }));
  const ids = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((x): x is string => Boolean(x)) : []);
  return { joined: ids(d?.joined), followed: ids(d?.followed) };
}

/** Live room updates (settings, member and fan counts): { roomId, room, event }. */
export const roomInfoTopic = (roomId: string) => `/topic/voice-rooms/${encodeURIComponent(roomId)}/info`;

export type RoomInfoMessage = { room: VoiceRoom; event?: { type: string; actorId?: string; changed: string[] } };

export function readRoomInfo(raw: unknown): RoomInfoMessage | null {
  const d = one(raw);
  const room = d ? readVoiceRoom(d.room) : null;
  if (!d || !room) return null;
  const ev = d.event && typeof d.event === "object" ? (d.event as Record<string, unknown>) : undefined;
  return {
    room,
    event: ev && typeof ev.type === "string"
      ? { type: ev.type, actorId: str(ev.actorId), changed: Array.isArray(ev.changed) ? ev.changed.filter((x): x is string => typeof x === "string") : [] }
      : undefined,
  };
}

export async function leaveRoom(roomId: string): Promise<void> {
  await api<unknown>(`${path(roomId)}/leave`, { method: "POST", auth: true, forbiddenIsAccess: true });
}

export async function closeRoom(roomId: string): Promise<void> {
  await api<unknown>(`${path(roomId)}/close`, { method: "POST", auth: true, forbiddenIsAccess: true });
}

export async function getParticipants(roomId: string): Promise<VoiceRoomParticipant[]> {
  const d = await api<unknown>(`${path(roomId)}/participants`, { auth: true, forbiddenIsAccess: true });
  return list(d).map(readParticipant).filter((p): p is VoiceRoomParticipant => p !== null && isPresent(p));
}

/** The backend's participant count (database records), not the number of people connected to LiveKit. */
export async function getParticipantCount(roomId: string): Promise<number> {
  // GET /voice-rooms/{id}/count (falls back to /participants/count)
  const d = await getEither("count", `${path(roomId)}/count`, `${path(roomId)}/participants/count`);
  const n = num(d) ?? (d && typeof d === "object" ? num(firstOf(d as Record<string, unknown>, ["count", "participantCount", "total", "data"])) : undefined);
  if (n === undefined) throw new ApiError("The participant count couldn't be read.", 200, "http");
  return n;
}

/** Owner/admin only: mute or unmute someone else's microphone track. Not for your own mic. */
export async function muteParticipant(roomId: string, body: MuteParticipantRequest): Promise<void> {
  await api<unknown>(`${path(roomId)}/mute`, { method: "PATCH", auth: true, body, forbiddenIsAccess: true });
}

/** A short, user-facing explanation for room errors (403/404/409 get their own wording). */
export function roomErrorText(e: unknown, action: "load" | "join" | "create" | "leave" | "close" | "participants" | "mute"): string {
  if (e instanceof ApiError) {
    if (e.code === "network" || e.code === "timeout" || e.code === "ngrok_interstitial" || e.code === "config" || e.code === "unauthorized") return e.message;
    if (e.status === 404) return "This room doesn't exist any more.";
    if (e.status === 423) return "This room needs the right password.";
    if (e.status === 409) return action === "close" ? "This room is already closed." : e.message;
    if (e.status === 403 || e.code === "forbidden")
      return action === "close"
        ? "Only the room's owner can close it."
        : action === "mute"
          ? "Only the owner or an admin can mute people."
          : action === "join" || action === "participants"
            ? "You don't have access to this room."
            : e.message;
    return e.message;
  }
  return "Something went wrong. Try again.";
}
