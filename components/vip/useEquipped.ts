"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { equipErrorText, getCosmeticInventory, getEquippedCosmetics, takeOffCosmetic, wearCosmetic, type EquippedCosmetic, type OwnedCosmetic } from "@/lib/api/vip-equipment";
import { readToken } from "@/lib/auth/token";
import { emitSync, onSync } from "@/lib/app/sync";

/**
 * Your VIP cosmetics, shared by every screen that shows them (Bag, VIP page),
 * so they always agree: what you own (GET /vip/cosmetics/inventory, which also
 * lets the backend unlock what your VIP covers) and what you're wearing
 * (GET /vip/cosmetics/equipped), kept separate.
 *
 * Loading: the inventory first, then, only if that worked, the equipped list.
 * A failure stops there and offers Retry; there are no automatic retries. A
 * 401 goes through the app's normal sign-out. Only the newest load's answers
 * are used, so a slow older answer can never bring back something you took off.
 *
 * Wear / take off: POST / DELETE /vip/cosmetics/{id}/wear (the backend checks
 * VIP and inventory). After the backend accepts it:
 * - take off: the item leaves the equipped list at once;
 * - then the inventory and equipped list load again, and "my-cosmetics" is
 *   sent so GET /users/me, the room you're in and your public profile refetch.
 * Nothing is worn automatically.
 */
type State = {
  owned: OwnedCosmetic[] | null;
  items: EquippedCosmetic[] | null;
  loading: boolean;
  error: string;
  busyId: string | null;
  actionError: string;
};
const EMPTY: State = { owned: null, items: null, loading: false, error: "", busyId: null, actionError: "" };

let state: State = EMPTY;
/** Whose data this is (the end of the token), so another sign-in never sees it. */
let owner = "";
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => state;
const serverSnapshot = () => EMPTY;

const tokenTail = () => readToken()?.accessToken.slice(-16) ?? "";
const checkOwner = () => {
  const t = tokenTail();
  if (t !== owner) {
    owner = t;
    seq++;
    current = null;
    state = EMPTY;
  }
};

/** Bumped by every load and every accepted change: answers from an older load are dropped. */
let seq = 0;
/** The load running now, shared by screens that ask while it runs (until a change makes it out of date). */
let current: { seq: number; promise: Promise<void> } | null = null;

function load(): Promise<void> {
  checkOwner();
  if (current && current.seq === seq) return current.promise;
  const mine = ++seq;
  set({ loading: true, error: "" });
  const promise = (async () => {
    try {
      const inv = await getCosmeticInventory();
      if (mine !== seq) return;
      set({ owned: inv });
      const worn = await getEquippedCosmetics();
      if (mine !== seq) return;
      set({ items: worn, loading: false });
    } catch (e) {
      if (mine !== seq) return;
      set({ loading: false, error: `Couldn't load your VIP cosmetics. ${equipErrorText(e, "load")}` });
    } finally {
      if (current?.seq === mine) current = null;
    }
  })();
  current = { seq: mine, promise };
  return promise;
}

async function change(cosmeticId: string, wear: boolean) {
  if (state.busyId) return;
  set({ busyId: cosmeticId, actionError: "" });
  try {
    await (wear ? wearCosmetic(cosmeticId) : takeOffCosmetic(cosmeticId));
  } catch (e) {
    set({ busyId: null, actionError: equipErrorText(e, wear ? "wear" : "remove") });
    return;
  }
  // Accepted: anything loaded before this is out of date
  seq++;
  current = null;
  set({ busyId: null, ...(wear ? {} : { items: state.items?.filter((c) => c.cosmeticId !== cosmeticId) ?? null }) });
  emitSync("my-cosmetics");
}

// Every "my-cosmetics" change reloads the inventory and the equipped list once (all screens share it)
let wired = false;
const wire = () => {
  if (wired) return;
  wired = true;
  onSync(["my-cosmetics"], () => {
    if (listeners.size) void load();
  });
};

export function useEquipped(enabled: boolean) {
  const signedIn = enabled && Boolean(readToken());
  const s = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  // Load each time a screen showing them opens (a load already running is shared)
  useEffect(() => {
    if (!signedIn) return;
    wire();
    void load();
  }, [signedIn]);

  const reload = useCallback(() => load(), []);
  const mine = signedIn && owner === tokenTail();
  const owned = mine ? s.owned : null;
  const items = mine ? s.items : null;
  const isWorn = useCallback((id: string) => Boolean(items?.some((c) => c.cosmeticId === id)), [items]);
  const isOwned = useCallback((id: string) => Boolean(owned?.some((c) => c.cosmeticId === id)), [owned]);
  return {
    signedIn,
    owned,
    items,
    loading: mine && s.loading,
    error: mine ? s.error : "",
    reload,
    busyId: mine ? s.busyId : null,
    actionError: mine ? s.actionError : "",
    isWorn,
    isOwned,
    wear: (id: string) => change(id, true),
    takeOff: (id: string) => change(id, false),
  };
}
