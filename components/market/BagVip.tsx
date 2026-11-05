"use client";

/**
 * The Bag's server data, for someone signed in to the backend:
 *
 * - VIP decorations: every VIP reward you own (all levels; frame, bubble,
 *   entry and badge), each with Wear / Take off. Shows what you're wearing (GET /api/v1/vip/cosmetics/equipped). An empty slot offers
 *   the matching cosmetic from your VIP level's catalogue
 *   (GET /api/v1/vip/cosmetics?level=) when GET /users/me says your VIP is
 *   active. Wear / take off go to POST / DELETE /vip/cosmetics/{id}/wear; the
 *   server decides, and its refusal is shown.
 * - Items: your red packets from GET /api/v1/wallet/me/red-packets/inventory,
 *   named from GET /api/v1/wallet/red-packets.
 *
 * Nothing here is invented: no names, durations or ownership the server didn't
 * send. A cosmetic's name is its VIP level and type ("VIP 1 Frame"); the time
 * shown is your VIP's time left (vipExpiresAt), since cosmetics only show while
 * VIP is active. There is no "Permanent" because nothing says they are.
 */
import { useState, type ReactNode } from "react";
import { VipBadge, VipBubbleArt, VipEntryBanner, VipFrame } from "@/components/effects/VipFx";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { useEquipped } from "@/components/vip/useEquipped";
import { getCosmeticsByLevel, type CosmeticType, type VipCosmetic } from "@/lib/api/vip-cosmetics";
import type { EquippedCosmetic } from "@/lib/api/vip-equipment";
import { getMyRedPacketInventory, getWalletRedPackets, walletImageSrc, type RedPacketInventory, type WalletRedPacket } from "@/lib/api/wallet";
import { readToken } from "@/lib/auth/token";
import type { EffectSet } from "@/lib/app/effects";
import { timeLeft } from "@/lib/app/market";
import { useMe } from "@/lib/app/me-store";
import type { Person } from "@/lib/app/types";
import { useCachedLoad } from "@/lib/app/use-wallet";
import { assetKind, layoutFor } from "@/lib/app/vip-cosmetics";

/** One tile in the Bag (the same shape BagScreen draws). */
export type BagEntry = {
  key: string;
  name: string;
  kind: string;
  art: ReactNode;
  /** Time-left text, "Permanent", or nothing when the server doesn't say. */
  badge?: string;
  count?: number;
  inUse?: boolean;
  source?: string;
  tint: string;
  action?: { label: string; run: () => void; off?: boolean; disabled?: boolean };
  note?: string;
};

/** Loading / error for a Bag section. */
export type SectionStatus = { loading?: boolean; error?: string; retry?: () => void };

/** The Bag's three VIP slots, by the backend's type names (never by list order). */
export const BAG_SLOTS: { type: CosmeticType; name: string; kind: string }[] = [
  { type: "FRAME", name: "Frame", kind: "Animated frame" },
  { type: "BUBBLE", name: "Bubble", kind: "Chat bubble" },
  { type: "ENTRY", name: "Entry", kind: "Entry effect" },
  { type: "BADGE", name: "Badge", kind: "VIP badge" },
];
const slotOf = (t: CosmeticType) => BAG_SLOTS.find((x) => x.type === t) ?? { type: t, name: t.charAt(0) + t.slice(1).toLowerCase(), kind: "VIP reward" };

const VIP_TINT = "from-[#3a2d6b] to-[#211a3d]";
const IMAGE_FORMATS = /^(PNG|JPE?G|WEBP|GIF|AVIF|IMAGE|STATIC)$/;

/** How to draw a file: the server's format when it says, otherwise the link (Cloudinary raw uploads are SVGA). */
export function renderKind(format: string | null | undefined, url: string): "svga" | "image" {
  if (format === "SVGA") return "svga";
  if (format && IMAGE_FORMATS.test(format)) return "image";
  return assetKind(url);
}

const warnImage = (url: string) => {
  if (process.env.NODE_ENV !== "production") console.warn(`[VIP] Couldn't load image ${url.split("?")[0]}. Check the link and that it's a picture.`);
};

/** The cosmetic itself, drawn from its real link: SVGA through the existing players, pictures as <img>. */
function CosmeticArt({ type, url, format, level, me }: { type: CosmeticType; url: string; format: string | null; level: number | null; me: Person }) {
  const [failed, setFailed] = useState(false);
  const kind = renderKind(format, url);
  if (type === "BADGE") {
    if (failed) return <span className="px-2 text-center text-[10.5px] font-semibold text-muted">Couldn&apos;t load</span>;
    return kind === "svga" ? (
      <VipBadge set={{ ...layoutFor(level), badge: url, badgeStill: url }} size={30} animated level={level ?? undefined} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-12 w-auto max-w-[96px] object-contain" onError={() => (warnImage(url), setFailed(true))} />
    );
  }
  const set: EffectSet = { ...layoutFor(level), frame: "", bubble: "", entry: "", [type === "FRAME" ? "frame" : type === "BUBBLE" ? "bubble" : "entry"]: url };
  const avatar = <PersonAvatar person={{ ...me, frame: "none" }} size={42} />;
  if (failed) return <span className="px-2 text-center text-[10.5px] font-semibold text-muted">Couldn&apos;t load</span>;
  if (type === "FRAME") {
    return kind === "svga" ? (
      <VipFrame set={set} size={42} className="my-4" onError={() => setFailed(true)}>
        {avatar}
      </VipFrame>
    ) : (
      <span className="relative grid h-[64px] w-[64px] place-items-center">
        {avatar}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" onError={() => (warnImage(url), setFailed(true))} />
      </span>
    );
  }
  if (type === "BUBBLE") {
    return kind === "svga" ? (
      <span className="relative flex h-[30px] w-[86px] items-center justify-center text-[11px] font-semibold text-white">
        <VipBubbleArt set={set} onError={() => setFailed(true)} />
        <span className="relative">Namaste!</span>
      </span>
    ) : (
      <span className="relative flex h-[30px] w-[86px] items-center justify-center text-[11px] font-semibold text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-fill" onError={() => (warnImage(url), setFailed(true))} />
        <span className="relative">Namaste!</span>
      </span>
    );
  }
  return kind === "svga" ? (
    <VipEntryBanner set={set} className="w-[96px]" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="w-[96px] object-contain" onError={() => (warnImage(url), setFailed(true))} />
  );
}

const EmptySlot = () => <span className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-dashed border-white/20 text-[10px] font-bold text-white/40">Empty</span>;

/**
 * Server VIP decorations and items. `enabled` false (not signed in to the
 * backend) loads nothing and returns `signedIn: false`, so the Bag keeps its
 * on-device content.
 */
export function useBagServer(enabled: boolean, me: Person, now: number) {
  const signedIn = enabled && Boolean(readToken());
  const eq = useEquipped(signedIn);
  const profile = useMe().profile;
  const mine = profile.data;
  const known = typeof mine?.vipActive === "boolean";
  const active = mine?.vipActive === true;
  const lvl = active && mine?.vipLevel ? Math.min(Math.max(mine.vipLevel, 1), 7) : null;
  const catalogue = useCachedLoad<VipCosmetic[]>(signedIn && lvl ? `vip-cosmetics:${lvl}` : null, () => getCosmeticsByLevel(lvl ?? 1));
  const expiresAt = active && mine?.vipExpiresAt ? Date.parse(mine.vipExpiresAt) : NaN;
  const vipTime = Number.isFinite(expiresAt) ? timeLeft(expiresAt, now).replace(" left", "") : undefined;
  const until = Number.isFinite(expiresAt) ? ` until ${new Date(expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "";

  const busy = eq.busyId !== null;
  // The badge shown on your profile: the highest-level badge you own, up to your VIP level
  const badgeLevel = (eq.owned ?? [])
    .filter((o) => o.cosmeticType === "BADGE" && (o.vipLevel ?? 0) <= (lvl ?? 0))
    .reduce((m, o) => Math.max(m, o.vipLevel ?? 0), 0);
  const wornIds = new Set((eq.items ?? []).map((c) => c.cosmeticId));
  const typeOrder = (t: CosmeticType) => BAG_SLOTS.findIndex((x) => x.type === t);

  /** One reward you own: worn ones say In use with Take off; the rest offer Wear. */
  const entryFor = (c: { cosmeticId: string; cosmeticType: CosmeticType; vipLevel: number | null; url: string | null; format: string | null }): BagEntry => {
    const s = slotOf(c.cosmeticType);
    // The badge isn't worn by choice: it's always your current VIP level's badge
    const badge = c.cosmeticType === "BADGE";
    const worn = badge ? active && c.vipLevel === badgeLevel : wornIds.has(c.cosmeticId);
    const art = !c.url ? catalogue.data?.find((x) => x.id === c.cosmeticId) : undefined;
    const url = c.url ?? art?.url ?? null;
    const lv = c.vipLevel ? ` ${c.vipLevel}` : "";
    return {
      key: `srv-${c.cosmeticId}`,
      name: `VIP${lv} ${s.name}`,
      kind: s.kind,
      art: url ? <CosmeticArt key={url} type={c.cosmeticType} url={url} format={c.format ?? art?.format ?? null} level={c.vipLevel} me={me} /> : <EmptySlot />,
      badge: active ? vipTime : undefined,
      inUse: worn && active,
      source: `VIP${lv} reward`,
      tint: VIP_TINT,
      note: badge
        ? worn
          ? "Your VIP badge. It changes automatically when your VIP level goes up."
          : "An earlier VIP badge. Your badge always follows your current VIP level."
        : worn
        ? active
          ? `You're wearing this${until}.`
          : "Worn, but it only shows while your VIP is active."
        : active
          ? `In your Bag. Wear it to swap your current ${s.kind.toLowerCase()}.`
          : "In your Bag. It shows once your VIP is active.",
      action: badge
        ? undefined
        : worn
          ? { label: eq.busyId === c.cosmeticId ? "Taking off…" : "Take off", run: () => void eq.takeOff(c.cosmeticId), off: true, disabled: busy }
          : { label: eq.busyId === c.cosmeticId ? "Putting on…" : "Wear", run: () => void eq.wear(c.cosmeticId), disabled: busy },
    };
  };

  // Everything you own, plus anything you're wearing that the inventory didn't list
  const ownedAll = [...(eq.owned ?? [])];
  for (const w of eq.items ?? []) if (!ownedAll.some((o) => o.cosmeticId === w.cosmeticId)) ownedAll.push({ ...w });
  const isOn = (o: { cosmeticId: string; cosmeticType: CosmeticType; vipLevel: number | null }) => (o.cosmeticType === "BADGE" ? active && o.vipLevel === badgeLevel : wornIds.has(o.cosmeticId));
  ownedAll.sort((a, b) => Number(isOn(b)) - Number(isOn(a)) || (b.vipLevel ?? 0) - (a.vipLevel ?? 0) || typeOrder(a.cosmeticType) - typeOrder(b.cosmeticType));

  // Rewards of your level you don't have yet (shown locked, never wearable)
  const locked: BagEntry[] = (catalogue.data ?? [])
    .filter((c) => !ownedAll.some((o) => o.cosmeticId === c.id))
    .map((c) => ({
      key: `srv-locked-${c.id}`,
      name: `VIP ${c.vipLevel} ${slotOf(c.cosmeticType).name}`,
      kind: slotOf(c.cosmeticType).kind,
      art: <CosmeticArt key={c.url} type={c.cosmeticType} url={c.url} format={c.format} level={c.vipLevel} me={me} />,
      source: `VIP ${c.vipLevel} reward`,
      tint: VIP_TINT,
      note: "Not unlocked yet. Open the Bag again in a moment.",
    }));

  const decorStatus: SectionStatus = {
    loading: signedIn && (((eq.items === null || eq.owned === null) && !eq.error) || (Boolean(lvl) && catalogue.loading) || (!known && profile.loading)),
    error: eq.error || (lvl && catalogue.error ? `Couldn't load your VIP cosmetics. ${catalogue.error}` : ""),
    retry: eq.error ? eq.reload : catalogue.retry,
  };
  const showSlots = signedIn && eq.items !== null && eq.owned !== null && (active || ownedAll.length > 0);
  const decorations = showSlots ? [...ownedAll.map(entryFor), ...(eq.owned ? locked : [])] : [];

  /* ---- Items: red packets ---- */
  const tail = signedIn ? (readToken()?.accessToken.slice(-16) ?? "") : "";
  const inventory = useCachedLoad<RedPacketInventory>(signedIn ? `inventory:${tail}` : null, getMyRedPacketInventory);
  const products = useCachedLoad<WalletRedPacket[]>(signedIn ? "red-packets" : null, getWalletRedPackets);
  const items: BagEntry[] = Object.entries(inventory.data ?? {})
    .filter(([, n]) => n > 0)
    .map(([id, n]) => {
      const p = products.data?.find((x) => x.id === id);
      const img = walletImageSrc(p?.imageUrl);
      return {
        key: `srv-packet-${id}`,
        name: p?.name ?? "Red packet",
        kind: "Red packet",
        // eslint-disable-next-line @next/next/no-img-element
        art: img ? <img src={img} alt="" className="h-12 w-12 object-contain" /> : <span className="text-[34px]" aria-hidden>🧧</span>,
        count: n,
        tint: "from-[#6b1a1a] to-[#2a0c0c]",
        note: p ? `${p.coinValue.toLocaleString("en-IN")} coins for the room to loot.` : undefined,
      };
    });
  const itemStatus: SectionStatus = {
    loading: signedIn && (inventory.loading || products.loading),
    error: inventory.error ? `Couldn't load your items. ${inventory.error}` : "",
    retry: inventory.retry,
  };

  return { signedIn, decorations, decorStatus, actionError: eq.actionError, items, itemStatus };
}
