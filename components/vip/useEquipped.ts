"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { equipErrorText, getEquippedCosmetics, takeOffCosmetic, wearCosmetic, type EquippedCosmetic } from "@/lib/api/vip-equipment";
import { useMe } from "@/lib/app/me-store";
import { readToken } from "@/lib/auth/token";

/** One GET at a time across the app: callers that ask while one is running share it. */
let inFlight: Promise<EquippedCosmetic[]> | null = null;
const loadEquipped = () => {
  inFlight ??= getEquippedCosmetics().finally(() => {
    inFlight = null;
  });
  return inFlight;
};

/**
 * Your equipped VIP cosmetics, and wearing / taking one off. Loads once while
 * `enabled` (and signed in); after a change the list is loaded again and your
 * profile (GET /users/me) is refreshed, so its frame, badge and the rest update
 * without a page reload.
 */
export function useEquipped(enabled: boolean) {
  const signedIn = enabled && Boolean(readToken());
  const { refresh: refreshMe } = useMe();
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

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await loadEquipped();
      if (live.current) setItems(list);
    } catch (e) {
      if (live.current) setError(equipErrorText(e, "wear").replace("Couldn't put it on.", "Couldn't load what you're wearing."));
    } finally {
      if (live.current) setLoading(false);
    }
  }, []);

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
        await reload();
        refreshMe(true);
      } catch (e) {
        if (live.current) setActionError(equipErrorText(e, wear ? "wear" : "remove"));
      } finally {
        if (live.current) setBusyId(null);
      }
    },
    [busyId, reload, refreshMe],
  );

  const isWorn = useCallback((cosmeticId: string) => Boolean(items?.some((c) => c.cosmeticId === cosmeticId)), [items]);
  return { signedIn, items, loading, error, reload, busyId, actionError, isWorn, wear: (id: string) => change(id, true), takeOff: (id: string) => change(id, false) };
}
