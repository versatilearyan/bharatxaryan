/** Parivar (family): a long-lived group with a Mukhiya, levels, a tag on members' names and its own chat. */

export type ParivarRole = "mukhiya" | "up-mukhiya" | "sadasya";
export type ParivarMember = { id: string; role: ParivarRole; contribution: number; joinedAt: number };
export type Parivar = {
  id: string;
  /** Numeric ID people can search for. */
  code: string;
  name: string;
  /** 2–4 letter tag shown next to members' names. */
  tag: string;
  emblem: string;
  color: string;
  announcement: string;
  /** Open: anyone joins straight away. Approval: the Mukhiya or an Up-Mukhiya accepts requests. */
  joinMode: "open" | "approval";
  xp: number;
  /** Parivar EXP earned this week, for the ranking. */
  weekXp: number;
  members: ParivarMember[];
  createdAt: number;
};
export type ParivarChat = { id: string; authorId: string; text: string; at: number };

/** Parivar is shown as "Coming soon" until this is switched on. All the logic below is ready. */
export const PARIVAR_ENABLED = false;

export const PARIVAR_CREATE_COST = 5_000;
/** EXP to reach Lv 1 … Lv 7. */
export const PARIVAR_LEVELS = [0, 5_000, 20_000, 60_000, 150_000, 400_000, 1_000_000];
export const CHECKIN_XP = 50;
/** Gifts members send add 1 Parivar EXP per 10 coins. */
export const GIFT_COINS_PER_XP = 10;

export const ROLE_LABEL: Record<ParivarRole, string> = { mukhiya: "Mukhiya", "up-mukhiya": "Up-Mukhiya", sadasya: "Sadasya" };
export const ROLE_ORDER: ParivarRole[] = ["mukhiya", "up-mukhiya", "sadasya"];

export const EMBLEMS = ["🪔", "🦚", "👑", "🐘", "🌺", "🏏", "🎵", "🌙", "🔥", "🪷"];
export const COLORS = ["#e7bc72", "#f4515b", "#19c3b2", "#8f6bff", "#ff8a3d", "#3fa7ff", "#ff5c8a", "#6fe0a6"];

export function parivarLevel(xp: number) {
  const idx = PARIVAR_LEVELS.reduce((acc, min, i) => (xp >= min ? i : acc), 0);
  const level = idx + 1;
  const floor = PARIVAR_LEVELS[idx];
  const next = PARIVAR_LEVELS[idx + 1] ?? null;
  return { level, next, progress: next ? (xp - floor) / (next - floor) : 1 };
}
/** Members allowed: 20 at Lv 1, +5 per level. */
export const memberCap = (level: number) => 15 + level * 5;
/** Up-Mukhiyas allowed: 1 at Lv 1, one more every two levels. */
export const deputyCap = (level: number) => 1 + Math.floor(level / 2);

const DAY = 86_400_000;
const ago = (d: number) => Date.now() - d * DAY;
const m = (id: string, role: ParivarRole, contribution: number, days: number): ParivarMember => ({ id, role, contribution, joinedAt: ago(days) });

/** No sample families. */
export const SAMPLE_PARIVARS: Parivar[] = [];

export const PARIVAR_CHATTER = [
  "Sab log check in kar lo aaj 🙏",
  "Who's coming to the room tonight?",
  "Congrats on the level up everyone! 🎉",
  "Ludo after dinner?",
  "Welcome to the new members ❤️",
  "Let's push for the weekly top 3!",
  "Good morning Parivar ☀️",
];
