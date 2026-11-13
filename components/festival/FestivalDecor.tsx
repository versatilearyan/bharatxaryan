"use client";

import { useEffect, useRef } from "react";
import { useFestival } from "./FestivalProvider";

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; kind: "spark" | "confetti"; rot?: number };

const PALETTE = ["#ffd36e", "#ff8a5c", "#ff5d8f", "#7fd6ff", "#c58bff", "#6fe0a6", "#fff1d5"];

/** Fireworks and confetti on a canvas (it never catches a tap), string lights along the top and diyas along the bottom. */
export function FestivalDecor({ contained = false }: { contained?: boolean }) {
  const { config } = useFestival();
  const d = config && config.sections.decorations && config.decorations.enabled ? config.decorations : null;
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const fire = Boolean(d?.fireworks), conf = Boolean(d?.confetti), level = d?.intensity ?? 50;

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || (!fire && !conf)) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const parts: P[] = [];
    let raf = 0, last = performance.now(), nextBurst = 0, nextConfetti = 0;
    const size = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.floor(r.width * dpr));
      cv.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const burst = (w: number, h: number) => {
      const x = w * (0.15 + Math.random() * 0.7), y = h * (0.12 + Math.random() * 0.35);
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const n = 26 + Math.round(level / 4);
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n, s = 1.2 + Math.random() * 2.2;
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 900 + Math.random() * 500, color, size: 1.6, kind: "spark" });
      }
    };
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const r = cv.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      if (fire && now > nextBurst) {
        burst(r.width, r.height);
        nextBurst = now + 2600 - level * 17 + Math.random() * 500;
      }
      if (conf && now > nextConfetti) {
        for (let i = 0; i < 2 + Math.round(level / 40); i++) parts.push({ x: Math.random() * r.width, y: -8, vx: (Math.random() - 0.5) * 0.6, vy: 0.7 + Math.random() * 1.1, life: 0, max: 7000, color: PALETTE[Math.floor(Math.random() * PALETTE.length)], size: 5 + Math.random() * 4, kind: "confetti", rot: Math.random() * 6 });
        nextConfetti = now + 260 - level * 1.6;
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life > p.max || p.y > r.height + 12) {
          parts.splice(i, 1);
          continue;
        }
        const k = dt / 16;
        if (p.kind === "spark") {
          p.vy += 0.035 * k;
          p.vx *= 0.988;
          p.vy *= 0.988;
        } else p.rot = (p.rot ?? 0) + 0.06 * k;
        p.x += p.vx * k;
        p.y += p.vy * k;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.fillStyle = p.color;
        if (p.kind === "spark") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot ?? 0);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [fire, conf, level]);

  if (!d) return null;
  const pos = contained ? "absolute" : "fixed";
  return (
    <div className={`pointer-events-none ${pos} inset-0 z-[55] overflow-hidden`} aria-hidden data-festival-decor>
      {fire || conf ? <canvas ref={canvas} className="h-full w-full" /> : null}
      {d.lights ? (
        <div className="absolute inset-x-0 top-0 flex justify-between px-1">
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className="relative -mt-1 flex flex-col items-center">
              <span className="h-2 w-px bg-white/25" />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length], boxShadow: `0 0 10px 2px ${PALETTE[i % PALETTE.length]}aa`, animation: `festival-twinkle ${1.2 + (i % 5) * 0.25}s ease-in-out ${i * 0.12}s infinite` }} />
            </span>
          ))}
        </div>
      ) : null}
      {d.diyas ? (
        <div className="absolute inset-x-0 bottom-[78px] flex justify-around px-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <svg key={i} width="26" height="22" viewBox="0 0 30 24" style={{ filter: "drop-shadow(0 0 6px #ffb347)" }}>
              <path d="M15 1c2 2.8 3 4.6 0 7.8-3-3.2-2-5 0-7.8Z" fill="#ffcf5a" style={{ transformOrigin: "15px 9px", animation: `festival-flame ${0.9 + (i % 3) * 0.2}s ease-in-out ${i * 0.15}s infinite` }} />
              <path d="M3 11c4 7 20 7 24 0-4 1.6-20 1.6-24 0Z" fill="#d9a84f" stroke="#8a5412" strokeWidth="0.8" />
            </svg>
          ))}
        </div>
      ) : null}
    </div>
  );
}
