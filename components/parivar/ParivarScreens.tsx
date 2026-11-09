"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SignBadge } from "./ParivarFrames";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, ChevronLeft, Crown, LogOut, Megaphone, Plus, Send, Shield, Trophy, UserPlus, Users } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin, ScreenHeader, SearchField } from "@/components/ui/kit";
import { nameFace, nameTone } from "@/lib/app/fonts";
import { COLORS, EMBLEMS, PARIVAR_CREATE_COST, PARIVAR_ENABLED, ROLE_LABEL, ROLE_ORDER, deputyCap, memberCap, parivarLevel, type Parivar, type ParivarRole } from "@/lib/app/parivar";
import { useParivar } from "@/lib/app/parivar-store";
import { parivarApi } from "@/lib/api/parivar";
import { myUserIdFromToken } from "@/lib/auth/token";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";

const ROLE_TINT: Record<ParivarRole, string> = { mukhiya: "bg-gold text-ink", "up-mukhiya": "bg-[#8f6bff] text-white", sadasya: "bg-cream/10 text-cream/75" };

/** The Parivar emblem: an emoji on a disc in the Parivar's colour. */
export function ParivarEmblem({ p, size = 48 }: { p: Pick<Parivar, "emblem" | "color">; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-2xl ring-1 ring-white/15" style={{ width: size, height: size, fontSize: size * 0.52, background: `radial-gradient(circle at 30% 25%, ${p.color}aa, ${p.color}33 70%), #1c1b22` }} aria-hidden>
      {p.emblem}
    </span>
  );
}

type Tag = { id?: string; sign?: string; name?: string; emblem?: string; color?: string; frame?: string };
const tagCache = new Map<string, { at: number; value: Tag | null }>();
const tagListeners = new Set<() => void>();
let tagVersion = 0;

function userIdOfPerson(personId: string) {
  if (personId === ME_ID) return myUserIdFromToken() ?? null;
  return personId.startsWith("srv-user:") ? personId.slice(9) : null;
}

/** Small Parivar tag (sign and emblem) shown next to a member's name, from the server. Each person is looked up at most once a minute. */
export function ParivarTag({ personId, className = "" }: { personId: string; className?: string }) {
  const { push, session } = useApp();
  useEffect(() => {
    const uid = userIdOfPerson(personId);
    if (!uid || !session) return;
    const hit = tagCache.get(uid);
    if (hit && Date.now() - hit.at < 60_000) return;
    tagCache.set(uid, { at: Date.now(), value: hit?.value ?? null });
    parivarApi
      .tag(uid)
      .then((t) => {
        tagCache.set(uid, { at: Date.now(), value: t && t.id ? t : null });
        tagVersion++;
        tagListeners.forEach((l) => l());
      })
      .catch(() => undefined);
  }, [personId, session]);
  useSyncExternalStore(
    (l) => {
      tagListeners.add(l);
      return () => tagListeners.delete(l);
    },
    () => tagVersion,
    () => 0,
  );
  const uid = userIdOfPerson(personId);
  const p = uid ? tagCache.get(uid)?.value : null;
  if (!p || !p.id) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        push({ kind: "parivar", id: p.id! });
      }}
      className={`inline-flex items-center align-middle ${className}`}
      aria-label={`Parivar ${p.name}`}
    >
      <SignBadge sign={p.sign ?? ""} frame={p.frame} size="sm" />
    </button>
  );
}

function LevelPill({ xp }: { xp: number }) {
  return <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10.5px] font-extrabold text-gold">Lv {parivarLevel(xp).level}</span>;
}

/* ------------------------------------------------------------------ */
/* Browse, search, ranking                                             */
/* ------------------------------------------------------------------ */

export function ParivarListScreen() {
  const { pop, push } = useApp();
  const { parivars, ranking, mine, applied, join } = useParivar();
  const [tab, setTab] = useState<"discover" | "ranking">("discover");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const list = useMemo(() => parivars.filter((p) => !needle || [p.name, p.tag, p.code].some((s) => s.toLowerCase().includes(needle))).sort((a, b) => b.xp - a.xp), [parivars, needle]);

  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader title="Parivar" onBack={pop} />
      {mine ? (
        <button type="button" onClick={() => push({ kind: "parivar", id: mine.id })} className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-3xl p-3 text-left ring-1 ring-white/15" style={{ background: `linear-gradient(120deg, ${mine.color}55, #1c1b22 70%)` }}>
          <ParivarEmblem p={mine} size={52} />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-cream/60">My Parivar</span>
            <span className="block truncate font-display text-[18px] font-bold text-cream">{mine.name}</span>
            <span className="text-[12px] text-cream/70">
              Lv {parivarLevel(mine.xp).level} · {mine.members.length}/{memberCap(parivarLevel(mine.xp).level)} members
            </span>
          </span>
          <span className="rounded-full bg-cream px-3 py-1.5 text-[12px] font-bold text-ink">Open</span>
        </button>
      ) : (
        <button type="button" onClick={() => push({ kind: "parivar-create" })} className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-3xl bg-gradient-to-r from-[#5a1a28] to-[#2a1018] p-4 text-left ring-1 ring-gold/30">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/20 text-gold">
            <Plus className="h-6 w-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[17px] font-bold text-cream">Create a Parivar</span>
            <span className="text-[12px] text-cream/65">Be the Mukhiya. Pick a name, tag and emblem.</span>
          </span>
          <span className="flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-[12px] font-bold text-ink">
            <Coin className="h-3.5 w-3.5" /> {PARIVAR_CREATE_COST.toLocaleString("en-IN")}
          </span>
        </button>
      )}

      <div className="mx-4 mt-4 flex rounded-full bg-surface p-1 ring-1 ring-line" role="tablist">
        {(["discover", "ranking"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-9 flex-1 rounded-full text-[13.5px] font-bold ${tab === t ? "bg-coral text-white" : "text-cream/65"}`}>
            {t === "discover" ? "Find a Parivar" : "Weekly ranking"}
          </button>
        ))}
      </div>

      {tab === "discover" ? (
        <>
          <div className="mx-4 mt-3">
            <SearchField value={q} onChange={setQ} placeholder="Search by name, tag or ID" />
          </div>
          <ul className="mt-3 space-y-2.5 px-4">
            {list.map((p) => {
              const lv = parivarLevel(p.xp).level;
              const full = p.members.length >= memberCap(lv);
              const isMine = mine?.id === p.id;
              return (
                <li key={p.id}>
                  <div role="button" tabIndex={0} onClick={() => push({ kind: "parivar", id: p.id })} onKeyDown={(e) => e.key === "Enter" && push({ kind: "parivar", id: p.id })} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                    <ParivarEmblem p={p} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[15px] font-bold text-cream">{p.name}</span>
                        <LevelPill xp={p.xp} />
                      </span>
                      <span className="block truncate text-[11.5px] text-muted">
                        {p.tag} · ID {p.code} · {p.members.length}/{memberCap(lv)} · {p.joinMode === "open" ? "Open" : "Approval"}
                      </span>
                    </span>
                    {isMine ? (
                      <span className="text-[12px] font-bold text-gold">Yours</span>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(mine) || full || applied === p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          join(p.id);
                        }}
                        className="h-8 shrink-0 rounded-full bg-coral px-3.5 text-[12px] font-bold text-white disabled:bg-cream/10 disabled:text-muted"
                      >
                        {applied === p.id ? "Applied" : full ? "Full" : p.joinMode === "open" ? "Join" : "Apply"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
            {list.length === 0 ? <li className="rounded-2xl bg-surface px-4 py-6 text-center text-[13px] text-muted ring-1 ring-line">No Parivar matches that.</li> : null}
          </ul>
        </>
      ) : (
        <ol className="mx-4 mt-3 overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
          {ranking.map((p, i) => (
            <li key={p.id} className="border-b border-white/[0.06] last:border-b-0">
              <button type="button" onClick={() => push({ kind: "parivar", id: p.id })} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${mine?.id === p.id ? "bg-gold/10" : ""}`}>
                <span className={`w-7 text-center font-display text-[16px] font-extrabold ${i === 0 ? "text-gold" : i === 1 ? "text-[#c9cfdb]" : i === 2 ? "text-[#d9946b]" : "text-cream/60"}`}>{i < 3 ? <Trophy className="mx-auto h-5 w-5" aria-label={String(i + 1)} /> : i + 1}</span>
                <ParivarEmblem p={p} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-bold text-cream">{p.name}</span>
                  <span className="text-[11px] text-muted">
                    Lv {parivarLevel(p.xp).level} · {p.members.length} members
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-[14px] font-extrabold text-gold">{p.weekXp.toLocaleString("en-IN")}</span>
                  <span className="text-[10.5px] text-cream/50">EXP this week</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="mx-4 mt-4 text-center text-[11px] text-cream/40">Parivar EXP comes from daily check-ins (+50) and gifts members send (1 EXP per 10 coins).</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

export function ParivarCreateScreen() {
  const { pop, coins } = useApp();
  const { create } = useParivar();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [emblem, setEmblem] = useState(EMBLEMS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [announcement, setAnnouncement] = useState("");
  const [joinMode, setJoinMode] = useState<Parivar["joinMode"]>("approval");
  const valid = name.trim().length >= 3 && /^[A-Za-z0-9]{2,4}$/.test(tag.trim());

  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader title="Create a Parivar" onBack={pop} />
      <div className="space-y-5 px-4">
        {/* Preview */}
        <div className="flex items-center gap-3 rounded-3xl p-4 ring-1 ring-white/15" style={{ background: `linear-gradient(120deg, ${color}55, #1c1b22 70%)` }}>
          <ParivarEmblem p={{ emblem, color }} size={60} />
          <span className="min-w-0">
            <span className="block truncate font-display text-[20px] font-bold text-cream">{name.trim() || "Your Parivar"}</span>
            <span className="mt-1 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-white" style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }}>
              {emblem} {tag.trim().toUpperCase() || "TAG"}
            </span>
          </span>
        </div>

        <label className="block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Name</span>
          <input value={name} maxLength={18} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chai Wale Parivar" className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-cream focus:border-gold/50 focus:outline-none" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Tag (2–4 letters, shown next to members&apos; names)</span>
          <input value={tag} maxLength={4} onChange={(e) => setTag(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())} placeholder="CHAI" className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] font-bold tracking-widest text-cream focus:border-gold/50 focus:outline-none" />
        </label>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Emblem</p>
          <div className="flex flex-wrap gap-2">
            {EMBLEMS.map((e) => (
              <button key={e} type="button" aria-pressed={emblem === e} aria-label={`Emblem ${e}`} onClick={() => setEmblem(e)} className={`grid h-11 w-11 place-items-center rounded-2xl text-[22px] ring-2 ${emblem === e ? "bg-gold/15 ring-gold" : "bg-surface ring-transparent"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Colour</p>
          <div className="flex gap-2.5">
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-ink ${color === c ? "ring-cream" : "ring-transparent"}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Announcement</span>
          <textarea value={announcement} maxLength={120} rows={2} onChange={(e) => setAnnouncement(e.target.value)} placeholder="Welcome line for your members" className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[14px] text-cream focus:border-gold/50 focus:outline-none" />
        </label>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Who can join</p>
          <div className="flex rounded-full bg-surface p-1 ring-1 ring-line" role="radiogroup">
            {(["approval", "open"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={joinMode === m} onClick={() => setJoinMode(m)} className={`h-9 flex-1 rounded-full text-[13px] font-bold ${joinMode === m ? "bg-cream text-ink" : "text-cream/65"}`}>
                {m === "approval" ? "Approval needed" : "Anyone can join"}
              </button>
            ))}
          </div>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={!valid}
          onClick={() => create({ name, tag, emblem, color, announcement: announcement.trim() || "Welcome to the Parivar!", joinMode })}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gold text-[15px] font-bold text-ink disabled:opacity-40"
        >
          Create Parivar
          <span className="flex items-center gap-0.5 rounded-full bg-black/15 px-2 py-0.5 text-[12px]">
            <Coin className="h-3.5 w-3.5" /> {PARIVAR_CREATE_COST.toLocaleString("en-IN")}
          </span>
        </motion.button>
        <p className="text-center text-[11px] text-muted">You have {coins.toLocaleString("en-IN")} demo coins. Lv 1 Parivars hold 20 members; every level adds 5.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Parivar home                                                        */
/* ------------------------------------------------------------------ */

export function ParivarHome({ id }: { id: string }) {
  const { pop, openProfile } = useApp();
  const pv = useParivar();
  const person = usePeople();
  const p = pv.byId(id);
  const isMember = Boolean(p && pv.mine?.id === p.id);
  const [tab, setTab] = useState<"members" | "chat" | "requests">("members");
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "leave" | "disband">(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!p) {
    return (
      <div className="app-scroll h-full bg-ink">
        <ScreenHeader title="Parivar" onBack={pop} />
        <p className="px-6 pt-10 text-center text-[14px] text-muted">This Parivar no longer exists.</p>
      </div>
    );
  }

  const lv = parivarLevel(p.xp);
  const members = [...p.members].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || b.contribution - a.contribution);
  const target = actionsFor ? p.members.find((m) => m.id === actionsFor) : null;
  const tabs = (["members", "chat", ...(pv.canManage ? (["requests"] as const) : [])] as const).filter((t) => isMember || t === "members");

  return (
    <div className="relative flex h-full flex-col bg-ink">
      <div className="app-scroll min-h-0 flex-1 pb-4">
        {/* Banner */}
        <div className="relative px-4 pb-4" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${p.color}66, #111114 75%)` }}>
          <div className="pt-safe flex h-14 items-center">
            <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/30 text-cream">
              <ChevronLeft className="h-6 w-6" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <ParivarEmblem p={p} size={72} />
            <div className="min-w-0">
              <h1 className="truncate font-display text-[24px] font-extrabold text-cream">{p.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-cream/70">
                <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-white" style={{ background: `linear-gradient(90deg, ${p.color}, ${p.color}99)` }}>
                  {p.emblem} {p.tag}
                </span>
                <LevelPill xp={p.xp} />
                <span>ID {p.code}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-black/30 p-3 ring-1 ring-white/10">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-cream">Parivar Lv {lv.level}</span>
              <span className="text-cream/60">{lv.next ? `${p.xp.toLocaleString("en-IN")} / ${lv.next.toLocaleString("en-IN")} EXP` : `${p.xp.toLocaleString("en-IN")} EXP · Max level`}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream/10">
              <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${p.color}, #f6d899)` }} initial={{ width: 0 }} animate={{ width: `${lv.progress * 100}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-3 text-center text-[11px] text-cream/60">
              <span>
                <b className="block text-[14px] text-cream">
                  {p.members.length}/{memberCap(lv.level)}
                </b>
                Members
              </span>
              <span>
                <b className="block text-[14px] text-cream">{deputyCap(lv.level)}</b>Up-Mukhiya seats
              </span>
              <span>
                <b className="block text-[14px] text-cream">{p.weekXp.toLocaleString("en-IN")}</b>EXP this week
              </span>
            </div>
          </div>

          {/* Announcement */}
          <div className="mt-3 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[12px] font-bold text-gold">
                <Megaphone className="h-3.5 w-3.5" aria-hidden /> Announcement
              </span>
              {isMember && pv.canManage && !editing ? (
                <button type="button" onClick={() => (setDraft(p.announcement), setEditing(true))} className="text-[11.5px] font-bold text-cream/70">
                  Edit
                </button>
              ) : null}
            </div>
            {editing ? (
              <div className="mt-2">
                <textarea value={draft} maxLength={120} rows={2} onChange={(e) => setDraft(e.target.value)} aria-label="Announcement" className="w-full resize-none rounded-xl bg-black/30 px-3 py-2 text-[13px] text-cream focus:outline-none" />
                <div className="mt-1.5 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditing(false)} className="h-8 rounded-full px-3 text-[12px] font-bold text-cream/70">
                    Cancel
                  </button>
                  <button type="button" onClick={() => (pv.setAnnouncement(draft), setEditing(false))} className="h-8 rounded-full bg-gold px-4 text-[12px] font-bold text-ink">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-[13px] leading-snug text-cream/85">{p.announcement}</p>
            )}
          </div>

          {/* Join or check in */}
          {isMember ? (
            <button type="button" disabled={pv.checkedIn} onClick={pv.checkIn} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gold text-[14px] font-bold text-ink disabled:bg-cream/10 disabled:text-cream/60">
              <CalendarCheck className="h-4.5 w-4.5" aria-hidden /> {pv.checkedIn ? "Checked in today" : "Daily check-in · +50 EXP"}
            </button>
          ) : (
            <button
              type="button"
              disabled={Boolean(pv.mine) || pv.applied === p.id || p.members.length >= memberCap(lv.level)}
              onClick={() => pv.join(p.id)}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-coral text-[14px] font-bold text-white disabled:bg-cream/10 disabled:text-cream/60"
            >
              <UserPlus className="h-4.5 w-4.5" aria-hidden />
              {pv.mine ? "You're in another Parivar" : pv.applied === p.id ? "Waiting for approval…" : p.members.length >= memberCap(lv.level) ? "Parivar is full" : p.joinMode === "open" ? "Join Parivar" : "Ask to join"}
            </button>
          )}
        </div>

        {/* Tabs */}
        {tabs.length > 1 ? (
          <div className="mx-4 flex rounded-full bg-surface p-1 ring-1 ring-line" role="tablist">
            {tabs.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`relative h-9 flex-1 rounded-full text-[13px] font-bold ${tab === t ? "bg-coral text-white" : "text-cream/65"}`}>
                {t === "members" ? `Members (${p.members.length})` : t === "chat" ? "Chat" : "Requests"}
                {t === "requests" && pv.requests.length ? <span className="ml-1 rounded-full bg-gold px-1.5 text-[10px] text-ink">{pv.requests.length}</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        {tab === "members" || !isMember ? (
          <ul className="mt-3 space-y-2 px-4">
            {members.map((m) => {
              const who = person(m.id);
              return (
                <li key={m.id}>
                  <button type="button" onClick={() => (isMember && m.id !== ME_ID ? setActionsFor(m.id) : openProfile(m.id))} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-2.5 text-left ring-1 ring-line">
                    <PersonAvatar person={who} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[14px] font-bold ${nameTone(who.vip)}`} style={nameFace(who.nameFont)}>
                        {m.id === ME_ID ? `${who.name} (you)` : who.name}
                      </span>
                      <span className="text-[11px] text-muted">{m.contribution.toLocaleString("en-IN")} EXP contributed</span>
                    </span>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${ROLE_TINT[m.role]}`}>
                      {m.role === "mukhiya" ? <Crown className="h-3 w-3" aria-hidden /> : m.role === "up-mukhiya" ? <Shield className="h-3 w-3" aria-hidden /> : null}
                      {ROLE_LABEL[m.role]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : tab === "chat" ? (
          <ParivarChatView id={p.id} />
        ) : (
          <ul className="mt-3 space-y-2 px-4">
            {pv.requests.map((rid) => {
              const who = person(rid);
              return (
                <li key={rid} className="flex items-center gap-3 rounded-2xl bg-surface p-2.5 ring-1 ring-line">
                  <PersonAvatar person={who} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-cream">{who.name}</span>
                    <span className="text-[11px] text-muted">
                      Lv {who.level}
                      {who.city ? ` · ${who.city}` : ""}
                    </span>
                  </span>
                  <button type="button" onClick={() => pv.reject(rid)} className="h-8 rounded-full bg-cream/10 px-3 text-[12px] font-bold text-cream/80">
                    Decline
                  </button>
                  <button type="button" onClick={() => pv.approve(rid)} className="h-8 rounded-full bg-gold px-3 text-[12px] font-bold text-ink">
                    Accept
                  </button>
                </li>
              );
            })}
            {pv.requests.length === 0 ? <li className="rounded-2xl bg-surface px-4 py-6 text-center text-[13px] text-muted ring-1 ring-line">No requests right now.</li> : null}
            {pv.myRole === "mukhiya" ? (
              <li className="flex items-center justify-between rounded-2xl bg-surface p-3 ring-1 ring-line">
                <span className="text-[13px] text-cream">Who can join</span>
                <span className="flex rounded-full bg-black/30 p-0.5">
                  {(["approval", "open"] as const).map((mode) => (
                    <button key={mode} type="button" aria-pressed={p.joinMode === mode} onClick={() => pv.setJoinMode(mode)} className={`h-7 rounded-full px-3 text-[11.5px] font-bold ${p.joinMode === mode ? "bg-cream text-ink" : "text-cream/60"}`}>
                      {mode === "approval" ? "Approval" : "Open"}
                    </button>
                  ))}
                </span>
              </li>
            ) : null}
          </ul>
        )}

        {isMember ? (
          <div className="mt-5 px-4">
            {confirm ? (
              <div className="rounded-2xl bg-[#3a1418] p-3 text-center">
                <p className="text-[13px] text-cream">{confirm === "disband" ? `Disband ${p.name}? Every member leaves and the Parivar is gone for good.` : `Leave ${p.name}? Your contribution stays with the Parivar.`}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setConfirm(null)} className="h-10 flex-1 rounded-full bg-white/10 text-[13px] font-bold text-cream">
                    Stay
                  </button>
                  <button type="button" onClick={() => (confirm === "disband" ? pv.disband() : pv.leave(), setConfirm(null))} className="h-10 flex-1 rounded-full bg-[#f4515b] text-[13px] font-bold text-white">
                    {confirm === "disband" ? "Disband" : "Leave"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirm(pv.myRole === "mukhiya" && p.members.length === 1 ? "disband" : "leave")} className="flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] font-semibold text-cream/55 hover:text-cream">
                <LogOut className="h-4 w-4" aria-hidden /> {pv.myRole === "mukhiya" && p.members.length === 1 ? "Disband Parivar" : "Leave Parivar"}
              </button>
            )}
            {pv.myRole === "mukhiya" && p.members.length > 1 && !confirm ? (
              <button type="button" onClick={() => setConfirm("disband")} className="block w-full text-center text-[11.5px] font-semibold text-[#f4515b]/80">
                Disband Parivar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Member actions */}
      <BottomSheet open={Boolean(target)} onClose={() => setActionsFor(null)} title={target ? person(target.id).name : ""}>
        {target ? (
          <div className="space-y-2 px-4 pb-5">
            <p className="text-[12px] text-muted">
              {ROLE_LABEL[target.role]} · {target.contribution.toLocaleString("en-IN")} EXP contributed
            </p>
            <ActionRow icon={<Users className="h-4 w-4" />} label="View profile" onClick={() => (setActionsFor(null), openProfile(target.id))} />
            {pv.myRole === "mukhiya" && target.role === "sadasya" ? <ActionRow icon={<Shield className="h-4 w-4" />} label="Make Up-Mukhiya" onClick={() => (pv.setRole(target.id, "up-mukhiya"), setActionsFor(null))} /> : null}
            {pv.myRole === "mukhiya" && target.role === "up-mukhiya" ? <ActionRow icon={<Shield className="h-4 w-4" />} label="Make Sadasya" onClick={() => (pv.setRole(target.id, "sadasya"), setActionsFor(null))} /> : null}
            {pv.myRole === "mukhiya" ? <ActionRow icon={<Crown className="h-4 w-4" />} label="Hand over Mukhiya" onClick={() => (pv.setRole(target.id, "mukhiya"), setActionsFor(null))} /> : null}
            {pv.canManage && target.role !== "mukhiya" && (pv.myRole === "mukhiya" || target.role === "sadasya") ? <ActionRow danger icon={<LogOut className="h-4 w-4" />} label="Remove from Parivar" onClick={() => (pv.kick(target.id), setActionsFor(null))} /> : null}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}

function ActionRow({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex h-12 w-full items-center gap-3 rounded-2xl bg-surface px-4 text-[14px] font-bold ring-1 ring-line ${danger ? "text-[#ff6b72]" : "text-cream"}`}>
      {icon}
      {label}
    </button>
  );
}

function ParivarChatView({ id }: { id: string }) {
  const { chat, send } = useParivar();
  const person = usePeople();
  const [text, setText] = useState("");
  const list = chat[id] ?? [];
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [list.length]);
  return (
    <div className="mt-3 px-4">
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {list.map((m) =>
            m.authorId === "system" ? (
              <motion.p key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[11.5px] text-cream/50">
                {m.text}
              </motion.p>
            ) : (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 ${m.authorId === ME_ID ? "flex-row-reverse" : ""}`}>
                <PersonAvatar person={person(m.authorId)} size={28} />
                <span className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-[13px] ${m.authorId === ME_ID ? "bg-coral text-white" : "bg-surface text-cream ring-1 ring-line"}`}>
                  {m.authorId === ME_ID ? null : <span className="block text-[10.5px] font-bold text-cream/55">{person(m.authorId).name}</span>}
                  {m.text}
                </span>
              </motion.div>
            ),
          )}
        </AnimatePresence>
        {list.length === 0 ? <p className="py-4 text-center text-[12.5px] text-muted">Say namaste to your Parivar 🙏</p> : null}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
          setText("");
        }}
        className="sticky bottom-2 mt-3 flex items-center gap-2 rounded-full bg-surface p-1.5 pl-4 ring-1 ring-line"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message your Parivar…" aria-label="Message your Parivar" maxLength={200} className="min-w-0 flex-1 bg-transparent text-[13.5px] text-cream placeholder:text-muted focus:outline-none" />
        <button type="submit" aria-label="Send" className="grid h-9 w-9 place-items-center rounded-full bg-coral text-white">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
