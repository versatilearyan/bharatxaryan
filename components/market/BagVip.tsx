"use client";

/**
 * The Bag's server data, for someone signed in to the backend:
 *
 * - VIP decorations: three slots (frame, chat bubble, entry). Each shows what
 *   you're wearing (GET /api/v1/vip/cosmetics/equipped). An empty slot offers
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
import { VipBubbleArt, VipEntryBanner, VipFrame } from "@/components/effects/VipFx";
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
export const BAG_SLOTS: { type: Extract<CosmeticType, "FRAME" | "BUBBLE" | "ENTRY">; name: string; kind: string }[] = [
  { type: "FRAME", name: "Frame", kind: "Animated frame" },
  { type: "BUBBLE", name: "Bubble", kind: "Chat bubble" },
  { type: "ENTRY", name: "Entry", kind: "Entry effect" },
];

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
function CosmeticArt({ type, url, format, level, me }: { type: "FRAME" | "BUBBLE" | "ENTRY"; url: string; format: string | null; level: number | null; me: Person }) {
  const [failed, setFailed] = useState(false);
  const kind = renderKind(format, url);
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

  const slot = (s: (typeof BAG_SLOTS)[number]): BagEntry => {
    const worn: EquippedCosmetic | undefined = eq.items?.find((c) => c.cosmeticType === s.type);
    const offer: VipCosmetic | undefined = !worn ? catalogue.data?.find((c) => c.cosmeticType === s.type) : undefined;
    const busy = eq.busyId !== null;
    if (worn) {
      const level = worn.vipLevel;
      return {
        key: `srv-${s.type}`,
        name: `VIP${level ? ` ${level}` : ""} ${s.name}`,
        kind: s.kind,
        art: worn.url ? <CosmeticArt key={worn.url} type={s.type} url={worn.url} format={worn.format} level={level} me={me} /> : <EmptySlot />,
        badge: active ? vipTime : undefined,
        // Equipped isn't proof of VIP: it only shows while GET /users/me says VIP is active
        inUse: active,
        source: level ? `VIP ${level} reward` : "VIP reward",
        tint: VIP_TINT,
        note: active ? `Shows while your VIP is active${until}.` : known ? "Not showing right now: your VIP isn't active." : undefined,
        action: { label: eq.busyId === worn.cosmeticId ? "Taking off…" : "Take off", run: () => void eq.takeOff(worn.cosmeticId), off: true, disabled: busy },
      };
    }
    if (offer) {
      return {
        key: `srv-${s.type}`,
        name: `VIP ${offer.vipLevel} ${s.name}`,
        kind: s.kind,
        art: <CosmeticArt key={offer.url} type={s.type} url={offer.url} format={offer.format} level={offer.vipLevel} me={me} />,
        badge: vipTime,
        source: `VIP ${offer.vipLevel} reward`,
        tint: VIP_TINT,
        note: `Not worn. Part of your VIP ${offer.vipLevel}${until}.`,
        action: { label: eq.busyId === offer.id ? "Putting on…" : "Wear", run: () => void eq.wear(offer.id), disabled: busy },
      };
    }
    return {
      key: `srv-${s.type}`,
      name: `VIP ${s.name}`,
      kind: s.kind,
      art: <EmptySlot />,
      tint: VIP_TINT,
      note: active ? `Nothing to wear here yet: no ${s.kind.toLowerCase()} has been uploaded for your VIP level.` : "Get VIP to unlock this.",
    };
  };

  const decorStatus: SectionStatus = {
    loading: signedIn && ((eq.items === null && !eq.error) || (Boolean(lvl) && catalogue.loading) || (!known && profile.loading)),
    error: eq.error || (lvl && catalogue.error ? `Couldn't load your VIP cosmetics. ${catalogue.error}` : ""),
    retry: eq.error ? eq.reload : catalogue.retry,
  };
  // The three slots only when there's something real to show: you're VIP, or you're wearing something
  const showSlots = signedIn && eq.items !== null && (active || eq.items.some((c) => BAG_SLOTS.some((s) => s.type === c.cosmeticType)));
  const decorations = showSlots ? BAG_SLOTS.map(slot) : [];

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
