"use client";

/**
 * Pahadi Daud: a solo hill climb in the Panchayat colours. Drive a little saffron jeep with a turbaned driver up the hills,
 * pick up the coins on the road (10, 5, 10, 5 ...) and fuel cans, and don't tip over. Every coin you collect goes to your wallet
 * when the run ends (the server checks it). The physics is in ./engine.ts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Fuel, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/app/store";
import { sfx, wakeSound } from "@/lib/games/gaddarSound";
import { SoundToggle } from "@/components/games/gaddar/GaddarExtras";
import { Coin } from "@/components/ui/kit";
import { HillWorld, PX_PER_M, START_X, ground } from "./engine";

type Info = { enabled: boolean; dailyCap: number; dailyLeft: number; coinBig: number; coinSmall: number; coinGap: number; firstCoin: number; best: number; runId?: string };
type Result = { paid: number; balance: number; distance: number };

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const readInfo = (raw: unknown): Info => {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { enabled: o.enabled !== false, dailyCap: num(o.dailyCap), dailyLeft: num(o.dailyLeft), coinBig: num(o.coinBig, 10), coinSmall: num(o.coinSmall, 5), coinGap: num(o.coinGap, 40), firstCoin: num(o.firstCoin, 30), best: num(o.best), runId: typeof o.runId === "string" ? o.runId : undefined };
};
const opts = { auth: true } as const;

export function HillScreen() {
  const { pop, toast, refreshCoins } = useApp();
  const [info, setInfo] = useState<Info | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "playing" | "over">("loading");
  const [hud, setHud] = useState({ m: 0, coins: 0, fuel: 1 });
  const [result, setResult] = useState<Result | null>(null);
  const [final, setFinal] = useState({ m: 0, coins: 0 });
  const [paying, setPaying] = useState(false);
  const [stunt, setStunt] = useState<{ id: number; text: string } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<HillWorld | null>(null);
  const run = useRef<{ id: string; done: boolean } | null>(null);
  const input = useRef({ gas: false, brake: false });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const infoRef = useRef<Info | null>(null);
  infoRef.current = info;

  useEffect(() => {
    let off = false;
    api<unknown>("/api/v1/games/hill", opts)
      .then((r) => {
        if (off) return;
        setInfo(readInfo(r));
        setPhase("ready");
      })
      .catch((e) => {
        if (off) return;
        toast(e instanceof Error && e.message ? e.message : "Game nahi khul paya.", "error");
        setPhase("ready");
        setInfo(readInfo({ enabled: false }));
      });
    return () => {
      off = true;
    };
  }, [toast]);

  /** Tell the server how the run went, once. The coins go to the wallet. */
  const finish = useCallback(async () => {
    const r = run.current;
    const w = world.current;
    if (!r || r.done || !w) return;
    r.done = true;
    setPaying(true);
    try {
      const res = (await api<Record<string, unknown>>("/api/v1/games/hill/finish", { ...opts, method: "POST", body: { runId: Number(r.id), distance: w.distanceM, coins: w.coins } })) ?? {};
      setResult({ paid: num(res.paid), balance: num(res.balance), distance: num(res.distance, w.distanceM) });
      setInfo((cur) => (cur ? { ...cur, dailyLeft: num(res.dailyLeft, cur.dailyLeft), best: Math.max(cur.best, num(res.best)) } : cur));
      if (num(res.paid) > 0) {
        sfx("taskAll");
        void refreshCoins();
      }
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Coins jama nahi ho paye.", "error");
    } finally {
      setPaying(false);
    }
  }, [refreshCoins, toast]);

  const begin = useCallback(async () => {
    wakeSound();
    const cur = infoRef.current;
    if (!cur) return;
    try {
      const s = readInfo(await api<unknown>("/api/v1/games/hill/start", { ...opts, method: "POST", body: {} }));
      setInfo(s);
      run.current = { id: s.runId ?? "", done: false };
      world.current = new HillWorld({ coinBig: s.coinBig, coinSmall: s.coinSmall, coinGapM: s.coinGap, firstCoinM: s.firstCoin });
      setResult(null);
      setHud({ m: 0, coins: 0, fuel: 1 });
      setPhase("playing");
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Abhi shuru nahi ho sakta.", "error");
    }
  }, [toast]);

  // keyboard
  useEffect(() => {
    const set = (e: KeyboardEvent, on: boolean) => {
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.current.gas = on;
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.current.brake = on;
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // the game loop and the drawing
  useEffect(() => {
    const cv = canvas.current;
    const box = wrap.current;
    if (!cv || !box) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let camX = 0;
    let camY = 0;
    let hudAt = 0;
    let endedAt = 0;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let prevCoins = 0;
    let stuntId = 0;
    const resize = () => {
      dpr = Math.min(document.documentElement.hasAttribute("data-lite") ? 1.25 : 2, window.devicePixelRatio || 1);
      W = box.clientWidth;
      H = box.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = world.current;
      const playing = phaseRef.current === "playing";
      if (w && playing) {
        acc += dt;
        while (acc >= 1 / 60) {
          w.step(1 / 60, input.current.gas, input.current.brake);
          acc -= 1 / 60;
        }
        if (w.coins !== prevCoins) {
          prevCoins = w.coins;
          sfx("tick");
        }
        if (w.stunt && w.stunt.id !== stuntId) {
          stuntId = w.stunt.id;
          const st = w.stunt;
          setStunt({ id: st.id, text: st.flips > 0 ? (st.flips > 1 ? `${st.flips}x FLIP!` : "FLIP!") : `HAWA ME ${st.air.toFixed(1)}s!` });
          sfx("fixed");
          window.setTimeout(() => setStunt((c) => (c && c.id === st.id ? null : c)), 1300);
        }
        if (now - hudAt > 100) {
          hudAt = now;
          setHud({ m: w.distanceM, coins: w.coins, fuel: w.fuel });
        }
        if (w.crashed) {
          endedAt = now;
          sfx("kill");
          setFinal({ m: w.distanceM, coins: w.coins });
          setPhase("over");
          void finish();
        }
      }
      draw(ctx, w, W, H, dpr, now / 1000, camRef);
      void endedAt;
    };
    const camRef = {
      get x() {
        return camX;
      },
      set x(v: number) {
        camX = v;
      },
      get y() {
        return camY;
      },
      set y(v: number) {
        camY = v;
      },
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [finish]);

  // leaving in the middle: what was collected still counts
  useEffect(
    () => () => {
      if (run.current && !run.current.done && world.current) void finish();
    },
    [finish],
  );

  const hold = (key: "gas" | "brake") => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      input.current[key] = true;
    },
    onPointerUp: () => (input.current[key] = false),
    onPointerCancel: () => (input.current[key] = false),
    onPointerLeave: () => (input.current[key] = false),
  });

  return (
    <div className="fixed inset-0 z-[70] select-none overflow-hidden bg-[#150a1f] text-white" style={{ touchAction: "none" }}>
      <div ref={wrap} className="absolute inset-0">
        <canvas ref={canvas} className="h-full w-full" />
      </div>

      {/* top bar */}
      <div className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start gap-2 px-3 pt-2">
        <button
          type="button"
          onClick={() => {
            if (run.current && !run.current.done) void finish();
            pop();
          }}
          aria-label="Back"
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/45 ring-1 ring-white/15"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-black/50 px-3 py-1 font-display text-[17px] font-black tabular-nums ring-1 ring-white/15">{hud.m} m</span>
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 font-display text-[17px] font-black tabular-nums text-[#ffe27a] ring-1 ring-[#ffe27a]/40">
              <Coin className="h-5 w-5" /> {hud.coins}
            </span>
          </div>
          <div className="flex w-[min(260px,70%)] items-center gap-1.5">
            <Fuel className="h-4 w-4 text-[#ff8a8a]" aria-hidden />
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/15">
              <span className={`block h-full rounded-full transition-[width] ${hud.fuel < 0.25 ? "bg-[#ff4d4d]" : "bg-gradient-to-r from-[#7dff9a] to-[#ffe27a]"}`} style={{ width: `${Math.round(hud.fuel * 100)}%` }} />
            </span>
          </div>
        </div>
        <span className="pointer-events-auto">
          <SoundToggle />
        </span>
      </div>

      {stunt ? (
        <motion.p key={stunt.id} initial={{ scale: 0.4, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="pointer-events-none absolute inset-x-0 top-[24%] z-10 text-center font-display text-[34px] font-black uppercase text-[#ffe27a] drop-shadow-[0_3px_0_rgba(120,30,60,0.9)]">
          {stunt.text}
        </motion.p>
      ) : null}

      {/* the two pedals */}
      {phase === "playing" ? (
        <>
          <button type="button" aria-label="Brake" {...hold("brake")} className="absolute bottom-6 left-5 z-10 grid h-[92px] w-[92px] place-items-center rounded-3xl bg-gradient-to-b from-[#ff5d6c] to-[#a3203a] font-display text-[15px] font-black uppercase shadow-[0_6px_0_#5a0f20] active:translate-y-[3px] active:shadow-[0_2px_0_#5a0f20]">
            Brake
          </button>
          <button type="button" aria-label="Gas" {...hold("gas")} className="absolute bottom-6 right-5 z-10 grid h-[104px] w-[104px] place-items-center rounded-3xl bg-gradient-to-b from-[#7dff9a] to-[#1f9a4f] font-display text-[17px] font-black uppercase text-[#06250f] shadow-[0_6px_0_#0d5a29] active:translate-y-[3px] active:shadow-[0_2px_0_#0d5a29]">
            Gas
          </button>
        </>
      ) : null}

      {/* before the run */}
      {phase === "loading" ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/50">
          <Loader2 className="h-8 w-8 animate-spin text-[#ffe27a]" />
        </div>
      ) : null}
      {phase === "ready" && info ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/55 px-5">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-[380px] rounded-[28px] bg-gradient-to-b from-[#4a1a46] to-[#1c0d22] p-5 text-center ring-1 ring-[#e7bc72]/45 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]">
            <p className="text-[52px] leading-none" aria-hidden>
              🚙
            </p>
            <h1 className="mt-2 font-display text-[28px] font-black uppercase tracking-tight text-[#ffe27a]">Pahadi Daud</h1>
            <p className="mt-1 text-[13px] font-bold text-white/80">Jeep ko pahadi par chadhao, sadak ke coins uthao aur ulat mat jana!</p>
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {[info.coinBig, info.coinSmall, info.coinBig, info.coinSmall].map((v, i) => (
                <span key={i} className="flex items-center gap-0.5 rounded-full bg-black/35 px-2.5 py-1 text-[13px] font-black text-[#ffe27a] ring-1 ring-[#ffe27a]/30">
                  <Coin className="h-4 w-4" /> {v}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[12.5px] font-bold text-white/70">Jitne coins uthaoge sab seedha aapke wallet me jayenge.</p>
            <p className="mt-1 text-[11.5px] text-white/50">
              Aaj aur {info.dailyLeft.toLocaleString("en-IN")} coins mil sakte hain · Best {info.best} m
            </p>
            {info.enabled ? (
              <button type="button" onClick={() => void begin()} className="mt-4 h-14 w-full rounded-2xl bg-gradient-to-r from-[#ff3d8b] to-[#ffb347] font-display text-[18px] font-black uppercase tracking-wide shadow-[0_6px_0_#a3204f] active:translate-y-[3px] active:shadow-[0_3px_0_#a3204f]">
                ▶ Shuru karo
              </button>
            ) : (
              <p className="mt-4 rounded-2xl bg-white/10 p-3 text-[13px] font-bold">Ye game abhi band hai. Thodi der baad aana.</p>
            )}
            <p className="mt-3 text-[11px] text-white/45">Gas: aage chalao, hawa me peeche ghumao (flip!) · Brake: rokna, hawa me aage ghumao · Ulta utarne par game khatam</p>
          </motion.div>
        </div>
      ) : null}

      {/* after the run */}
      {phase === "over" ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 px-5">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 16 }} className="w-full max-w-[380px] rounded-[28px] bg-gradient-to-b from-[#4a1a46] to-[#1c0d22] p-5 text-center ring-1 ring-[#e7bc72]/45">
            <p className="font-display text-[26px] font-black text-[#ffe27a]">Game khatam!</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-black/30 py-3">
                <p className="font-display text-[26px] font-black">{final.m} m</p>
                <p className="text-[11px] font-bold text-white/55">Doori</p>
              </div>
              <div className="rounded-2xl bg-black/30 py-3">
                <p className="flex items-center justify-center gap-1 font-display text-[26px] font-black text-[#ffe27a]">
                  <Coin className="h-6 w-6" /> {final.coins}
                </p>
                <p className="text-[11px] font-bold text-white/55">Coins uthaye</p>
              </div>
            </div>
            <div className="mt-3 min-h-[44px]">
              {paying ? (
                <p className="flex items-center justify-center gap-2 text-[13px] font-bold text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" /> Wallet me jama ho rahe hain…
                </p>
              ) : result ? (
                result.paid > 0 ? (
                  <motion.p initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="text-[15px] font-black text-[#7dff9a]">
                    ✅ {result.paid.toLocaleString("en-IN")} coins wallet me aa gaye!
                    {result.paid < final.coins ? <span className="block text-[11.5px] font-bold text-white/55">Aaj ki limit ya raste ke hisaab se itne hi mile.</span> : null}
                  </motion.p>
                ) : (
                  <p className="text-[13px] font-bold text-white/65">{final.coins > 0 ? "Aaj ki limit poori ho gayi, kal phir aana." : "Is baar coins nahi mile. Dobara try karo!"}</p>
                )
              ) : null}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={pop} className="h-12 flex-1 rounded-2xl bg-white/12 font-display text-[14px] font-black ring-1 ring-white/20">
                Wapas
              </button>
              <button type="button" disabled={paying} onClick={() => void begin()} className="h-12 flex-[1.4] rounded-2xl bg-gradient-to-r from-[#ff3d8b] to-[#ffb347] font-display text-[15px] font-black uppercase shadow-[0_4px_0_#a3204f] disabled:opacity-50">
                Phir khelo
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- drawing ---------------- */

type Cam = { x: number; y: number };

function draw(ctx: CanvasRenderingContext2D, w: HillWorld | null, W: number, H: number, dpr: number, t: number, cam: Cam) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // the sky at dusk
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#2a0f3d");
  sky.addColorStop(0.45, "#8a2f5a");
  sky.addColorStop(0.75, "#e8743c");
  sky.addColorStop(1, "#ffb347");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // the sun and a few stars
  ctx.fillStyle = "rgba(255,240,200,0.9)";
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.3, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,226,170,0.25)";
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.3, 62, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 18; i++) {
    const sx = (i * 137.5) % W;
    const sy = ((i * 61) % (H * 0.35)) + 8;
    ctx.fillStyle = `rgba(255,243,208,${0.25 + 0.3 * Math.sin(t * 2 + i)})`;
    ctx.fillRect(sx, sy, 2, 2);
  }

  const scale = W < 460 ? 0.82 : 1;
  const carX = w ? w.x : START_X;
  const carY = w ? w.y : ground(START_X) - 40;
  const tx = carX - W / scale * 0.3;
  const ty = carY - (H / scale) * 0.58;
  cam.x += (tx - cam.x) * (cam.x === 0 ? 1 : 0.18);
  cam.y += (ty - cam.y) * (cam.y === 0 ? 1 : 0.08);
  const cx = cam.x;
  const cy = cam.y;

  // far mountains and the village (they move slower)
  ctx.fillStyle = "#4b1f55";
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + 20; sx += 20) {
    const wx = (sx / scale + cx * 0.12);
    ctx.lineTo(sx, H * 0.62 + Math.sin(wx / 190) * 46 + Math.sin(wx / 83) * 16 - cy * 0.04);
  }
  ctx.lineTo(W, H);
  ctx.fill();
  ctx.fillStyle = "#33143f";
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + 20; sx += 20) {
    const wx = (sx / scale + cx * 0.28);
    ctx.lineTo(sx, H * 0.7 + Math.sin(wx / 140 + 1) * 34 + Math.sin(wx / 57) * 10 - cy * 0.08);
  }
  ctx.lineTo(W, H);
  ctx.fill();
  drawVillage(ctx, W, H, cx, cy, scale);

  // the world
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  const x0 = cx - 40;
  const x1 = cx + W / scale + 40;
  // the ground
  ctx.beginPath();
  ctx.moveTo(x0, cy + H / scale + 200);
  for (let x = x0; x <= x1; x += 10) ctx.lineTo(x, ground(x));
  ctx.lineTo(x1, cy + H / scale + 200);
  ctx.closePath();
  const dirt = ctx.createLinearGradient(0, cy, 0, cy + H / scale);
  dirt.addColorStop(0, "#8a5a2b");
  dirt.addColorStop(1, "#3a1f12");
  ctx.fillStyle = dirt;
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#3da35a";
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 10) (x === x0 ? ctx.moveTo(x, ground(x) + 3) : ctx.lineTo(x, ground(x) + 3));
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#7fe08a";
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 10) (x === x0 ? ctx.moveTo(x, ground(x) - 2) : ctx.lineTo(x, ground(x) - 2));
  ctx.stroke();

  if (w) {
    for (const p of w.pickupsBetween(x0, x1)) {
      if (p.got) continue;
      const bob = Math.sin(t * 4 + p.index) * 4;
      if (p.kind === "coin") drawCoin(ctx, p.x, p.y + bob, p.value, t + p.index);
      else drawCan(ctx, p.x, p.y + bob);
    }
    drawJeep(ctx, w);
  } else {
    drawJeep(ctx, new HillWorld({ coinBig: 10, coinSmall: 5, coinGapM: 40, firstCoinM: 30 }));
  }
  ctx.restore();
  void PX_PER_M;
}

function drawVillage(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, scale: number) {
  const period = 1500;
  const par = 0.4;
  const base = H * 0.78 - cy * 0.1;
  ctx.fillStyle = "#220e2e";
  const start = Math.floor((cx * par) / period) - 1;
  for (let k = start; k < start + 4; k++) {
    const ox = (k * period - cx * par) * scale;
    if (ox > W + 300 || ox < -period * scale) continue;
    // banyan
    ctx.beginPath();
    ctx.arc(ox + 120, base - 70, 46, 0, Math.PI * 2);
    ctx.arc(ox + 80, base - 52, 32, 0, Math.PI * 2);
    ctx.arc(ox + 164, base - 54, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(ox + 116, base - 60, 9, 60);
    // temple
    ctx.fillRect(ox + 520, base - 56, 70, 56);
    ctx.beginPath();
    ctx.moveTo(ox + 508, base - 56);
    ctx.lineTo(ox + 555, base - 110);
    ctx.lineTo(ox + 602, base - 56);
    ctx.fill();
    // huts
    for (const hx of [820, 980, 1210]) {
      ctx.fillRect(ox + hx, base - 34, 56, 34);
      ctx.beginPath();
      ctx.moveTo(ox + hx - 8, base - 34);
      ctx.lineTo(ox + hx + 28, base - 70);
      ctx.lineTo(ox + hx + 64, base - 34);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,179,71,0.8)";
    ctx.fillRect(ox + 545, base - 30, 14, 24);
    ctx.fillRect(ox + 838, base - 24, 12, 14);
    ctx.fillRect(ox + 1228, base - 24, 12, 14);
    ctx.fillStyle = "#220e2e";
  }
  ctx.fillRect(0, base, W, H - base);
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, ph: number) {
  const sq = 0.35 + 0.65 * Math.abs(Math.cos(ph * 1.6));
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(255,226,110,0.25)";
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(sq, 1);
  const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, 18);
  g.addColorStop(0, "#fff6c2");
  g.addColorStop(0.55, "#f2c23c");
  g.addColorStop(1, "#b9852a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a5a12";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#6a3d00";
  ctx.font = "900 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(v), x, y + 5);
}

function drawCan(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#e5303a";
  ctx.strokeStyle = "#1a0b12";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-13, -16, 26, 32, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1a0b12";
  ctx.fillRect(-5, -22, 12, 7);
  ctx.fillStyle = "#fff";
  ctx.font = "900 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("⛽", 0, 6);
  ctx.restore();
}

function drawJeep(ctx: CanvasRenderingContext2D, w: HillWorld) {
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.rotate(w.angle);
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#1a0b12";
  // shadow
  // body
  ctx.fillStyle = "#ff8a3d";
  ctx.beginPath();
  ctx.roundRect(-50, -12, 100, 28, 9);
  ctx.fill();
  ctx.stroke();
  // hood and stripe
  ctx.fillStyle = "#d9501f";
  ctx.beginPath();
  ctx.roundRect(14, -22, 36, 14, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffe27a";
  ctx.fillRect(-46, -2, 92, 5);
  // roll bar
  ctx.strokeStyle = "#1a0b12";
  ctx.beginPath();
  ctx.moveTo(-26, -12);
  ctx.lineTo(-30, -36);
  ctx.lineTo(8, -36);
  ctx.lineTo(10, -12);
  ctx.stroke();
  // the driver: a face, a turban, a moustache
  ctx.fillStyle = "#f2c9a0";
  ctx.beginPath();
  ctx.arc(-6, -25, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#c2417a";
  ctx.beginPath();
  ctx.ellipse(-6, -33, 12.5, 7, 0, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(-16, -34, 20, 2.5);
  ctx.fillStyle = "#222";
  ctx.fillRect(-2, -27, 3, 3.5);
  ctx.fillRect(2, -21, 8, 2);
  // wheels
  for (const wx of [-36, 36]) {
    ctx.save();
    ctx.translate(wx, 16);
    ctx.rotate(w.wheelSpin);
    ctx.fillStyle = "#241621";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffd36e";
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a5a12";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos((i * Math.PI) / 2) * 7, Math.sin((i * Math.PI) / 2) * 7);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
