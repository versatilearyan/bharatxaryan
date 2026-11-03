/**
 * Tags (relationship pairs) and intimacy.
 *
 * A tag is formed when someone wins a BFF Kharidari: the winner and the person on
 * the auction seat become e.g. Besties. Every coin of gifts between the two adds
 * one intimacy point, and intimacy raises the tag level (1–10), which unlocks
 * perks in the intimate space.
 */
import { levelFor } from "./levels";

export const RELATIONSHIPS = [
  { id: "brosis", label: "Bro and sis", one: "Bro/Sis", emoji: "🍀", tint: "#5fe0c6", deep: "#127a6b" },
  { id: "besties", label: "Besties", one: "Bestie", emoji: "🎀", tint: "#ff7fa8", deep: "#b0245a" },
  { id: "bro", label: "Bro", one: "Bro", emoji: "🥊", tint: "#7fb6ff", deep: "#2251b5" },
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
};

/** Intimacy needed for tag level 1 … 10. */
export const TAG_THRESHOLDS = [0, 520, 1314, 3344, 5200, 9999, 13140, 20000, 52000, 99999];
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

/** Most tags one person can hold. */
export const TAG_SLOTS = 6;

export const partnerOf = (tag: Tag, personId: string) => (tag.a === personId ? tag.b : tag.a);
export const pairKey = (x: string, y: string) => [x, y].sort().join("|");

/** Sample tags between other people so rooms show linked seats. */
/** No sample tags: your tags come from the server. */
export const SAMPLE_TAGS: Tag[] = [];
