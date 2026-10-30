import { useId } from "react";
import { relationshipById, type RelationshipId } from "@/lib/app/tags";

/**
 * Relationship badges for tags: a glossy round gem in the relationship's colour
 * with a gold rim and a white symbol, drawn in a 48×48 box.
 */
export function RelationIcon({ id, size = 24, className = "" }: { id: RelationshipId; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const rel = relationshipById(id);
  const g = (n: string) => `${n}-${uid}`;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={`shrink-0 overflow-visible ${className}`} aria-hidden>
      <defs>
        <radialGradient id={g("body")} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.35" stopColor={rel.tint} />
          <stop offset="1" stopColor={rel.deep} />
        </radialGradient>
        <linearGradient id={g("rim")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="0.5" stopColor="#e7bc72" />
          <stop offset="1" stopColor="#9c6a2a" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22.5" fill={`url(#${g("rim")})`} />
      <circle cx="24" cy="24" r="20" fill={`url(#${g("body")})`} />
      <g fill="#fff" stroke="none" style={{ filter: `drop-shadow(0 1px 1.5px ${rel.deep})` }}>
        {glyph(id)}
      </g>
      {/* Gloss */}
      <path d="M9 18 Q12 8 24 6 Q16 11 13 20 Z" fill="#fff" opacity="0.45" />
    </svg>
  );
}

function glyph(id: RelationshipId) {
  switch (id) {
    case "brosis":
      // Two hearts, side by side
      return (
        <>
          <path d="M17 33 C9 27 9 19 14 18 C16.5 17.5 18 19 18.5 20.5 C19 19 20.5 17.5 23 18 C26.5 19 26 26 17 33 Z" opacity="0.95" />
          <path d="M31 31 C24.5 26 24.5 19.5 28.5 18.8 C30.4 18.4 31.6 19.6 32 20.8 C32.4 19.6 33.6 18.4 35.5 18.8 C39.5 19.5 39.5 26 31 31 Z" opacity="0.8" />
        </>
      );
    case "besties":
      // Bow
      return (
        <>
          <path d="M24 24 L12 16 Q9 15 9.5 19 L10.5 29 Q11 32 14 30.5 Z" />
          <path d="M24 24 L36 16 Q39 15 38.5 19 L37.5 29 Q37 32 34 30.5 Z" />
          <rect x="20.5" y="20.5" width="7" height="7" rx="2.5" />
          <path d="M22 27 L19 37 L22.5 35.5 L24 38 L25.5 35.5 L29 37 L26 27 Z" opacity="0.9" />
        </>
      );
    case "bro":
      // Lightning bolt on a shield
      return (
        <>
          <path d="M24 9 L36 13.5 V23 Q36 33 24 39 Q12 33 12 23 V13.5 Z" opacity="0.28" />
          <path d="M26.5 12 L17 26 H23 L21 36 L31 21.5 H25 Z" />
        </>
      );
    case "confidant":
      // Puzzle piece
      return (
        <path d="M14 17 H20 Q19 12.5 23 12.5 Q27 12.5 26 17 H33 V23.5 Q37.5 22.5 37.5 26.5 Q37.5 30.5 33 29.5 V36 H26.5 Q27.5 31.5 23.5 31.5 Q19.5 31.5 20.5 36 H14 V29.5 Q18.5 30.5 18.5 26.5 Q18.5 22.5 14 23.5 Z" />
      );
    case "apprentice":
      // Graduation cap
      return (
        <>
          <path d="M24 13 L40 20 L24 27 L8 20 Z" />
          <path d="M15 23.5 V30 Q24 36 33 30 V23.5 L24 27.5 Z" opacity="0.9" />
          <path d="M38 20.5 V29" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="38" cy="30.5" r="1.9" />
        </>
      );
    case "sibling":
      // Four-leaf clover
      return (
        <>
          <circle cx="19.5" cy="19.5" r="5.5" />
          <circle cx="28.5" cy="19.5" r="5.5" />
          <circle cx="19.5" cy="28.5" r="5.5" />
          <circle cx="28.5" cy="28.5" r="5.5" />
          <path d="M26 30 Q29 35 33 38" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      );
  }
}
