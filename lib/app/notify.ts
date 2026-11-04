"use client";

/**
 * Sound and vibration for notifications (chat messages, seat invites, …),
 * with the person's own on/off choices kept on this device.
 *
 *   notify("message")   a short soft pop
 *   notify("invite")    a two-note chime, longer buzz
 *
 * Sounds are made with Web Audio (no files to download). Browsers only allow
 * sound after the person has touched the page once, so the first ping after a
 * fresh load may be silent; vibration works on Android, not on iPhone.
 */
import { useSyncExternalStore } from "react";

export type NotifyPrefs = { sound: boolean; vibrate: boolean };
export type NotifyKind = "message" | "invite" | "alert";

const KEY = "panchayat.notify.v1";
const DEFAULTS: NotifyPrefs = { sound: true, vibrate: true };
let prefs: NotifyPrefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<NotifyPrefs>;
      prefs = { sound: p.sound !== false, vibrate: p.vibrate !== false };
    }
  } catch {
    /* private mode: keep the defaults */
  }
}

export function getNotifyPrefs(): NotifyPrefs {
  load();
  return prefs;
}

export function setNotifyPrefs(next: Partial<NotifyPrefs>) {
  load();
  prefs = { ...prefs, ...next };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useNotifyPrefs(): NotifyPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getNotifyPrefs,
    () => DEFAULTS,
  );
}

let ctx: AudioContext | null = null;
let last = 0;

function tone(at: number, freq: number, dur: number, vol: number) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** Plays the sound and/or buzz for a notification, as the person's settings allow. */
export function notify(kind: NotifyKind = "message") {
  if (typeof window === "undefined") return;
  const p = getNotifyPrefs();
  const now = Date.now();
  // A burst of messages makes one sound, not ten
  if (kind === "message" && now - last < 900) return;
  last = now;

  if (p.vibrate) {
    try {
      navigator.vibrate?.(kind === "invite" ? [120, 80, 120] : kind === "alert" ? [200] : [40]);
    } catch {
      /* not supported */
    }
  }
  if (!p.sound) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime + 0.01;
    if (kind === "invite") {
      tone(t, 784, 0.22, 0.18);
      tone(t + 0.16, 1175, 0.32, 0.16);
    } else if (kind === "alert") {
      tone(t, 660, 0.25, 0.18);
    } else {
      tone(t, 880, 0.12, 0.12);
    }
  } catch {
    /* audio blocked */
  }
}
