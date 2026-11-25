"use client";

/**
 * Your spend rewards and the server's gift catalog, shared by every screen.
 *
 * - The gift catalog (GET /api/v1/gifts) loads when the app opens and every
 *   few minutes, so a gift or price the admins change shows without a reload.
 * - Your Bag rewards (GET /api/v1/rewards/me) load on demand and again after
 *   each win (/user/queue/rewards) or wear / take off.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getGiftCatalog, getGiftCategories, getMyRewards, wearReward, type BagReward, type RewardGoal } from "@/lib/api/rewards";
import { setGiftCategories, setServerGifts, subscribeGifts } from "./data";

/* ---------------- gift catalog ---------------- */

let giftsVersion = 0;
subscribeGifts(() => {
  giftsVersion++;
});
let catalogLoading: Promise<void> | null = null;

export function loadGiftCatalog() {
  catalogLoading ??= Promise.all([getGiftCategories().catch(() => []), getGiftCatalog()])
    .then(([cats, list]) => {
      if (cats.length) setGiftCategories(cats);
      if (list.length) setServerGifts(list);
    })
    .catch(() => {
      /* keep the bundled list; tried again later */
    })
    .finally(() => {
      catalogLoading = null;
    });
  return catalogLoading;
}

/** Re-renders when the catalog changes; returns its version. */
export function useGiftsVersion() {
  return useSyncExternalStore(subscribeGifts, () => giftsVersion, () => 0);
}

/** Mounted once in the app shell. */
export function useGiftCatalogLoader() {
  useEffect(() => {
    void loadGiftCatalog();
    const t = window.setInterval(() => void loadGiftCatalog(), 5 * 60_000);
    const onFocus = () => document.visibilityState === "visible" && void loadGiftCatalog();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
}

/* ---------------- your rewards ---------------- */

type State = { rewards: BagReward[]; goals: RewardGoal[]; loaded: boolean; loading: boolean; error: string | null };
let state: State = { rewards: [], goals: [], loaded: false, loading: false, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

let loading: Promise<void> | null = null;
export function refreshRewards() {
  if (loading) return loading;
  set({ loading: true });
  loading = getMyRewards()
    .then((r) => set({ rewards: r.rewards, goals: r.goals, loaded: true, error: null }))
    .catch((e) => set({ error: e instanceof Error && e.message ? e.message : "Couldn't load your rewards." }))
    .finally(() => {
      set({ loading: false });
      loading = null;
    });
  return loading;
}

/** Signing out: forget them. */
export function clearRewards() {
  set({ rewards: [], goals: [], loaded: false, error: null });
}

export function useRewards() {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => {
    if (!state.loaded && !state.loading) void refreshRewards();
  }, []);
  const wear = useCallback(async (id: string, on: boolean) => {
    const r = await wearReward(id, on);
    // Wearing one takes off the other in the same slot: reload the whole Bag
    await refreshRewards();
    return r;
  }, []);
  return { ...s, refresh: refreshRewards, wear };
}

/** Gifts you can send from your Bag, by gift id. */
export function bagGiftCounts(rewards: BagReward[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rewards) if (r.itemType === "GIFT" && r.giftId && (r.remaining ?? 0) > 0) out[r.giftId] = (out[r.giftId] ?? 0) + (r.remaining ?? 0);
  return out;
}
