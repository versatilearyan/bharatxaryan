"use client";

import { motion } from "framer-motion";

/**
 * Animated emotes shown over a seat. Plain emoji float up; the game emotes
 * (dice, rock-paper-scissors, coin, lucky number) spin first and then land on
 * the result the server picked, so everyone sees the same roll.
 */
export const GAME_EMOTES = [
  { id: "dice", label: "Dice", icon: "🎲" },
  { id: "rps", label: "Rock paper scissors", icon: "✊" },
  { id: "coin", label: "Coin flip", icon: "🪙" },
  { id: "lucky", label: "Lucky number", icon: "🍀" },
] as const;

export const ANIMATED_EMOTES = ["😂", "😍", "😭", "😡", "🥳", "👏", "🔥", "💯", "😎", "🤔", "😴", "🙏", "💋", "👀", "🫶", "🤯"] as const;

const DICE = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const RPS: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" };

export function isGameEmote(e: string) {
  return GAME_EMOTES.some((g) => g.id === e);
}

/** The emote over a seat. result: the server's roll for game emotes. */
export function EmoteBurst({ emote, result }: { emote: string; result?: string }) {
  if (isGameEmote(emote)) {
    const final =
      emote === "dice" ? DICE[(Number(result) || 1) - 1] : emote === "rps" ? (RPS[result ?? ""] ?? "✊") : emote === "coin" ? (result === "heads" ? "🌕" : "🌑") : String(result ?? "?");
    const spinning = emote === "dice" ? DICE : emote === "rps" ? Object.values(RPS) : emote === "coin" ? ["🌕", "🌑"] : ["🍀", "7", "🍀", "3"];
    return (
      <motion.span className="pointer-events-none absolute -top-3 z-10 grid h-11 min-w-11 place-items-center rounded-2xl bg-white/95 px-1.5 text-[26px] font-extrabold text-[#1a1638] shadow-[0_6px_20px_-4px_rgba(0,0,0,0.5)]" initial={{ y: 10, opacity: 0, scale: 0.4 }} animate={{ y: -40, opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -60, scale: 0.6 }} transition={{ type: "spring", stiffness: 300, damping: 16 }} aria-label={`${emote}: ${result}`}>
        {/* Spins through the faces, then shows the result */}
        <motion.span key="spin" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.9, duration: 0.05 }} className="absolute inset-0 grid place-items-center">
          <motion.span animate={{ rotate: [0, 360, 720] }} transition={{ duration: 0.9, ease: "easeOut" }}>
            <SpinFaces faces={spinning} />
          </motion.span>
        </motion.span>
        <motion.span initial={{ opacity: 0, scale: 1.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.95, type: "spring", stiffness: 400, damping: 12 }} className={emote === "lucky" ? "text-[18px]" : ""}>
          {final}
        </motion.span>
      </motion.span>
    );
  }
  return (
    <motion.span className="pointer-events-none absolute -top-2 z-10 text-[30px] drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]" initial={{ y: 10, opacity: 0, scale: 0.4 }} animate={{ y: [-10, -40, -34], opacity: 1, scale: [0.4, 1.35, 1.1], rotate: [0, -12, 10, 0] }} exit={{ opacity: 0, y: -60 }} transition={{ duration: 0.9 }} aria-hidden>
      {emote}
    </motion.span>
  );
}

function SpinFaces({ faces }: { faces: readonly string[] }) {
  return (
    <motion.span
      animate={{ opacity: [1, 1, 1] }}
      transition={{ duration: 0.9 }}
      className="relative block"
    >
      {faces.map((f, i) => (
        <motion.span key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.18, delay: i * 0.12, repeat: 1 }}>
          {f}
        </motion.span>
      ))}
    </motion.span>
  );
}
