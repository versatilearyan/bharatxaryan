"use client";

/**
 * The Ludo board: a 15 × 15 grid drawn in SVG, turned so your colour is always
 * at the bottom left. Tokens hop square by square when they move.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LANES, LOOP, SAFE, SEAT_COLOR, START, YARD, YARD_SPOTS, cellOf, pathOf, type LudoGame } from "@/lib/api/ludo";

const STEP = 0.11; // seconds per square when hopping

/** Rotation that puts `seat` at the bottom left (seat 3's corner). */
export const rotationFor = (seat: number) => ((3 - seat + 4) % 4) * 90;

function Star({ x, y, color }: { x: number; y: number; color: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 0.32 : 0.14;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${x + 0.5 + r * Math.cos(a)},${y + 0.5 + r * Math.sin(a)}`;
  }).join(" ");
  return <polygon points={pts} fill={color} opacity={0.9} />;
}

export function LudoBoard({ g, mySeat, onToken, highlight }: { g: LudoGame; mySeat: number; onToken: (token: number) => void; highlight: number[] }) {
  const rot = rotationFor(mySeat);
  const seats = useMemo(() => new Set(g.players.map((p) => p.seat)), [g.players]);

  // Where each token is drawn, with hop keyframes for the one that just moved
  const prev = useRef<Map<string, number>>(new Map());
  const [frames, setFrames] = useState<Map<string, { xs: number[]; ys: number[] }>>(new Map());
  useEffect(() => {
    const next = new Map<string, { xs: number[]; ys: number[] }>();
    const lm = g.lastMove;
    for (const p of g.players) {
      p.tokens.forEach((pos, t) => {
        const key = `${p.seat}-${t}`;
        const before = prev.current.get(key);
        if (before !== undefined && before !== pos && lm && lm.seat === p.seat && lm.token === t && pos >= 0) {
          const path = pathOf(p.seat, t, before, pos);
          const start = cellOf(p.seat, before, t);
          next.set(key, { xs: [start[0], ...path.map((c) => c[0])], ys: [start[1], ...path.map((c) => c[1])] });
        }
        prev.current.set(key, pos);
      });
    }
    setFrames(next);
  }, [g.version, g.players, g.lastMove]);

  // Tokens sharing a square spread out a little
  const placed = useMemo(() => {
    const groups = new Map<string, string[]>();
    const list: { key: string; seat: number; t: number; pos: number; x: number; y: number }[] = [];
    for (const p of g.players) {
      if (p.left) continue;
      p.tokens.forEach((pos, t) => {
        const [x, y] = cellOf(p.seat, pos, t);
        const k = `${x.toFixed(2)}:${y.toFixed(2)}`;
        groups.set(k, [...(groups.get(k) ?? []), `${p.seat}-${t}`]);
        list.push({ key: `${p.seat}-${t}`, seat: p.seat, t, pos, x, y });
      });
    }
    return list.map((it) => {
      const g2 = groups.get(`${it.x.toFixed(2)}:${it.y.toFixed(2)}`) ?? [];
      const i = g2.indexOf(it.key);
      const n = g2.length;
      const off = n > 1 && it.pos >= 0 ? 0.18 : 0;
      const ang = (2 * Math.PI * i) / Math.max(n, 1);
      return { ...it, x: it.x + off * Math.cos(ang), y: it.y + off * Math.sin(ang), scale: n > 1 && it.pos >= 0 ? 0.78 : 1 };
    });
  }, [g.players]);

  const cell = (c: number, r: number, fill: string, key: string, stroke = "rgba(255,255,255,0.08)") => (
    <rect key={key} x={c + 0.06} y={r + 0.06} width={0.88} height={0.88} rx={0.18} fill={fill} stroke={stroke} strokeWidth={0.03} />
  );

  return (
    <div className="relative aspect-square w-full">
      <svg viewBox="0 0 15 15" className="h-full w-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
        <defs>
          <radialGradient id="ludo-bg" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#3a1a4a" />
            <stop offset="100%" stopColor="#140c1f" />
          </radialGradient>
          {SEAT_COLOR.map((c, i) => (
            <linearGradient key={i} id={`yard-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={c.main} />
              <stop offset="100%" stopColor={c.dark} />
            </linearGradient>
          ))}
          {SEAT_COLOR.map((c, i) => (
            <radialGradient key={`tk-${i}`} id={`tok-${i}`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor={c.light} />
              <stop offset="45%" stopColor={c.main} />
              <stop offset="100%" stopColor={c.dark} />
            </radialGradient>
          ))}
        </defs>
        <rect x={0} y={0} width={15} height={15} rx={0.9} fill="url(#ludo-bg)" stroke="rgba(231,188,114,0.45)" strokeWidth={0.08} />
        <g transform={`rotate(${rot} 7.5 7.5)`}>
          {/* Yards */}
          {YARD.map(([c, r], s) => (
            <g key={`yard-${s}`} opacity={seats.has(s) ? 1 : 0.35}>
              <rect x={c + 0.15} y={r + 0.15} width={5.7} height={5.7} rx={0.8} fill={`url(#yard-${s})`} />
              <rect x={c + 0.85} y={r + 0.85} width={4.3} height={4.3} rx={0.6} fill="rgba(15,8,24,0.55)" stroke="rgba(255,255,255,0.18)" strokeWidth={0.05} />
              {YARD_SPOTS.map(([sx, sy], i) => (
                <circle key={i} cx={c + sx} cy={r + sy} r={0.55} fill="rgba(255,255,255,0.08)" stroke={SEAT_COLOR[s].main} strokeWidth={0.07} />
              ))}
            </g>
          ))}
          {/* Loop */}
          {LOOP.map(([c, r], i) => {
            const startOf = START.indexOf(i);
            const fill = startOf >= 0 ? SEAT_COLOR[startOf].main : "rgba(255,255,255,0.07)";
            return cell(c, r, fill, `l-${i}`);
          })}
          {LOOP.map(([c, r], i) => (SAFE.has(i) && START.indexOf(i) < 0 ? <Star key={`s-${i}`} x={c} y={r} color="#e7bc72" /> : null))}
          {/* Home lanes */}
          {LANES.map((lane, s) => lane.map(([c, r], i) => cell(c, r, SEAT_COLOR[s].main, `h-${s}-${i}`, "rgba(255,255,255,0.25)")))}
          {/* Centre */}
          <polygon points="6,6 7.5,7.5 6,9" fill={SEAT_COLOR[0].main} />
          <polygon points="6,6 7.5,7.5 9,6" fill={SEAT_COLOR[1].main} />
          <polygon points="9,6 7.5,7.5 9,9" fill={SEAT_COLOR[2].main} />
          <polygon points="6,9 7.5,7.5 9,9" fill={SEAT_COLOR[3].main} />
          <circle cx={7.5} cy={7.5} r={0.55} fill="#140c1f" stroke="#e7bc72" strokeWidth={0.06} />
          <text x={7.5} y={7.78} textAnchor="middle" fontSize={0.75} aria-hidden>
            🏠
          </text>

          {/* Tokens */}
          {placed.map((tk) => {
            const fr = frames.get(tk.key);
            const canMove = tk.seat === mySeat && highlight.includes(tk.t);
            return (
              <motion.g
                key={tk.key}
                initial={false}
                animate={fr ? { x: fr.xs, y: fr.ys } : { x: tk.x, y: tk.y }}
                transition={fr ? { duration: STEP * (fr.xs.length - 1), ease: "linear", times: fr.xs.map((_, i) => i / Math.max(1, fr.xs.length - 1)) } : { type: "spring", stiffness: 300, damping: 26 }}
                style={{ cursor: canMove ? "pointer" : "default" }}
                onClick={() => canMove && onToken(tk.t)}
              >
                {canMove ? (
                  <motion.circle r={0.55} fill="none" stroke="#fff" strokeWidth={0.07} animate={{ r: [0.45, 0.62, 0.45], opacity: [1, 0.4, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
                ) : null}
                <g transform={`rotate(${-rot}) scale(${tk.scale})`}>
                  <ellipse cx={0} cy={0.3} rx={0.33} ry={0.1} fill="rgba(0,0,0,0.45)" />
                  <circle r={0.36} fill={`url(#tok-${tk.seat})`} stroke="#fff" strokeWidth={0.06} />
                  <circle r={0.16} fill="rgba(255,255,255,0.85)" />
                  <circle cx={-0.1} cy={-0.12} r={0.07} fill="#fff" opacity={0.9} />
                </g>
              </motion.g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/** A 3D-looking dice with pips; shakes while rolling. */
export function Dice({ value, rolling, color, size = 64, onClick, disabled }: { value: number; rolling: boolean; color: string; size?: number; onClick?: () => void; disabled?: boolean }) {
  const [face, setFace] = useState(value || 1);
  useEffect(() => {
    if (!rolling) {
      setFace(value || 1);
      return;
    }
    const t = window.setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 70);
    return () => window.clearInterval(t);
  }, [rolling, value]);
  const pips: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
  };
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={rolling ? "Rolling" : onClick && !disabled ? "Roll the dice" : `Dice shows ${value}`}
      animate={rolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.15, 0.95, 1.1, 1] } : { rotate: 0, scale: 1 }}
      transition={rolling ? { duration: 0.6, repeat: Infinity, ease: "linear" } : { type: "spring", stiffness: 400, damping: 15 }}
      whileTap={onClick && !disabled ? { scale: 0.88 } : undefined}
      className="relative"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" style={{ filter: `drop-shadow(0 8px 14px ${color})` }}>
        <defs>
          <linearGradient id="dice-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e9e3f5" />
          </linearGradient>
        </defs>
        <rect x={6} y={10} width={88} height={86} rx={20} fill="#b9b0cc" />
        <rect x={6} y={4} width={88} height={86} rx={20} fill="url(#dice-face)" stroke="rgba(0,0,0,0.08)" strokeWidth={1.5} />
        {(pips[face] ?? pips[1]).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y - 3} r={face === 1 ? 11 : 8.5} fill={face === 1 ? "#ff3b5c" : "#2a1838"} />
        ))}
      </svg>
    </motion.button>
  );
}
