"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pin, Send, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin } from "@/components/ui/kit";
import { parivarExtra, type ChatMsg, type ChatPrefs, type ChestsInfo, type ChoriInfo, type CheerTier, type GachaInfo, type GachaResult, type KavachInfo, type NewsPost, type ParivarProfile, type ShopItem, type TasksInfo } from "@/lib/api/parivar";
import { getRoomById } from "@/lib/api/voice-rooms";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";

const n = (v: number) => v.toLocaleString("en-IN");
const errText = (e: unknown, fallback = "That didn't work. Try again.") => (e instanceof Error && e.message ? e.message : fallback);
const RARITY: Record<string, string> = { COMMON: "#b9c0cc", RARE: "#5fb7ff", EPIC: "#c58bff", LEGENDARY: "#ffd36e" };
const KIND_ICON: Record<string, string> = { COINS: "🪙", FUNDS: "🏛️", CHARM: "✨", CHEST: "🎁", CARD: "🎫", BARRIER: "🛡️", EXP: "⭐" };

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

const TILES: { key: Exclude<SheetName, null>; icon: string; label: string; sub: string }[] = [
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
        <button key={t.key} type="button" onClick={() => onOpen(t.key)} className="flex items-center gap-2.5 rounded-2xl bg-surface p-3 text-left ring-1 ring-line active:scale-[0.98]">
          <span className="text-[24px]" aria-hidden>
            {t.icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold text-cream">{t.label}</span>
            <span className="block truncate text-[10.5px] text-muted">{t.sub}</span>
          </span>
        </button>
      ))}
      {voice?.enabled ? (
        <button type="button" onClick={onVoice} className="flex items-center gap-2.5 rounded-2xl bg-surface p-3 text-left ring-1 ring-line active:scale-[0.98]">
          <span className="text-[24px]" aria-hidden>
            🎙️
          </span>
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
      toast(`${i.name} added to the Parivar 🎁`, "gold");
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
                  ) : i.kind === "GACHA_CARD" ? (
                    "🎫"
                  ) : i.kind === "CHEST" ? (
                    "🎁"
                  ) : (
                    "🛡️"
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
    <BottomSheet open={open} onClose={() => (won ? setWon(null) : onClose())} title="🎰 Gacha" tall>
      <div className="px-4 pb-6">
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
                <div className="relative mt-3 overflow-hidden rounded-3xl bg-gradient-to-b from-[#4a1d82] via-[#2a1048] to-[#12041f] p-4 text-center ring-1 ring-gold/30">
                  <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-gold/25 blur-3xl" aria-hidden />
                  <motion.div className="relative mx-auto grid h-36 w-36 place-items-center rounded-full bg-black/30 text-[64px] ring-2 ring-gold/40" animate={spin ? { rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.08, 1, 1.08, 1] } : { y: [0, -4, 0] }} transition={spin ? { duration: 1.2 } : { duration: 3, repeat: Infinity }}>
                    {m.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.imageUrl} alt="" className="h-28 w-28 object-contain" />
                    ) : (
                      "🎰"
                    )}
                    {spin
                      ? ["🔴", "🟡", "🟢", "🔵", "🟣"].map((c, i) => (
                          <motion.span key={i} className="absolute text-[18px]" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], x: [0, (i - 2) * 26], y: [0, -50 - i * 6] }} transition={{ duration: 1.1, delay: i * 0.1, repeat: Infinity }}>
                            {c}
                          </motion.span>
                        ))
                      : null}
                  </motion.div>
                  <p className="relative mt-3 font-display text-[19px] font-extrabold text-cream">{m.name}</p>
                  <p className="relative text-[12px] text-cream/70">
                    {m.freeLeft > 0 ? `${m.freeLeft} free spin${m.freeLeft > 1 ? "s" : ""} today · ` : ""}
                    {m.cards} card{m.cards === 1 ? "" : "s"} · {n(m.priceFunds)} funds a roll{m.serviceFeeCoins ? ` + ${n(m.serviceFeeCoins)} coins fee` : ""}
                  </p>
                  <p className="relative mt-1 text-[11.5px] text-gold">Treasury: {n(d.data.funds)} funds</p>
                  {m.locked ? (
                    <p className="relative mt-3 rounded-full bg-black/40 py-2 text-[12.5px] font-bold text-cream/80">🔒 Your Parivar needs level {m.minLevel}</p>
                  ) : (
                    <div className="relative mt-3 grid grid-cols-2 gap-2">
                      <Btn disabled={busy || (!d.data.canRoll && m.freeLeft < 1)} onClick={() => void roll(1)}>
                        Roll ×1
                      </Btn>
                      <Btn disabled={busy || !d.data.canRoll} onClick={() => void roll(10)}>
                        Roll ×10
                      </Btn>
                    </div>
                  )}
                  {!m.locked && !d.data.canRoll ? <p className="relative mt-2 text-[11px] text-cream/60">Only free spins for you: spending the Parivar&apos;s funds or cards needs permission from the Mukhiya.</p> : null}
                </div>

                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">What you can win</p>
                <ul className="mt-2 space-y-1.5">
                  {m.rewards.map((r, i) => (
                    <li key={i} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2 ring-1 ring-line">
                      <span className="text-[18px]" aria-hidden>
                        {KIND_ICON[r.kind] ?? "🎁"}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" style={{ color: RARITY[r.rarity] ?? "#fff" }}>
                        {r.label}
                      </span>
                      <span className="text-[11.5px] font-bold text-cream/70">{r.chance}%</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}

        <AnimatePresence>
          {won ? (
            <motion.div className="absolute inset-0 z-20 grid place-items-center bg-black/85 px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Gacha result">
              <div className="w-full max-w-[340px] text-center">
                <p className="font-display text-[22px] font-extrabold text-gold">{won.length > 1 ? "Your rewards" : "You won!"}</p>
                <div className={`mt-3 grid gap-2 ${won.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {won.map((r, i) => (
                    <motion.div key={i} initial={{ scale: 0.3, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: i * 0.12, type: "spring", stiffness: 220, damping: 16 }} className="rounded-2xl bg-surface px-3 py-3 ring-2" style={{ boxShadow: `0 0 18px ${RARITY[r.rarity] ?? "#fff"}55`, borderColor: RARITY[r.rarity] }}>
                      <p className="text-[28px]" aria-hidden>
                        {KIND_ICON[r.kind] ?? "🎁"}
                      </p>
                      <p className="mt-0.5 text-[13px] font-bold" style={{ color: RARITY[r.rarity] ?? "#fff" }}>
                        {r.label}
                      </p>
                      <p className="text-[10.5px] uppercase tracking-wide text-muted">{r.rarity}</p>
                    </motion.div>
                  ))}
                </div>
                <Btn className="mt-5 w-full" onClick={() => setWon(null)}>
                  Great!
                </Btn>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </BottomSheet>
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
    <BottomSheet open={open} onClose={onClose} title="🎁 Chests" tall>
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
                    <span className="text-[28px]" aria-hidden>
                      🎁
                    </span>
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
                      <span className="text-[24px]" aria-hidden>
                        🎁
                      </span>
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
                <motion.p className="text-[64px]" initial={{ scale: 0.2, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
                  🎁
                </motion.p>
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

const BACKGROUNDS: Record<string, string> = { default: "from-[#1c1019] to-[#0f0a10]", chai: "from-[#3a2412] to-[#1a0f08]", raat: "from-[#101a3a] to-[#080b1a]", gulaab: "from-[#3a1230] to-[#1a0818]" };

export function ChatSheet({ p, open, onClose }: Omit<Props, "onChanged">) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [prefs, setPrefs] = useState<ChatPrefs>({ muted: false, foldGifts: false, giftSound: true, background: "default" });
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [settings, setSettings] = useState(false);
  const last = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const { toast } = useApp();

  const poll = useCallback(async () => {
    try {
      const r = await parivarExtra.chat(p.id, last.current);
      setPrefs(r.prefs);
      if (r.messages.length) {
        last.current = r.messages[r.messages.length - 1].id;
        setMsgs((m) => [...m, ...r.messages.filter((x) => !m.some((y) => y.id === x.id))].slice(-200));
      }
      setErr("");
    } catch (e) {
      setErr(errText(e, "Couldn't load the chat."));
    }
  }, [p.id]);
  useEffect(() => {
    if (!open) return;
    last.current = 0;
    setMsgs([]);
    void poll();
    const t = window.setInterval(() => document.visibilityState === "visible" && void poll(), 4000);
    return () => window.clearInterval(t);
  }, [open, poll]);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs.length]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      await parivarExtra.send(p.id, t);
      await poll();
    } catch (e) {
      toast(errText(e), "error");
      setText(t);
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
    <BottomSheet open={open} onClose={onClose} title={`💬 ${p.name}`} tall headerRight={<button type="button" onClick={() => setSettings((s) => !s)} className="rounded-full bg-cream/10 px-3 py-1 text-[11.5px] font-bold text-cream">Settings</button>}>
      <div className={`flex h-[62vh] flex-col bg-gradient-to-b ${bg}`}>
        {settings ? (
          <div className="space-y-2 border-b border-line px-4 py-3 text-[13px]">
            {(
              [
                ["muted", "Mute chat notifications"],
                ["foldGifts", "Fold gift and game messages"],
                ["giftSound", "Gift sound"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between">
                <span>{label}</span>
                <input type="checkbox" checked={Boolean(prefs[k])} onChange={(e) => void setPref({ [k]: e.target.checked })} />
              </label>
            ))}
            <div className="flex gap-2 pt-1">
              {Object.keys(BACKGROUNDS).map((b) => (
                <button key={b} type="button" onClick={() => void setPref({ background: b })} className={`rounded-full px-3 py-1 text-[11.5px] font-bold ring-1 ${prefs.background === b ? "bg-gold/20 text-gold ring-gold/50" : "text-cream/70 ring-line"}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div ref={box} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {err ? <p className="text-center text-[12px] text-coral">{err}</p> : null}
          {!shown.length && !err ? <p className="py-10 text-center text-[12.5px] text-muted">No messages yet. Say namaste 🙏</p> : null}
          {shown.map((m) =>
            m.kind === "SYSTEM" ? (
              <p key={m.id} className="mx-auto max-w-[90%] rounded-full bg-black/30 px-3 py-1 text-center text-[11.5px] text-cream/70">
                {m.text}
              </p>
            ) : (
              <div key={m.id} className="flex items-start gap-2">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#2a1520] text-[12px] font-bold text-white">{(m.name ?? "?").slice(0, 1).toUpperCase()}</span>
                )}
                <div className="min-w-0 rounded-2xl rounded-tl-sm bg-surface px-3 py-2 ring-1 ring-line">
                  <p className="text-[11px] font-bold text-gold">{m.name ?? "Someone"}</p>
                  <p className="whitespace-pre-wrap break-words text-[13.5px] text-cream">{m.text}</p>
                </div>
              </div>
            ),
          )}
        </div>
        <div className="flex gap-2 border-t border-line p-3">
          <input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} placeholder="Message your Parivar" className="h-11 min-w-0 flex-1 rounded-full bg-surface px-4 text-[14px] text-cream ring-1 ring-line focus:outline-none focus:ring-gold/50" aria-label="Message" />
          <button type="button" onClick={() => void send()} disabled={!text.trim()} className="grid h-11 w-11 place-items-center rounded-full bg-gold text-ink disabled:opacity-40" aria-label="Send">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </BottomSheet>
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
