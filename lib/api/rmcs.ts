/**
 * Raja Mantri Chor Sipahi at a voice room's table.
 *   GET  /api/v1/voice-rooms/{id}/rmcs                         the table as this player sees it
 *   POST /api/v1/voice-rooms/{id}/rmcs/sit | stand | start | lobby | size {size} | pick {target} | chat {text|emote}
 * Live: /topic/voice-rooms/{id}/rmcs sends {k:"ping"} (fetch again), {k:"chat"} and {k:"emote"}.
 */
import { api } from "./client";

export type RmcsRole = "RAJA" | "MANTRI" | "SIPAHI" | "CHOR" | "PRAJAA";
export type RmcsPhase = "NONE" | "LOBBY" | "DEAL" | "GUESS" | "RESULT" | "ENDED";
export type RmcsSeat = { id: string; name: string; avatarUrl?: string; bot: boolean; score: number; gain: number; role?: RmcsRole };
export type RmcsChat = { k: "chat" | "emote"; from: string; name: string; text?: string; e?: string; t: number };
export type RmcsTable = {
  phase: RmcsPhase;
  round: number;
  rounds: number;
  size: number;
  host: string;
  endsAt: number;
  serverTime: number;
  version: number;
  picked: string | null;
  caught: boolean;
  seats: RmcsSeat[];
  chat: RmcsChat[];
  emotes: string[];
  winners: string[];
  enabled: boolean;
  roomId: string;
  table?: { code: string; public: boolean };
};

export const ROLE_INFO: Record<RmcsRole, { name: string; icon: string; points: number; tone: string; line: string }> = {
  RAJA: { name: "Raja", icon: "👑", points: 1000, tone: "#ffc83d", line: "Tum Raja ho! 1000 point pakke." },
  MANTRI: { name: "Mantri", icon: "🧠", points: 800, tone: "#7c4dff", line: "Tum Mantri ho! Chor ko pehchano." },
  SIPAHI: { name: "Sipahi", icon: "🛡️", points: 500, tone: "#2f9bff", line: "Tum Sipahi ho. 500 point." },
  CHOR: { name: "Chor", icon: "🦹", points: 0, tone: "#ff4d6d", line: "Tum Chor ho! Chhupe raho, pakde mat jana." },
  PRAJAA: { name: "Prajaa", icon: "🧑‍🌾", points: 300, tone: "#2ec27e", line: "Tum Prajaa ho. 300 point." },
};

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const ROLES = ["RAJA", "MANTRI", "SIPAHI", "CHOR", "PRAJAA"];

export function readChatLine(raw: unknown): RmcsChat | null {
  const o = obj(raw);
  const k = o.k === "emote" ? "emote" : o.k === "chat" ? "chat" : null;
  if (!k) return null;
  return { k, from: str(o.from) ?? "", name: str(o.name) ?? "Khiladi", text: str(o.text), e: str(o.e), t: num(o.t, Date.now()) };
}

export function readTable(raw: unknown): RmcsTable {
  const o = obj(raw);
  return {
    phase: (["NONE", "LOBBY", "DEAL", "GUESS", "RESULT", "ENDED"].includes(String(o.phase)) ? o.phase : "NONE") as RmcsPhase,
    round: num(o.round),
    rounds: num(o.rounds, 5),
    size: num(o.size, 4),
    host: str(o.host) ?? "",
    endsAt: num(o.endsAt),
    serverTime: num(o.serverTime, Date.now()),
    version: num(o.version),
    picked: str(o.picked) ?? null,
    caught: o.caught === true,
    enabled: o.enabled !== false,
    roomId: str(o.roomId) ?? "",
    table: o.table ? { code: str(obj(o.table).code) ?? "", public: obj(o.table).public !== false } : undefined,
    seats: (Array.isArray(o.seats) ? o.seats : []).map((x) => {
      const s = obj(x);
      return {
        id: str(s.id) ?? "",
        name: str(s.name) ?? "Khiladi",
        avatarUrl: str(s.avatarUrl),
        bot: s.bot === true,
        score: num(s.score),
        gain: num(s.gain),
        role: ROLES.includes(String(s.role)) ? (s.role as RmcsRole) : undefined,
      };
    }),
    chat: (Array.isArray(o.chat) ? o.chat : []).flatMap((c) => {
      const x = readChatLine(c);
      return x ? [x] : [];
    }),
    emotes: Array.isArray(o.emotes) ? o.emotes.map(String) : [],
    winners: Array.isArray(o.winners) ? o.winners.map(String) : [],
  };
}

const opts = { auth: true, forbiddenIsAccess: true } as const;
/** A key is a voice room's id, or "t:<id>" for a table that has no room. */
export const isTableKey = (k: string) => k.startsWith("t:");
export const tableKey = (id: string) => `t:${id}`;
const base = (key: string) => (isTableKey(key) ? `/api/v1/rmcs/t/${encodeURIComponent(key.slice(2))}` : `/api/v1/voice-rooms/${encodeURIComponent(key)}/rmcs`);
const post = async (roomId: string, path: string, body: unknown = {}) => readTable(await api<unknown>(`${base(roomId)}${path}`, { ...opts, method: "POST", body }));

export const rmcsTopic = (key: string) => (isTableKey(key) ? `/topic/rmcs/t/${encodeURIComponent(key.slice(2))}` : `/topic/voice-rooms/${encodeURIComponent(key)}/rmcs`);
export const rmcsApi = {
  get: async (roomId: string) => readTable(await api<unknown>(base(roomId), opts)),
  sit: (roomId: string) => post(roomId, "/sit"),
  setPublic: (roomId: string, isPublic: boolean) => post(roomId, "/public", { isPublic }),
  stand: (roomId: string) => post(roomId, "/stand"),
  start: (roomId: string) => post(roomId, "/start"),
  lobby: (roomId: string) => post(roomId, "/lobby"),
  size: (roomId: string, size: number) => post(roomId, "/size", { size }),
  pick: (roomId: string, target: string) => post(roomId, "/pick", { target: Number(target) }),
  say: (roomId: string, text: string) => post(roomId, "/chat", { text }),
  emote: (roomId: string, emote: string) => post(roomId, "/chat", { emote }),
};

export type RmcsOpenTable = { id: string; host: string; players: number; max: number };
export const rmcsTables = {
  create: async () => readTable(await api<unknown>("/api/v1/rmcs/tables", { ...opts, method: "POST", body: {} })),
  join: async (code: string) => readTable(await api<unknown>("/api/v1/rmcs/tables/join", { ...opts, method: "POST", body: { code } })),
  joinById: async (id: string) => readTable(await api<unknown>("/api/v1/rmcs/tables/join", { ...opts, method: "POST", body: { id: Number(id) } })),
  list: async (): Promise<RmcsOpenTable[]> => {
    const o = obj(await api<unknown>("/api/v1/rmcs/tables", opts));
    return (Array.isArray(o.tables) ? o.tables : []).map((x) => {
      const t = obj(x);
      return { id: str(t.id) ?? "", host: str(t.host) ?? "Khiladi", players: num(t.players), max: num(t.max, 4) };
    });
  },
};
