"use client";

/**
 * Graphics quality (Profile → Settings → Graphics). The look (colours, contrast, animations) stays the same in Auto
 * and HD; only Smooth, chosen by the person, changes anything.
 *  - "auto"   (default) as before: the Android app and phones with little memory or few cores get the light page
 *             (data-lite: no blur behind panels, gift animations drawn at fewer pixels) so nothing lags
 *  - "hd"     full effects everywhere, even on weaker phones
 *  - "smooth" battery saver, by choice: data-lite plus data-calm (decorative moving loops stop; gifts, sheets and
 *             the photo viewer still animate)
 * Voice quality never depends on this.
 */
import { useSyncExternalStore } from "react";

export type GraphicsMode = "auto" | "hd" | "smooth";
const KEY = "panchayat.gfx.v1";

let mode: GraphicsMode = "auto";
let lite = false;
let calm = false;
let started = false;
const listeners = new Set<() => void>();
let snap: { mode: GraphicsMode; lite: boolean; calm: boolean } = { mode, lite, calm };
const SERVER_SNAP = { mode: "auto" as GraphicsMode, lite: false, calm: false };

function deviceIsWeak(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number };
  const ua = navigator.userAgent || "";
  const phone = /Android|iPhone|iPad|Mobile/i.test(ua);
  const native = /PanchayatApp[/]/.test(ua);
  const mem = n.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency || 8;
  return native || (phone && (mem <= 4 || cores <= 4));
}

function apply() {
  calm = mode === "smooth";
  lite = calm || (mode === "auto" && deviceIsWeak());
  const d = document.documentElement;
  if (lite) d.setAttribute("data-lite", "1");
  else d.removeAttribute("data-lite");
  if (calm) d.setAttribute("data-calm", "1");
  else d.removeAttribute("data-calm");
  snap = { mode, lite, calm };
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

/** The light page (weaker phones in Auto, or Smooth): fewer pixels for big animations. */
export function isLite(): boolean {
  start();
  return lite;
}

/** Smooth, chosen by the person: decorative loops stop. */
export function isCalm(): boolean {
  start();
  return calm;
}

export function useGraphics(): { mode: GraphicsMode; lite: boolean; calm: boolean } {
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
