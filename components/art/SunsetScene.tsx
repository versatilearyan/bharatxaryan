import { useId } from "react";
import type { Cover, CoverTheme } from "@/lib/app/types";

/**
 * Original sunset-village artwork used for room covers, banners and events.
 * Pure SVG so it is crisp at any size and costs nothing to download.
 * `preserveAspectRatio="slice"` lets the same scene fill squares, banners and thumbnails.
 */

type Palette = { sky: [string, string, string, string]; sun: string; far: string; near: string; ground: string; accent: string };

export const PALETTES: Record<CoverTheme, Palette> = {
  dusk: { sky: ["#2a1636", "#8a2e4e", "#e8605a", "#f7b267"], sun: "#ffe2a8", far: "#6b2440", near: "#3a1530", ground: "#1a0d1a", accent: "#f4515b" },
  rose: { sky: ["#241329", "#6d2450", "#d9506e", "#ffb38a"], sun: "#ffd9c2", far: "#5a1d3e", near: "#34122a", ground: "#170b16", accent: "#ff687c" },
  gold: { sky: ["#1d130f", "#5a2e17", "#c77a32", "#f2c879"], sun: "#fff0c4", far: "#6a3a1c", near: "#3a1f12", ground: "#160d09", accent: "#e7bc72" },
  night: { sky: ["#0b0d1f", "#1d1b45", "#3d2f6e", "#7a4f8a"], sun: "#fff1d5", far: "#2a2350", near: "#18163a", ground: "#0b0a1a", accent: "#c9a0ff" },
  monsoon: { sky: ["#0e1a22", "#1f3d4a", "#4a7a7a", "#c9a46e"], sun: "#ffe6b0", far: "#234048", near: "#142a30", ground: "#0b1418", accent: "#6fe0a6" },
  ember: { sky: ["#1a0b10", "#5e1426", "#c23a3f", "#f78a4a"], sun: "#ffd08a", far: "#6a1a2a", near: "#3a0f1a", ground: "#14080c", accent: "#ff8a6e" },
};

export const COVER_LABELS: Record<CoverTheme, string> = {
  dusk: "Village dusk",
  rose: "Rose evening",
  gold: "Golden hour",
  night: "Moonlit mela",
  monsoon: "Monsoon ghat",
  ember: "Ember sky",
};

type Props = Cover & { className?: string; /** Darken the bottom so text on top stays readable. */ shade?: boolean };

export function SunsetScene({ theme, motif, className = "", shade = false }: Props) {
  const id = useId().replace(/:/g, "");
  const c = PALETTES[theme];
  const isNight = theme === "night";

  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className={`block h-full w-full ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.sky[0]} />
          <stop offset="0.38" stopColor={c.sky[1]} />
          <stop offset="0.68" stopColor={c.sky[2]} />
          <stop offset="0.86" stopColor={c.sky[3]} />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={c.sun} stopOpacity="0.75" />
          <stop offset="0.4" stopColor={c.sun} stopOpacity="0.22" />
          <stop offset="1" stopColor={c.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`shade-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#0b0a0d" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <rect width="400" height="240" fill={`url(#sky-${id})`} />

      {/* Sun or moon */}
      <circle cx="285" cy={isNight ? 70 : 150} r="110" fill={`url(#glow-${id})`} />
      {isNight ? (
        <>
          <circle cx="285" cy="70" r="24" fill={c.sun} />
          <circle cx="296" cy="63" r="22" fill={c.sky[1]} />
          {[[40, 30], [90, 60], [150, 24], [200, 70], [340, 40], [370, 100], [60, 110], [230, 30]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} fill="#fff1d5" opacity={0.5 + (i % 3) * 0.2} />
          ))}
        </>
      ) : (
        <circle cx="285" cy="150" r="36" fill={c.sun} />
      )}

      {/* Birds */}
      {!isNight ? (
        <g fill="none" stroke={c.ground} strokeWidth="1.6" strokeLinecap="round" opacity="0.7">
          <path d="M70 64 q5 -5 10 0 q5 -5 10 0" />
          <path d="M98 80 q4 -4 8 0 q4 -4 8 0" />
          <path d="M180 52 q3 -3 6 0 q3 -3 6 0" />
        </g>
      ) : null}

      {/* Distant hills */}
      <path d="M0 168 Q60 136 120 158 T240 146 T400 156 V240 H0 Z" fill={c.far} opacity="0.9" />
      <path d="M0 188 Q80 166 160 184 T320 176 T400 184 V240 H0 Z" fill={c.near} />

      <Motif motif={motif} c={c} />

      {/* Foreground */}
      <path d="M0 206 Q100 196 200 204 T400 200 V240 H0 Z" fill={c.ground} />
      {shade ? <rect width="400" height="240" fill={`url(#shade-${id})`} /> : null}
    </svg>
  );
}

function Motif({ motif, c }: { motif: Cover["motif"]; c: Palette }) {
  switch (motif) {
    case "banyan":
      return (
        <g fill={c.ground}>
          <path d="M66 206 L72 150 Q60 140 50 146 L48 140 Q64 132 74 142 L78 120 L86 120 L88 142 Q100 130 114 138 L112 144 Q98 140 92 150 L98 206 Z" />
          <ellipse cx="82" cy="112" rx="64" ry="26" />
          <ellipse cx="44" cy="124" rx="34" ry="18" />
          <ellipse cx="122" cy="122" rx="38" ry="18" />
          <ellipse cx="86" cy="94" rx="42" ry="20" />
          <g stroke={c.ground} strokeWidth="1.4">
            {[38, 52, 112, 128, 140].map((x) => (
              <line key={x} x1={x} y1="130" x2={x + 2} y2={170 + (x % 3) * 8} />
            ))}
          </g>
          {/* Charpai and a little hut */}
          <rect x="150" y="190" width="40" height="5" rx="1" />
          <rect x="152" y="195" width="3" height="10" />
          <rect x="185" y="195" width="3" height="10" />
          <path d="M214 206 V182 H250 V206 Z M208 184 L232 164 L256 184 Z" />
          <rect x="228" y="190" width="8" height="10" fill={c.accent} opacity="0.85" />
        </g>
      );
    case "temple":
      return (
        <g fill={c.ground}>
          <path d="M120 206 V176 H128 V164 Q128 132 150 104 Q172 132 172 164 V176 H180 V206 Z" />
          <path d="M146 104 Q150 92 154 104 Z" />
          <circle cx="150" cy="92" r="4" />
          <path d="M150 88 V70" stroke={c.ground} strokeWidth="1.6" />
          <path d="M150 70 L166 75 L150 80 Z" fill={c.accent} />
          <path d="M92 206 V186 Q92 172 106 168 Q120 172 120 186 V206 Z" />
          <path d="M180 206 V186 Q180 172 194 168 Q208 172 208 186 V206 Z" />
          <rect x="142" y="186" width="16" height="20" rx="8" fill={c.sun} opacity="0.55" />
          {[260, 300, 336].map((x, i) => (
            <path key={x} d={`M${x} 206 V${186 - i * 3} H${x + 30} V206 Z M${x - 4} ${188 - i * 3} L${x + 15} ${172 - i * 3} L${x + 34} ${188 - i * 3} Z`} />
          ))}
        </g>
      );
    case "huts":
      return (
        <g fill={c.ground}>
          {[
            [40, 0],
            [110, 8],
            [220, -4],
            [310, 6],
          ].map(([x, dy]) => (
            <g key={x}>
              <path d={`M${x} 206 V${180 + dy} H${x + 44} V206 Z`} />
              <path d={`M${x - 8} ${182 + dy} Q${x + 22} ${150 + dy} ${x + 52} ${182 + dy} Z`} />
              <rect x={x + 17} y={188 + dy} width="9" height="11" fill={c.accent} opacity="0.8" />
            </g>
          ))}
          <path d="M176 206 L180 160 L184 206 Z" />
          <path d="M180 162 q-14 -4 -22 4 M180 162 q14 -6 24 2 M180 162 q-8 -12 -20 -12 M180 162 q8 -12 22 -10" stroke={c.ground} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case "river":
      return (
        <g>
          <rect x="0" y="196" width="400" height="44" fill={c.near} />
          <g stroke={c.sun} strokeLinecap="round" opacity="0.7">
            <line x1="262" y1="204" x2="308" y2="204" strokeWidth="2.4" />
            <line x1="270" y1="212" x2="300" y2="212" strokeWidth="1.8" />
            <line x1="276" y1="220" x2="294" y2="220" strokeWidth="1.4" />
          </g>
          <path d="M120 210 Q150 220 190 210 L186 206 H124 Z" fill={c.ground} />
          <path d="M156 206 V182 L172 204 Z" fill={c.ground} />
          <g fill={c.ground}>
            <path d="M0 196 V176 H30 V168 H52 V196 Z" />
            <path d="M340 196 V172 H360 V160 L372 150 L384 160 V172 H400 V196 Z" />
            {[[16, 182], [42, 176], [360, 178]].map(([x, y]) => (
              <rect key={x} x={x} y={y} width="5" height="6" fill={c.accent} opacity="0.85" />
            ))}
          </g>
        </g>
      );
    case "kites":
      return (
        <g>
          {[
            [70, 60, c.accent, -12],
            [140, 34, "#e7bc72", 10],
            [214, 76, "#fff1d5", -6],
          ].map(([x, y, col, r]) => (
            <g key={String(x)} transform={`rotate(${r} ${x} ${y})`}>
              <path d={`M${x} ${Number(y) - 14} L${Number(x) + 11} ${y} L${x} ${Number(y) + 14} L${Number(x) - 11} ${y} Z`} fill={String(col)} />
              <path d={`M${x} ${Number(y) - 14} V${Number(y) + 14} M${Number(x) - 11} ${y} H${Number(x) + 11}`} stroke="#000" strokeOpacity="0.2" />
              <path d={`M${x} ${Number(y) + 14} q6 30 -10 70 t10 70`} stroke="#fff1d5" strokeOpacity="0.35" fill="none" />
            </g>
          ))}
          <g fill={c.ground}>
            <path d="M0 206 V178 H36 V170 H62 V186 H96 V206 Z" />
            <path d="M260 206 V182 H300 V172 H330 V184 H366 V174 H400 V206 Z" />
            <rect x="20" y="166" width="2" height="14" />
          </g>
        </g>
      );
    case "lanterns":
      return (
        <g>
          <path d="M-10 26 Q100 70 200 40 T410 30" stroke={c.ground} strokeWidth="1.4" fill="none" opacity="0.8" />
          {[30, 80, 130, 180, 230, 280, 330, 375].map((x, i) => {
            const y = 26 + Math.sin((x / 400) * Math.PI * 2) * 14 + 24 - (i % 2) * 4;
            return (
              <g key={x}>
                <line x1={x} y1={y - 16} x2={x} y2={y - 6} stroke={c.ground} strokeWidth="1" />
                <circle cx={x} cy={y + 2} r="11" fill={i % 2 ? c.sun : c.accent} opacity="0.22" />
                <rect x={x - 6} y={y - 6} width="12" height="15" rx="5" fill={i % 2 ? "#e7bc72" : c.accent} />
                <rect x={x - 3} y={y - 7} width="6" height="2" fill={c.ground} />
              </g>
            );
          })}
          <g fill={c.ground}>
            <path d="M0 206 V172 H40 V160 L56 148 L72 160 V180 H110 V206 Z" />
            <path d="M250 206 V178 H290 V164 H320 V176 H360 V160 L380 146 L400 160 V206 Z" />
            {[[14, 180], [52, 166], [270, 186], [300, 174], [372, 168]].map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="6" height="7" fill="#e7bc72" opacity="0.9" />
            ))}
          </g>
        </g>
      );
  }
}
