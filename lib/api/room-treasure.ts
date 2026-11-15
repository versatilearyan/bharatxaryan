/**
 * Room treasure ("Daily Task" in a voice room): boxes open as you spend time in voice rooms today.
 *   GET  /api/v1/room-treasure/me
 *   POST /api/v1/room-treasure/claim  { boxId }
 */
import { api } from "./client";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const opts = { auth: true, forbiddenIsAccess: true } as const;

export type TreasureBoxState = "CLAIMED" | "CLAIMABLE" | "COUNTDOWN" | "PREPARING";
export type TreasureBox = { id: string; minutes: number; coins: number; vipOnly: boolean; locked: boolean; state: TreasureBoxState; secondsLeft: number };
export type TreasureTask = { kind: "FOLLOW_ROOM" | "SEND_GIFT" | "SEND_MESSAGE"; title: string; minutes: number; done: boolean };
export type RoomTreasure = { enabled: boolean; vip: boolean; earnedSeconds: number; boxes: TreasureBox[]; tasks: TreasureTask[]; got?: number; at: number };

function read(raw: unknown): RoomTreasure {
  const d = obj(raw);
  const enabled = d?.enabled === true;
  const boxes: TreasureBox[] = Array.isArray(d?.boxes)
    ? (d!.boxes as unknown[]).flatMap((b) => {
        const o = obj(b);
        const id = o ? String(o.id ?? "") : "";
        if (!o || !id) return [];
        const state = o.state === "CLAIMED" || o.state === "CLAIMABLE" || o.state === "COUNTDOWN" ? o.state : "PREPARING";
        return [{ id, minutes: num(o.minutes), coins: num(o.coins), vipOnly: o.vipOnly === true, locked: o.locked === true, state, secondsLeft: num(o.secondsLeft) } as TreasureBox];
      })
    : [];
  const tasks: TreasureTask[] = Array.isArray(d?.tasks)
    ? (d!.tasks as unknown[]).flatMap((t) => {
        const o = obj(t);
        const kind = o?.kind;
        if (!o || (kind !== "FOLLOW_ROOM" && kind !== "SEND_GIFT" && kind !== "SEND_MESSAGE")) return [];
        return [{ kind, title: String(o.title ?? ""), minutes: num(o.minutes), done: o.done === true } as TreasureTask];
      })
    : [];
  return { enabled, vip: d?.vip === true, earnedSeconds: num(d?.earnedSeconds), boxes, tasks, got: d?.got === undefined ? undefined : num(d.got), at: Date.now() };
}

export const roomTreasureApi = {
  me: async () => read(await api<unknown>("/api/v1/room-treasure/me", opts)),
  claim: async (boxId: string) => read(await api<unknown>("/api/v1/room-treasure/claim", { ...opts, method: "POST", body: { boxId } })),
};
