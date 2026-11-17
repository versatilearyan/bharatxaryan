/**
 * Sticker-style covers (thick outlines, neon colours, a shouting bubble) for Chess, Ludo, Jackaroo and Raja Mantri Chor Sipahi,
 * in the same style as Gaon ka Gaddaar. The tile ones are drawn inside a 120x120 square, the hero one is a wide banner.
 */
const OUT = "#1a0b2e";

function Bg({ id, a, b, c }: { id: string; a: string; b: string; c: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.6" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <pattern id={`${id}-dots`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#fff" opacity=".18" />
        </pattern>
      </defs>
      <rect width="120" height="120" fill={`url(#${id}-bg)`} />
      <rect width="120" height="120" fill={`url(#${id}-dots)`} />
    </>
  );
}

function Shout({ x, y, text, fill = "#fff35c", s = 1 }: { x: number; y: number; text: string; fill?: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-9) scale(${s})`} stroke={OUT} strokeWidth="2.6" strokeLinejoin="round">
      <path d="M-24 -11 Q-24 -19 -16 -19 H16 Q24 -19 24 -11 V4 Q24 12 16 12 H3 L-6 22 L-5 12 H-16 Q-24 12 -24 4 Z" fill={fill} />
      <text x="0" y="1" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="11.5" fill={OUT} stroke="none">
        {text}
      </text>
    </g>
  );
}

function Spark({ x, y, s = 1, c = "#fff" }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill={c} stroke={OUT} strokeWidth="1.4" strokeLinejoin="round" />;
}

export function ChessTileArt() {
  return (
    <>
      <Bg id="cx" a="#1f6bff" b="#7c4dff" c="#ff3d8b" />
      {/* board floor */}
      <g opacity=".35">
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={i} x={(i % 3) * 40 + (i > 2 ? 20 : 0) - 20} y={92 + (i > 2 ? 14 : 0)} width="40" height="14" fill={i % 2 ? "#fff" : "#1a0b2e"} />
        ))}
      </g>
      <g stroke={OUT} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
        {/* king */}
        <path d="M38 96 H82 L78 84 H42 Z" fill="#ffd86b" />
        <path d="M44 84 Q44 58 52 50 H68 Q76 58 76 84 Z" fill="#fff6e2" />
        <path d="M44 66 H76" fill="none" stroke="#e7a23c" />
        <rect x="46" y="44" width="28" height="9" rx="4" fill="#ffd86b" />
        <path d="M60 44 V28 M53 35 H67" fill="none" strokeWidth="5" stroke={OUT} />
        <path d="M60 44 V28 M53 35 H67" fill="none" strokeWidth="2" stroke="#ffd86b" />
        {/* pawn */}
        <circle cx="96" cy="76" r="7" fill="#ff7ab8" />
        <path d="M89 98 Q90 84 96 82 Q102 84 103 98 Z" fill="#ff7ab8" />
        <ellipse cx="96" cy="99" rx="10" ry="3.5" fill="#ff7ab8" />
      </g>
      <Shout x={82} y={22} text="CHECK!" s={0.95} />
      <Spark x={14} y={22} s={1.1} c="#7df9c8" />
      <Spark x={24} y={50} s={0.7} />
    </>
  );
}

export function LudoTileArt() {
  return (
    <>
      <Bg id="ld" a="#00c2a8" b="#3d7bff" c="#7c4dff" />
      <g stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        {/* board */}
        <rect x="14" y="30" width="62" height="62" rx="9" fill="#fff6e6" />
        <rect x="20" y="36" width="22" height="22" rx="5" fill="#ff4d6d" />
        <rect x="48" y="36" width="22" height="22" rx="5" fill="#2ee59d" />
        <rect x="20" y="64" width="22" height="22" rx="5" fill="#ffd23f" />
        <rect x="48" y="64" width="22" height="22" rx="5" fill="#4cc9f0" />
        <circle cx="31" cy="47" r="5" fill="#fff" />
        <circle cx="59" cy="47" r="5" fill="#fff" />
        <circle cx="31" cy="75" r="5" fill="#fff" />
        <circle cx="59" cy="75" r="5" fill="#fff" />
        {/* dice */}
        <g transform="rotate(14 90 86)">
          <rect x="72" y="68" width="36" height="36" rx="8" fill="#fff" />
          {[[81, 77], [99, 77], [90, 86], [81, 95], [99, 95]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="3.4" fill={OUT} stroke="none" />
          ))}
        </g>
        {/* a pawn */}
        <circle cx="38" cy="22" r="6" fill="#ff4d6d" />
        <path d="M31 40 Q32 28 38 26 Q44 28 45 40 Z" fill="#ff4d6d" />
      </g>
      <Shout x={88} y={30} text="SIX!" fill="#7df9c8" s={1.05} />
      <Spark x={104} y={56} s={0.9} c="#fff35c" />
      <Spark x={10} y={14} s={0.8} />
    </>
  );
}

export function JackarooTileArt() {
  return (
    <>
      <Bg id="jk" a="#ff7a1a" b="#ff3d8b" c="#7c4dff" />
      <circle cx="60" cy="64" r="46" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2.4" strokeDasharray="3 6" />
      {[[60, 16, "#ffe14a"], [106, 64, "#2ee59d"], [60, 112, "#4cc9f0"], [14, 64, "#ff4d6d"]].map(([x, y, c]) => (
        <circle key={String(c)} cx={Number(x)} cy={Number(y)} r="7.5" fill={String(c)} stroke={OUT} strokeWidth="3" />
      ))}
      <g stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        {[-22, 0, 22].map((r, i) => (
          <g key={r} transform={`rotate(${r} 60 96)`}>
            <rect x="44" y="38" width="32" height="46" rx="6" fill="#fff9ec" />
            <text x="49" y="55" fontFamily="sans-serif" fontWeight="900" fontSize="14" fill={i === 1 ? OUT : "#e5173f"} stroke="none">
              {["A", "J", "K"][i]}
            </text>
            <text x="60" y="76" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fill={i === 1 ? OUT : "#e5173f"} stroke="none">
              {["♥", "♠", "♦"][i]}
            </text>
          </g>
        ))}
      </g>
      <Shout x={92} y={22} text="JACK!" fill="#7df9c8" />
      <Spark x={14} y={20} s={1} c="#fff35c" />
    </>
  );
}

function Face({ x, y, hat, mood }: { x: number; y: number; hat: "crown" | "mask" | "cap" | "none"; mood: "smug" | "sly" | "worry" | "proud" }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={OUT} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M-17 40 Q-17 16 0 16 Q17 16 17 40 Z" fill={hat === "crown" ? "#ffc83d" : hat === "mask" ? "#2d2d3a" : "#4da3ff"} />
      <circle cx="0" cy="0" r="15" fill="#ffd2a8" />
      {hat === "crown" ? (
        <path d="M-12 -10 L-14 -26 L-6 -18 L0 -28 L6 -18 L14 -26 L12 -10 Z" fill="#ffd24a" />
      ) : hat === "cap" ? (
        <path d="M-15 -6 Q-14 -24 0 -24 Q14 -24 15 -6 Z" fill="#2f9bff" />
      ) : null}
      {hat === "mask" ? (
        <>
          <rect x="-15" y="-6" width="30" height="9" rx="4" fill="#111" />
          <circle cx="-6" cy="-2" r="2" fill="#fff" stroke="none" />
          <circle cx="6" cy="-2" r="2" fill="#fff" stroke="none" />
        </>
      ) : (
        <>
          <circle cx="-5.5" cy="0" r="2.6" fill="#fff" strokeWidth="1.6" />
          <circle cx="5.5" cy="0" r="2.6" fill="#fff" strokeWidth="1.6" />
          <circle cx="-5.5" cy="0.6" r="1.1" fill={OUT} stroke="none" />
          <circle cx="5.5" cy="0.6" r="1.1" fill={OUT} stroke="none" />
        </>
      )}
      <path d={mood === "worry" ? "M-5 10 Q0 6 5 10" : mood === "sly" ? "M-6 8 Q2 14 8 6" : "M-6 7 Q0 14 6 7"} fill="none" />
    </g>
  );
}

export function RmcsTileArt() {
  return (
    <>
      <Bg id="rm" a="#7c4dff" b="#ff3d8b" c="#ffb347" />
      {/* a round table, seen from the side, with cards on it */}
      <ellipse cx="60" cy="86" rx="54" ry="22" fill="#8a4b1f" stroke={OUT} strokeWidth="3" />
      <ellipse cx="60" cy="84" rx="46" ry="17" fill="#0e9a5a" stroke={OUT} strokeWidth="3" />
      <g stroke={OUT} strokeWidth="2.4" strokeLinejoin="round">
        <g transform="rotate(-12 44 84)">
          <rect x="34" y="70" width="20" height="26" rx="4" fill="#fff9ec" />
          <text x="44" y="88" textAnchor="middle" fontSize="14" stroke="none">👑</text>
        </g>
        <g transform="rotate(8 62 86)">
          <rect x="52" y="72" width="20" height="26" rx="4" fill="#fff9ec" />
          <text x="62" y="90" textAnchor="middle" fontSize="14" stroke="none">🧠</text>
        </g>
        <g transform="rotate(18 80 84)">
          <rect x="70" y="70" width="20" height="26" rx="4" fill="#ff3d8b" />
          <text x="80" y="88" textAnchor="middle" fontSize="14" stroke="none">?</text>
        </g>
      </g>
      {/* the players sitting round it */}
      <Face x={26} y={52} hat="cap" mood="worry" />
      <Face x={60} y={44} hat="crown" mood="proud" />
      <Face x={96} y={52} hat="mask" mood="sly" />
      <Shout x={84} y={16} text="CHOR?!" s={0.9} />
      <Spark x={12} y={16} s={1} c="#fff35c" />
      <Spark x={110} y={100} s={0.7} c="#7df9c8" />
    </>
  );
}

/** The wide banner for Raja Mantri Chor Sipahi. */
export function RmcsHeroArt() {
  return (
    <svg viewBox="0 0 320 164" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="rmh-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c4dff" />
          <stop offset="0.55" stopColor="#ff3d8b" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
        <pattern id="rmh-dots" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.4" fill="#fff" opacity=".16" />
        </pattern>
      </defs>
      <rect width="320" height="164" fill="url(#rmh-bg)" />
      <rect width="320" height="164" fill="url(#rmh-dots)" />
      {/* the round table */}
      <ellipse cx="206" cy="128" rx="118" ry="30" fill="#0e8a52" stroke={OUT} strokeWidth="4" />
      <ellipse cx="206" cy="128" rx="118" ry="30" fill="none" stroke="#8a4b1f" strokeWidth="9" opacity=".8" />
      <g transform="translate(150 6) scale(1.5)">
        <Face x={20} y={46} hat="crown" mood="proud" />
      </g>
      <g transform="translate(206 8) scale(1.4)">
        <Face x={26} y={48} hat="mask" mood="sly" />
      </g>
      <g transform="translate(262 10) scale(1.3)">
        <Face x={10} y={50} hat="cap" mood="worry" />
      </g>
      {[[150, 112, "👑"], [200, 118, "🦹"], [250, 114, "🛡️"]].map(([x, y, e], i) => (
        <g key={String(e)} transform={`rotate(${[-10, 4, 12][i]} ${x} ${y})`} stroke={OUT} strokeWidth="2.6">
          <rect x={Number(x) - 14} y={Number(y) - 20} width="28" height="38" rx="5" fill="#fff9ec" />
          <text x={x} y={Number(y) + 4} textAnchor="middle" fontSize="18" stroke="none">{e}</text>
        </g>
      ))}
      <g transform="translate(70 40) scale(1.7)">
        <Shout x={0} y={0} text="CHOR?!" />
      </g>
      <Spark x={20} y={20} s={1.4} c="#fff35c" />
      <Spark x={300} y={30} s={1} c="#7df9c8" />
      <Spark x={120} y={150} s={0.9} />
    </svg>
  );
}

export function HillTileArt() {
  return (
    <>
      <Bg id="hl" a="#ff8a3d" b="#ff3d8b" c="#7c4dff" />
      <circle cx="92" cy="30" r="14" fill="#fff6c8" stroke={OUT} strokeWidth="3" />
      {/* the hills */}
      <path d="M0 96 Q24 60 52 74 T120 40 V120 H0 Z" fill="#2a8a4a" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M0 108 Q30 84 60 94 T120 70 V120 H0 Z" fill="#8a5a2b" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
      {/* coins on the road */}
      {[[40, 56, "10"], [66, 52, "5"], [92, 36, "10"]].map(([x, y, v]) => (
        <g key={String(x)}>
          <circle cx={Number(x)} cy={Number(y)} r="8" fill="#ffd24a" stroke={OUT} strokeWidth="2.4" />
          <text x={Number(x)} y={Number(y) + 3.5} textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="8" fill="#6a3d00" stroke="none">{v}</text>
        </g>
      ))}
      {/* the jeep, tilted up the hill */}
      <g transform="translate(34 70) rotate(-22)" stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        <rect x="-22" y="-8" width="44" height="14" rx="5" fill="#ff8a3d" />
        <circle cx="-6" cy="-14" r="6" fill="#f2c9a0" />
        <path d="M-12 -17 Q-6 -26 0 -17 Z" fill="#c2417a" />
        <circle cx="-14" cy="9" r="7" fill="#241621" />
        <circle cx="14" cy="9" r="7" fill="#241621" />
      </g>
      <Shout x={88} y={16} text="CLIMB!" s={0.9} />
      <Spark x={12} y={16} s={1} c="#fff35c" />
    </>
  );
}
