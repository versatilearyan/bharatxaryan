"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { GIFTS, PEOPLE } from "./data";
import { ME_ID, useApp } from "./store";
import type { GiftId } from "./types";

/**
 * Server-wide gift news: when anyone sends Sunset Romance, Crystal Palace or
 * Storm Guardian (gifts marked `news`), a banner announces it across the
 * whole app with the sender's own message.
 */
export type GiftNews = { id: string; fromId: string; toId: string; giftId: GiftId; count: number; roomId: string; message: string; at: number };

/** Longest message you can put on the banner. */
export const GIFT_MESSAGE_MAX = 50;

const uid = () => Math.random().toString(36).slice(2, 10);
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

/** What other people write on their banners in the demo. */
const SIM_MESSAGES = [
  "Happy birthday meri jaan 🎂",
  "Tum ho toh mehfil hai ❤️",
  "For the best voice in Panchayat 🎤",
  "Sorry yaar, maan jao na 🙏",
  "Congrats on 1 year together 💍",
  "Sarpanch ki taraf se tohfa 👑",
  "",
  "Thanks for the late night gup-shup ☕",
];

function useGiftNewsState() {
  const { rooms, resetCount } = useApp();
  /** Waiting to be shown, oldest first. */
  const [queue, setQueue] = useState<GiftNews[]>([]);

  const firstReset = useRef(resetCount);
  useEffect(() => {
    if (resetCount === firstReset.current) return;
    setQueue([]);
  }, [resetCount]);

  const announce = useCallback((n: Omit<GiftNews, "id" | "at">) => {
    setQueue((q) => [...q, { ...n, message: n.message.trim().slice(0, GIFT_MESSAGE_MAX), id: uid(), at: Date.now() }]);
  }, []);
  const dismiss = useCallback((id: string) => setQueue((q) => q.filter((x) => x.id !== id)), []);

  // (No made-up gift announcements: only real gifts are announced.)

  return { news: queue[0], announce, dismiss };
}

export type GiftNewsState = ReturnType<typeof useGiftNewsState>;
const Ctx = createContext<GiftNewsState | null>(null);

export function GiftNewsProvider({ children }: { children: ReactNode }) {
  const state = useGiftNewsState();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useGiftNews() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGiftNews must be used inside <GiftNewsProvider>");
  return v;
}
