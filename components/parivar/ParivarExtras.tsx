"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, Coins as CoinsI, Gift, Heart as HeartI, House, Landmark, Lock, MessagesSquare, Pin, Plus, Send, Settings2, Smile, Star as StarI, Trash2 } from "lucide-react";
import { Glyph, KIND_GLYPH, RewardArt } from "./ParivarUi";
import { GiftArt } from "@/components/art/GiftArt";
import type { GiftId } from "@/lib/app/types";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin } from "@/components/ui/kit";
import { giftById } from "@/lib/app/data";
import { parseGiftCard } from "@/lib/api/parivar";
import { parivarExtra, type WorldNewsItem, type ChatMsg, type ChatPrefs, type ChestsInfo, type ChoriInfo, type CheerTier, type GachaInfo, type GachaResult, type KavachInfo, type NewsPost, type ParivarProfile, type ShopItem, type TasksInfo } from "@/lib/api/parivar";
import { getRoomById } from "@/lib/api/voice-rooms";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";

const n = (v: number) => v.toLocaleString("en-IN");
const CHAT_ROLE: Record<string, string> = { LEADER: "from-[#ff6b8a] to-[#ff8fa8]", DEPUTY: "from-[#3a8dff] to-[#5fb7ff]", ADMIN: "from-[#2fbf86] to-[#58d6a2]" };
const errText = (e: unknown, fallback = "That didn't work. Try again.") => (e instanceof Error && e.message ? e.message : fallback);
const RARITY: Record<string, string> = { COMMON: "#b9c0cc", RARE: "#5fb7ff", EPIC: "#c58bff", LEGENDARY: "#ffd36e" };
const KIND_ICON: Record<string, string> = {};

export type SheetName = "gift" | "cheer" | "gacha" | "chests" | "treasure" | "guide" | "shop" | "kavach" | "chori" | "chat" | null;

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
  { key: "chat", icon: "💬", label: "Family chat", sub: "Talk together" },
  { key: "gift", icon: "🎁", label: "Send gift", sub: "To a member" },
  { key: "gacha", icon: "🎰", label: "Gacha", sub: "Win rewards" },
  { key: "cheer", icon: "📣", label: "Cheer", sub: "Boost activity" },
  { key: "treasure", icon: "🗝️", label: "Family Treasure", sub: "Weekly chests" },
  { key: "guide", icon: "📖", label: "Guide", sub: "How a Parivar grows" },
  { key: "chests", icon: "🎁", label: "Chests", sub: "Send and claim" },
  { key: "shop", icon: "🛒", label: "Shop", sub: "Cards and chests" },
  { key: "kavach", icon: "🛡️", label: "Kavach", sub: "Guard the treasury" },
  { key: "chori", icon: "🥷", label: "Chori", sub: "Raid rival treasuries" },
];

/** Full-colour Panchayat art for each feature tile. */
const TILE_ART: Record<string, string> = { chat: "P_CHAT", gift: "P_GIFT", gacha: "P_DICE", cheer: "P_DHOL", chests: "P_CHEST", treasure: "P_CHEST", guide: "P_THALI", shop: "P_POTLI", kavach: "P_KAVACH", chori: "P_MASK", voice: "P_MIC" };

function TileArt({ k }: { k: string }) {
  return (
    <span className="grid h-[48px] w-[48px] shrink-0 place-items-center rounded-[14px_16px_14px_16px] bg-[radial-gradient(circle_at_50%_35%,#5a2a1c,#2a120f)] shadow-[inset_0_1px_0_rgba(255,220,160,0.18),0_4px_10px_-4px_rgba(0,0,0,0.8)] ring-1 ring-gold/40">
      <RewardArt kind={TILE_ART[k] ?? "EXP"} size={34} />
    </span>
  );
}

export function FeatureTiles({ p, onOpen }: { p: ParivarProfile; onOpen: (s: Exclude<SheetName, null>) => void }) {
  const { info: voice, go: onVoice } = useParivarVoice(p);
  return (
    <div className="grid grid-cols-2 gap-2">
      {TILES.map((t) => (
        <button key={t.key} type="button" onClick={() => onOpen(t.key)} className="group relative flex items-center gap-3 overflow-hidden rounded-[18px_14px_18px_16px] bg-gradient-to-br from-[#4a1a26]/90 via-[#2c1219]/90 to-[#1c0e14]/90 p-3 text-left shadow-[0_8px_18px_-12px_rgba(0,0,0,0.9)] ring-1 ring-gold/20 transition active:scale-[0.97] active:ring-gold/50">
          <TileArt k={t.key} />
          <span className="min-w-0">
            <span className="block truncate font-display text-[14px] font-extrabold text-cream">{t.label}</span>
            <span className="block truncate text-[11px] font-semibold text-gold/60">{t.sub}</span>
          </span>
        </button>
      ))}
      {voice?.enabled ? (
        <button type="button" onClick={onVoice} className="group relative flex items-center gap-3 overflow-hidden rounded-[18px_14px_18px_16px] bg-gradient-to-br from-[#4a1a26]/90 via-[#2c1219]/90 to-[#1c0e14]/90 p-3 text-left shadow-[0_8px_18px_-12px_rgba(0,0,0,0.9)] ring-1 ring-gold/20 transition active:scale-[0.97] active:ring-gold/50">
          <TileArt k="voice" />
          <span className="min-w-0">
            <span className="block truncate font-display text-[14px] font-extrabold text-cream">Voice room</span>
            <span className="block truncate text-[11px] font-semibold text-gold/60">{voice.roomId ? "Open now" : voice.unlocked ? "Start one" : `Unlocks at level ${voice.minLevel}`}</span>
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
    <BottomSheet open={open} onClose={onClose} title="Cheer" className="border-t-gold/35 bg-gradient-to-b from-[#3a1420] via-[#24101a] to-[#160c12]">
      <div className="pattern-panchayat pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
      <div className="relative px-4 pb-6">
        <div className="flex items-center gap-3 rounded-[16px_20px_16px_18px] border border-dashed border-gold/25 bg-black/20 px-3 py-2.5">
          <RewardArt kind="P_DHOL" size={36} />
          <p className="text-[12.5px] leading-snug font-semibold text-cream/70">Bajao dhol! Cheer costs coins from your wallet and gives your Parivar EXP.</p>
        </div>
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
                  className="flex w-full items-center gap-3 rounded-[18px_14px_18px_16px] bg-gradient-to-br from-[#4a1a26]/90 via-[#2c1219]/90 to-[#1c0e14]/90 p-3 text-left shadow-[0_8px_18px_-12px_rgba(0,0,0,0.9)] ring-1 ring-gold/20 transition active:scale-[0.98] active:ring-gold/50 disabled:opacity-60"
                >
                  <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px_16px_14px_16px] bg-[radial-gradient(circle_at_50%_35%,#5a2a1c,#2a120f)] shadow-[inset_0_1px_0_rgba(255,220,160,0.18),0_4px_10px_-4px_rgba(0,0,0,0.8)] ring-1 ring-gold/40" aria-hidden>
                    <RewardArt kind={t.times >= 100 ? "P_ANAAR" : t.times >= 10 ? "P_THALI" : "P_DHOL"} size={40} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[15px] font-extrabold text-cream">{t.name}</span>
                    <span className="text-[11.5px] font-semibold text-gold/60">+{n(t.expGain)} EXP · up to {n(t.dailyLimit)} a day</span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-gradient-to-b from-[#ffe08a] to-[#e0a842] px-3 py-1.5 text-[13px] font-extrabold text-[#3a2208] shadow-[0_3px_10px_-3px_rgba(242,181,46,0.6)]">
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
              {["EXP", "P_ANAAR", "P_DHOL", "P_ANAAR", "EXP"].map((k, i) => (
                <motion.span key={i} animate={{ rotate: [0, (i % 2 ? 1 : -1) * 25, 0] }}>
                  <RewardArt kind={k} size={30} />
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
                    <RewardArt kind={i.kind} size={34} />
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

type Phase = "idle" | "spin" | "drop" | "open";
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const RANK: Record<string, number> = { COMMON: 0, RARE: 1, EPIC: 2, LEGENDARY: 3 };

/** A real-looking capsule: coloured top, pearl bottom, a seam, a glass highlight. */
function Capsule({ color, size = 54, open = 0 }: { color: string; size?: number; open?: number }) {
  const half = (top: boolean) => ({
    width: size,
    height: size / 2,
    borderRadius: top ? `${size}px ${size}px 0 0` : `0 0 ${size}px ${size}px`,
    background: top
      ? `radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.9) 0 5%, rgba(255,255,255,0) 28%), linear-gradient(180deg, ${color}, ${color}cc 70%, rgba(0,0,0,0.5))`
      : "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0) 40%), linear-gradient(180deg, #f6eddc, #cdbf9f)",
    boxShadow: top ? "inset 0 4px 8px rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.25)" : "inset 0 -6px 10px rgba(0,0,0,0.25), inset 0 2px 0 rgba(0,0,0,0.2)",
  });
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <motion.span className="absolute top-0 left-0 block origin-bottom-left" style={half(true)} animate={{ y: -open * size * 0.7, rotate: -open * 38, x: -open * size * 0.2 }} transition={{ duration: 0.5, ease: "easeOut" }} />
      <motion.span className="absolute bottom-0 left-0 block" style={half(false)} animate={{ y: open * size * 0.35, rotate: open * 12 }} transition={{ duration: 0.5, ease: "easeOut" }} />
      <span className="pointer-events-none absolute top-1/2 right-0 left-0 h-[2px] -translate-y-1/2 bg-black/30" style={{ opacity: 1 - open }} />
    </span>
  );
}

const PILE: [string, number, number][] = [
  ["#c2263f", 8, 182],
  ["#1f9d6b", 54, 184],
  ["#2f7bd6", 100, 182],
  ["#d9a032", 146, 184],
  ["#a24bd6", 192, 182],
  ["#d9a032", 31, 142],
  ["#c2263f", 77, 144],
  ["#1f9d6b", 123, 142],
  ["#2f7bd6", 169, 144],
  ["#a24bd6", 54, 102],
  ["#2f7bd6", 100, 104],
  ["#c2263f", 146, 102],
];

/** Shrinks its child (never grows it) so it fits the space it is given, keeping the whole screen on one page with no scrolling. */
function FitBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i || typeof ResizeObserver === "undefined") return;
    const fit = () => {
      const h = i.offsetHeight;
      const w = i.offsetWidth;
      if (!h || !w) return;
      setScale(Math.min(1, o.clientHeight / h, o.clientWidth / w));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    ro.observe(i);
    fit();
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className={`relative flex items-start justify-center overflow-visible ${className}`}>
      <div ref={inner} className="shrink-0" style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
        {children}
      </div>
    </div>
  );
}

function Machine({ phase, name, dropColor, controls }: { phase: Phase; name: string; dropColor: string; controls?: React.ReactNode }) {
  const spin = phase === "spin";
  return (
    <motion.div className="relative mx-auto w-[316px]" animate={spin ? { x: [0, -3, 3, -3, 3, 0], rotate: [0, -0.6, 0.6, -0.6, 0.6, 0] } : { x: 0, rotate: 0 }} transition={spin ? { duration: 0.5, repeat: Infinity } : { duration: 0.2 }}>
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[48px] opacity-80 blur-2xl" style={{ background: "radial-gradient(circle at 50% 35%, rgba(255,190,110,0.35), transparent 65%)" }} aria-hidden />
      {/* canopy: a maroon jharokha top with a gold rim and marquee bulbs */}
      <div className="relative mx-auto h-[18px] w-[200px] rounded-t-[100px] bg-gradient-to-b from-[#ff8a5b] to-[#e0563a] shadow-[inset_0_2px_0_rgba(255,255,255,0.3)]" aria-hidden />
      <div className="relative mx-auto h-12 w-[300px] rounded-[16px] bg-gradient-to-b from-[#a3354f] via-[#7a1a30] to-[#5a1426] shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_0_0_3px_#e7bc72]">
        <div className="absolute inset-x-5 top-1/2 flex -translate-y-1/2 justify-between" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.span key={i} className="h-3 w-3 rounded-full bg-[#fff6d8]" animate={{ opacity: spin ? [0.25, 1, 0.25] : [0.75, 1, 0.75] }} transition={{ duration: spin ? 0.4 : 2, repeat: Infinity, delay: i * 0.08 }} style={{ boxShadow: "0 0 8px #ffe7a3, inset 0 -2px 2px rgba(201,130,26,0.5)" }} />
          ))}
        </div>
      </div>
      <div className="relative mx-auto h-3 w-[276px] bg-gradient-to-b from-[#f2d595] to-[#b98b44]" aria-hidden />
      {/* glass dome */}
      <div className="relative mx-auto h-[236px] w-[268px] overflow-hidden border-x-[7px] border-[#e7bc72] bg-gradient-to-b from-[#5a1e2c]/70 via-[#3a1420]/60 to-[#24101a]/80" style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,0.55)" }}>
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 50% 100%, rgba(255,190,110,0.35), transparent 60%)" }} aria-hidden />
        <div className="absolute inset-0">
          {PILE.map(([c, x, y], i) => (
            <motion.span
              key={i}
              className="absolute block"
              style={{ left: x, top: y }}
              animate={spin ? { x: [0, i % 2 ? 22 : -22, 0, i % 2 ? -16 : 16, 0], y: [0, -52 - (i % 4) * 14, 10, -34, 0], rotate: [0, 160, -120, 90, 0] } : { y: [0, -1.5, 0], rotate: 0 }}
              transition={spin ? { duration: 0.75, repeat: Infinity, delay: i * 0.035, ease: "easeInOut" } : { duration: 3 + (i % 3) * 0.5, repeat: Infinity, delay: i * 0.12 }}
            >
              <Capsule color={c} size={46} />
            </motion.span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 18%, transparent 30%, transparent 70%, rgba(255,255,255,0.07) 82%, transparent 100%)" }} aria-hidden />
        <div className="pointer-events-none absolute top-3 left-3 h-24 w-3 rotate-[14deg] rounded-full bg-white/30 blur-[2px]" aria-hidden />
        <div className="absolute inset-x-[30%] bottom-2 h-1.5 rounded-full bg-white/70" aria-hidden />
      </div>
      {/* cabinet: cream and gold, with the dispenser on the left and the roll buttons on the right */}
      <div className="relative mx-auto mt-0 rounded-t-[14px] bg-gradient-to-b from-[#fbe9c0] to-[#f0cd82] px-2 pt-2.5 pb-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]" style={{ width: 300 }}>
        <div className="flex h-[132px] gap-1.5">
          <div className="relative flex w-[92px] shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-[#a3354f] to-[#6e1428] shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)]">
            <span className="h-2 w-14 rounded-full bg-[#2a0a12] shadow-[0_1px_0_rgba(255,255,255,0.25)]" aria-hidden />
            {/* little striped awning over the chute */}
            <span className="mt-2.5 flex h-4 w-[64px] overflow-hidden rounded-t-md" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className={`h-full flex-1 rounded-b-full ${i % 2 ? "bg-[#fff6dc]" : "bg-[#f2b52e]"}`} />
              ))}
            </span>
            <span className="relative h-[50px] w-[56px] rounded-b-[28px] bg-[#1a060c] shadow-[inset_0_8px_14px_rgba(0,0,0,0.9)]" aria-hidden />
            <span className="mt-2 h-1.5 w-14 rounded-full bg-[#f2b52e]" aria-hidden />
            <AnimatePresence>
              {phase === "drop" || phase === "open" ? (
                <motion.div className="absolute top-[38px] left-1/2 z-10 -ml-[29px]" initial={{ y: -260, opacity: 0, scale: 0.8 }} animate={{ y: [-260, 6, -14, 6], opacity: 1, scale: 1 }} transition={{ duration: 0.85, times: [0, 0.6, 0.8, 1], ease: "easeIn" }}>
                  <Capsule color={dropColor} size={58} open={phase === "open" ? 1 : 0} />
                  {phase === "open" ? <motion.span className="absolute top-1/2 left-1/2 block h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full" initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: [0, 1, 0], scale: [0.2, 1.5, 2.2] }} transition={{ duration: 0.7 }} style={{ background: `radial-gradient(circle, ${dropColor}, rgba(255,240,200,0.6) 30%, transparent 65%)` }} /> : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div className="flex min-w-0 flex-1 gap-1.5">{controls}</div>
        </div>
      </div>
      <div className="relative mx-auto h-3 rounded-b-[10px] bg-gradient-to-b from-[#e0563a] to-[#a3354f] shadow-[0_18px_30px_-12px_rgba(0,0,0,0.9)]" style={{ width: 312 }} aria-hidden />
    </motion.div>
  );
}

/** A round medallion roll button that sits in the machine's cabinet. */
function RollButton({ label, sub, tone, badge, disabled, onClick }: { label: string; sub: string; tone: "gold" | "maroon"; badge?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="group relative flex flex-1 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-[#a3354f] to-[#6e1428] px-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition active:scale-[0.97] disabled:opacity-50">
      {badge ? <span className="absolute -top-2 right-1 z-10 rounded-full bg-gradient-to-b from-[#3fd18f] to-[#1f9a63] px-2 py-0.5 text-[9.5px] font-extrabold text-white shadow ring-2 ring-[#fbe9c0]">{badge}</span> : null}
      <span className={`grid h-[58px] w-[58px] place-items-center rounded-full ring-4 shadow-[0_4px_10px_rgba(0,0,0,0.45),inset_0_3px_4px_rgba(255,255,255,0.45)] transition group-active:translate-y-0.5 ${tone === "gold" ? "bg-gradient-to-b from-[#ffe08a] to-[#e0a842] ring-[#fff3d0]" : "bg-gradient-to-b from-[#ff8a5b] to-[#e0563a] ring-[#ffd3b0]"}`}>
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.2 1.2-6.5L2.5 9.4l6.6-.9z" fill="#fff" stroke={tone === "gold" ? "#c9821a" : "#a3354f"} strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="mt-1.5 font-display text-[15px] leading-none font-extrabold text-[#fff3da]">{label}</span>
      <span className="mt-1 line-clamp-1 text-[10px] font-bold text-[#f0cd82]">{sub}</span>
    </button>
  );
}

export function GachaSheet({ p, open, onClose, onChanged }: Props) {
  const { toast, refreshCoins } = useApp();
  const d = useLoad<GachaInfo>(() => parivarExtra.gacha(p.id), [p.id, open]);
  const [sel, setSel] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [won, setWon] = useState<GachaResult[] | null>(null);
  const [dropColor, setDropColor] = useState("#c2263f");
  const [buying, setBuying] = useState(false);
  const m = d.data?.machines[sel];
  const busy = phase !== "idle";
  // The daily free roll comes out of the Parivar fund; when the fund is short it is not offered
  const fundOk = Boolean(m && d.data && d.data.funds >= m.freeFundCost);
  const canFree = Boolean(m && m.freeLeft > 0 && fundOk);
  const buyTickets = async (qty: number) => {
    if (buying || !d.data) return;
    setBuying(true);
    try {
      const r = await parivarExtra.buyTickets(p.id, qty);
      toast(`You bought ${qty} Gacha ${qty > 1 ? "tickets" : "ticket"} · ${n(r.spent)} gold`, "gold");
      void refreshCoins();
      void d.reload();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setBuying(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (won ? setWon(null) : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, won]);

  const roll = async (times: 1 | 10) => {
    if (!m || busy) return;
    setPhase("spin");
    try {
      const [r] = await Promise.all([parivarExtra.roll(p.id, m.id, times), sleep(1700)]);
      const best = [...r.results].sort((a, b) => (RANK[b.rarity] ?? 0) - (RANK[a.rarity] ?? 0))[0];
      setDropColor(RARITY[best?.rarity ?? "COMMON"] === RARITY.COMMON ? "#c2263f" : (RARITY[best?.rarity ?? "COMMON"] ?? "#c2263f"));
      setPhase("drop");
      await sleep(950);
      setPhase("open");
      await sleep(750);
      setWon(r.results);
      void refreshCoins();
      void d.reload();
      onChanged();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setPhase("idle");
    }
  };

  const tenSub = m
    ? (() => {
        const free = canFree ? 1 : 0;
        const tk = Math.min(Math.max(0, 10 - free), d.data?.tickets ?? 0);
        const gold = Math.max(0, 10 - free - tk) * m.rollPriceCoins;
        return [free ? "1 free" : "", tk ? `${tk} card${tk > 1 ? "s" : ""}` : "", gold ? `${n(gold)} gold` : ""].filter(Boolean).join(" + ");
      })()
    : "";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#3a1420]" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 36 }} role="dialog" aria-modal="true" aria-label="Parivar Gacha">
          {/* sunburst behind the machine */}
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "repeating-conic-gradient(from 0deg at 50% 42%, rgba(255,214,150,0.07) 0deg 8deg, transparent 8deg 16deg), radial-gradient(circle at 50% 42%, #7a2436 0%, #4a1626 45%, #24101a 100%)" }} aria-hidden />
          <div className="pattern-panchayat pointer-events-none absolute inset-0 opacity-25" aria-hidden />

          {/* curved top banner */}
          <div className="relative z-10 shrink-0">
            <div className="absolute inset-x-0 top-0 bottom-0 rounded-b-[50%_36px] bg-gradient-to-b from-[#c2263f] via-[#a3354f] to-[#7a1a30] shadow-[0_10px_0_-4px_#f2b52e,0_14px_30px_-10px_rgba(0,0,0,0.7)]" aria-hidden />
            <header className="pt-safe relative flex h-14 items-center px-2">
              <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-[#fff3da] active:bg-white/10" aria-label="Back">
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </button>
              <p className="flex-1 truncate pr-10 text-center font-display text-[18px] font-extrabold text-[#fff3da] drop-shadow-[0_2px_0_rgba(90,20,38,0.6)]">{m ? `${m.name} Gacha` : "Parivar Gacha"}</p>
            </header>
            {d.data ? (
              <div className="relative flex gap-2 px-3 pb-5">
                <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[12px] bg-black/30 py-1.5 pr-1.5 pl-1.5 ring-1 ring-[#f2b52e]/40" title="Family fund">
                  <RewardArt kind="FUNDS" size={26} />
                  <span className="text-[11px] leading-tight font-extrabold text-[#fff3da]/85">Family Fund</span>
                  <span className="ml-auto text-[13.5px] font-extrabold text-[#ffe08a]">{n(d.data.funds)}</span>
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[12px] bg-black/30 py-1.5 pr-1.5 pl-1.5 ring-1 ring-[#f2b52e]/40" title="Your Gacha cards">
                  <RewardArt kind="GACHA_CARD" size={26} />
                  <span className="text-[11px] leading-tight font-extrabold text-[#fff3da]/85">Gacha Card</span>
                  <span className="ml-auto text-[13.5px] font-extrabold text-[#ffe08a]">{n(d.data.tickets)}</span>
                  <button type="button" disabled={buying} onClick={() => void buyTickets(1)} className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#ffe08a] to-[#e0a842] text-[#7a4a10] shadow-[0_2px_6px_rgba(242,181,46,0.45)] disabled:opacity-50" aria-label={`Buy a Gacha card for ${n(d.data.ticketPrice)} gold`}>
                    <Plus className="h-4 w-4" strokeWidth={3} aria-hidden />
                  </button>
                </span>
              </div>
            ) : null}
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden pb-2">
            {!d.data ? (
              <Loading error={d.error} retry={d.reload} />
            ) : (
              <>
                {d.data.machines.length > 1 ? (
                  <div className="no-scrollbar mx-3 mt-3 flex shrink-0 gap-1 overflow-x-auto rounded-full bg-black/30 p-1 ring-1 ring-[#f2b52e]/25">
                    {d.data.machines.map((x, i) => (
                      <button key={x.id} type="button" onClick={() => !busy && setSel(i)} className={`flex shrink-0 flex-1 items-center justify-center gap-1 rounded-full px-3.5 py-1.5 text-[12.5px] font-extrabold whitespace-nowrap transition ${i === sel ? "bg-gradient-to-b from-[#ffe08a] to-[#e0a842] text-[#3a2208] shadow-[0_2px_8px_rgba(242,181,46,0.4)]" : "text-[#fff3da]/65"}`}>
                        {x.name} {x.locked ? <Lock className="h-3 w-3" aria-hidden /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {m ? (
                  <>
                    <FitBox className="mt-3 min-h-0 flex-1">
                      <Machine
                        phase={phase}
                        name={m.name}
                        dropColor={dropColor}
                        controls={
                          m.locked ? (
                            <div className="grid flex-1 place-items-center rounded-xl bg-gradient-to-b from-[#a3354f] to-[#6e1428] px-3 text-center shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)]">
                              <span>
                                <Lock className="mx-auto h-7 w-7 text-[#f0cd82]" aria-hidden />
                                <span className="mt-1.5 block text-[12px] leading-snug font-extrabold text-[#fff3da]">Opens at Parivar level {m.minLevel}</span>
                              </span>
                            </div>
                          ) : (
                            <>
                              <RollButton label="Roll ×1" sub={canFree ? "Free" : d.data && d.data.tickets > 0 ? "1 Gacha Card" : `${n(m.rollPriceCoins)} gold`} tone="gold" badge={canFree ? "FREE" : undefined} disabled={busy} onClick={() => void roll(1)} />
                              <RollButton label="Roll ×10" sub={tenSub} tone="maroon" disabled={busy} onClick={() => void roll(10)} />
                            </>
                          )
                        }
                      />
                    </FitBox>
                    <p className="mt-2 shrink-0 px-6 text-center text-[12px] font-semibold text-[#fff3da]/65">
                      {m.locked
                        ? `Your Parivar needs level ${m.minLevel} to open this machine.`
                        : canFree
                          ? `1 free roll today · the Parivar fund pays ${n(m.freeFundCost)}`
                          : `Each roll: 1 Gacha Card or ${n(m.rollPriceCoins)} gold`}
                    </p>
                    {!m.locked && m.freeLeft > 0 && !fundOk ? (
                      <p className="mx-6 mt-1.5 shrink-0 rounded-2xl bg-black/30 px-3 py-1.5 text-center text-[11.5px] font-semibold text-[#ff9ab0] ring-1 ring-[#ff9ab0]/30">Family Fund not enough for the free roll ({n(m.freeFundCost)} needed). Donate to the fund, or use a card or gold.</p>
                    ) : null}
                    {!m.locked ? (
                      <div className="mt-2 flex shrink-0 justify-center gap-2 px-3">
                        {[1, 5, 10].map((q) => (
                          <button key={q} type="button" disabled={buying || busy} onClick={() => void buyTickets(q)} className="flex items-center gap-1 rounded-full bg-black/30 py-1 pr-2.5 pl-1 text-[11px] font-extrabold whitespace-nowrap text-[#fff3da] ring-1 ring-[#f2b52e]/35 active:scale-95 disabled:opacity-50">
                            <RewardArt kind="GACHA_CARD" size={18} /> ×{q} · <Coin className="h-3.5 w-3.5" /> {n((d.data?.ticketPrice ?? 0) * q)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </div>

          {/* Reward preview strip */}
          {m ? (
            <div className="relative z-10 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex items-end justify-between">
                <span className="rounded-tr-[18px] bg-gradient-to-b from-[#ffb347] to-[#e0563a] py-2 pr-6 pl-4 font-display text-[16px] font-extrabold text-[#fff3da] shadow-[inset_0_2px_0_rgba(255,255,255,0.3)] drop-shadow-[0_2px_0_rgba(122,26,48,0.5)]">Reward Preview</span>
                {!m.locked && m.freeLeft > 0 ? (
                  <span className="mr-3 mb-1.5 flex items-center gap-1 text-[11.5px] font-extrabold text-[#fff3da]/80">
                    Free roll fee: <RewardArt kind="FUNDS" size={16} /> {n(m.freeFundCost)}
                  </span>
                ) : null}
              </div>
              <div className="border-t-[3px] border-[#ffb347] bg-[#1c0c13]/95 pt-2.5 pb-1">
                <ul className="grid grid-cols-5 gap-x-2 gap-y-2 px-3">
                  {m.rewards.map((r, i) => {
                    const col = RARITY[r.rarity] ?? "#e7bc72";
                    return (
                      <motion.li key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }} className="flex min-w-0 flex-col items-center text-center">
                        <span className="relative grid aspect-square w-full max-w-[62px] place-items-center overflow-hidden rounded-[14px] bg-gradient-to-b from-[#fff6e4] to-[#f0dcb4]" style={{ boxShadow: `0 0 0 2px ${col}, inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 18px -10px ${col}` }} aria-hidden>
                          {r.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.imageUrl} alt="" className="h-12 w-12 object-contain" />
                          ) : r.kind === "GIFT_CARD" && r.giftId ? (
                            <span className="h-11 w-11">
                              <GiftArt id={r.giftId as GiftId} />
                            </span>
                          ) : (
                            <RewardArt kind={r.kind} size={46} />
                          )}
                          {r.kind === "GIFT_CARD" ? <span className="absolute inset-x-0 bottom-0 bg-[#7a1a30]/85 text-center text-[9px] font-extrabold text-[#fff3da]">Gift Card</span> : null}
                        </span>
                        <span className="mt-1 line-clamp-1 w-full text-[10px] leading-tight font-extrabold text-[#fff3da]/90">{r.label}</span>
                        <span className="text-[10px] font-extrabold" style={{ color: col }}>
                          {r.chance}%
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}

          <AnimatePresence>
            {won ? (
              <motion.div className="absolute inset-0 z-30 grid place-items-center bg-black/80 px-5 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Gacha result">
                <motion.div initial={{ scale: 0.85, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 250, damping: 22 }} className="relative w-full max-w-[340px] overflow-hidden rounded-[30px] bg-gradient-to-b from-[#2d1a27] to-[#130a11] px-5 pt-7 pb-5 text-center shadow-[0_40px_90px_-10px_rgba(0,0,0,0.95)] ring-1 ring-gold/35">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f6d899] to-transparent" aria-hidden />
                  <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-gold/25 blur-3xl" aria-hidden />
                  <p className="relative font-display text-[24px] font-extrabold tracking-tight text-cream">{won.length > 1 ? "Shabaash!" : "You won"}</p>
                  <p className="relative text-[11.5px] text-cream/50">{won.length > 1 ? `${won.length} rewards` : "A fresh reward for the Parivar"}</p>
                  <div className={`relative mt-4 grid gap-2.5 ${won.length > 1 ? "grid-cols-3" : "grid-cols-1 justify-items-center"}`}>
                    {won.map((r, i) => {
                      const G = KIND_GLYPH[r.kind] ?? Gift;
                      const col = RARITY[r.rarity] ?? "#e7bc72";
                      return (
                        <motion.div key={i} initial={{ rotateY: 90, opacity: 0, scale: 0.7 }} animate={{ rotateY: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.12 + i * 0.09, type: "spring", stiffness: 200, damping: 16 }} className="flex flex-col items-center" style={{ perspective: 600 }}>
                          <span className="grid place-items-center rounded-2xl bg-white/[0.06]" style={{ width: won.length > 1 ? 74 : 104, height: won.length > 1 ? 74 : 104, boxShadow: `0 0 0 1.5px ${col}, 0 10px 28px -8px ${col}, inset 0 1px 0 rgba(255,255,255,0.15)` }}>
                            <RewardArt kind={r.kind} size={won.length > 1 ? 50 : 78} />
                          </span>
                          <span className="mt-1.5 text-[11.5px] leading-tight font-bold text-cream">{r.label}</span>
                          <span className="text-[9.5px] font-bold tracking-wider uppercase" style={{ color: col }}>
                            {r.rarity.toLowerCase()}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                  <p className="relative mt-4 text-[10.5px] leading-snug text-cream/45">Coins and charm go to your wallet; funds and chests wait in the treasury; Kavach shields the whole Parivar.</p>
                  <button type="button" onClick={() => setWon(null)} className="relative mt-4 h-12 w-full rounded-full bg-gradient-to-b from-[#f6dc9c] to-[#c08f43] font-display text-[15px] font-extrabold text-[#2a1a0c] shadow-[0_10px_24px_-8px_rgba(240,205,130,0.6)] active:scale-[0.98]">
                    Collect
                  </button>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
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

export function ChatSheet({ p, open, onClose, onHome, onGift }: Omit<Props, "onChanged"> & { onHome?: () => void; onGift?: (to?: string) => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [prefs, setPrefs] = useState<ChatPrefs>({ muted: false, foldGifts: false, giftSound: true, background: "default" });
  const [me, setMe] = useState<string | null>(null);
  const [pick, setPick] = useState<ChatMsg | null>(null);
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
            {p.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-gold/50" />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[20px] ring-1 ring-gold/40" style={{ background: `radial-gradient(circle at 30% 25%, ${p.color}cc, ${p.color}33 75%), #1c1b22` }} aria-hidden>
                {p.emblem}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[17px] leading-tight font-extrabold text-cream">
                {p.name} <span className="font-semibold text-cream/50">({n(p.memberCount)})</span>
              </p>
              {prefs.muted ? <p className="truncate text-[11.5px] text-cream/55">Notifications muted</p> : null}
            </div>
            {onHome ? (
              <button type="button" onClick={onHome} className="grid h-10 w-10 place-items-center rounded-full text-cream active:bg-white/10" aria-label="Parivar home">
                <House className="h-5 w-5" aria-hidden />
              </button>
            ) : null}
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
                  {m.kind === "SYSTEM" && parseGiftCard(m.text) ? (
                    <GiftCardLine c={parseGiftCard(m.text)!} />
                  ) : m.kind === "SYSTEM" ? (
                    <p className={`mx-auto my-1.5 w-fit max-w-[88%] rounded-2xl px-3 py-1.5 text-center text-[11.5px] leading-snug ${/won|gift|sent|🎁|🎰/.test(m.text) ? "bg-gold/10 text-gold/90 ring-1 ring-gold/20" : "bg-black/35 text-cream/65"}`}>{m.text}</p>
                  ) : mine ? (
                    <div className={`flex justify-end ${first ? "mt-2.5" : "mt-0.5"} ${onGift ? "cursor-pointer" : ""}`} onClick={() => onGift && m.userId && setPick(m)}>
                      <div className={`max-w-[80%] rounded-2xl bg-gradient-to-br from-[#f2cf8c] to-[#d9a84f] px-3 py-1.5 text-[#2a1a0c] shadow-sm ${lastOfRun ? "rounded-br-md" : ""}`}>
                        <p className="text-[14px] leading-snug break-words whitespace-pre-wrap">{m.text}</p>
                        <p className="mt-0.5 text-right text-[10px] text-[#2a1a0c]/55">{clock(m.at)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex items-end gap-2 ${first ? "mt-2.5" : "mt-0.5"} ${onGift && m.userId ? "cursor-pointer" : ""}`} onClick={() => onGift && m.userId && setPick(m)} role={onGift && m.userId ? "button" : undefined} aria-label={onGift && m.userId ? `Options for ${m.name ?? "this member"}` : undefined}>
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
                          <p className="flex items-center gap-1.5 text-[12px] font-bold">
                            <span className="truncate" style={{ color: colorFor(m.userId) }}>
                              {m.name ?? "Someone"}
                            </span>
                            {(() => {
                              const role = p.members.find((x) => x.userId === m.userId)?.role;
                              return role && role !== "MEMBER" ? <span className={`shrink-0 rounded-md bg-gradient-to-r px-1.5 py-px text-[9.5px] font-bold text-white ${CHAT_ROLE[role]}`}>{role === "LEADER" ? "Leader" : role === "DEPUTY" ? "Deputy" : "Admin"}</span> : null;
                            })()}
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
            {onGift ? (
              <button type="button" onClick={() => onGift()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] text-[#2a1a0c]" aria-label="Send a gift to a member">
                <Gift className="h-5 w-5" aria-hidden />
              </button>
            ) : null}
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

          <BottomSheet open={Boolean(pick)} onClose={() => setPick(null)} title={pick?.name ?? "Member"}>
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => {
                  const to = pick?.userId ?? undefined;
                  setPick(null);
                  if (to) onGift?.(to);
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c]"
              >
                <Gift className="h-5 w-5" aria-hidden /> {pick?.userId === me ? "Send a gift to yourself" : `Send a gift to ${pick?.name ?? "them"}`}
              </button>
              <button type="button" onClick={() => setPick(null)} className="mt-2 h-11 w-full rounded-full bg-white/10 text-[14px] font-semibold text-cream">
                Cancel
              </button>
            </div>
          </BottomSheet>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ------------------------------ Tasks tab ------------------------------ */

/** A round reward icon: EXP star, Parivar funds, coins or Charm heart. */
export function RewardIcon({ kind, size = 28 }: { kind: string; size?: number }) {
  const m: Record<string, [typeof StarI, string, string]> = {
    EXP: [StarI, "#ffb347", "#ff7a2f"],
    FUNDS: [Landmark, "#f6d899", "#c9954a"],
    COINS: [CoinsI, "#ffe27a", "#e0a31c"],
    CHARM: [HeartI, "#ff9db8", "#e5456f"],
  };
  const [Ic, from, to] = m[kind] ?? m.EXP;
  return (
    <span className="grid shrink-0 place-items-center rounded-full ring-1 ring-white/25" style={{ width: size, height: size, background: `linear-gradient(145deg, ${from}, ${to})` }} title={kind} aria-label={kind}>
      <Ic className="text-white drop-shadow" style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.2} aria-hidden />
    </span>
  );
}

const TASK_NOTE: Record<string, string> = {
  CHECKINS: "Check in once a day.",
  GIFT_EXP: "Send gifts to people in your Parivar.",
  CHEERS: "Cheer for your Parivar.",
  DONATED_COINS: "Donate coins to the Parivar fund.",
  ACTIVITY_EXP: "Earn activity for your Parivar.",
};

export function TasksTab({ p, onChanged, onGo }: { p: ParivarProfile; onChanged: () => void; onGo?: (metric: string) => void }) {
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
  const pill = "shrink-0 rounded-full px-5 py-2 text-[13px] font-extrabold disabled:opacity-50";
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-cream/80">
            <RewardIcon kind="FUNDS" size={26} /> Parivar Fund
          </span>
          <span className="font-display text-[15px] font-extrabold text-cream">{n(p.funds)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-cream/80">
            <RewardIcon kind="EXP" size={26} /> This week
          </span>
          <span className="font-display text-[15px] font-extrabold text-cream">{n(t.weekExp)}</span>
        </div>
      </div>
      <div className="mt-3 rounded-3xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-[18px] font-extrabold text-cream">
            Activity Today: <span className="text-gold">{n(t.todayExp)}</span>
          </p>
          <p className="pt-1 text-right text-[11px] text-cream/50">Refreshes in {countdown(t.dayResetsAt, now)}</p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold/15 text-[20px] ring-1 ring-gold/30" aria-hidden>
            📅
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-bold text-cream">Daily check-in</span>
            <span className="text-[11.5px] text-cream/55">+{n(t.checkinExp)} activity for your Parivar</span>
          </span>
          <button type="button" disabled={t.checkedIn || busy !== null} onClick={() => void act("ci", () => parivarExtra.checkin(p.id), "Checked in ✅")} className={`${pill} bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] text-[#2a1a0c]`}>
            {t.checkedIn ? "Done" : "Check in"}
          </button>
        </div>
      </div>
      {(["DAILY", "WEEKLY"] as const).map((per) =>
        group(per).length ? (
          <div key={per} className="mt-4">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-cream/45">{per === "DAILY" ? "Daily tasks" : "Weekly tasks"}</p>
            <ul>
              {group(per).map((x) => (
                <li key={x.id} className="flex items-center gap-3 border-b border-white/[0.07] py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-bold text-cream">
                      {x.title}
                      {x.target > 1 ? (
                        <span className="font-semibold text-cream/50">
                          {" "}
                          ({n(Math.min(x.progress, x.target))}/{n(x.target)})
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-cream/50">{TASK_NOTE[x.metric] ?? ""}</span>
                    <span className="mt-1.5 flex items-center gap-1.5">
                      <RewardIcon kind={x.rewardKind} size={26} />
                      <span className="text-[12px] font-bold text-cream/85">×{n(x.rewardAmount)}</span>
                      <span className="ml-1 h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full rounded-full bg-gradient-to-r from-coral to-gold" style={{ width: `${Math.min(100, (x.progress / Math.max(1, x.target)) * 100)}%` }} />
                      </span>
                    </span>
                  </span>
                  {x.claimed ? (
                    <span className={`${pill} bg-white/10 text-cream/50`}>Done</span>
                  ) : x.claimable ? (
                    <button type="button" disabled={busy !== null} onClick={() => void act(x.id, () => parivarExtra.claimTask(p.id, x.id), "Reward claimed 🎉")} className={`${pill} bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] text-[#2a1a0c]`}>
                      Claim
                    </button>
                  ) : (
                    <button type="button" onClick={() => onGo?.(x.metric)} className={`${pill} bg-white/10 text-gold ring-1 ring-gold/40`}>
                      Go
                    </button>
                  )}
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

function FamilyNotices({ p, onChanged }: { p: ParivarProfile; onChanged: () => void }) {
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

/** The gift card in the family chat, drawn like the room's: who sent what, then what the receiver got. */
function GiftCardLine({ c }: { c: NonNullable<ReturnType<typeof parseGiftCard>> }) {
  const g = giftById(c.giftId as GiftId);
  const to = c.everyone ? `everyone (${c.people})` : c.self ? "themselves" : c.to;
  return (
    <div className="mx-auto my-2 w-[min(92%,300px)] overflow-hidden rounded-2xl bg-gradient-to-br from-gold/20 via-black/40 to-black/40 text-cream ring-1 ring-gold/25">
      <div className="flex items-center gap-2.5 px-3 pb-2 pt-2.5">
        <span className="min-w-0 flex-1 text-[12.5px] leading-snug">
          <span className="font-bold text-gold">{c.from}</span> sent <span className="font-bold text-gold">{to}</span> {g.name} <span className="font-display font-extrabold italic text-gold">×{c.count}</span>
          {g.blurb ? <span className="mt-0.5 block text-[11.5px] text-cream/65">{g.blurb}</span> : null}
        </span>
        <GiftArt id={c.giftId as GiftId} className="h-11 w-11 shrink-0" />
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 px-3 py-1.5 text-[11.5px]">
        <span className="text-cream/60">{c.everyone ? "Total" : "Receiver’s"}</span>
        <span className="flex items-center gap-1 font-bold text-gold">
          <Coin className="h-3.5 w-3.5" /> Coins +{c.earned.toLocaleString("en-IN")}
        </span>
        <span className="flex items-center gap-1 font-bold text-pink">
          <HeartI className="h-3.5 w-3.5 fill-current" aria-hidden /> Charm +{c.charm.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 24) return `${Math.floor(m / 60)} h ago`;
  return `${Math.floor(m / 60 / 24)} d ago`;
};

const WORLD_ICON: Record<WorldNewsItem["kind"], string> = { LEVEL_UP: "\u{1F389}", CHEST: "\u{1F381}", ATTACK: "\u{1F977}" };

/** World news: what happens across all Parivars. The system writes it (level ups, chests opened, funds taken); nobody posts it by hand. */
export function WorldNews() {
  const d = useLoad<WorldNewsItem[]>(() => parivarExtra.worldNews(), [], 30_000);
  if (!d.data) return <p className="py-8 text-center text-[13px] text-muted">{d.error || "Loading…"}</p>;
  if (!d.data.length) return <p className="py-8 text-center text-[13px] text-muted">Nothing yet. Level ups, chests and attacks will show up here.</p>;
  return (
    <ul className="space-y-2">
      {d.data.map((x) => (
        <li key={x.id} className="flex items-start gap-3 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-white/10">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2a1520] text-[20px]">
            {x.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={x.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              WORLD_ICON[x.kind]
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] leading-snug text-cream/90">{x.text}</span>
            <span className="mt-0.5 block text-[11px] text-cream/45">{ago(x.at)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The News tab: World news (automatic) and the family's own notices. */
export function NewsTab({ p, onChanged }: { p: ParivarProfile; onChanged: () => void }) {
  const [view, setView] = useState<"world" | "family">("world");
  return (
    <div className="space-y-3">
      <div className="flex gap-2" role="tablist" aria-label="News">
        {(
          [
            ["world", "World news"],
            ["family", "Family notices"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`flex-1 rounded-full py-2 text-[12.5px] font-bold ring-1 ${view === k ? "bg-gold/15 text-gold ring-gold/50" : "text-cream/70 ring-line"}`}>
            {label}
          </button>
        ))}
      </div>
      {view === "world" ? <WorldNews /> : <FamilyNotices p={p} onChanged={onChanged} />}
    </div>
  );
}
