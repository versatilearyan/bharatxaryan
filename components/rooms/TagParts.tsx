"use client";

import { motion } from "framer-motion";
import { RelationIcon } from "@/components/art/RelationIcon";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import { relationshipById, tagLevel, tokenById, type Tag } from "@/lib/app/tags";

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
  const badge = Math.round(Math.max(22, Math.min(38, gap * 0.9, size * 0.5)));
  const w = gap + size * 0.5;
  return (
    <span className="relative z-20 flex shrink-0 items-center justify-center" style={{ width: gap, height: size }} aria-label={`${rel.label} tag, level ${lv}`} role="img">
      {/* Ribbons reaching a little under both seats */}
      <svg className="pointer-events-none absolute top-1/2 -translate-y-1/2" style={{ width: w, height: size * 0.5, left: -size * 0.25 }} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`rb-${tag.id}`} x1="0" x2="1">
            <stop offset="0" stopColor={rel.tint} stopOpacity="0" />
            <stop offset="0.3" stopColor={rel.tint} />
            <stop offset="0.7" stopColor={rel.tint} />
            <stop offset="1" stopColor={rel.tint} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 20 Q25 6 50 20 T100 20" fill="none" stroke={`url(#rb-${tag.id})`} strokeWidth="2.2" style={{ filter: `drop-shadow(0 0 3px ${rel.tint})` }} />
        <path d="M0 20 Q25 34 50 20 T100 20" fill="none" stroke={`url(#rb-${tag.id})`} strokeWidth="1.4" opacity="0.7" />
      </svg>
      <motion.span
        className="relative grid place-items-center rounded-full"
        style={{ boxShadow: `0 0 ${badge * 0.6}px ${rel.tint}aa` }}
        animate={lv >= 10 ? { y: [0, -2.5, 0], rotate: [0, 360] } : { y: [0, -2.5, 0] }}
        transition={lv >= 10 ? { duration: 4, repeat: Infinity, ease: "linear" } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        <RelationIcon id={tag.relation} size={badge} />
        {/* Tag Lv 10 perk: the legend badge sparkles */}
        {lv >= 10 ? <span className="absolute -right-1 -top-1 text-[10px]">✨</span> : null}
      </motion.span>
      <span
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 text-[8.5px] font-extrabold leading-[13px] text-white ring-1 ring-white/30"
        style={{ top: `calc(50% + ${badge / 2 - 1}px)`, background: `linear-gradient(90deg, ${rel.deep}, ${rel.tint})` }}
        aria-hidden
      >
        Lv{lv}
      </span>
    </span>
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

/** A compact tag chip: emoji, relationship and level. */
export function TagChip({ tag, className = "" }: { tag: Tag; className?: string }) {
  const rel = relationshipById(tag.relation);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${className}`} style={{ background: `${rel.tint}26`, color: rel.tint }}>
      <RelationIcon id={tag.relation} size={14} /> {rel.label} · Lv{tagLevel(tag.intimacy).level}
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
  const rel = relationshipById(best.relation);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${className}`} style={{ background: `${rel.tint}2a`, color: rel.tint }}>
      <RelationIcon id={best.relation} size={15} /> {tagTitle(best, best.a === personId ? best.b : best.a)}
    </span>
  );
}
