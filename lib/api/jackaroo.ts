/**
 * Jackaroo in rooms (the server referees):
 *   GET  /api/v1/voice-rooms/{roomId}/games/current
 *   POST /api/v1/voice-rooms/{roomId}/games/jackaroo
 *   POST /api/v1/games/{id}/sit|leave|start|cancel|play|burn
 * Live: /topic/voice-rooms/{roomId}/game (table), /user/queue/game (your hand).
 */
import { api } from "./client";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const opts = { auth: true, forbiddenIsAccess: true } as const;

export const CELLS = 76;
export const STRIDE = 19;
export const HOME = 100;

export type JPlayer = { userId: string; name: string; avatarUrl?: string; seat: number; team: number; marbles: number[]; cards: number; left: boolean };
export type JMove = { index: number; card: number; marble: number; action: "OUT" | "MOVE" | "MOVE11" | "BACK" | "SWAP"; targetSeat?: number; targetMarble?: number; label: string };
export type JYou = { seat: number; hand: string[]; myTurn: boolean; legal: JMove[]; mustBurn: boolean };
export type JGame = {
  id: string;
  roomId: string;
  status: "WAITING" | "PLAYING" | "FINISHED" | "CANCELLED";
  /** The table code friends join with. */
  code?: string;
  createdBy: string;
  version: number;
  turnEndsAt: number | null;
  serverTime: number;
  turnSeconds: number;
  players: JPlayer[];
  turnUserId?: string;
  winnerTeam: number | null;
  winners: string[];
  last?: string;
  lastCard?: string;
  lastMove?: { seat: number; marble: number; from: number; to: number; action: string; captured?: [number, number] };
  round: number;
  deckLeft: number;
  you?: JYou;
};

export function readYou(v: unknown): JYou | undefined {
  const o = obj(v);
  if (!o) return undefined;
  return {
    seat: num(o.seat),
    hand: Array.isArray(o.hand) ? o.hand.filter((x): x is string => typeof x === "string") : [],
    myTurn: o.myTurn === true,
    legal: (Array.isArray(o.legal) ? o.legal : []).flatMap((m) => {
      const x = obj(m);
      if (!x) return [];
      return [{ index: num(x.index), card: num(x.card), marble: num(x.marble), action: (str(x.action) ?? "MOVE") as JMove["action"], targetSeat: x.targetSeat == null ? undefined : num(x.targetSeat), targetMarble: x.targetMarble == null ? undefined : num(x.targetMarble), label: str(x.label) ?? "" }];
    }),
    mustBurn: o.mustBurn === true,
  };
}

export function readGame(v: unknown): JGame | null {
  const o = obj(v);
  const id = str(o?.id);
  if (!o || !id || (o.game !== undefined && o.game !== "JACKAROO")) return null;
  const lm = obj(o.lastMove);
  return {
    id,
    roomId: str(o.roomId) ?? "",
    status: (str(o.status) ?? "WAITING") as JGame["status"],
    code: str(o.code),
    createdBy: str(o.createdBy) ?? "",
    version: num(o.version),
    turnEndsAt: o.turnEndsAt == null ? null : num(o.turnEndsAt),
    serverTime: num(o.serverTime) || Date.now(),
    turnSeconds: num(o.turnSeconds) || 25,
    players: (Array.isArray(o.players) ? o.players : []).flatMap((p) => {
      const x = obj(p);
      if (!x) return [];
      return [{ userId: str(x.userId) ?? "", name: str(x.name) ?? "Player", avatarUrl: str(x.avatarUrl), seat: num(x.seat), team: num(x.team), marbles: Array.isArray(x.marbles) ? x.marbles.map(num) : [-1, -1, -1, -1], cards: num(x.cards), left: x.left === true }];
    }),
    turnUserId: str(o.turnUserId),
    winnerTeam: o.winnerTeam == null ? null : num(o.winnerTeam),
    winners: Array.isArray(o.winners) ? o.winners.map(String) : [],
    last: str(o.last),
    lastCard: str(o.lastCard),
    lastMove: lm ? { seat: num(lm.seat), marble: num(lm.marble), from: num(lm.from), to: num(lm.to), action: str(lm.action) ?? "", captured: Array.isArray(lm.captured) ? [num(lm.captured[0]), num(lm.captured[1])] : undefined } : undefined,
    round: num(o.round),
    deckLeft: num(o.deckLeft),
    you: readYou(o.you),
  };
}

const g = (id: string, what: string, body?: unknown) => api<unknown>(`/api/v1/games/${encodeURIComponent(id)}/${what}`, { ...opts, method: "POST", body: body ?? {} }).then(readGame);

export const jackarooApi = {
  current: async (roomId: string) => readGame(obj(await api<unknown>(`/api/v1/voice-rooms/${encodeURIComponent(roomId)}/games/current`, opts))?.game),
  open: async (roomId: string) => readGame(await api<unknown>(`/api/v1/voice-rooms/${encodeURIComponent(roomId)}/games/jackaroo`, { ...opts, method: "POST", body: {} })),
  sit: (id: string, seat?: number) => g(id, "sit", seat == null ? {} : { seat }),
  leave: (id: string) => g(id, "leave"),
  start: (id: string) => g(id, "start"),
  cancel: (id: string) => g(id, "cancel"),
  play: (id: string, move: number) => g(id, "play", { move }),
  burn: (id: string, card: number) => g(id, "burn", { card }),
};

export const gameTopic = (roomId: string) => `/topic/voice-rooms/${encodeURIComponent(roomId)}/game`;
export const MY_GAME_QUEUE = "/user/queue/game";
