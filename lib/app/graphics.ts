"use client";

/**
 * Graphics quality, chosen per phone (Profile → Settings → Graphics):
 *  - "auto"   (default) the phone decides: the Android app, phones with little memory or few cores, Data Saver, and a
 *             battery under 20% that isn't charging get Smooth; everything else gets HD
 *  - "hd"     full effects, sharpest animations
 *  - "smooth" battery saver: decorative loops stop, no blur behind panels, gift animations drawn at fewer pixels
 * Smooth marks the page with data-lite (globals.css and the components read it). Gift animations, sheets and the
 * photo viewer stay animated in every mode; voice quality never depends on this.
 */
import { useSyncExternalStore } from "react";

export type GraphicsMode = "auto" | "hd" | "smooth";
const KEY = "panchayat.gfx.v1";

let mode: GraphicsMode = "auto";
let lowBattery = false;
let lite = false;
let started = false;
const listeners = new Set<() => void>();
let snap: { mode: GraphicsMode; lite: boolean } = { mode, lite };

function deviceIsWeak(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const ua = navigator.userAgent || "";
  const phone = /Android|iPhone|iPad|Mobile/i.test(ua);
  const native = /PanchayatApp[/]/.test(ua);
  const mem = n.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency || 8;
  return native || (phone && (mem <= 4 || cores <= 4)) || Boolean(n.connection?.saveData);
}

function apply() {
  lite = mode === "smooth" || (mode === "auto" && (deviceIsWeak() || lowBattery));
  const d = document.documentElement;
  if (lite) d.setAttribute("data-lite", "1");
  else d.removeAttribute("data-lite");
  d.setAttribute("data-gfx", lite ? "smooth" : "hd");
  snap = { mode, lite };
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    const v = localStorage.getItem(KEY);
    if (v === "hd" || v === "smooth" || v === "auto") mode = v;
  } catch {
    /* private mode */
  }
  apply();
  // Auto: a low battery that isn't charging switches to Smooth until it charges
  const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (t: string, f: () => void) => void }> };
  nav
    .getBattery?.()
    .then((b) => {
      const check = () => {
        const low = !b.charging && b.level <= 0.2;
        if (low !== lowBattery) {
          lowBattery = low;
          apply();
        }
      };
      check();
      b.addEventListener("levelchange", check);
      b.addEventListener("chargingchange", check);
    })
    .catch(() => undefined);
}

export function setGraphicsMode(m: GraphicsMode) {
  start();
  mode = m;
  try {
    localStorage.setItem(KEY, m);
  } catch {
    /* private mode */
  }
  apply();
}

/** Is the page in Smooth (battery saver) right now? Safe to call anywhere on the client. */
export function isLite(): boolean {
  start();
  return lite;
}

const SERVER_SNAP = { mode: "auto" as GraphicsMode, lite: false };

export function useGraphics(): { mode: GraphicsMode; lite: boolean } {
  start();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snap,
    () => SERVER_SNAP,
  );
}
