import { useId } from "react";
import { relationshipById, type RelationshipId } from "@/lib/app/tags";

/**
 * Relationship (BFF) badges in Panchayat style: a gold scalloped medallion,
 * like a lotus rosette or a mehfil thali, with a ring of rangoli dots, a gem
 * in the relationship's colour and a desi symbol in ivory: a rakhi for
 * Bro/Sis, interlocked bangles for Besties, a gada for Bro, a key for
 * Confidant, a pothi (open book) with a diya flame for Apprentice and a
 * peepal leaf for Sibling. Drawn in a 48×48 box.
 */
export function RelationIcon({ id, size = 24, className = "" }: { id: RelationshipId; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const rel = relationshipById(id);
  const g = (n: string) => `${n}-${uid}`;
  const petals = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: 24 + Math.cos(a) * 18.2, y: 24 + Math.sin(a) * 18.2 };
  });
  const dots = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    return { x: 24 + Math.cos(a) * 15.6, y: 24 + Math.sin(a) * 15.6 };
  });
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={`shrink-0 overflow-visible ${className}`} aria-hidden>
      <defs>
        <linearGradient id={g("rim")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="0.45" stopColor="#e7bc72" />
          <stop offset="1" stopColor="#8a5a1f" />
        </linearGradient>
        <radialGradient id={g("body")} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.32" stopColor={rel.tint} />
          <stop offset="1" stopColor={rel.deep} />
        </radialGradient>
      </defs>
      {/* Scalloped gold rosette */}
      <g fill={`url(#${g("rim")})`}>
        {petals.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4.6" />
        ))}
        <circle cx="24" cy="24" r="19.4" />
      </g>
      <circle cx="24" cy="24" r="18.2" fill="none" stroke="#7a4a12" strokeOpacity="0.55" strokeWidth="0.8" />
      {/* Gem */}
      <circle cx="24" cy="24" r="17.4" fill={`url(#${g("body")})`} />
      {/* Rangoli dots */}
      <g fill="#fff4d6" opacity="0.85">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="0.85" />
        ))}
      </g>
      <g fill="#fffaf0" stroke="none" style={{ filter: `drop-shadow(0 1px 1.2px ${rel.deep})` }}>
        {glyph(id, rel.deep)}
      </g>
      {/* Gloss */}
      <path d="M11 19 Q13.5 10.5 23 8.6 Q16.5 12.5 14 20 Z" fill="#fff" opacity="0.4" />
    </svg>
  );
}

function glyph(id: RelationshipId, deep: string) {
  switch (id) {
    case "brosis": {
      // Rakhi: a flower on a thread
      const petals = Array.from({ length: 8 }, (_, i) => i * 45);
      return (
        <>
          <path d="M8.5 25 Q13 22.5 17 24.5" stroke="#fffaf0" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M31 24.5 Q35 22.5 39.5 25" stroke="#fffaf0" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {petals.map((a) => (
            <ellipse key={a} cx="24" cy="17.6" rx="2.6" ry="4.4" transform={`rotate(${a} 24 24)`} />
          ))}
          <circle cx="24" cy="24" r="3.6" fill="#e7bc72" stroke="#fffaf0" strokeWidth="1" />
          <circle cx="24" cy="24" r="1.3" fill={deep} />
        </>
      );
    }
    case "besties":
      // Two linked bangles (kangan)
      return (
        <>
          <circle cx="19.5" cy="24" r="7.2" fill="none" stroke="#fffaf0" strokeWidth="2.8" />
          <circle cx="28.5" cy="24" r="7.2" fill="none" stroke="#fffaf0" strokeWidth="2.8" />
          {/* The left bangle passes over the right one at the top */}
          <path d="M24.9 18.9 A7.2 7.2 0 0 1 26.6 30.9" fill="none" stroke={deep} strokeOpacity="0.35" strokeWidth="0.8" />
          <g fill="#e7bc72">
            <circle cx="12.3" cy="24" r="1.3" />
            <circle cx="35.7" cy="24" r="1.3" />
            <circle cx="19.5" cy="16.8" r="1.1" />
            <circle cx="28.5" cy="31.2" r="1.1" />
          </g>
        </>
      );
    case "bro":
      // Gada (mace), as in a desi akhada
      return (
        <>
          <path d="M13.5 36 L23 26.5" stroke="#fffaf0" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M15.2 31.6 L17.9 34.3" stroke={deep} strokeOpacity="0.5" strokeWidth="1" />
          <circle cx="12.6" cy="36.9" r="2" />
          <rect x="21.2" y="25.6" width="5" height="2.6" rx="1" transform="rotate(-45 23.7 26.9)" fill="#e7bc72" />
          <ellipse cx="29.2" cy="20.2" rx="7" ry="8.4" transform="rotate(45 29.2 20.2)" />
          <path d="M23.8 17.4 Q29 15 32 25.6 M26.2 14.6 Q33.2 14 34.6 22.8" stroke={deep} strokeOpacity="0.4" strokeWidth="1" fill="none" />
          <path d="M34.6 14.6 L37.6 11.6" stroke="#fffaf0" strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    case "confidant":
      // Old brass key
      return (
        <>
          <circle cx="18" cy="19" r="6" fill="none" stroke="#fffaf0" strokeWidth="2.8" />
          <circle cx="18" cy="19" r="1.6" />
          <path d="M22.3 23.3 L34 35" stroke="#fffaf0" strokeWidth="3" strokeLinecap="round" />
          <path d="M29.6 30.6 L32.6 27.6 M32.4 33.4 L35.2 30.6" stroke="#fffaf0" strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case "apprentice":
      // Pothi (open book) under a diya flame
      return (
        <>
          <path d="M24 9.5 C21.2 13 21.4 15.6 24 16.8 C26.6 15.6 26.8 13 24 9.5 Z" fill="#ffd27a" />
          <path d="M24 21 Q18 17.5 11.5 19 V33 Q18 31.5 24 35 Z" />
          <path d="M24 21 Q30 17.5 36.5 19 V33 Q30 31.5 24 35 Z" opacity="0.88" />
          <path d="M14.5 23 Q18.5 22 21.5 24 M14.5 27 Q18.5 26 21.5 28 M26.5 24 Q29.5 22 33.5 23 M26.5 28 Q29.5 26 33.5 27" stroke={deep} strokeOpacity="0.5" strokeWidth="0.9" fill="none" />
        </>
      );
    case "sibling":
      // Peepal leaf
      return (
        <>
          <path d="M24 39.5 L23 35 C13 30 10.5 20.5 15.5 15.5 C18.5 12.5 22 13.5 24 16.5 C26 13.5 29.5 12.5 32.5 15.5 C37.5 20.5 35 30 25 35 Z" />
          <path d="M24 17 V36 M24 22 L19 19 M24 22 L29 19 M24 27 L18 24 M24 27 L30 24 M24 31 L20 29.5 M24 31 L28 29.5" stroke={deep} strokeOpacity="0.45" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </>
      );
  }
}
