"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Check, ChevronDown, ChevronLeft, Gift, MessagesSquare, Pin, Send, Settings2, Smile, Sparkles, Trash2 } from "lucide-react";
import { Glyph, KIND_GLYPH, Orb, TILE_GLYPH } from "./ParivarUi";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin } from "@/components/ui/kit";
import { parivarExtra, type ChatMsg, type ChatPrefs, type ChestsInfo, type ChoriInfo, type CheerTier, type GachaInfo, type GachaResult, type KavachInfo, type NewsPost, type ParivarProfile, type ShopItem, type TasksInfo } from "@/lib/api/parivar";
import { getRoomById } from "@/lib/api/voice-rooms";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";

const n = (v: number) => v.toLocaleString("en-IN");
const errText = (e: unknown, fallback = "That didn't work. Try again.") => (e instanceof Error && e.message ? e.message : fallback);
const RARITY: Record<string, string> = { COMMON: "#b9c0cc", RARE: "#5fb7ff", EPIC: "#c58bff", LEGENDARY: "#ffd36e" };
const KIND_ICON: Record<string, string> = {};

export type SheetName = "cheer" | "gacha" | "chests" | "shop" | "kavach" | "chori" | "chat" | null;

function useLoad<T>(fn: () => Promise<T>, deps: unknown[], every = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      setData(await fn());
      setError("");
    } catch (e) {
      setError(errText(e, "Couldn't load."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    void reload();
    if (!every) return;
    const t = window.setInterval(() => document.visibilityState === "visible" && void reload(), every);
    return () => window.clearInterval(t);
  }, [reload, every]);
  return { data, error, reload, setData };
}

function Loading({ error, retry }: { error: string; retry: () => void }) {
  return error ? (
    <button type="button" onClick={retry} className="mx-4 my-6 block w-[calc(100%-2rem)] rounded-2xl bg-coral/10 p-4 text-center text-[13px] text-coral">
      {error} Tap to retry.
    </button>
  ) : (
    <div className="mx-auto my-10 h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-gold" aria-label="Loading" />
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-surface p-3.5 ring-1 ring-line ${className}`}>{children}</div>;
}

function Btn({ children, onClick, disabled, tone = "gold", className = "" }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: "gold" | "soft" | "danger"; className?: string }) {
  const cls = tone === "gold" ? "bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] text-[#2a1a0c]" : tone === "danger" ? "bg-coral/15 text-coral" : "bg-cream/10 text-cream";
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded-full px-4 py-2.5 text-[13px] font-extrabold disabled:opacity-45 ${cls} ${className}`}>
      {children}
    </button>
  );
}

function countdown(until: string, now: number) {
  const s = Math.max(0, Math.floor((Date.parse(until) - now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

/* ------------------------------ The tiles on the Parivar page ------------------------------ */

const TILES: { key: Exclude<SheetName, null>; icon?: string; label: string; sub: string }[] = [
  { key: "chat", icon: "💬", label: "Family chat", sub: "Talk to your Parivar" },
  { key: "gacha", icon: "🎰", label: "Gacha", sub: "Win coins, charm, chests" },
  { key: "cheer", icon: "📣", label: "Cheer", sub: "Cheer for your Parivar" },
  { key: "chests", icon: "🎁", label: "Chests", sub: "Send and claim" },
  { key: "shop", icon: "🛒", label: "Shop", sub: "Cards, chests, Kavach" },
  { key: "kavach", icon: "🛡️", label: "Kavach", sub: "Protect the treasury" },
  { key: "chori", icon: "🥷", label: "Chori", sub: "Take from other treasuries" },
];

export function FeatureTiles({ p, onOpen }: { p: ParivarProfile; onOpen: (s: Exclude<SheetName, null>) => void }) {
  const { info: voice, go: onVoice } = useParivarVoice(p);
  return (
    <div className="grid grid-cols-2 gap-2">
      {TILES.map((t) => (
        <button key={t.key} type="button" onClick={() => onOpen(t.key)} className="flex items-center gap-3 rounded-2xl bg-white/[0.045] p-3 text-left ring-1 ring-white/10 backdrop-blur-sm transition active:scale-[0.98]">
          <Glyph icon={TILE_GLYPH[t.key]} size={42} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold text-cream">{t.label}</span>
            <span className="block truncate text-[10.5px] text-muted">{t.sub}</span>
          </span>
        </button>
      ))}
      {voice?.enabled ? (
        <button type="button" onClick={onVoice} className="flex items-center gap-3 rounded-2xl bg-white/[0.045] p-3 text-left ring-1 ring-white/10 backdrop-blur-sm transition active:scale-[0.98]">
          <Glyph icon={TILE_GLYPH.voice} size={42} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold text-cream">Voice room</span>
            <span className="block truncate text-[10.5px] text-muted">{voice.roomId ? "Open now" : voice.unlocked ? "Start one" : `Unlocks at level ${voice.minLevel}`}</span>
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** Opens (or starts) the Parivar voice room in the normal room screen. */
export function useParivarVoice(p: ParivarProfile) {
  const { openRoom, toast } = useApp();
  const { addCreated } = useServerRooms();
  const info = useLoad(() => parivarExtra.voice(p.id), [p.id], 30_000);
  const go = async () => {
    try {
      let v = info.data;
      if (!v?.roomId) {
        if (!v?.unlocked) return toast(`Your Parivar voice room opens at level ${v?.minLevel ?? 2}.`, "error");
        if (!v?.canStart) return toast("Only the Mukhiya or people they allow can start the voice room.", "error");
        v = await parivarExtra.startVoice(p.id);
        info.setData(v);
      }
      if (!v.roomId) return;
      addCreated(await getRoomById(v.roomId));
      openRoom(serverRoomAppId(v.roomId));
    } catch (e) {
      toast(errText(e), "error");
    }
  };
  return { info: info.data, go };
}

/* ------------------------------ Cheer ------------------------------ */

export function CheerSheet({ p, open, onClose, onChanged }: Props) {
  const { toast, refreshCoins } = useApp();
  const d = useLoad<CheerTier[]>(() => parivarExtra.cheerTiers(p.id), [p.id, open]);
  const [busy, setBusy] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  return (
    <BottomSheet open={open} onClose={onClose} title="📣 Cheer">
      <div className="relative px-4 pb-6">
        <p className="text-[12.5px] text-muted">Cheer costs coins from your wallet and gives your Parivar EXP.</p>
        {!d.data ? (
          <Loading error={d.error} retry={d.reload} />
        ) : (
          <ul className="mt-3 space-y-2">
            {d.data.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={async () => {
                    setBusy(t.id);
                    try {
                      await parivarExtra.cheer(p.id, t.id);
                      void refreshCoins();
                      setBurst((b) => b + 1);
                      toast(`${t.name}! +${n(t.expGain)} EXP for the Parivar 🎉`, "gold");
                      onChanged();
                    } catch (e) {
                      toast(errText(e), "error");
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-line disabled:opacity-60"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold/15 text-[20px]" aria-hidden>
                    {t.times >= 100 ? "🎆" : t.times >= 10 ? "🎉" : "👏"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-cream">{t.name}</span>
                    <span className="text-[11.5px] text-muted">+{n(t.expGain)} EXP · up to {n(t.dailyLimit)} a day</span>
                  </span>
                  <span className="flex items-center gap-1 text-[13px] font-extrabold text-gold">
                    <Coin className="h-4 w-4" /> {n(t.coinsCost)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <AnimatePresence>
          {burst ? (
            <motion.div key={burst} className="pointer-events-none absolute inset-x-0 top-6 flex justify-center gap-2 text-[26px]" initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -90 }} transition={{ duration: 1.4 }} aria-hidden>
              {["🎉", "✨", "👏", "🎊", "✨"].map((e, i) => (
                <motion.span key={i} animate={{ rotate: [0, (i % 2 ? 1 : -1) * 25, 0] }}>
                  {e}
                </motion.span>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}

type Props = { p: ParivarProfile; open: boolean; onClose: () => void; onChanged: () => void };

/* ------------------------------ Shop ------------------------------ */

export function ShopSheet({ p, open, onClose, onChanged }: Props) {
  const { toast, refreshCoins } = useApp();
  const d = useLoad<ShopItem[]>(() => parivarExtra.shop(p.id), [p.id, open]);
  const inv = useLoad(() => parivarExtra.inventory(p.id), [p.id, open]);
  const [busy, setBusy] = useState<string | null>(null);
  const canFunds = p.myPerms.includes("MANAGE_TREASURY") || p.myRole === "LEADER";
  const buy = async (i: ShopItem, pay: "FUNDS" | "COINS") => {
    setBusy(i.id + pay);
    try {
      await parivarExtra.buy(p.id, i.id, pay);
      toast(`${i.name} added to the Parivar`, "gold");
      void refreshCoins();
      void d.reload();
      void inv.reload();
      onChanged();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setBusy(null);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="🛒 Parivar shop" tall>
      <div className="px-4 pb-6">
        <p className="text-[12.5px] text-muted">
          Treasury: <b className="text-gold">{n(p.funds)}</b> funds. Things you buy go to the Parivar&apos;s inventory.
        </p>
        {inv.data?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {inv.data.map((r) => (
              <span key={`${r.kind}${r.ref}`} className="rounded-full bg-cream/10 px-2.5 py-1 text-[11.5px] text-cream">
                {r.name ?? r.kind} ×{n(r.qty)}
              </span>
            ))}
          </div>
        ) : null}
        {!d.data ? (
          <Loading error={d.error} retry={d.reload} />
        ) : (
          <ul className="mt-3 space-y-2">
            {d.data.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold/15 text-[22px]" aria-hidden>
                  {i.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt="" className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    (() => {
                      const G = KIND_GLYPH[i.kind] ?? Gift;
                      return <G className="h-6 w-6 text-gold" strokeWidth={1.7} />;
                    })()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-cream">
                    {i.name}
                    {i.qty > 1 ? ` ×${i.qty}` : ""}
                  </span>
                  {i.dailyLimit ? <span className="text-[11px] text-muted">{i.boughtToday}/{i.dailyLimit} bought today</span> : null}
                </span>
                <span className="flex flex-col gap-1">
                  {i.priceFunds > 0 ? (
                    <button type="button" disabled={!canFunds || busy !== null} onClick={() => void buy(i, "FUNDS")} className="rounded-full bg-gold px-3 py-1 text-[11.5px] font-extrabold text-ink disabled:opacity-40" title={canFunds ? "" : "Only people allowed to manage the treasury"}>
                      {n(i.priceFunds)} funds
                    </button>
                  ) : null}
                  {i.priceCoins > 0 ? (
                    <button type="button" disabled={busy !== null} onClick={() => void buy(i, "COINS")} className="flex items-center justify-center gap-1 rounded-full bg-coral/15 px-3 py-1 text-[11.5px] font-extrabold text-pink disabled:opacity-40">
                      <Coin className="h-3 w-3" /> {n(i.priceCoins)}
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}

/* ------------------------------ Gacha ------------------------------ */

export function GachaSheet({ p, open, onClose, onChanged }: Props) {
  const { toast, refreshCoins } = useApp();
  const d = useLoad<GachaInfo>(() => parivarExtra.gacha(p.id), [p.id, open]);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [spin, setSpin] = useState(false);
  const [won, setWon] = useState<GachaResult[] | null>(null);
  const m = d.data?.machines[sel];

  const roll = async (times: 1 | 10) => {
    if (!m || busy) return;
    setBusy(true);
    setSpin(true);
    try {
      const [r] = await Promise.all([parivarExtra.roll(p.id, m.id, times), new Promise((res) => window.setTimeout(res, 1400))]);
      setWon(r.results);
      void refreshCoins();
      void d.reload();
      onChanged();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setSpin(false);
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={() => (won ? setWon(null) : onClose())} title={`${p.name} · Gacha`} tall>
      <div className="px-4 pb-6" style={{ backgroundImage: "repeating-conic-gradient(from 0deg at 50% 18%, rgba(231,188,114,0.07) 0deg 8deg, transparent 8deg 16deg)" }}>
        {!d.data ? (
          <Loading error={d.error} retry={d.reload} />
        ) : (
          <>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {d.data.machines.map((x, i) => (
                <button key={x.id} type="button" onClick={() => setSel(i)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold ring-1 ${i === sel ? "bg-gold/20 text-gold ring-gold/50" : "text-cream/70 ring-line"}`}>
                  {x.name} {x.locked ? "🔒" : ""}
                </button>
              ))}
            </div>
            {m ? (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <GachaChip icon="funds" label="Funds" value={n(d.data.funds)} />
                  <GachaChip icon="card" label="Gacha cards" value={n(m.cards)} />
                  <GachaChip icon="free" label="Free today" value={n(m.freeLeft)} />
                </div>

                <div className="relative mt-4">
                  <div className="pointer-events-none absolute -top-4 left-1/2 z-10 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-b from-[#f6d899] to-[#b9803a] text-[#2a1a0c] shadow-[0_0_24px_rgba(240,205,130,0.7)] ring-4 ring-ink" aria-hidden>
                    <Sparkles className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <div className="overflow-hidden rounded-t-[26px] border-x-[4px] border-t-[4px] border-[#c9a45c]/70 bg-gradient-to-b from-white/12 to-white/[0.02] backdrop-blur-sm">
                    <div className="flex items-center justify-around bg-gradient-to-b from-[#3a1a28] to-[#1d0f19] py-2" aria-hidden>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <span key={i} className="h-2 w-2 rounded-full bg-[#f6d899] shadow-[0_0_10px_#e7bc72]" style={{ opacity: spin ? (i % 2 ? 1 : 0.4) : 1 }} />
                      ))}
                    </div>
                    <GachaBalls spin={spin} />
                  </div>
                  <div className="h-2.5 bg-gradient-to-b from-[#e8c987] via-[#b8893f] to-[#7a5624]" aria-hidden />
                  <div className="rounded-b-[26px] border-x-[4px] border-b-[4px] border-[#c9a45c]/70 bg-gradient-to-b from-[#2a1320] to-[#150b13] p-3">
                    <p className="mb-2 text-center font-display text-[13px] font-extrabold tracking-wide text-gold">{m.name}</p>
                    {m.locked ? (
                      <p className="rounded-full bg-black/40 py-2.5 text-center text-[12.5px] font-bold text-cream/80">🔒 Your Parivar needs level {m.minLevel}</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-black/25 px-1 py-3 text-center ring-1 ring-white/5">
                          <Glyph icon={CalendarCheck} size={44} tone="mute" />
                          <span className="mt-1 text-[10.5px] leading-tight font-semibold text-cream/60">{m.freePerDay ? "Free once a day" : "Every roll uses funds"}</span>
                        </div>
                        <RollButton label="Roll ×1" sub={m.freeLeft > 0 ? "Free" : `${n(m.priceFunds)} funds`} dot={m.freeLeft > 0} disabled={busy || (!d.data.canRoll && m.freeLeft < 1)} onClick={() => void roll(1)} />
                        <RollButton label="Roll ×10" sub={`${n(m.priceFunds * 10)} funds`} disabled={busy || !d.data.canRoll} onClick={() => void roll(10)} />
                      </div>
                    )}
                    {m.serviceFeeCoins ? <p className="mt-2 text-center text-[10.5px] text-cream/50">+ {n(m.serviceFeeCoins)} coins service fee per roll</p> : null}
                    {!m.locked && !d.data.canRoll ? <p className="mt-2 text-center text-[11px] text-cream/55">Only free spins for you: spending funds or cards needs the Mukhiya&apos;s permission.</p> : null}
                  </div>
                </div>

                <p className="mt-5 flex items-center gap-2 font-display text-[15px] font-extrabold text-cream"><span className="h-4 w-1 rounded-full bg-gold" aria-hidden />Reward Preview</p>
                <ul className="mt-3 grid grid-cols-4 gap-2">
                  {m.rewards.map((r, i) => (
                    <li key={i} className="flex flex-col items-center text-center">
                      <span className="grid h-[62px] w-[62px] place-items-center rounded-2xl bg-white/[0.06]" style={{ boxShadow: `0 0 0 1.5px ${RARITY[r.rarity] ?? "#e7bc72"}88, inset 0 1px 0 rgba(255,255,255,0.12)` }} aria-hidden>
                        {r.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.imageUrl} alt="" className="h-11 w-11 object-contain" />
                        ) : (
                          (() => {
                            const G = KIND_GLYPH[r.kind] ?? Gift;
                            return <G className="h-7 w-7" style={{ color: RARITY[r.rarity] ?? "#f0cd82" }} strokeWidth={1.6} />;
                          })()
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 text-[10.5px] leading-tight font-semibold" style={{ color: RARITY[r.rarity] ?? "#fff1d5" }}>
                        {r.label}
                      </span>
                      <span className="text-[10px] font-bold text-cream/50">{r.chance}%</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}

        <AnimatePresence>
          {won ? (
            <motion.div className="absolute inset-0 z-20 grid place-items-center bg-black/75 px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Gacha result">
              <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 240, damping: 20 }} className="relative w-full max-w-[330px] overflow-hidden rounded-[28px] bg-gradient-to-b from-[#2b1a26] to-[#140b12] px-5 pt-6 pb-5 text-center shadow-[0_30px_80px_-10px_rgba(0,0,0,0.9)] ring-1 ring-gold/30">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f6d899] to-transparent" aria-hidden />
                <p className="font-display text-[22px] font-extrabold tracking-tight text-cream">{won.length > 1 ? "Shabaash!" : "You won"}</p>
                <div className={`mt-3 grid gap-2 ${won.length > 1 ? "grid-cols-3" : "grid-cols-1 justify-items-center"}`}>
                  {won.map((r, i) => (
                    <motion.div key={i} initial={{ scale: 0.2, opacity: 0, rotate: -14 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.1 + i * 0.1, type: "spring", stiffness: 230, damping: 15 }} className="flex flex-col items-center">
                      <span className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-white/[0.06]" style={{ boxShadow: `0 0 0 1.5px ${RARITY[r.rarity] ?? "#e7bc72"}, 0 8px 22px -8px ${RARITY[r.rarity] ?? "#e7bc72"}` }} aria-hidden>
                        {(() => {
                          const G = KIND_GLYPH[r.kind] ?? Gift;
                          return <G className="h-8 w-8" style={{ color: RARITY[r.rarity] ?? "#f0cd82" }} strokeWidth={1.6} />;
                        })()}
                      </span>
                      <span className="mt-1 text-[11.5px] leading-tight font-bold text-cream">{r.label}</span>
                    </motion.div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-snug text-cream/50">Coins and charm go to your wallet; funds and chests wait in the treasury; Kavach shields the whole Parivar.</p>
                <button type="button" onClick={() => setWon(null)} className="mt-4 h-12 w-full rounded-full bg-gradient-to-b from-[#f2d189] to-[#c9954a] font-display text-[16px] font-extrabold text-[#2a1a0c] shadow-[0_8px_20px_-8px_rgba(240,205,130,0.7)]">
                  OK
                </button>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}

const BALLS: [string, number, number][] = [
  ["#c2263f", 18, 86],
  ["#1f9d6b", 72, 78],
  ["#d9a032", 128, 86],
  ["#a24bd6", 184, 80],
  ["#2f7bd6", 4, 140],
  ["#1f9d6b", 52, 134],
  ["#c2263f", 104, 128],
  ["#d9a032", 156, 134],
  ["#2f7bd6", 208, 138],
];

function GachaBalls({ spin }: { spin: boolean }) {
  return (
    <div className="relative mx-auto h-[210px] w-[268px]">
      {BALLS.map(([c, x, y], i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ left: x, top: y }}
          animate={spin ? { x: [0, i % 2 ? 14 : -14, 0, i % 2 ? -10 : 10, 0], y: [0, -34 - (i % 3) * 8, 6, -20, 0], rotate: [0, 40, -30, 20, 0] } : { y: [0, -2, 0] }}
          transition={spin ? { duration: 0.7, repeat: Infinity, delay: i * 0.04 } : { duration: 3 + (i % 3) * 0.4, repeat: Infinity, delay: i * 0.1 }}
        >
          <Orb color={c} size={58} className="!relative" />
        </motion.span>
      ))}
    </div>
  );
}

function GachaChip({ icon, label, value }: { icon: "funds" | "card" | "free"; label: string; value: string }) {
  const I = icon === "funds" ? KIND_GLYPH.FUNDS : icon === "card" ? KIND_GLYPH.CARD : Gift;
  return (
    <div className="rounded-2xl bg-white/[0.05] px-2.5 py-2 ring-1 ring-white/10 backdrop-blur-sm">
      <p className="flex items-center gap-1 truncate text-[10.5px] font-semibold text-cream/55">
        <I className="h-3 w-3 text-gold" strokeWidth={1.8} aria-hidden /> {label}
      </p>
      <p className="font-display text-[16px] font-extrabold text-gold">{value}</p>
    </div>
  );
}

function RollButton({ label, sub, dot, disabled, onClick }: { label: string; sub: string; dot?: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex flex-col items-center rounded-2xl bg-black/25 px-1 py-2.5 ring-1 ring-white/5 transition active:scale-95 disabled:opacity-45">
      <span className="relative grid h-[54px] w-[54px] place-items-center rounded-full bg-gradient-to-b from-[#f6d899] to-[#b9803a] text-[#2a1a0c] shadow-[0_8px_18px_-6px_rgba(240,205,130,0.7)] ring-2 ring-[#f6d899]/40">
        <Sparkles className="h-6 w-6" strokeWidth={2} />
        {dot ? <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-coral ring-2 ring-[#241018]" /> : null}
      </span>
      <span className="mt-1.5 font-display text-[13px] font-extrabold text-cream">{label}</span>
      <span className="text-[10px] text-cream/60">{sub}</span>
    </button>
  );
}

/* ------------------------------ Chests ------------------------------ */

export function ChestsSheet({ p, open, onClose, onChanged }: Props) {
  const { toast, refreshCoins } = useApp();
  const d = useLoad<ChestsInfo>(() => parivarExtra.chests(p.id), [p.id, open], 15_000);
  const now = useNow();
  const [busy, setBusy] = useState<string | null>(null);
  const [got, setGot] = useState<{ label: string } | null>(null);
  const act = async (key: string, f: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await f();
      if (ok) toast(ok, "gold");
      void refreshCoins();
      await d.reload();
      onChanged();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setBusy(null);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Chests" tall>
      <div className="px-4 pb-6">
        {!d.data ? (
          <Loading error={d.error} retry={d.reload} />
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Open for you</p>
            <ul className="mt-2 space-y-2">
              {!d.data.sent.some((c) => c.status === "OPEN") ? <li className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-muted ring-1 ring-line">No chest is open right now.</li> : null}
              {d.data.sent
                .filter((c) => c.status === "OPEN")
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-gold/15 to-surface p-3 ring-1 ring-gold/30">
                    <Glyph icon={Gift} size={46} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold text-cream">{c.name}</span>
                      <span className="text-[11.5px] text-muted">
                        {c.claimed}/{c.pieces} claimed · closes in {countdown(c.expiresAt, now)}
                      </span>
                    </span>
                    {c.claimedByMe ? (
                      <span className="flex items-center gap-1 text-[12px] font-bold text-speak">
                        <Check className="h-4 w-4" /> Claimed
                      </span>
                    ) : (
                      <Btn
                        disabled={busy !== null || c.claimed >= c.pieces}
                        onClick={() =>
                          void act(c.id, async () => {
                            const r = await parivarExtra.claimChest(p.id, c.id);
                            setGot({ label: r.label });
                          })
                        }
                      >
                        Claim
                      </Btn>
                    )}
                  </li>
                ))}
            </ul>
            {d.data.canSend ? (
              <>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Send a chest to the Parivar</p>
                <ul className="mt-2 space-y-2">
                  {d.data.types.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                      <Glyph icon={Gift} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-bold text-cream">{t.name}</span>
                        <span className="text-[11.5px] text-muted">
                          {t.pieces} pieces · {t.owned > 0 ? `you have ${n(t.owned)}` : `${n(t.priceFunds)} funds`}
                        </span>
                      </span>
                      <Btn disabled={busy !== null || (t.owned === 0 && d.data!.funds < t.priceFunds)} onClick={() => void act(t.id, () => parivarExtra.sendChest(p.id, t.id), `${t.name} sent to the Parivar 🎁`)}>
                        Send
                      </Btn>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 text-[12px] text-muted">Only the Mukhiya, or people they allow, can send chests.</p>
            )}
          </>
        )}
        <AnimatePresence>
          {got ? (
            <motion.div className="absolute inset-0 z-20 grid place-items-center bg-black/85 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center">
                <motion.div className="mx-auto w-fit" initial={{ scale: 0.2, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
                  <Glyph icon={Gift} size={96} />
                </motion.div>
                <p className="mt-2 font-display text-[22px] font-extrabold text-gold">{got.label}</p>
                <Btn className="mt-5" onClick={() => setGot(null)}>
                  Nice!
                </Btn>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------ Kavach ------------------------------ */

export function KavachSheet({ p, open, onClose, onChanged }: Props) {
  const { toast } = useApp();
  const d = useLoad<KavachInfo>(() => parivarExtra.kavach(p.id), [p.id, open], 20_000);
  const now = useNow();
  const [busy, setBusy] = useState<string | null>(null);
  const a = d.data?.active;
  return (
    <BottomSheet open={open} onClose={onClose} title="🛡️ Kavach" tall>
      <div className="px-4 pb-6">
        {!d.data ? (
          <Loading error={d.error} retry={d.reload} />
        ) : (
          <>
            <div className={`rounded-3xl p-4 text-center ring-1 ${a ? "bg-gradient-to-b from-[#14301f] to-surface ring-speak/40" : "bg-surface ring-line"}`}>
              <motion.p className="text-[44px]" animate={a ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 2.4, repeat: Infinity }} aria-hidden>
                {a ? "🛡️" : "⚠️"}
              </motion.p>
              {a ? (
                <>
                  <p className="font-display text-[18px] font-extrabold text-cream">{a.name} is on</p>
                  <p className="text-[12.5px] text-speak">
                    Stops {a.strength}% of Chori attempts · {countdown(a.expiresAt, now)} left
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-[18px] font-extrabold text-cream">No Kavach</p>
                  <p className="text-[12.5px] text-muted">Your treasury ({n(p.funds)} funds) is open to Chori.</p>
                </>
              )}
            </div>
            <ul className="mt-4 space-y-2">
              {d.data.types.map((t) => (
                <li key={t.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                  <div className="flex items-center gap-3">
                    <span className="text-[24px]" aria-hidden>
                      🛡️
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold text-cream">{t.name}</span>
                      <span className="text-[11.5px] text-muted">
                        Stops {t.strength}% · lasts {t.durationMinutes >= 60 ? `${Math.round(t.durationMinutes / 60)}h` : `${t.durationMinutes}m`}
                        {t.owned > 0 ? ` · you own ${t.owned}` : ` · ${n(t.priceFunds)} funds`}
                      </span>
                      {t.locked ? <span className="block text-[11px] text-coral">Needs Parivar level {t.minLevel}</span> : null}
                      {t.cooldownLeftSeconds > 0 ? <span className="block text-[11px] text-muted">Cooling down {countdown(new Date(now + t.cooldownLeftSeconds * 1000).toISOString(), now)}</span> : null}
                    </span>
                    <Btn
                      disabled={busy !== null || !d.data!.canManage || t.locked || t.cooldownLeftSeconds > 0}
                      onClick={async () => {
                        setBusy(t.id);
                        try {
                          d.setData(await parivarExtra.activateKavach(p.id, t.id));
                          toast(`${t.name} is on 🛡️`, "gold");
                          onChanged();
                        } catch (e) {
                          toast(errText(e), "error");
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      Switch on
                    </Btn>
                  </div>
                </li>
              ))}
            </ul>
            {!d.data.canManage ? <p className="mt-3 text-[12px] text-muted">Only the Mukhiya, or people they allow, can switch on a Kavach.</p> : null}
            {d.data.history.length ? (
              <>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Recent</p>
                <ul className="mt-2 space-y-1 text-[12px] text-cream/80">
                  {d.data.history.map((h, i) => (
                    <li key={i}>
                      {h.name} · {new Date(h.startsAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      {h.by ? ` · by ${h.by}` : ""}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/* ------------------------------ Chori ------------------------------ */

export function ChoriSheet({ p, open, onClose, onChanged }: Props) {
  const { toast } = useApp();
  const d = useLoad<ChoriInfo>(() => parivarExtra.chori(p.id), [p.id, open], 20_000);
  const now = useNow();
  const [busy, setBusy] = useState<string | null>(null);
  const [res, setRes] = useState<{ result: string; amount: number; target: string } | null>(null);
  const c = d.data;
  return (
    <BottomSheet open={open} onClose={() => (res ? setRes(null) : onClose())} title="🥷 Chori" tall>
      <div className="px-4 pb-6">
        {!c ? (
          <Loading error={d.error} retry={d.reload} />
        ) : (
          <>
            {c.canToggle && c.enabled ? (
              <Card className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold text-cream">Members can use Chori</span>
                  <span className="text-[11.5px] text-muted">You, the Mukhiya, decide. Off: only you can.</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={c.membersAllowed}
                  onClick={async () => {
                    try {
                      d.setData(await parivarExtra.setChoriMembers(p.id, !c.membersAllowed));
                    } catch (e) {
                      toast(errText(e), "error");
                    }
                  }}
                  className={`relative h-7 w-12 rounded-full ${c.membersAllowed ? "bg-speak/80" : "bg-cream/20"}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${c.membersAllowed ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </Card>
            ) : null}
            {c.blockedReason ? (
              <p className="mt-3 rounded-2xl bg-coral/10 p-3.5 text-[13px] text-coral">{c.blockedReason}</p>
            ) : (
              <p className="mt-3 text-[12px] text-muted">
                {c.successPercent}% chance · takes {c.takePercent}% of their treasury (up to {n(c.maxTake)}) · {c.attemptsLeft}/{c.dailyAttempts} attempts left today
                {c.cooldownLeftSeconds > 0 ? ` · next try in ${countdown(new Date(now + c.cooldownLeftSeconds * 1000).toISOString(), now)}` : ""}
                {c.failPenalty ? ` · a failed try costs ${n(c.failPenalty)} funds` : ""}
              </p>
            )}
            {c.myKavach ? <p className="mt-2 text-[12px] text-speak">🛡️ Your {c.myKavach.name} is on ({c.myKavach.strength}%).</p> : <p className="mt-2 text-[12px] text-coral">⚠️ You have no Kavach. Others can take from your treasury.</p>}

            {c.enabled && !c.blockedReason ? (
              <>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Pick a Parivar</p>
                <ul className="mt-2 space-y-2">
                  {!c.targets.length ? <li className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-muted ring-1 ring-line">No Parivar has enough in its treasury right now.</li> : null}
                  {c.targets.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                      <span className="grid h-11 w-11 place-items-center rounded-xl text-[22px]" style={{ background: `${t.color}33` }} aria-hidden>
                        {t.emblem}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-bold text-cream">{t.name}</span>
                        <span className="text-[11.5px] text-muted">
                          [{t.sign}] · Lv {t.level} · {n(t.funds)} funds {t.kavach ? "· 🛡️ Kavach on" : ""}
                        </span>
                      </span>
                      <Btn
                        tone="danger"
                        disabled={busy !== null || c.attemptsLeft < 1 || c.cooldownLeftSeconds > 0}
                        onClick={async () => {
                          if (!window.confirm(`Try Chori on ${t.name}?`)) return;
                          setBusy(t.id);
                          try {
                            const r = await parivarExtra.attempt(p.id, t.id);
                            setRes({ ...r, target: t.name });
                            await d.reload();
                            onChanged();
                          } catch (e) {
                            toast(errText(e), "error");
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        Chori
                      </Btn>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {c.history.length ? (
              <>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">History</p>
                <ul className="mt-2 space-y-1.5 text-[12.5px]">
                  {c.history.map((h) => (
                    <li key={h.id} className="rounded-xl bg-surface px-3 py-2 ring-1 ring-line">
                      {h.direction === "OUT" ? (
                        <span>
                          {h.who ?? "Someone"} tried Chori on <b>{h.other}</b>:{" "}
                          <b className={h.result === "SUCCESS" ? "text-speak" : "text-coral"}>{h.result === "SUCCESS" ? `took ${n(h.amount)}` : h.result === "BLOCKED" ? "stopped by Kavach" : "failed"}</b>
                        </span>
                      ) : (
                        <span>
                          <b>{h.other}</b> tried Chori on you: <b className={h.result === "SUCCESS" ? "text-coral" : "text-speak"}>{h.result === "SUCCESS" ? `took ${n(h.amount)}` : h.result === "BLOCKED" ? "your Kavach held" : "failed"}</b>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
        <AnimatePresence>
          {res ? (
            <motion.div className="absolute inset-0 z-20 grid place-items-center bg-black/85 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center">
                <motion.p className="text-[64px]" initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
                  {res.result === "SUCCESS" ? "🥷" : res.result === "BLOCKED" ? "🛡️" : "😅"}
                </motion.p>
                <p className="mt-2 font-display text-[22px] font-extrabold text-cream">{res.result === "SUCCESS" ? `Chori worked! +${n(res.amount)}` : res.result === "BLOCKED" ? "Their Kavach held" : "Chori failed"}</p>
                <p className="text-[12.5px] text-muted">{res.target}</p>
                <Btn className="mt-5" onClick={() => setRes(null)}>
                  OK
                </Btn>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------ Family chat ------------------------------ */

const BACKGROUNDS: Record<string, { label: string; cls: string; dot: string }> = {
  default: { label: "Default", cls: "from-[#1c1019] to-[#0f0a10]", dot: "#2a1a24" },
  chai: { label: "Chai", cls: "from-[#3a2412] to-[#1a0f08]", dot: "#6b4423" },
  raat: { label: "Raat", cls: "from-[#101a3a] to-[#080b1a]", dot: "#1d2b66" },
  gulaab: { label: "Gulaab", cls: "from-[#3a1230] to-[#1a0818]", dot: "#7a2a66" },
};
const NAME_COLORS = ["#ffb35c", "#7fe8dc", "#ff8fb1", "#b7a1ff", "#9be37a", "#6fc6ff", "#ffd36e", "#ff8a6e"];
const colorFor = (id: string | null) => NAME_COLORS[Math.abs([...(id ?? "0")].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)) % NAME_COLORS.length];
const EMOJIS = ["🙏", "😂", "👍", "🔥", "❤️", "😍", "🎉", "👏", "😎", "🤝", "🪔", "🏏", "☕", "🎶", "😅", "🥳"];
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const t = new Date();
  const y = new Date();
  y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() === t.getFullYear() ? undefined : "numeric" });
};
type Pending = { tmp: string; text: string; at: string };

export function ChatSheet({ p, open, onClose }: Omit<Props, "onChanged">) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [prefs, setPrefs] = useState<ChatPrefs>({ muted: false, foldGifts: false, giftSound: true, background: "default" });
  const [me, setMe] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [settings, setSettings] = useState(false);
  const [tray, setTray] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [fresh, setFresh] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const last = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const { toast } = useApp();

  const toBottom = useCallback((smooth = true) => {
    const el = box.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setFresh(0);
  }, []);

  const poll = useCallback(async () => {
    try {
      const r = await parivarExtra.chat(p.id, last.current);
      setPrefs(r.prefs);
      if (r.me) setMe(r.me);
      if (r.messages.length) {
        last.current = r.messages[r.messages.length - 1].id;
        setMsgs((m) => {
          const add = r.messages.filter((x) => !m.some((y) => y.id === x.id));
          if (add.length && !atBottom.current) setFresh((f) => f + add.filter((x) => x.userId !== r.me).length);
          return [...m, ...add].slice(-300);
        });
      }
      setErr("");
    } catch (e) {
      setErr(errText(e, "Couldn't load the chat."));
    } finally {
      setLoaded(true);
    }
  }, [p.id]);

  useEffect(() => {
    if (!open) return;
    last.current = 0;
    setMsgs([]);
    setPending([]);
    setLoaded(false);
    atBottom.current = true;
    void poll();
    const t = window.setInterval(() => document.visibilityState === "visible" && void poll(), 3000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, poll, onClose]);

  useEffect(() => {
    if (atBottom.current) toBottom(msgs.length > 1);
  }, [msgs.length, pending.length, toBottom]);

  const send = async (raw?: string) => {
    const t = (raw ?? text).trim();
    if (!t) return;
    if (raw === undefined) setText("");
    setTray(false);
    const tmp = `p${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    atBottom.current = true;
    setPending((l) => [...l, { tmp, text: t, at: new Date().toISOString() }]);
    try {
      await parivarExtra.send(p.id, t);
      await poll();
    } catch (e) {
      toast(errText(e), "error");
      if (raw === undefined) setText(t);
    } finally {
      setPending((l) => l.filter((x) => x.tmp !== tmp));
    }
  };
  const setPref = async (b: Partial<ChatPrefs>) => {
    setPrefs((x) => ({ ...x, ...b }));
    try {
      setPrefs(await parivarExtra.setPrefs(p.id, b));
    } catch (e) {
      toast(errText(e), "error");
    }
  };

  const bg = BACKGROUNDS[prefs.background] ?? BACKGROUNDS.default;
  const shown = useMemo(() => (prefs.foldGifts ? msgs.filter((m) => !/sent .* to |🎁|🎰/.test(m.text) || m.kind === "TEXT") : msgs), [msgs, prefs.foldGifts]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={`absolute inset-0 z-50 flex flex-col bg-gradient-to-b ${bg.cls}`} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 340, damping: 36 }} role="dialog" aria-modal="true" aria-label={`${p.name} chat`}>
          <header className="relative z-10 flex items-center gap-2.5 border-b border-white/10 bg-black/35 px-3 pt-3 pb-2.5 backdrop-blur-md">
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-cream active:bg-white/10" aria-label="Back">
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[20px] ring-1 ring-gold/40" style={{ background: `radial-gradient(circle at 30% 25%, ${p.color}cc, ${p.color}33 75%), #1c1b22` }} aria-hidden>
              {p.emblem}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[16px] leading-tight font-extrabold text-cream">{p.name}</p>
              <p className="truncate text-[11.5px] text-cream/55">
                {n(p.memberCount)} members{prefs.muted ? " · muted" : ""}
              </p>
            </div>
            <button type="button" onClick={() => setSettings((v) => !v)} className={`grid h-10 w-10 place-items-center rounded-full ${settings ? "bg-gold/20 text-gold" : "text-cream active:bg-white/10"}`} aria-label="Chat settings" aria-expanded={settings}>
              <Settings2 className="h-5 w-5" aria-hidden />
            </button>
          </header>

          <AnimatePresence>
            {settings ? (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute top-[64px] right-3 left-3 z-20 rounded-3xl bg-[#241018]/98 p-4 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] ring-1 ring-gold/25">
                {(
                  [
                    ["muted", "Mute notifications", "No pings from this chat"],
                    ["foldGifts", "Hide gift and game lines", "Only real messages stay"],
                    ["giftSound", "Gift sound", "Play a chime on gifts"],
                  ] as const
                ).map(([k, label, hint]) => (
                  <button key={k} type="button" role="switch" aria-checked={Boolean(prefs[k])} onClick={() => void setPref({ [k]: !prefs[k] })} className="flex w-full items-center gap-3 py-2 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-cream">{label}</span>
                      <span className="block text-[11px] text-cream/45">{hint}</span>
                    </span>
                    <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${prefs[k] ? "bg-gold" : "bg-white/15"}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs[k] ? "left-[18px]" : "left-0.5"}`} />
                    </span>
                  </button>
                ))}
                <p className="mt-2 border-t border-white/10 pt-3 text-[11px] font-bold tracking-wide text-cream/50 uppercase">Chat background</p>
                <div className="mt-2 flex gap-3">
                  {Object.entries(BACKGROUNDS).map(([k, v]) => (
                    <button key={k} type="button" onClick={() => void setPref({ background: k })} className="flex flex-col items-center gap-1" aria-label={v.label} aria-pressed={prefs.background === k}>
                      <span className={`grid h-11 w-11 place-items-center rounded-full ring-2 ${prefs.background === k ? "ring-gold" : "ring-white/10"}`} style={{ background: v.dot }}>
                        {prefs.background === k ? <Check className="h-4 w-4 text-gold" aria-hidden /> : null}
                      </span>
                      <span className="text-[10.5px] text-cream/60">{v.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div
            ref={box}
            onScroll={(e) => {
              const el = e.currentTarget;
              atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              if (atBottom.current) setFresh(0);
            }}
            onClick={() => {
              setSettings(false);
              setTray(false);
            }}
            className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3"
            style={{ backgroundImage: "radial-gradient(rgba(231,188,114,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          >
            {err ? <p className="mb-2 rounded-full bg-coral/15 py-1.5 text-center text-[12px] text-coral">{err}</p> : null}
            {loaded && !shown.length && !pending.length && !err ? (
              <div className="mx-auto mt-16 max-w-[260px] text-center">
                <MessagesSquare className="mx-auto h-10 w-10 text-gold/70" strokeWidth={1.5} aria-hidden />
                <p className="mt-2 font-display text-[16px] font-extrabold text-cream">No messages yet</p>
                <p className="mt-1 text-[12.5px] text-cream/55">Say namaste. Everyone in your Parivar talks here.</p>
              </div>
            ) : null}
            {!loaded && !err ? (
              <div className="space-y-3 pt-2" aria-label="Loading chat">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`h-12 animate-pulse rounded-2xl bg-white/[0.06] ${i % 2 ? "ml-auto w-2/3" : "w-3/4"}`} />
                ))}
              </div>
            ) : null}

            {shown.map((m, i) => {
              const prev = shown[i - 1];
              const next = shown[i + 1];
              const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
              const mine = m.kind === "TEXT" && m.userId === me;
              const first = !prev || newDay || prev.kind === "SYSTEM" || prev.userId !== m.userId;
              const lastOfRun = !next || next.kind === "SYSTEM" || next.userId !== m.userId || new Date(next.at).toDateString() !== new Date(m.at).toDateString();
              return (
                <div key={m.id}>
                  {newDay ? (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-cream/70">{dayLabel(m.at)}</span>
                    </div>
                  ) : null}
                  {m.kind === "SYSTEM" ? (
                    <p className={`mx-auto my-1.5 w-fit max-w-[88%] rounded-2xl px-3 py-1.5 text-center text-[11.5px] leading-snug ${/won|gift|sent|🎁|🎰/.test(m.text) ? "bg-gold/10 text-gold/90 ring-1 ring-gold/20" : "bg-black/35 text-cream/65"}`}>{m.text}</p>
                  ) : mine ? (
                    <div className={`flex justify-end ${first ? "mt-2.5" : "mt-0.5"}`}>
                      <div className={`max-w-[80%] rounded-2xl bg-gradient-to-br from-[#f2cf8c] to-[#d9a84f] px-3 py-1.5 text-[#2a1a0c] shadow-sm ${lastOfRun ? "rounded-br-md" : ""}`}>
                        <p className="text-[14px] leading-snug break-words whitespace-pre-wrap">{m.text}</p>
                        <p className="mt-0.5 text-right text-[10px] text-[#2a1a0c]/55">{clock(m.at)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex items-end gap-2 ${first ? "mt-2.5" : "mt-0.5"}`}>
                      <div className="w-8 shrink-0">
                        {lastOfRun ? (
                          m.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <span className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-[#1a0f08]" style={{ background: colorFor(m.userId) }}>
                              {(m.name ?? "?").slice(0, 1).toUpperCase()}
                            </span>
                          )
                        ) : null}
                      </div>
                      <div className={`max-w-[78%] rounded-2xl bg-[#2c2530] px-3 py-1.5 ring-1 ring-white/5 ${lastOfRun ? "rounded-bl-md" : ""}`}>
                        {first ? (
                          <p className="text-[12px] font-bold" style={{ color: colorFor(m.userId) }}>
                            {m.name ?? "Someone"}
                          </p>
                        ) : null}
                        <p className="text-[14px] leading-snug break-words whitespace-pre-wrap text-cream">{m.text}</p>
                        <p className="mt-0.5 text-right text-[10px] text-cream/40">{clock(m.at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {pending.map((x) => (
              <div key={x.tmp} className="mt-1 flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#f2cf8c] to-[#d9a84f] px-3 py-1.5 text-[#2a1a0c] opacity-70">
                  <p className="text-[14px] leading-snug break-words whitespace-pre-wrap">{x.text}</p>
                  <p className="mt-0.5 text-right text-[10px] text-[#2a1a0c]/55">Sending…</p>
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {fresh > 0 ? (
              <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} type="button" onClick={() => toBottom()} className="absolute right-4 bottom-[84px] z-10 flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-2 text-[12px] font-extrabold text-[#2a1a0c] shadow-lg">
                <ChevronDown className="h-4 w-4" aria-hidden /> {fresh} new
              </motion.button>
            ) : null}
          </AnimatePresence>

          {tray ? (
            <div className="grid grid-cols-8 gap-1 border-t border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setText((t) => t + e)} className="grid h-9 place-items-center rounded-xl text-[22px] active:bg-white/10">
                  {e}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2 border-t border-white/10 bg-black/45 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md">
            <button type="button" onClick={() => setTray((v) => !v)} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tray ? "bg-gold/20 text-gold" : "bg-white/8 text-cream/80"}`} aria-label="Emoji" aria-expanded={tray}>
              <Smile className="h-5 w-5" aria-hidden />
            </button>
            <input
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setTray(false)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
              placeholder="Message your Parivar"
              className="h-11 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-[14.5px] text-cream placeholder:text-cream/40 focus:ring-1 focus:ring-gold/50 focus:outline-none"
              aria-label="Message"
            />
            <button type="button" onClick={() => void send()} disabled={!text.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] text-[#2a1a0c] transition active:scale-95 disabled:opacity-40" aria-label="Send">
              <Send className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ------------------------------ Tasks tab ------------------------------ */

export function TasksTab({ p, onChanged }: { p: ParivarProfile; onChanged: () => void }) {
  const { toast, refreshCoins } = useApp();
  const d = useLoad<TasksInfo>(() => parivarExtra.tasks(p.id), [p.id], 30_000);
  const now = useNow(1000);
  const [busy, setBusy] = useState<string | null>(null);
  if (!d.data) return <Loading error={d.error} retry={d.reload} />;
  const t = d.data;
  const act = async (key: string, f: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await f();
      toast(ok, "gold");
      void refreshCoins();
      await d.reload();
      onChanged();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setBusy(null);
    }
  };
  const group = (period: "DAILY" | "WEEKLY") => t.tasks.filter((x) => x.period === period);
  const reward = (k: string, a: number) => `${k === "EXP" ? "⭐" : k === "FUNDS" ? "🏛️" : k === "COINS" ? "🪙" : "✨"} ${n(a)} ${k === "EXP" ? "EXP" : k === "FUNDS" ? "funds" : k === "COINS" ? "coins" : "Charm"}`;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-black/30 py-2.5 ring-1 ring-white/10">
          <p className="font-display text-[18px] font-extrabold text-cream">{n(t.todayExp)}</p>
          <p className="text-[10.5px] text-muted">my activity today · resets in {countdown(t.dayResetsAt, now)}</p>
        </div>
        <div className="rounded-2xl bg-black/30 py-2.5 ring-1 ring-white/10">
          <p className="font-display text-[18px] font-extrabold text-cream">{n(t.weekExp)}</p>
          <p className="text-[10.5px] text-muted">this week · resets in {countdown(t.weekResetsAt, now)}</p>
        </div>
      </div>
      <Card className="flex items-center gap-3">
        <span className="text-[24px]" aria-hidden>
          📅
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold text-cream">Daily check-in</span>
          <span className="text-[11.5px] text-muted">+{n(t.checkinExp)} EXP for your Parivar</span>
        </span>
        <Btn disabled={t.checkedIn || busy !== null} onClick={() => void act("ci", () => parivarExtra.checkin(p.id), "Checked in ✅")}>
          {t.checkedIn ? "Done" : "Check in"}
        </Btn>
      </Card>
      {(["DAILY", "WEEKLY"] as const).map((per) =>
        group(per).length ? (
          <div key={per}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{per === "DAILY" ? "Daily tasks" : "Weekly tasks"}</p>
            <ul className="space-y-2">
              {group(per).map((x) => (
                <li key={x.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold text-cream">{x.title}</span>
                      <span className="text-[11.5px] text-gold">{reward(x.rewardKind, x.rewardAmount)}</span>
                    </span>
                    {x.claimed ? (
                      <span className="flex items-center gap-1 text-[12px] font-bold text-speak">
                        <Check className="h-4 w-4" /> Claimed
                      </span>
                    ) : (
                      <Btn disabled={!x.claimable || busy !== null} onClick={() => void act(x.id, () => parivarExtra.claimTask(p.id, x.id), "Reward claimed 🎉")}>
                        Claim
                      </Btn>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-coral to-gold" style={{ width: `${Math.min(100, (x.progress / x.target) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-right text-[10.5px] text-muted">
                    {n(x.progress)} / {n(x.target)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  );
}

/* ------------------------------ News tab ------------------------------ */

export function NewsTab({ p, onChanged }: { p: ParivarProfile; onChanged: () => void }) {
  const { toast } = useApp();
  const d = useLoad<NewsPost[]>(() => parivarExtra.news(p.id), [p.id]);
  const canPost = p.myPerms.includes("EDIT_ANNOUNCEMENT");
  const [form, setForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"NOTICE" | "RULE" | "EVENT">("NOTICE");
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);
  // Reading the news marks it as read
  useEffect(() => {
    if (d.data?.some((x) => x.unread)) void parivarExtra.markRead(p.id).then(onChanged).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.data?.length]);
  const run = async (f: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await f();
      if (ok) toast(ok, "gold");
      await d.reload();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const ICON = { NOTICE: "📢", RULE: "📜", EVENT: "🎉" } as const;
  return (
    <div className="space-y-3">
      {p.announcement ? (
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Announcement</p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] text-cream/90">{p.announcement}</p>
        </Card>
      ) : null}
      {canPost ? (
        form ? (
          <Card className="space-y-2">
            <div className="flex gap-1.5">
              {(["NOTICE", "RULE", "EVENT"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 rounded-full py-1.5 text-[12px] font-bold ring-1 ${kind === k ? "bg-gold/20 text-gold ring-gold/50" : "text-cream/70 ring-line"}`}>
                  {ICON[k]} {k.charAt(0) + k.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-11 w-full rounded-xl bg-ink px-3 text-[14px] text-cream ring-1 ring-line focus:outline-none" aria-label="Title" />
            <textarea value={body} maxLength={1000} rows={4} onChange={(e) => setBody(e.target.value)} placeholder="Write it for the whole Parivar" className="w-full resize-none rounded-xl bg-ink px-3 py-2 text-[14px] text-cream ring-1 ring-line focus:outline-none" aria-label="Text" />
            <label className="flex items-center gap-2 text-[12.5px] text-cream/80">
              <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} /> Pin to the top
            </label>
            <div className="flex gap-2">
              <Btn tone="soft" className="flex-1" onClick={() => setForm(false)}>
                Cancel
              </Btn>
              <Btn
                className="flex-1"
                disabled={busy || title.trim().length < 2 || !body.trim()}
                onClick={() =>
                  void run(async () => {
                    await parivarExtra.postNews(p.id, { kind, title: title.trim(), body: body.trim(), pinned: pin });
                    setTitle("");
                    setBody("");
                    setPin(false);
                    setForm(false);
                  }, "Published")
                }
              >
                Publish
              </Btn>
            </div>
          </Card>
        ) : (
          <Btn className="w-full" onClick={() => setForm(true)}>
            Write a post
          </Btn>
        )
      ) : null}
      {!d.data ? (
        <Loading error={d.error} retry={d.reload} />
      ) : !d.data.length ? (
        <p className="py-8 text-center text-[12.5px] text-muted">No posts yet.</p>
      ) : (
        <ul className="space-y-2">
          {d.data.map((x) => (
            <li key={x.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
              <div className="flex items-start gap-2">
                <span className="text-[18px]" aria-hidden>
                  {ICON[x.kind]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-cream">
                    <span className="truncate">{x.title}</span>
                    {x.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Pinned" /> : null}
                    {x.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-coral" aria-label="New" /> : null}
                  </span>
                  <span className="mt-0.5 block whitespace-pre-wrap text-[12.5px] text-cream/85">{x.body}</span>
                  <span className="mt-1 block text-[10.5px] text-muted">
                    {x.author ?? "Someone"} · {new Date(x.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </span>
                {canPost ? (
                  <span className="flex shrink-0 gap-1">
                    <button type="button" disabled={busy} onClick={() => void run(() => parivarExtra.pinNews(p.id, x.id, !x.pinned))} className="grid h-8 w-8 place-items-center rounded-full bg-cream/10 text-cream" aria-label={x.pinned ? "Unpin" : "Pin"}>
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" disabled={busy} onClick={() => window.confirm("Delete this post?") && void run(() => parivarExtra.deleteNews(p.id, x.id))} className="grid h-8 w-8 place-items-center rounded-full bg-coral/15 text-coral" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
