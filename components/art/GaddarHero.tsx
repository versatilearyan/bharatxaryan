/**
 * Sticker-style art for Gaon ka Gaddaar: thick outlines, neon colours, a "SUS?!" bubble and a pagdi-wearing villager in
 * sunglasses next to a worried one. Used for the big banner (wide) and the game tile (square).
 */

const OUT = "#1a0b2e";

function Kid({ x, y, scale = 1, turban, kurta, sly = false }: { x: number; y: number; scale?: number; turban: string; kurta: string; sly?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={OUT} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      <path d="M-30 74 Q-30 26 0 26 Q30 26 30 74 Z" fill={kurta} />
      <path d="M-2 28 L-2 74" stroke="#fff" strokeOpacity=".5" strokeWidth="3" />
      <circle cx="0" cy="0" r="24" fill="#ffd2a8" />
      {/* pagdi */}
      <path d="M-27 -6 Q-24 -40 0 -42 Q24 -40 27 -6 Q0 -18 -27 -6 Z" fill={turban} />
      <path d="M-24 -14 Q0 -26 24 -14" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="3" />
      <path d="M20 -34 q10 -2 14 8 q-10 -2 -14 -8 Z" fill={turban} />
      {sly ? (
        <>
          <rect x="-20" y="-6" width="17" height="11" rx="4" fill="#111" />
          <rect x="3" y="-6" width="17" height="11" rx="4" fill="#111" />
          <path d="M-3 -2 H3" strokeWidth="3" />
          <path d="M-14 -4 l5 0 M9 -4 l5 0" stroke="#7df9c8" strokeWidth="2" />
          <path d="M-8 12 Q4 20 13 8" fill="none" strokeWidth="3" />
        </>
      ) : (
        <>
          <circle cx="-9" cy="0" r="4.4" fill="#fff" strokeWidth="2" />
          <circle cx="9" cy="0" r="4.4" fill="#fff" strokeWidth="2" />
          <circle cx="-9" cy="1" r="1.8" fill={OUT} stroke="none" />
          <circle cx="9" cy="1" r="1.8" fill={OUT} stroke="none" />
          <path d="M-8 -9 L-3 -11 M8 -9 L3 -11" strokeWidth="2.4" />
          <path d="M-7 14 Q0 8 7 14" fill="none" strokeWidth="3" />
          <path d="M26 -2 q4 7 0 12" fill="none" stroke="#7fd4ff" strokeWidth="4" />
        </>
      )}
    </g>
  );
}

function Bubble({ x, y, r = 1 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-8) scale(${r})`} stroke={OUT} strokeWidth="3" strokeLinejoin="round">
      <path d="M-34 -18 Q-34 -30 -22 -30 H22 Q34 -30 34 -18 V6 Q34 18 22 18 H4 L-8 32 L-6 18 H-22 Q-34 18 -34 6 Z" fill="#fff35c" />
      <text x="0" y="3" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="19" fill={OUT} stroke="none">
        SUS?!
      </text>
    </g>
  );
}

function Sparkle({ x, y, s = 1, c = "#fff" }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4 Z" fill={c} stroke={OUT} strokeWidth="1.6" strokeLinejoin="round" />;
}

/** The wide banner. */
export function GaddarHeroArt() {
  return (
    <svg viewBox="0 0 320 164" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="gh-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b2bff" />
          <stop offset="0.55" stopColor="#ff3d8b" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
        <pattern id="gh-dots" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.4" fill="#fff" opacity=".16" />
        </pattern>
      </defs>
      <rect width="320" height="164" fill="url(#gh-bg)" />
      <rect width="320" height="164" fill="url(#gh-dots)" />
      <circle cx="262" cy="40" r="26" fill="#fff6c8" stroke={OUT} strokeWidth="3" />
      <circle cx="272" cy="34" r="22" fill="#ff7ab8" opacity=".35" />
      {/* village on the horizon */}
      <g stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        <rect x="196" y="98" width="62" height="40" fill="#ff8a5b" />
        <path d="M188 100 L227 70 L266 100 Z" fill="#8a2a5e" />
        <rect x="218" y="114" width="16" height="24" fill="#3a1450" />
        <rect x="270" y="108" width="40" height="30" fill="#ffd24a" />
        <path d="M264 110 L290 88 L316 110 Z" fill="#c1121f" />
        <path d="M6 138 Q6 96 36 88 Q28 70 52 66 Q64 54 86 66 Q108 64 104 92 Q114 112 96 138 Z" fill="#17c28a" />
        <rect x="46" y="108" width="9" height="32" fill="#8a5a2a" />
      </g>
      <rect x="0" y="136" width="320" height="28" fill="#2a1450" />
      <Kid x={118} y={92} turban="#ff6b3d" kurta="#2ee6c8" />
      <Kid x={186} y={104} scale={1.05} turban="#7c4dff" kurta="#ffd24a" sly />
      <Bubble x={142} y={30} />
      <Sparkle x={34} y={30} s={1.1} c="#fff35c" />
      <Sparkle x={296} y={86} s={0.9} c="#7df9c8" />
      <Sparkle x={86} y={52} s={0.7} />
      <Sparkle x={236} y={20} s={0.8} c="#ffb3d1" />
    </svg>
  );
}

/** The square game tile. */
export function GaddarTileArt() {
  return (
    <>
      <defs>
        <linearGradient id="gt-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b2bff" />
          <stop offset="0.6" stopColor="#ff3d8b" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
        <pattern id="gt-dots" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#fff" opacity=".18" />
        </pattern>
      </defs>
      <rect width="120" height="120" fill="url(#gt-bg)" />
      <rect width="120" height="120" fill="url(#gt-dots)" />
      <circle cx="96" cy="24" r="12" fill="#fff6c8" stroke={OUT} strokeWidth="2.4" />
      <rect x="0" y="100" width="120" height="20" fill="#2a1450" />
      <Kid x={42} y={66} scale={0.78} turban="#ff6b3d" kurta="#2ee6c8" />
      <Kid x={82} y={74} scale={0.82} turban="#7c4dff" kurta="#ffd24a" sly />
      <Bubble x={52} y={20} r={0.62} />
      <Sparkle x={104} y={62} s={0.8} c="#7df9c8" />
      <Sparkle x={12} y={44} s={0.7} c="#fff35c" />
    </>
  );
}
