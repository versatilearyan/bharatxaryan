"use client";

import { useEffect, useState } from "react";
import { RingArt } from "@/components/art/RingArt";
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
 * picture for rings added in the admin panel ("shop-<id>").
 */
export function CpRing({ id, size = 48, className = "" }: { id: string; size?: number; className?: string }) {
  const list = useCpCatalogue();
  const builtIn = RINGS.some((r) => r.id === id);
  const info = list.find((r) => r.id === id);
  if (builtIn) return <RingArt id={id as RingId} size={size} className={className} />;
  return info?.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={info.imageUrl} alt={info.name} className={`object-contain drop-shadow-[0_4px_10px_rgba(255,180,200,0.45)] ${className}`} style={{ width: size, height: size }} />
  ) : (
    <span className={`grid place-items-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.7 }} aria-label="Ring">
      💍
    </span>
  );
}
