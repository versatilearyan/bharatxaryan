"use client";

import { useEffect, useState } from "react";
import { newbieApi, type NewbieMe, type NewbieRoom } from "@/lib/api/newbie";
import { SERVER_USER_PREFIX } from "@/lib/app/server-rooms";

/** The id of the welcome gift (the same gift the admin sets up in Gifts). */
export const WELCOME_GIFT_ID = "welcome-newbie";

/** The welcome rooms that are open now (best first, decided by the server). Refreshes while the page is visible. */
export function useNewbieRooms(): NewbieRoom[] {
  const [rooms, setRooms] = useState<NewbieRoom[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      newbieApi
        .rooms()
        .then((r) => live && setRooms(r))
        .catch(() => undefined);
    };
    load();
    const t = window.setInterval(load, 15_000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, []);
  return rooms;
}

let meCache: { at: number; data: NewbieMe | null; pending: Promise<NewbieMe | null> | null } = { at: 0, data: null, pending: null };
const meListeners = new Set<(m: NewbieMe | null) => void>();

function loadMe(force = false): Promise<NewbieMe | null> {
  if (!force && meCache.data && Date.now() - meCache.at < 60_000) return Promise.resolve(meCache.data);
  if (meCache.pending) return meCache.pending;
  meCache.pending = newbieApi
    .me()
    .then((m) => {
      meCache = { at: Date.now(), data: m, pending: null };
      meListeners.forEach((f) => f(m));
      return m;
    })
    .catch(() => {
      meCache.pending = null;
      return null;
    });
  return meCache.pending;
}

/** My newbie status (cached for a minute and shared by every screen). */
export function useNewbieMe(): NewbieMe | null {
  const [me, setMe] = useState<NewbieMe | null>(meCache.data);
  useEffect(() => {
    meListeners.add(setMe);
    void loadMe();
    return () => {
      meListeners.delete(setMe);
    };
  }, []);
  return me;
}

/** The person has seen the welcome card. */
export function markWelcomeSeen() {
  if (meCache.data) {
    meCache = { ...meCache, data: { ...meCache.data, welcomeSeen: true } };
    meListeners.forEach((f) => f(meCache.data));
  }
  void newbieApi.welcomeSeen().catch(() => undefined);
}

/* ---- the NEWBIE badge: one batched question to the server for everyone on screen ---- */

const flags = new Map<string, { at: number; newbie: boolean }>();
const queue = new Set<string>();
let timer: number | null = null;
const flagListeners = new Set<() => void>();

const userIdOf = (personId: string) => (personId.startsWith(SERVER_USER_PREFIX) ? personId.slice(SERVER_USER_PREFIX.length) : null);

function flush() {
  timer = null;
  const ids = [...queue].slice(0, 100);
  ids.forEach((i) => queue.delete(i));
  if (!ids.length) return;
  newbieApi
    .check(ids)
    .then((r) => {
      const set = new Set(r.newbies);
      ids.forEach((i) => flags.set(i, { at: Date.now(), newbie: set.has(i) }));
      flagListeners.forEach((f) => f());
    })
    .catch(() => undefined);
}

/** Is this person a newbie (shows the NEWBIE badge)? Answers from a short cache. */
export function useIsNewbie(personId: string | null | undefined): boolean {
  const [, bump] = useState(0);
  const uid = personId ? userIdOf(personId) : null;
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    flagListeners.add(f);
    return () => {
      flagListeners.delete(f);
    };
  }, []);
  useEffect(() => {
    if (!uid) return;
    const known = flags.get(uid);
    if (known && Date.now() - known.at < 5 * 60_000) return;
    queue.add(uid);
    if (timer === null) timer = window.setTimeout(flush, 200);
  }, [uid]);
  return uid ? (flags.get(uid)?.newbie ?? false) : false;
}
