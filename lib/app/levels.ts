/**
 * Growth rules.
 *
 * VIP: every 1 coin you spend (gifts, permanent rooms) adds 100 VIP growth points.
 * Room level: every 1 coin gifted inside a permanent room adds 100 room points.
 * Thresholds are the total points needed to reach each level.
 */

export const POINTS_PER_COIN = 100;

/** Points needed for VIP 1 … VIP 10 (VIP 1 = 100 coins spent, VIP 10 = 500,000 coins). */
export const VIP_THRESHOLDS = [10_000, 50_000, 150_000, 400_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000];

/** Points needed for room level 1 … 10. Level 1 is free. */
export const ROOM_THRESHOLDS = [0, 10_000, 50_000, 150_000, 400_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000];

export type LevelInfo = {
  level: number;
  points: number;
  /** Points at the start of the current level. */
  floor: number;
  /** Points needed for the next level, or null at max. */
  next: number | null;
  /** 0–1 progress toward the next level. */
  progress: number;
};

export function levelFor(points: number, thresholds: number[]): LevelInfo {
  let level = 0;
  thresholds.forEach((t, i) => {
    if (points >= t) level = i + 1;
  });
  const floor = level > 0 ? thresholds[level - 1] : 0;
  const next = level < thresholds.length ? thresholds[level] : null;
  const progress = next === null ? 1 : (points - floor) / (next - floor);
  return { level, points, floor, next, progress: Math.max(0, Math.min(1, progress)) };
}

export const vipLevel = (points: number) => levelFor(points, VIP_THRESHOLDS);
export const roomLevel = (points: number) => levelFor(points, ROOM_THRESHOLDS);

export const formatPoints = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M` : n >= 10_000 ? `${Math.round(n / 1000)}K` : n.toLocaleString("en-IN");

/** From VIP 6 your name (and your VIP room's name) shines gold. */
export const GOLD_NAME_VIP = 6;
export const isGoldName = (vip?: number) => (vip ?? 0) >= GOLD_NAME_VIP;
/**
 * Class for a VIP's name, always with a light sweeping across it. VIP 6+ names
 * are gold everywhere. VIP 1–5 names are red outside rooms ("out": profiles,
 * cards, lists) and white with a red shine inside a room ("room": seats, room
 * chat). "" for everyone else, so callers can fall back to their own colour:
 * `vipName(p.vip) || "text-cream"`.
 */
export const vipName = (vip?: number, where: "out" | "room" = "out") =>
  isGoldName(vip) ? "gold-shine pr-0.5" : (vip ?? 0) >= 1 ? (where === "room" ? "vip-shine pr-0.5" : "vip-red pr-0.5") : "";
