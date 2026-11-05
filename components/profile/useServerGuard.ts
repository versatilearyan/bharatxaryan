"use client";

/**
 * Guard from the server (GET /api/v1/guard/{id|me}, POST /api/v1/guard/{id}/protect)
 * for "me" (signed in) and server users ("srv-user:<id>"). Null for sample people.
 * Each guardian's guard = the charm their gifts and rings gave + protects × protectGuard.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { myUserIdFromToken, readToken } from "@/lib/auth/token";
import { SERVER_USER_PREFIX } from "@/lib/app/server-rooms";
import { ME_ID } from "@/lib/app/store";

export type Guardian = { userId: string; personId: string; name: string; avatarUrl?: string; charm: number; giftCharm: number; ringCharm: number; protects: number; guard: number };
export type GuardData = { total: number; protectedToday: boolean; protectGuard: number; guards: Guardian[] };

function whoOf(personId: string) {
  if (personId === ME_ID) return readToken() ? "me" : null;
  if (personId.startsWith(SERVER_USER_PREFIX)) return personId.slice(SERVER_USER_PREFIX.length);
  return null;
}

function read(d: Record<string, unknown>): GuardData {
  const myId = myUserIdFromToken();
  const n = (v: unknown) => (typeof v === "number" ? v : 0);
  return {
    total: n(d.total),
    protectedToday: d.protectedToday === true,
    protectGuard: n(d.protectGuard) || 30,
    guards: (Array.isArray(d.guards) ? d.guards : []).map((x) => {
      const g = x as Record<string, unknown>;
      const id = String(g.userId ?? "");
      return {
        userId: id,
        personId: id && id === myId ? ME_ID : `${SERVER_USER_PREFIX}${id}`,
        name: String(g.name ?? "Someone"),
        avatarUrl: typeof g.avatarUrl === "string" ? g.avatarUrl : undefined,
        charm: n(g.charm),
        giftCharm: n(g.giftCharm),
        ringCharm: n(g.ringCharm),
        protects: n(g.protects),
        guard: n(g.guard),
      };
    }),
  };
}

export function useServerGuard(personId: string) {
  const who = whoOf(personId);
  const [data, setData] = useState<GuardData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    if (!who) return;
    api<Record<string, unknown>>(`/api/v1/guard/${encodeURIComponent(who)}`, { auth: true })
      .then((d) => setData(read(d ?? {})))
      .catch(() => undefined);
  }, [who]);
  useEffect(() => {
    setData(null);
    load();
  }, [load]);
  const protect = useCallback(async () => {
    if (!who || who === "me" || busy) return;
    setBusy(true);
    setError("");
    try {
      setData(read((await api<Record<string, unknown>>(`/api/v1/guard/${encodeURIComponent(who)}/protect`, { method: "POST", auth: true })) ?? {}));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't protect.");
      load();
    } finally {
      setBusy(false);
    }
  }, [who, busy, load]);
  return { enabled: who !== null, data, protect, busy, error };
}
