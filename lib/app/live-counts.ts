"use client";

/**
 * How many people are in each backend room right now (GET /api/v1/voice-rooms/live-counts),
 * shared by every room card and refreshed every 15 s while something shows it.
 */
import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api/client";
import { readToken } from "@/lib/auth/token";

let counts: Record<string, number> | null = null;
let onMic: Record<string, number> = {};
const listeners = new Set<() => void>();
let timer: number | undefined;
let users = 0;

async function load() {
  if (!readToken()) return;
  try {
    const [c, m] = await Promise.all([
      api<Record<string, number>>("/api/v1/voice-rooms/live-counts", { auth: true }),
      api<Record<string, number>>("/api/v1/voice-rooms/on-mic-counts", { auth: true }).catch(() => ({})),
    ]);
    counts = c ?? {};
    onMic = (m as Record<string, number>) ?? {};
    listeners.forEach((l) => l());
  } catch {
    /* keep the last numbers */
  }
}

/** People in each room (room server id → count); null until the first answer. */
export function useLiveCounts(): Record<string, number> | null {
  useEffect(() => {
    users++;
    if (users === 1) {
      void load();
      timer = window.setInterval(() => void load(), 15_000);
    }
    return () => {
      users--;
      if (users === 0) window.clearInterval(timer);
    };
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => counts,
    () => null,
  );
}

/** Game table rooms ("…'s Ludo table") are live only while someone is in them. */
export const isGameTable = (name: string) => / (Ludo|Jackaroo) table$/.test(name);

/** People on a seat (talking) in a room, from the last load. */
export const onMicIn = (roomId: string) => onMic[roomId] ?? 0;
