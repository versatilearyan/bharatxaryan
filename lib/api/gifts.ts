/**
 * Gifts in backend rooms, with real coins.
 *
 *   POST /api/v1/voice-rooms/{id}/gifts { giftId, toUserId, count, requestId }
 *   GET  /api/v1/voice-rooms/{id}/contribution?period=daily|weekly|total
 *
 * The server sets the price, takes the coins, pays the receiver their share
 * and adds room points in one go. requestId makes a retried send safe: the
 * same send is never charged twice. Everyone in the room gets each gift on
 * /topic/voice-rooms/{id}/gifts.
 */
import { api } from "./client";

export type RoomGiftEvent = {
  eventId: string;
  roomId: string;
  fromUserId: string;
  toUserId: string;
  giftId: string;
  count: number;
  /** Coins the sender paid. */
  coins: number;
  /** Coins the receiver got back. */
  earned: number;
  /** The room's points after this gift. */
  roomPoints: number;
  requestId: string;
  /** The sender's balance right after (only meaningful to the sender). */
  senderBalance: number;
};

const s = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);

export function readGiftEvent(raw: unknown): RoomGiftEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const eventId = s(d.eventId);
  const roomId = s(d.roomId);
  const fromUserId = s(d.fromUserId);
  const toUserId = s(d.toUserId);
  const giftId = s(d.giftId);
  const count = n(d.count);
  const coins = n(d.coins);
  if (!eventId || !roomId || !fromUserId || !toUserId || !giftId || !count || coins === undefined) return null;
  return { eventId, roomId, fromUserId, toUserId, giftId, count, coins, // What the receiver got: their share plus the lucky coins the server added
    earned: (n(d.earned) ?? 0) + (n(d.bonus) ?? 0), roomPoints: n(d.roomPoints) ?? 0, requestId: s(d.requestId) ?? "", senderBalance: n(d.senderBalance) ?? 0 };
}

export const roomGiftsTopic = (roomId: string) => `/topic/voice-rooms/${encodeURIComponent(roomId)}/gifts`;

const newRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Send a gift. Throws ApiError with the server's message (e.g. "Not enough coins…"). */
/** fromBag: send gifts you won (your server Bag) instead of paying coins. */
export async function sendRoomGift(roomId: string, giftId: string, toUserId: string, count: number, fromBag = false, message?: string): Promise<RoomGiftEvent> {
  // message: shown to everyone in the app when the gift is big (the server announces it)
  const body = { giftId, toUserId: /^\d+$/.test(toUserId) ? Number(toUserId) : toUserId, count, requestId: newRequestId(), fromBag, message: message?.trim() || undefined };
  const raw = await api<unknown>(`/api/v1/voice-rooms/${encodeURIComponent(roomId)}/gifts`, { method: "POST", auth: true, forbiddenIsAccess: true, body });
  const ev = readGiftEvent(raw);
  if (!ev) throw new Error("The gift was sent, but the server's answer couldn't be read.");
  return ev;
}

export type ContributionPeriod = "daily" | "weekly" | "total";
export type ContributionBoard = { rows: { userId: string; coins: number; rank: number }[]; me: { coins: number; rank: number | null } };

export async function getContribution(roomId: string, period: ContributionPeriod): Promise<ContributionBoard> {
  const d = (await api<unknown>(`/api/v1/voice-rooms/${encodeURIComponent(roomId)}/contribution?period=${period}`, { auth: true, forbiddenIsAccess: true })) as Record<string, unknown> | null;
  const rows = Array.isArray(d?.rows)
    ? d.rows.flatMap((r) => {
        const o = r as Record<string, unknown>;
        const userId = s(o.userId);
        const coins = n(o.coins);
        return userId && coins !== undefined ? [{ userId, coins, rank: n(o.rank) ?? 0 }] : [];
      })
    : [];
  const me = (d?.me ?? {}) as Record<string, unknown>;
  return { rows, me: { coins: n(me.coins) ?? 0, rank: n(me.rank) ?? null } };
}

/* ---------------- gifts outside rooms ---------------- */

export type GiftContext = "PROFILE" | "TAG" | "CP" | "MOMENT" | "CHAT";
export type DirectGiftRow = { id: string; fromUserId: string; toUserId?: string; fromName?: string; fromAvatar?: string; giftId: string; count: number; coins: number; at: number };

/**
 * A gift from a profile, the BFF or CP space, or a Moment: real coins, the
 * receiver's share, charm and BFF intimacy, like a room gift.
 *   POST /api/v1/users/{userId}/gifts { giftId, count, requestId, context }
 */
export async function sendDirectGift(toUserId: string, giftId: string, count = 1, context: GiftContext = "PROFILE") {
  const d = (await api<unknown>(`/api/v1/users/${encodeURIComponent(toUserId)}/gifts`, {
    auth: true,
    forbiddenIsAccess: true,
    method: "POST",
    body: { giftId, count, requestId: newRequestId(), context },
  })) as Record<string, unknown> | null;
  return { coins: Number(d?.coins) || 0, senderBalance: Number(d?.senderBalance) || 0 };
}

function readRows(raw: unknown): DirectGiftRow[] {
  return Array.isArray(raw)
    ? raw.flatMap((x) => {
        const o = x && typeof x === "object" ? (x as Record<string, unknown>) : null;
        if (!o || o.id == null || typeof o.giftId !== "string") return [];
        return [
          {
            id: String(o.id),
            fromUserId: String(o.fromUserId ?? ""),
            toUserId: o.toUserId == null ? undefined : String(o.toUserId),
            fromName: typeof o.fromName === "string" ? o.fromName : undefined,
            fromAvatar: typeof o.fromAvatar === "string" ? o.fromAvatar : undefined,
            giftId: o.giftId,
            count: Number(o.count) || 1,
            coins: Number(o.coins) || 0,
            at: typeof o.at === "string" ? Date.parse(o.at) || Date.now() : Number(o.at) || Date.now(),
          },
        ];
      })
    : [];
}

/** Recent gifts between you and this person, both ways. */
export async function giftsWithMe(userId: string, limit = 20) {
  return readRows(await api<unknown>(`/api/v1/users/${encodeURIComponent(userId)}/gifts/with-me?limit=${limit}`, { auth: true, forbiddenIsAccess: true }));
}

/** Recent gifts this person received from anyone. */
export async function giftsReceived(userId: string, limit = 20) {
  return readRows(await api<unknown>(`/api/v1/users/${encodeURIComponent(userId)}/gifts/received?limit=${limit}`, { auth: true, forbiddenIsAccess: true }));
}
