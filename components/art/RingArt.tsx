"use client";

import { ringById, type RingId } from "@/lib/app/market";

/** A wedding ring's artwork (public/rings/), drawn in a square box with a soft glow. */
export function RingArt({ id, size = 48, className = "" }: { id: RingId; size?: number; className?: string }) {
  const r = ringById(id);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={r.image} alt="" width={size} height={size} draggable={false} className={`shrink-0 object-contain drop-shadow-[0_2px_6px_rgb(255_120_170/0.35)] ${className}`} style={{ width: size, height: size }} aria-hidden />
  );
}
