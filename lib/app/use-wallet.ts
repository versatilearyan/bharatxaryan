"use client";

/**
 * Loads the wallet's coin packs, red packet products and (when signed in) the
 * person's red packets, while the wallet is open.
 *
 * Each list is fetched once per opening. Results are kept for a minute so
 * closing and reopening the wallet, or React's dev double-mount, doesn't send
 * the same requests again; a request already in flight is shared. Retry clears
 * that list's cache and asks again.
 */
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getMyRedPacketInventory, getWalletCoinPacks, getWalletRedPackets, type RedPacketInventory, type WalletCoinPack, type WalletRedPacket } from "@/lib/api/wallet";
import { readToken } from "@/lib/auth/token";

const FRESH_MS = 60_000;
type Entry<T> = { at: number; promise: Promise<T> };
const cache = new Map<string, Entry<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as Entry<T> | undefined;
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.promise;
  const promise = load();
  cache.set(key, { at: Date.now(), promise });
  // A failure isn't kept, so the next look asks again
  promise.catch(() => cache.delete(key));
  return promise;
}

export type Loaded<T> = { data: T | null; error: string | null; loading: boolean; retry: () => void };

export function useCachedLoad<T>(key: string | null, load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    cached(key, load)
      .then((data) => live && setState({ key, data, error: null }))
      .catch((e: unknown) => live && setState({ key, data: null, error: e instanceof ApiError || e instanceof Error ? e.message : "Something went wrong. Try again." }));
    return () => {
      live = false;
    };
    // load is a stable module function for each key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  const current = key !== null && state.key === key;
  const retry = useCallback(() => {
    if (key) cache.delete(key);
    setState((s) => ({ ...s, key: null }));
    setAttempt((n) => n + 1);
  }, [key]);
  return { data: current ? state.data : null, error: current ? state.error : null, loading: key !== null && !current, retry };
}

/** open: whether the wallet is showing. Nothing is fetched while it's closed. */
export function useWalletCatalog(open: boolean) {
  const coinPacks = useCachedLoad<WalletCoinPack[]>(open ? "coin-packs" : null, getWalletCoinPacks);
  const redPackets = useCachedLoad<WalletRedPacket[]>(open ? "red-packets" : null, getWalletRedPackets);
  // The inventory belongs to whoever is signed in, so the cache key carries the token's tail
  const token = open ? readToken() : null;
  const inventory = useCachedLoad<RedPacketInventory>(token ? `inventory:${token.accessToken.slice(-16)}` : null, getMyRedPacketInventory);
  return { coinPacks, redPackets, inventory, signedIn: Boolean(token) };
}
