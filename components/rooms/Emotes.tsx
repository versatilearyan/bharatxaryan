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

/**
 * Bear stickers: 15 picture emotes. Each one is drawn inside the person's seat (their profile picture is covered for a
 * moment) and moves in its own way, with little floating pieces around it. The pictures are in /public/emotes.
 * The server just passes the id on ("bear-1" ... "bear-15").
 */
type Move = "sway" | "wave" | "bob" | "shake" | "pulse" | "jump" | "pop" | "zoom" | "tilt" | "slide";
export const STICKER_EMOTES: { id: string; label: string; move: Move; fx: string[]; caption?: string }[] = [
  { id: "bear-1", label: "Shy", move: "sway", fx: ["💖", "✨"] },
  { id: "bear-2", label: "Hi", move: "wave", fx: ["👋", "✨"] },
  { id: "bear-3", label: "Thanks", move: "bob", fx: ["🙏", "💛"] },
  { id: "bear-4", label: "Haha", move: "shake", fx: ["😂", "💧"] },
  { id: "bear-5", label: "Kiss", move: "pulse", fx: ["💋", "💖"] },
  { id: "bear-6", label: "Oops", move: "tilt", fx: ["😅", "💧"] },
  { id: "bear-7", label: "Naughty", move: "slide", fx: ["😏", "✨"] },
  { id: "bear-8", label: "Hooray", move: "jump", fx: ["🎉", "✨", "💖"] },
  { id: "bear-9", label: "Super", move: "pop", fx: ["👍", "✨"] },
  { id: "bear-10", label: "Power", move: "zoom", fx: ["⚡", "✨"] },
  { id: "bear-11", label: "Please", move: "sway", fx: ["🥺", "💖"] },
  { id: "bear-12", label: "Hello", move: "wave", fx: ["💫", "💖"] },
  { id: "bear-13", label: "Cool", move: "slide", fx: ["😎", "❄️", "✨"] },
  { id: "bear-14", label: "Gale milna", move: "pulse", fx: ["🤗", "💖", "💖"], caption: "Gale milna 🤗" },
  { id: "bear-15", label: "I love you", move: "pulse", fx: ["❤️", "💖", "💕"], caption: "I love you ❤️" },
];

export const isSticker = (e: string) => STICKER_EMOTES.some((x) => x.id === e);
export const STICKER_MS = 3600;

const MOVES: Record<Move, { animate: Record<string, number[]>; duration: number }> = {
  sway: { animate: { rotate: [0, -6, 6, -6, 6, 0], scale: [1, 1.04, 1, 1.04, 1, 1] }, duration: 3 },
  wave: { animate: { rotate: [0, -10, 10, -10, 10, -6, 0], x: [0, -2, 2, -2, 2, 0, 0] }, duration: 2.6 },
  bob: { animate: { y: [0, 7, 0, 7, 0, 7, 0], scale: [1, 1.03, 1, 1.03, 1, 1.03, 1] }, duration: 3 },
  shake: { animate: { x: [0, -4, 4, -4, 4, -3, 3, 0], rotate: [0, -3, 3, -3, 3, -2, 2, 0], scale: [1, 1.07, 1, 1.07, 1, 1.07, 1, 1] }, duration: 2.4 },
  pulse: { animate: { scale: [1, 1.14, 1, 1.14, 1, 1.14, 1] }, duration: 2.8 },
  jump: { animate: { y: [0, -9, 0, -9, 0, -9, 0], scale: [1, 1.06, 1, 1.06, 1, 1.06, 1] }, duration: 2.6 },
  pop: { animate: { scale: [0.7, 1.2, 1, 1.08, 1, 1.08, 1], rotate: [0, -4, 0, 4, 0, -3, 0] }, duration: 2.6 },
  zoom: { animate: { scale: [1, 1.22, 1, 1.22, 1, 1.15, 1] }, duration: 2.8 },
  tilt: { animate: { rotate: [0, -9, 0, -9, 0, -6, 0], y: [0, 2, 0, 2, 0, 1, 0] }, duration: 3 },
  slide: { animate: { x: [-14, 0, 0, 0, 0, 0], scale: [0.9, 1.06, 1, 1.05, 1, 1] }, duration: 2.2 },
};

/** A sticker over the person's seat: it fills the profile circle, moves in its own way and sends little hearts or sparkles up. */
function StickerBurst({ emote, size }: { emote: string; size: number }) {
  const st = STICKER_EMOTES.find((x) => x.id === emote);
  if (!st) return null;
  const mv = MOVES[st.move];
  // Transparent stickers: drawn a little bigger than the profile picture, centred on it, with no frame
  const d = Math.max(44, size) * 1.28;
  const bits = Array.from({ length: 7 }, (_, i) => ({ icon: st.fx[i % st.fx.length], x: ((i * 37) % 70) - 35, delay: 0.3 + i * 0.32, dur: 1.6 + (i % 3) * 0.3 }));
  return (
    <motion.span
      className="pointer-events-none absolute top-0 left-1/2 z-10"
      style={{ width: d, height: d, marginLeft: -d / 2, marginTop: -d * 0.14 }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: [0, 1, 1, 1, 0], scale: [0.3, 1.08, 1, 1, 0.92] }}
      transition={{ duration: STICKER_MS / 1000, times: [0, 0.08, 0.15, 0.88, 1], ease: "easeOut" }}
      aria-hidden
    >
      <span className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(246,216,153,0.5),transparent_68%)] blur-md" />
      <motion.img src={`/emotes/${st.id}.webp`} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]" animate={mv.animate} transition={{ duration: mv.duration, ease: "easeInOut", repeat: 0 }} />
      {st.caption ? <span className="absolute inset-x-0 -bottom-1 mx-auto w-max max-w-[150%] rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-[#f6d899]">{st.caption}</span> : null}
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute left-1/2 text-[15px] drop-shadow" style={{ top: d * 0.45, marginLeft: b.x }} initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: [0, 1, 0], y: -d * 0.9, scale: [0.5, 1.1, 0.8] }} transition={{ delay: b.delay, duration: b.dur, ease: "easeOut" }}>
          {b.icon}
        </motion.span>
      ))}
    </motion.span>
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
