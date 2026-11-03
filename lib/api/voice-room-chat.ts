/**
 * Voice-room text chat (VoiceRoomChatController and VoiceRoomChatWebSocketController).
 *
 *   REST  GET  /api/voice-rooms/{roomId}/chat?limit=50   → List<VoiceRoomChatMessageResponse> (recent, no pagination)
 *   STOMP SEND /app/voice-rooms/{roomId}/chat            { "message": "…" }
 *   STOMP SUB  /topic/voice-rooms/{roomId}/chat          → VoiceRoomChatMessageResponse per message
 *
 * Note the REST path has no /v1. The sender is the STOMP connection's
 * authenticated user; nothing about the sender is sent from here.
 *
 * VoiceRoomChatMessageResponse wasn't available here, so fields are read
 * defensively (names listed below). A message with no text is left out.
 */
import { api, ApiError } from "./client";

export const ROOM_CHAT_HISTORY_LIMIT = 50;
export const ROOM_CHAT_MAX = 300;

export type RoomChatMessage = {
  /** A stable key: the server's id, or (when it sends none) sender + time + text. */
  key: string;
  id?: string;
  roomId?: string;
  senderId?: string;
  senderName?: string;
  text: string;
  createdAt?: string;
  at: number;
};

export const ROOM_CHAT_FIELDS = {
  id: ["id", "messageId"],
  roomId: ["roomId", "voiceRoomId"],
  senderId: ["senderId", "senderUserId", "userId", "authorId"],
  senderName: ["senderName", "senderFullName", "userName", "fullName", "displayName"],
  text: ["message", "content", "text"],
  createdAt: ["createdAt", "sentAt", "timestamp"],
} as const;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const first = (d: Obj, keys: readonly string[]) => {
  for (const k of keys) {
    const v = str(d[k]);
    if (v !== undefined) return v;
  }
  return undefined;
};

export function readRoomChat(raw: unknown): RoomChatMessage | null {
  const d = obj(raw);
  if (!d) return null;
  const text = typeof d.message === "string" ? d.message : typeof d.content === "string" ? d.content : typeof d.text === "string" ? d.text : undefined;
  if (!text || !text.trim()) return null;
  const sender = obj(d.sender) ?? obj(d.user);
  const id = first(d, ROOM_CHAT_FIELDS.id);
  const senderId = first(d, ROOM_CHAT_FIELDS.senderId) ?? (sender ? str(sender.id) : undefined);
  const createdAt = first(d, ROOM_CHAT_FIELDS.createdAt);
  return {
    key: id ? `id:${id}` : `x:${senderId ?? "?"}|${createdAt ?? "?"}|${text}`,
    id,
    roomId: first(d, ROOM_CHAT_FIELDS.roomId),
    senderId,
    senderName: first(d, ROOM_CHAT_FIELDS.senderName) ?? (sender ? first(sender, ["fullName", "name", "displayName"]) : undefined),
    text,
    createdAt,
    at: createdAt ? Date.parse(createdAt) : NaN,
  };
}

const byTime = (a: RoomChatMessage, b: RoomChatMessage) => {
  const ta = Number.isFinite(a.at) ? a.at : 0;
  const tb = Number.isFinite(b.at) ? b.at : 0;
  if (ta !== tb) return ta - tb;
  const na = Number(a.id);
  const nb = Number(b.id);
  return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : 0;
};

/** The room's recent messages, oldest first. */
export async function getRoomChatHistory(roomId: string, limit = ROOM_CHAT_HISTORY_LIMIT): Promise<RoomChatMessage[]> {
  const n = Math.min(Math.max(Math.floor(limit), 1), 200);
  const body = await api<unknown>(`/api/voice-rooms/${encodeURIComponent(roomId)}/chat?limit=${n}`, { auth: true, forbiddenIsAccess: true });
  if (!Array.isArray(body)) throw new ApiError("The server sent the room chat in a shape the app couldn't read.", 200, "http");
  return body
    .map(readRoomChat)
    .filter((m): m is RoomChatMessage => m !== null)
    .sort(byTime);
}

/** POST /api/voice-rooms/{roomId}/chat: send a line over plain HTTP (when the live connection is reconnecting). */
export async function sendRoomChatHttp(roomId: string, message: string): Promise<RoomChatMessage | null> {
  const body = await api<unknown>(`/api/voice-rooms/${encodeURIComponent(roomId)}/chat`, { method: "POST", auth: true, forbiddenIsAccess: true, body: { message } });
  return readRoomChat(body);
}

export const roomChatTopic = (roomId: string) => `/topic/voice-rooms/${encodeURIComponent(roomId)}/chat`;
export const roomChatSend = (roomId: string) => `/app/voice-rooms/${encodeURIComponent(roomId)}/chat`;
