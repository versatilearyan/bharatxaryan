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
  };
}

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

export function getPublicRooms(): Promise<VoiceRoom[]> {
  listInFlight ??= api<unknown>("/api/v1/voice-rooms", { auth: true, forbiddenIsAccess: true })
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

export async function joinRoom(roomId: string): Promise<JoinVoiceRoomResponse> {
  return readJoin(await api<unknown>(`${path(roomId)}/join`, { method: "POST", auth: true, forbiddenIsAccess: true }));
}

export async function leaveRoom(roomId: string): Promise<void> {
  await api<unknown>(`${path(roomId)}/leave`, { method: "POST", auth: true, forbiddenIsAccess: true });
}

export async function closeRoom(roomId: string): Promise<void> {
  await api<unknown>(`${path(roomId)}/close`, { method: "POST", auth: true, forbiddenIsAccess: true });
}

/** A short, user-facing explanation for room errors (403/404/409 get their own wording). */
export function roomErrorText(e: unknown, action: "load" | "join" | "create" | "leave" | "close"): string {
  if (e instanceof ApiError) {
    if (e.code === "network" || e.code === "timeout" || e.code === "ngrok_interstitial" || e.code === "config" || e.code === "unauthorized") return e.message;
    if (e.status === 404) return "This room doesn't exist any more.";
    if (e.status === 409) return action === "close" ? "This room is already closed." : e.message;
    if (e.status === 403 || e.code === "forbidden")
      return action === "close" ? "Only the room's owner can close it." : action === "join" ? "You don't have access to this room." : e.message;
    return e.message;
  }
  return "Something went wrong. Try again.";
}
