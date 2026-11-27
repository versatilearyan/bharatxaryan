/**
 * Sticker-style art for Duo Dash, drawn like the game's own two characters:
 * the boy (spiky hair, orange hoodie, teal headphones round the neck) and the girl (bangs, high ponytail with a pink
 * tie, a yellow star clip, blush, blue jacket), cheek to cheek under a big heart with a "DUO!" bubble.
 */

const OUT = "#1a0b2e";
const SKIN = "#f2b48a";

function Boy({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={OUT} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      {/* hoodie */}
      <path d="M-30 78 Q-31 30 0 28 Q31 30 30 78 Z" fill="#ff7a2f" />
      <path d="M-14 30 Q0 44 14 30" fill="#e8601c" />
      <path d="M-6 38 L-7 54 M6 38 L7 54" stroke="#fff4e6" strokeWidth="2.4" />
      <rect x="-13" y="58" width="26" height="12" rx="4" fill="#e8601c" />
      {/* headphones round the neck */}
      <path d="M-20 24 Q0 36 20 24" fill="none" stroke="#1fd1c1" strokeWidth="5" />
      <circle cx="-21" cy="24" r="6" fill="#1b1b24" />
      <circle cx="21" cy="24" r="6" fill="#1b1b24" />
      {/* head */}
      <circle cx="0" cy="0" r="24" fill={SKIN} />
      <ellipse cx="-24" cy="2" rx="4" ry="6" fill={SKIN} />
      <ellipse cx="24" cy="2" rx="4" ry="6" fill={SKIN} />
      {/* spiky hair */}
      <path d="M-25 -2 Q-28 -22 -16 -30 L-18 -40 L-8 -32 L-4 -44 L4 -33 L12 -42 L13 -30 L24 -34 L20 -22 Q28 -14 25 -2 Q12 -14 -4 -12 Q-16 -10 -25 -2 Z" fill="#24160f" />
      {/* face */}
      <ellipse cx="-9" cy="3" rx="4" ry="5.2" fill={OUT} stroke="none" />
      <ellipse cx="9" cy="3" rx="4" ry="5.2" fill={OUT} stroke="none" />
      <circle cx="-7.6" cy="1.2" r="1.5" fill="#fff" stroke="none" />
      <circle cx="10.4" cy="1.2" r="1.5" fill="#fff" stroke="none" />
      <path d="M-13 -6 L-5 -7.5 M13 -6 L5 -7.5" strokeWidth="2.4" />
      <path d="M-7 13 Q1 20 8 12" fill="#c43a3a" strokeWidth="2.6" />
    </g>
  );
}

function Girl({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={OUT} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      {/* high ponytail behind */}
      <path d="M14 -30 Q42 -34 40 -6 Q38 14 28 26 Q34 4 22 -18 Z" fill="#2b1830" />
      {/* jacket over a white top */}
      <path d="M-30 78 Q-31 30 0 28 Q31 30 30 78 Z" fill="#3da5ff" />
      <path d="M-8 30 L-6 78 H6 L8 30 Z" fill="#fff4ea" />
      <path d="M-8 30 L-10 78 M8 30 L10 78" stroke="#1f7fd6" strokeWidth="3" />
      {/* head */}
      <circle cx="0" cy="0" r="24" fill={SKIN} />
      {/* hair: cap, side locks and bangs */}
      <path d="M-26 6 Q-30 -30 0 -30 Q30 -30 26 6 Q24 -8 16 -12 Q8 -6 0 -12 Q-8 -6 -16 -12 Q-24 -8 -26 6 Z" fill="#2b1830" />
      <path d="M-25 0 Q-30 18 -22 26 L-18 8 Z" fill="#2b1830" />
      <path d="M25 0 Q30 18 22 26 L18 8 Z" fill="#2b1830" />
      <circle cx="16" cy="-30" r="5" fill="#ff5fa2" />
      {/* star clip */}
      <path d="M-17 -18 l2.2 4.4 4.8 0.7 -3.5 3.4 0.8 4.8 -4.3 -2.3 -4.3 2.3 0.8 -4.8 -3.5 -3.4 4.8 -0.7 Z" fill="#ffd34d" strokeWidth="1.8" />
      {/* face */}
      <ellipse cx="-9" cy="4" rx="4.2" ry="5.4" fill={OUT} stroke="none" />
      <ellipse cx="9" cy="4" rx="4.2" ry="5.4" fill={OUT} stroke="none" />
      <circle cx="-7.4" cy="2" r="1.6" fill="#fff" stroke="none" />
      <circle cx="10.6" cy="2" r="1.6" fill="#fff" stroke="none" />
      <path d="M-14 -1 l-3 -2 M14 -1 l3 -2" strokeWidth="2" />
      <ellipse cx="-15" cy="11" rx="4.5" ry="2.6" fill="#ff8fa3" stroke="none" opacity=".9" />
      <ellipse cx="15" cy="11" rx="4.5" ry="2.6" fill="#ff8fa3" stroke="none" opacity=".9" />
      <path d="M-6 13 Q0 18 6 13" fill="none" strokeWidth="2.6" />
    </g>
  );
}

function Heart({ x, y, s = 1, c = "#ff3d8b" }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 8 C-14 -2 -12 -14 -4 -14 C-1 -14 0 -11 0 -10 C0 -11 1 -14 4 -14 C12 -14 14 -2 0 8 Z"
      fill={c}
      stroke={OUT}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  );
}

function Bubble({ x, y, r = 1 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(8) scale(${r})`} stroke={OUT} strokeWidth="3" strokeLinejoin="round">
      <path d="M-30 -16 Q-30 -28 -18 -28 H18 Q30 -28 30 -16 V4 Q30 16 18 16 H8 L14 30 L-2 16 H-18 Q-30 16 -30 4 Z" fill="#c6ff3d" />
      <text x="0" y="4" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="18" fill={OUT} stroke="none">
        DUO!
      </text>
    </g>
  );
}

function Sparkle({ x, y, s = 1, c = "#fff" }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4 Z" fill={c} stroke={OUT} strokeWidth="1.6" strokeLinejoin="round" />;
}

function Background({ id, w, h }: { id: string; w: number; h: number }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7b2cff" />
          <stop offset="0.55" stopColor="#ff3d8b" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
        <pattern id={`${id}-dots`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#fff" opacity=".18" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}-bg)`} />
      <rect width={w} height={h} fill={`url(#${id}-dots)`} />
    </>
  );
}

/** The square game tile (drawn inside GameArt's 120 x 120 svg). */
export function DuoTileArt() {
  return (
    <>
      <Background id="dt" w={120} h={120} />
      <rect x="0" y="100" width="120" height="20" fill="#2a1450" />
      <Heart x={60} y={40} s={1.9} />
      <Boy x={38} y={70} s={0.72} />
      <Girl x={84} y={72} s={0.72} />
      <Bubble x={92} y={20} r={0.55} />
      <Sparkle x={14} y={24} s={0.8} c="#fff35c" />
      <Sparkle x={108} y={58} s={0.6} c="#c6ff3d" />
      <Heart x={18} y={50} s={0.55} c="#ffd34d" />
    </>
  );
}

/** A wide banner (for a hero card). */
export function DuoHeroArt() {
  return (
    <svg viewBox="0 0 320 164" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden>
      <Background id="dh" w={320} h={164} />
      <rect x="0" y="136" width="320" height="28" fill="#2a1450" />
      <Heart x={160} y={52} s={3} />
      <Boy x={124} y={92} />
      <Girl x={196} y={96} />
      <Bubble x={262} y={34} r={0.9} />
      <Sparkle x={34} y={30} s={1.1} c="#fff35c" />
      <Sparkle x={296} y={92} s={0.9} c="#c6ff3d" />
      <Heart x={60} y={70} s={0.9} c="#ffd34d" />
      <Heart x={270} y={120} s={0.7} />
    </svg>
  );
}
