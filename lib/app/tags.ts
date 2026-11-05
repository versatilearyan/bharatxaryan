/**
 * Tags (relationship pairs) and intimacy.
 *
 * A tag is formed when someone wins a BFF Kharidari: the winner and the person on
 * the auction seat become e.g. Besties. Every coin of gifts between the two adds
 * one intimacy point, and intimacy slowly raises the tag level (1–10), which unlocks
 * perks in the intimate space.
 */
import { levelFor } from "./levels";

export const RELATIONSHIPS = [
  { id: "brosis", label: "Bro and sis", one: "Bro/Sis", emoji: "🍀", tint: "#5fe0c6", deep: "#127a6b" },
  { id: "besties", label: "Besties", one: "Bestie", emoji: "🎀", tint: "#ff7fa8", deep: "#b0245a" },
  { id: "bro", label: "Bro", one: "Bro", emoji: "✊🏻", tint: "#7fb6ff", deep: "#2251b5" },
  { id: "confidant", label: "Confidant", one: "Confidant", emoji: "🧩", tint: "#b48bff", deep: "#5b2bb5" },
  { id: "apprentice", label: "Apprentice", one: "Apprentice", emoji: "🛡️", tint: "#f2c063", deep: "#a3651a" },
  { id: "sibling", label: "Sibling", one: "Sibling", emoji: "☘️", tint: "#6fe3a2", deep: "#1d8a52" },
] as const;
export type RelationshipId = (typeof RELATIONSHIPS)[number]["id"];
export const relationshipById = (id: RelationshipId) => RELATIONSHIPS.find((r) => r.id === id)!;

/** Ready-made tag declarations the person on the auction seat can pick or edit. */
export const DECLARATIONS = [
  "Looking for someone who stays up for late-night chai talks ☕",
  "Carry me in Ludo and I'm yours forever 🎲",
  "I'll sing for you every night in this room 🎶",
  "Loyal, funny, a little dramatic. Bid wisely 😌",
  "Need a partner for every Kharidari from now on 💫",
] as const;
export const DECLARATION_MAX = 80;

/** What the person on the auction seat offers in Ordinary bidding (no tag is formed). */
export const ORDINARY_OFFERS = ["Sing a song", "1 hour of chat", "Play Ludo together", "A shayari for you", "Follow back"] as const;

/** Tokens that decorate a tag. The winning gift volume decides which one you unlock. */
export const TOKENS = [
  { id: "bicycle", label: "Bicycle", emoji: "🚲", min: 0 },
  { id: "scooter", label: "Scooter", emoji: "🛵", min: 1000 },
  { id: "cottage", label: "Cottage", emoji: "🏡", min: 5000 },
] as const;
export type TokenId = (typeof TOKENS)[number]["id"];
export const tokenById = (id: TokenId) => TOKENS.find((t) => t.id === id)!;
export const tokenFor = (giftVolume: number): TokenId => [...TOKENS].reverse().find((t) => giftVolume >= t.min)!.id;

export type Tag = {
  id: string;
  /** The winner of the auction. */
  a: string;
  /** The person who sat on the auction seat. */
  b: string;
  relation: RelationshipId;
  token: TokenId;
  /** 1 intimacy point per coin of gifts between the two. */
  intimacy: number;
  createdAt: number;
  roomName: string;
  /** What the person on the auction seat declared before the bidding. */
  declaration?: string;
  /** A pet name the pair chose, like "Chai Partner". */
  nickname?: string;
  /** Colour theme the pair chose (TAG_THEMES); none = the relationship's colours. */
  theme?: TagThemeId;
};

/** Themes a pair can give their tag card and chip. */
export const TAG_THEMES = [
  { id: "rose", label: "Rose", from: "#ff7fa8", to: "#b0245a", glow: "#ff9fc0" },
  { id: "gold", label: "Royal gold", from: "#ffe29a", to: "#b8741a", glow: "#ffd36b" },
  { id: "ocean", label: "Ocean", from: "#7fd3ff", to: "#1f5fd1", glow: "#8fd8ff" },
  { id: "violet", label: "Violet", from: "#c9a6ff", to: "#5b2bb5", glow: "#c39bff" },
  { id: "emerald", label: "Emerald", from: "#8ff0be", to: "#127a52", glow: "#7ff0b5" },
  { id: "sunset", label: "Sunset", from: "#ffb27a", to: "#d4334f", glow: "#ffa07a" },
  { id: "midnight", label: "Midnight", from: "#8a93b8", to: "#1a1f3a", glow: "#9aa6ff" },
] as const;
export type TagThemeId = (typeof TAG_THEMES)[number]["id"];
export const TAG_THEME_IDS = TAG_THEMES.map((t) => t.id) as readonly string[];
/** The colours a tag shows in: its chosen theme, else its relationship's. */
export function tagColors(tag: Pick<Tag, "relation" | "theme">) {
  const t = tag.theme ? TAG_THEMES.find((x) => x.id === tag.theme) : undefined;
  if (t) return { from: t.from, to: t.to, glow: t.glow };
  const r = relationshipById(tag.relation);
  return { from: r.tint, to: r.deep, glow: r.tint };
}
export const NICKNAME_MAX = 24;

/**
 * Intimacy needed for tag level 1 … 10. Slow on purpose, like WePlay: a tag
 * grows over weeks of gifting, not from one big gift. Lv 10 needs about 1M
 * coins of gifts between the two.
 */
/** Intimacy needed for each tag level (made harder: about 2.5x the first version). */
export const TAG_THRESHOLDS = [0, 13_140, 33_440, 83_600, 131_400, 250_000, 333_000, 520_000, 1_314_000, 2_500_000];
export const tagLevel = (intimacy: number) => levelFor(intimacy, TAG_THRESHOLDS);

/** Perks unlocked by tag level, shown in the intimate space. */
export const TAG_PERKS = [
  { level: 1, title: "Tag badge", detail: "Your relationship shows on both profiles." },
  { level: 1, title: "Seat link", detail: "Your tag token shows between your seats when you sit beside each other." },
  { level: 3, title: "Tag title", detail: "A title like “Aryan's Bestie” on both profile cards." },
  { level: 5, title: "Glowing seats", detail: "A matching glow around both seats in rooms." },
  { level: 7, title: "Entry effect", detail: "The room announces you when you join while your tag is on mic." },
  { level: 10, title: "Legend token", detail: "A spinning, sparkling seat token only Lv 10 pairs get." },
] as const;

/** BFF slots: everyone has BASE_TAG_SLOTS, each VIP level adds one, up to TAG_SLOTS (same as the server). */
export const BASE_TAG_SLOTS = 5;
export const TAG_SLOTS = 12;
export const tagSlotsFor = (vipLevel: number) => Math.min(TAG_SLOTS, BASE_TAG_SLOTS + Math.max(0, vipLevel));

export const partnerOf = (tag: Tag, personId: string) => (tag.a === personId ? tag.b : tag.a);
export const pairKey = (x: string, y: string) => [x, y].sort().join("|");

/** No sample tags: your tags come from the server. */
export const SAMPLE_TAGS: Tag[] = [];
