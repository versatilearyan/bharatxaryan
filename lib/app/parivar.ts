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

export const SAMPLE_PARIVARS: Parivar[] = [
  { id: "pv-chai", code: "880101", name: "Chai Wale Parivar", tag: "CHAI", emblem: "🪔", color: "#e7bc72", announcement: "Har shaam 9 baje Sunday chai adda mein milte hain. Check in daily!", joinMode: "approval", xp: 182_400, weekXp: 14_820, members: [m("riya", "mukhiya", 64_200, 210), m("kabir", "up-mukhiya", 41_900, 180), m("meher", "sadasya", 18_300, 90)], createdAt: ago(210) },
  { id: "pv-darbar", code: "880214", name: "Dilli Darbar", tag: "DLI", emblem: "👑", color: "#f4515b", announcement: "Royal vibes only. Gift wars every Friday.", joinMode: "open", xp: 64_000, weekXp: 9_340, members: [m("dev", "mukhiya", 30_100, 120), m("zoya", "up-mukhiya", 21_800, 110)], createdAt: ago(120) },
  { id: "pv-mor", code: "880377", name: "Mor Mandali", tag: "MOR", emblem: "🦚", color: "#19c3b2", announcement: "Shayari, ghazals and good company 🌙", joinMode: "open", xp: 21_500, weekXp: 6_120, members: [m("naina", "mukhiya", 12_400, 60), m("anaya", "sadasya", 5_200, 40)], createdAt: ago(60) },
  { id: "pv-sixer", code: "880452", name: "Sixer Squad", tag: "SIX", emblem: "🏏", color: "#3fa7ff", announcement: "Cricket commentary rooms on match days. Apply with your fav player!", joinMode: "approval", xp: 7_800, weekXp: 3_050, members: [m("vikram", "mukhiya", 4_900, 30), m("rohan", "sadasya", 1_800, 12)], createdAt: ago(30) },
  { id: "pv-sur", code: "880519", name: "Sur Sangam", tag: "SUR", emblem: "🎵", color: "#8f6bff", announcement: "Antakshari every night. Sab ka swagat hai!", joinMode: "open", xp: 1_200, weekXp: 900, members: [m("aditya", "mukhiya", 1_200, 6)], createdAt: ago(6) },
];

export const PARIVAR_CHATTER = [
  "Sab log check in kar lo aaj 🙏",
  "Who's coming to the room tonight?",
  "Congrats on the level up everyone! 🎉",
  "Ludo after dinner?",
  "Welcome to the new members ❤️",
  "Let's push for the weekly top 3!",
  "Good morning Parivar ☀️",
];
