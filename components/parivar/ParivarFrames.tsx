"use client";

/**
 * Parivar frames: the border around a Parivar's picture and its sign badge grow richer as the
 * Parivar levels up (wood, bronze, silver, gold, ruby, diamond, royal). Which frame a level gets
 * is set by the admin; the app only draws the frame the server names.
 */
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

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

/**
 * The sign badge art for each frame level, in order (wood → royal): chrome, sapphire, purple, royal pink,
 * golden legend, neon ice-blue and mythic. Each is a winged crest with an empty name plate on the right;
 * `plate` is where the sign text goes, as fractions of the image (x0, x1, y0, y1), and `fill`/`stroke`
 * colour the lettering to match the badge.
 */
type SignArt = { src: string; ar: number; plate: [number, number, number, number]; fill: [string, string, string]; stroke: string; glow: string };
const SIGN_ART: Record<FrameKey, SignArt> = {
  wood: { src: "/signs/sign-1.webp", ar: 2.701, plate: [0.4319, 0.9556, 0.4085, 0.7454], fill: ["#ffffff", "#e9edf3", "#9aa3b2"], stroke: "#1d2230", glow: "rgba(220,228,240,0.35)" },
  bronze: { src: "/signs/sign-2.webp", ar: 2.701, plate: [0.4314, 0.955, 0.4085, 0.7454], fill: ["#ffffff", "#e3f1ff", "#8fc4ff"], stroke: "#0a2350", glow: "rgba(90,170,255,0.4)" },
  silver: { src: "/signs/sign-3.webp", ar: 2.6979, plate: [0.4272, 0.9471, 0.405, 0.7392], fill: ["#ffffff", "#f1e6ff", "#c9a3ff"], stroke: "#2e0c5a", glow: "rgba(176,123,255,0.45)" },
  gold: { src: "/signs/sign-4.webp", ar: 2.7195, plate: [0.4328, 0.9499, 0.4062, 0.7413], fill: ["#ffffff", "#ffe6f0", "#ff9cc2"], stroke: "#4a0a24", glow: "rgba(255,92,150,0.45)" },
  ruby: { src: "/signs/sign-5.webp", ar: 2.7489, plate: [0.4389, 0.956, 0.4062, 0.7413], fill: ["#fff6c8", "#ffd45a", "#d98f1a"], stroke: "#3a1c02", glow: "rgba(255,190,70,0.5)" },
  diamond: { src: "/signs/sign-6.webp", ar: 2.8407, plate: [0.4748, 0.9478, 0.4011, 0.732], fill: ["#ffffff", "#e6f8ff", "#8fdcff"], stroke: "#06244a", glow: "rgba(110,200,255,0.55)" },
  royal: { src: "/signs/sign-7.webp", ar: 2.9088, plate: [0.4842, 0.9483, 0.41, 0.73], fill: ["#fff6c8", "#ffd45a", "#d98f1a"], stroke: "#3a0606", glow: "rgba(255,120,60,0.55)" },
};
const SIGN_H = { sm: 32, md: 40, lg: 52 } as const;

/** The Parivar sign on its level badge: a winged crest with the sign written on the name plate. */
export function SignBadge({ sign, frame, size = "md" }: { sign: string; frame?: string | null; size?: "sm" | "md" | "lg" }) {
  const key = frameKey(frame);
  const art = SIGN_ART[key];
  const h = SIGN_H[size];
  const W = 600;
  const H = Math.round(W / art.ar);
  const [px0, px1, py0, py1] = art.plate;
  // Lettering box inside the plate (a little in from the rounded ends)
  const bx0 = (px0 + 0.008) * W;
  const bx1 = (px1 - 0.03) * W;
  const by0 = py0 * H;
  const by1 = py1 * H;
  const boxW = bx1 - bx0;
  const text = (sign || "").toUpperCase();
  const fullFs = (by1 - by0) * 0.86;
  // A long sign gets a smaller font (normal letter shapes, never squashed) so it fits the plate.
  // Start from an estimate, then measure the real width once the font has loaded and correct it.
  const estimate = Math.min(fullFs, boxW / Math.max(1, text.length * 0.72));
  const [fs, setFs] = useState(estimate);
  const textRef = useRef<SVGTextElement>(null);
  useLayoutEffect(() => {
    let live = true;
    const fit = () => {
      const el = textRef.current;
      if (!el || !live) return;
      el.setAttribute("font-size", String(fullFs));
      el.setAttribute("letter-spacing", String(fullFs * 0.02));
      const w = el.getComputedTextLength();
      const next = w > boxW ? (fullFs * boxW) / w : fullFs;
      el.setAttribute("font-size", String(next));
      el.setAttribute("letter-spacing", String(next * 0.02));
      setFs(next);
    };
    fit();
    if (typeof document !== "undefined" && document.fonts?.ready) void document.fonts.ready.then(fit);
    return () => {
      live = false;
    };
  }, [text, fullFs, boxW]);
  // Unique per badge: a shared id breaks when the first badge using it sits in a hidden tab (the text then shows as an empty outline)
  const gid = `sg-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <span className="relative inline-block shrink-0 align-middle" style={{ height: h, width: h * art.ar, filter: `drop-shadow(0 0 ${size === "sm" ? 3 : 6}px ${art.glow})` }} title={`${sign} · ${frameName(frame)}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img" aria-label={`${sign} sign, ${frameName(frame)} frame`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={art.fill[0]} />
            <stop offset="0.5" stopColor={art.fill[1]} />
            <stop offset="1" stopColor={art.fill[2]} />
          </linearGradient>
        </defs>
        <image href={art.src} x="0" y="0" width={W} height={H} preserveAspectRatio="none" />
        <filter id={`${gid}-sh`} x="-10%" y="-30%" width="120%" height="160%">
          <feDropShadow dx="0" dy={fs * 0.06} stdDeviation={fs * 0.05} floodColor={art.stroke} floodOpacity="0.9" />
        </filter>
        <g transform={`translate(${(bx0 + bx1) / 2} ${(by0 + by1) / 2})`} filter={`url(#${gid}-sh)`}>
          <text
            ref={textRef}
            x="0"
            y="0"
            dy="0.36em"
            textAnchor="middle"
            fontFamily="var(--font-sans), system-ui, sans-serif"
            fontWeight={800}
            fontSize={fs}
            letterSpacing={fs * 0.02}
            fill={`url(#${gid})`}
          >
            {text}
          </text>
        </g>
      </svg>
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
