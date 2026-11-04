"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cpApi, type CpCouple, type CpPerson } from "@/lib/api/cp";
import { ME_ID, useApp } from "@/lib/app/store";
import { myUserIdFromToken } from "@/lib/auth/token";
import { CpRing } from "@/components/market/CpRing";
import { BffBadge } from "./TagParts";
import { relationshipById, tagLevel } from "@/lib/app/tags";

/**
 * CP and BFF tags for people in a room, from the server. Each person is
 * looked up at most once a minute however many seats and cards show them.
 */
type CpInfo = { coupleId: string; ring: string; partner: CpPerson; level: number; blessings: number } | null;

const cps = new Map<string, { at: number; value: CpInfo | undefined }>();
const tagsLoadedAt = new Map<string, number>();
const listeners = new Set<() => void>();
let version = 0;
const changed = () => {
  version++;
  listeners.forEach((l) => l());
};

function userIdOf(personId: string) {
  if (personId === ME_ID) return myUserIdFromToken() ?? null;
  return personId.startsWith("srv-user:") ? personId.slice(9) : null;
}

function toInfo(c: CpCouple | null, uid: string): CpInfo {
  if (!c) return null;
  const partnerId = c.a === uid ? c.b : c.a;
  return { coupleId: c.id, ring: c.ring, partner: c.people[partnerId] ?? { userId: partnerId, name: "Partner" }, level: c.level, blessings: c.blessings };
}

function loadCp(personId: string) {
  const uid = userIdOf(personId);
  if (!uid) return;
  const hit = cps.get(personId);
  if (hit && Date.now() - hit.at < 60_000) return;
  cps.set(personId, { at: Date.now(), value: hit?.value });
  (personId === ME_ID ? cpApi.mine() : cpApi.of(uid))
    .then((c) => {
      cps.set(personId, { at: Date.now(), value: toInfo(c, uid) });
      changed();
    })
    .catch(() => undefined);
}

/** Forget a person's CP (after it changes) so the next look asks the server again. */
export function forgetRoomCp(personId?: string) {
  if (personId) cps.delete(personId);
  else cps.clear();
  changed();
}

/** This person's CP (partner, ring) from the server; undefined while loading. Also loads their BFF tags. */
export function useRoomSocial(personId: string | null | undefined): CpInfo | undefined {
  const { loadServerTags, session } = useApp();
  const id = personId ?? "";
  useEffect(() => {
    if (!id || !session || !userIdOf(id)) return;
    loadCp(id);
    const last = tagsLoadedAt.get(id) ?? 0;
    if (Date.now() - last > 60_000) {
      tagsLoadedAt.set(id, Date.now());
      void loadServerTags(id === ME_ID ? "me" : id);
    }
  }, [id, session, loadServerTags]);
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
    () => 0,
  );
  return id ? cps.get(id)?.value : undefined;
}

/** The person's strongest BFF tag as a small badge beside their seat name (Besties, Bro, …). */
export function SeatTagBadge({ personId, size = 14 }: { personId: string; size?: number }) {
  const { tagsOf } = useApp();
  const best = [...tagsOf(personId)].sort((x, y) => y.intimacy - x.intimacy)[0];
  if (!best) return null;
  const rel = relationshipById(best.relation);
  return (
    <span className="mr-0.5 inline-block align-[-2px]" title={`${best.nickname || rel.label} · Lv ${tagLevel(best.intimacy).level}`} aria-label={`${rel.label} tag`}>
      <BffBadge id={best.relation} size={size} still />
    </span>
  );
}

/** A small CP ring beside a seat's name. */
export function SeatCpRing({ personId, size = 14 }: { personId: string; size?: number }) {
  const cp = useRoomSocial(personId);
  if (!cp) return null;
  return (
    <span className="mr-0.5 inline-block align-[-2px]" title={`CP with ${cp.partner.name}`} aria-label={`CP with ${cp.partner.name}`}>
      <CpRing id={cp.ring} size={size} />
    </span>
  );
}

function PartnerFace({ p, size }: { p: CpPerson; size: number }) {
  return p.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.avatarUrl} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-full bg-gradient-to-br from-[#ff7fa8] to-[#b0245a] font-display font-extrabold text-white" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {p.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** "His/Her CP" on the room profile card: the words and the partner's photo, opening their Love Home. */
export function CardCpPill({ personId, gender, onOpen, className = "" }: { personId: string; gender?: string; onOpen: () => void; className?: string }) {
  const cp = useRoomSocial(personId);
  if (!cp) return null;
  const whose = personId === ME_ID ? "My CP" : gender === "male" ? "His CP" : gender === "female" ? "Her CP" : "His/Her CP";
  return (
    <button type="button" onClick={onOpen} aria-label={`${whose}: ${cp.partner.name}. Open Love Home`} className={`flex items-center rounded-l-full bg-black/45 py-1 pl-3.5 backdrop-blur ${className}`}>
      <span className="pr-2 font-display text-[14px] font-extrabold text-white drop-shadow">{whose}</span>
      <span className="rounded-full ring-2 ring-white/80">
        <PartnerFace p={cp.partner} size={44} />
      </span>
    </button>
  );
}

/**
 * The CP pill on a profile banner: a grey glass pill with the ring spilling
 * over its left end, "Blessing" and the count, and the partner's photo bigger
 * than the pill on the right. Opens the couple's Love Home.
 */
export function ProfileCpPill({ personId, onOpen, className = "" }: { personId: string; onOpen: () => void; className?: string }) {
  const cp = useRoomSocial(personId);
  if (!cp) return null;
  return (
    <button type="button" onClick={onOpen} aria-label={`CP with ${cp.partner.name}, ${cp.blessings} blessings. Open Love Home`} className={`group flex h-[54px] items-center ${className}`}>
      <span className="relative flex h-[46px] items-center rounded-l-full bg-[#4a4a56]/75 pl-[52px] pr-9 shadow-[0_4px_14px_rgb(0_0_0/0.35)] ring-1 ring-white/10 backdrop-blur-md">
        <span className="pointer-events-none absolute -left-1 top-1/2 -translate-y-1/2 drop-shadow-[0_2px_6px_rgb(0_0_0/0.45)]">
          <CpRing id={cp.ring} size={56} />
        </span>
        <span className="flex flex-col items-center leading-[1.15]">
          <span className="font-display text-[15px] font-extrabold tracking-wide text-white drop-shadow">Blessing</span>
          <span className="font-display text-[15px] font-extrabold text-white drop-shadow">{cp.blessings.toLocaleString("en-IN")}</span>
        </span>
      </span>
      <span className="relative -ml-7 rounded-full shadow-[0_4px_14px_rgb(0_0_0/0.4)] ring-[2.5px] ring-white transition-transform group-active:scale-95">
        <PartnerFace p={cp.partner} size={54} />
      </span>
    </button>
  );
}
