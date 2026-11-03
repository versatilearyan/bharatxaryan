/**
 * Leaderboards from real gifts: GET /api/v1/rankings?type=charm|wealth|room&period=today|yesterday|week|month|total
 * charm: charm received (1 per 5 coins of gifts, double at weekends). wealth: coins spent on gifts.
 * room: room points from gifts in each room.
 */
import { api } from "./client";
import { mediaSrc } from "./rewards";

export type RankingType = "charm" | "wealth" | "room";
export type RankingPeriod = "today" | "yesterday" | "week" | "month" | "total";
export type RankingRow = { rank: number; value: number; userId?: string; publicId?: string; name: string; avatarUrl?: string; vipLevel?: number; roomId?: string; roomCode?: string; live?: boolean };
export type Ranking = { rows: RankingRow[]; me: { rank: number | null; value: number } };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export async function getRanking(type: RankingType, period: RankingPeriod): Promise<Ranking> {
  const d = obj(await api<unknown>(`/api/v1/rankings?type=${type}&period=${period}`, { auth: true, forbiddenIsAccess: true }));
  const rows = Array.isArray(d?.rows)
    ? d.rows.flatMap((r) => {
        const o = obj(r);
        if (!o) return [];
        return [
          {
            rank: num(o.rank),
            value: num(o.value),
            userId: str(o.userId),
            publicId: str(o.publicId),
            name: str(o.name) ?? "Someone",
            avatarUrl: mediaSrc(o.avatarUrl) ?? undefined,
            vipLevel: typeof o.vipLevel === "number" ? o.vipLevel : undefined,
            roomId: str(o.roomId),
            roomCode: str(o.roomCode),
            live: o.live === true,
          },
        ];
      })
    : [];
  const me = obj(d?.me);
  return { rows, me: { rank: typeof me?.rank === "number" ? me.rank : null, value: num(me?.value) } };
}
