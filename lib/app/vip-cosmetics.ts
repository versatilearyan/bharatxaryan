/**
 * VIP cosmetics from the server (profile and voice-room participant responses)
 * as the Effects the existing VIP components draw (VipFrame, VipBadge,
 * VipBubbleArt, VipEntryBanner in components/effects/VipFx.tsx, which play
 * SVGA through SvgaAnim).
 *
 * The files' layout (where the avatar sits in a frame, the text box in a
 * bubble) comes from the bundled set for the person's VIP level (VIP 8 and up
 * use the VIP 7 ones). Only the links come from the server; nothing is invented.
 */
import type { VipProfileFields } from "@/lib/api/users";
import type { RewardEffects } from "@/lib/api/rewards";
import { VIP_SETS, type EffectSet, type GiftSet, type VipSet } from "./effects";
import type { GiftId, GiftSetId } from "./types";
import type { Effects } from "./market-store";

/** The cosmetic links and level, as both profile and participant responses send them. */
export type ServerVip = Pick<VipProfileFields, "vipLevel" | "badgeUrl" | "frameUrl" | "bubbleUrl" | "entryAnimationUrl" | "rewardEffects">;


/**
 * Whether a link is an SVGA animation or an ordinary picture. Cloudinary keeps
 * SVGA files as "raw" uploads, often with no extension, so anything that isn't
 * clearly a picture is treated as SVGA and handed to the SVGA player. If the
 * player can't read it, the cosmetic is left out (see onError in VipFx).
 */
export function assetKind(url: string): "svga" | "image" {
  const path = url.split(/[?#]/)[0].toLowerCase();
  if (/\.svga$/.test(path) || /[_.-]svga$/.test(path)) return "svga";
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(path) || /\/image\/upload\//.test(path)) return "image";
  return "svga";
}

/** The bundled layout (frame window, bubble text box, entry text row) for a VIP level. */
export const layoutFor = (level: number | null): VipSet => {
  const l = Math.min(Math.max(level ?? 1, 1), 7);
  return VIP_SETS.find((s) => s.level === l) ?? VIP_SETS[0];
};

/** The Effects for one person from their participants record. Pictures are only used where a picture works (the badge). */
export function serverEffects(v: ServerVip): Effects {
  const base = layoutFor(v.vipLevel);
  const svga = (url: string | null) => (url && assetKind(url) === "svga" ? url : null);
  const as = (patch: Partial<EffectSet>): EffectSet => ({ ...base, frame: "", bubble: "", entry: "", ...patch });
  const fx: Effects = {};
  // The frame needs both a VIP level and a frame
  const frame = v.vipLevel ? svga(v.frameUrl) : null;
  if (frame) fx.frame = as({ frame });
  const bubble = svga(v.bubbleUrl);
  if (bubble) fx.bubble = as({ bubble });
  const entry = svga(v.entryAnimationUrl);
  if (entry) fx.entry = as({ entry });
  Object.assign(fx, rewardFx(v.rewardEffects));
  if (v.badgeUrl) {
    // An SVGA badge plays; a picture badge shows as an <img>. `level` is the person's real VIP level (0 when the server sent none), for the label.
    const level = v.vipLevel ?? 0;
    fx.badge = assetKind(v.badgeUrl) === "svga" ? { ...base, level, badge: v.badgeUrl, badgeStill: "" } : { ...base, level, badge: "", badgeStill: v.badgeUrl };
  }
  return fx;
}


/**
 * Effects from a profile response (GET /users/me or /users/{id}/profile).
 * vipActive false: none at all, whatever links or level came with it.
 * undefined when the response didn't say whether the person is VIP.
 */
export function profileEffects(v: Partial<VipProfileFields> | null | undefined): Effects | undefined {
  if (!v || typeof v.vipActive !== "boolean") return undefined;
  // Not VIP: no VIP cosmetics, but rewards they won and wear still show
  if (!v.vipActive) return rewardFx(v.rewardEffects);
  return serverEffects({ vipLevel: v.vipLevel ?? null, badgeUrl: v.badgeUrl ?? null, frameUrl: v.frameUrl ?? null, bubbleUrl: v.bubbleUrl ?? null, entryAnimationUrl: v.entryAnimationUrl ?? null, rewardEffects: v.rewardEffects });
}

/** The VIP level to style a name with, or undefined when not VIP. undefined `vipActive`: not known. */
export const activeVipLevel = (v: Partial<VipProfileFields> | null | undefined) => (v?.vipActive ? (v.vipLevel ?? undefined) : undefined);

/**
 * Spend rewards someone wears, as Effects. They replace the VIP piece in the
 * same place (a worn reward frame shows instead of the VIP frame). Admin files
 * have no measured layout, so they use the VIP 1 fit; SvgaAnim plays SVGA, MP4
 * and pictures alike.
 */
export function rewardFx(r: RewardEffects | undefined): Effects {
  const fx: Effects = {};
  if (!r) return fx;
  const base = layoutFor(1);
  const as = (patch: Partial<EffectSet>): EffectSet => ({ ...base, frame: "", bubble: "", entry: "", ...patch });
  if (r.FRAME) fx.frame = as({ frame: r.FRAME.url });
  if (r.BUBBLE) fx.bubble = as({ bubble: r.BUBBLE.url });
  if (r.ENTRY) fx.entry = as({ entry: r.ENTRY.url });
  if (r.PROFILE) {
    const page: GiftSet = {
      ...as({}),
      id: "storm-guardian" as GiftSetId,
      name: r.PROFILE.name ?? "Profile effect",
      giftId: "storm-guardian" as GiftId,
      page: r.PROFILE.url,
      // A phone-shaped effect, like the bundled one
      pageRatio: "1080 / 2340",
    };
    fx.page = page;
  }
  return fx;
}
