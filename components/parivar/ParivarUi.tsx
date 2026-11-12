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
          {/* the Panchayat coin (same look as the coin used across the app): gold disc, inner ring, P mark */}
          <circle cx="32" cy="30" r="23" fill={g("cr")} stroke="#a8742f" strokeWidth="1.2" />
          <circle cx="32" cy="30" r="16.4" fill="none" stroke="#a8742f" strokeWidth="2.6" />
          <path d="M25.3 36.8 L27.9 23.4 H34.6 Q39.7 23.4 38.7 28.3 Q37.7 32.7 32.6 32.7 H28.7" fill="none" stroke="#8a5a1f" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 22a19 19 0 0 1 14-11" stroke="#fffaf0" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.75" />
        </>,
        <>{grad("cr", "#fff1c9", "#f2cd83", "#b9853a")}</>,
      );
    case "FUNDS":
      return frame(
        <>
          <ellipse cx="32" cy="55" rx="20" ry="4.5" fill="#000" opacity="0.25" />
          <path d="M18 28c-6 9-8 20 2 25h24c10-5 8-16 2-25z" fill={g("bg")} />
          <path d="M23 18l4 7h10l4-7c-3-3-15-3-18 0z" fill={g("bt")} />
          <rect x="24" y="25" width="16" height="4.5" rx="2" fill="#a56a16" />
          <circle cx="32" cy="41" r="9.5" fill={g("bc")} stroke="#a8742f" strokeWidth="1.1" />
          <circle cx="32" cy="41" r="6.8" fill="none" stroke="#a8742f" strokeWidth="1.1" />
          <path d="M29.2 43.8 L30.3 38.3 H33.1 Q35.2 38.3 34.8 40.3 Q34.4 42.1 32.3 42.1 H30.7" fill="none" stroke="#8a5a1f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>,
        <>
          {grad("bg", "#c98a43", "#8b5523")}
          {grad("bt", "#d9a15a", "#a8692c")}
          {grad("bc", "#fff1c9", "#f2cd83", "#b9853a")}
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
    case "GIFT":
      return frame(
        <>
          <ellipse cx="32" cy="57" rx="19" ry="3.5" fill="#000" opacity="0.25" />
          <rect x="11" y="27" width="42" height="27" rx="5" fill={g("gb")} />
          <rect x="8" y="20" width="48" height="11" rx="4" fill={g("gl")} />
          <rect x="28" y="20" width="8" height="34" fill={g("gr")} />
          <path d="M32 20c-4-9-15-11-15-4 0 4 8 5 15 4zM32 20c4-9 15-11 15-4 0 4-8 5-15 4z" fill={g("gr")} stroke="#c9821a" strokeWidth="1.2" />
          <path d="M14 24h10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        </>,
        <>
          {grad("gb", "#ff9ab0", "#f0567a", "#c42c57")}
          {grad("gl", "#ffb3c4", "#f26a8c")}
          {grad("gr", "#fff0a8", "#f2b52e", "#d98f1a")}
        </>,
      );
    case "FLAME":
      return frame(
        <>
          <path d="M32 4c4 10 18 16 18 32 0 11-8 20-18 20s-18-9-18-20c0-8 4-13 8-17 0 6 3 9 6 10-2-11 0-18 4-25z" fill={g("fo")} />
          <path d="M32 30c3 5 9 8 9 15 0 5-4 9-9 9s-9-4-9-9c0-6 5-9 9-15z" fill={g("fi")} />
        </>,
        <>
          {grad("fo", "#ffb347", "#ff6a1f", "#e0341a")}
          {grad("fi", "#fff6c2", "#ffd34d")}
        </>,
      );
    case "DICE":
      return frame(
        <>
          <ellipse cx="32" cy="58" rx="18" ry="3.5" fill="#000" opacity="0.25" />
          <rect x="6" y="22" width="30" height="30" rx="7" fill={g("da")} stroke="#fff" strokeOpacity="0.6" strokeWidth="1.4" transform="rotate(-12 21 37)" />
          <rect x="28" y="8" width="28" height="28" rx="7" fill={g("db")} stroke="#fff" strokeOpacity="0.6" strokeWidth="1.4" transform="rotate(14 42 22)" />
          <circle cx="15" cy="32" r="2.6" fill="#7a1f3a" />
          <circle cx="22" cy="38" r="2.6" fill="#7a1f3a" />
          <circle cx="28" cy="44" r="2.6" fill="#7a1f3a" />
          <circle cx="38" cy="16" r="2.6" fill="#7a4a10" />
          <circle cx="47" cy="27" r="2.6" fill="#7a4a10" />
        </>,
        <>
          {grad("da", "#ffd1dc", "#ff7a98", "#e0456b")}
          {grad("db", "#fff0a8", "#f6c33c", "#e28a14")}
        </>,
      );
    case "CHAT":
      return frame(
        <>
          <path d="M8 14c0-4 3-7 7-7h24c4 0 7 3 7 7v14c0 4-3 7-7 7H22l-9 7v-7h0c-3 0-5-3-5-7z" fill={g("ca")} />
          <path d="M24 38h18l9 7v-7c3 0 5-3 5-7V24c0-4-3-7-7-7h-1v11c0 6-4 10-10 10z" fill={g("cc")} />
          <circle cx="18" cy="21" r="2.4" fill="#5a3a12" />
          <circle cx="27" cy="21" r="2.4" fill="#5a3a12" />
          <circle cx="36" cy="21" r="2.4" fill="#5a3a12" />
        </>,
        <>
          {grad("ca", "#fff3da", "#f0cd82")}
          {grad("cc", "#e7bc72", "#b9803a")}
        </>,
      );
    case "MEGAPHONE":
      return frame(
        <>
          <ellipse cx="32" cy="57" rx="17" ry="3.5" fill="#000" opacity="0.25" />
          <path d="M10 26h9l24-13v38L19 38h-9a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z" fill={g("mg")} stroke="#a56a16" strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="16" y="38" width="7" height="13" rx="3" fill={g("mh")} />
          <path d="M43 13c4 6 4 32 0 38" stroke="#fff4d0" strokeWidth="2" fill="none" />
          <path d="M50 24c3 2 3 14 0 16M55 19c5 4 5 22 0 26" stroke="#ff7a98" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M13 29h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </>,
        <>
          {grad("mg", "#fff0a8", "#f6c33c", "#e28a14")}
          {grad("mh", "#c98a43", "#8b5523")}
        </>,
      );
    case "BAG":
      return frame(
        <>
          <ellipse cx="32" cy="58" rx="19" ry="3.5" fill="#000" opacity="0.25" />
          <path d="M23 22v-4a9 9 0 0 1 18 0v4" stroke="#a56a16" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M12 22h40l-3 32a4 4 0 0 1-4 3.6H19a4 4 0 0 1-4-3.6z" fill={g("sb")} stroke="#a3354f" strokeWidth="1.2" />
          <path d="M12 22h40l-.5 6h-39z" fill="#ffd1dc" opacity="0.55" />
          <path d="M32 33l2.6 5.2 5.7.8-4.1 4 1 5.7-5.2-2.7-5.2 2.7 1-5.7-4.1-4 5.7-.8z" fill={g("ss")} />
        </>,
        <>
          {grad("sb", "#ff9ab0", "#f0567a", "#c42c57")}
          {grad("ss", "#fff0a8", "#f2b52e")}
        </>,
      );
    case "MASK":
      return frame(
        <>
          <ellipse cx="32" cy="55" rx="18" ry="3.5" fill="#000" opacity="0.25" />
          <path d="M6 24c8-6 18-6 26-2 8-4 18-4 26 2-1 12-8 20-16 20-5 0-8-4-10-7-2 3-5 7-10 7-8 0-15-8-16-20z" fill={g("mk")} stroke="#0d0a12" strokeWidth="1.4" />
          <path d="M14 29c3-3 9-3 12 1-3 3-9 3-12-1zM38 30c3-4 9-4 12-1-3 4-9 4-12 1z" fill="#fff" />
          <circle cx="20" cy="29.5" r="2" fill="#1a1020" />
          <circle cx="44" cy="29.5" r="2" fill="#1a1020" />
          <path d="M8 23c-2-3-4-4-6-4M56 23c2-3 4-4 6-4" stroke="#4a3a6a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M12 23c5-3 10-3 14-1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" fill="none" />
        </>,
        grad("mk", "#6b5a8f", "#3a2d57", "#1f1733"),
      );
    case "MIC":
      return frame(
        <>
          <ellipse cx="32" cy="59" rx="14" ry="3" fill="#000" opacity="0.25" />
          <rect x="21" y="5" width="22" height="34" rx="11" fill={g("mc")} stroke="#a56a16" strokeWidth="1.4" />
          <path d="M21 17h22M21 24h22M21 31h22" stroke="#a56a16" strokeWidth="1.2" opacity="0.55" />
          <path d="M14 30a18 18 0 0 0 36 0" stroke="#e7bc72" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M32 48v7M23 56h18" stroke="#b9803a" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M26 10c-1 3-1 8-1 12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
        </>,
        grad("mc", "#fff0a8", "#f6c33c", "#d98f1a"),
      );
    /* ---- Parivar menu icons, drawn in the Panchayat palette: gold, maroon, cream, coral ---- */
    case "P_CHAT":
      return frame(
        <>
          <path d="M7 15c0-5 4-8 9-8h22c5 0 9 3 9 8v12c0 5-4 8-9 8H23l-9 8v-8c-4-1-7-4-7-8z" fill={g("a")} stroke="#8a5412" strokeWidth="1.3" />
          <path d="M26 39h14l9 7v-7c4-1 7-4 7-8v-9c0-4-3-7-7-7h-1v13c0 6-5 11-11 11z" fill={g("b")} stroke="#3a0d18" strokeWidth="1.2" />
          <path d="M18 21c2-3 5-3 7 0 2-3 5-3 7 0-1 3-4 5-7 7-3-2-6-4-7-7z" fill="#c42c45" />
          <path d="M12 12c3-2 7-2 10-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6" fill="none" />
        </>,
        <>
          {grad("a", "#fff6dc", "#f0cd82")}
          {grad("b", "#c4475f", "#7a1a30")}
        </>,
      );
    case "P_GIFT":
      return frame(
        <>
          <ellipse cx="32" cy="57" rx="19" ry="3.5" fill="#000" opacity="0.3" />
          <rect x="11" y="27" width="42" height="27" rx="4" fill={g("a")} stroke="#3a0d18" strokeWidth="1.2" />
          <rect x="8" y="20" width="48" height="10" rx="3.5" fill={g("b")} stroke="#3a0d18" strokeWidth="1.2" />
          <rect x="28" y="20" width="8" height="34" fill={g("c")} />
          <path d="M14 38h36M14 46h36" stroke="#f0cd82" strokeWidth="1" strokeDasharray="1.5 3" opacity="0.7" />
          <path d="M32 20c-4-10-16-12-16-4 0 4 9 5 16 4zM32 20c4-10 16-12 16-4 0 4-9 5-16 4z" fill={g("c")} stroke="#8a5412" strokeWidth="1.2" />
          <circle cx="32" cy="20" r="3" fill="#c42c45" stroke="#8a5412" strokeWidth="1" />
        </>,
        <>
          {grad("a", "#b23a55", "#6e1428")}
          {grad("b", "#d0506a", "#8f2038")}
          {grad("c", "#fff0a8", "#f2b52e", "#c9821a")}
        </>,
      );
    case "P_DICE":
      return frame(
        <>
          <ellipse cx="32" cy="58" rx="18" ry="3.5" fill="#000" opacity="0.3" />
          <rect x="6" y="22" width="30" height="30" rx="7" fill={g("a")} stroke="#3a0d18" strokeWidth="1.3" transform="rotate(-12 21 37)" />
          <rect x="28" y="8" width="28" height="28" rx="7" fill={g("b")} stroke="#8a5412" strokeWidth="1.3" transform="rotate(14 42 22)" />
          <circle cx="15" cy="32" r="2.7" fill="#fff0a8" />
          <circle cx="22" cy="38" r="2.7" fill="#fff0a8" />
          <circle cx="28" cy="44" r="2.7" fill="#fff0a8" />
          <circle cx="38" cy="16" r="2.7" fill="#7a1a30" />
          <circle cx="47" cy="27" r="2.7" fill="#7a1a30" />
          <path d="M33 10c3-1 6-1 9 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" transform="rotate(14 42 22)" />
        </>,
        <>
          {grad("a", "#c4475f", "#7a1a30")}
          {grad("b", "#fff0a8", "#f6c33c", "#d98f1a")}
        </>,
      );
    case "P_DHOL":
      return frame(
        <>
          <ellipse cx="32" cy="57" rx="20" ry="3.5" fill="#000" opacity="0.3" />
          <path d="M10 22c0-5 10-8 22-8s22 3 22 8v18c0 5-10 9-22 9s-22-4-22-9z" fill={g("a")} stroke="#3a0d18" strokeWidth="1.3" />
          <path d="M14 24l6 22M24 22l4 26M34 22l2 27M44 23l-2 25M52 26l-5 20" stroke="#f0cd82" strokeWidth="1.4" opacity="0.85" />
          <path d="M10 40c0 5 10 9 22 9s22-4 22-9" stroke="#f2b52e" strokeWidth="3" fill="none" />
          <ellipse cx="32" cy="22" rx="22" ry="8" fill={g("b")} stroke="#f2b52e" strokeWidth="2.4" />
          <path d="M44 8l9-5M47 11l10-3" stroke="#8b5523" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M18 19c4-2 9-3 14-3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" fill="none" />
        </>,
        <>
          {grad("a", "#c4475f", "#6e1428")}
          {grad("b", "#fff6dc", "#ecd3a0")}
        </>,
      );
    case "P_CHEST":
      return frame(
        <>
          <ellipse cx="32" cy="56" rx="22" ry="4" fill="#000" opacity="0.3" />
          <rect x="9" y="30" width="46" height="23" rx="3" fill={g("a")} stroke="#3a0d18" strokeWidth="1.2" />
          <path d="M9 31c0-12 10-18 23-18s23 6 23 18z" fill={g("b")} stroke="#3a0d18" strokeWidth="1.2" />
          <path d="M9 29h46v5H9zM14 31V18M50 31V18" stroke="#f2b52e" strokeWidth="3" />
          <path d="M11 44h42" stroke="#f2b52e" strokeWidth="2" opacity="0.8" />
          <path d="M26 28h12v13l-6 4-6-4z" fill={g("c")} stroke="#8a5412" strokeWidth="1.1" />
          <circle cx="32" cy="34.5" r="2.2" fill="#6e1428" />
          <path d="M16 20c4-3 9-4 13-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.4" fill="none" />
        </>,
        <>
          {grad("a", "#a3354f", "#5a1426")}
          {grad("b", "#c4475f", "#7a1a30")}
          {grad("c", "#fff0a8", "#f2b52e")}
        </>,
      );
    case "P_POTLI":
      return frame(
        <>
          <ellipse cx="32" cy="58" rx="17" ry="3.5" fill="#000" opacity="0.3" />
          <path d="M24 20c-11 7-14 18-11 27 2 6 9 9 19 9s17-3 19-9c3-9 0-20-11-27z" fill={g("a")} stroke="#3a0d18" strokeWidth="1.3" />
          <path d="M22 14c3 2 6 3 10 3s7-1 10-3l-2 7c-3 1-5 1-8 1s-5 0-8-1z" fill={g("b")} stroke="#3a0d18" strokeWidth="1.1" />
          <path d="M23 21c5 2 13 2 18 0" stroke="#f2b52e" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M40 22c4 3 6 7 5 11" stroke="#f2b52e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <circle cx="45" cy="34" r="2.4" fill="#f2b52e" />
          <path d="M32 31l2.6 5.2 5.7.8-4.1 4 1 5.7-5.2-2.7-5.2 2.7 1-5.7-4.1-4 5.7-.8z" fill={g("c")} stroke="#8a5412" strokeWidth="0.8" />
          <path d="M18 34c1-4 3-7 6-9" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.45" fill="none" />
        </>,
        <>
          {grad("a", "#c4475f", "#6e1428")}
          {grad("b", "#d0506a", "#8f2038")}
          {grad("c", "#fff0a8", "#f2b52e")}
        </>,
      );
    case "P_KAVACH":
      return frame(
        <>
          <ellipse cx="32" cy="58" rx="14" ry="3.5" fill="#000" opacity="0.3" />
          <path d="M32 5l21 8v15c0 15-9 25-21 30C20 53 11 43 11 28V13z" fill={g("a")} stroke="#8a5412" strokeWidth="1.4" />
          <path d="M32 11l15 6v11c0 11-6 19-15 23-9-4-15-12-15-23V17z" fill={g("b")} />
          <path d="M24 26l4 4 4-7 4 7 4-4-2 10c-4 1-8 1-12 0z" fill={g("a")} stroke="#8a5412" strokeWidth="0.9" strokeLinejoin="round" />
          <circle cx="32" cy="42" r="2.4" fill="#f2b52e" />
          <path d="M18 14l8-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </>,
        <>
          {grad("a", "#fff0a8", "#f2b52e", "#c9821a")}
          {grad("b", "#b23a55", "#5a1426")}
        </>,
      );
    case "P_MASK":
      return frame(
        <>
          <ellipse cx="32" cy="55" rx="18" ry="3.5" fill="#000" opacity="0.3" />
          <path d="M5 24c8-6 19-6 27-2 8-4 19-4 27 2-1 12-8 20-17 20-5 0-8-4-10-7-2 3-5 7-10 7-9 0-16-8-17-20z" fill={g("a")} stroke="#f2b52e" strokeWidth="1.6" />
          <path d="M14 29c3-3 9-3 12 1-3 3-9 3-12-1zM38 30c3-4 9-4 12-1-3 4-9 4-12 1z" fill="#fff6dc" />
          <circle cx="20" cy="29.5" r="2" fill="#2a0a12" />
          <circle cx="44" cy="29.5" r="2" fill="#2a0a12" />
          <path d="M32 22v6" stroke="#f2b52e" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6 23c-2-3-3-5-4-6M58 23c2-3 3-5 4-6" stroke="#c42c45" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M12 22c5-3 10-3 14-1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" fill="none" />
        </>,
        grad("a", "#7a1a30", "#3a0d18", "#22070e"),
      );
    case "P_MIC":
      return frame(
        <>
          <ellipse cx="32" cy="59" rx="14" ry="3" fill="#000" opacity="0.3" />
          <rect x="21" y="5" width="22" height="34" rx="11" fill={g("a")} stroke="#3a0d18" strokeWidth="1.3" />
          <path d="M21 17h22M21 24h22M21 31h22" stroke="#f0cd82" strokeWidth="1.3" opacity="0.7" />
          <path d="M14 30a18 18 0 0 0 36 0" stroke={g("b")} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M32 48v7M23 56h18" stroke="#f2b52e" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M26 10c-1 3-1 8-1 12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
        </>,
        <>
          {grad("a", "#c4475f", "#6e1428")}
          {grad("b", "#fff0a8", "#f2b52e")}
        </>,
      );
    case "P_THALI":
      return frame(
        <>
          <ellipse cx="32" cy="57" rx="22" ry="3.5" fill="#000" opacity="0.3" />
          <ellipse cx="32" cy="44" rx="26" ry="9" fill={g("a")} stroke="#8a5412" strokeWidth="1.3" />
          <ellipse cx="32" cy="42.5" rx="20" ry="6" fill={g("b")} />
          <path d="M14 43h4M46 43h4M22 47h3M39 47h3" stroke="#c42c45" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M22 38c0 4 20 4 20 0l-2-5H24z" fill={g("c")} stroke="#3a0d18" strokeWidth="1.1" />
          <path d="M32 32c-4-5-3-10 0-15 3 5 4 10 0 15z" fill={g("f")} />
          <path d="M32 30c-1.6-2-1.4-4.5 0-7 1.4 2.5 1.6 5 0 7z" fill="#fff6c2" />
          <circle cx="18" cy="36" r="2.4" fill="#ffb347" />
          <circle cx="46" cy="36" r="2.4" fill="#ffb347" />
        </>,
        <>
          {grad("a", "#fff0a8", "#f2b52e", "#c9821a")}
          {grad("b", "#f6d899", "#e0a842")}
          {grad("c", "#c4475f", "#6e1428")}
          {grad("f", "#ffcf6b", "#ff6a1f")}
        </>,
      );
    case "P_ANAAR":
      return frame(
        <>
          <ellipse cx="32" cy="59" rx="13" ry="3" fill="#000" opacity="0.3" />
          <path d="M23 58l3-16h12l3 16z" fill={g("a")} stroke="#3a0d18" strokeWidth="1.2" />
          <path d="M24.5 50h15M25.5 46h13" stroke="#f2b52e" strokeWidth="1.6" />
          <path d="M32 40c0-8 0-14 0-22M32 40c-6-6-11-11-17-14M32 40c6-6 11-11 17-14M32 40c-3-7-6-14-11-20M32 40c3-7 6-14 11-20" stroke={g("s")} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="15" r="2.6" fill="#fff6c2" />
          <circle cx="13" cy="24" r="2.4" fill="#ffcf6b" />
          <circle cx="51" cy="24" r="2.4" fill="#ffcf6b" />
          <circle cx="20" cy="17" r="2" fill="#ff7a98" />
          <circle cx="44" cy="17" r="2" fill="#ff7a98" />
          <circle cx="26" cy="8" r="1.6" fill="#fff0a8" />
          <circle cx="40" cy="8" r="1.6" fill="#fff0a8" />
          <circle cx="8" cy="34" r="1.6" fill="#fff0a8" />
          <circle cx="56" cy="34" r="1.6" fill="#fff0a8" />
        </>,
        <>
          {grad("a", "#c4475f", "#6e1428")}
          {grad("s", "#fff6c2", "#ffb347", "#ff6a1f")}
        </>,
      );
    case "PODIUM":
      return frame(
        <>
          <rect x="22" y="14" width="20" height="40" rx="3" fill={g("p1")} />
          <rect x="6" y="26" width="17" height="28" rx="3" fill={g("p2")} />
          <rect x="41" y="32" width="17" height="22" rx="3" fill={g("p3")} />
          <path d="M32 21l2 4 4.5.6-3.3 3.1.8 4.4-4-2.2-4 2.2.8-4.4-3.3-3.1 4.5-.6z" fill="#8a5412" />
        </>,
        <>
          {grad("p1", "#fff0a8", "#f2b52e")}
          {grad("p2", "#f4f4f8", "#aeb4c2")}
          {grad("p3", "#f5c39a", "#c07a45")}
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
