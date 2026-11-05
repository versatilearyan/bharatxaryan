import { useId } from "react";
import type { GameId } from "@/lib/app/types";

/** Original illustrations for each game card. Square, full-bleed SVG. */
export function GameArt({ id, className = "" }: { id: GameId; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const g = (n: string) => `${n}-${uid}`;
  const u = (n: string) => `url(#${g(n)})`;

  return (
    <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" className={`block h-full w-full ${className}`} aria-hidden>
      {renderArt(id, g, u)}
    </svg>
  );
}

function renderArt(id: GameId, g: (n: string) => string, u: (n: string) => string) {
  switch (id) {
    case "chess":
      return (
        <>
          <defs>
            <radialGradient id={g("bg")} cx="0.7" cy="0.25" r="0.9">
              <stop offset="0" stopColor="#f2a65a" />
              <stop offset="0.35" stopColor="#7a3a22" />
              <stop offset="1" stopColor="#140c0a" />
            </radialGradient>
            <linearGradient id={g("pc")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff6e2" />
              <stop offset="0.6" stopColor="#e9cfa2" />
              <stop offset="1" stopColor="#9c7a52" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={u("bg")} />
          {/* Arches */}
          <g fill="#140c0a" opacity="0.55">
            <path d="M0 0 H22 V60 Q11 40 0 60 Z" />
            <path d="M98 0 H120 V60 Q109 40 98 60 Z" />
          </g>
          {/* Perspective board */}
          <path d="M-10 120 L30 78 H90 L130 120 Z" fill="#2a1a12" />
          {Array.from({ length: 4 }).map((_, row) =>
            Array.from({ length: 6 }).map((__, col) => {
              if ((row + col) % 2) return null;
              const y0 = 78 + row * 10.5;
              const y1 = y0 + 10.5;
              const w0 = 60 + row * 35;
              const w1 = w0 + 35;
              const x0 = 60 - w0 / 2 + (col * w0) / 6;
              const x1 = 60 - w1 / 2 + (col * w1) / 6;
              return <path key={`${row}${col}`} d={`M${x0} ${y0} H${x0 + w0 / 6} L${x1 + w1 / 6} ${y1} H${x1} Z`} fill="#e9cfa2" opacity="0.85" />;
            }),
          )}
          {/* King */}
          <g>
            <ellipse cx="66" cy="98" rx="17" ry="4" fill="#000" opacity="0.4" />
            <path d="M52 97 Q52 90 56 88 L60 62 Q54 60 56 54 H76 Q78 60 72 62 L76 88 Q80 90 80 97 Z" fill={u("pc")} />
            <rect x="55" y="48" width="22" height="6" rx="2" fill={u("pc")} />
            <path d="M58 48 Q66 34 74 48 Z" fill={u("pc")} />
            <path d="M64.5 26 h3 v5 h5 v3 h-5 v6 h-3 v-6 h-5 v-3 h5 Z" fill={u("pc")} />
          </g>
          {/* Pawn */}
          <g>
            <ellipse cx="36" cy="102" rx="10" ry="2.6" fill="#000" opacity="0.4" />
            <path d="M28 102 Q28 96 32 95 L34 84 Q30 82 32 79 H40 Q42 82 38 84 L40 95 Q44 96 44 102 Z" fill="#2a1d18" stroke="#e9cfa2" strokeOpacity="0.25" />
            <circle cx="36" cy="75" r="6" fill="#2a1d18" stroke="#e9cfa2" strokeOpacity="0.25" />
          </g>
        </>
      );
    case "ludo":
      return (
        <>
          <defs>
            <radialGradient id={g("bg")} cx="0.5" cy="0.4" r="0.8">
              <stop offset="0" stopColor="#3b2350" />
              <stop offset="1" stopColor="#140f1e" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={u("bg")} />
          <g transform="rotate(-10 60 56)">
            <rect x="22" y="18" width="76" height="76" rx="8" fill="#fff1d5" />
            <rect x="26" y="22" width="30" height="30" rx="5" fill="#f4515b" />
            <rect x="64" y="22" width="30" height="30" rx="5" fill="#6fe0a6" />
            <rect x="26" y="60" width="30" height="30" rx="5" fill="#8fa8ff" />
            <rect x="64" y="60" width="30" height="30" rx="5" fill="#e7bc72" />
            {[[41, 37], [79, 37], [41, 75], [79, 75]].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r="8" fill="#fff1d5" opacity="0.9" />
            ))}
            <path d="M56 52 L60 56 L64 52 Z" fill="#f4515b" />
            <path d="M64 52 L60 56 L64 60 Z" fill="#6fe0a6" />
            <path d="M56 60 L60 56 L64 60 Z" fill="#e7bc72" />
            <path d="M56 52 L60 56 L56 60 Z" fill="#8fa8ff" />
          </g>
          {/* Dice */}
          <g transform="rotate(14 88 92)">
            <rect x="74" y="78" width="28" height="28" rx="7" fill="#fff" />
            <rect x="74" y="78" width="28" height="28" rx="7" fill="none" stroke="#000" strokeOpacity="0.12" />
            {[[81, 85], [95, 85], [88, 92], [81, 99], [95, 99]].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill="#1c1b22" />
            ))}
          </g>
          {/* Token */}
          <g>
            <ellipse cx="32" cy="104" rx="9" ry="2.6" fill="#000" opacity="0.35" />
            <path d="M24 103 Q24 92 32 88 Q40 92 40 103 Z" fill="#f4515b" />
            <circle cx="32" cy="84" r="6" fill="#f4515b" />
            <circle cx="30" cy="82" r="2" fill="#fff" opacity="0.6" />
          </g>
        </>
      );
    case "micgrab":
      return (
        <>
          <defs>
            <linearGradient id={g("bg")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a2484" />
              <stop offset="1" stopColor="#170f2e" />
            </linearGradient>
            <linearGradient id={g("beam")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff1d5" stopOpacity="0.5" />
              <stop offset="1" stopColor="#fff1d5" stopOpacity="0" />
            </linearGradient>
            <radialGradient id={g("head")} cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#a9a3c2" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={u("bg")} />
          <path d="M60 -5 L22 120 H98 Z" fill={u("beam")} />
          <ellipse cx="60" cy="112" rx="34" ry="6" fill="#ff687c" opacity="0.35" />
          <path d="M52 70 L56 108 H64 L68 70 Z" fill="#1c1b22" />
          <rect x="49" y="66" width="22" height="8" rx="3" fill="#ff687c" />
          <circle cx="60" cy="48" r="20" fill={u("head")} />
          <g stroke="#6b6585" strokeWidth="0.8" opacity="0.6">
            {[-14, -7, 0, 7, 14].map((d) => (
              <line key={`v${d}`} x1={60 + d} y1="30" x2={60 + d} y2="66" />
            ))}
            {[-14, -7, 0, 7, 14].map((d) => (
              <line key={`h${d}`} x1="41" y1={48 + d} x2="79" y2={48 + d} />
            ))}
          </g>
          <g fill="#fff1d5">
            <path d="M20 40 v-14 l10 -3 v14" stroke="#fff1d5" strokeWidth="2" fill="none" />
            <circle cx="18" cy="40" r="3.4" />
            <circle cx="28" cy="37" r="3.4" />
            {[[96, 28], [100, 66], [24, 74], [88, 88]].map(([x, y], i) => (
              <path key={i} d={`M${x} ${y - 4} L${x + 1.2} ${y - 1.2} L${x + 4} ${y} L${x + 1.2} ${y + 1.2} L${x} ${y + 4} L${x - 1.2} ${y + 1.2} L${x - 4} ${y} L${x - 1.2} ${y - 1.2} Z`} opacity="0.85" />
            ))}
          </g>
        </>
      );
    case "carrom":
      return (
        <>
          <defs>
            <radialGradient id={g("bg")} cx="0.5" cy="0.5" r="0.75">
              <stop offset="0" stopColor="#f2d29a" />
              <stop offset="1" stopColor="#c99a5a" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill="#4a2a16" />
          <rect x="8" y="8" width="104" height="104" rx="4" fill={u("bg")} />
          <rect x="8" y="8" width="104" height="104" rx="4" fill="none" stroke="#2a160c" strokeWidth="3" />
          {[[16, 16], [104, 16], [16, 104], [104, 104]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="6.5" fill="#1a0f08" />
          ))}
          <circle cx="60" cy="60" r="20" fill="none" stroke="#8a2a2a" strokeWidth="1.4" />
          <circle cx="60" cy="60" r="6" fill="none" stroke="#8a2a2a" strokeWidth="1.2" />
          <g stroke="#2a160c" strokeOpacity="0.5" strokeWidth="1">
            <path d="M26 22 H94 M26 98 H94 M22 26 V94 M98 26 V94" />
          </g>
          {[
            [60, 60, "#d8283a"],
            [52, 56, "#fff6e6"],
            [68, 56, "#2a1d18"],
            [52, 66, "#2a1d18"],
            [68, 66, "#fff6e6"],
            [60, 50, "#2a1d18"],
            [60, 71, "#fff6e6"],
            [78, 40, "#fff6e6"],
            [38, 82, "#2a1d18"],
          ].map(([x, y, col], i) => (
            <g key={i}>
              <circle cx={Number(x) + 0.8} cy={Number(y) + 1.2} r="5" fill="#000" opacity="0.25" />
              <circle cx={x} cy={y} r="5" fill={String(col)} />
              <circle cx={x} cy={y} r="3" fill="none" stroke="#000" strokeOpacity="0.18" />
            </g>
          ))}
          <circle cx="60" cy="96" r="7" fill="#e7bc72" stroke="#7a4a1a" strokeWidth="1.4" />
        </>
      );
    case "pool":
      return (
        <>
          <defs>
            <radialGradient id={g("bg")} cx="0.5" cy="0.45" r="0.75">
              <stop offset="0" stopColor="#1f8a62" />
              <stop offset="1" stopColor="#0a3a2c" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill="#3a1f12" />
          <rect x="7" y="7" width="106" height="106" rx="6" fill={u("bg")} />
          {[[10, 10], [110, 10], [10, 110], [110, 110], [10, 60], [110, 60]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="5" fill="#081a14" />
          ))}
          {[
            [70, 46, "#e7bc72"],
            [78, 41, "#f4515b"],
            [78, 51, "#2f4a9a"],
            [86, 36, "#6a2a8a"],
            [86, 46, "#1c1b22"],
            [86, 56, "#ff8a3d"],
            [94, 31, "#2f8a4a"],
            [94, 41, "#8a1f2f"],
            [94, 51, "#e7bc72"],
            [94, 61, "#f4515b"],
          ].map(([x, y, col], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="4.6" fill={String(col)} />
              <circle cx={Number(x) - 1.4} cy={Number(y) - 1.4} r="1.3" fill="#fff" opacity="0.6" />
            </g>
          ))}
          <circle cx="40" cy="70" r="4.8" fill="#fff8ec" />
          <line x1="8" y1="104" x2="35" y2="74" stroke="#d9a868" strokeWidth="3.4" strokeLinecap="round" />
          <line x1="8" y1="104" x2="18" y2="93" stroke="#3a1f12" strokeWidth="3.6" strokeLinecap="round" />
          <line x1="35" y1="74" x2="36.5" y2="72.4" stroke="#8fa8ff" strokeWidth="3.4" strokeLinecap="round" />
        </>
      );
    case "draw":
      return (
        <>
          <rect width="120" height="120" fill="#1f4a52" />
          <rect x="16" y="18" width="88" height="70" rx="6" fill="#fff6e6" transform="rotate(-4 60 53)" />
          <g transform="rotate(-4 60 53)" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M28 70 L44 44 L56 62 L66 50 L84 72" stroke="#2f4a63" strokeWidth="3" />
            <circle cx="80" cy="36" r="7" stroke="#f4515b" strokeWidth="3" />
            <path d="M30 32 q6 -6 12 0" stroke="#e7bc72" strokeWidth="2.5" />
          </g>
          <g transform="rotate(38 84 92)">
            <rect x="60" y="88" width="40" height="8" rx="2" fill="#e7bc72" />
            <path d="M100 88 L110 92 L100 96 Z" fill="#f2d29a" />
            <path d="M106 90.5 L110 92 L106 93.5 Z" fill="#1c1b22" />
            <rect x="56" y="88" width="6" height="8" rx="1.5" fill="#ff687c" />
          </g>
          <text x="22" y="108" fontFamily="sans-serif" fontWeight="800" fontSize="16" fill="#fff1d5" opacity="0.9">?!</text>
        </>
      );
    case "antakshari":
      return (
        <>
          <defs>
            <radialGradient id={g("bg")} cx="0.5" cy="0.3" r="0.9">
              <stop offset="0" stopColor="#c23a3f" />
              <stop offset="1" stopColor="#2a0c14" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={u("bg")} />
          {/* Tabla pair */}
          <ellipse cx="40" cy="92" rx="18" ry="6" fill="#e7bc72" />
          <path d="M22 92 Q22 112 40 112 Q58 112 58 92 Z" fill="#7a3a1a" />
          <ellipse cx="40" cy="92" rx="10" ry="3" fill="#1c1b22" />
          <ellipse cx="80" cy="88" rx="14" ry="5" fill="#e7bc72" />
          <path d="M66 88 L68 112 H92 L94 88 Z" fill="#5a2a14" />
          <ellipse cx="80" cy="88" rx="7" ry="2.4" fill="#1c1b22" />
          <g fill="#fff1d5">
            <path d="M48 58 V22 L84 14 V48" stroke="#fff1d5" strokeWidth="4" fill="none" strokeLinejoin="round" />
            <ellipse cx="42" cy="58" rx="8" ry="6" />
            <ellipse cx="78" cy="50" rx="8" ry="6" />
          </g>
          <text x="14" y="36" fontFamily="serif" fontWeight="700" fontSize="18" fill="#e7bc72">अ</text>
        </>
      );
    case "jackaroo":
      return (
        <>
          <defs>
            <radialGradient id={g("jk")} cx="50%" cy="40%" r="70%">
              <stop offset="0" stopColor="#4a2a7a" />
              <stop offset="1" stopColor="#1a1030" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={u("jk")} />
          <circle cx="60" cy="62" r="44" fill="none" stroke="#e7bc72" strokeOpacity=".5" strokeWidth="2" strokeDasharray="3 5" />
          {[
            [60, 18, "#ff4d6d"],
            [104, 62, "#2ee59d"],
            [60, 106, "#ffd23f"],
            [16, 62, "#4cc9f0"],
          ].map(([x, y, c]) => (
            <circle key={String(c)} cx={Number(x)} cy={Number(y)} r="7" fill={String(c)} stroke="#fff" strokeWidth="1.5" />
          ))}
          {[-14, 0, 14].map((r, i) => (
            <g key={r} transform={`rotate(${r} 60 88)`}>
              <rect x="46" y="38" width="28" height="40" rx="4" fill="#fff6e6" stroke="#e7bc72" strokeWidth="1" />
              <text x="50" y="50" fontFamily="sans-serif" fontWeight="800" fontSize="9" fill={i === 1 ? "#1c1b22" : "#d8283a"}>
                {["J", "A", "K"][i]}
              </text>
            </g>
          ))}
        </>
      );
    case "cards":
      return (
        <>
          <rect width="120" height="120" fill="#3a1622" />
          <circle cx="60" cy="60" r="46" fill="#241018" />
          {[-24, -8, 8, 24].map((r, i) => (
            <g key={r} transform={`rotate(${r} 60 100)`}>
              <rect x="44" y="30" width="32" height="46" rx="4" fill="#fff6e6" stroke="#e7bc72" strokeWidth="1" />
              <text x="48" y="42" fontFamily="sans-serif" fontWeight="800" fontSize="9" fill={i % 2 ? "#1c1b22" : "#d8283a"}>
                {["A", "K", "Q", "J"][i]}
              </text>
              <path d={i % 2 ? "M60 50 l5 8 h-10 Z M60 66 v-8" : "M60 50 l6 7 l-6 7 l-6 -7 Z"} fill={i % 2 ? "#1c1b22" : "#d8283a"} stroke={i % 2 ? "#1c1b22" : "none"} />
            </g>
          ))}
          {[[24, 96], [96, 98], [100, 22]].map(([x, y]) => (
            <g key={x}>
              <circle cx={x} cy={y} r="8" fill="#e7bc72" />
              <circle cx={x} cy={y} r="5" fill="none" stroke="#a8742f" strokeDasharray="2 2" />
            </g>
          ))}
        </>
      );
  }
}
