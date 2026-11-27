"use client";

/**
 * Notifications for signed-in people: likes and comments on your Moments and replies to your comments,
 * from GET /api/v1/moments/activity. One shared copy for the bell and the sheet; refreshed every minute
 * while the app is in front. What counts as "new" is anything after the time you last opened the list (this phone).
 */
import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api/client";
import { readToken } from "@/lib/auth/token";
import { friendsApi, type FriendRequests } from "@/lib/api/social";
import { subscribe } from "@/lib/realtime/stomp";

export type Activity = {
  kind: "LIKE" | "COMMENT" | "REPLY";
  at: number;
  momentId: string;
  user: { userId: string; name: string; avatarUrl?: string };
  text?: string;
  momentBody?: string;
  thumb?: string;
  thumbType?: "IMAGE" | "VIDEO";
};

const SEEN_KEY = "panchayat.notify.seen.v1";

let items: Activity[] | null = null;
/** Friend requests: who asked you, and who accepted yours lately. */
let friends: FriendRequests | null = null;
let seenAt = 0;
let loading = false;
let lastLoad = 0;
let users = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();
let snap: { items: Activity[] | null; seenAt: number; friends: FriendRequests | null } = { items, seenAt, friends };
const emit = () => {
  snap = { items, seenAt, friends };
  listeners.forEach((l) => l());
};

function readSeen() {
  try {
    seenAt = Number(localStorage.getItem(SEEN_KEY) ?? 0) || 0;
  } catch {
    seenAt = 0;
  }
}

export function refreshActivity(force = false) {
  if (loading || !readToken()) return;
  if (!force && Date.now() - lastLoad < 20_000) return;
  if (typeof document !== "undefined" && document.visibilityState !== "visible" && !force) return;
  loading = true;
  lastLoad = Date.now();
  Promise.allSettled([
    api<Activity[]>("/api/v1/moments/activity?limit=40", { auth: true }).then((d) => {
      items = Array.isArray(d) ? d : [];
    }),
    friendsApi.requests().then((r) => {
      friends = r;
    }),
  ])
    .then(() => emit())
    .finally(() => {
      loading = false;
    });
}

/** Everything up to now counts as seen. */
export function markActivitySeen() {
  seenAt = Math.max(Date.now(), ...(items ?? []).map((a) => a.at), ...(friends?.incoming ?? []).map((a) => a.at), ...(friends?.accepted ?? []).map((a) => a.at));
  try {
    localStorage.setItem(SEEN_KEY, String(seenAt));
  } catch {
    /* private mode */
  }
  emit();
}

let unsub: (() => void) | undefined;

export function useActivity(): { items: Activity[] | null; seenAt: number; fresh: number; friends: FriendRequests | null; freshFriends: number } {
  useEffect(() => {
    if (users++ === 0) {
      readSeen();
      emit();
      refreshActivity(true);
      timer = window.setInterval(() => refreshActivity(), 60_000);
      // A friend request or an accept arrives live: refresh at once
      unsub = subscribe("/user/queue/notify", (body) => {
        const b = body && typeof body === "object" ? (body as { type?: unknown }) : null;
        if (b?.type === "FOLLOWED" || b?.type === "FRIEND_NEW") refreshActivity(true);
      });
    }
    return () => {
      if (--users === 0) {
        if (timer) window.clearInterval(timer);
        unsub?.();
      }
    };
  }, []);
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snap,
    () => snap,
  );
  const freshFriends = (s.friends?.incoming ?? []).filter((a) => a.at > s.seenAt).length + (s.friends?.accepted ?? []).filter((a) => a.at > s.seenAt).length;
  return { items: s.items, seenAt: s.seenAt, friends: s.friends, freshFriends, fresh: (s.items ?? []).filter((a) => a.at > s.seenAt).length + freshFriends };
}
