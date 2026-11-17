import { useId } from "react";

/**
 * Glossy 3D-style icons in the Panchayat colours (brass gold, saffron, maroon, clay and thatch).
 * Drawn as layered shapes with gradients, a soft highlight and a ground shadow.
 */

/** A brass village-meeting microphone: gold grille head in a cradle, a saffron-and-maroon band and a turned handle. */
export function Mic3D({ size = 40, className = "" }: { size?: number; className?: string }) {
  const u = useId().replace(/:/g, "");
  const id = (n: string) => `${n}-${u}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`shrink-0 overflow-visible ${className}`} aria-hidden>
      <defs>
        <linearGradient id={id("gold")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3bf" />
          <stop offset="0.35" stopColor="#ffd45a" />
          <stop offset="0.7" stopColor="#e39a1f" />
          <stop offset="1" stopColor="#8f5410" />
        </linearGradient>
        <linearGradient id={id("goldv")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9a5d12" />
          <stop offset="0.3" stopColor="#ffe08a" />
          <stop offset="0.55" stopColor="#f0b034" />
          <stop offset="1" stopColor="#7d4609" />
        </linearGradient>
        <linearGradient id={id("band")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a0f2a" />
          <stop offset="0.45" stopColor="#ff5a4d" />
          <stop offset="1" stopColor="#8c1230" />
        </linearGradient>
        <radialGradient id={id("grille")} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#fff7d0" />
          <stop offset="0.5" stopColor="#f6c447" />
          <stop offset="1" stopColor="#a3631a" />
        </radialGradient>
        <radialGradient id={id("shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="60" rx="17" ry="3.6" fill={`url(#${id("shadow")})`} />
      {/* Stand */}
      <rect x="29.4" y="43" width="5.2" height="12" rx="2" fill={`url(#${id("goldv")})`} stroke="#6e420e" strokeWidth=".8" />
      <path d="M21 57.5 Q21 54 25 54 H39 Q43 54 43 57.5 Q43 60 39 60 H25 Q21 60 21 57.5 Z" fill={`url(#${id("gold")})`} stroke="#6e420e" strokeWidth=".9" />
      <path d="M24 55.4 H34" stroke="#fff" strokeOpacity=".55" strokeWidth="1.1" strokeLinecap="round" />
      {/* Cradle */}
      <path d="M17.5 24 C17 38 23 43.5 32 43.5 C41 43.5 47 38 46.5 24" fill="none" stroke="#6e420e" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M17.5 24 C17 38 23 43.5 32 43.5 C41 43.5 47 38 46.5 24" fill="none" stroke={`url(#${id("gold")})`} strokeWidth="2.6" strokeLinecap="round" />
      {/* Head */}
      <rect x="21.5" y="4.5" width="21" height="33" rx="10.5" fill={`url(#${id("grille")})`} stroke="#6e420e" strokeWidth="1.1" />
      <g stroke="#8a520e" strokeOpacity=".55" strokeWidth=".9" strokeLinecap="round" fill="none">
        <path d="M23.5 12 H40.5 M22.6 17 H41.4 M22.4 22 H41.6 M22.4 27 H41.6 M23 32 H41" />
        <path d="M32 6 V36 M27 7 Q26 21 27 35 M37 7 Q38 21 37 35" />
      </g>
      <path d="M25.4 9 Q23.8 20 25.4 31" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="2" strokeLinecap="round" />
      {/* Band */}
      <rect x="20.6" y="36.2" width="22.8" height="6.2" rx="3" fill={`url(#${id("band")})`} stroke="#5a0b1e" strokeWidth=".9" />
      <path d="M24 38.2 H34" stroke="#fff" strokeOpacity=".5" strokeWidth="1" strokeLinecap="round" />
      <circle cx="32" cy="39.3" r="1.2" fill="#ffd45a" />
    </svg>
  );
}

/** A mud-and-thatch village hut (the Panchayat chaupal) with a saffron flag. */
export function Hut3D({ size = 40, className = "" }: { size?: number; className?: string }) {
  const u = useId().replace(/:/g, "");
  const id = (n: string) => `${n}-${u}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`shrink-0 overflow-visible ${className}`} aria-hidden>
      <defs>
        <linearGradient id={id("thatch")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.45" stopColor="#d9962b" />
          <stop offset="1" stopColor="#7d4a12" />
        </linearGradient>
        <linearGradient id={id("wall")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9a6a" />
          <stop offset="0.55" stopColor="#d4552f" />
          <stop offset="1" stopColor="#7e2a14" />
        </linearGradient>
        <linearGradient id={id("door")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a2410" />
          <stop offset="1" stopColor="#1e0d06" />
        </linearGradient>
        <radialGradient id={id("shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="58.5" rx="22" ry="4" fill={`url(#${id("shadow")})`} />
      {/* Flag */}
      <path d="M32 3 V15" stroke="#5b3410" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M32.6 3.6 L44 6.6 L32.6 10 Z" fill="#ff8a1f" stroke="#b34a00" strokeWidth=".7" strokeLinejoin="round" />
      {/* Walls */}
      <rect x="12.5" y="30" width="39" height="26" rx="4" fill={`url(#${id("wall")})`} stroke="#5a1e0c" strokeWidth="1" />
      <path d="M15 33 Q15 45 16 54" stroke="#fff" strokeOpacity=".28" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Door */}
      <path d="M25 56 V42 Q25 36.5 32 36.5 Q39 36.5 39 42 V56 Z" fill={`url(#${id("door")})`} stroke="#2a1208" strokeWidth=".9" />
      <path d="M32 37 V56" stroke="#6b3a1a" strokeWidth=".8" />
      <circle cx="35.6" cy="47" r="1" fill="#ffd45a" />
      {/* Thatched roof */}
      <path d="M32 9 L58 34 Q57 36.4 54 36.4 H10 Q7 36.4 6 34 Z" fill={`url(#${id("thatch")})`} stroke="#6a3d0e" strokeWidth="1.1" strokeLinejoin="round" />
      <g stroke="#7a4710" strokeOpacity=".55" strokeWidth=".9" strokeLinecap="round" fill="none">
        <path d="M32 11 L14 34 M32 11 L23 35 M32 11 L41 35 M32 11 L50 34" />
        <path d="M10 33.5 Q32 30.5 54 33.5" />
        <path d="M17 28 Q32 24 47 28" />
      </g>
      <path d="M29 13 L12 32" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 35.4 H56" stroke="#4d2a08" strokeOpacity=".5" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
