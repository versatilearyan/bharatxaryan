"use client";

/**
 * The look of Gaon ka Gaddaar: glossy neon buttons, a bouncy loading screen, confetti on the result,
 * and profile pictures that fall back to a coloured initial when a picture can't be loaded.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GADDAR_COLORS, type GaddarPlayer, type GaddarState } from "@/lib/api/gaddar";

/* ---------------- faces ---------------- */

export function Face({ p, size = 40 }: { p: Pick<GaddarPlayer, "name" | "avatarUrl" | "color">; size?: number }) {
  const c = GADDAR_COLORS[p.color % GADDAR_COLORS.length];
  const [broken, setBroken] = useState<string | null>(null);
  const ring = { boxShadow: `0 0 0 3px ${c}, 0 0 14px ${c}66` };
  if (p.avatarUrl && p.avatarUrl !== broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={p.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setBroken(p.avatarUrl ?? null)} className="shrink-0 rounded-full bg-black/30 object-cover" style={{ width: size, height: size, ...ring }} />
    );
  }
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-display font-extrabold text-white" style={{ width: size, height: size, background: `linear-gradient(135deg, ${c}, ${c}aa)`, fontSize: size * 0.42, ...ring }}>
      {p.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ---------------- buttons ---------------- */

const TONES = {
  danger: ["#ff8a95", "#e0243a", "#8a0f22"],
  gold: ["#fff0b0", "#f5b83d", "#b8741a"],
  mint: ["#b8ffd9", "#22c58b", "#0b6b4a"],
  violet: ["#e2d0ff", "#8b5cf6", "#4c2a9a"],
} as const;
export type Tone = keyof typeof TONES;

export function ActionBtn({ label, icon, enabled, tone, onPress, pulse = false }: { label: string; icon: React.ReactNode; enabled: boolean; tone: Tone; onPress: () => void; pulse?: boolean }) {
  const [hi, mid, lo] = TONES[tone];
  return (
    <motion.button
      type="button"
      disabled={!enabled}
      onClick={onPress}
      whileTap={enabled ? { scale: 0.88 } : undefined}
      animate={enabled && pulse ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={enabled && pulse ? { duration: 1.1, repeat: Infinity } : undefined}
      className={`relative flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full text-white transition ${enabled ? "" : "opacity-45 grayscale"}`}
      style={{
        background: enabled ? `radial-gradient(circle at 30% 22%, ${hi}, ${mid} 45%, ${lo})` : "radial-gradient(circle at 30% 22%, #6b6b78, #2a2a33)",
        boxShadow: enabled ? `0 0 0 3px rgba(255,255,255,0.22), 0 0 18px ${mid}aa, 0 10px 18px -8px #000` : "0 0 0 2px rgba(255,255,255,0.08)",
      }}
    >
      <span className="flex h-6 items-center justify-center drop-shadow">{icon}</span>
      <span className="mt-0.5 text-[10px] font-extrabold leading-none tracking-wide drop-shadow">{label}</span>
    </motion.button>
  );
}

export function HoldBtn({ label, enabled, onDown, onUp, icon }: { label: string; enabled: boolean; onDown: () => void; onUp: () => void; icon: React.ReactNode }) {
  const [hi, mid, lo] = TONES.mint;
  return (
    <motion.button
      type="button"
      disabled={!enabled}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onDown();
      }}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}
      animate={enabled ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={enabled ? { duration: 1.2, repeat: Infinity } : undefined}
      className={`relative flex h-[78px] w-[78px] touch-none flex-col items-center justify-center rounded-full text-white ${enabled ? "" : "opacity-45 grayscale"}`}
      style={{
        background: enabled ? `radial-gradient(circle at 30% 22%, ${hi}, ${mid} 45%, ${lo})` : "radial-gradient(circle at 30% 22%, #6b6b78, #2a2a33)",
        boxShadow: enabled ? `0 0 0 3px rgba(255,255,255,0.25), 0 0 22px ${mid}bb, 0 12px 20px -8px #000` : "0 0 0 2px rgba(255,255,255,0.08)",
      }}
    >
      <span className="flex h-7 items-center justify-center drop-shadow">{icon}</span>
      <span className="text-[12px] font-extrabold leading-none drop-shadow">{label}</span>
      <span className="mt-0.5 text-[8.5px] font-bold leading-none opacity-85">daba ke rakho</span>
    </motion.button>
  );
}

/** A small glass chip for the top bar. */
export function Chip({ children, tone = "glass" }: { children: React.ReactNode; tone?: "glass" | "red" | "green" }) {
  const bg = tone === "red" ? "linear-gradient(135deg,#ff5f6d,#b3123a)" : tone === "green" ? "linear-gradient(135deg,#34d399,#0b7a55)" : "rgba(255,255,255,0.12)";
  return (
    <span className="rounded-full px-3 py-1 text-[11.5px] font-extrabold text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md" style={{ background: bg }}>
      {children}
    </span>
  );
}

/* ---------------- confetti ---------------- */

export function Confetti({ pieces = ["🎉", "✨", "🪔", "🎊", "⭐"], count = 26 }: { pieces?: string[]; count?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (i * 37 + 13) % 100,
        delay: ((i * 53) % 30) / 10,
        dur: 3.2 + ((i * 17) % 20) / 10,
        size: 14 + ((i * 11) % 14),
        char: pieces[i % pieces.length],
        spin: i % 2 ? 360 : -360,
      })),
    [count, pieces],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((p, i) => (
        <motion.span key={i} className="absolute top-0" style={{ left: `${p.x}%`, fontSize: p.size }} initial={{ y: -40, rotate: 0, opacity: 0 }} animate={{ y: 520, rotate: p.spin, opacity: [0, 1, 1, 0] }} transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeIn" }}>
          {p.char}
        </motion.span>
      ))}
    </div>
  );
}

/* ---------------- loading ---------------- */

export function Loading({ progress, now, steps, hints }: { progress: number; now: number; steps: { label: string; done: boolean }[]; hints: string[] }) {
  const hint = hints[Math.floor(now / 2600) % hints.length];
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ background: "linear-gradient(160deg,#2a1450,#7a2a5a 45%,#e07a3a)" }}
      animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
      role="status"
      aria-label="Loading the game"
    >
      {["🪔", "🌾", "🛖", "🗡️", "🌙", "🔔"].map((e, i) => (
        <motion.span key={e} className="absolute text-[26px] opacity-60" style={{ left: `${8 + i * 16}%`, bottom: -30 }} animate={{ y: [0, -420], opacity: [0, 0.8, 0] }} transition={{ duration: 5 + i * 0.6, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}>
          {e}
        </motion.span>
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img src="/brand/panchayat-logo-email.png" alt="Panchayat" className="relative h-auto w-32 drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)]" animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} />
      <h2 className="relative mt-2 bg-gradient-to-r from-[#fff1b0] via-[#ffb3d1] to-[#c8b6ff] bg-clip-text font-display text-[26px] font-extrabold text-transparent">Gaon ka Gaddaar</h2>
      <p className="relative mt-0.5 text-[12px] font-semibold text-white/80">Gaon load ho raha hai…</p>
      <div className="relative mt-3 h-3 w-64 max-w-full overflow-hidden rounded-full bg-black/30 ring-1 ring-white/25">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-[#7df9c8] via-[#fff1b0] to-[#ff9ad5]" animate={{ width: `${Math.max(8, Math.round(progress * 100))}%` }} transition={{ duration: 0.3 }} />
      </div>
      <ul className="relative mt-2 space-y-0.5 text-[11px] text-white/75">
        {steps.map((s) => (
          <li key={s.label} className={s.done ? "font-bold text-[#a7ffd9]" : ""}>
            {s.done ? "✓" : "…"} {s.label}
          </li>
        ))}
      </ul>
      <p className="relative mt-3 max-w-xs rounded-2xl bg-black/25 px-3 py-1.5 text-[11.5px] italic text-white/80 backdrop-blur">{hint}</p>
    </motion.div>
  );
}

/* ---------------- the result ---------------- */

export function Ended({ state, myId, busy, onLobby, onExit, exitLabel }: { state: GaddarState; myId: string; busy: boolean; onLobby: () => void; onExit: () => void; exitLabel: string }) {
  const mine = state.players.find((p) => p.id === myId);
  const villagersWon = state.winner === "GAONWALE";
  const won = villagersWon ? mine?.role === "GAONWALA" : mine?.role === "GADDAR";
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center gap-6 overflow-y-auto px-6 py-4 backdrop-blur-sm" style={{ background: villagersWon ? "radial-gradient(120% 90% at 30% 30%,rgba(16,122,85,0.92),rgba(8,14,22,0.96))" : "radial-gradient(120% 90% at 30% 30%,rgba(150,20,50,0.92),rgba(14,8,16,0.96))" }}>
      <Confetti pieces={won ? ["🎉", "✨", "🪔", "🎊", "⭐"] : ["💀", "🗡️", "🔥", "💨"]} />
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="relative text-center">
        <motion.p className="text-[56px] leading-none drop-shadow-lg" animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 1.6, repeat: Infinity }} aria-hidden>
          {villagersWon ? "🏆" : "🗡️"}
        </motion.p>
        <h2 className="mt-2 bg-gradient-to-r from-white via-[#ffe9a8] to-white bg-clip-text font-display text-[28px] font-extrabold text-transparent">{villagersWon ? "Gaonwale jeet gaye!" : "Gaddaar jeet gaye!"}</h2>
        <p className="mt-1 text-[14px] font-bold text-white/90">{mine ? (won ? "Tum jeet gaye 🎉" : "Is baar haar gaye 😅") : "Game khatam"}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={onExit} className="h-11 rounded-full bg-white/15 px-5 text-[13px] font-bold text-white ring-1 ring-white/25 backdrop-blur">
            {exitLabel}
          </button>
          <button type="button" disabled={busy} onClick={onLobby} className="h-11 rounded-full bg-gradient-to-r from-[#fff0b0] to-[#f5b83d] px-5 text-[13px] font-extrabold text-[#3a2400] shadow-[0_8px_20px_-6px_rgba(245,184,61,0.8)]">
            Phir se khelo
          </button>
        </div>
      </motion.div>
      <ul className="relative max-h-full w-72 space-y-1.5">
        {state.players.map((p, i) => (
          <motion.li key={p.id} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.06 }} className="flex items-center gap-3 rounded-2xl bg-white/10 p-2 text-left ring-1 ring-white/15 backdrop-blur">
            <Face p={p} size={34} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-white">
              {p.name}
              {p.id === myId ? " (you)" : ""}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold text-white ${p.role === "GADDAR" ? "bg-gradient-to-r from-[#ff5f6d] to-[#b3123a]" : "bg-gradient-to-r from-[#34d399] to-[#0b7a55]"}`}>{p.role === "GADDAR" ? "Gaddaar" : "Gaonwala"}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
