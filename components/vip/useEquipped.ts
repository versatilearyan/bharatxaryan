"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { equipErrorText, getCosmeticInventory, getEquippedCosmetics, takeOffCosmetic, wearCosmetic, type EquippedCosmetic, type OwnedCosmetic } from "@/lib/api/vip-equipment";
import { useMe } from "@/lib/app/me-store";
import { readToken } from "@/lib/auth/token";

/** One request of each kind at a time across the app: callers that ask while one is running share it. */
let inventoryInFlight: Promise<OwnedCosmetic[]> | null = null;
let equippedInFlight: Promise<EquippedCosmetic[]> | null = null;
const loadInventory = () => {
  inventoryInFlight ??= getCosmeticInventory().finally(() => {
    inventoryInFlight = null;
  });
  return inventoryInFlight;
};
const loadEquipped = () => {
  equippedInFlight ??= getEquippedCosmetics().finally(() => {
    equippedInFlight = null;
  });
  return equippedInFlight;
};

/**
 * Your VIP cosmetics: what you own and what you're wearing, kept separate.
 *
 * When `enabled` (and signed in) it loads once: first the inventory
 * (GET /vip/cosmetics/inventory, which also lets the backend unlock what your
 * VIP is eligible for), then, once that succeeded, the equipped list
 * (GET /vip/cosmetics/equipped). A failure stops there and offers Retry; there
 * are no automatic retries. A 401 goes through the app's normal sign-out.
 *
 * Wear / take off go to POST / DELETE /vip/cosmetics/{id}/wear (the backend
 * checks VIP and inventory). After a change the equipped list is loaded again
 * and your profile (GET /users/me) refreshed. Nothing is worn automatically.
 */
export function useEquipped(enabled: boolean) {
  const signedIn = enabled && Boolean(readToken());
  const { refresh: refreshMe } = useMe();
  const [owned, setOwned] = useState<OwnedCosmetic[] | null>(null);
  const [items, setItems] = useState<EquippedCosmetic[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const reloadEquipped = useCallback(async () => {
    const list = await loadEquipped();
    if (live.current) setItems(list);
  }, []);

  /** Inventory, then equipped. */
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const inv = await loadInventory();
      if (!live.current) return;
      setOwned(inv);
      await reloadEquipped();
    } catch (e) {
      if (live.current) setError(`Couldn't load your VIP cosmetics. ${equipErrorText(e, "load")}`);
    } finally {
      if (live.current) setLoading(false);
    }
  }, [reloadEquipped]);

  useEffect(() => {
    if (signedIn) void reload();
  }, [signedIn, reload]);

  const change = useCallback(
    async (cosmeticId: string, wear: boolean) => {
      if (busyId) return;
      setBusyId(cosmeticId);
      setActionError("");
      try {
        await (wear ? wearCosmetic(cosmeticId) : takeOffCosmetic(cosmeticId));
        try {
          await reloadEquipped();
        } catch (e) {
          if (live.current) setError(`Couldn't load what you're wearing. ${equipErrorText(e, "load")}`);
        }
        refreshMe(true);
      } catch (e) {
        if (live.current) setActionError(equipErrorText(e, wear ? "wear" : "remove"));
      } finally {
        if (live.current) setBusyId(null);
      }
    },
    [busyId, reloadEquipped, refreshMe],
  );

  const isWorn = useCallback((cosmeticId: string) => Boolean(items?.some((c) => c.cosmeticId === cosmeticId)), [items]);
  const isOwned = useCallback((cosmeticId: string) => Boolean(owned?.some((c) => c.cosmeticId === cosmeticId)), [owned]);
  return { signedIn, owned, items, loading, error, reload, busyId, actionError, isWorn, isOwned, wear: (id: string) => change(id, true), takeOff: (id: string) => change(id, false) };
}
