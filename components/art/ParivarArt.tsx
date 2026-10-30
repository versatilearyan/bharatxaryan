import { useId } from "react";

/** Village chaupal at dusk: a banyan tree with a charpai, a lantern and the family hut. Square artwork. */
export function ParivarArt({ className = "h-full w-full" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const u = (n: string) => `url(#${n}-${id})`;
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a1a3a" />
          <stop offset="0.55" stopColor="#c9533f" />
          <stop offset="1" stopColor="#f2a65a" />
        </linearGradient>
        <radialGradient id={`sun-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1c9" />
          <stop offset="0.6" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`glow-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ground-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a1620" />
          <stop offset="1" stopColor="#1a0b11" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" fill={u("sky")} />
      <circle cx="66" cy="54" r="20" fill={u("sun")} />
      <circle cx="66" cy="54" r="9" fill="#ffe7a8" />
      {/* Birds */}
      <path d="M58 20 q3 -3 6 0 q3 -3 6 0 M74 28 q2 -2 4 0 q2 -2 4 0" stroke="#3a1620" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {/* Hills and the family hut */}
      <path d="M0 66 Q24 56 48 64 T96 60 V96 H0 Z" fill="#5a2232" opacity="0.8" />
      <path d="M70 62 L79 54 L88 62 Z" fill="#2a0f18" />
      <rect x="72" y="62" width="14" height="9" fill="#2a0f18" />
      <rect x="77" y="65" width="4" height="6" fill="#ffc24a" opacity="0.9" />
      <path d="M0 74 Q30 68 96 72 V96 H0 Z" fill={u("ground")} />
      {/* Banyan: trunk, aerial roots and a wide canopy */}
      <path d="M26 74 C27 62 25 52 28 44 L34 44 C36 52 34 62 36 74 Z" fill="#2a0f18" />
      {[14, 19, 42, 47].map((x, i) => (
        <path key={i} d={`M${x} ${40 + (i % 2) * 2} V${66 + (i % 2) * 3}`} stroke="#2a0f18" strokeWidth="1.2" />
      ))}
      <ellipse cx="31" cy="34" rx="25" ry="12" fill="#2a0f18" />
      <ellipse cx="18" cy="30" rx="12" ry="8" fill="#2a0f18" />
      <ellipse cx="44" cy="29" rx="13" ry="8" fill="#2a0f18" />
      <ellipse cx="31" cy="24" rx="12" ry="8" fill="#2a0f18" />
      {/* Lantern hanging from a branch */}
      <path d="M46 36 V44" stroke="#2a0f18" strokeWidth="0.9" />
      <circle cx="46" cy="47" r="7" fill={u("glow")} />
      <rect x="43.5" y="44" width="5" height="6" rx="1.2" fill="#ffc24a" stroke="#7a3a1a" strokeWidth="0.8" />
      {/* Charpai: woven cot under the tree */}
      <path d="M14 72 L16 80 M50 72 L48 80" stroke="#7a4a24" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 70 H53 L51 74 H13 Z" fill="#c9954a" />
      <path d="M15 70.5 L19 73.5 M21 70.5 L25 73.5 M27 70.5 L31 73.5 M33 70.5 L37 73.5 M39 70.5 L43 73.5 M45 70.5 L49 73.5" stroke="#7a4a24" strokeWidth="0.8" />
      <path d="M11 70 H53" stroke="#e7bc72" strokeWidth="1.4" strokeLinecap="round" />
      {/* Kulhad chai on the cot */}
      <path d="M29 66 h4 l-0.6 4 h-2.8 Z" fill="#c4683a" />
      <path d="M30 64.5 q-0.6 -1.4 0.4 -2.6 M32 64.5 q-0.6 -1.4 0.4 -2.6" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.6" fill="none" />
    </svg>
  );
}
