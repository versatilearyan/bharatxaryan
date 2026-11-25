"use client";

/**
 * Panda sticker animations. Every sticker gets its own little scene instead of one shared wobble:
 *
 * - an ENTRANCE (pop, drop with a bounce, peek up from below, slide out from behind a door, slam in, spin in ...),
 * - a BODY move that pivots from the bottom like a real character (wave, nod, head-bang, shiver, swagger,
 *   heartbeat, hop with squash and stretch ...), with a soft ground shadow that reacts to it,
 * - EFFECTS that belong to the feeling (tears that run, Zzz that drift up, steam from the head, a light sweeping across
 *   the sunglasses, hearts that burst, shock rings, confetti, rain from a little cloud, a heart that cracks ...),
 * - and an EXIT that fits (the sleepy panda sinks back down, the one behind the door hides again, Bye slides away).
 *
 * All of it runs on the one 288 px picture per sticker in /public/emotes, so the files stay tiny (about 16 KB each).
 * Timeline: 3.6 s in all (STICKER_MS), entrance in the first ~0.45 s, exit in the last ~0.4 s.
 */
import { motion, type TargetAndTransition, type Transition } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

export const PANDA_MS = 3600;
const T = PANDA_MS / 1000;

type Enter = "pop" | "drop" | "rise" | "door" | "slam" | "spin" | "slideL" | "slideR" | "fade" | "float";
type Body = "bounce" | "wave" | "sway" | "swagger" | "shake" | "nod" | "breathe" | "hop" | "headbang" | "shiver" | "heartbeat" | "tilt" | "swing" | "headshake" | "chomp" | "still";
type Fx =
  | "hearts" | "heartBurst" | "tears" | "tearsJoy" | "zzz" | "notes" | "sparkles" | "steam" | "anger" | "shine" | "rings"
  | "confetti" | "question" | "flames" | "halo" | "petals" | "popcorn" | "kiss" | "crack" | "stars" | "sweat" | "cloud"
  | "rays" | "smoke" | "bubbles" | "flash" | "thought" | "foodSteam" | "moon" | "speed" | "redFlash";

export type PandaPlay = { enter: Enter; body: Body; fx: Fx[] };

/** The scene for each sticker, by its label. */
export const PANDA_PLAYS: Record<string, PandaPlay> = {
  Boss: { enter: "drop", body: "swagger", fx: ["rays", "shine", "sparkles"] },
  Love: { enter: "pop", body: "heartbeat", fx: ["heartBurst", "hearts"] },
  Cool: { enter: "slideL", body: "nod", fx: ["shine", "sparkles", "speed"] },
  Peek: { enter: "rise", body: "tilt", fx: ["sparkles"] },
  Gaming: { enter: "pop", body: "headbang", fx: ["notes"] },
  Cuddle: { enter: "pop", body: "sway", fx: ["hearts"] },
  Angry: { enter: "slam", body: "shake", fx: ["redFlash", "steam", "anger"] },
  Hug: { enter: "pop", body: "heartbeat", fx: ["heartBurst", "hearts"] },
  Aww: { enter: "pop", body: "sway", fx: ["sparkles", "hearts"] },
  Kiss: { enter: "pop", body: "nod", fx: ["kiss", "hearts"] },
  Crying: { enter: "drop", body: "shiver", fx: ["tears", "cloud"] },
  "Huh?": { enter: "pop", body: "tilt", fx: ["question"] },
  Swag: { enter: "slideR", body: "swagger", fx: ["shine", "sparkles", "speed"] },
  Hide: { enter: "door", body: "tilt", fx: ["sweat"] },
  Chill: { enter: "pop", body: "breathe", fx: ["bubbles", "sparkles"] },
  Sleep: { enter: "rise", body: "breathe", fx: ["zzz"] },
  Mysterious: { enter: "fade", body: "breathe", fx: ["smoke"] },
  Blessed: { enter: "float", body: "breathe", fx: ["halo", "sparkles"] },
  Devil: { enter: "slam", body: "shake", fx: ["flames", "smoke"] },
  Romantic: { enter: "pop", body: "sway", fx: ["petals", "hearts"] },
  "Heart Eyes": { enter: "pop", body: "heartbeat", fx: ["heartBurst", "hearts"] },
  LOL: { enter: "pop", body: "bounce", fx: ["tearsJoy"] },
  Shout: { enter: "slam", body: "shake", fx: ["rings", "flash"] },
  Mad: { enter: "slam", body: "shiver", fx: ["steam", "anger"] },
  Sad: { enter: "drop", body: "breathe", fx: ["cloud"] },
  Thinking: { enter: "pop", body: "tilt", fx: ["thought", "question"] },
  Facepalm: { enter: "drop", body: "nod", fx: ["sweat"] },
  No: { enter: "slideL", body: "headshake", fx: ["redFlash", "rings"] },
  OK: { enter: "pop", body: "nod", fx: ["stars", "sparkles"] },
  Peek2: { enter: "door", body: "tilt", fx: ["sparkles"] },
  Broken: { enter: "drop", body: "shiver", fx: ["crack", "tears"] },
  Legend: { enter: "spin", body: "swagger", fx: ["rays", "shine", "confetti", "sparkles"] },
  Strong: { enter: "slam", body: "hop", fx: ["rings", "stars"] },
  "Good Job": { enter: "pop", body: "nod", fx: ["stars", "confetti"] },
  Gift: { enter: "pop", body: "hop", fx: ["confetti", "sparkles", "flash"] },
  Eat: { enter: "pop", body: "chomp", fx: ["foodSteam", "sparkles"] },
  Drink: { enter: "pop", body: "breathe", fx: ["bubbles"] },
  Popcorn: { enter: "pop", body: "bounce", fx: ["popcorn"] },
  Cheer: { enter: "slam", body: "hop", fx: ["confetti", "rings"] },
  Please: { enter: "pop", body: "heartbeat", fx: ["sparkles", "hearts"] },
  Bye: { enter: "slideL", body: "wave", fx: ["sparkles"] },
  "Good Night": { enter: "drop", body: "swing", fx: ["moon", "zzz", "stars"] },
};

/* ---------------------------------------------------------------- entrance and exit */

const ENTER: Record<Enter, (d: number) => { animate: TargetAndTransition; transition: Transition }> = {
  pop: () => ({
    animate: { scale: [0.2, 1.18, 0.92, 1.04, 1, 1, 0.5], opacity: [0, 1, 1, 1, 1, 1, 0], y: [8, -4, 0, 0, 0, 0, 6] },
    transition: { duration: T, times: [0, 0.07, 0.11, 0.14, 0.17, 0.9, 1] },
  }),
  drop: (d) => ({
    animate: { y: [-d * 0.9, 0, -d * 0.12, 0, 0, d * 0.15], scaleY: [1.15, 0.8, 1.06, 1, 1, 1], scaleX: [0.9, 1.18, 0.96, 1, 1, 1], opacity: [0, 1, 1, 1, 1, 0] },
    transition: { duration: T, times: [0, 0.1, 0.15, 0.19, 0.9, 1], ease: "easeOut" },
  }),
  rise: (d) => ({
    animate: { y: [d * 0.55, -3, 0, 0, d * 0.55], opacity: [0, 1, 1, 1, 0], clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 100% 0)"] },
    transition: { duration: T, times: [0, 0.13, 0.17, 0.88, 1], ease: "easeOut" },
  }),
  door: (d) => ({
    animate: { x: [d * 0.35, -2, 0, 0, d * 0.35], opacity: [0, 1, 1, 1, 0], clipPath: ["inset(0 0 0 100%)", "inset(0 0 0 0%)", "inset(0 0 0 0%)", "inset(0 0 0 0%)", "inset(0 0 0 100%)"] },
    transition: { duration: T, times: [0, 0.13, 0.17, 0.88, 1], ease: "easeOut" },
  }),
  slam: () => ({
    animate: { scale: [2.2, 0.86, 1.08, 1, 1, 0.6], opacity: [0, 1, 1, 1, 1, 0], rotate: [-12, 3, -1, 0, 0, 0] },
    transition: { duration: T, times: [0, 0.07, 0.11, 0.15, 0.9, 1], ease: "easeIn" },
  }),
  spin: () => ({
    animate: { scale: [0, 1.15, 1, 1, 0.4], rotate: [-360, 10, 0, 0, 180], opacity: [0, 1, 1, 1, 0] },
    transition: { duration: T, times: [0, 0.14, 0.18, 0.9, 1], ease: "easeOut" },
  }),
  slideL: (d) => ({
    animate: { x: [-d * 0.9, 6, 0, 0, d * 0.9], rotate: [-14, 4, 0, 0, 12], opacity: [0, 1, 1, 1, 0] },
    transition: { duration: T, times: [0, 0.12, 0.16, 0.88, 1], ease: "easeOut" },
  }),
  slideR: (d) => ({
    animate: { x: [d * 0.9, -6, 0, 0, -d * 0.9], rotate: [14, -4, 0, 0, -12], opacity: [0, 1, 1, 1, 0] },
    transition: { duration: T, times: [0, 0.12, 0.16, 0.88, 1], ease: "easeOut" },
  }),
  fade: () => ({
    animate: { opacity: [0, 0.6, 1, 1, 0], scale: [0.85, 0.95, 1, 1, 1.05], filter: ["blur(6px)", "blur(2px)", "blur(0px)", "blur(0px)", "blur(6px)"] },
    transition: { duration: T, times: [0, 0.12, 0.22, 0.86, 1] },
  }),
  float: (d) => ({
    animate: { y: [-d * 0.5, 0, 0, -d * 0.4], opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.9] },
    transition: { duration: T, times: [0, 0.2, 0.86, 1], ease: "easeOut" },
  }),
};

/* ---------------------------------------------------------------- body moves (after the entrance) */

const START = 0.55; // seconds: when the body starts moving
const LOOP = { delay: START, repeat: Infinity, ease: "easeInOut" } as const;

const BODY: Record<Body, (d: number) => { animate: TargetAndTransition; transition: Transition; origin?: string }> = {
  bounce: () => ({ animate: { scaleY: [1, 0.86, 1.1, 1], scaleX: [1, 1.12, 0.94, 1], y: [0, 0, -9, 0] }, transition: { ...LOOP, duration: 0.55 } }),
  wave: () => ({ animate: { rotate: [0, -12, 10, -12, 10, 0] }, transition: { ...LOOP, duration: 1.3 } }),
  sway: () => ({ animate: { rotate: [-5, 5, -5] }, transition: { ...LOOP, duration: 1.6 } }),
  swagger: () => ({ animate: { rotate: [-4, 4, -4], x: [-2, 2, -2], scaleY: [1, 0.97, 1] }, transition: { ...LOOP, duration: 1.1 } }),
  shake: () => ({ animate: { x: [0, -5, 5, -5, 5, -3, 3, 0], rotate: [0, -3, 3, -3, 3, 0, 0, 0] }, transition: { ...LOOP, duration: 0.5, repeatDelay: 0.25 } }),
  nod: () => ({ animate: { rotate: [0, 6, 0, 6, 0], y: [0, 2, 0, 2, 0] }, transition: { ...LOOP, duration: 1.2, repeatDelay: 0.2 } }),
  breathe: () => ({ animate: { scaleY: [1, 1.045, 1], scaleX: [1, 0.985, 1] }, transition: { ...LOOP, duration: 1.8 } }),
  hop: () => ({ animate: { y: [0, 0, -16, 0, 0], scaleY: [1, 0.8, 1.12, 0.88, 1], scaleX: [1, 1.18, 0.92, 1.12, 1] }, transition: { ...LOOP, duration: 0.8, repeatDelay: 0.15 } }),
  headbang: () => ({ animate: { rotate: [-7, 7, -7], y: [0, 3, 0] }, transition: { ...LOOP, duration: 0.45 } }),
  shiver: () => ({ animate: { x: [0, -2, 2, -2, 2, 0], scaleY: [1, 0.98, 1, 0.98, 1, 1] }, transition: { ...LOOP, duration: 0.35, repeatDelay: 0.35 } }),
  heartbeat: () => ({ animate: { scale: [1, 1.12, 0.98, 1.08, 1, 1] }, transition: { ...LOOP, duration: 0.9, times: [0, 0.14, 0.28, 0.42, 0.6, 1] } }),
  tilt: () => ({ animate: { rotate: [0, -10, -10, 0, 0] }, transition: { ...LOOP, duration: 1.6 } }),
  swing: () => ({ animate: { rotate: [-9, 9, -9] }, transition: { ...LOOP, duration: 2.2 }, origin: "50% 0%" }),
  headshake: () => ({ animate: { rotate: [0, -9, 9, -9, 9, 0] }, transition: { ...LOOP, duration: 0.75, repeatDelay: 0.35 } }),
  chomp: () => ({ animate: { scaleY: [1, 0.93, 1, 0.93, 1], y: [0, 2, 0, 2, 0] }, transition: { ...LOOP, duration: 0.6, repeatDelay: 0.15 } }),
  still: () => ({ animate: {}, transition: {} }),
};

/* ---------------------------------------------------------------- effects */

type FxProps = { d: number; src: string };
const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", pointerEvents: "none", ...s });
const seq = (n: number, f: (i: number) => ReactNode) => Array.from({ length: n }, (_, i) => f(i));
/** A small deterministic spread, so every viewer sees the same scene. */
const rnd = (i: number, k = 1) => ((Math.sin(i * 12.9898 * k + 78.233) * 43758.5453) % 1 + 1) % 1;

function Glyph({ children, style, animate, transition }: { children: ReactNode; style: CSSProperties; animate: TargetAndTransition; transition: Transition }) {
  return (
    <motion.span style={abs({ lineHeight: 1, ...style })} initial={{ opacity: 0 }} animate={animate} transition={transition}>
      {children}
    </motion.span>
  );
}

const FX: Record<Fx, (p: FxProps) => ReactNode> = {
  hearts: ({ d }) =>
    seq(7, (i) => (
      <Glyph key={i} style={{ left: d * (0.15 + rnd(i) * 0.7), top: d * 0.55, fontSize: d * (0.12 + rnd(i, 2) * 0.08) }} animate={{ opacity: [0, 1, 0], y: -d * (0.7 + rnd(i, 3) * 0.3), x: [0, (rnd(i, 4) - 0.5) * 24, (rnd(i, 5) - 0.5) * 30], scale: [0.4, 1.1, 0.8] }} transition={{ delay: 0.5 + i * 0.36, duration: 1.7, ease: "easeOut" }}>
        {["💖", "💕", "❤️", "💗"][i % 4]}
      </Glyph>
    )),
  heartBurst: ({ d }) =>
    seq(10, (i) => {
      const a = (i / 10) * Math.PI * 2;
      return (
        <Glyph key={i} style={{ left: d / 2 - d * 0.06, top: d / 2 - d * 0.06, fontSize: d * 0.13 }} animate={{ opacity: [0, 1, 0], x: Math.cos(a) * d * 0.62, y: Math.sin(a) * d * 0.62, scale: [0.2, 1.2, 0.6], rotate: (rnd(i) - 0.5) * 60 }} transition={{ delay: 0.32, duration: 1.1, ease: "easeOut" }}>
          ❤️
        </Glyph>
      );
    }),
  tears: ({ d }) =>
    seq(12, (i) => {
      const side = i % 2 ? 0.66 : 0.34;
      return (
        <motion.span key={i} style={abs({ left: d * side, top: d * 0.46, width: d * 0.05, height: d * 0.075, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", background: "linear-gradient(#bfe7ff,#4aa8ff)", boxShadow: "0 0 4px rgba(120,190,255,0.8)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], y: [0, d * 0.18, d * 0.42], x: (i % 2 ? 1 : -1) * d * 0.04 }} transition={{ delay: 0.5 + Math.floor(i / 2) * 0.42, duration: 0.9, ease: "easeIn" }} />
      );
    }),
  tearsJoy: ({ d }) =>
    seq(12, (i) => {
      const dir = i % 2 ? 1 : -1;
      return (
        <motion.span key={i} style={abs({ left: d * (i % 2 ? 0.7 : 0.3), top: d * 0.42, width: d * 0.055, height: d * 0.055, borderRadius: 999, background: "radial-gradient(circle at 35% 35%,#e8f7ff,#3a9cff)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], x: [0, dir * d * 0.22, dir * d * 0.36], y: [0, -d * 0.12, d * 0.16] }} transition={{ delay: 0.55 + Math.floor(i / 2) * 0.4, duration: 0.8, ease: "easeOut" }} />
      );
    }),
  zzz: ({ d }) =>
    seq(5, (i) => (
      <Glyph key={i} style={{ left: d * 0.62, top: d * 0.18, fontSize: d * (0.12 + i * 0.03), fontWeight: 900, color: "#9fc3ff", textShadow: "0 0 6px rgba(140,180,255,0.9)" }} animate={{ opacity: [0, 1, 0], x: d * 0.32, y: -d * 0.45, rotate: [0, -12, 8] }} transition={{ delay: 0.6 + i * 0.55, duration: 1.6, ease: "easeOut" }}>
        Z
      </Glyph>
    )),
  notes: ({ d }) =>
    seq(8, (i) => (
      <Glyph key={i} style={{ left: d * (i % 2 ? 0.82 : 0.05), top: d * 0.35, fontSize: d * 0.15, color: ["#c9a0ff", "#ff9ad5", "#9fe0ff"][i % 3], textShadow: "0 0 6px rgba(201,160,255,0.9)" }} animate={{ opacity: [0, 1, 0], y: -d * 0.6, x: [0, (i % 2 ? 1 : -1) * 10, (i % 2 ? -1 : 1) * 6], rotate: [0, 15, -10] }} transition={{ delay: 0.5 + i * 0.33, duration: 1.4, ease: "easeOut" }}>
        {i % 2 ? "♫" : "♪"}
      </Glyph>
    )),
  sparkles: ({ d }) =>
    seq(9, (i) => (
      <Glyph key={i} style={{ left: d * (0.02 + rnd(i, 7) * 0.9), top: d * (0.02 + rnd(i, 8) * 0.8), fontSize: d * (0.08 + rnd(i, 9) * 0.07), color: "#ffe9a8", textShadow: "0 0 8px #ffd36b" }} animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0], rotate: [0, 90] }} transition={{ delay: 0.45 + rnd(i, 10) * 2.4, duration: 0.7, ease: "easeInOut" }}>
        ✦
      </Glyph>
    )),
  steam: ({ d }) =>
    seq(8, (i) => (
      <motion.span key={i} style={abs({ left: d * (i % 2 ? 0.66 : 0.24), top: d * 0.08, width: d * 0.16, height: d * 0.16, borderRadius: 999, background: "radial-gradient(circle,rgba(255,255,255,0.95),rgba(255,255,255,0.2) 70%,transparent)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.95, 0], y: -d * 0.35, x: (i % 2 ? 1 : -1) * d * 0.15, scale: [0.4, 1.4, 1.9] }} transition={{ delay: 0.5 + i * 0.32, duration: 1, ease: "easeOut" }} />
    )),
  anger: ({ d }) => (
    <Glyph style={{ left: d * 0.7, top: d * 0.02, fontSize: d * 0.22 }} animate={{ opacity: [0, 1, 1, 1, 1, 0], scale: [0.3, 1.3, 0.9, 1.25, 0.9, 1.2] }} transition={{ delay: 0.4, duration: 2.8, times: [0, 0.1, 0.3, 0.5, 0.75, 1] }}>
      💢
    </Glyph>
  ),
  shine: ({ d, src }) => (
    <span style={abs({ inset: 0, WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", overflow: "hidden" })}>
      <motion.span style={abs({ top: -d * 0.2, bottom: -d * 0.2, width: d * 0.3, background: "linear-gradient(100deg,transparent,rgba(255,255,255,0.95),transparent)", transform: "skewX(-20deg)" })} initial={{ x: -d * 0.6 }} animate={{ x: d * 1.4 }} transition={{ delay: 0.7, duration: 0.75, repeat: 2, repeatDelay: 0.55, ease: "easeInOut" }} />
    </span>
  ),
  rings: ({ d }) =>
    seq(4, (i) => (
      <motion.span key={i} style={abs({ left: d * 0.1, top: d * 0.1, width: d * 0.8, height: d * 0.8, borderRadius: 999, border: `${Math.max(2, d * 0.03)}px solid rgba(255,230,160,0.9)`, boxShadow: "0 0 12px rgba(255,210,120,0.8)" })} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.7] }} transition={{ delay: 0.3 + i * 0.6, duration: 0.85, ease: "easeOut" }} />
    )),
  confetti: ({ d }) =>
    seq(22, (i) => {
      const a = -Math.PI / 2 + (rnd(i, 11) - 0.5) * 2.2;
      const r = d * (0.5 + rnd(i, 12) * 0.45);
      return (
        <motion.span key={i} style={abs({ left: d / 2, top: d / 2, width: d * 0.045, height: d * 0.085, borderRadius: 2, background: ["#ff5c8a", "#ffd23f", "#3ddc84", "#5ec8ff", "#c38bff", "#ff8a3d"][i % 6] })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], x: [0, Math.cos(a) * r, Math.cos(a) * r * 1.1], y: [0, Math.sin(a) * r, Math.sin(a) * r + d * 0.55], rotate: [0, 360 * (rnd(i, 13) > 0.5 ? 1 : -1) * 2] }} transition={{ delay: 0.35 + (i % 2) * 1.3, duration: 1.6, ease: "easeOut" }} />
      );
    }),
  question: ({ d }) => (
    <Glyph style={{ left: d * 0.72, top: -d * 0.02, fontSize: d * 0.24, fontWeight: 900, color: "#9fc3ff", textShadow: "0 0 8px rgba(150,190,255,0.9)" }} animate={{ opacity: [0, 1, 1, 1, 0], y: [8, 0, -4, 0, -6], rotate: [0, -15, 12, -10, 0], scale: [0.3, 1.2, 1, 1.15, 1] }} transition={{ delay: 0.4, duration: 2.8, times: [0, 0.1, 0.4, 0.7, 1] }}>
      ?
    </Glyph>
  ),
  flames: ({ d }) =>
    seq(2, (i) => (
      <Glyph key={i} style={{ left: d * (i ? 0.78 : 0.0), top: d * 0.62, fontSize: d * 0.24, transformOrigin: "50% 100%" }} animate={{ opacity: [0, 1, 1, 1, 0], scaleY: [0.4, 1.2, 0.9, 1.25, 1], scaleX: [0.8, 0.9, 1.1, 0.9, 1] }} transition={{ delay: 0.4 + i * 0.1, duration: 2.8, times: [0, 0.15, 0.4, 0.7, 1] }}>
        🔥
      </Glyph>
    )),
  halo: ({ d }) => (
    <>
      <motion.span style={abs({ left: -d * 0.15, top: -d * 0.15, width: d * 1.3, height: d * 1.3, borderRadius: 999, background: "radial-gradient(circle,rgba(255,236,170,0.55),rgba(255,214,120,0.18) 45%,transparent 70%)", zIndex: -1 })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6, 1, 0.6, 1, 0], scale: [0.6, 1, 0.95, 1.05, 0.95, 1, 1.1] }} transition={{ duration: T, times: [0, 0.15, 0.35, 0.55, 0.7, 0.85, 1] }} />
      <motion.span style={abs({ left: -d * 0.25, top: -d * 0.25, width: d * 1.5, height: d * 1.5, zIndex: -1, background: "repeating-conic-gradient(from 0deg,rgba(255,240,190,0.28) 0deg 6deg,transparent 6deg 24deg)", WebkitMaskImage: "radial-gradient(circle,black 30%,transparent 68%)", maskImage: "radial-gradient(circle,black 30%,transparent 68%)" })} initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: [0, 1, 1, 0], rotate: 90 }} transition={{ duration: T, times: [0, 0.2, 0.85, 1], ease: "linear" }} />
    </>
  ),
  rays: ({ d }) => (
    <motion.span style={abs({ left: -d * 0.3, top: -d * 0.3, width: d * 1.6, height: d * 1.6, zIndex: -1, background: "repeating-conic-gradient(from 0deg,rgba(255,210,90,0.45) 0deg 8deg,transparent 8deg 22deg)", WebkitMaskImage: "radial-gradient(circle,black 25%,transparent 66%)", maskImage: "radial-gradient(circle,black 25%,transparent 66%)" })} initial={{ opacity: 0, rotate: 0, scale: 0.5 }} animate={{ opacity: [0, 1, 1, 0], rotate: 120, scale: [0.5, 1, 1, 1.1] }} transition={{ duration: T, times: [0, 0.15, 0.85, 1], ease: "linear" }} />
  ),
  petals: ({ d }) =>
    seq(9, (i) => (
      <motion.span key={i} style={abs({ left: d * rnd(i, 14), top: -d * 0.1, width: d * 0.07, height: d * 0.1, borderRadius: "80% 0 80% 0", background: "linear-gradient(135deg,#ffc1d9,#ff6b9d)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], y: d * 1.05, x: [0, 12, -8, 10], rotate: [0, 160, 320] }} transition={{ delay: 0.4 + i * 0.3, duration: 1.9, ease: "linear" }} />
    )),
  popcorn: ({ d }) =>
    seq(12, (i) => {
      const dir = (rnd(i, 15) - 0.5) * 2;
      return (
        <motion.span key={i} style={abs({ left: d * 0.46, top: d * 0.62, width: d * 0.08, height: d * 0.07, borderRadius: "50% 45% 55% 50%", background: "radial-gradient(circle at 40% 40%,#fffdf2,#f5d98a)", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], x: [0, dir * d * 0.3, dir * d * 0.45], y: [0, -d * (0.45 + rnd(i, 16) * 0.25), d * 0.1], rotate: [0, dir * 280] }} transition={{ delay: 0.5 + i * 0.22, duration: 1.1, ease: "easeOut" }} />
      );
    }),
  kiss: ({ d }) =>
    seq(3, (i) => (
      <Glyph key={i} style={{ left: d * 0.45, top: d * 0.5, fontSize: d * 0.18 }} animate={{ opacity: [0, 1, 1, 0], x: [0, d * 0.35, d * 0.6], y: [0, -d * 0.2, -d * 0.5], scale: [0.3, 1.2, 0.9], rotate: [0, 15, -10] }} transition={{ delay: 0.6 + i * 0.85, duration: 1.2, ease: "easeOut" }}>
        💋
      </Glyph>
    )),
  crack: ({ d }) => (
    <>
      <Glyph style={{ left: d * 0.36, top: -d * 0.1, fontSize: d * 0.3 }} animate={{ opacity: [0, 1, 1, 1, 0], scale: [0.3, 1.2, 1, 1, 0.8], x: [0, 0, -3, 3, 0], y: [0, 0, 0, 0, d * 0.3] }} transition={{ delay: 0.4, duration: 2.6, times: [0, 0.12, 0.3, 0.45, 1] }}>
        💔
      </Glyph>
      {seq(6, (i) => (
        <motion.span key={i} style={abs({ left: d * 0.5, top: d * 0.06, width: d * 0.035, height: d * 0.035, background: "#ff4d6d", transform: "rotate(45deg)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], x: (rnd(i, 17) - 0.5) * d * 0.5, y: d * (0.3 + rnd(i, 18) * 0.3), rotate: 180 }} transition={{ delay: 1.2, duration: 1, ease: "easeIn" }} />
      ))}
    </>
  ),
  stars: ({ d }) =>
    seq(5, (i) => {
      const a = (i / 5) * Math.PI * 2;
      return (
        <Glyph key={i} style={{ left: d / 2 - d * 0.06, top: d / 2 - d * 0.06, fontSize: d * 0.13 }} animate={{ opacity: [0, 1, 1, 0], x: [Math.cos(a) * d * 0.55, Math.cos(a + 2) * d * 0.55, Math.cos(a + 4) * d * 0.55], y: [Math.sin(a) * d * 0.5, Math.sin(a + 2) * d * 0.5, Math.sin(a + 4) * d * 0.5], scale: [0.5, 1, 0.7] }} transition={{ delay: 0.45, duration: 2.6, ease: "linear" }}>
          ⭐
        </Glyph>
      );
    }),
  sweat: ({ d }) =>
    seq(2, (i) => (
      <motion.span key={i} style={abs({ left: d * 0.68, top: d * 0.12, width: d * 0.07, height: d * 0.1, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", background: "linear-gradient(#e6f6ff,#79c4ff)", boxShadow: "0 0 4px rgba(120,190,255,0.8)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], y: [0, 0, d * 0.25], scale: [0.4, 1, 1] }} transition={{ delay: 0.6 + i * 1.3, duration: 1.1, times: [0, 0.3, 1], ease: "easeIn" }} />
    )),
  cloud: ({ d }) => (
    <>
      <Glyph style={{ left: d * 0.28, top: -d * 0.26, fontSize: d * 0.36, filter: "grayscale(0.4) brightness(0.8)" }} animate={{ opacity: [0, 1, 1, 0], y: [-10, 0, 0, -6], x: [0, -4, 4, 0] }} transition={{ delay: 0.35, duration: 3, times: [0, 0.1, 0.85, 1] }}>
        ☁️
      </Glyph>
      {seq(10, (i) => (
        <motion.span key={i} style={abs({ left: d * (0.36 + rnd(i, 19) * 0.28), top: d * 0.05, width: 2, height: d * 0.07, borderRadius: 2, background: "rgba(150,200,255,0.9)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: d * 0.35 }} transition={{ delay: 0.7 + i * 0.22, duration: 0.55, ease: "easeIn" }} />
      ))}
    </>
  ),
  smoke: ({ d }) =>
    seq(7, (i) => (
      <motion.span key={i} style={abs({ left: d * (0.1 + rnd(i, 20) * 0.7), top: d * 0.7, width: d * 0.3, height: d * 0.3, borderRadius: 999, background: "radial-gradient(circle,rgba(110,90,140,0.55),transparent 70%)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0], y: -d * 0.55, scale: [0.6, 1.6] }} transition={{ delay: 0.2 + i * 0.4, duration: 1.6, ease: "easeOut" }} />
    )),
  bubbles: ({ d }) =>
    seq(9, (i) => (
      <motion.span key={i} style={abs({ left: d * (0.3 + rnd(i, 21) * 0.4), top: d * 0.55, width: d * (0.04 + rnd(i, 22) * 0.05), height: d * (0.04 + rnd(i, 22) * 0.05), borderRadius: 999, border: "1.5px solid rgba(220,240,255,0.9)", background: "rgba(255,255,255,0.15)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: -d * 0.6, x: [0, 6, -6, 4] }} transition={{ delay: 0.5 + i * 0.3, duration: 1.5, ease: "easeOut" }} />
    )),
  flash: ({ d }) => (
    <motion.span style={abs({ left: -d * 0.1, top: -d * 0.1, width: d * 1.2, height: d * 1.2, borderRadius: 999, background: "radial-gradient(circle,rgba(255,255,255,0.95),rgba(255,240,200,0.4) 40%,transparent 70%)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3] }} transition={{ delay: 0.22, duration: 0.45, ease: "easeOut" }} />
  ),
  redFlash: ({ d }) => (
    <motion.span style={abs({ left: -d * 0.1, top: -d * 0.1, width: d * 1.2, height: d * 1.2, borderRadius: 999, background: "radial-gradient(circle,rgba(255,60,60,0.55),transparent 65%)", zIndex: -1 })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.3, 0.9, 0.3, 0.8, 0] }} transition={{ delay: 0.25, duration: 2.6 }} />
  ),
  thought: ({ d }) =>
    seq(3, (i) => (
      <motion.span key={i} style={abs({ left: d * (0.6 + i * 0.08), top: d * (0.3 - i * 0.09), width: d * (0.04 + i * 0.025), height: d * (0.04 + i * 0.025), borderRadius: 999, background: "rgba(255,255,255,0.9)" })} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 1, 0], scale: [0, 1, 1, 0.8] }} transition={{ delay: 0.4 + i * 0.25, duration: 2.6, times: [0, 0.1, 0.9, 1] }} />
    )),
  foodSteam: ({ d }) =>
    seq(6, (i) => (
      <motion.span key={i} style={abs({ left: d * (0.3 + (i % 3) * 0.14), top: d * 0.6, width: 3, height: d * 0.22, borderRadius: 4, background: "linear-gradient(transparent,rgba(255,255,255,0.85),transparent)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0], y: -d * 0.3, x: [0, 5, -5, 3], scaleY: [0.6, 1.2] }} transition={{ delay: 0.5 + i * 0.45, duration: 1.3, ease: "easeOut" }} />
    )),
  moon: ({ d }) => (
    <Glyph style={{ left: d * 0.78, top: -d * 0.12, fontSize: d * 0.24, transformOrigin: "50% 0%", filter: "drop-shadow(0 0 6px #ffe08a)" }} animate={{ opacity: [0, 1, 1, 0], rotate: [-20, 15, -15, 10], y: [-8, 0, 0, -6] }} transition={{ delay: 0.3, duration: 3, times: [0, 0.2, 0.7, 1] }}>
      🌙
    </Glyph>
  ),
  speed: ({ d }) =>
    seq(5, (i) => (
      <motion.span key={i} style={abs({ left: -d * 0.25, top: d * (0.2 + i * 0.14), height: 2, width: d * 0.35, borderRadius: 2, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.85))" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], x: [-d * 0.2, d * 0.1] }} transition={{ delay: 0.02 + i * 0.04, duration: 0.4, ease: "easeOut" }} />
    )),
};

/* ---------------------------------------------------------------- the scene */

/** One panda sticker scene over a seat. `d` is the drawn size in px. */
export function PandaScene({ src, label, d }: { src: string; label: string; d: number }) {
  const play = PANDA_PLAYS[label] ?? { enter: "pop", body: "sway", fx: ["sparkles"] };
  const enter = ENTER[play.enter](d);
  const body = BODY[play.body](d);
  const behind: Fx[] = ["halo", "rays", "redFlash"];
  return (
    <span style={abs({ inset: 0 })} aria-hidden>
      {/* effects that sit behind the panda */}
      {play.fx.filter((f) => behind.includes(f)).map((f) => (
        <span key={f} style={abs({ inset: 0 })}>{FX[f]({ d, src })}</span>
      ))}
      {/* soft ground shadow that squashes with the body */}
      <motion.span style={abs({ left: d * 0.22, right: d * 0.22, bottom: d * 0.02, height: d * 0.09, borderRadius: 999, background: "radial-gradient(closest-side,rgba(0,0,0,0.45),transparent)" })} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0], scaleX: [0.5, 1, 1, 0.6] }} transition={{ duration: T, times: [0, 0.15, 0.88, 1] }} />
      <motion.span style={abs({ inset: 0 })} initial={false} animate={enter.animate} transition={enter.transition}>
        <motion.span style={abs({ inset: 0, transformOrigin: body.origin ?? "50% 92%" })} animate={body.animate} transition={body.transition}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.55))" }} />
          {play.fx.includes("shine") ? FX.shine({ d, src }) : null}
        </motion.span>
      </motion.span>
      {/* effects in front */}
      {play.fx.filter((f) => !behind.includes(f) && f !== "shine").map((f) => (
        <span key={f} style={abs({ inset: 0 })}>{FX[f]({ d, src })}</span>
      ))}
    </span>
  );
}
