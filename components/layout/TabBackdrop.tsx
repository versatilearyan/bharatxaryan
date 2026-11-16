"use client";

/**
 * The moving backdrop behind the Home screen: a flat 2D village at dusk in the Panchayat colours (maroon, marigold, gold).
 * A banyan tree, huts and a temple on the horizon; kites drifting across, diyas floating up, marigold petals falling,
 * slow clouds and twinkling stars. Pure CSS and SVG, so it costs almost nothing, and it stands still for people who asked
 * for less motion (and on slow phones, see globals.css).
 */
const OUT = "#1a0b12";

function Kite({ top, delay, dur, c1, c2, scale = 1 }: { top: string; delay: string; dur: string; c1: string; c2: string; scale?: number }) {
  return (
    <svg className="tb-kite" style={{ top, animation: `tb-fly ${dur} ease-in-out ${delay} infinite alternate` }} width={34 * scale} height={64 * scale} viewBox="0 0 34 64" aria-hidden>
      <path d="M17 2 L32 20 L17 40 L2 20 Z" fill={c1} stroke={OUT} strokeWidth="2" strokeLinejoin="round" />
      <path d="M17 2 L32 20 L17 20 Z M17 40 L2 20 L17 20 Z" fill={c2} />
      <path d="M17 2 V40 M2 20 H32" stroke={OUT} strokeWidth="1.2" />
      <path d="M17 40 Q10 48 17 54 Q24 60 17 64" fill="none" stroke="#ffe9a8" strokeWidth="1.6" />
    </svg>
  );
}

function Diya({ left, delay, dur, s = 1 }: { left: string; delay: string; dur: string; s?: number }) {
  return (
    <svg className="tb-diya" style={{ left, animationDelay: delay, animationDuration: dur }} width={26 * s} height={26 * s} viewBox="0 0 26 26" aria-hidden>
      <g className="tb-flame">
        <path d="M13 1 Q19 8 13 14 Q7 8 13 1 Z" fill="#ffb347" />
        <path d="M13 5 Q16 9 13 13 Q10 9 13 5 Z" fill="#fff1a8" />
      </g>
      <path d="M3 16 Q13 26 23 16 Z" fill="#d9772b" stroke={OUT} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="13" cy="15" r="9" fill="#ffb347" opacity=".18" />
    </svg>
  );
}

export function TabBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* dusk sky */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#2a0f1f_0%,#1c0c1a_38%,#12080f_70%,#0a0509_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[42%] bg-[radial-gradient(70%_80%_at_80%_8%,rgba(255,179,71,0.30),rgba(255,106,61,0.12)_45%,transparent_72%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_30%_at_0%_30%,rgba(200,30,70,0.18),transparent_70%)]" />

      {/* sun glow */}
      <svg className="absolute right-[-30px] top-[48px]" width="170" height="170" viewBox="0 0 170 170">
        <circle cx="85" cy="85" r="62" fill="#ffb347" opacity=".14" />
        <circle cx="85" cy="85" r="40" fill="#ffd36e" opacity=".22" />
        <circle cx="85" cy="85" r="26" fill="#ffe9a8" opacity=".5" />
      </svg>

      {/* stars */}
      {[[8, 6], [20, 14], [34, 5], [47, 12], [60, 4], [71, 16], [88, 9], [14, 24], [52, 24], [80, 27]].map(([x, y], i) => (
        <span key={i} className="tb-star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.45}s` }} />
      ))}

      {/* clouds */}
      <svg className="tb-cloud" style={{ top: "14%", animationDuration: "70s" }} width="120" height="40" viewBox="0 0 120 40">
        <path d="M10 32 Q4 22 18 20 Q20 8 36 12 Q46 2 60 12 Q76 6 82 20 Q100 18 98 32 Z" fill="#fff3d0" opacity=".12" />
      </svg>
      <svg className="tb-cloud" style={{ top: "30%", animationDuration: "95s", animationDelay: "-40s" }} width="90" height="32" viewBox="0 0 120 40">
        <path d="M10 32 Q4 22 18 20 Q20 8 36 12 Q46 2 60 12 Q76 6 82 20 Q100 18 98 32 Z" fill="#ffd9b8" opacity=".09" />
      </svg>

      {/* kites */}
      <Kite top="9%" delay="0s" dur="18s" c1="#ff4d6d" c2="#ffb347" />
      <Kite top="26%" delay="-7s" dur="24s" c1="#7c4dff" c2="#ffd86b" scale={0.8} />
      <Kite top="44%" delay="-12s" dur="21s" c1="#18c28a" c2="#ffe9a8" scale={0.7} />

      {/* village on the horizon */}
      <svg className="absolute inset-x-0 bottom-0 w-full" viewBox="0 0 420 150" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <path d="M0 128 Q90 104 190 124 T420 112 V150 H0 Z" fill="#1d0c14" />
        <g fill="#150a10" stroke={OUT} strokeWidth="2" strokeLinejoin="round">
          {/* banyan */}
          <path d="M18 128 V92 M36 128 V96" stroke="#150a10" strokeWidth="5" />
          <circle cx="28" cy="78" r="24" /><circle cx="8" cy="88" r="16" /><circle cx="48" cy="86" r="18" />
          {/* temple */}
          <rect x="176" y="92" width="38" height="36" />
          <path d="M170 94 H220 L195 66 Z" />
          <path d="M190 66 H200 L195 54 Z" />
          {/* huts */}
          <rect x="92" y="106" width="34" height="22" /><path d="M86 108 H132 L109 88 Z" />
          <rect x="250" y="104" width="38" height="24" /><path d="M244 106 H294 L269 84 Z" />
          <rect x="330" y="108" width="30" height="20" /><path d="M325 110 H365 L345 92 Z" />
        </g>
        {/* lit windows */}
        <g fill="#ffb347">
          <rect x="188" y="106" width="8" height="12" rx="4" opacity=".85" />
          <rect x="105" y="114" width="7" height="8" opacity=".8" />
          <rect x="263" y="112" width="8" height="9" opacity=".8" />
          <rect x="340" y="116" width="6" height="7" opacity=".8" />
        </g>
        <path d="M0 140 Q120 128 250 140 T420 134 V150 H0 Z" fill="#0d0509" />
      </svg>

      {/* diyas floating up */}
      <Diya left="12%" delay="0s" dur="17s" />
      <Diya left="38%" delay="-6s" dur="21s" s={0.8} />
      <Diya left="64%" delay="-11s" dur="19s" />
      <Diya left="86%" delay="-3s" dur="23s" s={0.75} />

      {/* marigold petals */}
      {[[6, "#ffb347", "0s", "13s"], [22, "#ff7a3d", "-4s", "16s"], [41, "#ffd86b", "-8s", "12s"], [58, "#ff9a3d", "-2s", "17s"], [74, "#ffb347", "-10s", "14s"], [92, "#ff6a3d", "-6s", "15s"]].map(([x, c, d, t], i) => (
        <span key={i} className="tb-petal" style={{ left: `${x}%`, background: String(c), animationDelay: String(d), animationDuration: String(t) }} />
      ))}
    </div>
  );
}
