"use client";

import { motion } from "framer-motion";
import { PANDA_MS, PandaScene } from "./PandaFx";

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

/**
 * Panda stickers: 42 picture emotes. Each plays its own scene over the person's seat (entrance, body move, effects),
 * defined in PandaFx.tsx. The pictures are in /public/emotes. The server just passes the id on ("bear-1" ... "bear-42").
 */
export const STICKER_EMOTES: { id: string; label: string }[] = [
  { id: "bear-1", label: "Boss" },
  { id: "bear-2", label: "Love" },
  { id: "bear-3", label: "Cool" },
  { id: "bear-4", label: "Peek" },
  { id: "bear-5", label: "Gaming" },
  { id: "bear-6", label: "Cuddle" },
  { id: "bear-7", label: "Angry" },
  { id: "bear-8", label: "Hug" },
  { id: "bear-9", label: "Aww" },
  { id: "bear-10", label: "Kiss" },
  { id: "bear-11", label: "Crying" },
  { id: "bear-12", label: "Huh?" },
  { id: "bear-13", label: "Swag" },
  { id: "bear-14", label: "Hide" },
  { id: "bear-15", label: "Chill" },
  { id: "bear-16", label: "Sleep" },
  { id: "bear-17", label: "Mysterious" },
  { id: "bear-18", label: "Blessed" },
  { id: "bear-19", label: "Devil" },
  { id: "bear-20", label: "Romantic" },
  { id: "bear-21", label: "Heart Eyes" },
  { id: "bear-22", label: "LOL" },
  { id: "bear-23", label: "Shout" },
  { id: "bear-24", label: "Mad" },
  { id: "bear-25", label: "Sad" },
  { id: "bear-26", label: "Thinking" },
  { id: "bear-27", label: "Facepalm" },
  { id: "bear-28", label: "No" },
  { id: "bear-29", label: "OK" },
  { id: "bear-30", label: "Peek2" },
  { id: "bear-31", label: "Broken" },
  { id: "bear-32", label: "Legend" },
  { id: "bear-33", label: "Strong" },
  { id: "bear-34", label: "Good Job" },
  { id: "bear-35", label: "Gift" },
  { id: "bear-36", label: "Eat" },
  { id: "bear-37", label: "Drink" },
  { id: "bear-38", label: "Popcorn" },
  { id: "bear-39", label: "Cheer" },
  { id: "bear-40", label: "Please" },
  { id: "bear-41", label: "Bye" },
  { id: "bear-42", label: "Good Night" },
];

export const isSticker = (e: string) => STICKER_EMOTES.some((x) => x.id === e);
export const STICKER_MS = PANDA_MS;

/** A sticker over the person's seat: drawn a little bigger than the profile picture, centred on it. */
function StickerBurst({ emote, size }: { emote: string; size: number }) {
  const st = STICKER_EMOTES.find((x) => x.id === emote);
  if (!st) return null;
  const d = Math.max(44, size) * 1.3;
  return (
    <span className="pointer-events-none absolute top-0 left-1/2 z-10" style={{ width: d, height: d, marginLeft: -d / 2, marginTop: -d * 0.15 }} aria-hidden>
      <PandaScene src={`/emotes/${st.id}.webp`} label={st.label} d={d} />
    </span>
  );
}

export function isGameEmote(e: string) {
  return GAME_EMOTES.some((g) => g.id === e);
}

/** The emote over a seat. result: the server's roll for game emotes. */
export function EmoteBurst({ emote, result, size = 56 }: { emote: string; result?: string; size?: number }) {
  if (isSticker(emote)) return <StickerBurst emote={emote} size={size} />;
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
