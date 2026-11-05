/**
 * Ludo at a room's table (server-refereed):
 *   GET  /api/v1/voice-rooms/{roomId}/ludo            { game }
 *   POST /api/v1/voice-rooms/{roomId}/ludo  { stake } open a table
 *   POST /api/v1/ludo/{id}/sit | leave | start | cancel | roll
 *   POST /api/v1/ludo/{id}/move   { token }
 *   POST /api/v1/ludo/{id}/chat   { text?, emote? }
 * Live: /topic/ludo/{id} (table), /topic/ludo/{id}/chat.
 */
import { api } from "./client";

export const LUDO_STAKES = [0, 100, 500, 1000, 5000] as const;
export const LUDO_EMOTES = ["😂", "😍", "😡", "😭", "🔥", "👏", "😎", "🤬", "🙏", "🎉", "💀", "🫡"] as const;
export const ludoTopic = (id: string) => `/topic/ludo/${id}`;
export const ludoChatTopic = (id: string) => `/topic/ludo/${id}/chat`;

export type LudoPlayer = { userId: string; name: string; avatarUrl?: string; seat: number; tokens: number[]; home: number; left: boolean };
export type LudoMove = { seat: number; token: number; from: number; to: number; capturedSeat?: number | null; capturedToken?: number | null };
export type LudoGame = {
  id: string;
  roomId: string;
  code?: string;
  status: "WAITING" | "PLAYING" | "FINISHED" | "CANCELLED";
  createdBy: string;
  version: number;
  turnEndsAt?: number;
  serverTime: number;
  turnSeconds: number;
  stake: number;
  pot: number;
  players: LudoPlayer[];
  turnUserId?: string;
  phase: "ROLL" | "MOVE";
  dice: number;
  rolls: number;
  winner?: string;
  last: string;
  lastMove?: LudoMove;
  you?: { seat: number; myTurn: boolean; canRoll: boolean; movable: number[] };
};
export type LudoChat = { id: string; userId: string; name: string; avatarUrl?: string; seat?: number | null; text?: string | null; emote?: string | null; at: number };

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function readLudo(v: unknown): LudoGame | null {
  const o = obj(v);
  const id = str(o?.id);
  if (!o || !id || (o.game !== undefined && o.game !== "LUDO")) return null;
  const you = obj(o.you);
  const lm = obj(o.lastMove);
  return {
    id,
    roomId: str(o.roomId) ?? "",
    code: str(o.code),
    status: (str(o.status) as LudoGame["status"]) ?? "WAITING",
    createdBy: str(o.createdBy) ?? "",
    version: num(o.version),
    turnEndsAt: typeof o.turnEndsAt === "number" ? o.turnEndsAt : undefined,
    serverTime: num(o.serverTime) || Date.now(),
    turnSeconds: num(o.turnSeconds) || 20,
    stake: num(o.stake),
    pot: num(o.pot),
    players: (Array.isArray(o.players) ? o.players : []).map((x) => {
      const p = obj(x) ?? {};
      return {
        userId: str(p.userId) ?? "",
        name: str(p.name) ?? "Player",
        avatarUrl: str(p.avatarUrl),
        seat: num(p.seat),
        tokens: Array.isArray(p.tokens) ? p.tokens.map((t) => num(t)) : [-1, -1, -1, -1],
        home: num(p.home),
        left: p.left === true,
      };
    }),
    turnUserId: str(o.turnUserId),
    phase: o.phase === "MOVE" ? "MOVE" : "ROLL",
    dice: num(o.dice),
    rolls: num(o.rolls),
    winner: str(o.winner),
    last: str(o.last) ?? "",
    lastMove: lm ? { seat: num(lm.seat), token: num(lm.token), from: num(lm.from), to: num(lm.to), capturedSeat: lm.capturedSeat as number | null, capturedToken: lm.capturedToken as number | null } : undefined,
    you: you ? { seat: num(you.seat), myTurn: you.myTurn === true, canRoll: you.canRoll === true, movable: Array.isArray(you.movable) ? you.movable.map((t) => num(t)) : [] } : undefined,
  };
}

const opts = { auth: true, forbiddenIsAccess: true } as const;
const post = (path: string, body?: unknown) => api<unknown>(path, { ...opts, method: "POST", body: body ?? {} }).then(readLudo);

export const ludoApi = {
  current: async (roomId: string) => readLudo(obj(await api<unknown>(`/api/v1/voice-rooms/${encodeURIComponent(roomId)}/ludo`, opts))?.game),
  open: (roomId: string, stake: number) => post(`/api/v1/voice-rooms/${encodeURIComponent(roomId)}/ludo`, { stake }),
  get: async (id: string) => readLudo(await api<unknown>(`/api/v1/ludo/${encodeURIComponent(id)}`, opts)),
  sit: (id: string) => post(`/api/v1/ludo/${encodeURIComponent(id)}/sit`),
  leave: (id: string) => post(`/api/v1/ludo/${encodeURIComponent(id)}/leave`),
  start: (id: string) => post(`/api/v1/ludo/${encodeURIComponent(id)}/start`),
  cancel: (id: string) => post(`/api/v1/ludo/${encodeURIComponent(id)}/cancel`),
  roll: (id: string) => post(`/api/v1/ludo/${encodeURIComponent(id)}/roll`),
  move: (id: string, token: number) => post(`/api/v1/ludo/${encodeURIComponent(id)}/move`, { token }),
  chat: (id: string, text?: string, emote?: string) => api<unknown>(`/api/v1/ludo/${encodeURIComponent(id)}/chat`, { ...opts, method: "POST", body: { text, emote } }),
};

/* ---------------- board geometry (15 × 15 grid) ---------------- */

/** The 52 loop squares as [col, row], clockwise; seat s starts on index 1 + 13s. */
export const LOOP: [number, number][] = (() => {
  const p: [number, number][] = [];
  for (let c = 0; c <= 5; c++) p.push([c, 6]);
  for (let r = 5; r >= 0; r--) p.push([6, r]);
  p.push([7, 0], [8, 0]);
  for (let r = 1; r <= 5; r++) p.push([8, r]);
  for (let c = 9; c <= 14; c++) p.push([c, 6]);
  p.push([14, 7], [14, 8]);
  for (let c = 13; c >= 9; c--) p.push([c, 8]);
  for (let r = 9; r <= 14; r++) p.push([8, r]);
  p.push([7, 14], [6, 14]);
  for (let r = 13; r >= 9; r--) p.push([6, r]);
  for (let c = 5; c >= 0; c--) p.push([c, 8]);
  p.push([0, 7]);
  return p;
})();
export const START = [1, 14, 27, 40];
export const SAFE = new Set([1, 14, 27, 40, 9, 22, 35, 48]);
/** Each seat's home lane (5 squares, outside in) and the centre. */
export const LANES: [number, number][][] = [
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
];
/** Where finished tokens sit (just inside the centre, on each seat's side). */
export const FINISH_AT: [number, number][] = [[6.35, 7], [7, 6.35], [7.65, 7], [7, 7.65]];
/** Base quadrant of each seat: top-left col/row of its 6×6 yard. */
export const YARD: [number, number][] = [[0, 0], [9, 0], [9, 9], [0, 9]];
/** The four token spots inside a yard (centres, in squares). */
export const YARD_SPOTS: [number, number][] = [[1.9, 1.9], [4.1, 1.9], [1.9, 4.1], [4.1, 4.1]];

/** Centre of a token at position pos for seat (in grid units, centre of square). */
export function cellOf(seat: number, pos: number, token: number): [number, number] {
  if (pos < 0) {
    const [yc, yr] = YARD[seat];
    const [sx, sy] = YARD_SPOTS[token];
    return [yc + sx, yr + sy];
  }
  if (pos >= 56) {
    const [fx, fy] = FINISH_AT[seat];
    return [fx + 0.5, fy + 0.5];
  }
  if (pos >= 51) {
    const [c, r] = LANES[seat][pos - 51];
    return [c + 0.5, r + 0.5];
  }
  const [c, r] = LOOP[(START[seat] + pos) % 52];
  return [c + 0.5, r + 0.5];
}

/** The squares a token passes through from `from` to `to` (for hop animation). */
export function pathOf(seat: number, token: number, from: number, to: number): [number, number][] {
  if (from < 0) return [cellOf(seat, 0, token)];
  const out: [number, number][] = [];
  for (let p = from + 1; p <= to; p++) out.push(cellOf(seat, p, token));
  return out;
}

export const SEAT_COLOR = [
  { name: "Red", main: "#ff4d6d", dark: "#b3123a", light: "#ffd1da", glow: "rgba(255,77,109,0.65)" },
  { name: "Green", main: "#2ee59d", dark: "#0b8f5c", light: "#c9ffe8", glow: "rgba(46,229,157,0.6)" },
  { name: "Yellow", main: "#ffd23f", dark: "#c48a00", light: "#fff3c4", glow: "rgba(255,210,63,0.6)" },
  { name: "Blue", main: "#4cc9f0", dark: "#1565c0", light: "#d2f3ff", glow: "rgba(76,201,240,0.6)" },
] as const;
