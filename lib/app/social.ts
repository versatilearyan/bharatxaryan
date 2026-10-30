/**
 * Profile extras: the gift wall and guards.
 * Sample people get stable made-up values (seeded from their id) so every
 * profile looks lived-in; your own actions on this device add on top.
 */
import { GIFTS, PEOPLE } from "./data";
import type { GiftId } from "./types";

/** Stable 0–1 number from a string. */
export function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/* ---------------- Gift wall ---------------- */

/** Gifts a sample person had received before this demo. */
export function sampleReceived(personId: string): Partial<Record<GiftId, number>> {
  const out: Partial<Record<GiftId, number>> = {};
  GIFTS.forEach((g, i) => {
    const r = seeded(`${personId}:gift:${g.id}`);
    // Cheap gifts are common, legendary ones rare
    const n = Math.floor(r * r * (i < 3 ? 160 : i < 6 ? 24 : 4));
    if (n > 0) out[g.id] = n;
  });
  return out;
}
/** A new account starts with an empty gift wall. */
export const MY_SAMPLE_RECEIVED: Partial<Record<GiftId, number>> = {};

/** Stars for one gift type: lit at 1 received, 2 stars at 10, 3 stars at 100. */
export const giftStars = (count: number) => (count >= 100 ? 3 : count >= 10 ? 2 : count >= 1 ? 1 : 0);

export function giftWallStats(received: Partial<Record<GiftId, number>>) {
  const gifts = Object.values(received).reduce((a, b) => a + (b ?? 0), 0);
  const stars = GIFTS.reduce((a, g) => a + giftStars(received[g.id] ?? 0) * (g.tier === "legendary" ? 5 : 1), 0);
  // The showcase gift is the most valuable one received
  const best = [...GIFTS].reverse().find((g) => (received[g.id] ?? 0) > 0) ?? null;
  return { gifts, stars, best };
}

/* ---------------- Guard ---------------- */

/**
 * Guard: friends protect each other. Protecting someone adds 30 guard value,
 * once per person per day, and it's free. Guard value is its own counter and
 * never adds charm.
 */
export const GUARD_PER_DAY = 30;

/** Sample guardians a person already has: id → guard value. */
export function sampleGuardians(personId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of PEOPLE) {
    if (p.id === personId) continue;
    const r = seeded(`${personId}:guard:${p.id}`);
    if (r < 0.45) out[p.id] = Math.round(30 * Math.floor(20 + r * r * 4000));
  }
  return out;
}
