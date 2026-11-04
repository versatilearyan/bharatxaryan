"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { RelationIcon } from "@/components/art/RelationIcon";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import { relationshipById, tagColors, tagLevel, tokenById, type Tag } from "@/lib/app/tags";

/** "Kabir's Bestie": the nameplate for someone's tag partner. */
export function useTagTitle() {
  const person = usePeople();
  const { profile } = useApp();
  return (tag: Tag, ownerId: string) => {
    const name = ownerId === ME_ID ? profile.name : person(ownerId).name;
    return `${name}'s ${relationshipById(tag.relation).one}`;
  };
}

/**
 * The tag link between two seats when tagged people sit beside each other:
 * a glowing double ribbon in the relationship's colour, the relationship badge
 * floating in the middle and a small level plate under it.
 */
export function TagLink({ tag, gap, size }: { tag: Tag; gap: number; size: number }) {
  const rel = relationshipById(tag.relation);
  const lv = tagLevel(tag.intimacy).level;
  const icon = Math.round(Math.max(18, Math.min(28, gap * 0.78, size * 0.4)));
  const w = gap + size * 0.3;
  const gid = `tl-${tag.id}`;
  return (
    <span className="relative z-20 flex shrink-0 items-center justify-center" style={{ width: gap, height: size }} aria-label={`${rel.label} tag, level ${lv}`} role="img">
      {/* One thin gold swoosh running through the badge, fading at both ends */}
      <svg className="pointer-events-none absolute top-1/2 -translate-y-1/2" style={{ width: w, height: icon * 1.2, left: -size * 0.15 }} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" x2="1">
            <stop offset="0" stopColor="#ffd98a" stopOpacity="0" />
            <stop offset="0.25" stopColor="#ffd98a" />
            <stop offset="0.75" stopColor="#f5b54a" />
            <stop offset="1" stopColor="#f5b54a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M2 26 C14 10 30 8 46 17 C60 25 76 34 98 25" fill="none" stroke={`url(#${gid})`} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <motion.span className="relative grid place-items-center" animate={{ y: [0, -2, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} aria-hidden>
        <BffBadge id={tag.relation} size={icon} />
        {/* Tag Lv 10 perk: the badge sparkles */}
        {lv >= 10 ? <span className="absolute -right-2 -top-1.5 text-[9px]">✨</span> : null}
      </motion.span>
    </span>
  );
}

/**
 * The BFF badge for each tag type: polished gold with a coloured gem, a shine
 * that sweeps across it and two little sparkles. A bow for Besties, a rakhi for
 * Bro/Sis, a gada for Bro, a key for Confidant, a diya for Apprentice and a
 * clover for Sibling.
 */
export function BffBadge({ id, size = 24, still = false }: { id: Tag["relation"]; size?: number; still?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const gold = `url(#bg-${uid})`;
  const shine = `url(#bs-${uid})`;
  const gemTint: Record<Tag["relation"], [string, string]> = {
    besties: ["#ffb3cf", "#e0306f"],
    brosis: ["#ff9a8a", "#c8231b"],
    bro: ["#a9d2ff", "#1f5fd1"],
    confidant: ["#d9c2ff", "#6a33d6"],
    apprentice: ["#ffe08a", "#e2621b"],
    sibling: ["#aef0c6", "#159a52"],
  };
  const [g1, g2] = gemTint[id];
  // The gold body as plain shapes, drawn twice: once in gold, once as the moving shine
  const body = (paint: string, outline: boolean) => {
    const o = outline ? { stroke: "#6e420e", strokeWidth: 1.1, strokeLinejoin: "round" as const } : {};
    switch (id) {
      case "besties":
        return (
          <>
            <path d="M12 11 C8.2 3.6 1.6 4.6 2.1 9.8 C2.6 14.4 7.8 13.6 12 11 Z" fill={paint} {...o} />
            <path d="M12 11 C15.8 3.6 22.4 4.6 21.9 9.8 C21.4 14.4 16.2 13.6 12 11 Z" fill={paint} {...o} />
            <path d="M10.8 12 L6.8 20.4 L9.4 19.7 L10.6 22 L12.4 12.8 Z" fill={paint} {...o} />
            <path d="M13.2 12 L17.2 20.4 L14.6 19.7 L13.4 22 L11.6 12.8 Z" fill={paint} {...o} />
            <path d="M5 8.6 Q7.6 8 10 10.4 M19 8.6 Q16.4 8 14 10.4" fill="none" stroke="#a8691a" strokeWidth=".7" opacity={outline ? 1 : 0} />
          </>
        );
      case "brosis":
        return (
          <>
            {Array.from({ length: 8 }, (_, i) => (
              <ellipse key={i} cx="12" cy="6.4" rx="2.3" ry="3.6" transform={`rotate(${i * 45} 12 12)`} fill={paint} {...o} />
            ))}
            <circle cx="12" cy="12" r="4.3" fill={paint} {...o} />
          </>
        );
      case "bro":
        return (
          <>
            <rect x="2.6" y="15.2" width="11" height="2.8" rx="1.4" transform="rotate(-45 8.1 16.6)" fill={paint} {...o} />
            <rect x="9.6" y="12" width="3.4" height="3.6" rx=".8" transform="rotate(-45 11.3 13.8)" fill={paint} {...o} />
            <ellipse cx="15.6" cy="8.4" rx="5.2" ry="6.4" transform="rotate(45 15.6 8.4)" fill={paint} {...o} />
            <path d="M20.2 3.8 L22 2" stroke={paint} strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case "confidant":
        return (
          <>
            <circle cx="8" cy="8.4" r="5.6" fill={paint} {...o} />
            <rect x="9.4" y="13.6" width="12.4" height="3" rx="1.2" transform="rotate(45 15.6 15.1)" fill={paint} {...o} />
            <rect x="15.6" y="15.6" width="3.6" height="2.4" rx=".6" transform="rotate(-45 17.4 16.8)" fill={paint} {...o} />
            <rect x="17.8" y="17.8" width="3.6" height="2.4" rx=".6" transform="rotate(-45 19.6 19)" fill={paint} {...o} />
          </>
        );
      case "apprentice":
        return (
          <>
            <path d="M2.6 12.4 H21.4 C20.8 17.6 17 20 12 20 C7 20 3.2 17.6 2.6 12.4 Z" fill={paint} {...o} />
            <path d="M8.4 19.6 L7.2 22 H16.8 L15.6 19.6 Z" fill={paint} {...o} />
            <path d="M18.6 12.6 Q22.6 11.4 22.4 9.2" fill="none" stroke={paint} strokeWidth="1.6" strokeLinecap="round" />
          </>
        );
      default:
        return (
          <>
            {[0, 90, 180, 270].map((r) => (
              <path key={r} d="M12 11.4 C8.2 8 8.6 3 12 3 C15.4 3 15.8 8 12 11.4 Z" transform={`rotate(${r} 12 11.4)`} fill={paint} {...o} />
            ))}
            <path d="M12.4 12 Q13.6 17.4 16.6 21.4" fill="none" stroke={paint} strokeWidth="1.8" strokeLinecap="round" />
          </>
        );
    }
  };
  // Where the gem sits on each badge
  const gem: Record<Tag["relation"], [number, number, number]> = {
    besties: [12, 11, 2.6],
    brosis: [12, 12, 2.6],
    bro: [15.6, 8.4, 2.2],
    confidant: [8, 8.4, 2.6],
    apprentice: [12, 15.6, 1.9],
    sibling: [12, 11.4, 2],
  };
  const [gx, gy, gr] = gem[id];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0 overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#fff8dc" />
          <stop offset="0.35" stopColor="#ffd56a" />
          <stop offset="0.62" stopColor="#f0a82e" />
          <stop offset="0.82" stopColor="#ffd77a" />
          <stop offset="1" stopColor="#b8741c" />
        </linearGradient>
        <linearGradient id={`bs-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0.38" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.62" stopColor="#fff" stopOpacity="0" />
          {still ? null : <animateTransform attributeName="gradientTransform" type="translate" values="-30 -30; 30 30; 30 30" keyTimes="0; 0.55; 1" dur="3s" repeatCount="indefinite" />}
        </linearGradient>
        <radialGradient id={`bm-${uid}`} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.25" stopColor={g1} />
          <stop offset="1" stopColor={g2} />
        </radialGradient>
        <linearGradient id={`bf-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset="0.45" stopColor="#ffc23a" />
          <stop offset="1" stopColor="#ff5a1f" />
        </linearGradient>
      </defs>
      {id === "brosis" ? <path d="M0.6 14 Q5 10.6 12 12 Q19 10.6 23.4 14" fill="none" stroke="#e2483d" strokeWidth="1.3" strokeLinecap="round" /> : null}
      {/* Soft dark edge so the gold reads on any background */}
      <g style={{ filter: "drop-shadow(0 1px 1px rgb(60 30 0 / 0.55))" }}>{body(gold, true)}</g>
      {body(shine, false)}
      {id === "apprentice" ? (
        <motion.path
          d="M12 2 C15 5.6 15.2 8.4 12 10.8 C8.8 8.4 9 5.6 12 2 Z"
          fill={`url(#bf-${uid})`}
          stroke="#c4421a"
          strokeWidth=".7"
          style={{ transformOrigin: "12px 10.8px" }}
          animate={still ? undefined : { scaleY: [1, 1.12, 0.95, 1], scaleX: [1, 0.94, 1.04, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      {/* Gem */}
      <circle cx={gx} cy={gy} r={gr} fill={`url(#bm-${uid})`} stroke="#6e420e" strokeWidth=".7" />
      <circle cx={gx - gr * 0.35} cy={gy - gr * 0.38} r={gr * 0.28} fill="#fff" opacity=".9" />
      {/* Sparkles */}
      {[
        [21.4, 3.2, 1.5, 0],
        [2.6, 19.8, 1.1, 1.2],
      ].map(([x, y, r, d], i) => (
        <motion.path
          key={i}
          d={`M${x} ${y - r * 2} L${x + r * 0.45} ${y - r * 0.45} L${x + r * 2} ${y} L${x + r * 0.45} ${y + r * 0.45} L${x} ${y + r * 2} L${x - r * 0.45} ${y + r * 0.45} L${x - r * 2} ${y} L${x - r * 0.45} ${y - r * 0.45} Z`}
          fill="#fffbe6"
          style={{ transformOrigin: `${x}px ${y}px` }}
          animate={still ? undefined : { opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, delay: d, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

/** Two avatars joined by their tag token, as on a tag card. */
export function TagPairArt({ tag, size = 64 }: { tag: Tag; size?: number }) {
  const person = usePeople();
  const rel = relationshipById(tag.relation);
  const token = tokenById(tag.token);
  return (
    <div className="relative flex items-center justify-center" style={{ height: size + 8 }}>
      <span className="absolute inset-x-6 top-1/2 h-[55%] -translate-y-1/2 rounded-full" style={{ background: `linear-gradient(90deg, ${rel.tint}22, ${rel.tint}66, ${rel.tint}22)` }} aria-hidden />
      <span className="relative z-10 rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${rel.tint}, #e7bc72)` }}>
        <PersonAvatar person={{ ...person(tag.a), frame: "none" }} size={size} />
      </span>
      <motion.span
        className="relative z-20 -mx-2 grid place-items-center rounded-full"
        style={{ boxShadow: `0 0 18px ${rel.tint}aa` }}
        animate={{ rotate: [-6, 6, -6] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        <RelationIcon id={tag.relation} size={Math.round(size * 0.6)} />
        <span className="absolute -bottom-1 -right-1.5 grid place-items-center rounded-full bg-[#1c1b22] ring-1 ring-white/20" style={{ width: size * 0.3, height: size * 0.3, fontSize: size * 0.17 }} title={token.label}>
          {token.emoji}
        </span>
      </motion.span>
      <span className="relative z-10 rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, #e7bc72, ${rel.tint})` }}>
        <PersonAvatar person={{ ...person(tag.b), frame: "none" }} size={size} />
      </span>
    </div>
  );
}

/**
 * A compact tag chip: badge, relationship (or pet name) and level, in the
 * tag's theme with a gold edge and a shine that passes now and then.
 */
export function TagChip({ tag, className = "" }: { tag: Tag; className?: string }) {
  const rel = relationshipById(tag.relation);
  const c = tagColors(tag);
  const lv = tagLevel(tag.intimacy).level;
  return (
    <span className={`relative inline-flex overflow-hidden rounded-full p-[1px] ${className}`} style={{ background: `linear-gradient(90deg, #ffe3a3, ${c.from}, #e7bc72)` }}>
      <span className="relative inline-flex items-center gap-1 overflow-hidden rounded-full py-0.5 pl-1 pr-2 text-[10.5px] font-extrabold text-white" style={{ background: `linear-gradient(90deg, ${c.to}, ${c.from})` }}>
        <BffBadge id={tag.relation} size={14} />
        <span className="max-w-[110px] truncate">{tag.nickname || rel.label}</span>
        <span className="rounded-full bg-black/25 px-1 text-[9.5px]">Lv{lv}</span>
        <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 -left-6 w-5 -skew-x-12 bg-white/35" animate={{ x: [0, 180] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }} />
      </span>
    </span>
  );
}

/** A person's tags as a row of partner avatars, opening their intimate space. */
export function TagStrip({ personId, onOpen, light = false }: { personId: string; onOpen: () => void; light?: boolean }) {
  const { tagsOf } = useApp();
  const person = usePeople();
  const tags = [...tagsOf(personId)].sort((x, y) => y.intimacy - x.intimacy);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mt-3 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left ${light ? "bg-gradient-to-r from-[#fbeaff] to-[#fff1f4]" : "bg-white/[0.05] ring-1 ring-white/10"}`}
      aria-label={`Intimate space, ${tags.length} tags`}
    >
      <span className={`text-[12px] font-extrabold ${light ? "text-[#7a3fa8]" : "text-cream"}`}>Intimate space</span>
      <span className="flex flex-1 items-center justify-end gap-1.5">
        {tags.slice(0, 3).map((t) => {
          const rel = relationshipById(t.relation);
          const partner = t.a === personId ? t.b : t.a;
          return (
            <span key={t.id} className="relative" title={`${rel.label} · Lv${tagLevel(t.intimacy).level}`}>
              <PersonAvatar person={{ ...person(partner), frame: "none" }} size={28} />
              <span className="absolute -bottom-1 -right-1.5" aria-hidden>
                <RelationIcon id={t.relation} size={15} />
              </span>
            </span>
          );
        })}
        {tags.length === 0 ? <span className={`text-[11.5px] ${light ? "text-[#a5a3bd]" : "text-muted"}`}>No tags yet</span> : null}
        <span className={`ml-1 text-[14px] ${light ? "text-[#a5a3bd]" : "text-muted"}`} aria-hidden>
          ›
        </span>
      </span>
    </button>
  );
}

/** Tag Lv 3 perk: the person's strongest tag title, like "Kabir's Bestie". */
export function TagTitleChip({ personId, className = "" }: { personId: string; className?: string }) {
  const { tagsOf } = useApp();
  const tagTitle = useTagTitle();
  const best = [...tagsOf(personId)].sort((x, y) => y.intimacy - x.intimacy).find((t) => tagLevel(t.intimacy).level >= 3);
  if (!best) return null;
  const c = tagColors(best);
  const title = tagTitle(best, best.a === personId ? best.b : best.a);
  return (
    <span className={`relative inline-flex overflow-hidden rounded-full p-[1px] ${className}`} style={{ background: `linear-gradient(90deg, #ffe3a3, ${c.from}, #e7bc72)` }}>
      <span className="relative inline-flex items-center gap-1 overflow-hidden rounded-full py-0.5 pl-1 pr-2 text-[11px] font-extrabold text-white" style={{ background: `linear-gradient(90deg, ${c.to}, ${c.from})` }}>
        <BffBadge id={best.relation} size={15} />
        <span className="max-w-[160px] truncate">{best.nickname ? `${title} · “${best.nickname}”` : title}</span>
        <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 -left-6 w-5 -skew-x-12 bg-white/35" animate={{ x: [0, 240] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }} />
      </span>
    </span>
  );
}
