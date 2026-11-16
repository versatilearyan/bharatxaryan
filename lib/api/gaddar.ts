/**
 * Gaon ka Gaddaar: a village social-deduction game inside a voice room.
 *   GET  /api/v1/voice-rooms/{id}/gaddar            { map, state, me?, snap? }
 *   POST /api/v1/voice-rooms/{id}/gaddar/join | leave | start | lobby
 *   POST /api/v1/voice-rooms/{id}/gaddar/vote       { target }  (0 = skip)
 * Live: publish /app/voice-rooms/{id}/gaddar { dx, dy, work } and /app/voice-rooms/{id}/gaddar.act { a };
 * listen on /topic/voice-rooms/{id}/gaddar (state, snap) and /user/queue/gaddar (your role and tasks).
 */
import { api } from "./client";

export type GaddarWall = { x: number; y: number; w: number; h: number; kind: string; label?: string };
export type GaddarDecor = { t: "rect" | "circle" | "text"; x: number; y: number; w: number; h: number; c: string; text?: string };
export type GaddarTaskKind = "hold" | "seq" | "wires" | "swipe" | "align" | "shield";
const TASK_KINDS = ["seq", "wires", "swipe", "align", "shield"];
export type GaddarVent = { id: number; x: number; y: number; group: number };
export type GaddarMap = {
  id: string;
  name: string;
  blurb: string;
  w: number;
  h: number;
  radius: number;
  speed: number;
  ground: string;
  /** Where the Sarpanch's bell hangs and everyone starts. */
  meeting: [number, number];
  walls: GaddarWall[];
  decor: GaddarDecor[];
  tasks: { id: number; name: string; kind: GaddarTaskKind; x: number; y: number }[];
  vents: GaddarVent[];
  lightFix: [number, number];
  reactor: [[number, number], [number, number]];
};
export type GaddarMapInfo = { id: string; name: string; blurb: string };
export type GaddarSettings = { map: string; gaddars: number; killCd: number };

export type GaddarPhase = "NONE" | "LOBBY" | "PLAY" | "MEETING" | "ENDED";
export type GaddarPlayer = { id: string; name: string; avatarUrl?: string; color: number; hat?: number; suit?: number; acc?: number; alive: boolean; gone: boolean; role?: "GADDAR" | "GAONWALA"; voted?: boolean };
export type GaddarResult = { ejected: string | null; ejectedName?: string; wasGaddar?: boolean; tally: Record<string, number> };
export type GaddarMeeting = { by: string; byName: string; why: "report" | "emergency"; result?: GaddarResult };
export type GaddarState = {
  phase: GaddarPhase;
  version: number;
  host: string;
  min: number;
  max: number;
  serverTime: number;
  endsAt: number;
  players: GaddarPlayer[];
  taskPct: number;
  mapId?: string;
  /** A game on its own (not in a voice room): its id, the code to share, and whether anyone can find it in the list. */
  table?: { id: string; code: string; public: boolean };
  maps: GaddarMapInfo[];
  settings: GaddarSettings;
  winner?: "GAONWALE" | "GADDAAR";
  meeting?: GaddarMeeting;
};
export type GaddarMe = {
  role?: "GADDAR" | "GAONWALA";
  mates: string[];
  killIn: number;
  tasks: { id: number; name: string; kind: GaddarTaskKind; x: number; y: number; p: number }[];
  /** Gaddaar only: ms until the next sabotage (-1 while one is on), the made-up kaam shown to the others, and the vent you are in. */
  sabIn: number;
  fake: string[];
  vent?: { id: number; x: number; y: number; links: number };
  alive: boolean;
  canEmergency: boolean;
  myVote?: string;
};
/** [id, x, y, alive, moving] */
/** sb: the sabotage on now: [L (andhera) or R (kuan sukha), deadline ms, fix progress 0..1] */
export type GaddarSnap = { t: number; p: [string, number, number, number, number][]; b: [string, number, number][]; tp: number; sb?: [string, number, number] };
/** Something a villager close by sees. */
export type GaddarEvent = { e: "vent"; in: boolean; x: number; y: number; name: string; color: number };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export function readState(raw: unknown): GaddarState {
  const o = obj(raw);
  const phase = (["LOBBY", "PLAY", "MEETING", "ENDED"] as const).find((p) => p === o.phase) ?? "NONE";
  const meeting = obj(o.meeting);
  const result = obj(meeting.result);
  return {
    phase,
    version: num(o.v),
    host: str(o.host) ?? "",
    min: num(o.min, 4),
    max: num(o.max, 10),
    serverTime: num(o.serverTime, Date.now()),
    endsAt: num(o.endsAt),
    players: (Array.isArray(o.players) ? o.players : []).map((x) => {
      const p = obj(x);
      return {
        id: str(p.id) ?? "",
        name: str(p.name) ?? "Gaonwala",
        avatarUrl: str(p.avatarUrl),
        color: num(p.color),
        hat: num(p.hat),
        suit: num(p.suit),
        acc: num(p.acc),
        alive: p.alive !== false,
        gone: p.gone === true,
        role: p.role === "GADDAR" ? "GADDAR" : p.role === "GAONWALA" ? "GAONWALA" : undefined,
        voted: p.voted === true,
      };
    }),
    taskPct: num(o.taskPct),
    mapId: str(o.mapId),
    table: o.table ? { id: str(obj(o.table).id) ?? "", code: str(obj(o.table).code) ?? "", public: obj(o.table).public !== false } : undefined,
    maps: (Array.isArray(o.maps) ? o.maps : []).map((x) => {
      const m = obj(x);
      return { id: str(m.id) ?? "", name: str(m.name) ?? "", blurb: str(m.blurb) ?? "" };
    }),
    settings: { map: str(obj(o.settings).map) ?? "random", gaddars: num(obj(o.settings).gaddars), killCd: num(obj(o.settings).killCd, 25) },
    winner: o.winner === "GADDAAR" ? "GADDAAR" : o.winner === "GAONWALE" ? "GAONWALE" : undefined,
    meeting: str(meeting.by)
      ? {
          by: str(meeting.by) ?? "",
          byName: str(meeting.byName) ?? "Someone",
          why: meeting.why === "emergency" ? "emergency" : "report",
          result: meeting.result
            ? { ejected: str(result.ejected) ?? null, ejectedName: str(result.ejectedName), wasGaddar: result.wasGaddar === true, tally: Object.fromEntries(Object.entries(obj(result.tally)).map(([k, v]) => [k, num(v)])) }
            : undefined,
        }
      : undefined,
  };
}

export function readMe(raw: unknown): GaddarMe {
  const o = obj(raw);
  return {
    role: o.role === "GADDAR" ? "GADDAR" : o.role === "GAONWALA" ? "GAONWALA" : undefined,
    mates: Array.isArray(o.mates) ? o.mates.map(String) : [],
    killIn: num(o.killIn),
    sabIn: num(o.sabIn),
    fake: Array.isArray(o.fake) ? o.fake.map(String) : [],
    vent: o.vent ? { id: num(obj(o.vent).id), x: num(obj(o.vent).x), y: num(obj(o.vent).y), links: num(obj(o.vent).links) } : undefined,
    tasks: (Array.isArray(o.tasks) ? o.tasks : []).map((x) => {
      const t = obj(x);
      const kind = TASK_KINDS.includes(String(t.kind)) ? String(t.kind) : "hold";
      return { id: num(t.id), name: str(t.name) ?? "Kaam", kind: kind as GaddarTaskKind, x: num(t.x), y: num(t.y), p: num(t.p) };
    }),
    alive: o.alive !== false,
    canEmergency: o.canEmergency === true,
    myVote: str(o.myVote),
  };
}

export function readSnap(raw: unknown): GaddarSnap | null {
  const o = obj(raw);
  if (!Array.isArray(o.p)) return null;
  const sb = Array.isArray(o.sb) ? (o.sb as unknown[]) : null;
  return { t: num(o.t, Date.now()), p: o.p as GaddarSnap["p"], b: (Array.isArray(o.b) ? o.b : []) as GaddarSnap["b"], tp: num(o.tp), sb: sb ? [String(sb[0]), num(sb[1]), num(sb[2])] : undefined };
}

export function readMap(raw: unknown): GaddarMap | null {
  const o = obj(raw);
  if (!Array.isArray(o.walls)) return null;
  const pt = (v: unknown, d: [number, number]): [number, number] => (Array.isArray(v) ? [num(v[0], d[0]), num(v[1], d[1])] : d);
  const reactor = Array.isArray(o.reactor) ? o.reactor : [];
  return {
    id: str(o.id) ?? "gaon",
    name: str(o.name) ?? "Gaon",
    blurb: str(o.blurb) ?? "",
    w: num(o.w, 1600),
    h: num(o.h, 1000),
    radius: num(o.radius, 18),
    speed: num(o.speed, 190),
    ground: str(o.ground) ?? "#3f7d3a",
    meeting: pt(o.meeting, [800, 500]),
    walls: o.walls.map((x) => {
      const w = obj(x);
      return { x: num(w.x), y: num(w.y), w: num(w.w), h: num(w.h), kind: str(w.kind) ?? "wall", label: str(w.label) };
    }),
    decor: (Array.isArray(o.decor) ? o.decor : []).map((x) => {
      const d = obj(x);
      return { t: (d.t === "circle" ? "circle" : d.t === "text" ? "text" : "rect") as GaddarDecor["t"], x: num(d.x), y: num(d.y), w: num(d.w), h: num(d.h), c: str(d.c) ?? "#000", text: str(d.text) };
    }),
    tasks: (Array.isArray(o.tasks) ? o.tasks : []).map((x) => {
      const t = obj(x);
      const kind = TASK_KINDS.includes(String(t.kind)) ? String(t.kind) : "hold";
      return { id: num(t.id), name: str(t.name) ?? "Kaam", kind: kind as GaddarTaskKind, x: num(t.x), y: num(t.y) };
    }),
    vents: (Array.isArray(o.vents) ? o.vents : []).map((x) => {
      const v = obj(x);
      return { id: num(v.id), x: num(v.x), y: num(v.y), group: num(v.group) };
    }),
    lightFix: pt(o.lightFix, [0, 0]),
    reactor: [pt(reactor[0], [0, 0]), pt(reactor[1], [0, 0])],
  };
}

const opts = { auth: true, forbiddenIsAccess: true } as const;
/**
 * A game is either in a voice room (the id is the room's) or a table of its own: "t:<id>". The same calls work for both.
 */
export const tableKey = (id: string) => `t:${id}`;
const isTable = (key: string) => key.startsWith("t:");
const tid = (key: string) => encodeURIComponent(key.slice(2));
const base = (key: string) => (isTable(key) ? `/api/v1/gaddar/t/${tid(key)}` : `/api/v1/voice-rooms/${encodeURIComponent(key)}/gaddar`);

export type GaddarChat = { from: string; name: string; color: number; text: string; t: number };

export function readChat(raw: unknown): GaddarChat | null {
  const o = obj(raw);
  const text = str(o.text);
  if (!text) return null;
  return { from: str(o.from) ?? "", name: str(o.name) ?? "Gaonwala", color: num(o.color), text, t: num(o.t, Date.now()) };
}

export type GaddarBundle = { map: GaddarMap | null; state: GaddarState; me?: GaddarMe; snap?: GaddarSnap | null; chat: GaddarChat[] };

function bundle(raw: unknown): GaddarBundle {
  const o = obj(raw);
  const chat = (Array.isArray(o.chat) ? o.chat : []).flatMap((c) => {
    const x = readChat(c);
    return x ? [x] : [];
  });
  return { map: readMap(o.map), state: readState(o.state), me: o.me ? readMe(o.me) : undefined, snap: o.snap ? readSnap(o.snap) : undefined, chat };
}

export const gaddarApi = {
  get: async (roomId: string) => bundle(await api<unknown>(base(roomId), opts)),
  join: async (roomId: string) => bundle(await api<unknown>(`${base(roomId)}/join`, { ...opts, method: "POST", body: {} })),
  leave: async (roomId: string) => bundle(await api<unknown>(`${base(roomId)}/leave`, { ...opts, method: "POST", body: {} })),
  start: async (roomId: string) => bundle(await api<unknown>(`${base(roomId)}/start`, { ...opts, method: "POST", body: {} })),
  lobby: async (roomId: string) => bundle(await api<unknown>(`${base(roomId)}/lobby`, { ...opts, method: "POST", body: {} })),
  settings: async (roomId: string, s: Partial<GaddarSettings> & { isPublic?: boolean }) => bundle(await api<unknown>(`${base(roomId)}/settings`, { ...opts, method: "POST", body: s })),
  map: async (roomId: string, id: string) => readMap(await api<unknown>(`${base(roomId)}/map/${encodeURIComponent(id)}`, opts)),
  look: async (roomId: string, l: { hat: number; suit: number; acc: number }) => bundle(await api<unknown>(`${base(roomId)}/look`, { ...opts, method: "POST", body: l })),
  vote: async (roomId: string, target: string | null) => bundle(await api<unknown>(`${base(roomId)}/vote`, { ...opts, method: "POST", body: { target: target ? Number(target) : 0 } })),
};

export const gaddarTopic = (key: string) => (isTable(key) ? `/topic/gaddar/t/${tid(key)}` : `/topic/voice-rooms/${encodeURIComponent(key)}/gaddar`);
export const gaddarMoveDest = (key: string) => (isTable(key) ? `/app/gaddar/t/${tid(key)}` : `/app/voice-rooms/${encodeURIComponent(key)}/gaddar`);
export const gaddarActDest = (key: string) => (isTable(key) ? `/app/gaddar/t/${tid(key)}/act` : `/app/voice-rooms/${encodeURIComponent(key)}/gaddar.act`);
export const gaddarChatDest = (key: string) => (isTable(key) ? `/app/gaddar/t/${tid(key)}/chat` : `/app/voice-rooms/${encodeURIComponent(key)}/gaddar.chat`);

/** Games on their own: open one, find open ones, or join with a code. */
export type GaddarOpenTable = { id: string; host: string; players: number; max: number; map: string };
export const gaddarTables = {
  create: async () => bundle(await api<unknown>("/api/v1/gaddar/tables", { ...opts, method: "POST", body: {} })),
  join: async (code: string) => bundle(await api<unknown>("/api/v1/gaddar/tables/join", { ...opts, method: "POST", body: { code } })),
  list: async (): Promise<GaddarOpenTable[]> => {
    const r = await api<unknown>("/api/v1/gaddar/tables", opts);
    return (Array.isArray(r) ? r : []).map((x) => {
      const t = obj(x);
      return { id: str(t.id) ?? "", host: str(t.host) ?? "Someone", players: num(t.players), max: num(t.max, 10), map: str(t.map) ?? "random" };
    });
  },
};
export const GADDAR_ME_QUEUE = "/user/queue/gaddar";

export const GADDAR_COLORS = ["#e5484d", "#3e8ef7", "#2ea44f", "#f5a623", "#a855f7", "#14b8a6", "#f472b6", "#a0673a", "#94a3b8", "#eab308"];
