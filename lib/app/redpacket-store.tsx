"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { PEOPLE, personById } from "./data";
import { COVERS, RAIN_MS, RED_PACKETS, REMOTE_COUNTDOWN_MS, grabShare, othersShare, packetById, type CoverId, type Drop, type RedPacketId } from "./redpacket";
import { ME_ID, useApp } from "./store";

const STORAGE_KEY = "panchayat-redpacket-v1";
type Saved = { owned: Partial<Record<RedPacketId, number>> };

const uid = () => Math.random().toString(36).slice(2, 10);
const nameOf = (id: string) => personById(id)?.name ?? "Someone";

function useRedPacketState() {
  const { spend, addCoins, toast, rooms, activeRoomId, resetCount } = useApp();
  /** Red packets you bought and haven't dropped yet. */
  const [owned, setOwned] = useState<Partial<Record<RedPacketId, number>>>({});
  const [drops, setDrops] = useState<Drop[]>([]);
  /** Drops waiting to be announced in the server-wide banner, oldest first. */
  const [banners, setBanners] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  /** The Send sheet is shared, so the Bag can open it with an amount picked. */
  const [sendFor, setSendFor] = useState<RedPacketId | null>(null);
  /**
   * True once saved data has been read. State, not a ref: in development React
   * runs effects twice, and a ref let the first pass save the empty defaults
   * over your data before the second pass read it.
   */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Saved>;
      if (s.owned) setOwned(s.owned);
    } catch {
      /* nothing saved */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ owned } satisfies Saved));
    } catch {
      /* storage unavailable: still works for this session */
    }
  }, [hydrated, owned]);

  const firstReset = useRef(resetCount);
  useEffect(() => {
    if (resetCount === firstReset.current) return;
    setOwned({});
    setDrops([]);
    setBanners([]);
  }, [resetCount]);

  const drop = useCallback((packet: RedPacketId, roomId: string, fromId: string, cover: CoverId, delay = REMOTE_COUNTDOWN_MS) => {
    const at = Date.now();
    const rainAt = at + delay;
    const d: Drop = { id: uid(), packet, cover, roomId, fromId, sentAt: at, rainAt, endAt: rainAt + RAIN_MS, left: packetById(packet).amount, mine: 0, grabs: 0 };
    setDrops((list) => [...list.filter((x) => x.endAt + 8_000 > at), d]);
    setBanners((b) => [...b, d.id]);
    return d;
  }, []);

  /** Buy a red packet with coins. It waits in your wallet until you drop it in a room. */
  const buy = useCallback(
    (packet: RedPacketId) => {
      const p = packetById(packet);
      if (!spend(p.amount)) return toast("Not enough demo coins", "error");
      setOwned((o) => ({ ...o, [packet]: (o[packet] ?? 0) + 1 }));
      toast(`${p.label} ${p.name} added to your Bag 🧧`, "gold");
    },
    [spend, toast],
  );

  /** A red packet paid for in rupees at checkout: straight into the Bag, no coins spent. */
  const addPaid = useCallback(
    (packet: RedPacketId) => {
      const p = packetById(packet);
      setOwned((o) => ({ ...o, [packet]: (o[packet] ?? 0) + 1 }));
      toast(`${p.label} ${p.name} added to your Bag 🧧`, "gold");
    },
    [toast],
  );

  /**
   * Drop a red packet in a room: one from your Bag if you have that amount,
   * otherwise it's bought with coins. The rain starts after `delay`.
   */
  const send = useCallback(
    (packet: RedPacketId, roomId: string, cover: CoverId, delay: number) => {
      if (drops.some((d) => d.roomId === roomId && Date.now() < d.endAt && d.left > 0)) {
        toast("Wait for this red packet rain to finish", "error");
        return false;
      }
      if (owned[packet]) setOwned((o) => ({ ...o, [packet]: Math.max(0, (o[packet] ?? 0) - 1) }));
      else if (!spend(packetById(packet).amount)) {
        toast("Not enough demo coins", "error");
        return false;
      }
      drop(packet, roomId, ME_ID, cover, delay);
      return true;
    },
    [owned, drops, spend, drop, toast],
  );

  /** Tap a falling envelope: grab a share of what's left in the pot. */
  const grab = useCallback(
    (dropId: string) => {
      const d = drops.find((x) => x.id === dropId);
      const t = Date.now();
      if (!d || d.fromId === ME_ID || d.left <= 0 || t < d.rainAt || t > d.endAt || activeRoomId !== d.roomId) return 0;
      const got = grabShare(packetById(d.packet).amount, d.left);
      setDrops((list) => list.map((x) => (x.id === dropId ? { ...x, left: Math.max(0, x.left - got), mine: x.mine + got, grabs: x.grabs + 1 } : x)));
      addCoins(got);
      return got;
    },
    [drops, activeRoomId, addCoins],
  );

  // The clock ticks only while a drop is counting down or raining
  const live = drops.some((d) => now < d.endAt + 1_000);
  useEffect(() => {
    if (!live && !drops.length) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [live, drops.length]);

  // Everyone else in the room grabs too while it rains
  useEffect(() => {
    const t = window.setInterval(() => {
      const at = Date.now();
      setDrops((list) => (list.some((d) => d.left > 0 && at >= d.rainAt && at <= d.endAt) ? list.map((d) => (d.left > 0 && at >= d.rainAt && at <= d.endAt ? { ...d, left: d.left - othersShare(packetById(d.packet).amount, d.left) } : d)) : list));
    }, 350);
    return () => window.clearInterval(t);
  }, []);

  // Demo: now and then someone drops a red packet somewhere in Panchayat
  const roomsRef = useRef(rooms);
  const activeRef = useRef(activeRoomId);
  useEffect(() => {
    roomsRef.current = rooms;
    activeRef.current = activeRoomId;
  }, [rooms, activeRoomId]);
  useEffect(() => {
    let t = 0;
    const next = (ms: number) => {
      t = window.setTimeout(() => {
        const list = roomsRef.current.filter((r) => !r.createdByMe && r.type !== "kharidari");
        // Sometimes it lands in the room you're sitting in
        const here = activeRef.current ? roomsRef.current.find((r) => r.id === activeRef.current) : undefined;
        const room = here && Math.random() < 0.35 ? here : list[Math.floor(Math.random() * list.length)];
        if (room) {
          const fromId = room.seated.find((id) => id !== ME_ID) ?? PEOPLE[Math.floor(Math.random() * PEOPLE.length)].id;
          const roll = Math.random();
          drop(roll < 0.6 ? "rp-10k" : roll < 0.9 ? "rp-50k" : "rp-80k", room.id, fromId, COVERS[Math.floor(Math.random() * COVERS.length)].id);
        }
        next(50_000 + Math.random() * 40_000);
      }, ms);
    };
    next(18_000);
    return () => window.clearTimeout(t);
  }, [drop]);

  const dismissBanner = useCallback((id: string) => setBanners((b) => b.filter((x) => x !== id)), []);
  const dropById = useCallback((id: string) => drops.find((d) => d.id === id), [drops]);
  /** The drop counting down, raining or just finished in a room. */
  const dropIn = useCallback((roomId: string) => [...drops].reverse().find((d) => d.roomId === roomId && now < d.endAt + 6_000), [drops, now]);

  return { sendFor, openSend: setSendFor, owned, buy, addPaid, send, grab, drops, now, banners, dismissBanner, dropById, dropIn, nameOf, tiers: RED_PACKETS };
}

export type RedPacketState = ReturnType<typeof useRedPacketState>;

const Ctx = createContext<RedPacketState | null>(null);

export function RedPacketProvider({ children }: { children: ReactNode }) {
  const state = useRedPacketState();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useRedPackets() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRedPackets must be used inside <RedPacketProvider>");
  return v;
}
