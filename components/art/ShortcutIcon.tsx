import { useId, type ReactNode } from "react";

export type ShortcutKind = "ranking" | "tasks" | "friends";

const TONES: Record<ShortcutKind, { hi: string; mid: string; deep: string }> = {
  ranking: { hi: "#d0602e", mid: "#8e2a17", deep: "#2c0a07" }, // sindoor
  tasks: { hi: "#7d64e0", mid: "#3d2a92", deep: "#120b32" }, // indigo
  friends: { hi: "#2fae86", mid: "#136a52", deep: "#05201a" }, // peacock
};

/**
 * Home shortcut icons. A polished gem disc in the shortcut's colour inside a
 * slim gold bezel, with a faint lotus (kamal) watermark behind a gold glyph:
 * a trophy for Ranking, a ledger (bahi) with ticks for Tasks. Friends keeps
 * the live friend avatars, passed in as children. Drawn in a 48×48 box.
 */
export function ShortcutIcon({ kind, size = 66, children }: { kind: ShortcutKind; size?: number; children?: ReactNode }) {
  const uid = useId().replace(/:/g, "");
  const g = (n: string) => `${n}-${uid}`;
  const u = (n: string) => `url(#${g(n)})`;
  const { hi, mid, deep } = TONES[kind];
  const lotus = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} className="absolute inset-0 overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={g("bezel")} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#fff3d4" />
            <stop offset="0.3" stopColor="#e9c27a" />
            <stop offset="0.62" stopColor="#9a6a26" />
            <stop offset="0.82" stopColor="#e6bd73" />
            <stop offset="1" stopColor="#7b501b" />
          </linearGradient>
          <radialGradient id={g("gem")} cx="0.5" cy="0.28" r="0.78">
            <stop offset="0" stopColor={hi} />
            <stop offset="0.55" stopColor={mid} />
            <stop offset="1" stopColor={deep} />
          </radialGradient>
          <radialGradient id={g("glow")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd98a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={g("gold")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff6dc" />
            <stop offset="0.35" stopColor="#f2cd7e" />
            <stop offset="0.7" stopColor="#c48a34" />
            <stop offset="1" stopColor="#8a5a1c" />
          </linearGradient>
          <linearGradient id={g("sheen")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={g("paper")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffaf0" />
            <stop offset="1" stopColor="#efe0bf" />
          </linearGradient>
          <linearGradient id={g("shade")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.55" stopColor={deep} stopOpacity="0" />
            <stop offset="1" stopColor={deep} stopOpacity="0.7" />
          </linearGradient>
          <clipPath id={g("clip")}>
            <circle cx="24" cy="24" r="21.2" />
          </clipPath>
        </defs>

        {/* Bezel */}
        <circle cx="24" cy="24" r="23.4" fill="#000" opacity="0.35" transform="translate(0 0.8)" />
        <circle cx="24" cy="24" r="23.2" fill={u("bezel")} />
        <circle cx="24" cy="24" r="21.9" fill="none" stroke="#4a2c0a" strokeOpacity="0.6" strokeWidth="0.6" />

        {/* Gem */}
        <g clipPath={u("clip")}>
          <circle cx="24" cy="24" r="21.2" fill={u("gem")} />
          {/* Lotus watermark */}
          <g fill="none" stroke="#fff" strokeOpacity="0.09" strokeWidth="0.7">
            {lotus.map((a) => (
              <path key={a} d="M24 24 C20.6 18.4 21 11.6 24 7.2 C27 11.6 27.4 18.4 24 24 Z" transform={`rotate(${a + 22.5} 24 24)`} />
            ))}
            <circle cx="24" cy="24" r="18.4" strokeDasharray="0.6 2.1526" strokeOpacity="0.22" />
          </g>
          {kind !== "friends" ? <circle cx="24" cy="24" r="14" fill={u("glow")} /> : null}
          {/* Inner shade at the bottom */}
          <circle cx="24" cy="24" r="21.2" fill={u("shade")} />
        </g>

        {kind === "ranking" ? <Trophy gold={u("gold")} deep={deep} /> : null}
        {kind === "tasks" ? <Ledger gold={u("gold")} paper={u("paper")} deep={deep} /> : null}

        {/* Glass sheen */}
        <path d="M6.4 21 C7.6 11.8 15 5 24 5 C33 5 40.4 11.8 41.6 21 C36 16.6 30.4 15 24 15 C17.6 15 12 16.6 6.4 21 Z" fill={u("sheen")} />
      </svg>
      {children ? <span className="absolute inset-0 grid place-items-center">{children}</span> : null}
    </span>
  );
}

function Trophy({ gold, deep }: { gold: string; deep: string }) {
  return (
    <g style={{ filter: `drop-shadow(0 1.2px 1px ${deep})` }}>
      {/* Handles */}
      <path d="M16.6 14.6 H13.4 C12.6 14.6 12.2 15.2 12.3 16 C12.8 19.8 15 22.2 18 22.8" fill="none" stroke={gold} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M31.4 14.6 H34.6 C35.4 14.6 35.8 15.2 35.7 16 C35.2 19.8 33 22.2 30 22.8" fill="none" stroke={gold} strokeWidth="1.9" strokeLinecap="round" />
      {/* Cup */}
      <path d="M16 12.4 H32 V16.2 C32 21.6 28.6 25.4 24 25.4 C19.4 25.4 16 21.6 16 16.2 Z" fill={gold} />
      <path d="M17.6 13.6 V16.4 C17.6 19.6 19 22.2 21.4 23.4 C19.6 21.6 19 19.2 19 16.4 V13.6 Z" fill="#fff" opacity="0.45" />
      {/* Star */}
      <path d="M24 15.2 L25.1 17.5 L27.6 17.8 L25.8 19.5 L26.2 22 L24 20.8 L21.8 22 L22.2 19.5 L20.4 17.8 L22.9 17.5 Z" fill={deep} opacity="0.55" />
      {/* Stem, collar and plinth */}
      <path d="M22.6 25.2 H25.4 L25 29 H23 Z" fill={gold} />
      <rect x="20.4" y="28.6" width="7.2" height="1.8" rx="0.9" fill={gold} />
      <path d="M18.4 31 H29.6 L30.6 35.4 H17.4 Z" fill={gold} />
      <rect x="21" y="32.4" width="6" height="1.6" rx="0.5" fill={deep} opacity="0.45" />
    </g>
  );
}

function Ledger({ gold, paper, deep }: { gold: string; paper: string; deep: string }) {
  return (
    <g style={{ filter: `drop-shadow(0 1.2px 1px ${deep})` }}>
      {/* Board */}
      <rect x="15" y="12" width="18" height="24" rx="2.6" fill={gold} />
      <rect x="16.6" y="14.4" width="14.8" height="20" rx="1.4" fill={paper} />
      {/* Clip */}
      <path d="M20 10.6 C20 9.6 20.8 9 21.8 9 H26.2 C27.2 9 28 9.6 28 10.6 V13.8 C28 14.4 27.6 14.8 27 14.8 H21 C20.4 14.8 20 14.4 20 13.8 Z" fill={gold} />
      <circle cx="24" cy="11.4" r="1" fill={deep} opacity="0.55" />
      {/* Rows */}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M18.8 19.2 L20 20.4 L22.2 18" stroke="#2f9e6a" strokeWidth="1.4" />
        <path d="M18.8 24.4 L20 25.6 L22.2 23.2" stroke="#2f9e6a" strokeWidth="1.4" />
        <circle cx="20.4" cy="29.8" r="1.25" stroke={deep} strokeOpacity="0.45" strokeWidth="0.9" />
        <path d="M24 19.2 H29.4 M24 24.4 H29.4 M24 29.8 H27.6" stroke={deep} strokeOpacity="0.38" strokeWidth="1.2" />
      </g>
    </g>
  );
}
