/**
 * Red packets: a pot of coins you buy, then drop in a room. A banner goes out
 * to everyone in the app, and after a short countdown the packet "rains" in that
 * room. Everyone in the room taps falling envelopes to grab a share; the faster
 * you tap, the more you loot. The sender can't loot their own packet.
 */
export const RED_PACKETS = [
  { id: "rp-10k", amount: 10_000, label: "10K", name: "Gold Red Packet", tone: "red", inr: 499 },
  { id: "rp-50k", amount: 50_000, label: "50K", name: "Royal Red Packet", tone: "royal", inr: 1999 },
  { id: "rp-80k", amount: 80_000, label: "80K", name: "Maharaja Red Packet", tone: "maharaja", inr: 2199 },
] as const satisfies readonly { id: string; amount: number; label: string; name: string; tone: "red" | "royal" | "maharaja"; inr: number }[];

/** "₹1,999" */
export const formatInr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export type RedPacketTier = (typeof RED_PACKETS)[number];
export type RedPacketId = RedPacketTier["id"];

export const packetById = (id: RedPacketId): RedPacketTier => RED_PACKETS.find((p) => p.id === id) ?? RED_PACKETS[0];

/** Envelope designs you can pick when sending. Any cover works with any amount. */
export const COVERS = [
  { id: "red", name: "Classic" },
  { id: "royal", name: "Royal" },
  { id: "maharaja", name: "Maharaja" },
  { id: "genda", name: "Genda Phool" },
  { id: "mor", name: "Mor Pankh" },
] as const;
export type CoverId = (typeof COVERS)[number]["id"];

/** When the rain starts after you send. */
export const RAIN_TIMERS = [
  { ms: 10_000, label: "10 sec" },
  { ms: 30_000, label: "30 sec" },
  { ms: 60_000, label: "1 min" },
  { ms: 180_000, label: "3 min" },
] as const;

/** Packets that someone else drops elsewhere give you longer to join. */
export const REMOTE_COUNTDOWN_MS = 12_000;
/** How long the rain lasts once it starts (it ends sooner if the pot is empty). */
export const RAIN_MS = 9_000;

/** A red packet that has been dropped in a room. */
export type Drop = {
  id: string;
  packet: RedPacketId;
  cover: CoverId;
  roomId: string;
  fromId: string;
  sentAt: number;
  rainAt: number;
  endAt: number;
  /** Coins still in the pot. */
  left: number;
  /** Coins you grabbed from it, and how many envelopes. */
  mine: number;
  grabs: number;
};

/** One tap's share: 1.5% to 6% of the pot, never more than what's left. */
export function grabShare(amount: number, left: number) {
  const share = Math.round(amount * (0.015 + Math.random() * 0.045));
  return Math.max(1, Math.min(left, share));
}

/** What everyone else in the room grabs per tick of the rain. */
export function othersShare(amount: number, left: number) {
  return Math.min(left, Math.round(amount * (0.02 + Math.random() * 0.035)));
}
