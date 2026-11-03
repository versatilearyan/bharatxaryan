/**
 * Shop, Bag and CP couples.
 *
 * Shop: chat bubbles you rent for 2 or 6 days, and wedding rings you keep.
 * Bag: what you own. Rented bubbles count down and switch off when they expire;
 * rings wait in the bag until you propose with one.
 * CP: propose to anyone with a ring and a message. Once they accept you're a
 * couple: gifts between you add love, love raises the couple level, and the
 * ring goes into your shared ring box.
 */
import { PEOPLE } from "./data";
import { seeded } from "./social";

/* ---------------- Rings ---------------- */

/**
 * Wedding rings sold in the Shop. To add a ring: put a square transparent PNG in
 * public/rings/ and add one line here (ids are saved in people's bags, so keep them stable).
 */
export const RINGS = [
  { id: "phool-kali", name: "Phool Kali", price: 999, rarity: "Common", image: "/rings/phool-kali.png" },
  { id: "moti-seep", name: "Moti Seep", price: 1_999, rarity: "Common", image: "/rings/moti-seep.png" },
  { id: "laal-bel", name: "Laal Bel", price: 2_999, rarity: "Rare", image: "/rings/laal-bel.png" },
  { id: "titli-rani", name: "Titli Rani", price: 3_999, rarity: "Rare", image: "/rings/titli-rani.png" },
  { id: "gulabi-dil", name: "Gulabi Dil", price: 5_200, rarity: "Epic", image: "/rings/gulabi-dil.png" },
  { id: "taara-boond", name: "Taara Boond", price: 7_777, rarity: "Epic", image: "/rings/taara-boond.png" },
  { id: "samundar-lehar", name: "Samundar Lehar", price: 9_999, rarity: "Epic", image: "/rings/samundar-lehar.png" },
  { id: "chand-titli", name: "Chand Titli", price: 13_140, rarity: "Legendary", image: "/rings/chand-titli.png" },
] as const satisfies readonly { id: string; name: string; price: number; rarity: "Common" | "Rare" | "Epic" | "Legendary"; image: string }[];
export type Ring = (typeof RINGS)[number];
export type RingId = Ring["id"];
export const ringById = (id: RingId): Ring => RINGS.find((r) => r.id === id) ?? RINGS[0];

/* ---------------- Rentals ---------------- */

export type RentDays = 2 | 6;
export const RENT_DAYS: RentDays[] = [2, 6];
export const DAY_MS = 86_400_000;

/** The animated VIP frame, chat bubble and entry banner unlock at VIP 10. */
export const VIP_EFFECTS_LEVEL = 10;

/* ---------------- Chat bubbles ---------------- */

export type BubbleId = "marigold" | "peacock" | "chandni";
export type ShopBubble = { id: BubbleId; name: string; prices: Record<RentDays, number>; className: string };
/** Chat bubbles rented in the Shop. `className` styles your room chat lines while you wear one. */
export const SHOP_BUBBLES: ShopBubble[] = [
  { id: "marigold", name: "Genda Phool", prices: { 2: 500, 6: 1_200 }, className: "bg-gradient-to-r from-[#ff9a1f] to-[#ff5a1f] text-white ring-2 ring-[#ffd36e]/80 shadow-[0_0_12px_-2px_rgb(255_150_30/0.7)]" },
  { id: "peacock", name: "Mor Pankh", prices: { 2: 800, 6: 1_900 }, className: "bg-gradient-to-r from-[#0f6e8c] to-[#1fa37a] text-white ring-2 ring-[#5ad1c0]/80 shadow-[0_0_12px_-2px_rgb(30_200_170/0.6)]" },
  { id: "chandni", name: "Chandni Raat", prices: { 2: 1_200, 6: 2_800 }, className: "bg-gradient-to-r from-[#2a1d6b] to-[#5a2a8c] text-[#fff3c4] ring-2 ring-[#e7bc72]/80 shadow-[0_0_14px_-2px_rgb(140_90_255/0.6)]" },
];
export const bubbleById = (id: BubbleId) => SHOP_BUBBLES.find((b) => b.id === id) ?? SHOP_BUBBLES[0];

/* ---------------- Bag ---------------- */

export type BagItem =
  | { id: string; kind: "bubble"; bubble: BubbleId; expiresAt: number; source: string }
  | { id: string; kind: "ring"; ring: RingId; source: string };

/* ---------------- Profile visitors ---------------- */

/** One person's visits to a profile: when they last came and how many times. */
export type Visit = { id: string; at: number; times: number };

/** "Just now", "12 min ago", "3 h ago", "Yesterday", "4 days ago" */
export function timeAgo(at: number, now = Date.now()) {
  const m = Math.floor((now - at) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

/** Moves a person's visit to the top of a list, counting the repeat. */
export const addVisit = (list: Visit[], id: string, at = Date.now()): Visit[] => {
  const had = list.find((v) => v.id === id);
  return [{ id, at, times: (had?.times ?? 0) + 1 }, ...list.filter((v) => v.id !== id)].slice(0, 100);
};

/** Visitor log: pay coins to see who opened your profile, for a while. */
export const VISITOR_LOG_PLANS = [
  { id: "2d", days: 2, label: "2 days", price: 60 },
  { id: "7d", days: 7, label: "7 days", price: 200 },
  { id: "30d", days: 30, label: "1 month", price: 1200 },
] as const;
export type VisitorLogPlanId = (typeof VISITOR_LOG_PLANS)[number]["id"];

/** "1d 23h left", "5h left", "Expired" */
export function timeLeft(expiresAt: number, now = Date.now()) {
  const ms = expiresAt - now;
  if (ms <= 0) return "Expired";
  const d = Math.floor(ms / DAY_MS);
  const h = Math.floor((ms % DAY_MS) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d ? `${d}d ${h}h left` : h ? `${h}h ${m}m left` : `${Math.max(1, m)}m left`;
}

/* ---------------- Couples ---------------- */

/** blessings/blessedBy: blessings the couple already had before this device (sample couples). */
export type Couple = { id: string; a: string; b: string; ring: RingId; rings: RingId[]; since: number; love: number; message?: string; blessings?: number; blessedBy?: string[] };
export type Blessing = { id: string; by: string; at: number };
/** A blessing costs 99 coins and adds 99 love to the couple. */
export const BLESSING_COST = 99;

/** Love needed for each couple level (Lv 1 at 0). */
export const LOVE_LEVELS = [0, 520, 1_314, 5_200, 13_140, 52_000, 131_400, 520_000];
export function loveLevel(love: number) {
  const idx = LOVE_LEVELS.reduce((acc, min, i) => (love >= min ? i : acc), 0);
  const next = LOVE_LEVELS[idx + 1] ?? null;
  const floor = LOVE_LEVELS[idx];
  return { level: idx + 1, next, progress: next ? (love - floor) / (next - floor) : 1 };
}
export const daysTogether = (since: number, now = Date.now()) => Math.max(1, Math.floor((now - since) / DAY_MS) + 1);

export const PROPOSAL_LINES = [
  "Will you be my CP? Every room feels better with you in it.",
  "Chai, Ludo and you. Will you be mine?",
  "I saved my favourite seat for you. Say yes?",
];

const ago = (days: number) => Date.now() - days * DAY_MS;
/** No sample couples. */
export const SAMPLE_COUPLES: Couple[] = [];
export const partnerIn = (c: Couple, id: string) => (c.a === id ? c.b : c.a);

/* ---------------- Ranking ---------------- */

export type RankTab = "popularity" | "vip" | "couple" | "room";
export type RankPeriod = "today" | "yesterday" | "week";
export const RANK_TABS: { id: RankTab; label: string; unit: string }[] = [
  { id: "popularity", label: "Popularity", unit: "Charm" },
  { id: "vip", label: "VIP", unit: "Coins spent" },
  { id: "couple", label: "Couple", unit: "Love" },
  { id: "room", label: "Room", unit: "Room points" },
];
export const RANK_PERIODS: { id: RankPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
];
const PERIOD_SCALE: Record<RankPeriod, number> = { today: 1, yesterday: 1.15, week: 6.5 };

/** Sample people's score for a tab and period, stable for the demo. */
export function sampleScore(id: string, tab: RankTab, period: RankPeriod) {
  const p = PEOPLE.find((x) => x.id === id);
  const base = tab === "popularity" ? (p?.followers ?? 500) * 22 : tab === "vip" ? ((p?.vip ?? 0) + 1) * 26_000 : 40_000;
  return Math.round(base * (0.35 + seeded(`${id}:${tab}:${period}`)) * PERIOD_SCALE[period]);
}
export const periodShare = (period: RankPeriod) => PERIOD_SCALE[period] / PERIOD_SCALE.week;
