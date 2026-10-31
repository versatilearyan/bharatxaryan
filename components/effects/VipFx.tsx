"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { bubbleFit, type EffectSet, type VipSet } from "@/lib/app/effects";
import { SvgaAnim } from "./SvgaAnim";

/**
 * Fits a VIP frame to a spot of `box` px (a seat, a profile picture): every
 * frame is drawn about 1.45× the spot, the avatar is sized to that frame's
 * window, and `drop` is the room to leave below for art that hangs lower
 * (like the VIP 1 ribbon) so it doesn't cover the name.
 */
export function frameFit(set: EffectSet, box: number, k = 1.45) {
  return {
    avatar: Math.round((box * k) / set.frameScale),
    drop: Math.max(0, Math.round(box * k * (1 - set.frameY) - box / 2 - box * 0.12)),
  };
}

/**
 * A VIP animated frame around an avatar. `size` is the avatar's size; the
 * frame is drawn bigger around it, with the avatar in the frame's window.
 */
export function VipFrame({ set, size, children, className = "" }: { set: EffectSet; size: number; children: ReactNode; className?: string }) {
  const w = size * set.frameScale;
  return (
    <span className={`relative grid place-items-center ${className}`} style={{ width: size, height: size }}>
      {children}
      <SvgaAnim src={set.frame} className="pointer-events-none absolute left-1/2 top-1/2 z-[1] max-w-none" style={{ width: w, height: w, transform: `translate(-50%, -${set.frameY * 100}%)` }} />
    </span>
  );
}

/** The VIP chat bubble art stretched behind a box of text. */
export function VipBubbleArt({ set }: { set: EffectSet }) {
  return <SvgaAnim src={set.bubble} className="pointer-events-none absolute max-w-none" style={bubbleFit(set.bubbleBox)} />;
}

/**
 * The entry banner, with a line of text where the art leaves room for it.
 * The text shrinks to fit the bar (down to 60%), so long names still show in full.
 */
export function VipEntryBanner({ set, avatar: avatarIn, children, className = "", style }: { set: EffectSet; avatar?: ReactNode; children?: ReactNode; className?: string; style?: CSSProperties }) {
  const avatar = set.entryNoAvatar ? undefined : avatarIn;
  const box = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const b = box.current;
    const r = row.current;
    if (!b || !r) return;
    const fit = () => setScale(Math.max(0.6, Math.min(1, b.clientWidth / Math.max(1, r.scrollWidth))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => ro.disconnect();
  }, [children, avatar]);
  return (
    <div className={`relative @container ${className}`} style={{ aspectRatio: set.entryRatio, ...style }}>
      {/* Not paused off-screen: the banner slides in from outside the room and must already be playing */}
      <SvgaAnim src={set.entry} observe={false} className="absolute inset-0 h-full w-full" />
      {children ? (
        // With an avatar the row starts right after the left ornament, so the bar has no empty start
        <div ref={box} className={`absolute top-1/2 flex -translate-y-1/2 ${avatar ? "justify-start" : "justify-center"}`} style={{ left: avatar ? set.entryAvatarAt : set.entryText[0], right: set.entryText[1] }}>
          <span ref={row} className="flex shrink-0 items-center gap-[2.5cqw]" style={{ transform: `scale(${scale})`, transformOrigin: avatar ? "left center" : "center" }}>
            {avatar ? (
              <span className="grid shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-[#ffe08a]/80" style={{ width: "12cqw", height: "12cqw" }}>
                {avatar}
              </span>
            ) : null}
            <span className="block whitespace-nowrap font-display font-extrabold text-white [filter:drop-shadow(0_1px_2px_rgb(60_20_0/0.9))]" style={{ fontSize: "clamp(11px, 5cqw, 17px)" }}>
              {children}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The VIP badge next to a name, `size` px tall (the art is about 1.5× as wide).
 * Lists (room chat, cards) use the still image so dozens of lines don't each
 * run an animation; `animated` plays the SVGA.
 */
export function VipBadge({ set, size = 18, animated = false, level, className = "" }: { set: VipSet; size?: number; animated?: boolean; level?: number; className?: string }) {
  // The badge file is a square canvas with the art in a band across the middle (set.badgeBand)
  const [top, bottom] = set.badgeBand;
  const k = size / (bottom - top);
  const canvas = (set.badgeCanvas ?? 320) * k;
  return (
    <span className={`relative inline-flex shrink-0 items-center align-middle ${className}`} style={{ height: size, width: canvas }} title={level ? `VIP ${level}` : "VIP"} aria-label={level ? `VIP ${level}` : "VIP"} role="img">
      {animated ? (
        <SvgaAnim src={set.badge} className="pointer-events-none absolute left-0 max-w-none" style={{ width: canvas, height: canvas, top: -top * k }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={set.badgeStill} alt="" width={Math.round(canvas)} height={size} className="object-contain" style={{ width: canvas, height: size }} />
      )}
    </span>
  );
}
