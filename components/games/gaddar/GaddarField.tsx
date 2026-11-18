"use client";

/**
 * The village, drawn on a canvas. The server owns the game; this draws what it says and walks your own villager at once
 * (the same speed and walls as the server), so the controls feel instant. Other people are smoothed toward the latest
 * position the server sent. Controls: a joystick (touch), W A S D or the arrow keys.
 * The still parts of the map (ground, buildings, trees) are drawn once into a picture and only copied each frame.
 */
import { useEffect, useRef } from "react";
import { publish } from "@/lib/realtime/stomp";
import { SUIT_COLORS, drawAcc, drawHat } from "./looks";
import { GADDAR_COLORS, gaddarMoveDest, type GaddarMap, type GaddarMe, type GaddarPlayer, type GaddarSnap, type GaddarTaskKind } from "@/lib/api/gaddar";

export type FieldControls = { work: boolean };
/** A puff of smoke where a gaddaar went into or came out of a vent. */
export type FieldEffect = { x: number; y: number; at: number; inVent: boolean };
export type Near = { task: boolean; taskId: number; taskKind: GaddarTaskKind | null; body: boolean; chaupal: boolean; victim: boolean; vent: boolean; fix: boolean };

type Props = {
  roomId: string;
  map: GaddarMap;
  myId: string;
  players: GaddarPlayer[];
  me: GaddarMe | undefined;
  snapRef: React.MutableRefObject<GaddarSnap | null>;
  controls: React.MutableRefObject<FieldControls>;
  /** The joystick writes its direction here (-1..1). */
  stick: React.MutableRefObject<{ x: number; y: number }>;
  effects: React.MutableRefObject<FieldEffect[]>;
  /** While a little kaam game is open the villager stands still. */
  frozen: boolean;
  /** Called a few times a second with what is near you, to light the buttons. */
  onNear: (n: Near) => void;
  /** Called once the village has been drawn (the loading screen waits for it). */
  onReady: () => void;
};

const VIEW_W = 760;
const LAYER = 1.5; // the still village is drawn once at this scale and then only copied
const KILL_RANGE = 85, REPORT_RANGE = 110, EMERGENCY_RANGE = 100, TASK_RANGE = 70, FIX_RANGE = 75, VENT_RANGE = 60;

/** Profile pictures, loaded once. null = not ready (or it failed): the character keeps a plain face. */
const PHOTOS = new Map<string, HTMLImageElement | "bad">();
function photoOf(url?: string): HTMLImageElement | null {
  if (!url) return null;
  const have = PHOTOS.get(url);
  if (have === "bad") return null;
  if (have) return have.complete && have.naturalWidth > 0 ? have : null;
  const img = new Image();
  img.referrerPolicy = "no-referrer";
  img.onerror = () => PHOTOS.set(url, "bad");
  img.src = url;
  PHOTOS.set(url, img);
  return null;
}

function blocked(map: GaddarMap, x: number, y: number) {
  const r = map.radius;
  if (x < r || y < r || x > map.w - r || y > map.h - r) return true;
  for (const w of map.walls) {
    const cx = Math.max(w.x, Math.min(x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(y, w.y + w.h));
    if (Math.hypot(x - cx, y - cy) < r) return true;
  }
  return false;
}

export function GaddarField({ roomId, map, myId, players, me, snapRef, controls, stick, effects, frozen, onNear, onReady }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ players, me, map, frozen });
  live.current = { players, me, map, frozen };
  const nearRef = useRef(onNear);
  nearRef.current = onNear;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const keys = new Set<string>();
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(k)) {
        const el = e.target as HTMLElement | null;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
        if (down) keys.add(k);
        else keys.delete(k);
        if (k === " ") controls.current.work = down;
        e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    // Positions: mine (predicted) and everyone else's (smoothed toward the server)
    const pos = new Map<string, { x: number; y: number; tx: number; ty: number; alive: boolean; moving: boolean; face: number }>();
    let mine = { x: map.meeting[0], y: map.meeting[1], init: false };
    let last = performance.now();
    let sentAt = 0;
    let sent = { dx: 0, dy: 0, work: false };
    let nearAt = 0;
    let raf = 0;
    let t = 0;
    // Lite phones run the village at about 30 frames a second (half the work, far less heat); others at the screen's rate
    const lite = document.documentElement.hasAttribute("data-lite");
    let drawnAt = 0;

    const resize = () => {
      // Layout size, not the on-screen box: the same when the page is turned sideways with CSS
      // Lite phones (and the Android app) draw at a lower resolution: much less work for the GPU, less heat
      const dpr = Math.min(lite ? 1.1 : 1.5, window.devicePixelRatio || 1);
      cv.width = Math.max(2, Math.round(cv.clientWidth * dpr));
      cv.height = Math.max(2, Math.round(cv.clientHeight * dpr));
    };
    // The still village (ground, buildings, trees) is drawn once; every frame only copies the part in view
    const layer = document.createElement("canvas");
    layer.width = Math.round(map.w * LAYER);
    layer.height = Math.round(map.h * LAYER);
    const lctx = layer.getContext("2d");
    if (lctx) {
      lctx.scale(LAYER, LAYER);
      drawStill(lctx, map);
    }
    window.setTimeout(() => readyRef.current(), 50);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (lite && now - drawnAt < 31) return;
      drawnAt = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const { players: plist, me: my, map: m, frozen: still } = live.current;
      const snap = snapRef.current;
      const meInfo = plist.find((p) => p.id === myId);
      const alive = my ? my.alive : meInfo?.alive !== false;
      const inVent = !!my?.vent;

      // Server positions
      if (snap) {
        for (const [id, x, y, a, mv] of snap.p) {
          const cur = pos.get(id);
          if (!cur) pos.set(id, { x, y, tx: x, ty: y, alive: a === 1, moving: mv === 1, face: 1 });
          else {
            cur.tx = x;
            cur.ty = y;
            cur.alive = a === 1;
            cur.moving = mv === 1;
          }
          if (id === myId && !mine.init) mine = { x, y, init: true };
        }
        // Someone gone from the picture (in a vent, or left): stop drawing them
        const present = new Set(snap.p.map((q) => q[0]));
        for (const id of [...pos.keys()]) if (!present.has(id) && id !== myId) pos.delete(id);
      }

      // My own walking, at once
      let dx = stick.current.x, dy = stick.current.y;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      if (controls.current.work || still || inVent) {
        dx = 0;
        dy = 0;
      }
      if (inVent && my?.vent) {
        mine = { x: my.vent.x, y: my.vent.y, init: true };
      } else if (mine.init) {
        const nx = mine.x + dx * m.speed * dt;
        const ny = mine.y + dy * m.speed * dt;
        if (!alive) {
          mine.x = Math.max(m.radius, Math.min(m.w - m.radius, nx));
          mine.y = Math.max(m.radius, Math.min(m.h - m.radius, ny));
        } else {
          if (!blocked(m, nx, mine.y)) mine.x = nx;
          if (!blocked(m, mine.x, ny)) mine.y = ny;
        }
        // Follow the server: a big difference (a meeting, a vent) snaps; a small one only when standing still
        const s = pos.get(myId);
        if (s) {
          const err = Math.hypot(s.tx - mine.x, s.ty - mine.y);
          if (err > 120) {
            mine.x = s.tx;
            mine.y = s.ty;
          } else if (dx === 0 && dy === 0 && err > 1) {
            const k = 1 - Math.exp(-dt * 8);
            mine.x += (s.tx - mine.x) * k;
            mine.y += (s.ty - mine.y) * k;
          }
        }
        if (dx !== 0) {
          const me2 = pos.get(myId);
          if (me2) me2.face = dx > 0 ? 1 : -1;
        }
      }

      // Tell the server (about 15 times a second while it changes, once a second otherwise)
      const wantWork = controls.current.work && !inVent;
      if (now - sentAt > 66 && (Math.abs(dx - sent.dx) > 0.02 || Math.abs(dy - sent.dy) > 0.02 || wantWork !== sent.work || now - sentAt > 1000)) {
        sentAt = now;
        sent = { dx, dy, work: wantWork };
        publish(gaddarMoveDest(roomId), { dx: Math.round(dx * 100) / 100, dy: Math.round(dy * 100) / 100, work: wantWork });
      }

      // Smooth the others
      for (const [id, p] of pos) {
        if (id === myId) {
          p.x = mine.x;
          p.y = mine.y;
          continue;
        }
        const k = 1 - Math.exp(-dt * 14);
        p.x += (p.tx - p.x) * k;
        p.y += (p.ty - p.y) * k;
        if (Math.abs(p.tx - p.x) > 1) p.face = p.tx > p.x ? 1 : -1;
      }

      // What is near me
      if (now - nearAt > 200 && mine.init) {
        nearAt = now;
        let taskId = 0;
        let taskKind: GaddarTaskKind | null = null;
        let best = TASK_RANGE;
        for (const tk of my?.tasks ?? []) {
          const d = Math.hypot(tk.x - mine.x, tk.y - mine.y);
          if (tk.p < 1 && d <= best) {
            best = d;
            taskId = tk.id;
            taskKind = tk.kind;
          }
        }
        const body = !!snap?.b.some((b) => Math.hypot(b[1] - mine.x, b[2] - mine.y) <= REPORT_RANGE);
        const chaupal = Math.hypot(m.meeting[0] - mine.x, m.meeting[1] - mine.y) <= EMERGENCY_RANGE;
        let victim = false;
        if (my?.role === "GADDAR" && !inVent) {
          for (const [id, p] of pos) {
            if (id !== myId && p.alive && !my.mates.includes(id) && Math.hypot(p.x - mine.x, p.y - mine.y) <= KILL_RANGE) victim = true;
          }
        }
        const nearVent = my?.role === "GADDAR" && !inVent && m.vents.some((v) => Math.hypot(v.x - mine.x, v.y - mine.y) <= VENT_RANGE);
        let fix = false;
        if (snap?.sb && my?.role !== "GADDAR" && alive) {
          const pts: [number, number][] = snap.sb[0] === "L" ? [m.lightFix] : m.reactor;
          fix = pts.some((q) => Math.hypot(q[0] - mine.x, q[1] - mine.y) <= FIX_RANGE);
        }
        nearRef.current({ task: taskId !== 0, taskId, taskKind, body, chaupal, victim, vent: !!nearVent, fix });
      }

      draw(ctx, cv, layer, m, plist, my, snap, pos, mine, myId, alive, inVent, effects.current, t);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      publish(gaddarMoveDest(roomId), { dx: 0, dy: 0, work: false });
    };
  }, [roomId, map, myId, snapRef, controls, stick, effects]);

  return <canvas ref={canvas} className="h-full w-full touch-none select-none" aria-label="Village" />;
}

/* ---------------- drawing ---------------- */

type PosMap = Map<string, { x: number; y: number; tx: number; ty: number; alive: boolean; moving: boolean; face: number }>;

function draw(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, layer: HTMLCanvasElement, m: GaddarMap, plist: GaddarPlayer[], my: GaddarMe | undefined, snap: GaddarSnap | null, pos: PosMap, mine: { x: number; y: number; init: boolean }, myId: string, alive: boolean, inVent: boolean, effects: FieldEffect[], t: number) {
  const W = cv.width, H = cv.height;
  // Show about 760 world pixels across, but never more than the map is tall (a tall phone zooms in a little)
  const scale = Math.max(W / VIEW_W, H / m.h);
  const viewW = W / scale;
  const viewH = H / scale;
  const camX = Math.max(0, Math.min(m.w - viewW, mine.x - viewW / 2));
  const camY = Math.max(0, Math.min(m.h - viewH, mine.y - viewH / 2));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#1c2a1c";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(layer, camX * LAYER, camY * LAYER, viewW * LAYER, viewH * LAYER, 0, 0, W, H);
  ctx.setTransform(scale, 0, 0, scale, -camX * scale, -camY * scale);

  const sab = snap?.sb;
  const lightsOut = sab?.[0] === "L";

  // The Sarpanch's bell at the baithak spot
  ctx.beginPath();
  ctx.arc(m.meeting[0], m.meeting[1], 16 + Math.sin(t * 3) * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "#e0b24a";
  ctx.fill();
  ctx.strokeStyle = "#7a5a10";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Vents (grates in the ground): everyone can see them
  for (const v of m.vents) {
    ctx.fillStyle = "#2a2a2e";
    ctx.beginPath();
    ctx.roundRect(v.x - 22, v.y - 14, 44, 28, 6);
    ctx.fill();
    ctx.strokeStyle = "#6d6d75";
    ctx.lineWidth = 2;
    for (let i = -14; i <= 14; i += 7) {
      ctx.beginPath();
      ctx.moveTo(v.x - 16, v.y + i / 2);
      ctx.lineTo(v.x + 16, v.y + i / 2);
      ctx.stroke();
    }
    if (inVent && my?.vent && my.vent.id === v.id) {
      ctx.strokeStyle = "#ff6b6b";
      ctx.lineWidth = 4;
      ctx.strokeRect(v.x - 26, v.y - 18, 52, 36);
    }
  }

  // Sabotage fix points
  if (sab) {
    const pts: [number, number, string][] = sab[0] === "L" ? [[m.lightFix[0], m.lightFix[1], "Bijli ka box"]] : [[m.reactor[0][0], m.reactor[0][1], "Pump 1"], [m.reactor[1][0], m.reactor[1][1], "Pump 2"]];
    for (const [x, y, label] of pts) {
      ctx.beginPath();
      ctx.arc(x, y, 30 + Math.sin(t * 6) * 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,60,60,0.35)";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ff4d4d";
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, x, y - 40);
      ctx.fillText(sab[0] === "L" ? "💡" : "💧", x, y + 6);
    }
  }

  // My tasks
  if (my) {
    for (const tk of my.tasks) {
      const done = tk.p >= 1;
      ctx.beginPath();
      ctx.arc(tk.x, tk.y, 26 + (done ? 0 : Math.sin(t * 4) * 3), 0, Math.PI * 2);
      ctx.fillStyle = done ? "rgba(61,200,110,0.35)" : "rgba(255,214,64,0.35)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = done ? "#3dc86e" : "#ffd640";
      ctx.stroke();
      ctx.fillStyle = done ? "#3dc86e" : "#ffd640";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(done ? "✓" : "!", tk.x, tk.y + 8);
      if (!done && tk.p > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(tk.x - 30, tk.y + 34, 60, 8);
        ctx.fillStyle = "#ffd640";
        ctx.fillRect(tk.x - 30, tk.y + 34, 60 * tk.p, 8);
      }
      if (Math.hypot(tk.x - mine.x, tk.y - mine.y) < 160) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(tk.name, tk.x, tk.y - 36);
      }
    }
  }

  // Bodies (laash)
  for (const b of snap?.b ?? []) {
    const info = plist.find((p) => p.id === b[0]);
    ctx.save();
    ctx.translate(b[1], b[2]);
    ctx.rotate(-0.4);
    ctx.fillStyle = GADDAR_COLORS[(info?.color ?? 0) % GADDAR_COLORS.length];
    ctx.beginPath();
    ctx.ellipse(0, 6, 22, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2c9a0";
    ctx.beginPath();
    ctx.arc(-18, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-23, -4);
    ctx.lineTo(-17, 2);
    ctx.moveTo(-17, -4);
    ctx.lineTo(-23, 2);
    ctx.stroke();
    ctx.restore();
  }

  // People, back to front
  const isGaddar = my?.role === "GADDAR";
  const vision = isGaddar ? 340 : lightsOut ? 85 : 260;
  const list = [...pos.entries()]
    .map(([id, p]) => ({ id, p, info: plist.find((q) => q.id === id) }))
    .filter((e) => e.info && !e.info.gone)
    .sort((a, b) => a.p.y - b.p.y);
  for (const { id, p, info } of list) {
    const isMe = id === myId;
    const ghost = !p.alive;
    if (inVent && isMe) continue;
    if (ghost && alive) continue; // the living can't see ghosts
    if (!isMe && alive && Math.hypot(p.x - mine.x, p.y - mine.y) > vision + 30) continue;
    drawVillager(ctx, p.x, p.y, GADDAR_COLORS[info!.color % GADDAR_COLORS.length], p.face, p.moving, t, ghost, info!.name, isMe, my?.mates.includes(id) ?? false, photoOf(info!.avatarUrl), info!.hat ?? 0, info!.suit ?? 0, info!.acc ?? 0);
  }

  // Puffs where a gaddaar went into or came out of a vent
  const nowMs = Date.now();
  for (const e of effects) {
    const age = (nowMs - e.at) / 1000;
    if (age > 1.6) continue;
    ctx.globalAlpha = Math.max(0, 1 - age / 1.6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + age;
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * (10 + age * 28), e.y + Math.sin(a) * (10 + age * 20) - age * 14, 8 + age * 6, 0, Math.PI * 2);
      ctx.fillStyle = "#c9c9d1";
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  while (effects.length && nowMs - effects[0].at > 2000) effects.shift();

  // Fireflies drifting about (cheap: a few dots)
  if (!lightsOut) {
    for (let i = 0; i < 16; i++) {
      const fx = camX + ((i * 197 + t * (6 + (i % 4) * 3) * 10) % viewW);
      const fy = camY + ((i * 113 + Math.sin(t * 0.7 + i) * 40 + 400) % viewH);
      const a = 0.35 + 0.35 * Math.sin(t * 2.2 + i * 1.7);
      ctx.fillStyle = `rgba(255,235,150,${a * 0.35})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,250,200,${a})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Fog: the living only see a little way (the traitors a bit further); in a vent the place is dimmed
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (inVent) {
    ctx.fillStyle = "rgba(10,12,24,0.72)";
    ctx.fillRect(0, 0, W, H);
  } else if (alive) {
    const cx = (mine.x - camX) * scale, cy = (mine.y - camY) * scale, r = vision * scale;
    const g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
    g.addColorStop(0, "rgba(8,10,20,0)");
    g.addColorStop(1, lightsOut && !isGaddar ? "rgba(2,3,10,0.97)" : "rgba(8,10,20,0.86)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = "rgba(60,70,120,0.16)";
    ctx.fillRect(0, 0, W, H);
  }
  // A soft dark edge so the middle of the screen stands out
  {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(10,4,24,0)");
    vg.addColorStop(1, "rgba(10,4,24,0.4)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  // A red edge while something is being sabotaged
  if (sab) {
    const a = 0.12 + 0.1 * Math.sin(t * 6);
    const g2 = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    g2.addColorStop(0, "rgba(255,0,0,0)");
    g2.addColorStop(1, `rgba(255,30,30,${a + 0.25})`);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  }
}

export function drawVillager(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, face: number, moving: boolean, t: number, ghost: boolean, name: string, isMe: boolean, mate: boolean, photo: HTMLImageElement | null, hat = 0, suit = 0, acc = 0) {
  ctx.save();
  ctx.globalAlpha = ghost ? 0.5 : 1;
  const bob = moving ? Math.sin(t * 14) * 2.5 : 0;
  ctx.translate(x, y + bob);
  ctx.lineJoin = "round";
  // shadow and a soft glow in the player's colour
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 21, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (isMe) {
    ctx.fillStyle = `${color}33`;
    ctx.beginPath();
    ctx.ellipse(0, 20, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // legs
  ctx.fillStyle = "#2a1a12";
  const step = moving ? Math.sin(t * 14) * 4 : 0;
  ctx.fillRect(-9, 10, 7, 12 + step);
  ctx.fillRect(2, 10, 7, 12 - step);
  // kurta
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = "rgba(20,8,30,0.85)";
  ctx.fillStyle = SUIT_COLORS[suit] ?? color;
  ctx.beginPath();
  ctx.roundRect(-16, -12, 32, 31, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(-2, -12, 4, 31);
  // round, 3D-looking body: light from the top left, shade on the lower right
  const sh = ctx.createLinearGradient(-16, -12, 16, 19);
  sh.addColorStop(0, "rgba(255,255,255,0.22)");
  sh.addColorStop(0.55, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.roundRect(-16, -12, 32, 31, 11);
  ctx.fill();
  // head: the player's own picture when there is one
  ctx.beginPath();
  ctx.arc(0, -19, 13, 0, Math.PI * 2);
  ctx.fillStyle = "#f2c9a0";
  ctx.fill();
  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -19, 12, 0, Math.PI * 2);
    ctx.clip();
    const s2 = Math.max(photo.naturalWidth, photo.naturalHeight) ? 24 / Math.min(photo.naturalWidth, photo.naturalHeight) : 1;
    const w2 = photo.naturalWidth * s2, h2 = photo.naturalHeight * s2;
    ctx.drawImage(photo, -w2 / 2, -19 - h2 / 2, w2, h2);
    ctx.restore();
  } else {
    ctx.fillStyle = "#222";
    ctx.fillRect(face > 0 ? 1 : -7, -22, 3, 4.5);
    ctx.fillRect(face > 0 ? 6 : -2, -22, 3, 4.5);
  }
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = "rgba(20,8,30,0.85)";
  ctx.beginPath();
  ctx.arc(0, -19, 13, 0, Math.PI * 2);
  ctx.stroke();
  drawAcc(ctx, acc);
  drawHat(ctx, hat, color);
  ctx.restore();
  // name tag: a little glass pill
  ctx.save();
  ctx.globalAlpha = ghost ? 0.6 : 1;
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  const label = name.length > 12 ? `${name.slice(0, 11)}…` : name;
  const w3 = ctx.measureText(label).width + 16;
  ctx.fillStyle = mate ? "rgba(190,18,40,0.85)" : "rgba(14,8,30,0.62)";
  ctx.beginPath();
  ctx.roundRect(x - w3 / 2, y - 62, w3, 17, 8.5);
  ctx.fill();
  ctx.strokeStyle = isMe ? "#ffe08a" : "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = isMe ? "#ffe08a" : "#fff";
  ctx.fillText(label, x, y - 49.5);
  ctx.restore();
}

/** The parts of the map that never move: ground, paths, floors, buildings, trees and furniture. */
function drawStill(ctx: CanvasRenderingContext2D, m: GaddarMap) {
  ctx.fillStyle = m.ground;
  ctx.fillRect(0, 0, m.w, m.h);
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  for (let gx = 0; gx < m.w; gx += 80) for (let gy = 0; gy < m.h; gy += 80) if (((gx + gy) / 80) % 2 === 0) ctx.fillRect(gx, gy, 80, 80);
  for (const d of m.decor) {
    if (d.t === "rect") {
      ctx.fillStyle = d.c;
      ctx.fillRect(d.x, d.y, d.w, d.h);
    } else if (d.t === "circle") {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.w, 0, Math.PI * 2);
      ctx.fillStyle = d.c;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.stroke();
    } else if (d.text) {
      ctx.fillStyle = d.c;
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.text, d.x, d.y);
    }
  }
  for (const w of m.walls) drawWall(ctx, w);
}

const BUILDING: Record<string, [string, string]> = {
  haveli: ["#c2674a", "#7a2f22"],
  mandir: ["#f1e3c8", "#e0782b"],
  mandi: ["#d9a441", "#9c6a1b"],
  ghar: ["#5b7aa3", "#33496b"],
  tent: ["#e8b84a", "#c0392b"],
  halwai: ["#f4d79b", "#b85c1c"],
  circus: ["#d94a4a", "#6b1f1f"],
  chai: ["#8d6e63", "#4e342e"],
};

function drawWall(ctx: CanvasRenderingContext2D, w: GaddarMap["walls"][number]) {
  const k = w.kind;
  const b = BUILDING[k];
  // 2.5D: everything has a soft cast shadow, and boxes get a darker front face so they look like solid blocks
  const round = k === "tree" || k === "kuan" || k === "fountain" || k === "wheel";
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  if (round) ctx.ellipse(w.x + w.w / 2 + 8, w.y + w.h / 2 + 14, w.w * 0.6, w.h * 0.5, 0, 0, Math.PI * 2);
  else ctx.roundRect(w.x + 10, w.y + 14, w.w, w.h, 6);
  ctx.fill();
  if (!round && k !== "wall") {
    const depth = b ? 22 : k === "pillar" ? 18 : 12;
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(w.x, w.y + w.h, w.w, depth);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(w.x, w.y + w.h, w.w, 3);
  } else if (k === "wall") {
    ctx.fillStyle = "#241b15";
    ctx.fillRect(w.x, w.y + w.h, w.w, 10);
  }
  ctx.restore();
  if (b) {
    ctx.fillStyle = b[0];
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = b[1];
    ctx.fillRect(w.x - 8, w.y - 8, w.w + 16, 34);
    if (k === "mandir") {
      ctx.beginPath();
      ctx.moveTo(w.x + w.w / 2 - 50, w.y - 8);
      ctx.lineTo(w.x + w.w / 2, w.y - 60);
      ctx.lineTo(w.x + w.w / 2 + 50, w.y - 8);
      ctx.fillStyle = "#e0782b";
      ctx.fill();
    }
    if (k === "tent" || k === "circus") {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < w.w; i += 40) ctx.fillRect(w.x + i, w.y, 20, w.h);
    }
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(w.x + w.w / 2 - 24, w.y + w.h - 62, 48, 62);
    if (w.label) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(w.label, w.x + w.w / 2, w.y + 56);
    }
    return;
  }
  switch (k) {
    case "tree":
      ctx.fillStyle = "#5b3a1e";
      ctx.fillRect(w.x + w.w / 2 - 6, w.y + w.h / 2, 12, w.h / 2);
      ctx.beginPath();
      ctx.arc(w.x + w.w / 2, w.y + w.h / 2.4, w.w * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = "#2c6a2e";
      ctx.fill();
      break;
    case "kuan":
      ctx.beginPath();
      ctx.arc(w.x + w.w / 2, w.y + w.h / 2, w.w / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#8c8f96";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w.x + w.w / 2, w.y + w.h / 2, w.w / 2 - 10, 0, Math.PI * 2);
      ctx.fillStyle = "#2b6db3";
      ctx.fill();
      break;
    case "fountain":
      ctx.beginPath();
      ctx.arc(w.x + w.w / 2, w.y + w.h / 2, w.w / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#cfd3d8";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w.x + w.w / 2, w.y + w.h / 2, w.w / 2 - 9, 0, Math.PI * 2);
      ctx.fillStyle = "#4aa3e0";
      ctx.fill();
      break;
    case "wheel": {
      const cx = w.x + w.w / 2, cy = w.y + w.h / 2, r = w.w / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#e0a93a";
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#8a4b12";
      ctx.stroke();
      ctx.lineWidth = 5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 11, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? "#d94a4a" : "#2e7dd9";
        ctx.fill();
      }
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(w.label ?? "", cx, cy + 6);
      break;
    }
    case "pillar":
      ctx.fillStyle = "#e8dcc4";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = "#8a7a5a";
      ctx.lineWidth = 3;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      break;
    case "stall":
      ctx.fillStyle = "#b0603a";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = "#e8c34a";
      for (let i = 0; i < w.w; i += 22) ctx.fillRect(w.x + i, w.y, 11, 18);
      ctx.fillStyle = "#d94a4a";
      for (let i = 11; i < w.w; i += 22) ctx.fillRect(w.x + i, w.y, 11, 18);
      break;
    case "wall":
      ctx.fillStyle = "#3b2f26";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(w.x, w.y, w.w, Math.min(5, w.h));
      break;
    default: {
      const col: Record<string, string> = { table: "#7a5230", chulha: "#444", box: "#a1785a", bed: "#9b3d5a", sofa: "#5c4a8a", chest: "#8a5a1a", altar: "#e0a93a", hay: "#d9c15a" };
      ctx.fillStyle = col[k] ?? "#777";
      ctx.beginPath();
      ctx.roundRect(w.x, w.y, w.w, w.h, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 3;
      ctx.stroke();
      if (k === "chulha") {
        ctx.fillStyle = "#ff7a1a";
        ctx.beginPath();
        ctx.arc(w.x + w.w / 2, w.y + w.h / 2, w.w / 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
