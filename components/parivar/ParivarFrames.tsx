"use client";

/**
 * Parivar frames: the border around a Parivar's picture and its sign badge grow richer as the
 * Parivar levels up (wood, bronze, silver, gold, ruby, diamond, royal). Which frame a level gets
 * is set by the admin; the app only draws the frame the server names.
 */
import type { ReactNode } from "react";

export const FRAME_ORDER = ["wood", "bronze", "silver", "gold", "ruby", "diamond", "royal"] as const;
export type FrameKey = (typeof FRAME_ORDER)[number];

type Tier = { name: string; a: string; b: string; ink: string; wings: number; gem?: string; crown?: boolean; glow: string };

const TIERS: Record<FrameKey, Tier> = {
  wood: { name: "Lakdi", a: "#b98a5a", b: "#6b4a2b", ink: "#fff4e0", wings: 0, glow: "transparent" },
  bronze: { name: "Kaansa", a: "#f0b27a", b: "#a45c26", ink: "#fff1e0", wings: 0, glow: "rgba(240,178,122,0.25)" },
  silver: { name: "Chaandi", a: "#f4f6fb", b: "#98a2b8", ink: "#1b2233", wings: 1, glow: "rgba(200,210,235,0.35)" },
  gold: { name: "Sona", a: "#ffe28f", b: "#d49a2a", ink: "#3a2408", wings: 2, glow: "rgba(255,200,90,0.45)" },
  ruby: { name: "Manik", a: "#ff9aa8", b: "#c2183a", ink: "#fff0f2", wings: 2, gem: "#ff3b5c", glow: "rgba(255,70,100,0.5)" },
  diamond: { name: "Heera", a: "#d9f7ff", b: "#4aa8e8", ink: "#082a44", wings: 3, gem: "#7fe3ff", glow: "rgba(110,200,255,0.6)" },
  royal: { name: "Shahi", a: "#ffeab0", b: "#b9803a", ink: "#2a1a0c", wings: 3, gem: "#b07bff", crown: true, glow: "rgba(255,200,110,0.7)" },
};

export function frameKey(v?: string | null): FrameKey {
  return (FRAME_ORDER as readonly string[]).includes(v ?? "") ? (v as FrameKey) : "wood";
}
export const frameName = (v?: string | null) => TIERS[frameKey(v)].name;

function Wing({ side, scale, a, b }: { side: "l" | "r"; scale: number; a: string; b: string }) {
  const id = `w-${side}-${a.slice(1)}${b.slice(1)}`;
  return (
    <svg viewBox="0 0 28 24" width={28 * scale} height={24 * scale} aria-hidden style={{ transform: side === "r" ? "scaleX(-1)" : undefined }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <path d="M28 12 C22 2, 10 0, 1 6 C8 6, 12 8, 14 11 C8 10, 4 12, 1 16 C8 17, 13 16, 16 14 C12 17, 10 20, 9 23 C17 22, 24 19, 28 12Z" fill={`url(#${id})`} />
    </svg>
  );
}

/** The Parivar sign with its level frame, e.g. "KING" between wings. */
export function SignBadge({ sign, frame, size = "md" }: { sign: string; frame?: string | null; size?: "sm" | "md" | "lg" }) {
  const t = TIERS[frameKey(frame)];
  const h = size === "lg" ? 30 : size === "sm" ? 17 : 22;
  const fs = size === "lg" ? 15 : size === "sm" ? 9.5 : 12;
  const ws = (size === "lg" ? 1.15 : size === "sm" ? 0.55 : 0.8) * (0.9 + t.wings * 0.12);
  return (
    <span className="relative inline-flex items-center align-middle" style={{ height: h, filter: t.glow !== "transparent" ? `drop-shadow(0 0 6px ${t.glow})` : undefined }}>
      {t.wings > 0 ? (
        <span className="-mr-1" style={{ marginLeft: size === "sm" ? -2 : -4 }}>
          <Wing side="l" scale={ws} a={t.a} b={t.b} />
        </span>
      ) : null}
      <span className="relative inline-flex items-center rounded-full px-2.5 font-extrabold tracking-wide" style={{ height: h, fontSize: fs, color: t.ink, background: `linear-gradient(180deg, ${t.a}, ${t.b})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 0 rgba(0,0,0,0.18), 0 0 0 1.5px ${t.b}` }}>
        {t.gem ? <span className="mr-1 inline-block h-[0.55em] w-[0.55em] rotate-45 rounded-[2px]" style={{ background: t.gem, boxShadow: `0 0 5px ${t.gem}` }} aria-hidden /> : null}
        {sign}
      </span>
      {t.wings > 0 ? (
        <span className="-ml-1" style={{ marginRight: size === "sm" ? -2 : -4 }}>
          <Wing side="r" scale={ws} a={t.a} b={t.b} />
        </span>
      ) : null}
    </span>
  );
}

/** A picture with the level frame around it. */
export function FramedPicture({ frame, size, radius = 0.3, children }: { frame?: string | null; size: number; radius?: number; children: ReactNode }) {
  const t = TIERS[frameKey(frame)];
  const rank = FRAME_ORDER.indexOf(frameKey(frame));
  const pad = Math.max(2, Math.round(size * (0.04 + rank * 0.006)));
  const r = size * radius;
  return (
    <span className="relative inline-block shrink-0" style={{ width: size + pad * 2, height: size + pad * 2 }}>
      <span aria-hidden className="absolute inset-0" style={{ borderRadius: r + pad, background: `linear-gradient(135deg, ${t.a}, ${t.b} 55%, ${t.a})`, boxShadow: t.glow !== "transparent" ? `0 0 ${8 + rank * 3}px ${t.glow}` : undefined }} />
      <span className="absolute overflow-hidden" style={{ inset: pad, borderRadius: r, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.45)" }}>
        {children}
      </span>
      {t.wings > 0 ? (
        <>
          <span className="pointer-events-none absolute top-1/2 -translate-y-1/2" style={{ left: -size * 0.2 }}>
            <Wing side="l" scale={(size / 84) * (0.55 + t.wings * 0.18)} a={t.a} b={t.b} />
          </span>
          <span className="pointer-events-none absolute top-1/2 -translate-y-1/2" style={{ right: -size * 0.2 }}>
            <Wing side="r" scale={(size / 84) * (0.55 + t.wings * 0.18)} a={t.a} b={t.b} />
          </span>
        </>
      ) : null}
      {t.gem ? <span aria-hidden className="absolute left-1/2 -translate-x-1/2 rotate-45 rounded-[3px]" style={{ top: -size * 0.05, width: size * 0.14, height: size * 0.14, background: t.gem, boxShadow: `0 0 8px ${t.gem}` }} /> : null}
      {t.crown ? (
        <span aria-hidden className="absolute left-1/2 -translate-x-1/2" style={{ top: -size * 0.3, fontSize: size * 0.3, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
          👑
        </span>
      ) : null}
    </span>
  );
}
