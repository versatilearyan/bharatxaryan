import type { Game } from "@/lib/mock-data";

/** Small hand-drawn glyphs for each casual game (original artwork, no third-party IP). */
export function GameGlyph({ glyph, hue }: { glyph: Game["glyph"]; hue: string }) {
  switch (glyph) {
    case "dice":
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
          <rect x="6" y="10" width="26" height="26" rx="6" fill={hue} transform="rotate(-12 19 23)" />
          <rect x="20" y="16" width="22" height="22" rx="5" fill="#fff1d5" transform="rotate(10 31 27)" />
          {[[13, 18], [19, 24], [25, 30]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.2" fill="#fff1d5" transform="rotate(-12 19 23)" />)}
          {[[26, 22], [36, 22], [26, 32], [36, 32]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.9" fill="#101014" transform="rotate(10 31 27)" />)}
        </svg>
      );
    case "carrom":
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
          <rect x="5" y="5" width="38" height="38" rx="5" fill="#3a2a1c" stroke={hue} strokeWidth="2.5" />
          {[[9, 9], [39, 9], [9, 39], [39, 39]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill="#101014" />)}
          <circle cx="24" cy="24" r="7" fill="none" stroke={hue} strokeOpacity="0.6" />
          <circle cx="21" cy="22" r="3" fill="#fff1d5" />
          <circle cx="27" cy="23" r="3" fill="#2a2228" stroke="#fff1d5" strokeOpacity="0.4" />
          <circle cx="24" cy="27.5" r="3" fill="#f4515b" />
        </svg>
      );
    case "draw":
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
          <rect x="6" y="8" width="36" height="30" rx="5" fill="#fff1d5" />
          <path d="M11 30 C15 18 20 30 24 21 C27 15 31 27 37 17" stroke={hue} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M33 34 L42 25 L45 28 L36 37 L32 38 Z" fill="#e7bc72" stroke="#101014" strokeWidth="1" />
        </svg>
      );
    case "music":
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
          <circle cx="24" cy="24" r="17" fill={hue} opacity="0.25" />
          <path d="M20 31 V14 L34 11 V28" stroke="#fff1d5" strokeWidth="2.6" fill="none" strokeLinejoin="round" />
          <ellipse cx="17" cy="31" rx="4.5" ry="3.6" fill="#fff1d5" />
          <ellipse cx="31" cy="28" rx="4.5" ry="3.6" fill="#fff1d5" />
        </svg>
      );
    case "cards":
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
          <rect x="8" y="12" width="20" height="28" rx="3" fill="#fff1d5" transform="rotate(-14 18 26)" />
          <rect x="18" y="9" width="20" height="28" rx="3" fill="#fff1d5" stroke={hue} strokeWidth="1.5" transform="rotate(10 28 23)" />
          <path d="M28 19 l3 4 l-3 4 l-3 -4 Z" fill="#f4515b" transform="rotate(10 28 23)" />
        </svg>
      );
    case "spin":
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
          <circle cx="24" cy="24" r="17" fill="none" stroke={hue} strokeOpacity="0.5" strokeDasharray="3 4" />
          <g transform="rotate(-35 24 24)">
            <rect x="21" y="9" width="6" height="8" rx="2" fill={hue} />
            <path d="M20 17 h8 c3 3 4 6 4 10 v8 a4 4 0 0 1 -4 4 h-8 a4 4 0 0 1 -4 -4 v-8 c0 -4 1 -7 4 -10 Z" fill={hue} opacity="0.85" />
          </g>
        </svg>
      );
  }
}

export function GameTile({ game, compact = false }: { game: Game; compact?: boolean }) {
  return (
    <div className="group/tile flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface-2/70 p-2.5 transition-colors hover:border-line-strong">
      <div
        className={`grid shrink-0 place-items-center rounded-xl ${compact ? "h-9 w-9 p-1" : "h-12 w-12 p-1.5"}`}
        style={{ background: `color-mix(in oklab, ${game.hue} 16%, #19191f)` }}
      >
        <GameGlyph glyph={game.glyph} hue={game.hue} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-cream">{game.name}</p>
        {!compact ? <p className="truncate text-xs text-muted">{game.players}</p> : null}
      </div>
    </div>
  );
}
