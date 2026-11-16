"use client";

/**
 * Sounds for Gaon ka Gaddaar, made with the browser's own synthesiser (no files to download, nothing to lag).
 * Browsers only let sound start after a tap, so the first tap in the game wakes it up.
 */
export type Sfx = "enter" | "join" | "click" | "task" | "taskAll" | "kill" | "report" | "emergency" | "vote" | "alarm" | "fixed" | "vent" | "win" | "lose" | "chat" | "tick";

const KEY = "gaddar.sound.v1";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try {
  muted = typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "off";
} catch {
  /* private window */
}

export const soundOn = () => !muted;
export function setSound(on: boolean) {
  muted = !on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  if (master) master.gain.value = on ? 0.5 : 0;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

/** Call from a tap so the phone lets sound play. */
export function wakeSound() {
  audio();
}

type Note = { f: number; t: number; d: number; type?: OscillatorType; v?: number; to?: number };

function play(notes: Note[]) {
  const a = audio();
  if (!a || !master || muted) return;
  const t0 = a.currentTime + 0.02;
  for (const n of notes) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = n.type ?? "sine";
    o.frequency.setValueAtTime(n.f, t0 + n.t);
    if (n.to) o.frequency.exponentialRampToValueAtTime(n.to, t0 + n.t + n.d);
    const v = n.v ?? 0.3;
    g.gain.setValueAtTime(0.0001, t0 + n.t);
    g.gain.exponentialRampToValueAtTime(v, t0 + n.t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.t + n.d);
    o.connect(g);
    g.connect(master);
    o.start(t0 + n.t);
    o.stop(t0 + n.t + n.d + 0.05);
  }
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, A4 = 440, D5 = 587.33;

const SOUNDS: Record<Sfx, Note[]> = {
  // a short, happy rising tune when you come into the game
  enter: [
    { f: C5, t: 0, d: 0.16, type: "triangle" },
    { f: E5, t: 0.12, d: 0.16, type: "triangle" },
    { f: G5, t: 0.24, d: 0.16, type: "triangle" },
    { f: C6, t: 0.38, d: 0.42, type: "triangle", v: 0.35 },
  ],
  join: [{ f: 880, t: 0, d: 0.09, type: "sine", v: 0.2 }, { f: 1320, t: 0.07, d: 0.12, type: "sine", v: 0.2 }],
  click: [{ f: 700, t: 0, d: 0.05, type: "square", v: 0.08 }],
  tick: [{ f: 1000, t: 0, d: 0.04, type: "square", v: 0.06 }],
  // a kaam is done: a bright two-note "ding ding"
  task: [{ f: G5, t: 0, d: 0.14, type: "triangle", v: 0.35 }, { f: C6, t: 0.11, d: 0.3, type: "triangle", v: 0.38 }],
  // every kaam is done
  taskAll: [C5, E5, G5, C6, G5, C6].map((f, i) => ({ f, t: i * 0.1, d: 0.2, type: "triangle" as OscillatorType, v: 0.35 })),
  kill: [{ f: 220, t: 0, d: 0.35, type: "sawtooth", to: 55, v: 0.4 }, { f: 90, t: 0.05, d: 0.3, type: "square", to: 40, v: 0.3 }],
  report: [{ f: 880, t: 0, d: 0.12, type: "square", v: 0.2 }, { f: 660, t: 0.14, d: 0.12, type: "square", v: 0.2 }, { f: 880, t: 0.28, d: 0.16, type: "square", v: 0.2 }],
  // the baithak bell: a loud, urgent alarm
  emergency: [0, 1, 2, 3, 4, 5].flatMap((i) => [
    { f: 988, t: i * 0.22, d: 0.1, type: "square" as OscillatorType, v: 0.28 },
    { f: 740, t: i * 0.22 + 0.1, d: 0.1, type: "square" as OscillatorType, v: 0.28 },
  ]),
  vote: [{ f: 520, t: 0, d: 0.08, type: "triangle", v: 0.3 }, { f: 780, t: 0.07, d: 0.14, type: "triangle", v: 0.3 }],
  // sabotage: a siren
  alarm: [0, 1, 2].flatMap((i) => [
    { f: 440, t: i * 0.6, d: 0.3, type: "sawtooth" as OscillatorType, to: 880, v: 0.22 },
    { f: 880, t: i * 0.6 + 0.3, d: 0.3, type: "sawtooth" as OscillatorType, to: 440, v: 0.22 },
  ]),
  fixed: [{ f: A4, t: 0, d: 0.12, type: "sine", v: 0.3 }, { f: D5, t: 0.1, d: 0.12, type: "sine", v: 0.3 }, { f: E5 * 1.5, t: 0.2, d: 0.3, type: "sine", v: 0.3 }],
  vent: [{ f: 300, t: 0, d: 0.25, type: "sawtooth", to: 90, v: 0.2 }],
  win: [C5, E5, G5, C6, 0, G5, C6, 1318.5].map((f, i) => ({ f: f || 1, t: i * 0.13, d: 0.28, type: "triangle" as OscillatorType, v: f ? 0.38 : 0.0001 })),
  lose: [{ f: 392, t: 0, d: 0.3, type: "triangle", v: 0.33 }, { f: 330, t: 0.28, d: 0.3, type: "triangle", v: 0.33 }, { f: 262, t: 0.56, d: 0.6, type: "triangle", v: 0.33 }],
  chat: [{ f: 1200, t: 0, d: 0.06, type: "sine", v: 0.12 }],
};

export function sfx(name: Sfx) {
  const n = SOUNDS[name];
  if (n) play(n);
}
