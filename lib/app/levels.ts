/**
 * Growth rules.
 *
 * VIP: a monthly subscription (VIP_PRICE_INR, paid at checkout) makes you VIP 1. While you're VIP,
 * every 100 coins you spend (gifts, shop, permanent rooms, draws, ...) adds 1
 * growth point, and your VIP level is read off your growth: VIP 2 at 1,000,
 * up to VIP 11 at 4,800,000. Coins spent while you're not VIP add nothing.
 * Room level: every 1 coin gifted inside a permanent room adds 100 room points.
 * Thresholds are the total points needed to reach each level.
 */

/** Room points per coin gifted in a room. */
export const POINTS_PER_COIN = 100;

/** Coins to spend for 1 VIP growth point. */
export const COINS_PER_GROWTH = 100;

/** The monthly VIP subscription price in rupees (incl. GST), for VIP_DAYS. */
export const VIP_PRICE_INR = 299;

/** Growth points needed for VIP 1 … VIP 11. VIP 1 needs none: you get it by becoming VIP. */
/** (10x the first version; same as the server's VipLevelService.) */
export const VIP_THRESHOLDS = [0, 10_000, 50_000, 250_000, 600_000, 1_400_000, 3_000_000, 6_000_000, 10_800_000, 20_000_000, 48_000_000];

/** Points needed for room level 1 … 10. Level 1 is free. */
/** (10x the first version.) */
export const ROOM_THRESHOLDS = [0, 100_000, 500_000, 1_500_000, 4_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 250_000_000];

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

/** Growth from coins spent while VIP. Whole points only: 150 coins is 1 point. */
export const growthFor = (coins: number) => Math.floor(coins / COINS_PER_GROWTH);

/**
 * VIP level from growth points. Not a member: level 0, whatever the growth.
 * A member is at least VIP 1.
 */
export function vipLevel(growth: number, member = true): LevelInfo {
  if (!member) return { level: 0, points: 0, floor: 0, next: null, progress: 0 };
  return levelFor(Math.max(0, Math.floor(growth)), VIP_THRESHOLDS);
}
export const roomLevel = (points: number) => levelFor(points, ROOM_THRESHOLDS);

/**
 * Voice room levels of backend rooms, from room EXP. Same table as the server (RoomLevels).
 * A room earns EXP from people spending time in it and from gifts and red packets, up to a daily cap.
 */
export const ROOM_LEVEL_TABLE = [
  { level: 1, exp: 0, members: 1_000, admins: 3, coOwners: 0, cards: 2, background: "" },
  { level: 2, exp: 8_000, members: 2_000, admins: 4, coOwners: 0, cards: 2, background: "" },
  { level: 3, exp: 30_000, members: 3_000, admins: 5, coOwners: 0, cards: 2, background: "Club" },
  { level: 4, exp: 100_000, members: 5_000, admins: 6, coOwners: 0, cards: 2, background: "" },
  { level: 5, exp: 300_000, members: 7_000, admins: 7, coOwners: 1, cards: 3, background: "Diamonden Party" },
  { level: 6, exp: 800_000, members: 10_000, admins: 8, coOwners: 1, cards: 3, background: "" },
  { level: 7, exp: 2_000_000, members: 20_000, admins: 9, coOwners: 1, cards: 4, background: "Stars of a different world" },
  { level: 8, exp: 4_800_000, members: 30_000, admins: 10, coOwners: 2, cards: 4, background: "" },
  { level: 9, exp: 11_000_000, members: 40_000, admins: 12, coOwners: 2, cards: 5, background: "Future City" },
  { level: 10, exp: 24_000_000, members: 50_000, admins: 15, coOwners: 2, cards: 5, background: "Custom background" },
] as const;
export const ROOM_EXP_THRESHOLDS: number[] = ROOM_LEVEL_TABLE.map((r) => r.exp);
export const roomExpLevel = (exp: number) => levelFor(exp, ROOM_EXP_THRESHOLDS);

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
