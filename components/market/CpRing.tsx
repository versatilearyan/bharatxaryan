"use client";

import { useEffect, useState } from "react";
import { RingArt } from "@/components/art/RingArt";
import { SvgaAnim, mediaKind } from "@/components/effects/SvgaAnim";
import { cpApi, type CpRingInfo } from "@/lib/api/cp";
import { RINGS, type RingId } from "@/lib/app/market";

/** The CP ring catalogue (built-in rings + the admin's Shop rings), loaded once and shared. */
let catalogue: Promise<CpRingInfo[]> | null = null;
let loadedAt = 0;
export function cpCatalogue(): Promise<CpRingInfo[]> {
  if (!catalogue || Date.now() - loadedAt > 5 * 60_000) {
    loadedAt = Date.now();
    catalogue = cpApi.rings().catch((e) => {
      catalogue = null;
      throw e;
    });
  }
  return catalogue;
}

export function useCpCatalogue(): CpRingInfo[] {
  const [list, setList] = useState<CpRingInfo[]>([]);
  useEffect(() => {
    let live = true;
    cpCatalogue()
      .then((l) => live && setList(l))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return list;
}

/**
 * A CP ring's picture: the app's own art for the built-in rings, the uploaded
 * file for rings added in the admin panel ("shop-<id>"). The admin panel takes
 * pictures and SVGA animations, so an SVGA plays (an <img> can't show one) and a
 * file that can't load shows the 💍 instead of a broken-picture icon.
 */
export function CpRing({ id, size = 48, className = "" }: { id: string; size?: number; className?: string }) {
  const list = useCpCatalogue();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const builtIn = RINGS.some((r) => r.id === id);
  const info = list.find((r) => r.id === id);
  if (builtIn) return <RingArt id={id as RingId} size={size} className={className} />;
  const url = info?.imageUrl;
  if (url && failedUrl !== url) {
    const glow = "drop-shadow-[0_4px_10px_rgba(255,180,200,0.45)]";
    return mediaKind(url) === "image" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={info.name} onError={() => setFailedUrl(url)} className={`object-contain ${glow} ${className}`} style={{ width: size, height: size }} />
    ) : (
      <SvgaAnim key={url} src={url} loop={0} onError={() => setFailedUrl(url)} className={`${glow} ${className}`} style={{ width: size, height: size }} />
    );
  }
  return (
    <span className={`grid place-items-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.7 }} aria-label="Ring">
      💍
    </span>
  );
}
