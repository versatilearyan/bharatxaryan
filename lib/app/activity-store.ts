"use client";

/**
 * Notifications for signed-in people: likes and comments on your Moments and replies to your comments,
 * from GET /api/v1/moments/activity. One shared copy for the bell and the sheet; refreshed every minute
 * while the app is in front. What counts as "new" is anything after the time you last opened the list (this phone).
 */
import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api/client";
import { readToken } from "@/lib/auth/token";

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
let seenAt = 0;
let loading = false;
let lastLoad = 0;
let users = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();
let snap: { items: Activity[] | null; seenAt: number } = { items, seenAt };
const emit = () => {
  snap = { items, seenAt };
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
  api<Activity[]>("/api/v1/moments/activity?limit=40", { auth: true })
    .then((d) => {
      items = Array.isArray(d) ? d : [];
      emit();
    })
    .catch(() => undefined)
    .finally(() => {
      loading = false;
    });
}

/** Everything up to now counts as seen. */
export function markActivitySeen() {
  seenAt = Math.max(Date.now(), ...(items ?? []).map((a) => a.at));
  try {
    localStorage.setItem(SEEN_KEY, String(seenAt));
  } catch {
    /* private mode */
  }
  emit();
}

export function useActivity(): { items: Activity[] | null; seenAt: number; fresh: number } {
  useEffect(() => {
    if (users++ === 0) {
      readSeen();
      emit();
      refreshActivity(true);
      timer = window.setInterval(() => refreshActivity(), 60_000);
    }
    return () => {
      if (--users === 0 && timer) window.clearInterval(timer);
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
  return { items: s.items, seenAt: s.seenAt, fresh: (s.items ?? []).filter((a) => a.at > s.seenAt).length };
}
