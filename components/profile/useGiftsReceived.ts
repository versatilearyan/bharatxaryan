"use client";

/**
 * Real gifts received, from GET /api/v1/gifts/received/{userId|me}.
 * For "me" (signed in) and server users ("srv-user:<id>"); null for demo people,
 * who keep the sample wall.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { readToken } from "@/lib/auth/token";
import { SERVER_USER_PREFIX } from "@/lib/app/server-rooms";
import type { GiftId } from "@/lib/app/types";

export type RecentGift = { id: string; fromUserId: string; fromName: string; fromAvatarUrl?: string; giftId: string; count: number; coins: number; charm: number; roomName?: string; at: string };
export type GiftsReceived = { totalGifts: number; totalCoins: number; gifts: Partial<Record<GiftId, number>>; topSenders: { userId: string; name: string; avatarUrl?: string; coins: number }[]; recent: RecentGift[] };

const cache = new Map<string, { at: number; data: GiftsReceived }>();

function whoOf(personId: string): string | null {
  if (personId === "me") return readToken() ? "me" : null;
  if (personId.startsWith(SERVER_USER_PREFIX)) return personId.slice(SERVER_USER_PREFIX.length);
  return null;
}

export function useGiftsReceived(personId: string): GiftsReceived | null {
  const who = whoOf(personId);
  const [data, setData] = useState<GiftsReceived | null>(() => (who ? (cache.get(who)?.data ?? null) : null));
  useEffect(() => {
    if (!who) {
      setData(null);
      return;
    }
    const hit = cache.get(who);
    if (hit) setData(hit.data);
    if (hit && Date.now() - hit.at < 30_000) return;
    let live = true;
    api<Record<string, unknown>>(`/api/v1/gifts/received/${encodeURIComponent(who)}`, { auth: true })
      .then((d) => {
        const g = d && typeof d.gifts === "object" && d.gifts ? (d.gifts as Record<string, number>) : {};
        const out: GiftsReceived = {
          totalGifts: typeof d?.totalGifts === "number" ? d.totalGifts : 0,
          totalCoins: typeof d?.totalCoins === "number" ? d.totalCoins : 0,
          gifts: g as Partial<Record<GiftId, number>>,
          topSenders: Array.isArray(d?.topSenders) ? (d.topSenders as GiftsReceived["topSenders"]) : [],
          recent: Array.isArray(d?.recent) ? (d.recent as RecentGift[]) : [],
        };
        cache.set(who, { at: Date.now(), data: out });
        if (live) setData(out);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [who]);
  return data;
}
