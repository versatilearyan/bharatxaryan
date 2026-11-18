/**
 * PK Coins: a currency of its own, earned by sending gifts while a PK is live and spent in the Shop's PK section.
 *   GET /api/v1/pk-coins/me · GET /api/v1/pk-coins/me/transactions · GET /api/v1/pk-coins/ranking?period=
 */
import { api } from "./client";

export type PkPeriod = "week" | "month" | "all";
export type PkStanding = { score: number; rank: number | null };
export type PkMe = { balance: number; earned: number; week: PkStanding; month: PkStanding; all: PkStanding; enabled: boolean; percent: number; officialBonus: number; itemDays: number };
export type PkTx = { id: string; amount: number; kind: "EARN" | "SPEND" | "GRANT" | "DEDUCT"; ref?: string; reason?: string; balanceAfter: number; at: string };
export type PkRow = { rank: number; userId: string; name: string; avatarUrl?: string; publicId?: string; vipLevel?: number; score: number };
export type PkRanking = { period: PkPeriod; rows: PkRow[]; me: PkStanding };

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : 0);
const s = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : undefined);
const standing = (v: unknown): PkStanding => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { score: n(o.score), rank: typeof o.rank === "number" ? o.rank : null };
};

export async function getPkMe(): Promise<PkMe> {
  const d = ((await api<unknown>("/api/v1/pk-coins/me", { auth: true, forbiddenIsAccess: true })) ?? {}) as Record<string, unknown>;
  return {
    balance: n(d.balance),
    earned: n(d.earned),
    week: standing(d.week),
    month: standing(d.month),
    all: standing(d.all),
    enabled: d.enabled !== false,
    percent: n(d.percent),
    officialBonus: n(d.officialBonus),
    itemDays: n(d.itemDays) || 7,
  };
}

export async function getPkHistory(limit = 50): Promise<PkTx[]> {
  const d = await api<unknown>(`/api/v1/pk-coins/me/transactions?limit=${limit}`, { auth: true, forbiddenIsAccess: true });
  if (!Array.isArray(d)) return [];
  return d.map((x) => {
    const o = x as Record<string, unknown>;
    const kind = (["EARN", "SPEND", "GRANT", "DEDUCT"].includes(o.kind as string) ? o.kind : "EARN") as PkTx["kind"];
    return { id: s(o.id) ?? "", amount: n(o.amount), kind, ref: s(o.ref), reason: s(o.reason), balanceAfter: n(o.balanceAfter), at: s(o.at) ?? "" };
  });
}

export async function getPkRanking(period: PkPeriod): Promise<PkRanking> {
  const d = ((await api<unknown>(`/api/v1/pk-coins/ranking?period=${period}`, { auth: true, forbiddenIsAccess: true })) ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(d.rows)
    ? d.rows.map((x) => {
        const o = x as Record<string, unknown>;
        return { rank: n(o.rank), userId: s(o.userId) ?? "", name: s(o.name) ?? "Player", avatarUrl: s(o.avatarUrl), publicId: s(o.publicId), vipLevel: typeof o.vipLevel === "number" ? o.vipLevel : undefined, score: n(o.score) };
      })
    : [];
  return { period, rows, me: standing(d.me) };
}
