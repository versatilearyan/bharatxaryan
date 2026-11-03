/**
 * Private one-to-one chat (ChatController, /api/v1/chat):
 *
 *   POST /conversations                              { recipientUserId } → conversation
 *   GET  /conversations                              → your conversations
 *   GET  /conversations/{id}/messages?page=&size=    → Spring Page<ChatMessageResponse>, newest first
 *   POST /conversations/{id}/messages                { message } → ChatMessageResponse
 *   POST /conversations/{id}/messages/image          multipart "file" (≤ 5 MB) → { messageId, conversationId, messageType, createdAt, imageUrl }
 *   GET  /conversations/{id}/messages/{mid}/image    → the image bytes (auth, no-store)
 *   POST /conversations/{id}/read                    → { conversationId, markedAsRead, updatedCount }
 *   GET  /unread-count                               → { unreadCount }
 *
 * All through the shared client with the signed-in user's JWT; the sender is
 * always the token's user, so no sender id is ever sent.
 *
 * The Java DTOs weren't available here. Rows are read defensively and every
 * accepted field name is listed below; anything else is left out, never
 * invented. Check these against ConversationResponse / ChatMessageResponse.
 */
import { api, ApiError, API_BASE_URL } from "./client";
import { authHeader, readToken } from "@/lib/auth/token";

export const CHAT_PAGE_SIZE = 30;
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CHAT_TEXT_MAX = 1000;

export type ChatMessage = {
  id: string;
  conversationId: string;
  /** The sender's user id, when the server sends it. */
  senderId?: string;
  /** TEXT, IMAGE, … as the server sends it (upper-case). */
  type: string;
  text?: string;
  imageUrl?: string;
  createdAt?: string;
  /** ms since epoch from createdAt, for ordering; NaN when unknown. */
  at: number;
  read?: boolean;
};

export type ChatConversation = {
  id: string;
  /** The other person's user id, when it can be told from the response. */
  otherUserId?: string;
  otherName?: string;
  otherAvatarUrl?: string;
  /** Preview text, only when the server sends it. */
  lastMessage?: string;
  lastMessageType?: string;
  lastAt?: string;
  unreadCount?: number;
  /** DIRECT (two people) or GROUP. For groups otherName is the group's name. */
  kind: "DIRECT" | "GROUP";
  memberCount?: number;
  /** Your role in a group: OWNER, ADMIN or MEMBER. */
  myRole?: "OWNER" | "ADMIN" | "MEMBER";
  /** You muted this chat (no alerts). */
  muted?: boolean;
  /** Direct chats: you blocked them / they blocked you (no messages either way). */
  blockedByMe?: boolean;
  blockedMe?: boolean;
  /** Direct chats: the other person has the app open. */
  otherOnline?: boolean;
  otherPublicId?: string;
  lastSenderId?: string;
};

export type ChatPage = { messages: ChatMessage[]; page: number; last: boolean };

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const first = (d: Obj, keys: string[]) => {
  for (const k of keys) {
    const v = str(d[k]);
    if (v !== undefined) return v;
  }
  return undefined;
};

/** Accepted names (first match wins). */
export const MESSAGE_FIELDS = {
  id: ["id", "messageId"],
  conversationId: ["conversationId"],
  senderId: ["senderId", "senderUserId", "fromUserId", "userId"],
  text: ["message", "content", "text", "body"],
  type: ["messageType", "type"],
  imageUrl: ["imageUrl"],
  createdAt: ["createdAt", "sentAt", "timestamp"],
} as const;

export function readMessage(raw: unknown, fallbackConversationId?: string): ChatMessage | null {
  const d = obj(raw);
  if (!d) return null;
  const id = first(d, [...MESSAGE_FIELDS.id]);
  const conversationId = first(d, [...MESSAGE_FIELDS.conversationId]) ?? fallbackConversationId;
  if (!id || !conversationId) return null;
  const sender = obj(d.sender);
  const createdAt = first(d, [...MESSAGE_FIELDS.createdAt]);
  const imageUrl = first(d, [...MESSAGE_FIELDS.imageUrl]);
  const type = (first(d, [...MESSAGE_FIELDS.type]) ?? (imageUrl ? "IMAGE" : "TEXT")).toUpperCase();
  const read = typeof d.read === "boolean" ? d.read : typeof d.isRead === "boolean" ? d.isRead : "readAt" in d ? d.readAt != null : undefined;
  return {
    id,
    conversationId,
    senderId: first(d, [...MESSAGE_FIELDS.senderId]) ?? (sender ? str(sender.id) : undefined),
    type,
    text: first(d, [...MESSAGE_FIELDS.text]),
    imageUrl,
    createdAt,
    at: createdAt ? Date.parse(createdAt) : NaN,
    read,
  };
}

/** Oldest first; ties (or unknown times) by numeric id. */
export function byTime(a: ChatMessage, b: ChatMessage) {
  const ta = Number.isFinite(a.at) ? a.at : Infinity;
  const tb = Number.isFinite(b.at) ? b.at : Infinity;
  if (ta !== tb) return ta - tb;
  const na = Number(a.id);
  const nb = Number(b.id);
  return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.id.localeCompare(b.id);
}

/** Merge messages by id (newer copies win) and sort oldest first. */
export function mergeMessages(list: ChatMessage[], add: ChatMessage[]): ChatMessage[] {
  const map = new Map(list.map((m) => [m.id, m]));
  for (const m of add) map.set(m.id, { ...map.get(m.id), ...m });
  return [...map.values()].sort(byTime);
}

const ID_PAIRS: [string, string][] = [
  ["user1Id", "user2Id"],
  ["userAId", "userBId"],
  ["participantOneId", "participantTwoId"],
  ["firstUserId", "secondUserId"],
  ["senderId", "recipientId"],
];

/** The other person in a conversation row. `myId` excludes you when the row lists both people. */
export function readConversation(raw: unknown, myId?: string): ChatConversation | null {
  const d = obj(raw);
  if (!d) return null;
  const id = first(d, ["id", "conversationId"]);
  if (!id) return null;
  const nested = obj(d.otherUser) ?? obj(d.otherParticipant) ?? obj(d.participant) ?? obj(d.recipient) ?? obj(d.peer);
  let otherUserId = first(d, ["otherUserId", "otherParticipantId", "participantId", "recipientUserId", "recipientId", "peerUserId"]) ?? (nested ? str(nested.id) ?? str(nested.userId) : undefined);
  let other = nested;
  if (!otherUserId && myId) {
    // A list of both people: pick the one that isn't you
    const list = Array.isArray(d.participants) ? d.participants : Array.isArray(d.participantIds) ? d.participantIds : null;
    if (list) {
      for (const p of list) {
        const o = obj(p);
        const pid = o ? str(o.id) ?? str(o.userId) : str(p);
        if (pid && pid !== myId) {
          otherUserId = pid;
          other = o;
          break;
        }
      }
    }
    for (const [a, b] of ID_PAIRS) {
      if (otherUserId) break;
      const x = str(d[a]);
      const y = str(d[b]);
      if (x && y) otherUserId = x === myId ? y : y === myId ? x : undefined;
    }
  }
  const lastObj = obj(d.lastMessage);
  const last = lastObj ? readMessage(lastObj, id) : null;
  const unread = typeof d.unreadCount === "number" && Number.isFinite(d.unreadCount) ? Math.max(0, Math.floor(d.unreadCount)) : undefined;
  return {
    id,
    otherUserId,
    otherName: first(d, ["otherUserName", "otherName", "recipientName", "otherFullName"]) ?? (other ? first(other, ["fullName", "name", "displayName"]) : undefined),
    otherAvatarUrl: first(d, ["otherUserAvatarUrl", "otherAvatarUrl"]) ?? (other ? first(other, ["avatarUrl", "profileImageUrl"]) : undefined),
    lastMessage: last ? (last.type === "IMAGE" ? "📷 Photo" : last.text) : first(d, ["lastMessage", "lastMessagePreview", "lastMessageText"]),
    lastMessageType: last?.type ?? first(d, ["lastMessageType"])?.toUpperCase(),
    lastAt: last?.createdAt ?? first(d, ["lastMessageAt", "lastMessageTime", "updatedAt"]),
    unreadCount: unread,
    kind: d.kind === "GROUP" ? "GROUP" : "DIRECT",
    memberCount: typeof d.memberCount === "number" ? d.memberCount : undefined,
    myRole: d.myRole === "OWNER" || d.myRole === "ADMIN" || d.myRole === "MEMBER" ? d.myRole : undefined,
    muted: d.muted === true,
    blockedByMe: d.blockedByMe === true,
    blockedMe: d.blockedMe === true,
    otherOnline: d.otherOnline === true,
    otherPublicId: str(d.otherPublicId),
    lastSenderId: str(d.lastSenderId),
  };
}

const conv = (id: string) => `/api/v1/chat/conversations/${encodeURIComponent(id)}`;
const asId = (id: string) => (/^\d+$/.test(id) ? Number(id) : id);

export async function createConversation(recipientUserId: string, myId?: string): Promise<ChatConversation> {
  const r = readConversation(await api<unknown>("/api/v1/chat/conversations", { method: "POST", auth: true, body: { recipientUserId: asId(recipientUserId) } }), myId);
  if (!r) throw new ApiError("The server didn't send back a conversation.", 200, "http");
  // The response may not say who the other person is; we know it
  return { ...r, otherUserId: r.otherUserId ?? recipientUserId };
}

export async function getConversations(myId?: string): Promise<ChatConversation[]> {
  const body = await api<unknown>("/api/v1/chat/conversations", { auth: true });
  const rows = Array.isArray(body) ? body : Array.isArray(obj(body)?.content) ? (obj(body)!.content as unknown[]) : null;
  if (!rows) throw new ApiError("The server sent your chats in a shape the app couldn't read.", 200, "http");
  const seen = new Set<string>();
  return rows.map((r) => readConversation(r, myId)).filter((c): c is ChatConversation => c !== null && !seen.has(c.id) && Boolean(seen.add(c.id)));
}

/**
 * One page of history (page 0 = newest). Reads Spring's Page JSON
 * (content, last / number / totalPages) or the newer PagedModel
 * (content, page: { number, totalPages }).
 */
export async function getMessages(conversationId: string, page = 0, size = CHAT_PAGE_SIZE): Promise<ChatPage> {
  const s = Math.min(Math.max(size, 1), 100);
  const body = obj(await api<unknown>(`${conv(conversationId)}/messages?page=${page}&size=${s}`, { auth: true }));
  if (!body || !Array.isArray(body.content)) throw new ApiError("The server sent messages in a shape the app couldn't read.", 200, "http");
  const meta = obj(body.page) ?? body;
  const number = typeof meta.number === "number" ? meta.number : page;
  const totalPages = typeof meta.totalPages === "number" ? meta.totalPages : undefined;
  const last = typeof body.last === "boolean" ? body.last : totalPages !== undefined ? number + 1 >= totalPages : body.content.length < s;
  const messages = (body.content as unknown[]).map((r) => readMessage(r, conversationId)).filter((m): m is ChatMessage => m !== null);
  return { messages: messages.sort(byTime), page: number, last };
}

export async function sendTextMessage(conversationId: string, text: string): Promise<ChatMessage | null> {
  return readMessage(await api<unknown>(`${conv(conversationId)}/messages`, { method: "POST", auth: true, body: { message: text } }), conversationId);
}

/** Checks a picked file before upload (the server checks again). Returns an error message, or "". */
export function checkChatImage(file: File): string {
  if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return "Pick a JPG, PNG, WebP or GIF image.";
  if (file.size > CHAT_IMAGE_MAX_BYTES) return "That image is over 5 MB. Pick a smaller one.";
  if (file.size === 0) return "That file is empty.";
  return "";
}

export async function sendImageMessage(conversationId: string, file: File, myId?: string): Promise<ChatMessage | null> {
  const form = new FormData();
  form.append("file", file);
  const body = obj(await api<unknown>(`${conv(conversationId)}/messages/image`, { method: "POST", auth: true, body: form, timeoutMs: 60_000 }));
  const m = readMessage(body, conversationId);
  return m ? { ...m, type: m.type || "IMAGE", senderId: m.senderId ?? myId } : null;
}

/** The image's bytes through the protected endpoint. */
export async function fetchChatImage(conversationId: string, messageId: string, signal?: AbortSignal): Promise<Blob> {
  const t = readToken();
  if (!t) throw new ApiError("Your session has ended. Please sign in again.", 401, "unauthorized");
  const res = await fetch(`${API_BASE_URL}${conv(conversationId)}/messages/${encodeURIComponent(messageId)}/image`, { headers: { ...authHeader(t), "ngrok-skip-browser-warning": "true" }, cache: "no-store", signal });
  if (!res.ok) throw new ApiError(res.status === 404 ? "This image isn't available." : res.status === 403 ? "You can't see this image." : "Couldn't load the image.", res.status, res.status === 401 ? "unauthorized" : "http");
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) throw new ApiError("Couldn't load the image.", res.status, "http");
  return blob;
}

export type ReadResult = { conversationId: string; markedAsRead: boolean; updatedCount: number };

export async function markConversationRead(conversationId: string): Promise<ReadResult> {
  const d = obj(await api<unknown>(`${conv(conversationId)}/read`, { method: "POST", auth: true })) ?? {};
  return { conversationId: str(d.conversationId) ?? conversationId, markedAsRead: d.markedAsRead === true, updatedCount: typeof d.updatedCount === "number" ? d.updatedCount : 0 };
}

export async function getUnreadCount(): Promise<number> {
  const d = obj(await api<unknown>("/api/v1/chat/unread-count", { auth: true }));
  const n = d?.unreadCount;
  if (typeof n !== "number" || !Number.isFinite(n)) throw new ApiError("The server sent the unread count in a shape the app couldn't read.", 200, "http");
  return Math.max(0, Math.floor(n));
}

/** A short message for a chat error. */
export function chatErrorText(e: unknown, action: "load" | "send" | "image" | "open"): string {
  if (e instanceof ApiError) {
    if (e.code === "network" || e.code === "timeout" || e.code === "unauthorized" || e.code === "config" || e.code === "ngrok_interstitial") return e.message;
    if (e.status === 413) return "That image is too big. Pick one under 5 MB.";
    if (e.status === 403) return action === "open" ? "You can't message this person." : "You're not part of this chat.";
    if (e.status === 404) return action === "open" ? "This person couldn't be found." : "This chat doesn't exist any more.";
    if (e.status === 429) return "You're sending too fast. Wait a moment.";
    if (e.status === 400 && e.message) return e.message;
    if (e.status >= 500) return action === "load" ? "Couldn't load messages. The server had a problem." : "The server had a problem. Try again.";
    if (e.message) return e.message;
  }
  return action === "send" || action === "image" ? "Couldn't send. Try again." : "Couldn't load. Try again.";
}

/* ---------------- groups, mute, block, online ---------------- */

export type GroupRole = "OWNER" | "ADMIN" | "MEMBER";
export type GroupMember = { userId: string; publicId: string; name: string; avatarUrl?: string; role: GroupRole; online: boolean; lastSeenAt?: string };
export type GroupInfo = { conversationId: string; kind: "DIRECT" | "GROUP"; name: string; myRole: GroupRole; muted: boolean; members: GroupMember[] };
export type Presence = { online: boolean; lastSeenAt?: string };

const role = (v: unknown): GroupRole => (v === "OWNER" || v === "ADMIN" ? v : "MEMBER");

export function readGroupInfo(raw: unknown): GroupInfo | null {
  const d = obj(raw);
  const id = d ? str(d.conversationId) : undefined;
  if (!d || !id) return null;
  return {
    conversationId: id,
    kind: d.kind === "GROUP" ? "GROUP" : "DIRECT",
    name: str(d.name) ?? "Group",
    myRole: role(d.myRole),
    muted: d.muted === true,
    members: Array.isArray(d.members)
      ? d.members.flatMap((m) => {
          const o = obj(m);
          const userId = o ? str(o.userId) : undefined;
          return o && userId
            ? [{ userId, publicId: str(o.publicId) ?? "", name: str(o.name) ?? `User ${str(o.publicId) ?? ""}`, avatarUrl: str(o.avatarUrl), role: role(o.role), online: o.online === true, lastSeenAt: str(o.lastSeenAt) }]
            : [];
        })
      : [],
  };
}

const groupCall = async (path: string, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown) => {
  const r = await api<unknown>(path, { method, auth: true, forbiddenIsAccess: true, body });
  return readGroupInfo(r);
};
const ids = (list: string[]) => list.map(asId);

export const createGroup = async (name: string, memberIds: string[]) => {
  const g = await groupCall("/api/v1/chat/groups", "POST", { name, memberIds: ids(memberIds) });
  if (!g) throw new ApiError("The group was made, but the answer couldn't be read.", 200, "http");
  return g;
};
export const getGroupInfo = (conversationId: string) => groupCall(`${conv(conversationId)}/info`, "GET");
export const renameGroup = (conversationId: string, name: string) => groupCall(conv(conversationId), "PATCH", { name });
export const addGroupMembers = (conversationId: string, userIds: string[]) => groupCall(`${conv(conversationId)}/members`, "POST", { userIds: ids(userIds) });
/** Remove someone (owner/admins) or leave (your own id). */
export const removeGroupMember = (conversationId: string, userId: string) => api<unknown>(`${conv(conversationId)}/members/${encodeURIComponent(userId)}`, { method: "DELETE", auth: true, forbiddenIsAccess: true });
export const setGroupAdmin = (conversationId: string, userId: string, on: boolean) => groupCall(`${conv(conversationId)}/admins/${encodeURIComponent(userId)}`, "PUT", { on });
export const setChatMuted = (conversationId: string, on: boolean) => api<unknown>(`${conv(conversationId)}/mute`, { method: "PUT", auth: true, forbiddenIsAccess: true, body: { on } });
export const setUserBlocked = (userId: string, on: boolean) => api<unknown>(`/api/v1/chat/blocks/${encodeURIComponent(userId)}`, { method: on ? "PUT" : "DELETE", auth: true, forbiddenIsAccess: true });

export async function getPresence(userIds: string[]): Promise<Record<string, Presence>> {
  const list = userIds.filter((x) => /^\d+$/.test(x)).slice(0, 200);
  if (!list.length) return {};
  const d = obj(await api<unknown>(`/api/v1/presence?ids=${list.join(",")}`, { auth: true, forbiddenIsAccess: true })) ?? {};
  const out: Record<string, Presence> = {};
  for (const [k, v] of Object.entries(d)) {
    const o = obj(v);
    if (o) out[k] = { online: o.online === true, lastSeenAt: str(o.lastSeenAt) };
  }
  return out;
}

/** "online", "last seen 5m ago", or "" when unknown. */
export function presenceText(p?: Presence): string {
  if (!p) return "";
  if (p.online) return "online";
  const at = p.lastSeenAt ? Date.parse(p.lastSeenAt) : NaN;
  if (!Number.isFinite(at)) return "";
  const m = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (m < 1) return "last seen just now";
  if (m < 60) return `last seen ${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `last seen ${h}h ago`;
  return `last seen ${new Date(at).toLocaleDateString([], { day: "numeric", month: "short" })}`;
}
