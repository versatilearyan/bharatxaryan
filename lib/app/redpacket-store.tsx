"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { PEOPLE, personById } from "./data";
import { COVERS, RAIN_MS, RED_PACKETS, REMOTE_COUNTDOWN_MS, grabShare, othersShare, packetById, tierForAmount, type CoverId, type Drop, type RedPacketId } from "./redpacket";
import { ME_ID, useApp } from "./store";
import { SERVER_ROOM_PREFIX, serverRoomAppId, userPersonId, useServerRooms } from "./server-rooms";
import { dropRedPacket, getCurrentRedPacket, grabRedPacket, readRedPacket, RED_PACKETS_TOPIC, roomRedPacketTopic, type ServerRedPacket } from "@/lib/api/redpackets";
import { subscribe } from "@/lib/realtime/stomp";

const STORAGE_KEY = "panchayat-redpacket-v1";
type Saved = { owned: Partial<Record<RedPacketId, number>> };

const uid = () => Math.random().toString(36).slice(2, 10);
const nameOf = (id: string) => personById(id)?.name ?? "Someone";

function useRedPacketState() {
  const { spend, addCoins, toast, rooms, activeRoomId, resetCount, signedIn, refreshCoins } = useApp();
  const { myId, rememberPeople } = useServerRooms();
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

  /*
   * Backend rooms: the server runs the red packet (pot, fair split, grabs,
   * refund) and tells everyone. Its messages become Drops here; times are put
   * on this device's clock.
   */
  const fromServer = useCallback(
    (m: ServerRedPacket, banner: boolean) => {
      const offset = m.serverTime - Date.now();
      const fromId = m.senderId === myId ? ME_ID : userPersonId(m.senderId);
      if (fromId !== ME_ID && m.senderName) rememberPeople({ [fromId]: { name: m.senderName } });
      const id = `srv-rp:${m.id}`;
      setDrops((list) => {
        const old = list.find((x) => x.id === id);
        const d: Drop = {
          id,
          serverId: m.id,
          packet: tierForAmount(m.amount),
          cover: (COVERS.some((c) => c.id === m.cover) ? m.cover : "red") as CoverId,
          roomId: serverRoomAppId(m.roomId),
          fromId,
          sentAt: old?.sentAt ?? Date.now(),
          rainAt: m.rainAt - offset,
          // Ended on the server: end here too
          endAt: m.settled || m.event === "ENDED" ? Math.min(old?.endAt ?? Date.now(), Date.now()) : m.endAt - offset,
          left: m.event === "ENDED" ? 0 : m.left,
          mine: m.mine ?? old?.mine ?? 0,
          grabs: m.myGrabs ?? old?.grabs ?? 0,
          maxGrabs: m.maxGrabs,
        };
        return [...list.filter((x) => x.id !== id && x.endAt + 8_000 > Date.now()), d];
      });
      if (banner) setBanners((b) => (b.includes(id) ? b : [...b, id]));
    },
    [myId, rememberPeople],
  );

  // Red packets dropped anywhere in Panchayat: the banner
  useEffect(() => {
    if (!signedIn) return;
    return subscribe(RED_PACKETS_TOPIC, (body) => {
      const m = readRedPacket(body);
      if (m && m.event === "DROPPED") fromServer(m, true);
    });
  }, [signedIn, fromServer]);

  // The room you're in: its red packet now, and every grab and the end as they happen
  const activeServerRoom = activeRoomId?.startsWith(SERVER_ROOM_PREFIX) ? activeRoomId.slice(SERVER_ROOM_PREFIX.length) : null;
  useEffect(() => {
    if (!activeServerRoom || !signedIn) return;
    let live = true;
    getCurrentRedPacket(activeServerRoom)
      .then((m) => live && m && fromServer(m, false))
      .catch(() => {});
    const stop = subscribe(roomRedPacketTopic(activeServerRoom), (body) => {
      const m = readRedPacket(body);
      if (m) fromServer(m, false);
    });
    return () => {
      live = false;
      stop();
    };
  }, [activeServerRoom, signedIn, fromServer]);

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
    async (packet: RedPacketId, roomId: string, cover: CoverId, delay: number): Promise<boolean> => {
      if (roomId.startsWith(SERVER_ROOM_PREFIX)) {
        try {
          const m = await dropRedPacket(roomId.slice(SERVER_ROOM_PREFIX.length), packetById(packet).amount, cover, Math.round(delay / 1000));
          fromServer(m, false);
          void refreshCoins();
          return true;
        } catch (e) {
          toast(e instanceof Error && e.message ? e.message : "The red packet wasn't sent. Try again.", "error");
          return false;
        }
      }
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
    [owned, drops, spend, drop, toast, fromServer, refreshCoins],
  );

  /** Tap a falling envelope: grab a share of what's left in the pot. */
  const grab = useCallback(
    async (dropId: string): Promise<number> => {
      const d = drops.find((x) => x.id === dropId);
      const t = Date.now();
      if (!d || d.fromId === ME_ID || d.left <= 0 || t < d.rainAt || t > d.endAt || activeRoomId !== d.roomId) return 0;
      if (d.serverId) {
        if (d.maxGrabs && d.grabs >= d.maxGrabs) return 0;
        try {
          const r = await grabRedPacket(d.serverId);
          setDrops((list) => list.map((x) => (x.id === dropId ? { ...x, mine: r.mine, grabs: r.myGrabs, left: Math.min(x.left, r.left) } : x)));
          return r.got;
        } catch {
          return 0;
        }
      }
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
      setDrops((list) => (list.some((d) => !d.serverId && d.left > 0 && at >= d.rainAt && at <= d.endAt) ? list.map((d) => (!d.serverId && d.left > 0 && at >= d.rainAt && at <= d.endAt ? { ...d, left: d.left - othersShare(packetById(d.packet).amount, d.left) } : d)) : list));
    }, 350);
    return () => window.clearInterval(t);
  }, []);

  // (No made-up red packet drops: only real ones show.)

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
