"use client";

import { useId } from "react";
import { useMe } from "@/lib/app/me-store";
import { ME_ID, useApp } from "@/lib/app/store";
import { CHARM_BADGE_ART, charmInfo, type CharmBadgeArt, type CharmIcon, type CharmTier } from "@/lib/app/progress";

const PALETTE: Record<CharmIcon, { a: string; b: string; c: string; text: string; bg: string }> = {
  star: { a: "#fff4c9", b: "#f2c063", c: "#b07a1e", text: "#f2c063", bg: "rgb(242 192 99 / 0.14)" },
  diamond: { a: "#e6fbff", b: "#6fd6ff", c: "#2a6fd1", text: "#7fdcff", bg: "rgb(111 214 255 / 0.14)" },
  crown: { a: "#fff1d5", b: "#ff8fa3", c: "#b0245a", text: "#ff9db0", bg: "rgb(255 143 163 / 0.16)" },
};

/** The charm icon on its own: a star, diamond or crown, drawn in a 24×24 box. */
export function CharmIconArt({ icon, size = 16 }: { icon: CharmIcon; size?: number }) {
  const uid = useId().replace(/:/g, "");
  const p = PALETTE[icon];
  const fill = `url(#cg-${uid})`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id={`cg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.a} />
          <stop offset="0.5" stopColor={p.b} />
          <stop offset="1" stopColor={p.c} />
        </linearGradient>
      </defs>
      {icon === "star" ? (
        <path d="M12 1.8 L14.9 8.3 L22 9 L16.6 13.7 L18.2 20.7 L12 17 L5.8 20.7 L7.4 13.7 L2 9 L9.1 8.3 Z" fill={fill} stroke={p.c} strokeWidth="0.8" strokeLinejoin="round" />
      ) : icon === "diamond" ? (
        <>
          <path d="M6 3 H18 L22.5 9 L12 21.5 L1.5 9 Z" fill={fill} stroke={p.c} strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M1.5 9 H22.5 M6 3 L9 9 L12 21.5 L15 9 L18 3 M9 9 L12 3 L15 9" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.7" />
        </>
      ) : (
        <>
          <path d="M3 8 L7.5 12 L12 4.5 L16.5 12 L21 8 L19.3 18.5 H4.7 Z" fill={fill} stroke={p.c} strokeWidth="0.8" strokeLinejoin="round" />
          <rect x="4.7" y="18.6" width="14.6" height="2.6" rx="1" fill={fill} stroke={p.c} strokeWidth="0.6" />
          <circle cx="12" cy="13.5" r="1.6" fill="#fff" />
        </>
      )}
    </svg>
  );
}

/**
 * A charm level badge: the star, diamond or crown with the level number on its
 * corner (or the badge image from CHARM_BADGE_ART when one is set).
 */
export function CharmLevelArt({ tier, size = 20 }: { tier: CharmTier; size?: number }) {
  const art = CHARM_BADGE_ART[tier.rank];
  if (art && !art.src) return <BadgeWithText art={art} height={size} text={String(tier.rank)} />;
  if (art?.src) return <img src={art.src} alt="" width={Math.round(size * art.ratio)} height={size} className="shrink-0 object-contain" style={{ width: Math.round(size * art.ratio), height: size, maxWidth: "100%" }} draggable={false} />;
  const n = Math.round(size * 0.52);
  return (
    <span className="relative inline-block shrink-0" style={{ width: size + n * 0.35, height: size }}>
      <CharmIconArt icon={tier.icon} size={size} />
      <span
        className="absolute bottom-[-1px] right-0 grid place-items-center rounded-full bg-[#3a2a1a] font-extrabold leading-none text-white ring-1 ring-white/70"
        style={{ minWidth: n, height: n, fontSize: n * 0.72, padding: "0 1px" }}
      >
        {tier.rank}
      </span>
    </span>
  );
}

/**
 * Someone's charm level (from gifts they've received), shown as the charm
 * level badge. With showName it's a pill with the level's name instead.
 * Nothing shows before Star 1.
 */
/** A badge image with its number painted out, and `text` written where the number was. */
function BadgeWithText({ art, height, text, label }: { art: CharmBadgeArt; height: number; text: string; label?: string }) {
  const w = Math.round(height * art.ratio);
  const fs = height * (text.length > 6 ? 0.37 : text.length > 4 ? 0.42 : text.length > 2 ? 0.48 : 0.56);
  return (
    <span className="relative inline-block shrink-0 align-middle" style={{ width: w, height, maxWidth: "100%" }} role={label ? "img" : undefined} aria-label={label}>
      <img src={art.blank} alt="" width={w} height={height} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      {/* The pill part of the badge is roughly its right half */}
      <span
        className="absolute inset-y-0 grid place-items-center whitespace-nowrap font-display font-extrabold italic leading-none text-white"
        style={{ left: "47%", right: "9%", fontSize: fs, textShadow: "0 1px 1px rgb(0 0 0 / 0.75), 0 0 3px rgb(0 0 0 / 0.55)" }}
        aria-hidden
      >
        {text}
      </span>
    </span>
  );
}

/**
 * The charm badge with the charm count written in it, like the level pill.
 * Used on profiles only. Badges with art put the count where the level
 * number was; the others show the icon and the count in a pill.
 */
function CharmCountBadge({ tier, points, title, height = 30 }: { tier: CharmTier; points: number; title: string; height?: number }) {
  const art = CHARM_BADGE_ART[tier.rank];
  // Up to 6 digits as is (577667); from a million it's shortened so it fits (1.35M)
  const count = points >= 1_000_000 ? `${(points / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M` : String(points);
  if (art)
    return (
      <span title={title} className="inline-flex shrink-0 align-middle">
        <BadgeWithText art={art} height={height} text={count} label={`Charm ${tier.name}, ${points.toLocaleString("en-IN")} points`} />
      </span>
    );
  const p = PALETTE[tier.icon];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full py-0.5 pl-1 pr-2 text-[12px] font-extrabold" style={{ background: p.bg, color: p.text }} title={title} role="img" aria-label={`Charm ${tier.name}, ${points.toLocaleString("en-IN")} points`}>
      <CharmLevelArt tier={tier} size={18} />
      <span aria-hidden>{count}</span>
    </span>
  );
}

/**
 * `points` (from the backend) wins over the demo charm when given.
 * `showCount` writes the charm count in the badge (profiles and the room profile card).
 */
export function CharmBadge({ personId, size = "sm", showName = false, light = false, points, showCount = false }: { personId: string; size?: "sm" | "md"; showName?: boolean; light?: boolean; points?: number; showCount?: boolean }) {
  const { charmOf } = useApp();
  // Your own charm comes from the backend (GET /users/me/stats) once it has loaded, everywhere it shows
  const myCharm = useMe().stats.data?.charmPoints;
  const given = points ?? (personId === ME_ID ? myCharm : undefined);
  const c = given !== undefined ? charmInfo(given) : charmOf(personId);
  // Below Star 1 (1,000 charm) there's no level yet: show the Star 1 badge greyed out, with the count on profiles or 0 elsewhere
  // With showCount: a bit bigger on profiles (md) than in rows like the room card (sm)
  const countH = size === "md" ? 22 : 17;
  // Below Star 1 (1,000 charm) there's no badge: profiles and the room card show just the count, other places nothing
  if (!c.tier) {
    if (!showCount) return null;
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-full align-middle font-extrabold leading-none ${size === "md" ? "px-2 py-1 text-[11px]" : "px-1.5 py-[3px] text-[10px]"}`}
        style={{ background: light ? "#fdf3dc" : PALETTE.star.bg, color: light ? "#b07a1e" : PALETTE.star.text }}
        title={`Charm · ${c.points.toLocaleString("en-IN")} points (Star 1 at 1,000)`}
      >
        {c.points.toLocaleString("en-IN")} charm
      </span>
    );
  }
  const p = PALETTE[c.tier.icon];
  const md = size === "md";
  const title = `Charm ${c.tier.name} · ${c.points.toLocaleString("en-IN")} points`;
  if (showCount) return <CharmCountBadge tier={c.tier} points={c.points} title={title} height={countH} />;
  if (!showName)
    return (
      <span className="inline-flex shrink-0 items-center align-middle" title={title} aria-label={`Charm ${c.tier.name}`} role="img">
        <CharmLevelArt tier={c.tier} size={md ? 22 : 16} />
      </span>
    );
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-extrabold ${md ? "px-2 py-0.5 text-[12px]" : "px-1.5 text-[10px] leading-[16px]"}`}
      style={{ background: light ? "#f6f0ff" : p.bg, color: light ? p.c : p.text }}
      title={title}
      aria-label={`Charm ${c.tier.name}`}
    >
      <CharmIconArt icon={c.tier.icon} size={md ? 16 : 12} />
      {c.tier.name}
    </span>
  );
}
