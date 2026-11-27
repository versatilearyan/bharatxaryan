"use client";

/**
 * Two profile panels from the server, for your own profile and anyone you visit:
 *  - Moments: their latest posts as small tiles (photo, video or text), opening their Moments
 *  - Family: the Parivar they belong to, with their role, the Parivar's level and members, opening it
 */
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Play, UsersRound } from "lucide-react";
import { momentsApi, type Moment } from "@/lib/api/social";
import { parivarApi, type ParivarRole } from "@/lib/api/parivar";
import { FramedPicture } from "@/components/parivar/ParivarFrames";
import { myUserIdFromToken } from "@/lib/auth/token";
import { ME_ID, useApp } from "@/lib/app/store";

function serverUid(personId: string): string | null {
  if (personId === ME_ID) return myUserIdFromToken() ?? null;
  return personId.startsWith("srv-user:") ? personId.slice(9) : null;
}

function Shell({ title, meta, onOpen, children }: { title: string; meta?: ReactNode; onOpen: () => void; children: ReactNode }) {
  return (
    <section className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-[#2c1622]/95 to-[#1b1622]/95 ring-1 ring-gold/15">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 px-4 pt-3.5 text-left">
        <h2 className="font-display text-[16px] font-bold text-cream">{title}</h2>
        {meta ? <span className="text-[12px] font-semibold text-muted">{meta}</span> : null}
        <ChevronRight className="ml-auto h-4 w-4 text-muted" aria-hidden />
      </button>
      <div className="px-4 pb-4 pt-2.5">{children}</div>
    </section>
  );
}

const SHOW = 6;

export function ProfileMomentsPanel({ personId }: { personId: string }) {
  const { push, session } = useApp();
  const uid = serverUid(personId);
  const mine = personId === ME_ID;
  const [items, setItems] = useState<Moment[] | null>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (!uid || !session) return;
    let live = true;
    momentsApi
      .feed("user", { userId: uid, limit: SHOW })
      .then((r) => {
        if (!live) return;
        setItems(r.items);
        setMore(Boolean(r.next));
      })
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [uid, session]);
  if (!uid || !session) return null;
  const open = () => push({ kind: "moments", personId: mine ? "me" : personId });
  return (
    <Shell title="Moments" meta={items?.length ? `${items.length}${more ? "+" : ""}` : undefined} onOpen={open}>
      {items === null ? (
        <div className="flex gap-2">
          {[0, 1, 2].map((k) => (
            <span key={k} className="h-[76px] w-[76px] animate-pulse rounded-2xl bg-cream/[0.06]" />
          ))}
        </div>
      ) : items.length ? (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {items.map((m) => {
            const media = m.media[0];
            return (
              <button key={m.id} type="button" onClick={open} aria-label="Open Moments" className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#4a1626] to-[#1c1824] ring-1 ring-gold/20">
                {media?.type === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : media?.type === "VIDEO" ? (
                  <>
                    <video src={media.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-black/25">
                      <Play className="h-5 w-5 fill-white text-white" aria-hidden />
                    </span>
                  </>
                ) : (
                  <span className="line-clamp-4 block p-2 text-left text-[10.5px] font-semibold leading-snug text-cream/85">{m.body}</span>
                )}
                {m.media.length > 1 ? <span className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 text-[9.5px] font-bold text-white">+{m.media.length - 1}</span> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[12px] text-muted">{mine ? "Abhi koi Moment nahi. Apni pehli photo share karo!" : "Abhi koi Moment nahi."}</p>
      )}
    </Shell>
  );
}

const ROLE_LABEL: Record<ParivarRole, string> = { LEADER: "Mukhiya", DEPUTY: "Up-Mukhiya", ADMIN: "Sahayak", MEMBER: "Sadasya" };
const ROLE_PILL: Record<ParivarRole, string> = {
  LEADER: "from-[#ff6b8a] to-[#ff8fa8]",
  DEPUTY: "from-[#3a8dff] to-[#5fb7ff]",
  ADMIN: "from-[#2fbf86] to-[#58d6a2]",
  MEMBER: "from-[#8a7a6a] to-[#a8957f]",
};

type Family = { id: string; name: string; sign?: string; emblem?: string; color?: string; logoUrl?: string; frame?: string; level?: number; members?: number; capacity?: number; role?: ParivarRole };

export function ProfileFamilyPanel({ personId }: { personId: string }) {
  const { push, session } = useApp();
  const uid = serverUid(personId);
  const mine = personId === ME_ID;
  const [f, setF] = useState<Family | null | undefined>(undefined);
  useEffect(() => {
    if (!uid || !session) return;
    let live = true;
    parivarApi
      .tag(uid)
      .then(async (t) => {
        if (!t?.id) return live && setF(null);
        const base: Family = { id: t.id, name: t.name ?? "Parivar", sign: t.sign, emblem: t.emblem, color: t.color, frame: t.frame, logoUrl: (t as { logoUrl?: string }).logoUrl };
        if (live) setF(base);
        // level, members and their role come from the Parivar's own page
        const p = await parivarApi.profile(t.id).catch(() => null);
        if (!live || !p) return;
        setF({ ...base, logoUrl: p.logoUrl ?? base.logoUrl, level: p.level, members: p.memberCount, capacity: p.capacity, role: p.members.find((m) => m.userId === uid)?.role });
      })
      .catch(() => live && setF(null));
    return () => {
      live = false;
    };
  }, [uid, session]);
  if (!uid || !session) return null;
  const open = () => push(f ? { kind: "parivar", id: f.id } : { kind: "parivar-list" });
  return (
    <Shell title="Family" meta={f?.level ? `Lv ${f.level}` : undefined} onOpen={open}>
      {f === undefined ? (
        <div className="h-14 animate-pulse rounded-xl bg-cream/[0.06]" />
      ) : f ? (
        <button type="button" onClick={open} aria-label={`Open ${f.name}`} className="flex w-full items-center gap-3 text-left">
          <FramedPicture frame={f.frame} size={56}>
            {f.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center" style={{ fontSize: 29, background: `radial-gradient(circle at 30% 25%, ${f.color ?? "#e7bc72"}aa, ${f.color ?? "#e7bc72"}33 70%), #1c1b22` }} aria-hidden>
                {f.emblem}
              </span>
            )}
          </FramedPicture>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate bg-gradient-to-r from-[#fff1c9] via-gold to-[#ffb37a] bg-clip-text font-display text-[17px] font-extrabold text-transparent">{f.name}</span>
              {f.role ? <span className={`shrink-0 rounded-md bg-gradient-to-r px-2 py-0.5 text-[10.5px] font-bold text-white ${ROLE_PILL[f.role]}`}>{ROLE_LABEL[f.role]}</span> : null}
            </span>
            <span className="mt-1 flex items-center gap-2 text-[11.5px] font-semibold text-cream/70">
              {f.sign ? <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10.5px] font-extrabold text-gold">{f.sign}</span> : null}
              {f.members !== undefined ? (
                <span className="inline-flex items-center gap-1">
                  <UsersRound className="h-3.5 w-3.5" aria-hidden /> {f.members}
                  {f.capacity ? `/${f.capacity}` : ""}
                </span>
              ) : null}
            </span>
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted">{mine ? "Abhi kisi Parivar me nahi ho. Join karo ya apna banao." : "Abhi kisi Parivar me nahi."}</p>
          {mine ? (
            <button type="button" onClick={open} className="flex h-9 shrink-0 items-center rounded-full bg-gradient-to-b from-[#f6d899] to-[#d9a84f] px-3.5 text-[12.5px] font-extrabold text-[#2a1a0c]">
              Find Parivar
            </button>
          ) : null}
        </div>
      )}
    </Shell>
  );
}
