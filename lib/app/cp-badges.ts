/**
 * The ten CP levels and their badges. A couple's level comes only from the shared Charm earned by
 * gifts the two partners send each other. The server (CpService.LOVE_LEVELS) enforces the same numbers.
 */
export type CpBadge = { level: number; name: string; /** Total Charm needed for this level. */ need: number; img: string };

export const CP_BADGES: CpBadge[] = [
  { level: 1, name: "New Couple", need: 0, img: "/assets/cp-badges/level-1.png" },
  { level: 2, name: "Sweet Pair", need: 5_000, img: "/assets/cp-badges/level-2.png" },
  { level: 3, name: "Loving Duo", need: 15_000, img: "/assets/cp-badges/level-3.png" },
  { level: 4, name: "Heart Partner", need: 35_000, img: "/assets/cp-badges/level-4.png" },
  { level: 5, name: "Romantic Couple", need: 75_000, img: "/assets/cp-badges/level-5.png" },
  { level: 6, name: "True Partner", need: 150_000, img: "/assets/cp-badges/level-6.png" },
  { level: 7, name: "Soulmate", need: 250_000, img: "/assets/cp-badges/level-7.png" },
  { level: 8, name: "Destined Couple", need: 400_000, img: "/assets/cp-badges/level-8.png" },
  { level: 9, name: "Eternal Partner", need: 600_000, img: "/assets/cp-badges/level-9.png" },
  { level: 10, name: "Legendary Couple", need: 1_000_000, img: "/assets/cp-badges/level-10.png" },
];

export const badgeOf = (level: number): CpBadge => CP_BADGES[Math.min(CP_BADGES.length, Math.max(1, level)) - 1];

/** Level, the badges around it and the progress to the next one, from the shared Charm. */
export function cpProgress(charm: number) {
  const idx = CP_BADGES.reduce((acc, b, i) => (charm >= b.need ? i : acc), 0);
  const cur = CP_BADGES[idx];
  const next = CP_BADGES[idx + 1] ?? null;
  return {
    badge: cur,
    next,
    remaining: next ? next.need - charm : 0,
    progress: next ? (charm - cur.need) / (next.need - cur.need) : 1,
  };
}
