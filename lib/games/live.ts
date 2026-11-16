"use client";

/**
 * Real numbers for the Game Modes screens: how many people are playing each game right now (GET /api/v1/games/live),
 * and which games this phone opened recently. Nothing here is estimated or made up.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { readToken } from "@/lib/auth/token";
import type { GameId } from "@/lib/app/types";

const API_KEY: Partial<Record<GameId, string>> = { gaddar: "GADDAR", rmcs: "RMCS", ludo: "LUDO", jackaroo: "JACKAROO" };

export type LiveCounts = Partial<Record<GameId, number>>;

/** Refreshes every 20 seconds while the screen is open and the app is in front. */
export function useGameLive(): LiveCounts | null {
  const [live, setLive] = useState<LiveCounts | null>(null);
  useEffect(() => {
    let off = false;
    const load = () => {
      if (document.visibilityState !== "visible" || !readToken()) return;
      api<Record<string, unknown>>("/api/v1/games/live", { auth: true })
        .then((d) => {
          if (off || !d) return;
          const out: LiveCounts = {};
          (Object.keys(API_KEY) as GameId[]).forEach((id) => {
            const v = d[API_KEY[id]!];
            if (typeof v === "number") out[id] = v;
          });
          setLive(out);
        })
        .catch(() => undefined);
    };
    load();
    const i = window.setInterval(load, 20_000);
    return () => {
      off = true;
      window.clearInterval(i);
    };
  }, []);
  return live;
}

const RECENT_KEY = "panchayat.games.recent.v1";

export function readRecent(): GameId[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? (v.filter((x) => typeof x === "string") as GameId[]) : [];
  } catch {
    return [];
  }
}

export function rememberPlayed(id: GameId) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* no storage */
  }
}
