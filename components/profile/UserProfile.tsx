"use client";

import { useGiftsReceived } from "./useGiftsReceived";
import { friendsApi, type FollowStatus } from "@/lib/api/social";
import { cpApi, daysOf, type CpCouple } from "@/lib/api/cp";
import { ServerProposeSheet, useCpEvents } from "@/components/market/ServerCp";
import { CpRing } from "@/components/market/CpRing";
import { ProfileCpPill } from "@/components/rooms/RoomSocial";
import { myUserIdFromToken } from "@/lib/auth/token";
import { CpBannerPill } from "@/components/market/CpParts";
import { SvgaAnim, preloadSvga, warnSvga } from "@/components/effects/SvgaAnim";
import { VipAvatar, VipBadge, VipEntryBanner } from "@/components/effects/VipFx";
import type { EffectSet } from "@/lib/app/effects";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Copy, Gift, Lock, MessageCircle, Shield, ShieldCheck, UserPlus } from "lucide-react";
import { GiftArt } from "@/components/art/GiftArt";
import { RingArt } from "@/components/art/RingArt";
import { RelationIcon } from "@/components/art/RelationIcon";
import { SunsetScene } from "@/components/art/SunsetScene";
import { RoomCover } from "@/components/rooms/RoomCover";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CharmBadge } from "@/components/ui/CharmBadge";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin, ScreenHeader, formatCount } from "@/components/ui/kit";
import { GIFTS, GIFTS_LIVE, GIFTS_SOON_TEXT, PEOPLE, giftById } from "@/lib/app/data";
import { ComingSoonBadge, SoonTag } from "@/components/ui/ComingSoonBadge";
import { usePeople } from "@/lib/app/people";
import { expToNext } from "@/lib/app/progress";
import { PROPOSAL_LINES, daysTogether, loveLevel, partnerIn, type RingId } from "@/lib/app/market";
import { useMarket } from "@/lib/app/market-store";
import { ME_ID, useApp } from "@/lib/app/store";
import { useMe } from "@/lib/app/me-store";
import { GUARD_PER_DAY, giftStars, giftWallStats, seeded } from "@/lib/app/social";
import { partnerOf, relationshipById, tagLevel, type Tag } from "@/lib/app/tags";
import type { GiftId, Room } from "@/lib/app/types";
import { nameFace, nameTone } from "@/lib/app/fonts";
import { ParivarEmblem, ParivarTag } from "@/components/parivar/ParivarScreens";
import { PARIVAR_ENABLED, ROLE_LABEL, parivarLevel } from "@/lib/app/parivar";
import { useParivar } from "@/lib/app/parivar-store";
import { LevelPill } from "@/components/profile/IdTags";
import { usePublicProfile } from "@/components/profile/usePublicProfile";
import { useProfileFx } from "@/components/profile/useProfileFx";

const THEMES = ["dusk", "rose", "night", "ember", "gold", "monsoon"] as const;

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** A titled card on the profile; the header opens its page. */
function Panel({ title, meta, onOpen, children }: { title: string; meta?: ReactNode; onOpen: () => void; children: ReactNode }) {
  return (
    <section className="mx-4 mt-3 rounded-2xl bg-surface ring-1 ring-line">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 px-4 pt-3.5 text-left">
        <h2 className="font-display text-[16px] font-bold text-cream">{title}</h2>
        {meta ? <span className="text-[12px] font-semibold text-muted">{meta}</span> : null}
        <ChevronRight className="ml-auto h-4 w-4 text-muted" aria-hidden />
      </button>
      <div className="px-4 pb-4 pt-2.5">{children}</div>
    </section>
  );
}

/**
 * The VIP entry animation (SVGA, through VipEntryBanner and SvgaAnim), played
 * once each time a profile is opened: it waits for the file, slides in over the
 * banner, and goes after about 5 s. Re-renders and data reloads don't replay it
 * (the parent keys it by person). A file that can't be loaded is skipped.
 */
function ProfileEntry({ src, name, avatar }: { src: EffectSet; name: string; avatar: ReactNode }) {
  const [show, setShow] = useState(false);
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    let cancelled = false;
    preloadSvga(src.entry)
      .then(() => !cancelled && setShow(true))
      .catch((e) => warnSvga(src.entry, e));
    return () => {
      cancelled = true;
      played.current = false;
    };
    // Once per opening, for the entry this profile had when it first had one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setShow(false), 4800);
    return () => window.clearTimeout(t);
  }, [show]);
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="pointer-events-none absolute right-2 top-[104px] z-20 w-[60%] max-w-[240px]"
          initial={{ x: "110%" }}
          animate={{ x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 28 }}
          role="status"
        >
          <VipEntryBanner set={src} avatar={avatar}>
            <span className="text-[#ffe08a]">{name}</span> entered
          </VipEntryBanner>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Banner, avatar, name, level, VIP, charm, ID and bio. */
export function ProfileHero({ personId, topLeft, topRight, vipFresh = true }: { personId: string; topLeft?: ReactNode; topRight?: ReactNode; vipFresh?: boolean }) {
  const { profile, toast, push, session } = useApp();
  const person = usePeople();
  const p = person(personId);
  // VIP cosmetics from this person's own profile response (yours: GET /users/me; theirs: GET /users/{id}/profile)
  const fx = useProfileFx(personId, p.vip, vipFresh);
  const mine = personId === ME_ID;
  // A banner that fails to load falls back to the illustration
  const [brokenBanner, setBrokenBanner] = useState<string | null>(null);
  const bannerUrl = mine ? profile.banner : p.banner;
  const bannerSrc = bannerUrl && bannerUrl !== brokenBanner ? bannerUrl : undefined;
  // Your level and charm are the backend's (GET /users/me/stats) once loaded: usePeople and CharmBadge read them
  const level = p.level;
  return (
    <div className="relative">
      {fx.page ? (
        // The profile effect: a phone-shaped animation as wide as the screen, laid over the top of the profile.
        // Taps go through it; the top buttons stay above it.
        <SvgaAnim src={fx.page.page} className="pointer-events-none absolute inset-x-0 top-0 z-[5] w-full" style={{ aspectRatio: fx.page.pageRatio }} />
      ) : null}
      {fx.entry ? <ProfileEntry key={personId} src={fx.entry} name={mine ? profile.name : p.name} avatar={<PersonAvatar person={{ ...p, frame: "none" }} size={64} className="!h-full !w-full" />} /> : null}
      <div className="relative h-[168px]">
        {bannerSrc ? (
          <img src={bannerSrc} alt={mine ? "Your banner" : `${p.name}'s banner`} className="h-full w-full object-cover" onError={() => setBrokenBanner(bannerSrc)} />
        ) : (
          <SunsetScene theme={mine ? "dusk" : THEMES[Math.floor(seeded(`${personId}:banner`) * THEMES.length)]} motif={mine ? "banyan" : "lanterns"} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/20 to-ink" />
        {/* Their CP: ring, blessings and partner, opening the couple's Love Home */}
        {session && (personId === ME_ID || personId.startsWith("srv-user:")) ? (
          <ProfileCpPill personId={personId} onOpen={() => push({ kind: "love-home", personId })} className="absolute bottom-3 right-3 z-10" />
        ) : (
          <CpBannerPill personId={personId} variant="profile" onOpen={() => push({ kind: "love-home", personId })} className="absolute bottom-3 right-3 z-10" />
        )}
        <div className="pt-safe absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
          <span>{topLeft}</span>
          <span>{topRight}</span>
        </div>
      </div>
      <div className="relative -mt-14 px-4">
        <VipAvatar
          frame={fx.frame}
          size={96}
          framedStyle={(drop) => ({ marginLeft: 24, marginBottom: drop + 8 })}
          render={(s, framed) => (framed ? <PersonAvatar person={{ ...p, frame: "none" }} size={s} className="rounded-full" /> : <PersonAvatar person={p} size={s} className="rounded-full ring-4 ring-ink" />)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className={`font-display text-[26px] font-extrabold ${nameTone(p.vip)}`} style={nameFace(p.nameFont)}>{p.name}</h1>
          {fx.badge ? <VipBadge set={fx.badge} level={p.vip ?? (fx.badge.level || undefined)} size={22} animated /> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {level !== null ? <LevelPill level={level} gender={p.gender} exact={mine} /> : null}
          <CharmBadge personId={personId} size="md" showCount />
          <ParivarTag personId={personId} className="!text-[11px]" />
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(p.uid).catch(() => {});
            toast(`ID ${p.uid} copied`);
          }}
          className="mt-0.5 flex items-center gap-1 text-[12.5px] text-muted hover:text-cream"
          aria-label={`User ID ${p.uid}, copy`}
        >
          {p.handle} · ID {p.uid} <Copy className="h-3 w-3" aria-hidden />
        </button>
        <p className={`mt-3 text-[14px] leading-relaxed ${p.bio ? "text-cream/85" : "text-muted"}`}>{p.bio || (mine ? "Add a bio so people know what you're about." : "No bio yet.")}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile body (same for every user)                                  */
/* ------------------------------------------------------------------ */

/** Numbers, level, guard, BFF, gifts and rooms. Used for your own Profile tab and everyone else's. */
export function UserProfileBody({ personId }: { personId: string }) {
  const app = useApp();
  const { push, receivedOf, tagsOf, guardiansOf, charmOf, protect, protectedToday, profile } = app;
  const person = usePeople();
  const p = person(personId);
  const mine = personId === ME_ID;
  const serverGifts = useGiftsReceived(personId);
  const received = serverGifts ? serverGifts.gifts : receivedOf(personId);
  const wall = giftWallStats(received);
  // Backend users: their BFF tags come from the server
  const { loadServerTags } = useApp();
  useEffect(() => {
    if (personId === "me" || personId.startsWith("srv-user:")) void loadServerTags(personId);
  }, [personId, loadServerTags]);
  const tags = [...tagsOf(personId)].sort((x, y) => y.intimacy - x.intimacy);
  const guards = guardiansOf(personId);
  const guardTotal = guards.reduce((a, g) => a + g.value, 0);
  const rooms = useUserRooms(personId);
  const roomList = [rooms.mine, ...rooms.joined].filter((r): r is Room => Boolean(r));
  const topGifts = GIFTS.filter((g) => (received[g.id] ?? 0) > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
  const done = protectedToday(personId);
  const myStats = useMe().stats;
  const stat = (n: number | undefined) => (n === undefined ? (myStats.loading ? "…" : "—") : formatCount(n));

  return (
    <div className="pb-2">
      {/* Numbers */}
      <button type="button" onClick={() => push({ kind: "stats", personId })} className="mx-4 mt-4 grid w-[calc(100%-2rem)] grid-cols-4 rounded-2xl bg-surface py-3 ring-1 ring-line" aria-label="Open stats">
        {[
          ["Charm", mine ? stat(myStats.data?.charmPoints) : formatCount(charmOf(personId).points)],
          ["Guard", formatCount(guardTotal)],
          ["Gifts", formatCount(wall.gifts)],
          ["BFF", String(tags.length)],
        ].map(([k, v]) => (
          <span key={k} className="text-center">
            <span className="block font-display text-[17px] font-bold text-cream">{v}</span>
            <span className="text-[10.5px] text-muted">{k}</span>
          </span>
        ))}
      </button>

      {/* Your level */}
      {mine ? (
        <button type="button" onClick={() => push({ kind: "stats", personId })} className="mx-4 mt-3 block w-[calc(100%-2rem)] rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-line">
          <span className="flex items-center justify-between text-[12.5px]">
            <span className="font-semibold text-cream">Level {myStats.data ? myStats.data.level : stat(undefined)}</span>
            <span className="text-muted">{myStats.data && myStats.data.expToNext ? `${formatCount(myStats.data.expInLevel)} / ${formatCount(myStats.data.expToNext)} EXP` : `${stat(myStats.data?.expPoints)} EXP`}</span>
          </span>
          {/* The backend sends total EXP only, not the EXP needed for the next level, so the bar shows how far into this level's curve you are */}
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-cream/10">
            <motion.span className="block h-full rounded-full bg-gradient-to-r from-coral to-gold" initial={{ width: 0 }} animate={{ width: `${myStats.data ? Math.min(100, myStats.data.expToNext ? (myStats.data.expInLevel / myStats.data.expToNext) * 100 : (myStats.data.expPoints / expToNext(Math.max(1, myStats.data.level))) * 100) : 0}%` }} />
          </span>
          <span className="mt-1.5 block text-[11px] text-muted">Win games, talk in rooms and finish tasks to level up.</span>
        </button>
      ) : null}

      {/* Guard */}
      <Panel title="Guard" meta={guards.length ? `${guards.length} protecting` : undefined} onOpen={() => push({ kind: "guard", personId })}>
        <div className="flex items-center gap-3">
          {guards.length ? (
            <span className="flex -space-x-2.5">
              {guards.slice(0, 4).map((g, i) => (
                <span key={g.id} className={`rounded-full ring-2 ${i === 0 ? "ring-gold" : "ring-surface"}`}>
                  <PersonAvatar person={{ ...person(g.id), frame: "none" }} size={34} />
                </span>
              ))}
            </span>
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream/[0.06] text-muted">
              <Shield className="h-4.5 w-4.5" aria-hidden />
            </span>
          )}
          <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted">
            {mine ? (guards.length ? "Friends who protect you daily." : "No one has protected you yet. Friends can protect you once a day.") : guards.length ? `Friends keeping ${p.name} safe.` : `Be the first to protect ${p.name}.`}
          </p>
          {!mine ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => protect(personId)}
              disabled={done}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold ${done ? "bg-cream/10 text-muted" : "bg-gold text-ink"}`}
            >
              {done ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <Shield className="h-4 w-4" aria-hidden />}
              {done ? "Protected" : "Protect"}
            </motion.button>
          ) : null}
        </div>
      </Panel>

      <CpPanel personId={personId} />

      {/* BFF */}
      <Panel title="BFF" meta={tags.length ? String(tags.length) : undefined} onOpen={() => app.openIntimateSpace(personId)}>
        {tags.length ? (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {tags.map((t) => (
              <BffChip key={t.id} tag={t} viewer={personId} />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted">{mine ? "Win a BFF round in Kharidari to make your first BFF." : "No BFF yet."}</p>
        )}
      </Panel>

      {/* Gifts */}
      <Panel title="Gifts received" meta={wall.gifts ? `${formatCount(wall.gifts)} · ${wall.stars}★` : undefined} onOpen={() => push({ kind: "gift-wall", personId })}>
        {topGifts.length ? (
          <div className="flex gap-2">
            {topGifts.map((g) => (
              <span key={g.id} className="flex w-12 flex-col items-center">
                <span className="h-10 w-10">
                  <GiftArt id={g.id} />
                </span>
                <span className="text-[10px] font-bold text-cream/80">×{formatCount(received[g.id] ?? 0)}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted">No gifts yet.</p>
        )}
      </Panel>

      {PARIVAR_ENABLED ? <ParivarPanel personId={personId} /> : null}

      {/* Rooms */}
      <Panel title="Rooms" meta={roomList.length ? String(roomList.length) : undefined} onOpen={() => push({ kind: "user-rooms", personId })}>
        {roomList.length ? (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {roomList.slice(0, 6).map((r) => (
              <span key={r.id} className="w-[72px] shrink-0">
                <span className="relative block h-[72px] w-[72px] overflow-hidden rounded-xl ring-1 ring-line">
                  <RoomCover room={r} />
                </span>
                <span className="mt-1 block truncate text-[10.5px] font-semibold text-cream/80">{r.name}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted">{mine ? "Rooms you join or host show up here." : "No rooms yet."}</p>
        )}
      </Panel>
    </div>
  );
}

/** CP: from the server for backend people (and you, when signed in); the device's demo couple otherwise. */
function CpPanel({ personId }: { personId: string }) {
  const { session } = useApp();
  if (session && (personId === ME_ID || personId.startsWith("srv-user:"))) return <ServerCpPanel personId={personId} />;
  return <LocalCpPanel personId={personId} />;
}

/** The server CP: partner, worn ring, days together, love, or a Propose button. */
function ServerCpPanel({ personId }: { personId: string }) {
  const { push } = useApp();
  const person = usePeople();
  const mine = personId === ME_ID;
  const [c, setC] = useState<CpCouple | null | undefined>(undefined);
  const [iHave, setIHave] = useState(false);
  const [proposing, setProposing] = useState(false);
  const load = useCallback(() => {
    const uid = mine ? myUserIdFromToken() : personId.slice(9);
    if (!uid) return;
    (mine ? cpApi.mine() : cpApi.of(uid)).then(setC).catch(() => setC(null));
    if (!mine)
      Promise.all([cpApi.mine(), cpApi.proposals()])
        .then(([m, p]) => setIHave(Boolean(m || p.sent)))
        .catch(() => undefined);
  }, [mine, personId]);
  useEffect(load, [load]);
  useCpEvents(useCallback(() => load(), [load]));
  const name = mine ? "You" : person(personId).name;
  const A = c ? c.people[c.a] : undefined;
  const B = c ? c.people[c.b] : undefined;
  return (
    <Panel title="CP" meta={c ? `Lv ${c.level}` : undefined} onOpen={() => push({ kind: "love-home", personId })}>
      {c === undefined ? (
        <div className="h-10 animate-pulse rounded-xl bg-cream/[0.06]" />
      ) : c ? (
        <div className="flex items-center gap-3">
          <span className="relative flex items-center">
            {[A, B].map((x, i) =>
              x?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={x.avatarUrl} alt="" className={`h-[38px] w-[38px] rounded-full object-cover ring-2 ring-surface ${i ? "-ml-2" : ""}`} />
              ) : (
                <span key={i} className={`grid h-[38px] w-[38px] place-items-center rounded-full bg-pink font-bold text-white ring-2 ring-surface ${i ? "-ml-2" : ""}`}>
                  {(x?.name ?? "?").slice(0, 1)}
                </span>
              ),
            )}
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <CpRing id={c.ring} size={24} />
            </span>
          </span>
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-cream">
            {A?.name ?? "…"} & {B?.name ?? "…"}
            <span className="block text-[11.5px] text-muted">
              {daysOf(c.since)} days · {c.love.toLocaleString("en-IN")} love · 💍 {c.rings.length} · 🙏 {c.blessings}
            </span>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted">{mine ? "No CP yet. Open someone's profile and propose with a ring." : `${name} doesn't have a CP yet.`}</p>
          {!mine ? (
            <button type="button" disabled={iHave} onClick={(e) => (e.stopPropagation(), setProposing(true))} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-pink px-3.5 text-[12.5px] font-bold text-white disabled:bg-cream/10 disabled:text-muted">
              💍 {iHave ? "You have a CP" : "Propose"}
            </button>
          ) : null}
        </div>
      )}
      {!mine ? <ServerProposeSheet open={proposing} onClose={() => (setProposing(false), load())} toUserId={personId.slice(9)} toName={name} /> : null}
    </Panel>
  );
}

function LocalCpPanel({ personId }: { personId: string }) {
  const { push } = useApp();
  const { coupleOf, myCouple, pending, bless, blessingsOf } = useMarket();
  const person = usePeople();
  const [proposing, setProposing] = useState(false);
  const [finding, setFinding] = useState(false);
  const mine = personId === ME_ID;
  const c = coupleOf(personId);
  const p = person(personId);
  const waiting = pending?.toId === personId;
  return (
    <Panel title="CP" meta={c ? `Lv ${loveLevel(c.love).level}` : undefined} onOpen={() => push(c || mine ? { kind: "love-home", personId } : { kind: "shop", tab: "rings" })}>
      {c ? (
        <div className="flex items-center gap-3">
          <span className="relative flex items-center">
            <PersonAvatar person={{ ...person(c.a), frame: "none" }} size={38} />
            <span className="-ml-2">
              <PersonAvatar person={{ ...person(c.b), frame: "none" }} size={38} />
            </span>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <RingArt id={c.ring} size={24} />
            </span>
          </span>
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-cream">
            {mine ? "You" : p.name} & {partnerIn(c, personId) === ME_ID ? "you" : person(partnerIn(c, personId)).name}
            <span className="block text-[11.5px] text-muted">
              Together for {daysTogether(c.since)} days · {c.love.toLocaleString("en-IN")} love · 🙏 {blessingsOf(c).count.toLocaleString("en-IN")}
            </span>
          </p>
          {c.a !== ME_ID && c.b !== ME_ID ? (
            <button
              type="button"
              onClick={(e) => (e.stopPropagation(), bless(c.id))}
              className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-pink to-gold px-3 text-[12.5px] font-bold text-white"
            >
              🙏 Bless
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted">
            {mine ? (pending ? `Waiting for ${person(pending.toId).name} to answer…` : "No CP yet. Pick someone special and propose with a ring.") : waiting ? "Waiting for an answer…" : `${p.name} doesn't have a CP yet.`}
          </p>
          {mine && !pending ? (
            <button type="button" onClick={() => setFinding(true)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-pink px-3.5 text-[12.5px] font-bold text-white">
              💍 Find a CP
            </button>
          ) : null}
          {!mine ? (
            <button
              type="button"
              disabled={Boolean(myCouple) || Boolean(pending)}
              onClick={() => setProposing(true)}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-pink px-3.5 text-[12.5px] font-bold text-white disabled:bg-cream/10 disabled:text-muted"
            >
              💍 {myCouple ? "You have a CP" : waiting ? "Sent" : "Propose"}
            </button>
          ) : null}
        </div>
      )}
      {!mine ? <ProposeSheet open={proposing} onClose={() => setProposing(false)} toId={personId} /> : <FindCpSheet open={finding} onClose={() => setFinding(false)} />}
    </Panel>
  );
}

/** The person's Parivar, or a way into one for you. */
function ParivarPanel({ personId }: { personId: string }) {
  const { push } = useApp();
  const { parivarOf } = useParivar();
  const pv = parivarOf(personId);
  const mine = personId === ME_ID;
  const role = pv?.members.find((m) => m.id === personId)?.role;
  return (
    <Panel title="Parivar" meta={pv ? `Lv ${parivarLevel(pv.xp).level}` : undefined} onOpen={() => push(pv ? { kind: "parivar", id: pv.id } : { kind: "parivar-list" })}>
      {pv ? (
        <div className="flex items-center gap-3">
          <ParivarEmblem p={pv} size={42} />
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-cream">
            <span className="block truncate font-bold">{pv.name}</span>
            <span className="text-[11.5px] text-muted">
              {role ? ROLE_LABEL[role] : ""} · {pv.members.length} members · {pv.tag}
            </span>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted">{mine ? "You're not in a Parivar yet. Join one or start your own." : "Not in a Parivar yet."}</p>
          {mine ? <span className="flex h-9 shrink-0 items-center rounded-full bg-coral px-3.5 text-[12.5px] font-bold text-white">Find Parivar</span> : null}
        </div>
      )}
    </Panel>
  );
}

/** Pick someone without a CP and propose to them. */
export function FindCpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { push } = useApp();
  const { coupleOf, ringsInBag, myCouple, pending } = useMarket();
  const person = usePeople();
  const [toId, setToId] = useState<string | null>(null);
  const singles = PEOPLE.filter((p) => !coupleOf(p.id)).sort((a, b) => Number(b.online) - Number(a.online));
  return (
    <>
      <BottomSheet open={open && !toId} onClose={onClose} title="Find a CP" tall>
        <div className="px-4 pb-5">
          {myCouple ? (
            <p className="rounded-2xl bg-surface p-3 text-[12.5px] text-muted ring-1 ring-line">You already have a CP with {person(myCouple.a === ME_ID ? myCouple.b : myCouple.a).name}. End it in your Love Home to propose to someone else.</p>
          ) : pending ? (
            <p className="rounded-2xl bg-surface p-3 text-[12.5px] text-muted ring-1 ring-line">Waiting for {person(pending.toId).name} to answer your proposal…</p>
          ) : (
            <>
              <ol className="grid grid-cols-3 gap-2 text-center text-[11px] text-cream/75">
                {["💍 Get a ring", "💌 Propose", "💞 Love Home"].map((t, i) => (
                  <li key={t} className="rounded-2xl bg-surface px-1 py-2 ring-1 ring-line">
                    <span className="block text-[10px] font-bold text-muted">Step {i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
              {ringsInBag.length ? null : (
                <button type="button" onClick={() => (onClose(), push({ kind: "shop", tab: "rings" }))} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-gold/15 px-3 py-2.5 text-left ring-1 ring-gold/40">
                  <span className="text-[12.5px] text-cream">You need a ring to propose.</span>
                  <span className="rounded-full bg-gold px-3 py-1 text-[12px] font-bold text-ink">Buy a ring</span>
                </button>
              )}
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Single and ready</p>
              <ul className="mt-2 space-y-2">
                {singles.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-surface p-2.5 ring-1 ring-line">
                    <PersonAvatar person={p} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[14px] font-bold ${nameTone(p.vip)}`} style={nameFace(p.nameFont)}>
                        {p.name}
                      </span>
                      <span className="text-[11px] text-muted">
                        Lv {p.level}
                        {p.city ? ` · ${p.city}` : ""} · {p.online ? "Online" : "Offline"}
                      </span>
                    </span>
                    <button type="button" onClick={() => setToId(p.id)} className="h-8 rounded-full bg-pink px-3.5 text-[12px] font-bold text-white">
                      💍 Propose
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </BottomSheet>
      {toId ? (
        <ProposeSheet
          open
          toId={toId}
          onClose={() => {
            setToId(null);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}

/** Propose to someone with a ring from your bag and a message. */
function ProposeSheet({ open, onClose, toId }: { open: boolean; onClose: () => void; toId: string }) {
  const { push } = useApp();
  const { ringsInBag, propose } = useMarket();
  const person = usePeople();
  const [ring, setRing] = useState<RingId | null>(null);
  const [message, setMessage] = useState(PROPOSAL_LINES[0]);
  const chosen = ring ?? ringsInBag[0]?.ring.id ?? null;
  return (
    <BottomSheet open={open} onClose={onClose} title={`Propose to ${person(toId).name}`}>
      <div className="px-4 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Choose a ring</p>
        {ringsInBag.length ? (
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
            {ringsInBag.map(({ ring: r, count }) => (
              <button key={r.id} type="button" aria-pressed={chosen === r.id} onClick={() => setRing(r.id)} className={`flex w-[88px] shrink-0 flex-col items-center rounded-2xl py-2 ring-1 ${chosen === r.id ? "bg-pink/15 ring-pink" : "bg-surface ring-line"}`}>
                <RingArt id={r.id} size={44} />
                <span className="line-clamp-1 px-1 text-[11px] font-semibold text-cream">{r.name}</span>
                <span className="text-[10px] text-muted">×{count}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-2 rounded-2xl bg-surface p-4 text-center ring-1 ring-line">
            <p className="text-[13px] text-muted">You need a ring to propose.</p>
            <button type="button" onClick={() => (onClose(), push({ kind: "shop", tab: "rings" }))} className="mt-2 h-9 rounded-full bg-gold px-5 text-[13px] font-bold text-ink">
              Buy a ring
            </button>
          </div>
        )}
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Your message</p>
        <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 120))} rows={2} className="mt-2 w-full resize-none rounded-2xl bg-surface px-3 py-2 text-[13.5px] text-cream ring-1 ring-line focus:outline-none focus:ring-pink" aria-label="Proposal message" />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PROPOSAL_LINES.map((l) => (
            <button key={l} type="button" onClick={() => setMessage(l)} className="rounded-full bg-cream/[0.06] px-2.5 py-1 text-left text-[11px] text-cream/75">
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!chosen || !message.trim()}
          onClick={() => {
            if (!chosen) return;
            propose(toId, chosen, message.trim());
            onClose();
          }}
          className="mt-4 h-12 w-full rounded-full bg-pink text-[15px] font-bold text-white disabled:opacity-40"
        >
          💍 Send proposal
        </button>
      </div>
    </BottomSheet>
  );
}

/** A small BFF pill: partner avatar with the relationship badge and level. */
export function BffChip({ tag, viewer }: { tag: Tag; viewer: string }) {
  const person = usePeople();
  const partner = person(partnerOf(tag, viewer));
  const rel = relationshipById(tag.relation);
  const lv = tagLevel(tag.intimacy).level;
  return (
    <span className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3" style={{ background: `${rel.tint}1f`, boxShadow: `inset 0 0 0 1px ${rel.tint}55` }}>
      <span className="relative">
        <PersonAvatar person={{ ...partner, frame: "none" }} size={32} />
        <span className="absolute -bottom-1 -right-1">
          <RelationIcon id={tag.relation} size={16} />
        </span>
      </span>
      <span className="leading-tight">
        <span className="block max-w-[90px] truncate text-[12.5px] font-bold text-cream">{partner.id === ME_ID ? "You" : partner.name}</span>
        <span className="text-[10.5px] font-semibold" style={{ color: rel.tint }}>
          {rel.label} · Lv {lv}
        </span>
      </span>
    </span>
  );
}

/** The rooms someone hosts and the rooms they've joined. */
function useUserRooms(personId: string) {
  const { rooms, isJoined, isFollowingRoom } = useApp();
  return useMemo(() => {
    const mine = rooms.find((r) => r.hostId === personId && r.permanent) ?? rooms.find((r) => r.hostId === personId) ?? null;
    const joined = rooms.filter(
      (r) => r.id !== mine?.id && (personId === ME_ID ? isJoined(r.id) || isFollowingRoom(r.id) : r.hostId === personId || r.seated.includes(personId) || seeded(`${personId}:${r.id}`) < 0.25),
    );
    return { mine, joined };
  }, [rooms, personId, isJoined, isFollowingRoom]);
}

/* ------------------------------------------------------------------ */
/* Full-page profile for other users                                   */
/* ------------------------------------------------------------------ */

/** Friends, followers and following for a backend user, and whether you're friends. */
export function FollowCounts({ personId, following }: { personId: string; following?: boolean }) {
  const [st, setSt] = useState<FollowStatus | null>(null);
  const uid = personId.startsWith("srv-user:") ? personId.slice(9) : null;
  useEffect(() => {
    if (!uid) return;
    let off = false;
    const t = window.setTimeout(
      () =>
        friendsApi
          .status(uid)
          .then((x) => !off && setSt(x))
          .catch(() => undefined),
      following === undefined ? 0 : 600,
    );
    return () => {
      off = true;
      window.clearTimeout(t);
    };
  }, [uid, following]);
  if (!uid) return null;
  return (
    <div className="mx-4 mt-3 grid grid-cols-3 overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
      {(
        [
          ["Friends", st?.friendsCount],
          ["Followers", st?.followers],
          ["Following", st?.followingCount],
        ] as const
      ).map(([label, n]) => (
        <div key={label} className="py-2.5 text-center">
          <span className="block font-display text-[18px] font-extrabold text-cream">{n ?? "–"}</span>
          <span className="text-[11px] text-muted">{label}</span>
        </div>
      ))}
      {st?.friends ? <p className="col-span-3 border-t border-line py-1.5 text-center text-[11.5px] font-bold text-speak">🤝 You're friends</p> : st?.followsYou ? <p className="col-span-3 border-t border-line py-1.5 text-center text-[11.5px] font-semibold text-muted">Follows you</p> : null}
    </div>
  );
}

export function UserProfileScreen({ personId }: { personId: string }) {
  const { pop, profile, toggleFollow, openConversation, push } = useApp();
  const { recordVisit } = useMarket();
  const following = profile.following.includes(personId);
  // Leave one footprint per opening
  const visitedRef = useRef<string | null>(null);
  useEffect(() => {
    if (visitedRef.current === personId) return;
    visitedRef.current = personId;
    recordVisit(personId);
  }, [personId, recordVisit]);
  const [gift, setGift] = useState(false);
  const pub = usePublicProfile(personId);
  return (
    <div className="relative flex h-full flex-col bg-ink">
      <div className="app-scroll min-h-0 flex-1 pb-4">
        <ProfileHero
          personId={personId}
          vipFresh={!pub.isBackendUser || pub.loadedFor === personId}
          topLeft={
            <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream backdrop-blur">
              <ChevronLeft className="h-6 w-6" />
            </button>
          }
        />
        {pub.isBackendUser && pub.status !== "ready" ? (
          <div role={pub.status === "loading" ? "status" : "alert"} className={`mx-4 mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${pub.status === "loading" ? "bg-surface ring-line" : "bg-[#ff8a8f]/10 ring-[#ff8a8f]/30"}`}>
            <p className={`flex-1 text-[12.5px] font-semibold ${pub.status === "loading" ? "text-muted" : "text-[#ff8a8f]"}`}>
              {pub.status === "loading" ? "Loading profile…" : pub.status === "not-found" ? "This user wasn't found. They may have deleted their account." : pub.error}
            </p>
            {pub.status === "error" ? (
              <button type="button" onClick={pub.retry} className="rounded-full bg-cream/[0.08] px-3 py-1.5 text-[12px] font-bold text-cream">
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        {personId.startsWith("srv-user:") ? <FollowCounts personId={personId} following={following} /> : null}
        {personId.startsWith("srv-user:") ? (
          <div className="mx-4 mt-2.5 grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => push({ kind: "moments", personId })} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#3b2a6b] to-[#1b1530] py-3 text-[13px] font-bold text-cream ring-1 ring-[#8f74ff]/40">
              <span aria-hidden>📸</span> Moments
            </button>
            <button type="button" onClick={() => push({ kind: "love-home", personId })} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#6b1f3d] to-[#2a0d19] py-3 text-[13px] font-bold text-cream ring-1 ring-[#ff7fa8]/40">
              <span aria-hidden>💍</span> CP space
            </button>
          </div>
        ) : null}
        <UserProfileBody personId={personId} />
      </div>
      <div className="pb-safe flex gap-2.5 border-t border-line bg-ink-2 px-4 py-3">
        <button
          type="button"
          onClick={() => toggleFollow(personId)}
          className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[14px] font-bold ${following ? "bg-cream/10 text-cream" : "bg-coral text-white"}`}
        >
          {following ? <Check className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
          {following ? "Following" : "Follow"}
        </button>
        <button type="button" onClick={() => openConversation(personId)} aria-label="Message" className="grid h-11 w-11 place-items-center rounded-full bg-surface text-cream ring-1 ring-line">
          <MessageCircle className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => setGift(true)} aria-label="Send a gift" className="grid h-11 w-11 place-items-center rounded-full bg-gold text-ink">
          <Gift className="h-5 w-5" />
        </button>
      </div>
      <ProfileGiftSheet open={gift} onClose={() => setGift(false)} toId={personId} />
    </div>
  );
}

/** Send a gift from someone's profile (outside a room). */
export function ProfileGiftSheet({ open, onClose, toId }: { open: boolean; onClose: () => void; toId: string }) {
  const { spend, toast, addCharm, addIntimacy, playGift, trackReceived, profile, coins } = useApp();
  const person = usePeople();
  const [sel, setSel] = useState<GiftId>(GIFTS[0].id);
  const svgaSrc = giftById(sel).svga?.src;
  useEffect(() => {
    if (open && svgaSrc) preloadSvga(svgaSrc).catch(() => undefined);
  }, [open, svgaSrc]);
  const send = () => {
    if (!GIFTS_LIVE) return toast(GIFTS_SOON_TEXT);
    const g = giftById(sel);
    if (!spend(g.cost)) {
      toast("Not enough coins", "error");
      return;
    }
    addCharm(toId, g.cost);
    addIntimacy(ME_ID, toId, g.cost);
    trackReceived(toId, sel, 1);
    playGift({ giftId: sel, fromName: profile.name, toName: person(toId).name, count: 1 });
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={`Send a gift to ${person(toId).name}`}>
      <div className="grid grid-cols-4 gap-2 px-4 pb-3">
        {GIFTS.map((g) => (
          <button key={g.id} type="button" aria-pressed={sel === g.id} onClick={() => setSel(g.id)} className={`relative flex flex-col items-center rounded-2xl px-1 py-2 ring-1 ${sel === g.id ? "bg-gold/10 ring-gold/60" : "ring-transparent"}`}>
            {!GIFTS_LIVE ? <SoonTag className="absolute left-1 top-1" /> : null}
            <span className="h-10 w-10">
              <GiftArt id={g.id} />
            </span>
            <span className="mt-1 line-clamp-1 text-[10.5px] font-semibold text-cream">{g.name}</span>
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-gold">
              <Coin className="h-3 w-3" /> {g.cost.toLocaleString("en-IN")}
            </span>
          </button>
        ))}
      </div>
      <div className="px-4 pb-5">
        {GIFTS_LIVE ? (
          <button type="button" onClick={send} className="h-12 w-full rounded-full bg-coral text-[15px] font-bold text-white">
            Send {giftById(sel).name} · {giftById(sel).cost.toLocaleString("en-IN")} coins
          </button>
        ) : (
          <div className="flex h-12 w-full items-center justify-center rounded-full bg-cream/[0.06] ring-1 ring-line" role="status">
            <ComingSoonBadge className="border-0 bg-transparent">{GIFTS_SOON_TEXT}</ComingSoonBadge>
          </div>
        )}
        <p className="mt-2 text-center text-[11px] text-muted">Balance {coins.toLocaleString("en-IN")} coins</p>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-pages: Guard, rooms, gifts                                      */
/* ------------------------------------------------------------------ */

const RANK_TINT = ["#e7bc72", "#c9cfdb", "#d9946b"];

export function GuardScreen({ personId }: { personId: string }) {
  const { pop, guardiansOf, protect, protectedToday } = useApp();
  const person = usePeople();
  const p = person(personId);
  const mine = personId === ME_ID;
  const list = guardiansOf(personId);
  const total = list.reduce((a, g) => a + g.value, 0);
  const myGuard = list.find((g) => g.id === ME_ID)?.value ?? 0;
  const done = protectedToday(personId);
  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader title="Guard" onBack={pop} />
      <section className="mx-4 mt-1 rounded-3xl bg-gradient-to-br from-[#3a2a14] to-[#1c1b22] p-4 ring-1 ring-gold/25">
        <div className="flex items-center gap-3">
          <PersonAvatar person={p} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[17px] font-bold text-cream">{mine ? "Your guard" : p.name}</p>
            <p className="flex items-center gap-1 text-[13px] font-semibold text-gold">
              <Shield className="h-4 w-4" aria-hidden /> {total.toLocaleString("en-IN")} total guard
            </p>
          </div>
        </div>
        {!mine ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-black/25 px-3 py-2.5">
            <span className="min-w-0 flex-1 text-[12.5px] text-cream/80">
              You&apos;ve given <b className="text-cream">{myGuard.toLocaleString("en-IN")}</b>
            </span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => protect(personId)}
              disabled={done}
              className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold ${done ? "bg-cream/10 text-muted" : "bg-gold text-ink"}`}
            >
              {done ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <Shield className="h-4 w-4" aria-hidden />}
              {done ? "Protected today" : `Protect +${GUARD_PER_DAY}`}
            </motion.button>
          </div>
        ) : null}
        <p className="mt-2.5 text-[11.5px] text-cream/60">Friends protect each other for free, once a day each, adding {GUARD_PER_DAY} guard. Guard is separate from charm.</p>
      </section>

      <h2 className="mx-4 mt-6 font-display text-[17px] font-bold text-cream">Guardians</h2>
      <ol className="mx-4 mt-2 overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
        {list.map((g, i) => {
          const gp = person(g.id);
          return (
            <li key={g.id} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
              <span className="w-6 text-center font-display text-[15px] font-extrabold" style={{ color: RANK_TINT[i] ?? "#aaa6b0" }}>
                {i + 1}
              </span>
              <PersonAvatar person={gp} size={40} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-cream">{g.id === ME_ID ? "You" : gp.name}</span>
              <span className="flex items-center gap-1 text-[13px] font-bold text-gold">
                <Shield className="h-3.5 w-3.5" aria-hidden /> {g.value.toLocaleString("en-IN")}
              </span>
            </li>
          );
        })}
        {list.length === 0 ? <li className="px-4 py-6 text-center text-[13px] text-muted">No guardians yet.</li> : null}
      </ol>
    </div>
  );
}

export function UserRoomsScreen({ personId }: { personId: string }) {
  const { pop, openRoom, roomLevelOf } = useApp();
  const person = usePeople();
  const { mine, joined } = useUserRooms(personId);
  const isMe = personId === ME_ID;
  const Row = ({ r }: { r: Room }) => (
    <li className="border-b border-line last:border-b-0">
      <button type="button" onClick={() => openRoom(r.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-cream/[0.03]">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          <RoomCover room={r} />
          {r.password ? (
            <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white">
              <Lock className="h-3 w-3" aria-label="Password" />
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-cream">{r.name}</span>
          <span className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted">
            {r.category}
            {r.permanent ? <span className="text-gold">Lv.{roomLevelOf(r).level}</span> : null}
            <span className={r.live ? "text-speak" : ""}>{r.live ? "● Live" : "Offline"}</span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
      </button>
    </li>
  );
  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader title={isMe ? "My rooms" : `${person(personId).name}'s rooms`} onBack={pop} />
      <h2 className="mx-4 mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Hosting</h2>
      <ul className="mx-4 mt-2 overflow-hidden rounded-2xl bg-surface ring-1 ring-line">{mine ? <Row r={mine} /> : <li className="px-4 py-3 text-[13px] text-muted">No room yet.</li>}</ul>
      <h2 className="mx-4 mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Joined</h2>
      <ul className="mx-4 mt-2 overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
        {joined.map((r) => (
          <Row key={r.id} r={r} />
        ))}
        {joined.length === 0 ? <li className="px-4 py-3 text-[13px] text-muted">No rooms joined yet.</li> : null}
      </ul>
    </div>
  );
}

export function GiftWallScreen({ personId }: { personId: string }) {
  const { pop, receivedOf } = useApp();
  const serverGifts = useGiftsReceived(personId);
  const received = serverGifts ? serverGifts.gifts : receivedOf(personId);
  const wall = giftWallStats(received);
  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader title="Gifts received" onBack={pop} sub={`${wall.gifts.toLocaleString("en-IN")} gifts · ${wall.stars} stars`} />
      <p className="mx-4 text-[11.5px] text-muted">Each gift earns a star at 1, 10 and 100 received. Legendary gifts count five times.</p>
      <div className="mt-3 grid grid-cols-3 gap-2.5 px-4">
        {GIFTS.map((g) => {
          const n = received[g.id] ?? 0;
          const stars = giftStars(n);
          return (
            <div key={g.id} className={`flex flex-col items-center rounded-2xl bg-surface py-3 ring-1 ring-line ${n ? "" : "opacity-40 grayscale"}`}>
              <span className="h-12 w-12">
                <GiftArt id={g.id} />
              </span>
              <span className="mt-1 line-clamp-1 text-[12px] font-semibold text-cream">{g.name}</span>
              <span className="text-[11px] font-bold text-gold">{n ? `×${n.toLocaleString("en-IN")}` : "—"}</span>
              <span className="text-[11px] tracking-tight text-gold" aria-label={`${stars} stars`}>
                {"★".repeat(stars)}
                <span className="text-cream/15">{"★".repeat(3 - stars)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
