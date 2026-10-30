/**
 * Charm and Active Level, WePlay style.
 *
 * Charm measures popularity and only comes from gifts you receive:
 * every 5 coins of gifts = 1 charm point (every 2.5 coins on Double Charm Days).
 * Crossing the milestones raises your charm level: Star 1–3, Diamond 4–6, Crown 7–12.
 *
 * Active Level is driven by EXP from activity: game wins, time in voice rooms
 * (with time decay), daily tasks, adding friends and coin packs. Each source
 * has its own daily cap so the level can't be farmed.
 */
import type { Person } from "./types";

/* ---------------- Charm ---------------- */

export type CharmIcon = "star" | "diamond" | "crown";
export const CHARM_TIERS = [
  { name: "Star 1", icon: "star", rank: 1, min: 1_000 },
  { name: "Star 2", icon: "star", rank: 2, min: 4_000 },
  { name: "Star 3", icon: "star", rank: 3, min: 12_000 },
  { name: "Diamond 4", icon: "diamond", rank: 4, min: 30_000 },
  { name: "Diamond 5", icon: "diamond", rank: 5, min: 80_000 },
  { name: "Diamond 6", icon: "diamond", rank: 6, min: 160_000 },
  { name: "Crown 7", icon: "crown", rank: 7, min: 300_000 },
  { name: "Crown 8", icon: "crown", rank: 8, min: 500_000 },
  { name: "Crown 9", icon: "crown", rank: 9, min: 1_000_000 },
  { name: "Crown 10", icon: "crown", rank: 10, min: 2_000_000 },
  { name: "Crown 11", icon: "crown", rank: 11, min: 3_500_000 },
  { name: "Crown 12", icon: "crown", rank: 12, min: 6_000_000 },
] as const satisfies readonly { name: string; icon: CharmIcon; rank: number; min: number }[];
export type CharmTier = (typeof CHARM_TIERS)[number];

/**
 * Artwork for each charm level badge (1–12), in public/charm/. `blank` is the
 * badge with its number painted out: on profiles the charm count is written
 * there, everywhere else the level number. `src` (optional) is a badge whose
 * own number already matches its level, used as is outside profiles. The
 * supplied art for levels 2–12 carries other numbers (10, 30, 40…), so those
 * only have `blank`. Images are wide: width = height × `ratio`. Levels without
 * art use the built-in star / diamond / crown drawing.
 */
export type CharmBadgeArt = { src?: string; blank: string; ratio: number };
export const CHARM_BADGE_ART: Partial<Record<number, CharmBadgeArt>> = {
  1: { src: "/charm/1.png", blank: "/charm/1-blank.png", ratio: 240 / 86 },
  2: { blank: "/charm/2-blank.png", ratio: 240 / 85 },
  3: { blank: "/charm/3-blank.png", ratio: 240 / 87 },
  4: { blank: "/charm/4-blank.png", ratio: 240 / 86 },
  5: { blank: "/charm/5-blank.png", ratio: 240 / 81 },
  6: { blank: "/charm/6-blank.png", ratio: 240 / 79 },
  7: { blank: "/charm/7-blank.png", ratio: 240 / 72 },
  8: { blank: "/charm/8-blank.png", ratio: 240 / 78 },
  9: { blank: "/charm/9-blank.png", ratio: 240 / 83 },
  10: { blank: "/charm/10-blank.png", ratio: 240 / 87 },
  11: { blank: "/charm/11-blank.png", ratio: 240 / 94 },
  12: { blank: "/charm/12-blank.png", ratio: 240 / 90 },
};

/** Saturdays and Sundays are Double Charm Days. */
export const isDoubleCharmDay = (d: Date = new Date()) => d.getDay() === 0 || d.getDay() === 6;
export const CHARM_COINS_PER_POINT = 5;

/** Charm points for a gift of this coin value received now. */
export const charmFromCoins = (coins: number, d: Date = new Date()) => coins / (isDoubleCharmDay(d) ? CHARM_COINS_PER_POINT / 2 : CHARM_COINS_PER_POINT);

/** Share of a gift's coin value the receiver gets back as coins (gift earnings). */
export const GIFT_EARN_SHARE = 0.3;
export const giftEarnings = (coins: number) => Math.floor(coins * GIFT_EARN_SHARE);

export function charmInfo(points: number) {
  const idx = CHARM_TIERS.reduce((acc, t, i) => (points >= t.min ? i : acc), -1);
  const tier: CharmTier | null = idx >= 0 ? CHARM_TIERS[idx] : null;
  const nextTier: CharmTier | null = CHARM_TIERS[idx + 1] ?? null;
  const floor = tier?.min ?? 0;
  const progress = nextTier ? Math.max(0, Math.min(1, (points - floor) / (nextTier.min - floor))) : 1;
  return { points: Math.floor(points), tier, nextTier, progress };
}

/** Sample people's charm before this device's gifts, so rooms show a spread of icons. */
export const sampleCharm = (p: Pick<Person, "followers">) => Math.round(p.followers * 2.4);

/* ---------------- Active Level & EXP ---------------- */

/** EXP needed to go from level n to n + 1. */
export const expToNext = (level: number) => 200 + 12 * level * level;

export const EXP_SOURCES = {
  game: { label: "Game wins", detail: "20 EXP per game won", cap: 400 },
  voice: { label: "Voice rooms", detail: "On mic 4 EXP/min, listening 1 EXP/min. Halves after 10 min, quarters after 30 min", cap: 120 },
  task: { label: "Daily tasks", detail: "50 EXP per task claimed", cap: 250 },
  friend: { label: "Adding friends", detail: "10 EXP per new friend", cap: 50 },
  purchase: { label: "Coin packs", detail: "10,000+ coins in one pack: 5,000–10,000 EXP instantly", cap: Infinity },
} as const;
export type ExpSource = keyof typeof EXP_SOURCES;

export const GAME_WIN_EXP = 20;
export const TASK_EXP = 50;
export const FRIEND_EXP = 10;

/** Voice room EXP for one minute: more for being on mic, decaying the longer you stay. */
export function voiceExpForMinute(minute: number, onMic: boolean) {
  const base = onMic ? 4 : 1;
  const decay = minute < 10 ? 1 : minute < 30 ? 0.5 : 0.25;
  return base * decay;
}

/** EXP for a coin pack. Big packs (10,000+) get the instant 5,000–10,000 EXP boost. */
export const purchaseExp = (coins: number) => (coins >= 10_000 ? Math.min(10_000, Math.max(5_000, Math.round(coins / 2))) : Math.round(coins / 10));

/** Today's date key for daily caps. */
export const dayKey = (d: Date = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
