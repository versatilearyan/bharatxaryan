"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin } from "@/components/ui/kit";
import { cpApi, type CpCharmEntry, type CpCouple } from "@/lib/api/cp";
import { CP_BADGES, badgeOf, cpProgress } from "@/lib/app/cp-badges";

const n = (v: number) => v.toLocaleString("en-IN");
const dateOf = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/** The badge picture, with a soft glow when it is unlocked and a lock when it is not. */
export function BadgeImg({ level, size = 64, locked = false }: { level: number; size?: number; locked?: boolean }) {
  const b = badgeOf(level);
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      {!locked ? <span className="absolute inset-[8%] rounded-full bg-[#ff7fa8]/35 blur-xl" aria-hidden /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.img} alt={b.name} width={size} height={size} draggable={false} className={`relative h-full w-full object-contain ${locked ? "opacity-40 grayscale" : "drop-shadow-[0_4px_10px_rgb(255_120_170/0.45)]"}`} />
      {locked ? (
        <span className="absolute grid h-[34%] w-[34%] place-items-center rounded-full bg-black/65 text-cream ring-1 ring-white/25">
          <Lock className="h-[55%] w-[55%]" aria-hidden />
        </span>
      ) : null}
    </span>
  );
}

/** Level, badge and Charm progress of the couple. Charm comes only from gifts the two send each other. */
export function CpCharmCard({ c, onBadges, onHistory }: { c: CpCouple; onBadges: () => void; onHistory: () => void }) {
  const p = cpProgress(c.charm);
  return (
    <div className="relative mx-4 mt-3 overflow-hidden rounded-3xl bg-gradient-to-b from-[#3b1670]/80 to-[#1b0c2e]/90 p-4 ring-1 ring-[#f6d899]/35 backdrop-blur">
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#ff7fa8]/20 blur-3xl" aria-hidden />
      <div className="relative flex items-center gap-3">
        <BadgeImg level={p.badge.level} size={84} />
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#f6d899]">CP level {p.badge.level}</p>
          <p className="font-display text-[20px] font-extrabold leading-tight text-white">{p.badge.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] font-bold text-[#ffd3e1]">
            <Sparkles className="h-3.5 w-3.5 text-[#f6d899]" aria-hidden /> {n(c.charm)} <span className="font-semibold text-white/60">Charm</span>
          </p>
        </div>
      </div>

      <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(p.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next CP level">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-[#ff5f94] via-[#ff9ab8] to-[#f6d899]" initial={{ width: 0 }} animate={{ width: `${p.progress * 100}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
      </div>
      {p.next ? (
        <div className="relative mt-2 flex items-center gap-2.5 text-[12px] text-white/70">
          <BadgeImg level={p.next.level} size={34} locked />
          <span className="min-w-0 flex-1">
            Next: <b className="text-white">Level {p.next.level} · {p.next.name}</b>
            <span className="block text-[11px]">
              Needs {n(p.next.need)} · <b className="text-[#f6d899]">{n(p.remaining)} to go</b>
            </span>
          </span>
        </div>
      ) : (
        <p className="relative mt-2 text-[12px] font-semibold text-[#f6d899]">Top level reached. Legendary! 👑</p>
      )}

      <div className="relative mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-white/[0.06] py-2 ring-1 ring-white/10">
          <p className="font-display text-[16px] font-extrabold text-white">{n(c.giftCount)}</p>
          <p className="text-[10.5px] text-white/55">CP gifts sent</p>
        </div>
        <div className="rounded-2xl bg-white/[0.06] py-2 ring-1 ring-white/10">
          <p className="flex items-center justify-center gap-1 font-display text-[16px] font-extrabold text-[#f6d899]">
            <Coin className="h-3.5 w-3.5" /> {n(c.giftCoins)}
          </p>
          <p className="text-[10.5px] text-white/55">gift value</p>
        </div>
      </div>

      <div className="relative mt-3 flex gap-2">
        <button type="button" onClick={onBadges} className="h-10 flex-1 rounded-full bg-gradient-to-r from-[#ff7fa8] to-[#f6d899] text-[13px] font-extrabold text-[#3a1226]">
          All badges
        </button>
        <button type="button" onClick={onHistory} className="h-10 flex-1 rounded-full bg-white/10 text-[13px] font-bold text-white ring-1 ring-white/20">
          Charm history
        </button>
      </div>
      <p className="relative mt-2 text-center text-[11px] text-white/50">Only gifts you send each other add Charm.</p>
    </div>
  );
}

/** All ten badges: unlocked ones glow, locked ones show the Charm they need. Tap one to preview it. */
export function CpBadgeCollection({ open, onClose, c }: { open: boolean; onClose: () => void; c: CpCouple }) {
  const [view, setView] = useState<number | null>(null);
  const p = cpProgress(c.charm);
  const shown = view ? badgeOf(view) : null;
  return (
    <BottomSheet open={open} onClose={() => (view ? setView(null) : onClose())} title="CP badges" tall>
      <div className="px-4 pb-6">
        {shown ? (
          <div className="flex flex-col items-center py-4 text-center">
            <BadgeImg level={shown.level} size={190} locked={shown.level > p.badge.level} />
            <p className="mt-2 font-display text-[22px] font-extrabold text-cream">{shown.name}</p>
            <p className="text-[12.5px] text-muted">
              Level {shown.level} · {shown.need ? `${n(shown.need)} Charm` : "Where every couple starts"}
            </p>
            <p className="mt-1 text-[12px] text-pink">{shown.level <= p.badge.level ? `Unlocked ${dateOf(c.unlocks[String(shown.level)])}` : `${n(Math.max(0, shown.need - c.charm))} Charm to unlock`}</p>
            <button type="button" onClick={() => setView(null)} className="mt-4 h-10 rounded-full bg-white/10 px-6 text-[13px] font-bold text-cream">
              Back
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {CP_BADGES.map((b) => {
              const on = b.level <= p.badge.level;
              return (
                <button key={b.level} type="button" onClick={() => setView(b.level)} className={`flex flex-col items-center rounded-2xl px-2 pb-3 pt-3 ring-1 ${on ? "bg-gradient-to-b from-[#ff7fa8]/15 to-[#f6d899]/10 ring-[#f6d899]/40" : "bg-white/[0.04] ring-white/10"} ${b.level === p.badge.level ? "outline outline-2 outline-[#f6d899]" : ""}`}>
                  <BadgeImg level={b.level} size={92} locked={!on} />
                  <span className="mt-1.5 text-[12.5px] font-bold text-cream">{b.name}</span>
                  <span className="text-[11px] text-muted">
                    Lv {b.level} · {b.need ? `${n(b.need)} Charm` : "Start"}
                  </span>
                  <span className={`mt-0.5 text-[10.5px] font-semibold ${on ? "text-pink" : "text-muted"}`}>{on ? (b.level === p.badge.level ? "Equipped" : `Unlocked ${dateOf(c.unlocks[String(b.level)])}`) : "Locked"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

/** The gifts that earned Charm, newest first, for all, the ones you sent or the ones you received. */
export function CpCharmHistory({ open, onClose, c, myId }: { open: boolean; onClose: () => void; c: CpCouple; myId?: string }) {
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");
  const [rows, setRows] = useState<CpCharmEntry[] | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setRows(null);
    cpApi
      .charmHistory(filter)
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [open, filter, c.charm]);
  const name = (id: string) => (id === myId ? "You" : (c.people[id]?.name ?? "Partner"));
  return (
    <BottomSheet open={open} onClose={onClose} title="Charm history" tall>
      <div className="px-4 pb-6">
        <div className="flex rounded-full bg-black/30 p-1 ring-1 ring-white/10" role="tablist">
          {(["all", "sent", "received"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={`flex-1 rounded-full py-2 text-[12.5px] font-bold ${filter === k ? "bg-gradient-to-r from-[#ffd1dd] to-[#f6d899] text-ink" : "text-cream/70"}`}>
              {k === "all" ? "All" : k === "sent" ? "Sent by me" : "Received by me"}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-1.5">
          {rows === null ? <li className="py-8 text-center text-[13px] text-muted">Loading…</li> : null}
          {rows && rows.length === 0 ? <li className="py-8 text-center text-[13px] text-muted">No Charm gifts yet. Send your partner a gift to start.</li> : null}
          {(rows ?? []).map((r) => (
            <li key={r.id} className="rounded-2xl bg-white/[0.05] px-3 py-2.5 ring-1 ring-white/10">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-[12.5px] text-cream">
                  <b>{name(r.senderId)}</b> → <b>{name(r.receiverId)}</b>
                  <span className="block text-[11.5px] text-cream/70">
                    {r.count > 1 ? `${r.count} × ` : ""}
                    {r.giftName}
                  </span>
                </span>
                <span className="text-right">
                  <span className="flex items-center justify-end gap-1 text-[12px] font-bold text-gold">
                    <Coin className="h-3 w-3" /> {n(r.coins)}
                  </span>
                  <span className="flex items-center justify-end gap-1 text-[12.5px] font-extrabold text-[#ff9ab8]">+{n(r.charm)} Charm</span>
                </span>
              </div>
              <p className="mt-0.5 text-[10.5px] text-muted">{new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
            </li>
          ))}
        </ul>
      </div>
    </BottomSheet>
  );
}

/** Full-screen celebration when the couple reaches a new level: hearts, the new badge, its name and the Charm. */
export function CpLevelUp({ level, charm, onClose }: { level: number | null; charm: number; onClose: () => void }) {
  const b = level ? badgeOf(level) : null;
  return (
    <AnimatePresence>
      {b ? (
        <motion.div key="lvlup" className="absolute inset-0 z-[90] grid place-items-center overflow-hidden bg-[#12041f]/90 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-label="CP level up">
          {Array.from({ length: 22 }, (_, i) => (
            <motion.span key={i} className="pointer-events-none absolute text-[18px]" style={{ left: `${(i * 47) % 100}%`, bottom: -30 }} animate={{ y: [0, -900], opacity: [0, 1, 0], rotate: [0, (i % 2 ? 1 : -1) * 40] }} transition={{ duration: 4 + (i % 5) * 0.6, delay: (i % 8) * 0.35, repeat: Infinity, ease: "easeOut" }} aria-hidden>
              {i % 4 === 0 ? "✨" : "💗"}
            </motion.span>
          ))}
          <motion.div initial={{ scale: 0.6, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18 }} className="relative flex w-[84%] max-w-[330px] flex-col items-center rounded-[32px] bg-gradient-to-b from-[#4a1d82]/90 to-[#1b0c2e]/95 px-5 pb-6 pt-8 text-center ring-2 ring-[#f6d899]/70" onClick={(e) => e.stopPropagation()}>
            <motion.span className="absolute -top-8 h-44 w-44 rounded-full bg-[#ff7fa8]/40 blur-3xl" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.4, repeat: Infinity }} aria-hidden />
            <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-[#f6d899]">CP level up!</p>
            <motion.div className="relative mt-1" initial={{ scale: 0.3, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 160, damping: 12, delay: 0.25 }}>
              <BadgeImg level={b.level} size={200} />
            </motion.div>
            <p className="relative font-display text-[28px] font-extrabold text-white">Level {b.level}</p>
            <p className="relative -mt-0.5 font-display text-[19px] font-bold text-[#ffd3e1]">{b.name}</p>
            <p className="relative mt-2 flex items-center gap-1 text-[13px] font-bold text-[#f6d899]">
              <Sparkles className="h-4 w-4" aria-hidden /> {n(charm)} Charm
            </p>
            <p className="relative mt-1 text-[11.5px] text-white/60">New badge unlocked and equipped for both of you.</p>
            <button type="button" onClick={onClose} className="relative mt-4 h-11 w-full rounded-full bg-gradient-to-r from-[#ff7fa8] to-[#f6d899] text-[14px] font-extrabold text-[#3a1226]">
              Lovely!
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
