import { useId } from "react";
import type { GiftId } from "@/lib/app/types";

/** Original gift illustrations, drawn in a 64×64 box. */
export function GiftArt({ id, className = "h-full w-full" }: { id: GiftId; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const g = (n: string) => `${n}-${uid}`;
  const u = (n: string) => `url(#${g(n)})`;
  return (
    <svg viewBox="0 0 64 64" className={`overflow-visible ${className}`} aria-hidden>
      <defs>
        <linearGradient id={g("gold")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="0.45" stopColor="#f2cd83" />
          <stop offset="1" stopColor="#a8742f" />
        </linearGradient>
        <linearGradient id={g("red")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8a8f" />
          <stop offset="0.5" stopColor="#f4515b" />
          <stop offset="1" stopColor="#a8222f" />
        </linearGradient>
        <linearGradient id={g("pink")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc2cc" />
          <stop offset="1" stopColor="#ff687c" />
        </linearGradient>
        {/* Soft edges for picture icons: a blurred rounded square, so corners and sides fade into the panel */}
        <filter id={g("featherBlur")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <mask id={g("soft")} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect x="6" y="6" width="52" height="52" rx="11" fill="#fff" filter={u("featherBlur")} />
        </mask>
      </defs>
      {art(id, u)}
    </svg>
  );
}

function art(id: GiftId, u: (n: string) => string) {
  switch (id) {
    case "neon-racer":
      // The car picture with blurred edges, no round frame
      return <image href="/gifts/neon-racer-icon.png" x="1" y="1" width="62" height="62" mask={u("soft")} preserveAspectRatio="xMidYMid slice" />;
    case "crystal-palace":
      // The palace's own picture (transparent background), a little larger than the box like the other legendary art
      return <image href="/gifts/crystal-palace-icon.png" x="-3" y="-3" width="70" height="70" preserveAspectRatio="xMidYMid meet" />;
    case "storm-guardian":
      // The gift's own icon (200×200, transparent), drawn a little larger than the box like the other legendary art
      return <image href="/gifts/storm-guardian/icon-small.png" x="-4" y="-4" width="72" height="72" preserveAspectRatio="xMidYMid meet" />;
    case "cupid-heart":
      // The gift's own picture with blurred edges, no round frame
      return <image href="/gifts/cupid-heart-icon.png?v=2" x="1" y="1" width="62" height="62" mask={u("soft")} preserveAspectRatio="xMidYMid slice" />;
    case "princess-flower":
      // The gift's own picture with blurred edges, no round frame
      return <image href="/gifts/princess-flower-icon.png?v=2" x="1" y="1" width="62" height="62" mask={u("soft")} preserveAspectRatio="xMidYMid slice" />;
    case "rose":
      return (
        <>
          <path d="M32 34 Q30 48 33 60" stroke="#3f8a4a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M32 46 Q22 40 18 46 Q24 52 32 48 Z" fill="#4fa85a" />
          <path d="M33 52 Q42 46 46 52 Q40 57 33 54 Z" fill="#3f8a4a" />
          <path d="M20 22 Q20 38 32 38 Q44 38 44 22 Q38 28 32 24 Q26 28 20 22 Z" fill="#a8222f" />
          <path d="M23 16 Q32 8 41 16 Q42 26 32 30 Q22 26 23 16 Z" fill={u("red")} />
          <path d="M27 18 Q32 13 37 18 Q36 24 32 25 Q28 24 27 18 Z" fill="#d8283a" />
          <path d="M30 18 Q32 16 34 18" stroke="#ff9aa2" strokeWidth="1.2" fill="none" />
        </>
      );
    case "heart":
      return (
        <>
          <path d="M32 54 C14 42 8 32 12 22 C16 12 28 12 32 22 C36 12 48 12 52 22 C56 32 50 42 32 54 Z" fill={u("pink")} />
          <path d="M18 22 Q20 16 26 17" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.8" />
          {[[8, 10, 4], [54, 8, 5], [56, 40, 3.4], [6, 40, 3]].map(([x, y, s], i) => (
            <path key={i} d={`M${x} ${y + s} c-${s} -${s * 0.7} -${s} -${s * 1.6} 0 -${s * 1.2} c${s} -${s * 0.4} ${s} ${s * 0.5} 0 ${s * 1.2} Z`} fill="#ff687c" opacity="0.8" />
          ))}
        </>
      );
    case "bear":
      return (
        <>
          <circle cx="18" cy="16" r="7" fill="#a0683e" />
          <circle cx="46" cy="16" r="7" fill="#a0683e" />
          <circle cx="18" cy="16" r="3.5" fill="#e0a98a" />
          <circle cx="46" cy="16" r="3.5" fill="#e0a98a" />
          <ellipse cx="32" cy="50" rx="17" ry="13" fill="#a0683e" />
          <circle cx="32" cy="27" r="15" fill="#b8784a" />
          <ellipse cx="32" cy="33" rx="7" ry="5" fill="#f2d2b0" />
          <ellipse cx="32" cy="31" rx="2.6" ry="1.8" fill="#2a1a12" />
          <circle cx="26" cy="25" r="1.8" fill="#2a1a12" />
          <circle cx="38" cy="25" r="1.8" fill="#2a1a12" />
          <path d="M32 58 C22 51 20 46 22 42 C24 38 30 39 32 43 C34 39 40 38 42 42 C44 46 42 51 32 58 Z" fill={u("red")} />
          <ellipse cx="18" cy="48" rx="5" ry="4" fill="#b8784a" />
          <ellipse cx="46" cy="48" rx="5" ry="4" fill="#b8784a" />
        </>
      );
    case "crown":
      return (
        <>
          <path d="M8 24 L20 36 L32 12 L44 36 L56 24 L51 50 Q32 56 13 50 Z" fill={u("gold")} />
          <path d="M13 50 Q32 56 51 50 L50 56 Q32 62 14 56 Z" fill="#a8742f" />
          {[[8, 22], [32, 10], [56, 22]].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="3.6" fill={u("gold")} />
          ))}
          <path d="M32 32 l5 6 l-5 6 l-5 -6 Z" fill="#d8283a" />
          <circle cx="20" cy="43" r="2.6" fill="#6fe0a6" />
          <circle cx="44" cy="43" r="2.6" fill="#8fa8ff" />
          <path d="M16 30 L22 37" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        </>
      );
    case "rocket":
      return (
        <>
          <path d="M26 46 Q32 64 38 46 Z" fill="#ffb03a" />
          <path d="M28.5 46 Q32 57 35.5 46 Z" fill="#fff1d5" />
          <path d="M22 40 L14 50 L24 46 Z" fill="#f4515b" />
          <path d="M42 40 L50 50 L40 46 Z" fill="#f4515b" />
          <path d="M32 4 Q44 16 42 46 H22 Q20 16 32 4 Z" fill="#f4eefe" />
          <path d="M32 4 Q44 16 42 46 H36 Q38 18 32 4 Z" fill="#c9b8f0" />
          <circle cx="32" cy="24" r="6" fill="#6a3ad0" stroke={u("gold")} strokeWidth="2.4" />
          <circle cx="30" cy="22" r="1.6" fill="#fff" opacity="0.8" />
          <path d="M26 6 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1 Z M52 22 l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1 Z" fill="#e7bc72" />
        </>
      );
    case "car":
      return (
        <>
          <ellipse cx="32" cy="52" rx="28" ry="4" fill="#000" opacity="0.3" />
          <path d="M6 44 Q6 36 14 35 L20 24 Q22 20 28 20 H38 Q44 20 47 25 L52 34 Q60 36 60 44 V46 H6 Z" fill={u("red")} />
          <path d="M22 34 L26 25 H31 V34 Z M35 34 V25 H40 Q43 25 45 28 L48 34 Z" fill="#2a1a2e" />
          <path d="M6 42 H60" stroke={u("gold")} strokeWidth="2" />
          <circle cx="18" cy="47" r="7" fill="#1c1b22" />
          <circle cx="18" cy="47" r="3.6" fill={u("gold")} />
          <circle cx="47" cy="47" r="7" fill="#1c1b22" />
          <circle cx="47" cy="47" r="3.6" fill={u("gold")} />
          <path d="M28 14 L30 18 H36 L38 14 L35 16 L33 12 L31 16 Z" fill={u("gold")} />
          <rect x="56" y="38" width="4" height="3" rx="1" fill="#fff1c9" />
        </>
      );
    case "dragon":
      // The dragon's own picture with blurred edges, no round frame
      return <image href="/gifts/dragon-icon.png?v=2" x="1" y="1" width="62" height="62" mask={u("soft")} preserveAspectRatio="xMidYMid slice" />;
    case "god-of-wealth":
      // The gift's own picture with blurred edges, no round frame
      return <image href="/gifts/god-of-wealth-icon.png?v=2" x="1" y="1" width="62" height="62" mask={u("soft")} preserveAspectRatio="xMidYMid slice" />;
    case "sunset-romance":
      // The gift's own picture with blurred edges, no round frame
      return <image href="/gifts/sunset-romance-icon.png?v=2" x="1" y="1" width="62" height="62" mask={u("soft")} preserveAspectRatio="xMidYMid slice" />;
    case "hamper":
      // A woven basket with a kulhad of chai, laddoos and a ribbon
      return (
        <>
          <path d="M14 28 Q32 6 50 28" stroke="#a8742f" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="24" cy="27" r="6" fill="#ffb347" />
          <circle cx="24" cy="27" r="6" fill="none" stroke="#e08a1e" strokeWidth="1" strokeDasharray="1.5 2" />
          <circle cx="34" cy="25" r="5.5" fill="#ffc94a" />
          <path d="M38 18 L48 18 L46.5 30 L39.5 30 Z" fill="#c4683a" />
          <ellipse cx="43" cy="18" rx="5" ry="1.6" fill="#7a3a1a" />
          <path d="M41 14 q-1 -3 1 -5 M45 14 q-1 -3 1 -5" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.7" strokeLinecap="round" />
          <path d="M8 30 H56 L50 56 Q32 60 14 56 Z" fill="#c9954a" />
          {[36, 42, 48].map((y) => (
            <path key={y} d={`M10 ${y} Q32 ${y + 4} 54 ${y}`} stroke="#8a5a24" strokeWidth="1.4" fill="none" />
          ))}
          <path d="M8 30 H56 L55 34 H9 Z" fill="#a8742f" />
          <path d="M28 40 h8 v10 h-8 z" fill={u("red")} />
          <path d="M32 40 L24 34 M32 40 L40 34" stroke="#f4515b" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="32" cy="40" r="2.2" fill="#ff8a8f" />
        </>
      );
    case "fireworks":
      return (
        <>
          {[
            [24, 24, 16, "#e7bc72"],
            [44, 20, 12, "#ff687c"],
            [40, 44, 14, "#8fa8ff"],
          ].map(([cx, cy, r, col], i) => (
            <g key={i} stroke={String(col)} strokeWidth="2.2" strokeLinecap="round">
              {Array.from({ length: 10 }).map((_, k) => {
                const a = (k / 10) * Math.PI * 2;
                const r0 = Number(r) * 0.35;
                return (
                  <line
                    key={k}
                    x1={Number(cx) + Math.cos(a) * r0}
                    y1={Number(cy) + Math.sin(a) * r0}
                    x2={Number(cx) + Math.cos(a) * Number(r)}
                    y2={Number(cy) + Math.sin(a) * Number(r)}
                  />
                );
              })}
              <circle cx={cx} cy={cy} r="2.4" fill="#fff1d5" stroke="none" />
            </g>
          ))}
          <path d="M32 62 Q30 52 24 44" stroke="#fff1d5" strokeWidth="1.2" strokeDasharray="2 3" fill="none" opacity="0.6" />
        </>
      );
    case "packet":
      return (
        <>
          <rect x="14" y="6" width="36" height="52" rx="5" fill={u("red")} />
          <path d="M14 11 Q32 30 50 11 V6 H14 Z" fill="#c8283a" />
          <circle cx="32" cy="24" r="8" fill={u("gold")} />
          <text x="32" y="28" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="sans-serif" fill="#a8222f">₹</text>
          <path d="M20 42 H44 M20 48 H38" stroke="#e7bc72" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        </>
      );
    case "royal-entry":
      return (
        <>
          <path d="M8 60 V30 Q8 10 32 6 Q56 10 56 30 V60 H46 V34 Q46 20 32 18 Q18 20 18 34 V60 Z" fill={u("gold")} />
          <path d="M18 60 V34 Q18 20 32 18 Q46 20 46 34 V60 Z" fill="#3a1622" />
          <path d="M22 60 V36 Q22 24 32 22 Q42 24 42 36 V60 Z" fill={u("red")} opacity="0.85" />
          <path d="M22 4 L26 10 L32 0 L38 10 L42 4 L40 14 H24 Z" fill={u("gold")} />
          <text x="32" y="46" textAnchor="middle" fontSize="18" fontWeight="900" fontFamily="serif" fill="#fff1d5">P</text>
          {[[12, 40], [52, 40], [12, 52], [52, 52]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill="#fff4d6" />
          ))}
        </>
      );
  }
}
