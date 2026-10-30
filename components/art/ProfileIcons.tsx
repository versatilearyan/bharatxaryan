import { useId } from "react";

/**
 * Village-style icons for the profile shortcuts, drawn in the same warm dusk
 * palette as the Parivar chaupal art. Each is a 48×48 object with no backdrop.
 */
type Props = { size?: number };

/** Visitors: a carved jharokha window with someone peeking through. */
export function VisitorsIcon({ size = 36 }: Props) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id={`wood-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9783f" />
          <stop offset="1" stopColor="#8e3a24" />
        </linearGradient>
        <radialGradient id={`lamp-${id}`} cx="0.5" cy="0.75" r="0.75">
          <stop offset="0" stopColor="#ffd98a" />
          <stop offset="1" stopColor="#c9533f" />
        </radialGradient>
      </defs>
      {/* Dome and frame */}
      <path d="M24 3 C30 3 35 7 36 12 H12 C13 7 18 3 24 3 Z" fill="#e7bc72" />
      <circle cx="24" cy="3.2" r="1.6" fill="#ffd27a" />
      <rect x="9" y="12" width="30" height="3" rx="1.2" fill="#b5652f" />
      <path d="M11 15 H37 V40 H11 Z" fill={`url(#wood-${id})`} />
      {/* Arched opening, lit from inside */}
      <path d="M15 40 V25 C15 19.5 19 16.5 24 16.5 C29 16.5 33 19.5 33 25 V40 Z" fill={`url(#lamp-${id})`} />
      {/* Peeking face */}
      <path d="M17.5 40 V31 C17.5 26.5 20.5 24 24 24 C27.5 24 30.5 26.5 30.5 31 V40 Z" fill="#a85a3a" />
      <path d="M17.5 30 C18 25.6 20.6 23.6 24 23.6 C27.4 23.6 30 25.6 30.5 30 C28 28.4 20 28.4 17.5 30 Z" fill="#2b1414" />
      <ellipse cx="21.2" cy="32.2" rx="2.1" ry="2.4" fill="#fff8ec" />
      <ellipse cx="26.8" cy="32.2" rx="2.1" ry="2.4" fill="#fff8ec" />
      <circle cx="22" cy="32.6" r="1.1" fill="#2b1414" />
      <circle cx="27.6" cy="32.6" r="1.1" fill="#2b1414" />
      <circle cx="24" cy="29.4" r="0.8" fill="#e2242f" />
      {/* Sill and lattice */}
      <rect x="8" y="40" width="32" height="4" rx="1.5" fill="#e7bc72" />
      <path d="M11 44 L13 47 H35 L37 44 Z" fill="#b5652f" />
      <path d="M12.5 18 V38 M35.5 18 V38" stroke="#ffd27a" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="1.5 2" />
    </svg>
  );
}

/** Shop: a haat stall with a striped awning and marigold garlands. */
export function ShopIcon({ size = 36 }: Props) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id={`stall-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9773f" />
          <stop offset="1" stopColor="#7a3220" />
        </linearGradient>
      </defs>
      {/* Poles */}
      <rect x="8" y="14" width="2.6" height="30" rx="1" fill="#7a3220" />
      <rect x="37.4" y="14" width="2.6" height="30" rx="1" fill="#7a3220" />
      {/* Awning: saffron and cream stripes with scalloped edge */}
      <path d="M5 15 L10 5 H38 L43 15 Z" fill="#fff1c9" />
      {[0, 2, 4, 6].map((k) => (
        <path key={k} d={`M${10 + k * 4} 5 H${14 + k * 4} L${5 + (k + 1) * (38 / 7)} 15 H${5 + k * (38 / 7)} Z`} fill="#ff7a1a" />
      ))}
      <path d="M5 15 Q7.7 19 10.4 15 Q13.1 19 15.8 15 Q18.5 19 21.2 15 Q23.9 19 26.6 15 Q29.3 19 32 15 Q34.7 19 37.4 15 Q40.1 19 43 15 Z" fill="#e2242f" />
      {/* Marigold garland */}
      <path d="M11 19 Q24 27 37 19" fill="none" stroke="#3f6b2a" strokeWidth="0.8" />
      {[13.5, 17.5, 21.5, 26.5, 30.5, 34.5].map((x, i) => (
        <circle key={x} cx={x} cy={19 + Math.sin(((x - 11) / 26) * Math.PI) * 3.9} r="1.7" fill={i % 2 ? "#ffb21a" : "#ff7a1a"} />
      ))}
      {/* Counter */}
      <rect x="6" y="33" width="36" height="11" rx="2" fill={`url(#stall-${id})`} />
      <rect x="6" y="33" width="36" height="2.4" rx="1" fill="#e7bc72" />
      <path d="M10 39 H38" stroke="#ffd27a" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="2 2" />
      {/* Goods: a clay pot, a bangle stack and a gift */}
      <path d="M12.5 33 C10.5 31 11 27 14.5 26.5 H17 C20.5 27 21 31 19 33 Z" fill="#c9533f" />
      <rect x="13.2" y="25.2" width="5.2" height="1.8" rx="0.9" fill="#a8432f" />
      <ellipse cx="25" cy="31.6" rx="4.2" ry="1.5" fill="none" stroke="#ffd27a" strokeWidth="1.3" />
      <ellipse cx="25" cy="29.6" rx="4.2" ry="1.5" fill="none" stroke="#ff5a8a" strokeWidth="1.3" />
      <ellipse cx="25" cy="27.6" rx="4.2" ry="1.5" fill="none" stroke="#5ad1c0" strokeWidth="1.3" />
      <rect x="30.5" y="27" width="7" height="6" rx="1" fill="#8a3ad1" />
      <rect x="33.4" y="27" width="1.2" height="6" fill="#ffd27a" />
      <path d="M34 27 C32 24.6 30.6 25.6 32.4 27 M34 27 C36 24.6 37.4 25.6 35.6 27" fill="none" stroke="#ffd27a" strokeWidth="1" />
    </svg>
  );
}

/** Bag: an embroidered jute potli tied with a red cord, coins spilling out. */
export function BagIcon({ size = 36 }: Props) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <radialGradient id={`jute-${id}`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#f0b268" />
          <stop offset="1" stopColor="#a8562e" />
        </radialGradient>
        <radialGradient id={`coin-${id}`} cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff1c9" />
          <stop offset="0.6" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#b9822f" />
        </radialGradient>
      </defs>
      {/* Ruffled top */}
      <path d="M15 12 L12 5 L18 8 L21 3 L24 7.5 L27 3 L30 8 L36 5 L33 12 Z" fill="#c9773f" />
      {/* Body */}
      <path d="M17 13 C8 17 5 27 7.5 35 C10 43 18 45 24 45 C30 45 38 43 40.5 35 C43 27 40 17 31 13 Z" fill={`url(#jute-${id})`} />
      {/* Cord */}
      <path d="M15.5 12.5 Q24 16.5 32.5 12.5" fill="none" stroke="#e2242f" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M31 14 Q34 20 31.5 23" fill="none" stroke="#e2242f" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="31.5" cy="23.6" r="1.8" fill="#ffd27a" />
      {/* Embroidered mandala */}
      <g transform="translate(23 31)">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-5.6" rx="2" ry="3.4" fill="#e2242f" transform={`rotate(${i * 45})`} />
        ))}
        <circle r="3.6" fill="#ffd27a" />
        <circle r="1.6" fill="#3f6b2a" />
      </g>
      <path d="M10.5 38 Q24 42.5 37.5 38" fill="none" stroke="#fff1c9" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="1.6 1.8" />
      {/* Coins */}
      <circle cx="40" cy="41" r="4" fill={`url(#coin-${id})`} stroke="#9a6a22" strokeWidth="0.8" />
      <circle cx="35.5" cy="44" r="3.2" fill={`url(#coin-${id})`} stroke="#9a6a22" strokeWidth="0.8" />
    </svg>
  );
}

/** Ranking: a brass kalash trophy topped with mango leaves and a coconut, on a winner's plinth. */
export function RankingIcon({ size = 36 }: Props) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id={`brass-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b9822f" />
          <stop offset="0.35" stopColor="#fff1c9" />
          <stop offset="0.6" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#9a6a22" />
        </linearGradient>
      </defs>
      {/* Mango leaves */}
      {[-50, -22, 22, 50].map((r) => (
        <path key={r} d="M24 14 C21.5 9 22 4.5 24 1.5 C26 4.5 26.5 9 24 14 Z" fill={Math.abs(r) > 30 ? "#3f8a3a" : "#56a84a"} transform={`rotate(${r} 24 14)`} />
      ))}
      {/* Coconut */}
      <ellipse cx="24" cy="10.5" rx="4.6" ry="5" fill="#8e5a2a" />
      <path d="M21 8 Q24 5.5 27 8" fill="none" stroke="#c9946a" strokeWidth="1" />
      {/* Kalash */}
      <rect x="18.5" y="13.5" width="11" height="3" rx="1.2" fill={`url(#brass-${id})`} />
      <path d="M20 16.5 C11 19 10 31 18 35 H30 C38 31 37 19 28 16.5 Z" fill={`url(#brass-${id})`} />
      {/* Handles */}
      <path d="M13.5 21 C8.5 20.5 8 27.5 13.6 28" fill="none" stroke="#c9953f" strokeWidth="2" strokeLinecap="round" />
      <path d="M34.5 21 C39.5 20.5 40 27.5 34.4 28" fill="none" stroke="#c9953f" strokeWidth="2" strokeLinecap="round" />
      {/* Red thread band and star */}
      <path d="M13 23.5 Q24 27 35 23.5" fill="none" stroke="#e2242f" strokeWidth="1.8" />
      <path d="M24 26.2 L25.3 29 L28.2 29.2 L26 31 L26.7 33.8 L24 32.3 L21.3 33.8 L22 31 L19.8 29.2 L22.7 29 Z" fill="#e2242f" />
      {/* Stem and plinth */}
      <path d="M21 35 H27 L28.5 39 H19.5 Z" fill="#c9953f" />
      <rect x="13" y="39" width="22" height="7" rx="1.8" fill="#7a3220" />
      <rect x="13" y="39" width="22" height="2" rx="1" fill="#e7bc72" />
      <text x="24" y="45.3" textAnchor="middle" fontSize="4.6" fontWeight="800" fill="#ffd27a" fontFamily="system-ui, sans-serif">
        No.1
      </text>
    </svg>
  );
}
