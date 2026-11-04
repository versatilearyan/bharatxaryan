"use client";

import { subscribe } from "@/lib/realtime/stomp";
import { serverRoomAppId, useServerRooms } from "./server-rooms";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { GIFTS, PEOPLE } from "./data";
import { ME_ID, useApp } from "./store";
import type { GiftId } from "./types";

/**
 * Server-wide gift news: when anyone sends Sunset Romance, Crystal Palace or
 * Storm Guardian (gifts marked `news`), a banner announces it across the
 * whole app with the sender's own message.
 */
export type GiftNews = { id: string; fromId: string; toId: string; giftId: GiftId; count: number; roomId: string; message: string; at: number; roomName?: string; serverRoomId?: string };

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

  // Server-wide: big gifts anyone sends, announced by the server to everyone in the app
  const { myId, rememberPeople } = useServerRooms();
  const seen = useRef(new Set<string>());
  useEffect(
    () =>
      subscribe("/topic/gift-news", (body) => {
        const b = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        if (!b || typeof b.giftId !== "string" || b.roomId == null) return;
        const ev = String(b.eventId ?? "");
        if (ev && seen.current.has(ev)) return;
        if (ev) seen.current.add(ev);
        const pid = (u: unknown) => (myId && String(u) === myId ? ME_ID : `srv-user:${String(u)}`);
        const fromId = pid(b.fromUserId);
        const toId = pid(b.toUserId);
        const people: Record<string, { name?: string; avatarUrl?: string }> = {};
        if (fromId !== ME_ID) people[fromId] = { name: typeof b.fromName === "string" ? b.fromName : undefined, avatarUrl: typeof b.fromAvatar === "string" ? b.fromAvatar : undefined };
        if (toId !== ME_ID) people[toId] = { name: typeof b.toName === "string" ? b.toName : undefined, avatarUrl: typeof b.toAvatar === "string" ? b.toAvatar : undefined };
        if (Object.keys(people).length) rememberPeople(people);
        const sid = String(b.roomId);
        announce({
          fromId,
          toId,
          giftId: b.giftId as GiftId,
          count: Number(b.count) || 1,
          roomId: serverRoomAppId(sid),
          serverRoomId: sid,
          roomName: typeof b.roomName === "string" ? b.roomName : undefined,
          message: typeof b.message === "string" ? b.message : "",
        });
      }),
    [myId, rememberPeople, announce],
  );

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
