/**
 * CP (Couple Partner), run by the server. Errors come back as { message }.
 *
 *   GET  /api/v1/cp/rings                       ring catalogue
 *   POST /api/v1/cp/rings/{ringId}/buy          → { bag, balance }        (Idempotency-Key)
 *   GET  /api/v1/cp/me/rings                    → { ringId: count }
 *   POST /api/v1/cp/proposals                   { toUserId, ringId, message }
 *   GET  /api/v1/cp/me/proposals                → { sent, received[] }
 *   POST /api/v1/cp/proposals/{id}/accept | decline | cancel
 *   GET  /api/v1/cp/me                          → Couple | null
 *   GET  /api/v1/users/{userId}/cp              → Couple | null
 *   GET  /api/v1/cp/ranking?period=today|yesterday|week
 *   POST /api/v1/cp/me/rings                    { ringId, source: BAG|BUY }  (Idempotency-Key)
 *   PUT  /api/v1/cp/me/wallpaper (multipart file) · DELETE /api/v1/cp/me/wallpaper
 *   POST /api/v1/cp/{coupleId}/blessings        (Idempotency-Key)
 *   GET  /api/v1/cp/{coupleId}/blessings?cursor=&limit=
 *   POST /api/v1/cp/me/end-request  (+ /cancel, /decline, /accept)
 * Live: /user/queue/cp { type, coupleId?, proposalId?, byUserId, at }.
 */
import { api } from "./client";
import { uploadForm } from "./social";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const time = (v: unknown) => (typeof v === "string" ? Date.parse(v) || Date.now() : Date.now());
const opts = { auth: true, forbiddenIsAccess: true } as const;
const key = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export type CpRingInfo = { id: string; name: string; price: number; rarity: string; imageUrl?: string; sortOrder: number; /** Sold now (admin shop rings). Old rings show only to people who own them. */ onSale: boolean };
export type CpPerson = { userId: string; name: string; avatarUrl?: string };
export type CpCouple = {
  id: string;
  a: string;
  b: string;
  ring: string;
  rings: string[];
  since: number;
  love: number;
  /** The couple's shared Charm (same number as love): only gifts between the two partners add to it. */
  charm: number;
  level: number;
  nextLevelLove: number | null;
  /** When each badge level was reached (level number to ISO time). */
  unlocks: Record<string, string>;
  giftCount: number;
  giftCoins: number;
  message?: string;
  blessings: number;
  wallpaperUrl?: string;
  endRequest: { by: string; at: number } | null;
  people: Record<string, CpPerson>;
};
export type CpProposal = { id: string; fromUserId: string; toUserId: string; ringId: string; message?: string; createdAt: number; status: string; from: CpPerson; to: CpPerson };
export type CpCharmEntry = { id: string; senderId: string; receiverId: string; giftId: string; giftName: string; count: number; coins: number; charm: number; at: string };
export type CpBlessing = { id: string; by: CpPerson; createdAt: number; love: number };

const person = (v: unknown): CpPerson => {
  const o = obj(v) ?? {};
  return { userId: str(o.userId) ?? "", name: str(o.name) ?? "Someone", avatarUrl: str(o.avatarUrl) };
};

export function readCouple(v: unknown): CpCouple | null {
  const o = obj(v);
  const id = str(o?.id);
  if (!o || !id) return null;
  const er = obj(o.endRequest);
  const people: Record<string, CpPerson> = {};
  Object.entries(obj(o.people) ?? {}).forEach(([k, p]) => (people[k] = person(p)));
  return {
    id,
    a: str(o.a) ?? "",
    b: str(o.b) ?? "",
    ring: str(o.ring) ?? "",
    rings: Array.isArray(o.rings) ? o.rings.map(String) : [],
    since: time(o.since),
    love: num(o.love),
    charm: num(o.charm ?? o.love),
    level: num(o.level) || 1,
    nextLevelLove: o.nextLevelLove == null ? null : num(o.nextLevelLove),
    unlocks: Object.fromEntries(Object.entries(obj(o.unlocks) ?? {}).map(([k, t]) => [k, String(t)])),
    giftCount: num(o.giftCount),
    giftCoins: num(o.giftCoins),
    message: str(o.message),
    blessings: num(o.blessings),
    wallpaperUrl: str(o.wallpaperUrl),
    endRequest: er ? { by: str(er.by) ?? "", at: time(er.at) } : null,
    people,
  };
}

const proposal = (v: unknown): CpProposal | null => {
  const o = obj(v);
  const id = str(o?.id);
  if (!o || !id) return null;
  return { id, fromUserId: str(o.fromUserId) ?? "", toUserId: str(o.toUserId) ?? "", ringId: str(o.ringId) ?? "", message: str(o.message), createdAt: time(o.createdAt), status: str(o.status) ?? "PENDING", from: person(o.from), to: person(o.to) };
};

const bagOf = (v: unknown): Record<string, number> => Object.fromEntries(Object.entries(obj(v) ?? {}).map(([k, n]) => [k, num(n)]));

export const cpApi = {
  rings: async (): Promise<CpRingInfo[]> =>
    ((await api<unknown>("/api/v1/cp/rings", opts)) as unknown[] | null ?? []).flatMap((r) => {
      const o = obj(r);
      const id = str(o?.id);
      return o && id ? [{ id, name: str(o.name) ?? id, price: num(o.price), rarity: str(o.rarity) ?? "", imageUrl: str(o.imageUrl), sortOrder: num(o.sortOrder), onSale: o.onSale !== false }] : [];
    }),
  bag: async () => bagOf(await api<unknown>("/api/v1/cp/me/rings", opts)),
  buy: async (ringId: string) => {
    const d = obj(await api<unknown>(`/api/v1/cp/rings/${encodeURIComponent(ringId)}/buy`, { ...opts, method: "POST", headers: { "Idempotency-Key": key() } }));
    return { bag: bagOf(d?.bag), balance: num(d?.balance) };
  },
  propose: async (toUserId: string, ringId: string, message: string) =>
    proposal(await api<unknown>("/api/v1/cp/proposals", { ...opts, method: "POST", body: { toUserId: Number(toUserId), ringId, message: message || undefined } })),
  proposals: async () => {
    const d = obj(await api<unknown>("/api/v1/cp/me/proposals", opts)) ?? {};
    return { sent: proposal(d.sent), received: (Array.isArray(d.received) ? d.received : []).flatMap((p) => proposal(p) ?? []) };
  },
  accept: async (id: string) => readCouple(await api<unknown>(`/api/v1/cp/proposals/${encodeURIComponent(id)}/accept`, { ...opts, method: "POST" })),
  decline: (id: string) => api<unknown>(`/api/v1/cp/proposals/${encodeURIComponent(id)}/decline`, { ...opts, method: "POST" }),
  cancel: (id: string) => api<unknown>(`/api/v1/cp/proposals/${encodeURIComponent(id)}/cancel`, { ...opts, method: "POST" }),
  mine: async () => readCouple(await api<unknown>("/api/v1/cp/me", opts)),
  of: async (userId: string) => readCouple(await api<unknown>(`/api/v1/users/${encodeURIComponent(userId)}/cp`, opts)),
  addRing: async (ringId: string, source: "BAG" | "BUY") =>
    readCouple(await api<unknown>("/api/v1/cp/me/rings", { ...opts, method: "POST", body: { ringId, source }, headers: source === "BUY" ? { "Idempotency-Key": key() } : undefined })),
  setWallpaper: async (file: File, onProgress?: (p: number) => void) => {
    const f = new FormData();
    f.append("file", file, file.name);
    return readCouple(await uploadForm("/api/v1/cp/me/wallpaper", f, onProgress, "PUT"));
  },
  removeWallpaper: async () => readCouple(await api<unknown>("/api/v1/cp/me/wallpaper", { ...opts, method: "DELETE" })),
  bless: async (coupleId: string) => {
    const d = obj(await api<unknown>(`/api/v1/cp/${encodeURIComponent(coupleId)}/blessings`, { ...opts, method: "POST", headers: { "Idempotency-Key": key() } }));
    return { couple: readCouple(d?.couple), balance: num(d?.balance) };
  },
  blessings: async (coupleId: string, cursor?: string) => {
    const d = obj(await api<unknown>(`/api/v1/cp/${encodeURIComponent(coupleId)}/blessings?limit=20${cursor ? `&cursor=${cursor}` : ""}`, opts)) ?? {};
    const items: CpBlessing[] = (Array.isArray(d.items) ? d.items : []).flatMap((x) => {
      const o = obj(x);
      const id = str(o?.id);
      return o && id ? [{ id, by: person(o.by), createdAt: time(o.createdAt), love: num(o.love) }] : [];
    });
    return { items, count: num(d.count), nextCursor: str(d.nextCursor) };
  },
  charmHistory: async (filter: "all" | "sent" | "received"): Promise<CpCharmEntry[]> => {
    const d = await api<unknown>(`/api/v1/cp/me/charm-history?filter=${filter}&limit=50`, opts);
    return (Array.isArray(d) ? d : []).flatMap((x) => {
      const o = obj(x);
      const id = str(o?.id);
      return o && id ? [{ id, senderId: str(o.senderId) ?? "", receiverId: str(o.receiverId) ?? "", giftId: str(o.giftId) ?? "", giftName: str(o.giftName) ?? "Gift", count: num(o.count) || 1, coins: num(o.coins), charm: num(o.charm), at: str(o.at) ?? "" }] : [];
    });
  },
  endRequest: async () => readCouple(await api<unknown>("/api/v1/cp/me/end-request", { ...opts, method: "POST" })),
  cancelEnd: async () => readCouple(await api<unknown>("/api/v1/cp/me/end-request/cancel", { ...opts, method: "POST" })),
  declineEnd: async () => readCouple(await api<unknown>("/api/v1/cp/me/end-request/decline", { ...opts, method: "POST" })),
  acceptEnd: () => api<unknown>("/api/v1/cp/me/end-request/accept", { ...opts, method: "POST" }),
};

export const CP_QUEUE = "/user/queue/cp";
/** Day marks the CP space counts down to. */
export const CP_MILESTONES = [7, 30, 52, 100, 200, 365, 520, 1000];
export function daysOf(since: number, now = Date.now()) {
  return Math.max(1, Math.floor((now - since) / 86_400_000) + 1);
}
export function nextMilestone(days: number) {
  const m = CP_MILESTONES.find((d) => d > days);
  return m ? { day: m, left: m - days } : null;
}
