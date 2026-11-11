/**
 * PK battles, Kharidari auctions and BFF tags in backend rooms. The server
 * runs the rounds (timers, scores from real gifts, winners, tags); the app
 * shows its state and sends the owner's, admins' and players' actions.
 *
 * Live: /topic/voice-rooms/{id}/pk and /topic/voice-rooms/{id}/auction.
 * User ids are the backend's ("12").
 */
import { api } from "./client";

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : undefined);
const opts = { auth: true, forbiddenIsAccess: true } as const;
const base = (roomId: string) => `/api/v1/voice-rooms/${encodeURIComponent(roomId)}`;
type GameEvent = { type: string; actorId?: string };
const readEvent = (v: unknown): GameEvent | undefined => {
  const e = obj(v);
  return e && typeof e.type === "string" ? { type: e.type, actorId: str(e.actorId) || undefined } : undefined;
};

/* ---- PK ---- */

export type ServerPk = {
  mode: "1v1" | "team";
  rule: "gifts" | "votes";
  minutes: number;
  phase: "ready" | "live" | "done";
  endsAt: number;
  red: number;
  blue: number;
  backers: { red: Record<string, number>; blue: Record<string, number> };
  votes: Record<string, "red" | "blue">;
  winner: "red" | "blue" | "draw" | null;
};
export type PkMessage = { roomId: string; version: number; serverTime: number; pk: ServerPk | null; event?: GameEvent };

export function readPk(raw: unknown): PkMessage | null {
  const d = obj(raw);
  const roomId = str(d?.roomId);
  if (!d || !roomId) return null;
  const p = obj(d.pk);
  const b = obj(p?.backers);
  const side = (v: unknown) => {
    const o = obj(v) ?? {};
    return Object.fromEntries(Object.entries(o).filter(([, x]) => typeof x === "number")) as Record<string, number>;
  };
  return {
    roomId,
    version: num(d.version) ?? 0,
    serverTime: num(d.serverTime) ?? Date.now(),
    event: readEvent(d.event),
    pk: p
      ? {
          mode: p.mode === "team" ? "team" : "1v1",
          rule: p.rule === "votes" ? "votes" : "gifts",
          minutes: num(p.minutes) ?? 5,
          phase: p.phase === "live" || p.phase === "done" ? p.phase : "ready",
          endsAt: num(p.endsAt) ?? 0,
          red: num(p.red) ?? 0,
          blue: num(p.blue) ?? 0,
          backers: { red: side(b?.red), blue: side(b?.blue) },
          votes: Object.fromEntries(Object.entries(obj(p.votes) ?? {}).filter(([, x]) => x === "red" || x === "blue")) as Record<string, "red" | "blue">,
          winner: p.winner === "red" || p.winner === "blue" || p.winner === "draw" ? p.winner : null,
        }
      : null,
  };
}

export const roomPkTopic = (roomId: string) => `${base(roomId).replace("/api/v1", "/topic")}/pk`;

async function pkCall(roomId: string, path: string, method: "GET" | "PUT" | "POST" | "DELETE", body?: unknown) {
  const m = readPk(await api<unknown>(`${base(roomId)}${path}`, { ...opts, method, body }));
  if (!m) throw new Error("The PK answer couldn't be read.");
  return m;
}

export const pkApi = {
  get: (roomId: string) => pkCall(roomId, "/pk", "GET"),
  setup: (roomId: string, mode: "1v1" | "team", rule: "gifts" | "votes", minutes: number) => pkCall(roomId, "/pk", "PUT", { mode, rule, minutes }),
  start: (roomId: string) => pkCall(roomId, "/pk/start", "POST"),
  close: (roomId: string) => pkCall(roomId, "/pk", "DELETE"),
  vote: (roomId: string, side: "red" | "blue") => pkCall(roomId, "/pk/vote", "POST", { side }),
};

/* ---- Kharidari ---- */

export type ServerAuction = {
  roomId: string;
  version: number;
  serverTime: number;
  phase: "idle" | "bidding" | "sold";
  itemId: string | null;
  mode: "bff" | "ordinary";
  relation: string;
  declaration: string;
  offer: string;
  startGiftId: string | null;
  startPrice: number;
  endsAt: number;
  bids: { userId: string; total: number }[];
  winner: { userId: string; total: number } | null;
  tagResult: { kind: "new" | "existing" | "full" | "taken"; token: string } | null;
  event?: GameEvent;
};

export function readAuction(raw: unknown): ServerAuction | null {
  const d = obj(raw);
  const roomId = str(d?.roomId);
  if (!d || !roomId) return null;
  const w = obj(d.winner);
  const t = obj(d.tagResult);
  return {
    roomId,
    version: num(d.version) ?? 0,
    serverTime: num(d.serverTime) ?? Date.now(),
    phase: d.phase === "bidding" || d.phase === "sold" ? d.phase : "idle",
    itemId: str(d.itemId) ?? null,
    mode: d.mode === "ordinary" ? "ordinary" : "bff",
    relation: str(d.relation) ?? "besties",
    declaration: str(d.declaration) ?? "",
    offer: str(d.offer) ?? "",
    startGiftId: str(d.startGiftId) ?? null,
    startPrice: num(d.startPrice) ?? 0,
    endsAt: num(d.endsAt) ?? 0,
    bids: Array.isArray(d.bids)
      ? d.bids.flatMap((b) => {
          const o = obj(b);
          const userId = str(o?.userId);
          const total = num(o?.total);
          return userId && total !== undefined ? [{ userId, total }] : [];
        })
      : [],
    winner: w && str(w.userId) ? { userId: str(w.userId)!, total: num(w.total) ?? 0 } : null,
    tagResult: t && (t.kind === "new" || t.kind === "existing" || t.kind === "full" || t.kind === "taken") ? { kind: t.kind, token: str(t.token) ?? "bicycle" } : null,
    event: readEvent(d.event),
  };
}

export const roomAuctionTopic = (roomId: string) => `${base(roomId).replace("/api/v1", "/topic")}/auction`;

async function auctionCall(roomId: string, path: string, method: "GET" | "PUT" | "POST", body?: unknown) {
  const a = readAuction(await api<unknown>(`${base(roomId)}${path}`, { ...opts, method, body }));
  if (!a) throw new Error("The Kharidari answer couldn't be read.");
  return a;
}

const n = (userId: string) => (/^\d+$/.test(userId) ? Number(userId) : userId);

export const auctionApi = {
  get: (roomId: string) => auctionCall(roomId, "/auction", "GET"),
  sit: (roomId: string, userId?: string) => auctionCall(roomId, "/auction/seat", "POST", userId ? { userId: n(userId) } : {}),
  leave: (roomId: string) => auctionCall(roomId, "/auction/leave", "POST"),
  declare: (roomId: string, relation: string, declaration: string) => auctionCall(roomId, "/auction/declaration", "PUT", { relation, declaration }),
  configure: (roomId: string, patch: { mode?: string; offer?: string; startGiftId?: string }) => auctionCall(roomId, "/auction/config", "PUT", patch),
  start: (roomId: string) => auctionCall(roomId, "/auction/start", "POST"),
  end: (roomId: string) => auctionCall(roomId, "/auction/end", "POST"),
};

/* ---- BFF tags ---- */

export type ServerTag = { id: string; a: string; b: string; relation: string; token: string; intimacy: number; roomName?: string; declaration?: string; createdAt?: string; nickname?: string; theme?: string };

function readTags(raw: unknown): ServerTag[] {
  return Array.isArray(raw)
    ? raw.flatMap((x) => {
        const o = obj(x);
        const id = str(o?.id);
        const a = str(o?.a);
        const b = str(o?.b);
        return o && id && a && b
          ? [{ id, a, b, relation: str(o.relation) ?? "besties", token: str(o.token) ?? "bicycle", intimacy: num(o.intimacy) ?? 0, roomName: str(o.roomName), declaration: str(o.declaration), createdAt: str(o.createdAt), nickname: str(o.nickname), theme: str(o.theme) }]
          : [];
      })
    : [];
}

export const tagsApi = {
  mine: async () => readTags(await api<unknown>("/api/v1/tags/me", opts)),
  of: async (userId: string) => readTags(await api<unknown>(`/api/v1/tags/user/${encodeURIComponent(userId)}`, opts)),
  remove: (tagId: string) => api<unknown>(`/api/v1/tags/${encodeURIComponent(tagId)}`, { ...opts, method: "DELETE" }),
  /** Either person: change the tag type, pet name ("" clears) or theme ("" clears). */
  customize: async (tagId: string, patch: { relation?: string; nickname?: string; theme?: string }) => readTags([await api<unknown>(`/api/v1/tags/${encodeURIComponent(tagId)}`, { ...opts, method: "PUT", body: patch })])[0],
  slots: async (userId?: string) => {
    const d = obj(await api<unknown>(userId ? `/api/v1/tags/user/${encodeURIComponent(userId)}/slots` : "/api/v1/tags/me/slots", opts));
    return { used: num(d?.used) ?? 0, slots: num(d?.slots) ?? 5, max: num(d?.max) ?? 12, price: num(d?.price) ?? 0, canBuy: d?.canBuy === true };
  },
  /** Opens one more BFF slot for coins (the price is set in the admin panel). */
  buySlot: async () => {
    const d = obj(await api<unknown>("/api/v1/tags/me/slots/buy", { ...opts, method: "POST" }));
    return { used: num(d?.used) ?? 0, slots: num(d?.slots) ?? 5, max: num(d?.max) ?? 12, price: num(d?.price) ?? 0, canBuy: d?.canBuy === true };
  },
};
