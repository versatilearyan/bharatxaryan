/**
 * Animated SVGA effects that come with VIP: a seat frame, a chat bubble, a
 * room entry banner and a badge next to your name. Each set unlocks at a VIP
 * level and stays in your Bag. The badge is always on for VIPs; the frame,
 * bubble and entry can be taken off and worn again from the Bag.
 *
 * Every file has its own canvas, so each set says how to fit it:
 * - frameScale: frame width ÷ avatar width; frameY: where the avatar's centre
 *   sits in the frame, as a share of its height.
 * - bubbleBox: the art's inner text box (left, top, right, bottom as shares of the file).
 * - entryRatio and entryText: the banner's shape and where the name goes (left, right insets).
 */
import type { GiftId, GiftSetId } from "./types";

export type VipSetId = "vip1" | "vip2" | "vip3" | "vip4" | "vip5" | "vip6" | "vip7";
export type EffectSetId = VipSetId | GiftSetId;

/** What every wearable set has: an animated frame, a chat bubble and an entry banner, and how to fit each. */
export type EffectSet = {
  id: EffectSetId;
  frame: string;
  bubble: string;
  entry: string;
  /** Bag tile colours for this set. */
  tint: string;
  frameScale: number;
  frameY: number;
  bubbleBox: [number, number, number, number];
  entryRatio: string;
  entryText: [string, string];
  /** Where the avatar starts when the banner shows one (just after the left ornament). */
  entryAvatarAt: string;
};

export type VipSet = EffectSet & {
  id: VipSetId;
  level: number;
  /** Animated badge, and a still copy for long lists like room chat. Always on for VIPs. */
  badge: string;
  badgeStill: string;
  /** The badge file's square canvas size (px; 320 unless noted), and the band the art sits in (top, bottom px). */
  badgeCanvas?: number;
  badgeBand: [number, number];
};

export const VIP_SETS: VipSet[] = [
  {
    id: "vip1",
    level: 1,
    frame: "/effects/vip1/frame.svga",
    bubble: "/effects/vip1/bubble.svga",
    entry: "/effects/vip1/entry.svga",
    badge: "/effects/vip1/badge.svga",
    badgeStill: "/effects/vip1/badge.png",
    badgeBand: [69, 279],
    tint: "from-[#5a3a12] to-[#2a160c]",
    // 396×396 canvas: the ring's inner circle is about 258 px wide, centred at (198, 198).
    // The crown sits on top of the ring and the horse and "VIP 1" plaque cover its bottom.
    frameScale: 1.535,
    frameY: 0.5,
    // 212×112 canvas: the plate inside the gold border
    bubbleBox: [0.12, 0.21, 0.89, 0.8],
    // 404×94 canvas: the bar runs from the horse emblem on the left to the fade on the right
    entryRatio: "404 / 94",
    entryText: ["14%", "9%"],
    entryAvatarAt: "12.5%",
  },
  {
    id: "vip2",
    level: 2,
    frame: "/effects/vip2/frame.svga",
    bubble: "/effects/vip2/bubble.svga",
    entry: "/effects/vip2/entry.svga",
    badge: "/effects/vip2/badge.svga",
    badgeStill: "/effects/vip2/badge.png",
    badgeBand: [81, 283],
    tint: "from-[#0f4a36] to-[#0a2219]",
    // Same 396×396 canvas as VIP 1, with a thinner ring: its inner circle is about
    // 272 px wide, centred at (198, 200). Crown on top, horse and "VIP 2" plaque below.
    frameScale: 1.456,
    frameY: 0.505,
    // Same 212×112 bubble and 404×94 entry canvases as VIP 1
    bubbleBox: [0.12, 0.21, 0.89, 0.8],
    entryRatio: "404 / 94",
    entryText: ["14%", "9%"],
    entryAvatarAt: "12.5%",
  },
  {
    id: "vip3",
    level: 3,
    frame: "/effects/vip3/frame.svga",
    bubble: "/effects/vip3/bubble.svga",
    entry: "/effects/vip3/entry.svga",
    badge: "/effects/vip3/badge.svga",
    badgeStill: "/effects/vip3/badge.png",
    badgeBand: [89, 259],
    tint: "from-[#1d2a7a] to-[#0d1338]",
    // 396×396 canvas, blue and gold eagle ring: inner circle about 272 px wide,
    // centred at (198, 196). Crown on top, eagle and "VIP 3" plaque below.
    frameScale: 1.456,
    frameY: 0.495,
    // Same 212×112 bubble and 404×94 entry canvases as VIP 1 and 2
    bubbleBox: [0.12, 0.21, 0.89, 0.8],
    entryRatio: "404 / 94",
    entryText: ["14%", "9%"],
    entryAvatarAt: "12.5%",
  },
  {
    id: "vip4",
    level: 4,
    frame: "/effects/vip4/frame.svga",
    bubble: "/effects/vip4/bubble.svga",
    entry: "/effects/vip4/entry.svga",
    badge: "/effects/vip4/badge.svga",
    badgeStill: "/effects/vip4/badge.png",
    // This badge is a smaller 230×230 canvas
    badgeCanvas: 230,
    badgeBand: [58, 176],
    tint: "from-[#7a3410] to-[#2e1206]",
    // 396×396 canvas, fiery gold eagle ring: inner circle about 272 px wide,
    // centred at (198, 196). Crown on top, eagle and "VIP 4" plaque below.
    frameScale: 1.456,
    frameY: 0.495,
    // 212×112 bubble: the amber plate inside the gold border
    bubbleBox: [0.12, 0.22, 0.88, 0.79],
    entryRatio: "404 / 94",
    entryText: ["14%", "9%"],
    entryAvatarAt: "12.5%",
  },
  {
    id: "vip5",
    level: 5,
    frame: "/effects/vip5/frame.svga",
    bubble: "/effects/vip5/bubble.svga",
    entry: "/effects/vip5/entry.svga",
    badge: "/effects/vip5/badge.svga",
    badgeStill: "/effects/vip5/badge.png",
    badgeBand: [98, 242],
    tint: "from-[#0d4a4a] to-[#06201f]",
    // 396×396 canvas, teal and gold leopard ring: inner opening about 272 px
    // wide, centred at (198, 198). Leopards on the sides, plaque below.
    frameScale: 1.456,
    frameY: 0.5,
    // 212×112 bubble: the teal plate inside the gold border
    bubbleBox: [0.12, 0.22, 0.88, 0.79],
    // This entry is a wider 440×112 canvas; the left ornament ends near 10%
    entryRatio: "440 / 112",
    entryText: ["13%", "8%"],
    entryAvatarAt: "11%",
  },
  {
    id: "vip6",
    level: 6,
    frame: "/effects/vip6/frame.svga",
    bubble: "/effects/vip6/bubble.svga",
    entry: "/effects/vip6/entry.svga",
    badge: "/effects/vip6/badge.svga",
    badgeStill: "/effects/vip6/badge.png",
    badgeBand: [79, 255],
    tint: "from-[#0d3a6a] to-[#061a33]",
    // 396×396 canvas, blue and gold roaring-leopard ring: inner opening about
    // 264 px wide, centred at (198, 194). Crown on top, leopard and plaque below.
    frameScale: 1.5,
    frameY: 0.49,
    // 212×112 bubble: the blue plate inside the gold border
    bubbleBox: [0.13, 0.22, 0.88, 0.79],
    // Same 440×112 canvas as VIP 5; the left ornament ends near 10%
    entryRatio: "440 / 112",
    entryText: ["13%", "8%"],
    entryAvatarAt: "11%",
  },
  {
    id: "vip7",
    level: 7,
    frame: "/effects/vip7/frame.svga",
    bubble: "/effects/vip7/bubble.svga",
    entry: "/effects/vip7/entry.svga",
    badge: "/effects/vip7/badge.svga",
    badgeStill: "/effects/vip7/badge.png",
    badgeBand: [79, 256],
    tint: "from-[#0f5a2a] to-[#062211]",
    // 396×396 canvas, green and gold leopard ring: inner opening about 264 px
    // wide, centred at (198, 194). Crown on top, leopard and plaque below.
    frameScale: 1.5,
    frameY: 0.49,
    // 212×112 bubble: the plate inside the gold border
    bubbleBox: [0.13, 0.22, 0.88, 0.79],
    // Same 440×112 canvas as VIP 5 and 6
    entryRatio: "440 / 112",
    entryText: ["13%", "8%"],
    entryAvatarAt: "11%",
  },
];

export const vipSetById = (id: VipSetId) => VIP_SETS.find((s) => s.id === id) ?? VIP_SETS[0];
/** Sets you've unlocked at this VIP level, best first. */
export const unlockedSets = (vipLevel: number) => VIP_SETS.filter((s) => vipLevel >= s.level).sort((a, b) => b.level - a.level);
/** The best set for a VIP level, or null below VIP 1. */
export const bestSet = (vipLevel: number) => unlockedSets(vipLevel)[0] ?? null;

/** CSS that stretches a bubble file so its inner box covers the text box exactly. */
export function bubbleFit([l, t, r, b]: EffectSet["bubbleBox"]) {
  const w = r - l;
  const h = b - t;
  return { left: `${(-l / w) * 100}%`, top: `${(-t / h) * 100}%`, width: `${100 / w}%`, height: `${100 / h}%` };
}

/**
 * Sets unlocked by sending a gift. Besides the frame, bubble and entry they
 * have a profile page effect: a phone-shaped SVGA drawn across the top of your
 * profile, its width matching the screen.
 */
export type GiftSet = EffectSet & { id: GiftSetId; name: string; giftId: GiftId; page: string; pageRatio: string };

export const GIFT_SETS: GiftSet[] = [
  {
    id: "storm-guardian",
    name: "Storm Guardian",
    giftId: "storm-guardian",
    frame: "/gifts/storm-guardian/frame.svga",
    bubble: "/gifts/storm-guardian/bubble.svga",
    entry: "/gifts/storm-guardian/entry.svga",
    // 510×1104, like the gift itself; the guardian stands in the top-right, the rest is clear
    page: "/gifts/storm-guardian/page.svga",
    pageRatio: "510 / 1104",
    tint: "from-[#16306b] to-[#0b1433]",
    // 260×260 canvas: the ring's opening is about 182 px wide, centred at (136, 126).
    // The guardian stands on the left of the ring and a platform sits under it.
    frameScale: 1.43,
    frameY: 0.485,
    // 198×144 canvas: the dark screen inside the blue border runs 22–78% across and 25–76% down
    bubbleBox: [0.23, 0.27, 0.77, 0.74],
    // 660×132 canvas: the guardian's round emblem fills the left quarter, the bar fades out on the right
    entryRatio: "660 / 132",
    entryText: ["27%", "11%"],
    entryAvatarAt: "26%",
  },
];

export const isGiftSetId = (v: unknown): v is GiftSetId => GIFT_SETS.some((s) => s.id === v);
export const giftSetById = (id: GiftSetId) => GIFT_SETS.find((s) => s.id === id) ?? GIFT_SETS[0];
