"use client";

/**
 * The Panchayat background system. One brand (deep black, plum, burgundy, purple and a little gold), a different atmosphere per
 * screen, so the app does not repeat the same picture everywhere. Everything is a plain CSS gradient (no pictures, no blur,
 * nothing that animates except a few slow stars on Home), so it is cheap on low-end phones and never gets in the way of text.
 */
import type { CSSProperties, ReactNode } from "react";

export type BackdropVariant = "home" | "rooms" | "chat" | "discover" | "profile" | "ranking" | "tasks" | "games" | "parivar";

const BASE = "#07050c";

/** Each screen: a deep base and two or three soft lights. */
const LOOK: Record<BackdropVariant, string> = {
  // Home: dark plum with a warm sunrise low on the right
  home: `radial-gradient(70% 38% at 88% 0%, rgba(255,170,80,0.26), transparent 70%), radial-gradient(80% 40% at 0% 8%, rgba(122,48,120,0.42), transparent 72%), linear-gradient(180deg, #1c0e24 0%, #120a1a 45%, ${BASE} 100%)`,
  // Rooms: a deep, immersive night with a violet glow rising from below, like a stage
  rooms: `radial-gradient(90% 46% at 50% 108%, rgba(106,60,255,0.34), transparent 70%), radial-gradient(70% 30% at 0% 0%, rgba(38,54,122,0.5), transparent 70%), linear-gradient(180deg, #0c0b1c 0%, #0a0814 55%, ${BASE} 100%)`,
  // Chat: calm and quiet, one faint accent
  chat: `radial-gradient(70% 22% at 100% 0%, rgba(124,77,255,0.16), transparent 72%), linear-gradient(180deg, #120d1b 0%, #0c0911 40%, ${BASE} 100%)`,
  // Discover: livelier, purple and pink
  discover: `radial-gradient(80% 36% at 12% 0%, rgba(124,77,255,0.44), transparent 70%), radial-gradient(70% 34% at 100% 14%, rgba(255,61,139,0.30), transparent 70%), linear-gradient(180deg, #170c26 0%, #0e0816 55%, ${BASE} 100%)`,
  // Profile: personal and a little precious, gold on plum
  profile: `radial-gradient(70% 34% at 50% 0%, rgba(231,188,114,0.20), transparent 72%), radial-gradient(60% 30% at 0% 70%, rgba(110,28,64,0.34), transparent 72%), linear-gradient(180deg, #1b0e1c 0%, #110a14 50%, ${BASE} 100%)`,
  // Ranking: competitive, black and gold
  ranking: `radial-gradient(80% 34% at 50% 0%, rgba(242,207,140,0.26), transparent 70%), radial-gradient(50% 30% at 0% 100%, rgba(150,30,50,0.28), transparent 70%), linear-gradient(180deg, #161008 0%, #0d0a08 55%, ${BASE} 100%)`,
  // Tasks: clean and about achieving
  tasks: `radial-gradient(70% 28% at 50% 0%, rgba(61,220,151,0.14), transparent 72%), radial-gradient(60% 26% at 100% 20%, rgba(231,188,114,0.12), transparent 72%), linear-gradient(180deg, #0f1218 0%, #0a0c12 55%, ${BASE} 100%)`,
  // Games: energetic
  games: `radial-gradient(80% 36% at 0% 0%, rgba(255,61,139,0.34), transparent 70%), radial-gradient(80% 36% at 100% 6%, rgba(124,77,255,0.40), transparent 70%), radial-gradient(70% 30% at 50% 100%, rgba(255,138,61,0.16), transparent 70%), linear-gradient(180deg, #170a24 0%, #0d0716 55%, ${BASE} 100%)`,
  // Parivar: prestigious, deep purple and burgundy with champagne gold
  parivar: `radial-gradient(70% 32% at 50% 0%, rgba(231,188,114,0.18), transparent 72%), radial-gradient(70% 36% at 0% 20%, rgba(120,40,110,0.42), transparent 72%), radial-gradient(60% 30% at 100% 70%, rgba(120,24,52,0.34), transparent 72%), linear-gradient(180deg, #1a0c24 0%, #12081a 55%, ${BASE} 100%)`,
};

/** The same background as plain CSS, for a screen whose own root is the scrolling element. */
export const backdropStyle = (variant: BackdropVariant): CSSProperties => ({ background: LOOK[variant], backgroundAttachment: "local" });

const STARS: [number, number][] = [[10, 6], [26, 12], [44, 5], [62, 14], [78, 8], [90, 18]];

export function PanchayatBackground({ variant = "home", className = "" }: { variant?: BackdropVariant; className?: string }) {
  const style: CSSProperties = { background: LOOK[variant] };
  return (
    <div className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`} style={style} aria-hidden>
      {variant === "home" ? (
        <>
          {STARS.map(([x, y], i) => (
            <span key={i} className="tb-star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.6}s` }} />
          ))}
          {/* a faint village on the horizon: banyan, temple and huts */}
          <svg className="absolute inset-x-0 bottom-0 w-full opacity-60" viewBox="0 0 420 110" preserveAspectRatio="xMidYMax slice">
            <path d="M0 92 Q90 74 190 90 T420 80 V110 H0 Z" fill="#0f0714" />
            <g fill="#0b050f">
              <circle cx="28" cy="62" r="20" />
              <circle cx="10" cy="70" r="13" />
              <circle cx="46" cy="68" r="15" />
              <rect x="26" y="68" width="5" height="26" />
              <rect x="176" y="70" width="34" height="24" />
              <path d="M170 72 H216 L193 48 Z" />
              <rect x="92" y="80" width="30" height="14" />
              <path d="M86 82 H128 L107 66 Z" />
              <rect x="262" y="78" width="34" height="16" />
              <path d="M256 80 H302 L279 62 Z" />
            </g>
            <g fill="#ffb347" opacity=".7">
              <rect x="188" y="80" width="7" height="10" rx="3.5" />
              <rect x="104" y="86" width="6" height="6" />
              <rect x="272" y="84" width="6" height="7" />
            </g>
          </svg>
        </>
      ) : null}
    </div>
  );
}

/**
 * A screen on its own background: the picture sits behind, the content scrolls on top of it.
 * Use it on a pushed screen whose root is the scrolling element.
 */
export function ScreenBackdrop({ variant, children, className = "" }: { variant: BackdropVariant; children: ReactNode; className?: string }) {
  return (
    <div className={`relative h-full overflow-hidden ${className}`} style={{ background: BASE }}>
      <PanchayatBackground variant={variant} />
      <div className="relative z-[1] h-full">{children}</div>
    </div>
  );
}
