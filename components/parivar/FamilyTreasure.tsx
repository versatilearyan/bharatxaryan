"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { treasureApi, type ParivarProfile, type TreasureInfo, type TreasureItem, type TreasureMine, type TreasureOpening, type TreasureRarity } from "@/lib/api/parivar";
import { useApp } from "@/lib/app/store";

/* Family Treasure: weekly chests (Normal / Advanced / Rare / Super), the Treasure with its unlock timer, the send options for
   the Leader and Deputies, and the opening show every member sees. All results come from the server; this only shows them. */

const n = (v: number) => v.toLocaleString("en-IN");
const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : "That didn't work. Try again.");

type Theme = { name: string; body: [string, string]; lid: [string, string]; trim: string; glow: string; accent: string; flame?: boolean };
const THEMES: Record<string, Theme> = {
  NORMAL: { name: "Normal", body: ["#8a5a32", "#4a2c16"], lid: ["#a36d3c", "#5e381b"], trim: "#e7bc72", glow: "#f2c777", accent: "#f2c777" },
  ADVANCED: { name: "Advanced", body: ["#3f5fd0", "#1d2a6b"], lid: ["#5a7df0", "#27388a"], trim: "#cdd9ff", glow: "#7aa2ff", accent: "#9d7bff" },
  RARE: { name: "Rare", body: ["#7b2fc9", "#35125f"], lid: ["#9a4de6", "#451a7a"], trim: "#ffd36e", glow: "#c07bff", accent: "#ffd36e" },
  SUPER: { name: "Super", body: ["#d9a62b", "#6b4208"], lid: ["#f6cf5c", "#8a5a10"], trim: "#fff1b0", glow: "#ffcf4a", accent: "#b04dff", flame: true },
};
export const themeOf = (code: string): Theme => THEMES[code] ?? THEMES.NORMAL;
const RARITY_COLOR: Record<TreasureRarity, string> = { COMMON: "#b9c0cc", PREMIUM: "#5fb7ff", EPIC: "#c58bff", LEGENDARY: "#ffd36e", ULTRA_RARE: "#ff5d8f" };
const RARITY_LABEL: Record<TreasureRarity, string> = { COMMON: "Common", PREMIUM: "Premium", EPIC: "Epic", LEGENDARY: "Legendary", ULTRA_RARE: "Ultra Rare" };
const KIND_EMOJI: Record<string, string> = { GIFT: "🎁", ITEM: "🖼️", VIP_CARD: "👑", TITLE: "🏷️", BADGE: "🎖️", COLLECTIBLE: "✨", PROFILE_TITLE: "🏷️" };
const bigRarity = (r: TreasureRarity) => r === "LEGENDARY" || r === "ULTRA_RARE";

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s` : `${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
};

/* ------------------------------ sound (synthesised, no files) ------------------------------ */

function useSound() {
  const ctx = useRef<AudioContext | null>(null);
  const get = () => {
    try {
      if (!ctx.current) ctx.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (ctx.current.state === "suspended") void ctx.current.resume();
      return ctx.current;
    } catch {
      return null;
    }
  };
  const tone = (freq: number, dur: number, type: OscillatorType = "sine", vol = 0.12, delay = 0, slide = 0) => {
    const c = get();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  };
  return {
    rumble: () => {
      for (let i = 0; i < 6; i++) tone(70 + (i % 2) * 14, 0.22, "sawtooth", 0.07, i * 0.24);
    },
    open: () => {
      tone(220, 1.1, "triangle", 0.12, 0, 440);
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.9, "sine", 0.1, 0.12 + i * 0.06));
    },
    reveal: (r: TreasureRarity) => {
      const base = { COMMON: 660, PREMIUM: 784, EPIC: 880, LEGENDARY: 988, ULTRA_RARE: 1175 }[r];
      tone(base, 0.28, "sine", 0.1);
      tone(base * 1.5, 0.35, "triangle", 0.07, 0.07);
      if (bigRarity(r)) [1, 1.25, 1.5, 2].forEach((m, i) => tone(base * m, 0.7, "sawtooth", 0.05, 0.1 + i * 0.09));
    },
    fanfare: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.6, "triangle", 0.09, i * 0.11)),
  };
}

/* ------------------------------ the chest ------------------------------ */

export function ChestArt({ tier, size = 170, open = false, shake = false }: { tier: string; size?: number; open?: boolean; shake?: boolean }) {
  const t = themeOf(tier);
  const id = useMemo(() => `ch${tier}${Math.random().toString(36).slice(2, 7)}`, [tier]);
  return (
    <motion.div style={{ width: size, height: size * 0.9, perspective: 600 }} animate={shake ? { rotate: [0, -4, 4, -5, 5, -3, 3, 0], x: [0, -4, 4, -5, 5, -3, 3, 0] } : { rotateY: [-6, 6, -6] }} transition={shake ? { duration: 1.5, ease: "easeInOut" } : { duration: 6, repeat: Infinity, ease: "easeInOut" }}>
      <svg viewBox="0 0 200 180" width="100%" height="100%" style={{ overflow: "visible", filter: `drop-shadow(0 0 18px ${t.glow}88)` }}>
        <defs>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.body[0]} />
            <stop offset="1" stopColor={t.body[1]} />
          </linearGradient>
          <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.lid[0]} />
            <stop offset="1" stopColor={t.lid[1]} />
          </linearGradient>
          <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff8d6" />
            <stop offset="0.5" stopColor={t.trim} />
            <stop offset="1" stopColor="#b8862e" />
          </linearGradient>
          <radialGradient id={`${id}g`}>
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="0.4" stopColor={t.glow} stopOpacity="0.7" />
            <stop offset="1" stopColor={t.glow} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="100" cy="168" rx="78" ry="9" fill="#000" opacity="0.35" />
        {/* light coming out of the open chest */}
        {open ? (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <polygon points="42,86 158,86 230,-80 -30,-80" fill={`url(#${id}g)`} opacity="0.75" />
            <ellipse cx="100" cy="86" rx="62" ry="14" fill={`url(#${id}g)`} />
          </motion.g>
        ) : null}
        {/* body */}
        <rect x="30" y="84" width="140" height="74" rx="9" fill={`url(#${id}b)`} stroke={`url(#${id}t)`} strokeWidth="3" />
        <rect x="30" y="84" width="140" height="10" fill="#000" opacity="0.25" />
        <rect x="48" y="84" width="12" height="74" fill={`url(#${id}t)`} opacity="0.9" />
        <rect x="140" y="84" width="12" height="74" fill={`url(#${id}t)`} opacity="0.9" />
        <rect x="30" y="146" width="140" height="12" rx="5" fill={`url(#${id}t)`} opacity="0.85" />
        {[44, 156].map((x) => (
          <circle key={x} cx={x} cy="120" r="3.2" fill="#fff1b0" />
        ))}
        {/* lid (turns up from the back hinge) */}
        <motion.g style={{ transformOrigin: "170px 86px" }} animate={{ rotate: open ? -62 : 0 }} transition={{ type: "spring", stiffness: 70, damping: 11 }}>
          <path d="M30 86 Q30 30 100 30 Q170 30 170 86 Z" fill={`url(#${id}l)`} stroke={`url(#${id}t)`} strokeWidth="3" />
          <rect x="48" y="38" width="12" height="48" fill={`url(#${id}t)`} opacity="0.9" />
          <rect x="140" y="38" width="12" height="48" fill={`url(#${id}t)`} opacity="0.9" />
          <path d="M44 60 Q100 22 156 60" stroke="#fff" strokeOpacity="0.28" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* lock */}
          <rect x="88" y="76" width="24" height="22" rx="5" fill={`url(#${id}t)`} stroke="#6b4208" strokeWidth="1.5" />
          <circle cx="100" cy="86" r="3.3" fill="#3b2208" />
          {tier === "RARE" || tier === "SUPER" ? <polygon points="100,44 108,56 100,68 92,56" fill={tier === "SUPER" ? "#c46bff" : "#ffd36e"} stroke="#fff" strokeWidth="1" /> : null}
        </motion.g>
      </svg>
    </motion.div>
  );
}

/** Purple dragon flames behind the Super chest. */
function Flames({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-1" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.span key={i} className="block rounded-full blur-[6px]" style={{ width: 22 + (i % 3) * 8, height: 70 + (i % 4) * 26, background: `linear-gradient(to top, ${color}, #ff7bd5aa, transparent)`, transformOrigin: "bottom" }} animate={{ scaleY: [0.7, 1.15, 0.8, 1.05], opacity: [0.55, 0.95, 0.6, 0.9] }} transition={{ duration: 0.9 + (i % 4) * 0.18, repeat: Infinity, delay: i * 0.07 }} />
      ))}
    </div>
  );
}

function Particles({ color, count = 26 }: { color: string; count?: number }) {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: (i * 37) % 100, d: 2.4 + ((i * 13) % 20) / 10, s: 3 + (i % 4) * 2, de: ((i * 7) % 30) / 10 })), [count]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((p, i) => (
        <motion.span key={i} className="absolute bottom-[-10px] rounded-full" style={{ left: `${p.x}%`, width: p.s, height: p.s, background: color, boxShadow: `0 0 8px ${color}` }} animate={{ y: [0, -520], opacity: [0, 1, 0] }} transition={{ duration: p.d + 1.5, repeat: Infinity, delay: p.de, ease: "easeOut" }} />
      ))}
    </div>
  );
}

/* ------------------------------ the opening show ------------------------------ */

type Phase = "names" | "shake" | "open" | "reveal" | "done";

export function TreasureOpeningStage({ data, myName, onClose }: { data: TreasureOpening; myName?: string; onClose: () => void }) {
  const t = themeOf(data.tier);
  const sound = useSound();
  const [phase, setPhase] = useState<Phase>("names");
  const [shown, setShown] = useState(0);
  // The smallest prizes first, the biggest last
  const order = useMemo(() => [...data.payouts].sort((a, b) => a.score - b.score), [data.payouts]);
  const best = data.topUserId;
  const timers = useRef<number[]>([]);
  const later = (f: () => void, ms: number) => {
    timers.current.push(window.setTimeout(f, ms));
  };
  useEffect(() => {
    const ts = timers.current;
    const names = Math.min(4200, 1400 + data.payouts.length * 160);
    later(() => {
      setPhase("shake");
      sound.rumble();
    }, names);
    later(() => {
      setPhase("open");
      sound.open();
    }, names + 1700);
    later(() => setPhase("reveal"), names + 3200);
    return () => ts.forEach((x) => window.clearTimeout(x));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (phase !== "reveal") return;
    if (shown >= order.length) {
      later(() => {
        setPhase("done");
        sound.fanfare();
      }, 700);
      return;
    }
    const cur = order[shown];
    const top = cur.items.reduce<TreasureRarity>((a, it) => (Object.keys(RARITY_COLOR).indexOf(it.rarity) > Object.keys(RARITY_COLOR).indexOf(a) ? it.rarity : a), "COMMON");
    sound.reveal(top);
    later(() => setShown((s) => s + 1), bigRarity(top) ? 2600 : 1700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, shown]);

  const skip = () => {
    timers.current.forEach((x) => window.clearTimeout(x));
    setShown(order.length);
    setPhase("done");
  };
  const current = phase === "reveal" ? order[Math.min(shown, order.length - 1)] : null;
  const currentTop = current?.items.some((i) => bigRarity(i.rarity));

  return (
    <motion.div className="fixed inset-0 z-[90] overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: `radial-gradient(circle at 50% 38%, ${t.accent}44 0%, transparent 62%), #0b0610` }}>
      <Particles color={t.glow} count={data.tier === "SUPER" ? 44 : 26} />
      {data.tier === "SUPER" ? <Flames color="#9b3dff" /> : null}
      <button type="button" onClick={phase === "done" ? onClose : skip} className="absolute right-4 top-4 z-20 rounded-full bg-black/40 px-4 py-2 text-[12px] font-bold text-cream ring-1 ring-white/20">
        {phase === "done" ? "Close" : "Skip"}
      </button>

      <div className="relative z-10 flex h-full flex-col items-center px-4 pt-14 text-center">
        <p className="font-display text-[13px] font-extrabold uppercase tracking-[0.2em]" style={{ color: t.accent }}>
          {data.name}
        </p>
        <p className="mt-1 text-[12px] text-cream/70">{data.sentBy ? `Opened by ${data.sentBy}` : "Family Treasure"}</p>

        <div className="relative mt-6 flex items-center justify-center transition-[height] duration-500" style={{ height: phase === "reveal" || phase === "done" ? 110 : 190 }}>
          <motion.div animate={phase === "reveal" || phase === "done" ? { scale: 0.62, y: -20 } : { scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 90, damping: 14 }}>
            <ChestArt tier={data.tier} size={190} open={phase === "open" || phase === "reveal" || phase === "done"} shake={phase === "shake"} />
          </motion.div>
          {phase === "open" ? <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.9 }} /> : null}
        </div>

        {phase === "names" || phase === "shake" || phase === "open" ? (
          <div className="mt-4 flex max-h-[34vh] flex-wrap justify-center gap-2 overflow-hidden">
            {data.payouts.map((p, i) => (
              <motion.span key={p.userId} initial={{ opacity: 0, y: 12, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.15 }} className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-cream ring-1 ring-white/20">
                {p.name}
              </motion.span>
            ))}
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {current ? (
            <motion.div key={current.userId} initial={{ opacity: 0, scale: 0.6, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -20 }} transition={{ type: "spring", stiffness: 160, damping: 16 }} className="relative mt-3 w-full max-w-[340px]">
              {currentTop ? <motion.div className="absolute -inset-6 rounded-[36px] blur-2xl" style={{ background: `${t.accent}77` }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} /> : null}
              <RewardCard p={current} theme={t} isTop={best === current.userId && order.length > 1} me={myName === current.name} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {phase === "done" ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-2 w-full max-w-[380px] flex-1 overflow-y-auto pb-8 text-left scroll-thin">
            <p className="mb-2 text-center font-display text-[15px] font-extrabold text-cream">{order.length > 1 ? "Everyone's rewards" : "Rewards"}</p>
            <ul className="space-y-2">
              {[...order].reverse().map((p) => (
                <li key={p.userId}>
                  <RewardCard p={p} theme={t} isTop={best === p.userId && order.length > 1} me={myName === p.name} compact />
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}

function Initial({ name, url }: { name: string; url?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="font-display text-[15px] font-extrabold text-cream">{name.slice(0, 1).toUpperCase()}</span>;
}

function ItemChip({ it }: { it: TreasureItem }) {
  const c = RARITY_COLOR[it.rarity] ?? "#b9c0cc";
  return (
    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: `${c}22`, color: c, boxShadow: `inset 0 0 0 1px ${c}66` }}>
      {it.imageUrl ? (
        <span className="block h-5 w-5 shrink-0">
          <SvgaAnim src={it.imageUrl} className="h-full w-full object-contain" />
        </span>
      ) : (
        <span>{KIND_EMOJI[it.kind] ?? "🎁"}</span>
      )}
      {it.label}
      {bigRarity(it.rarity) ? <span className="text-[9.5px] uppercase tracking-wider opacity-80">{RARITY_LABEL[it.rarity]}</span> : null}
    </span>
  );
}

function RewardCard({ p, theme, isTop, me, compact = false }: { p: TreasureOpening["payouts"][number]; theme: Theme; isTop: boolean; me: boolean; compact?: boolean }) {
  return (
    <div className={`relative rounded-[22px] bg-gradient-to-b from-[#2b1636]/95 to-[#14091d]/95 ${compact ? "p-3" : "p-4"} ring-1`} style={{ boxShadow: isTop ? `0 0 0 2px ${theme.accent}, 0 0 28px ${theme.accent}66` : undefined, ["--tw-ring-color" as string]: me ? theme.accent : "rgba(255,255,255,0.14)" } as CSSProperties}>
      {isTop ? <span className="absolute -top-3 left-4 rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#2a1a0c]" style={{ background: theme.accent }}>👑 Top prize</span> : null}
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
          <Initial name={p.name} url={p.avatarUrl} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-extrabold text-cream">
            {p.name}
            {me ? " (you)" : ""}
          </span>
          <span className="flex flex-wrap gap-x-3 text-[12.5px] font-bold">
            {p.coins > 0 ? <span className="text-[#ffd36e]">🪙 {n(p.coins)}</span> : null}
            {p.diamonds > 0 ? <span className="text-[#7fd6ff]">💎 {n(p.diamonds)}</span> : null}
          </span>
        </span>
      </div>
      {p.items.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.items.map((it, i) => (
            <ItemChip key={i} it={it} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ the Treasure sheet ------------------------------ */

function Btn({ children, onClick, disabled, tone = "gold", className = "" }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: "gold" | "soft"; className?: string }) {
  const cls = tone === "gold" ? "bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] text-[#2a1a0c]" : "bg-cream/10 text-cream";
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded-full px-4 py-2.5 text-[13px] font-extrabold disabled:opacity-45 ${cls} ${className}`}>
      {children}
    </button>
  );
}

type Props = { p: ParivarProfile; open: boolean; onClose: () => void; onChanged: () => void };

export function TreasureSheet({ p, open, onClose, onChanged }: Props) {
  const { toast, refreshCoins } = useApp();
  const [d, setD] = useState<TreasureInfo | null>(null);
  const [err, setErr] = useState("");
  const [mine, setMine] = useState<TreasureMine | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [mode, setMode] = useState<"ALL" | "TARGET" | "TAKE_ALL">("ALL");
  const [target, setTarget] = useState("");
  const [stage, setStage] = useState<TreasureOpening | null>(null);
  const [tab, setTab] = useState<"chests" | "history" | "mine">("chests");
  const now = useNow();
  const loadedAt = useRef(Date.now());

  const load = useCallback(async () => {
    try {
      const r = await treasureApi.state(p.id);
      setD(r);
      loadedAt.current = Date.now();
      setErr("");
    } catch (e) {
      setErr(errText(e));
    }
  }, [p.id]);
  useEffect(() => {
    if (!open) return;
    void load();
    const t = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(t);
  }, [open, load]);
  useEffect(() => {
    if (open && tab === "mine") void treasureApi.mine(p.id).then(setMine).catch(() => undefined);
  }, [open, tab, p.id]);

  const play = async (did: string) => {
    try {
      setStage(await treasureApi.opening(p.id, did));
      void treasureApi.seen(p.id, did).catch(() => undefined);
    } catch (e) {
      toast(errText(e), "error");
    }
  };
  const run = async (key: string, f: () => Promise<void>) => {
    setBusy(key);
    try {
      await f();
      await load();
      onChanged();
      void refreshCoins();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const chestOf = sending ? d?.chests.find((c) => c.id === sending) : null;
  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Family Treasure" tall>
        <div className="px-4 pb-8">
          {!d ? (
            err ? (
              <button type="button" onClick={() => void load()} className="my-6 block w-full rounded-2xl bg-coral/10 p-4 text-center text-[13px] text-coral">
                {err} Tap to retry.
              </button>
            ) : (
              <div className="mx-auto my-10 h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-gold" aria-label="Loading" />
            )
          ) : (
            <>
              <div className="flex items-center justify-between rounded-2xl bg-surface p-3 ring-1 ring-line">
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">This week&apos;s activity</span>
                  <span className="font-display text-[18px] font-extrabold text-cream">{n(d.weekActivity)}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">My diamonds</span>
                  <span className="font-display text-[18px] font-extrabold text-[#7fd6ff]">💎 {n(d.diamonds)}</span>
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                {(["chests", "history", "mine"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-full py-2 text-[12.5px] font-extrabold ${tab === k ? "bg-gold/90 text-[#2a1a0c]" : "bg-cream/10 text-cream"}`}>
                    {k === "chests" ? "Treasure" : k === "history" ? "Openings" : "My rewards"}
                  </button>
                ))}
              </div>

              {tab === "chests" ? (
                <>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Your chests</p>
                  <ul className="mt-2 space-y-3">
                    {!d.chests.length ? <li className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-muted ring-1 ring-line">No chest yet. Reach a weekly activity target below to earn one.</li> : null}
                    {d.chests.map((c) => {
                      const th = themeOf(c.tier);
                      const left = c.status === "TREASURE" ? Math.max(0, c.secondsLeft - Math.floor((now - loadedAt.current) / 1000)) : 0;
                      const ready = c.status === "TREASURE" && left === 0;
                      return (
                        <li key={c.id} className="relative overflow-hidden rounded-[22px] p-3 ring-1 ring-white/15" style={{ background: `linear-gradient(135deg, ${th.body[1]}ee, #160a1f)` }}>
                          <div className="flex items-center gap-3">
                            <ChestArt tier={c.tier} size={86} />
                            <span className="min-w-0 flex-1">
                              <span className="block font-display text-[15px] font-extrabold text-cream">{c.name}</span>
                              <span className="block text-[12px] font-bold text-[#ffd36e]">
                                🪙 {n(c.poolCoins)} {c.poolDiamonds > 0 ? <span className="text-[#7fd6ff]">· 💎 {n(c.poolDiamonds)}</span> : null}
                              </span>
                              <span className="mt-0.5 block text-[12px] font-bold" style={{ color: th.accent }}>
                                {c.status === "AVAILABLE" ? "Available to claim" : ready ? "Ready to Open" : `Unlocks in ${clock(left)}`}
                              </span>
                              {c.claimedBy ? <span className="block text-[11px] text-cream/60">Claimed by {c.claimedBy}</span> : null}
                            </span>
                          </div>
                          <div className="mt-3 flex justify-end">
                            {c.status === "AVAILABLE" ? (
                              <Btn disabled={busy !== null} onClick={() => void run(c.id, async () => { await treasureApi.claim(p.id, c.id); toast("Moved to the Family Treasure 🗝️", "gold"); })}>
                                Claim
                              </Btn>
                            ) : ready && d.canSend ? (
                              <Btn disabled={busy !== null} onClick={() => { setMode("ALL"); setTarget(""); setSending(c.id); }}>
                                Send Chest
                              </Btn>
                            ) : ready ? (
                              <span className="text-[12px] text-cream/70">Waiting for the Leader or a Deputy to send it</span>
                            ) : (
                              <span className="rounded-full bg-black/30 px-3 py-1.5 text-[12px] font-bold text-cream/80">🔒 Locked</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Weekly activity chests</p>
                  <ul className="mt-2 space-y-2">
                    {d.tiers
                      .filter((t) => t.enabled)
                      .map((t) => {
                        const th = themeOf(t.code);
                        const pct = Math.min(100, Math.round((d.weekActivity / t.target) * 100));
                        return (
                          <li key={t.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                            <div className="flex items-center gap-3">
                              <ChestArt tier={t.code} size={52} />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-2">
                                  <span className="font-display text-[14px] font-extrabold text-cream">{t.name}</span>
                                  <span className="text-[11.5px] font-bold" style={{ color: th.accent }}>
                                    {t.earnedThisWeek ? "Earned ✓" : `${n(Math.min(d.weekActivity, t.target))} / ${n(t.target)}`}
                                  </span>
                                </span>
                                <span className="mt-1 block h-2 overflow-hidden rounded-full bg-black/40">
                                  <span className="block h-full rounded-full" style={{ width: `${t.earnedThisWeek ? 100 : pct}%`, background: `linear-gradient(90deg, ${th.body[0]}, ${th.accent})` }} />
                                </span>
                                <span className="mt-1 block text-[11px] text-muted">
                                  🪙 {n(t.poolCoins)}
                                  {t.poolDiamonds > 0 ? ` · 💎 ${n(t.poolDiamonds)}` : ""} · unlocks {t.unlockMinutes} min after claiming
                                </span>
                              </span>
                            </div>
                            {t.rewards.length ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {t.rewards.slice(0, 6).map((r, i) => (
                                  <span key={i} className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: `${RARITY_COLOR[r.rarity]}22`, color: RARITY_COLOR[r.rarity] }}>
                                    {KIND_EMOJI[r.kind] ?? "🎁"} {r.label}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                  </ul>
                </>
              ) : null}

              {tab === "history" ? (
                <ul className="mt-4 space-y-2">
                  {!d.history.length ? <li className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-muted ring-1 ring-line">No chest has been opened yet.</li> : null}
                  {d.history.map((h) => (
                    <li key={h.id}>
                      <button type="button" onClick={() => void play(h.id)} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-line active:scale-[0.99]">
                        <ChestArt tier={h.tier} size={48} open />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-bold text-cream">{h.name}</span>
                          <span className="block text-[11.5px] text-muted">
                            {h.mode === "ALL" ? `${h.members} members` : h.mode === "TAKE_ALL" ? "Taken by the sender" : "Sent to one member"} · 🪙 {n(h.coins)}
                            {h.diamonds ? ` · 💎 ${n(h.diamonds)}` : ""}
                          </span>
                          <span className="block text-[11px] text-cream/50">
                            {h.sentBy ? `by ${h.sentBy} · ` : ""}
                            {new Date(h.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </span>
                        <span className="text-[11.5px] font-extrabold text-gold">Watch</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {tab === "mine" ? (
                !mine ? (
                  <div className="mx-auto my-8 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-gold" />
                ) : (
                  <div className="mt-4 space-y-3">
                    {mine.collection.length ? (
                      <>
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">My Parivar collection</p>
                        <div className="grid grid-cols-3 gap-2">
                          {mine.collection.map((c, i) => (
                            <div key={i} className="flex flex-col items-center rounded-2xl bg-surface p-2 text-center ring-1 ring-gold/25">
                              <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-black/30">
                                {c.imageUrl ? <SvgaAnim src={c.imageUrl} className="h-full w-full object-contain" /> : <span className="text-[26px]">{c.kind === "TITLE" ? "🏷️" : c.kind === "GIFT" ? "🎁" : "🎖️"}</span>}
                              </span>
                              <span className="mt-1 line-clamp-2 text-[11.5px] font-bold leading-tight text-cream">{c.label}</span>
                              <span className="text-[9.5px] uppercase tracking-wider text-gold/70">{c.kind}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                    {!mine.wins.length ? <p className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-muted ring-1 ring-line">You haven&apos;t won from a chest yet.</p> : null}
                    {mine.wins.map((w, i) => (
                      <div key={i} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-bold text-cream">{w.chest}</span>
                          <span className="text-[11px] text-muted">{new Date(w.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {w.coins > 0 ? <span className="text-[12.5px] font-bold text-[#ffd36e]">🪙 {n(w.coins)}</span> : null}
                          {w.diamonds > 0 ? <span className="text-[12.5px] font-bold text-[#7fd6ff]">💎 {n(w.diamonds)}</span> : null}
                          {w.items.map((it, j) => (
                            <ItemChip key={j} it={it} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : null}
            </>
          )}
        </div>
      </BottomSheet>

      <BottomSheet open={!!chestOf} onClose={() => setSending(null)} title="Send Chest">
        {chestOf && d ? (
          <div className="px-4 pb-8">
            <p className="text-[12.5px] text-muted">
              {chestOf.name} · 🪙 {n(chestOf.poolCoins)}
              {chestOf.poolDiamonds > 0 ? ` · 💎 ${n(chestOf.poolDiamonds)}` : ""}. Everything inside is chosen on the server by luck.
            </p>
            {(
              [
                ["ALL", "Distribute to All Members", "Every member gets a lucky share. Some get more than others."],
                ["TARGET", "Send to a particular member", "That one member receives the whole chest."],
                ["TAKE_ALL", "Take All", "You keep the whole chest for yourself."],
              ] as const
            ).map(([k, title, sub]) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={`mt-3 block w-full rounded-2xl p-3 text-left ring-1 ${mode === k ? "bg-gold/15 ring-gold" : "bg-surface ring-line"}`}>
                <span className="block text-[14px] font-extrabold text-cream">
                  {mode === k ? "◉ " : "○ "}
                  {title}
                </span>
                <span className="block text-[12px] text-muted">{sub}</span>
              </button>
            ))}
            {mode === "ALL" ? (
              <ul className="mt-3 max-h-[28vh] space-y-1 overflow-y-auto rounded-2xl bg-black/20 p-2 scroll-thin">
                {d.members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-2 px-2 py-1 text-[12.5px] text-cream">
                    <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-white/10 text-[11px] font-bold">
                      <Initial name={m.name} url={m.avatarUrl} />
                    </span>
                    {m.name}
                    <span className="ml-auto text-[10.5px] uppercase text-muted">{m.role}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {mode === "TARGET" ? (
              <ul className="mt-3 max-h-[28vh] space-y-1 overflow-y-auto rounded-2xl bg-black/20 p-2 scroll-thin">
                {d.members.map((m) => (
                  <li key={m.userId}>
                    <button type="button" onClick={() => setTarget(m.userId)} className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[12.5px] text-cream ${target === m.userId ? "bg-gold/20" : ""}`}>
                      <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-white/10 text-[11px] font-bold">
                        <Initial name={m.name} url={m.avatarUrl} />
                      </span>
                      {m.name}
                      <span className="ml-auto">{target === m.userId ? "✓" : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <Btn
              className="mt-4 w-full"
              disabled={busy !== null || (mode === "TARGET" && !target)}
              onClick={() =>
                void run("send", async () => {
                  const r = await treasureApi.send(p.id, chestOf.id, mode, mode === "TARGET" ? target : undefined);
                  setSending(null);
                  await play(r.distributionId);
                })
              }
            >
              {busy === "send" ? "Opening…" : mode === "ALL" ? "Open for everyone" : mode === "TARGET" ? "Send to this member" : "Take all"}
            </Btn>
          </div>
        ) : null}
      </BottomSheet>

      <AnimatePresence>{stage ? <TreasureOpeningStage key={stage.id} data={stage} onClose={() => setStage(null)} /> : null}</AnimatePresence>
    </>
  );
}

/** Watches for a chest that was just opened, so every member sees the same opening show once. */
export function TreasureWatcher({ p }: { p: ParivarProfile }) {
  const [stage, setStage] = useState<TreasureOpening | null>(null);
  const shownRef = useRef<string | null>(null);
  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const s = await treasureApi.state(p.id);
        if (!live || !s.pendingReveal || shownRef.current === s.pendingReveal) return;
        shownRef.current = s.pendingReveal;
        const o = await treasureApi.opening(p.id, s.pendingReveal);
        if (!live) return;
        setStage(o);
        void treasureApi.seen(p.id, s.pendingReveal).catch(() => undefined);
      } catch {
        /* the Treasure just isn't shown this time */
      }
    };
    void tick();
    const t = window.setInterval(() => void tick(), 20_000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [p.id]);
  return <AnimatePresence>{stage ? <TreasureOpeningStage key={stage.id} data={stage} onClose={() => setStage(null)} /> : null}</AnimatePresence>;
}
