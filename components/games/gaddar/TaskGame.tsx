"use client";

/**
 * The little games for some kaam. The server only checks that you were next to the kaam and took long enough, so these
 * run on the phone:
 *  - seq: light the diyas in order, 1 to 5 (a wrong one starts you over)
 *  - wires: join each coloured wire on the left to the same colour on the right
 */
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { GaddarTaskKind } from "@/lib/api/gaddar";

const WIRE_COLORS = ["#e5484d", "#3e8ef7", "#f5c542", "#2ea44f"];

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export function TaskGame({ kind, name, onDone, onCancel }: { kind: Exclude<GaddarTaskKind, "hold"> | "fuse"; name: string; onDone: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/70 px-4" role="dialog" aria-label={name}>
      <div className="relative w-full max-w-[430px] rounded-3xl bg-gradient-to-b from-[#4a3220] to-[#241812] p-4 ring-1 ring-gold/35">
        <button type="button" onClick={onCancel} aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-cream">
          <X className="h-4 w-4" />
        </button>
        <h3 className="pr-9 font-display text-[18px] font-black uppercase tracking-tight text-gold">{name}</h3>
        {kind === "seq" ? <Sequence onDone={onDone} /> : null}
        {kind === "wires" ? <Wires onDone={onDone} /> : null}
        {kind === "fuse" ? <Fuses onDone={onDone} /> : null}
        {kind === "swipe" ? <Swipe onDone={onDone} /> : null}
        {kind === "align" ? <Align onDone={onDone} /> : null}
        {kind === "shield" ? <Shield onDone={onDone} /> : null}
      </div>
    </div>
  );
}

function Sequence({ onDone }: { onDone: () => void }) {
  const N = 5;
  const order = useMemo(() => shuffle(Array.from({ length: N }, (_, i) => i + 1)), []);
  const [next, setNext] = useState(1);
  const [wrong, setWrong] = useState(false);
  const done = useRef(false);
  const tap = (n: number) => {
    if (done.current) return;
    if (n === next) {
      if (n === N) {
        done.current = true;
        setNext(N + 1);
        window.setTimeout(onDone, 350);
      } else setNext(n + 1);
    } else {
      setNext(1);
      setWrong(true);
      window.setTimeout(() => setWrong(false), 400);
    }
  };
  return (
    <>
      <p className="mt-1 text-[12.5px] font-bold text-cream/80">Diya 1 se {N} tak ek ke baad ek jalao. Galat daba to dobara shuru.</p>
      <div className={`mt-3 grid grid-cols-5 gap-2 ${wrong ? "animate-pulse" : ""}`}>
        {order.map((n) => {
          const lit = n < next;
          return (
            <button
              key={n}
              type="button"
              onClick={() => tap(n)}
              aria-label={`Diya ${n}`}
              className={`grid h-14 place-items-center rounded-2xl text-[20px] font-extrabold ring-2 transition ${lit ? "bg-[#ffd24a] text-[#5a3a08] ring-[#fff0a8]" : wrong ? "bg-[#7a2a2a] text-white ring-[#ff8a80]" : "bg-black/35 text-cream ring-white/20"}`}
            >
              {lit ? "🪔" : n}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Wires({ onDone }: { onDone: () => void }) {
  const left = useMemo(() => shuffle(WIRE_COLORS.slice(0, 3)), []);
  const right = useMemo(() => shuffle(WIRE_COLORS.slice(0, 3)), []);
  const [from, setFrom] = useState<number | null>(null);
  const [joined, setJoined] = useState<Record<number, number>>({}); // left index -> right index
  const [bad, setBad] = useState(false);
  const done = useRef(false);
  const tapLeft = (i: number) => {
    if (joined[i] !== undefined) return;
    setFrom(i);
  };
  const tapRight = (j: number) => {
    if (from === null || Object.values(joined).includes(j)) return;
    if (left[from] === right[j]) {
      const nj = { ...joined, [from]: j };
      setJoined(nj);
      setFrom(null);
      if (Object.keys(nj).length === left.length && !done.current) {
        done.current = true;
        window.setTimeout(onDone, 350);
      }
    } else {
      setFrom(null);
      setBad(true);
      window.setTimeout(() => setBad(false), 400);
    }
  };
  const Y = (i: number) => 28 + i * 52;
  return (
    <>
      <p className="mt-1 text-[12.5px] font-bold text-cream/80">Baayen taraf ka rang chuno, phir daayen taraf wahi rang chuno.</p>
      <div className={`relative mt-3 h-[170px] ${bad ? "animate-pulse" : ""}`}>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 170" preserveAspectRatio="none" aria-hidden>
          {Object.entries(joined).map(([i, j]) => (
            <line key={i} x1="42" y1={Y(Number(i))} x2="258" y2={Y(j)} stroke={left[Number(i)]} strokeWidth="9" strokeLinecap="round" />
          ))}
        </svg>
        {left.map((c, i) => (
          <button key={`l${i}`} type="button" onClick={() => tapLeft(i)} aria-label={`Taar ${i + 1} baayen`} className={`absolute left-[14%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ${from === i ? "ring-white" : "ring-black/30"}`} style={{ top: `${(Y(i) / 170) * 100}%`, background: c }} />
        ))}
        {right.map((c, j) => (
          <button key={`r${j}`} type="button" onClick={() => tapRight(j)} aria-label={`Taar ${j + 1} daayen`} className="absolute left-[86%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-black/30" style={{ top: `${(Y(j) / 170) * 100}%`, background: c }} />
        ))}
      </div>
    </>
  );
}

/** Bijli ka panel: flip every switch ON to bring the lights back. */
function Fuses({ onDone }: { onDone: () => void }) {
  const [on, setOn] = useState<boolean[]>(() => {
    const a = Array.from({ length: 6 }, () => Math.random() < 0.4);
    if (a.filter((x) => !x).length < 3) {
      a[1] = false;
      a[3] = false;
      a[5] = false;
    }
    return a;
  });
  const done = useRef(false);
  const flip = (i: number) => {
    if (done.current) return;
    const n = on.map((v, k) => (k === i ? !v : v));
    setOn(n);
    if (n.every(Boolean)) {
      done.current = true;
      window.setTimeout(onDone, 500);
    }
  };
  return (
    <>
      <p className="mt-1 text-[12.5px] font-bold text-cream/80">Saare switch upar karo (ON). Bijli wapas aa jayegi.</p>
      <div className="mt-3 grid grid-cols-6 gap-2 rounded-2xl bg-black/40 p-3 ring-1 ring-white/10">
        {on.map((v, i) => (
          <button key={i} type="button" onClick={() => flip(i)} aria-label={`Switch ${i + 1} ${v ? "ON" : "OFF"}`} className="flex flex-col items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${v ? "bg-[#7dff9a] shadow-[0_0_10px_#7dff9a]" : "bg-[#ff5a5a] shadow-[0_0_10px_#ff5a5a]"}`} />
            <span className="relative h-[84px] w-9 rounded-full bg-[#14101c] ring-2 ring-white/15">
              <motion.span animate={{ y: v ? 4 : 44 }} transition={{ type: "spring", stiffness: 500, damping: 28 }} className={`absolute left-1 h-9 w-7 rounded-full ${v ? "bg-gradient-to-b from-[#b6ffc4] to-[#2ea44f]" : "bg-gradient-to-b from-[#ffb0b0] to-[#c0392b]"} shadow-lg`} />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

/** Card swipe: drag the card across, not too fast and not too slow. */
function Swipe({ onDone }: { onDone: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [msg, setMsg] = useState("Card ko seedha daayen taraf kheencho.");
  const t0 = useRef(0);
  const drag = useRef(false);
  const done = useRef(false);
  const W = () => (track.current?.clientWidth ?? 280) - 80;
  const move = (e: React.PointerEvent) => {
    if (!drag.current || done.current) return;
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    setX(Math.max(0, Math.min(W(), e.clientX - r.left - 38)));
  };
  const up = () => {
    if (!drag.current || done.current) return;
    drag.current = false;
    const took = Date.now() - t0.current;
    if (x < W() - 4) {
      setMsg("Poora kheencho.");
      setX(0);
    } else if (took < 450) {
      setMsg("Bahut tez! Thoda dheere.");
      setX(0);
    } else if (took > 1800) {
      setMsg("Bahut dheere! Thoda tez.");
      setX(0);
    } else {
      done.current = true;
      setMsg("Card manzoor!");
      window.setTimeout(onDone, 400);
    }
  };
  return (
    <>
      <p className="mt-1 text-[12.5px] font-bold text-cream/80">{msg}</p>
      <div ref={track} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="relative mt-4 h-[76px] touch-none select-none rounded-2xl bg-gradient-to-b from-[#1b1424] to-[#0e0a14] ring-1 ring-white/15">
        <div className="absolute inset-x-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-black/60" />
        <div
          onPointerDown={(e) => {
            if (done.current) return;
            drag.current = true;
            t0.current = Date.now();
            e.currentTarget.setPointerCapture?.(e.pointerId);
          }}
          style={{ transform: `translateX(${x}px)` }}
          className="absolute left-1 top-2 grid h-[60px] w-[72px] cursor-grab place-items-center rounded-xl bg-gradient-to-br from-[#ffd86b] to-[#ff7a3d] text-[26px] shadow-[0_6px_0_#8a3a12]"
        >
          💳
        </div>
      </div>
    </>
  );
}

/** Engine alignment: slide until the marker sits in the glowing band, twice. */
function Align({ onDone }: { onDone: () => void }) {
  const [round, setRound] = useState(0);
  const [v, setV] = useState(10);
  const targets = useMemo(() => [30 + Math.random() * 40, 30 + Math.random() * 40], []);
  const target = targets[round] ?? 50;
  const hit = Math.abs(v - target) <= 3.5;
  const done = useRef(false);
  const lock = () => {
    if (!hit || done.current) return;
    if (round === 0) {
      setRound(1);
      setV(10);
    } else {
      done.current = true;
      window.setTimeout(onDone, 350);
    }
  };
  return (
    <>
      <p className="mt-1 text-[12.5px] font-bold text-cream/80">Slider ko chamakte hisse par laao, phir LOCK dabao. ({round + 1}/2)</p>
      <div className="relative mt-5 h-10 rounded-full bg-black/45 ring-1 ring-white/15">
        <div className="absolute inset-y-1 rounded-full bg-[#7dff9a]/40 shadow-[0_0_14px_#7dff9a]" style={{ left: `${target - 4}%`, width: "8%" }} />
        <div className={`absolute top-1 h-8 w-8 -translate-x-1/2 rounded-full ${hit ? "bg-[#7dff9a]" : "bg-[#ffd24a]"} shadow-lg`} style={{ left: `${v}%` }} />
        <input type="range" min={0} max={100} step={0.5} value={v} onChange={(e) => setV(Number(e.target.value))} aria-label="Engine slider" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </div>
      <button type="button" disabled={!hit} onClick={lock} className="mt-4 h-11 w-full rounded-2xl bg-gradient-to-r from-[#2ea44f] to-[#7dff9a] text-[15px] font-black uppercase tracking-wide text-[#08260f] shadow-[0_5px_0_#16672f] disabled:opacity-40 disabled:shadow-none">
        Lock
      </button>
    </>
  );
}

/** Shield: tap every tile that lit up red. */
function Shield({ onDone }: { onDone: () => void }) {
  const lit = useMemo(() => new Set(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 4)), []);
  const [fixed, setFixed] = useState<number[]>([]);
  const [bad, setBad] = useState<number | null>(null);
  const done = useRef(false);
  const tap = (i: number) => {
    if (done.current) return;
    if (!lit.has(i)) {
      setBad(i);
      window.setTimeout(() => setBad(null), 300);
      return;
    }
    if (fixed.includes(i)) return;
    const n = [...fixed, i];
    setFixed(n);
    if (n.length === lit.size) {
      done.current = true;
      window.setTimeout(onDone, 400);
    }
  };
  return (
    <>
      <p className="mt-1 text-[12.5px] font-bold text-cream/80">Laal tiles ko dabao aur dhaal (shield) theek karo.</p>
      <div className="mx-auto mt-3 grid w-[240px] grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, i) => {
          const isLit = lit.has(i) && !fixed.includes(i);
          return (
            <motion.button key={i} type="button" whileTap={{ scale: 0.92 }} onClick={() => tap(i)} aria-label={`Tile ${i + 1}`} className={`h-16 rounded-2xl ring-2 ${isLit ? "animate-pulse bg-gradient-to-br from-[#ff8a8a] to-[#d63031] ring-[#ffd0d0] shadow-[0_0_16px_#ff5a5a]" : bad === i ? "bg-[#5a2a2a] ring-white/20" : fixed.includes(i) ? "bg-gradient-to-br from-[#9dffb0] to-[#2ea44f] ring-[#d6ffe0]" : "bg-[#1b2a3a] ring-white/10"}`} />
          );
        })}
      </div>
    </>
  );
}
