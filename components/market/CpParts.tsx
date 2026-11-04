"use client";

import { useCallback, useEffect, useState } from "react";
import { RingArt } from "@/components/art/RingArt";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { partnerIn, type Couple } from "@/lib/app/market";
import { useMarket } from "@/lib/app/market-store";
import { usePeople } from "@/lib/app/people";
import { loadImages, saveImages } from "@/lib/app/local-images";

/**
 * "His CP" / "Her CP" with the partner's photo, laid over a profile banner.
 * Nothing when this person has no CP. Tapping it opens their Love Home.
 *
 * - "card": the room profile card (as in WePlay's card).
 * - "profile": the profile page banner, with the couple's ring and blessings.
 */
export function CpBannerPill({ personId, variant, onOpen, className = "" }: { personId: string; variant: "card" | "profile"; onOpen: () => void; className?: string }) {
  const { coupleOf, blessingsOf } = useMarket();
  const person = usePeople();
  const c = coupleOf(personId);
  if (!c) return null;
  const p = person(personId);
  const partner = person(partnerIn(c, personId));
  if (variant === "card") {
    const whose = p.gender === "male" ? "His CP" : p.gender === "female" ? "Her CP" : "His/Her CP";
    return (
      <button type="button" onClick={onOpen} aria-label={`${whose}: ${partner.name}. Open Love Home`} className={`flex items-center rounded-l-full bg-black/45 py-1 pl-3.5 backdrop-blur ${className}`}>
        <span className="pr-2 font-display text-[14px] font-extrabold text-white drop-shadow">{whose}</span>
        <PersonAvatar person={{ ...partner, frame: "none" }} size={44} className="rounded-full ring-2 ring-white/80" />
      </button>
    );
  }
  const blessings = blessingsOf(c).count;
  return (
    // WePlay style: a grey glass pill with the ring spilling over its left end and the partner's photo bigger than the pill on the right
    <button type="button" onClick={onOpen} aria-label={`CP with ${partner.name}, ${blessings} blessings. Open Love Home`} className={`group flex h-[54px] items-center ${className}`}>
      <span className="relative flex h-[46px] items-center rounded-l-full bg-[#4a4a56]/75 pl-[52px] pr-9 shadow-[0_4px_14px_rgb(0_0_0/0.35)] ring-1 ring-white/10 backdrop-blur-md">
        <span className="pointer-events-none absolute -left-1 top-1/2 -translate-y-1/2 drop-shadow-[0_2px_6px_rgb(0_0_0/0.45)]">
          <RingArt id={c.ring} size={56} />
        </span>
        <span className="flex flex-col items-center leading-[1.15]">
          <span className="font-display text-[15px] font-extrabold tracking-wide text-white drop-shadow">Blessing</span>
          <span className="font-display text-[15px] font-extrabold text-white drop-shadow">{blessings.toLocaleString("en-IN")}</span>
        </span>
      </span>
      <span className="relative -ml-7 rounded-full ring-[2.5px] ring-white shadow-[0_4px_14px_rgb(0_0_0/0.4)] transition-transform group-active:scale-95">
        <PersonAvatar person={{ ...partner, frame: "none" }} size={54} className="rounded-full" />
      </span>
    </button>
  );
}

/** Wallpapers are kept with the profile pictures on this device, under the couple's own key. */
const wallpaperKey = (c: Couple) => `cp:${c.id}`;

/** Largest side of a saved wallpaper. Big photos are scaled down and saved as JPEG. */
const WALLPAPER_MAX = 1280;

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, WALLPAPER_MAX / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that image"))), "image/jpeg", 0.86));
}

/**
 * The couple's Love Home wallpaper: the URL to show (or undefined for the
 * default scene), and `set` / `clear` for the couple's own partners.
 * Saved on this device only, like profile pictures, until the backend stores them.
 */
export function useCpWallpaper(c: Couple | null) {
  const [blob, setBlob] = useState<Blob | undefined>();
  const [url, setUrl] = useState<string | undefined>();
  const key = c ? wallpaperKey(c) : "";

  useEffect(() => {
    let live = true;
    setBlob(undefined);
    if (!key) return;
    loadImages(key)
      .then((r) => live && setBlob(r?.banner))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key]);

  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const set = useCallback(
    async (file: File) => {
      if (!key) return;
      const b = await shrink(file);
      await saveImages(key, { banner: b });
      setBlob(b);
    },
    [key],
  );
  const clear = useCallback(async () => {
    if (!key) return;
    await saveImages(key, {});
    setBlob(undefined);
  }, [key]);

  return { url, set, clear };
}
