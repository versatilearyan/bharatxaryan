"use client";

import { useId, type ReactNode } from "react";

/** Small shared pieces for the Parivar screens: icon tiles that replace emoji, and glossy "orbs". */
import { Coins, Gift, HeartHandshake, Landmark, Swords, MessageCircle, Megaphone, Mic, ShieldCheck, ShoppingBag, Sparkles, Star, Ticket, VenetianMask, Dices, type LucideIcon } from "lucide-react";

export const KIND_GLYPH: Record<string, LucideIcon> = { COINS: Coins, FUNDS: Landmark, CHARM: Sparkles, CHEST: Gift, CARD: Ticket, GACHA_CARD: Ticket, BARRIER: ShieldCheck, EXP: Star, GIFT_CARD: Gift, WEAPON: Swords, ITEM: Sparkles };
export const TILE_GLYPH: Record<string, LucideIcon> = { gift: HeartHandshake, chat: MessageCircle, gacha: Dices, cheer: Megaphone, chests: Gift, shop: ShoppingBag, kavach: ShieldCheck, chori: VenetianMask, voice: Mic };

/** A thin-line icon on a frosted gold tile. */
export function Glyph({ icon: Icon, size = 44, tone = "gold", className = "" }: { icon: LucideIcon; size?: number; tone?: "gold" | "light" | "mute"; className?: string }) {
  const bg = tone === "light" ? "linear-gradient(160deg, #fff3da, #f0d9ac)" : tone === "mute" ? "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))" : "linear-gradient(160deg, rgba(240,205,130,0.28), rgba(185,128,58,0.12))";
  const color = tone === "light" ? "#5a3a12" : tone === "mute" ? "rgba(255,241,213,0.7)" : "#f0cd82";
  return (
    <span className={`grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size, borderRadius: size * 0.32, background: bg, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(240,205,130,0.22)", color }} aria-hidden>
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={1.7} />
    </span>
  );
}

/** A glossy glass sphere, lit from the top left. */
export function Orb({ color, size = 58, className = "", style }: { color: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`absolute block rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 24%, rgba(255,255,255,0.95) 0 6%, rgba(255,255,255,0.0) 22%), radial-gradient(circle at 50% 38%, ${color} 0%, ${color} 38%, rgba(0,0,0,0.55) 100%)`,
        boxShadow: `inset 0 -${size * 0.12}px ${size * 0.2}px rgba(0,0,0,0.45), inset 0 ${size * 0.05}px ${size * 0.1}px rgba(255,255,255,0.25), 0 ${size * 0.14}px ${size * 0.22}px -${size * 0.06}px rgba(0,0,0,0.65)`,
        ...style,
      }}
    />
  );
}

/**
 * Full-colour reward icons for the Gacha, chests and shop: a gold coin for gold, a treasure bag for funds, a glossy heart for Charm,
 * a chest, a card, a shield (Kavach), a star (EXP), a sword and a gem. Drawn as SVG so they stay sharp at any size.
 */
export function RewardArt({ kind, size = 48 }: { kind: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const g = (n: string) => `url(#${n}-${id})`;
  const grad = (n: string, a: string, b: string, c?: string) => (
    <linearGradient id={`${n}-${id}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      {c ? <stop offset="0.55" stopColor={b} /> : null}
      <stop offset="1" stopColor={c ?? b} />
    </linearGradient>
  );
  const frame = (children: ReactNode, defs: ReactNode) => (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.45))" }}>
      <defs>{defs}</defs>
      {children}
    </svg>
  );
  switch (kind) {
    case "COINS":
      return frame(
        <>
          <ellipse cx="32" cy="50" rx="19" ry="5" fill="#000" opacity="0.25" />
          <circle cx="32" cy="30" r="22" fill={g("cr")} />
          <circle cx="32" cy="30" r="17.5" fill={g("ci")} stroke="#b9791f" strokeWidth="1.5" />
          <path d="M28 21h6v20h-5V27l-4 2v-4z" fill="#8a5412" />
          <path d="M16 22a18 18 0 0 1 14-10" stroke="#fff8d6" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
        </>,
        <>
          {grad("cr", "#fff0a8", "#f2b52e", "#c9821a")}
          {grad("ci", "#ffd966", "#f0a81f")}
        </>,
      );
    case "FUNDS":
      return frame(
        <>
          <ellipse cx="32" cy="55" rx="20" ry="4.5" fill="#000" opacity="0.25" />
          <path d="M18 28c-6 9-8 20 2 25h24c10-5 8-16 2-25z" fill={g("bg")} />
          <path d="M23 18l4 7h10l4-7c-3-3-15-3-18 0z" fill={g("bt")} />
          <rect x="24" y="25" width="16" height="4.5" rx="2" fill="#a56a16" />
          <circle cx="32" cy="41" r="9" fill={g("bc")} stroke="#b9791f" strokeWidth="1.4" />
          <path d="M32 35v12M28.5 38.5c0-2 7-2 7 0s-7 2.5-7 5 7 2 7 0" stroke="#8a5412" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>,
        <>
          {grad("bg", "#c98a43", "#8b5523")}
          {grad("bt", "#d9a15a", "#a8692c")}
          {grad("bc", "#fff0a8", "#f2b52e")}
        </>,
      );
    case "CHARM":
      return frame(
        <>
          <ellipse cx="32" cy="55" rx="16" ry="4" fill="#000" opacity="0.25" />
          <path d="M32 54C10 38 8 22 17 15c6-4 13-1 15 5 2-6 9-9 15-5 9 7 7 23-15 39z" fill={g("hh")} />
          <path d="M18 20c2-4 7-5 10-2" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.75" />
          <circle cx="47" cy="14" r="2.2" fill="#fff" opacity="0.9" />
          <circle cx="53" cy="22" r="1.5" fill="#fff" opacity="0.8" />
        </>,
        grad("hh", "#ff9bbd", "#ff3d7a", "#c2154f"),
      );
    case "CHEST":
      return frame(
        <>
          <ellipse cx="32" cy="55" rx="22" ry="4.5" fill="#000" opacity="0.25" />
          <rect x="9" y="30" width="46" height="23" rx="3" fill={g("cb")} />
          <path d="M9 31c0-12 10-18 23-18s23 6 23 18z" fill={g("ct")} />
          <rect x="9" y="29" width="46" height="5" fill="#f3c04a" />
          <rect x="26" y="29" width="12" height="13" rx="2" fill="#f3c04a" stroke="#a56a16" strokeWidth="1.2" />
          <circle cx="32" cy="35" r="2.3" fill="#7a4a10" />
          <path d="M15 19c4-3 9-4 14-4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.5" />
        </>,
        <>
          {grad("cb", "#b8763a", "#7a4520")}
          {grad("ct", "#d28d4a", "#945326")}
        </>,
      );
    case "BARRIER":
      return frame(
        <>
          <ellipse cx="32" cy="57" rx="14" ry="3.5" fill="#000" opacity="0.25" />
          <path d="M32 6l20 7v16c0 14-9 24-20 29C21 53 12 43 12 29V13z" fill={g("sh")} stroke="#e8c26a" strokeWidth="2.2" />
          <path d="M32 12l14 5v12c0 10-6 18-14 22z" fill={g("si")} opacity="0.9" />
          <path d="M25 30l5 5 10-11" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>,
        <>
          {grad("sh", "#8fd0ff", "#2f7fe0", "#1a4aa8")}
          {grad("si", "#6fb8ff", "#2a64c8")}
        </>,
      );
    case "EXP":
      return frame(
        <>
          <ellipse cx="32" cy="57" rx="15" ry="3.5" fill="#000" opacity="0.25" />
          <path d="M32 5l8 17 19 2-14 13 4 19-17-10-17 10 4-19L5 24l19-2z" fill={g("st")} stroke="#c9821a" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M24 22l8-11" stroke="#fff8d6" strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
        </>,
        grad("st", "#fff0a8", "#f6c33c", "#e28a14"),
      );
    case "WEAPON":
      return frame(
        <>
          <ellipse cx="32" cy="58" rx="14" ry="3" fill="#000" opacity="0.25" />
          <path d="M50 6l8 2-2 8-26 26-8-8z" fill={g("bl")} stroke="#8a96a6" strokeWidth="1.4" />
          <rect x="12" y="38" width="22" height="5" rx="2" transform="rotate(45 23 40.5)" fill="#f3c04a" stroke="#a56a16" strokeWidth="1.2" />
          <path d="M20 44l-9 9" stroke="#8b5523" strokeWidth="5" strokeLinecap="round" />
          <circle cx="9" cy="55" r="3.4" fill="#f3c04a" stroke="#a56a16" strokeWidth="1.2" />
        </>,
        grad("bl", "#ffffff", "#c8d2de", "#8a96a6"),
      );
    case "GIFT_CARD":
    case "CARD":
    case "GACHA_CARD":
      return frame(
        <>
          <ellipse cx="32" cy="57" rx="18" ry="3.5" fill="#000" opacity="0.25" />
          <rect x="12" y="8" width="40" height="48" rx="6" fill={g("cd")} stroke="#f3c04a" strokeWidth="2" />
          <rect x="17" y="13" width="30" height="38" rx="4" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.45" />
          <path d="M32 20l3.4 7 7.6 1-5.6 5.3 1.5 7.6L32 37l-6.9 3.9 1.5-7.6L21 28l7.6-1z" fill={g("cs")} />
        </>,
        <>
          {grad("cd", "#a78bfa", "#6d43d6", "#40228f")}
          {grad("cs", "#fff0a8", "#f2b52e")}
        </>,
      );
    default:
      return frame(
        <>
          <ellipse cx="32" cy="57" rx="14" ry="3.5" fill="#000" opacity="0.25" />
          <path d="M32 6l20 18-20 34L12 24z" fill={g("gm")} stroke="#fff" strokeWidth="1.4" strokeOpacity="0.5" strokeLinejoin="round" />
          <path d="M12 24h40M32 6l-8 18 8 34 8-34z" stroke="#fff" strokeWidth="1.2" strokeOpacity="0.55" fill="none" />
        </>,
        grad("gm", "#9ff5ff", "#34c6e6", "#1585b8"),
      );
  }
}
