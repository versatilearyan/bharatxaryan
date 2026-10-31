"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BLESSING_COST, DAY_MS, RINGS, SAMPLE_COUPLES, SHOP_BUBBLES, VISITOR_LOG_PLANS, addVisit, bubbleById, ringById, type BagItem, type BubbleId, type Blessing, type Couple, type RentDays, type RingId, type Visit, type VisitorLogPlanId } from "./market";
import { PEOPLE, giftById, isGiftOnSale, personById } from "./data";
import { VIP_SETS, bestSet, giftSetById, isGiftSetId, unlockedSets, type EffectSet, type EffectSetId, type GiftSet, type VipSet } from "./effects";

/** The effects to draw for someone: each is the set it comes from. `page` is the profile page effect. */
export type Effects = { frame?: EffectSet; bubble?: EffectSet; entry?: EffectSet; badge?: VipSet; page?: GiftSet; bubbleClass?: string };
import { ME_ID, useApp } from "./store";
import type { GiftId, GiftSetId } from "./types";

const STORAGE_KEY = "panchayat-market-v1";
type Pending = { toId: string; ring: RingId; message: string; at: number };
/**
 * What you wear. Set pieces name their set (a VIP set or a gift set), or
 * "auto" for the best VIP set you've unlocked, so a new VIP 1 has everything
 * switched on straight away.
 */
type VipPick = EffectSetId | "auto" | null;
/** The badge isn't here: it's always on for VIPs and can't be taken off. `page` is a gift set's profile page effect. */
type Equip = { animFrame: VipPick; bubble: BubbleId | VipPick; entry: VipPick; page: GiftSetId | null };
const DEFAULT_EQUIP: Equip = { animFrame: "auto", bubble: "auto", entry: "auto", page: null };
const isVipPick = (v: unknown): v is EffectSetId | "auto" => v === "auto" || VIP_SETS.some((s) => s.id === v) || isGiftSetId(v);
/** Older saves used true / "vip" for the VIP pieces, and named the old VIP 10 set. */
const migratePick = (v: unknown): VipPick => (v === true || v === "vip" || v === "vip10" ? "auto" : v === false ? null : (v as VipPick));
type Saved = { equip: Equip; blessings: Record<string, Blessing[]>; pkg: Partial<Record<GiftId, number>>; pkgSeeded: boolean; bag: BagItem[]; myCouple: Couple | null; love: Record<string, number>; welcome: boolean; visitors: Visit[]; visited: Visit[]; visitorsSeenAt: number; visitorLogUntil: number; giftSets: GiftSetId[] };

/** New accounts used to get roses, hearts and hampers here; those gifts are gone, so the package starts empty. */
const STARTER_PACKAGE: Partial<Record<GiftId, number>> = {};
/** Package gifts that are still on sale; retired ones in old saves are dropped. */
const onSale = (p: Partial<Record<GiftId, number>> = {}) => Object.fromEntries(Object.entries(p).filter(([id]) => isGiftOnSale(id))) as Partial<Record<GiftId, number>>;

const uid = () => Math.random().toString(36).slice(2, 10);
const nameOf = (id: string) => personById(id)?.name ?? "them";

function useMarketState() {
  const { spend, toast, resetCount, giftHook, push, vip, giftFx } = useApp();
  const [equip, setEquip] = useState<Equip>(DEFAULT_EQUIP);
  const [bag, setBag] = useState<BagItem[]>([]);
  const [myCouple, setMyCouple] = useState<Couple | null>(null);
  /** Love added on this device to sample couples. */
  const [love, setLove] = useState<Record<string, number>>({});
  const [welcome, setWelcome] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  /** People who opened your profile, and profiles you opened. */
  const [visitors, setVisitors] = useState<Visit[]>([]);
  const [visited, setVisited] = useState<Visit[]>([]);
  const [visitorsSeenAt, setVisitorsSeenAt] = useState(0);
  /** The visitor log you bought shows who visited until this time. */
  const [visitorLogUntil, setVisitorLogUntil] = useState(0);
  /** Gift sets you unlocked by sending their gift. */
  const [giftSets, setGiftSets] = useState<GiftSetId[]>([]);
  /** Package gifts in your Bag, sent for free from the gift panel. */
  const [pkg, setPkg] = useState<Partial<Record<GiftId, number>>>({});
  const [pkgSeeded, setPkgSeeded] = useState(false);
  /** Blessings sent to couples on this device, by couple id. */
  const [blessings, setBlessings] = useState<Record<string, Blessing[]>>({});
  const [now, setNow] = useState(() => Date.now());
  /**
   * True once saved data has been read. State, not a ref: in development React
   * runs effects twice, and a ref let the first pass save the empty defaults
   * over your data before the second pass read it.
   */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Saved>;
      // Rings that are no longer sold drop out of the bag
      // Old saves can hold built-in frames, which no longer exist
      if (Array.isArray(s.bag)) setBag(s.bag.filter((b) => (b.kind as string) !== "frame" && (b.kind !== "ring" || RINGS.some((r) => r.id === b.ring))));
      if (s.myCouple) setMyCouple(s.myCouple);
      if (s.love) setLove(s.love);
      if (s.welcome) setWelcome(true);
      if (Array.isArray(s.visitors)) setVisitors(s.visitors);
      if (Array.isArray(s.visited)) setVisited(s.visited);
      if (s.visitorsSeenAt) setVisitorsSeenAt(s.visitorsSeenAt);
      if (typeof s.visitorLogUntil === "number") setVisitorLogUntil(s.visitorLogUntil);
      // Every account starts with a small starter package
      setPkg(s.pkgSeeded ? onSale(s.pkg) : STARTER_PACKAGE);
      if (Array.isArray(s.giftSets)) setGiftSets(s.giftSets.filter(isGiftSetId));
      setPkgSeeded(true);
      if (s.blessings) setBlessings(s.blessings);
      if (s.equip) {
        const e = s.equip as Record<string, unknown>;
        setEquip({ animFrame: migratePick(e.animFrame), bubble: migratePick(e.bubble) as Equip["bubble"], entry: migratePick(e.entry), page: isGiftSetId(e.page) ? e.page : null });
      }
    } catch {
      /* nothing saved */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ equip, blessings, pkg, pkgSeeded, bag, myCouple, love, welcome, visitors, visited, visitorsSeenAt, visitorLogUntil, giftSets } satisfies Saved));
    } catch {
      /* storage unavailable: still works for this session */
    }
  }, [hydrated, equip, blessings, pkg, pkgSeeded, bag, myCouple, love, welcome, visitors, visited, visitorsSeenAt, visitorLogUntil, giftSets]);

  // Reset demo data clears the bag and your couple too
  const firstReset = useRef(resetCount);
  useEffect(() => {
    if (resetCount === firstReset.current) return;
    setBag([]);
    setMyCouple(null);
    setLove({});
    setWelcome(false);
    setPending(null);
    setVisitors([]);
    setVisited([]);
    setVisitorsSeenAt(0);
    setVisitorLogUntil(0);
    setGiftSets([]);
    setPkg(STARTER_PACKAGE);
    setBlessings({});
    setEquip(DEFAULT_EQUIP);
  }, [resetCount]);

  // Rented chat bubbles count down
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const activeBubbles = useMemo(() => new Set(bag.flatMap((b) => (b.kind === "bubble" && b.expiresAt > now ? [b.bubble] : []))), [bag, now]);
  useEffect(() => {
    if (!hydrated) return;
    if (equip.bubble && !isVipPick(equip.bubble) && !activeBubbles.has(equip.bubble)) {
      setEquip((e) => ({ ...e, bubble: null }));
      toast("Your chat bubble expired. Get it again in the Shop.");
    }
  }, [hydrated, activeBubbles, equip.bubble, toast]);

  /* ---- Decorations you wear ---- */
  /** VIP effect sets you've unlocked, best first. VIP 1 unlocks the first one. */
  const vipSets = useMemo(() => unlockedSets(vip.level), [vip.level]);
  const vipEffects = vipSets.length > 0;
  /** Turns a pick into the set it means now, or null if it's off or locked. */
  const resolve = useCallback(
    (pick: VipPick | BubbleId): EffectSet | null => {
      if (pick === "auto") return vipSets[0] ?? null;
      if (isGiftSetId(pick)) return giftSets.includes(pick) ? giftSetById(pick) : null;
      if (isVipPick(pick)) return vipSets.find((x) => x.id === pick) ?? vipSets[0] ?? null;
      return null;
    },
    [vipSets, giftSets],
  );
  const worn = useMemo(
    () => ({ frame: resolve(equip.animFrame), bubble: resolve(equip.bubble), entry: resolve(equip.entry), badge: vipSets[0] ?? null, page: equip.page && giftSets.includes(equip.page) ? giftSetById(equip.page) : null }),
    [resolve, equip, vipSets, giftSets],
  );
  const wearAnimFrame = useCallback((set: EffectSetId | null) => setEquip((e) => ({ ...e, animFrame: set })), []);
  const wearBubble = useCallback((bubble: BubbleId | EffectSetId | null) => setEquip((e) => ({ ...e, bubble })), []);
  const wearEntry = useCallback((set: EffectSetId | null) => setEquip((e) => ({ ...e, entry: set })), []);
  const wearPage = useCallback((set: GiftSetId | null) => setEquip((e) => ({ ...e, page: set })), []);

  // Sending a gift that comes with a set unlocks it and puts every piece on
  const lastFx = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated || !giftFx || lastFx.current === giftFx.id) return;
    lastFx.current = giftFx.id;
    const set = giftById(giftFx.giftId).reward;
    if (!set) return;
    setGiftSets((list) => (list.includes(set) ? list : [...list, set]));
    // Sending it turns on the frame and the profile page effect; the bubble and entry wait in your Bag
    setEquip((e) => ({ ...e, animFrame: set, page: set }));
    toast(`${giftSetById(set).name} frame and profile effect are on. Find them in your Bag.`, "gold");
  }, [hydrated, giftFx, toast]);
  /**
   * Effects to draw for a person. Yours follow what you wear from the Bag.
   * Sample people show the badge of their VIP level (the demo has no Bag for them).
   */
  const effectsFor = useCallback(
    (personId: string, vipLevel?: number): Effects => {
      if (personId !== ME_ID) {
        const set = vipLevel ? bestSet(vipLevel) : null;
        return set ? { badge: set } : {};
      }
      return {
        frame: worn.frame ?? undefined,
        entry: worn.entry ?? undefined,
        bubble: worn.bubble ?? undefined,
        badge: worn.badge ?? undefined,
        page: worn.page ?? undefined,
        bubbleClass: equip.bubble && !isVipPick(equip.bubble) ? bubbleById(equip.bubble).className : undefined,
      };
    },
    [worn, equip.bubble],
  );

  /* ---- Couples ---- */
  const couples = useMemo(() => {
    const samples = SAMPLE_COUPLES.map((c) => ({ ...c, love: c.love + (love[c.id] ?? 0) }));
    return myCouple ? [myCouple, ...samples] : samples;
  }, [myCouple, love]);
  const coupleOf = useCallback((id: string) => couples.find((c) => c.a === id || c.b === id) ?? null, [couples]);

  // Gifts between partners add love (1 love per coin)
  useEffect(() => {
    giftHook.current = (from, to, coins) => {
      const c = couples.find((x) => (x.a === from && x.b === to) || (x.a === to && x.b === from));
      if (!c || coins <= 0) return;
      if (myCouple && c.id === myCouple.id) setMyCouple((m) => (m ? { ...m, love: m.love + coins } : m));
      else setLove((l) => ({ ...l, [c.id]: (l[c.id] ?? 0) + coins }));
    };
    return () => {
      giftHook.current = null;
    };
  }, [couples, myCouple, giftHook]);

  /* ---- Shop ---- */
  const buyBubble = useCallback(
    (bubble: BubbleId, days: RentDays) => {
      const item = SHOP_BUBBLES.find((b) => b.id === bubble);
      if (!item) return false;
      if (!spend(item.prices[days])) {
        toast("Not enough demo coins", "error");
        return false;
      }
      setBag((list) => {
        const had = list.find((b) => b.kind === "bubble" && b.bubble === bubble && b.expiresAt > Date.now());
        // Buying a bubble you already have adds the days to it
        if (had && had.kind === "bubble") return list.map((b) => (b.id === had.id ? { ...had, expiresAt: had.expiresAt + days * DAY_MS } : b));
        return [{ id: uid(), kind: "bubble", bubble, expiresAt: Date.now() + days * DAY_MS, source: "Bought in the Shop" }, ...list.filter((b) => !(b.kind === "bubble" && b.bubble === bubble))];
      });
      toast(`${item.name} chat bubble added to your Bag for ${days} days`, "gold");
      return true;
    },
    [spend, toast],
  );

  const buyRing = useCallback(
    (ring: RingId) => {
      const r = ringById(ring);
      if (!spend(r.price)) {
        toast("Not enough demo coins", "error");
        return false;
      }
      setBag((list) => [{ id: uid(), kind: "ring", ring, source: "Bought in the Shop" }, ...list]);
      toast(`${r.name} ring added to your Bag`, "gold");
      return true;
    },
    [spend, toast],
  );

  /* ---- Package gifts ---- */
  const addPackage = useCallback((giftId: GiftId, n: number) => setPkg((p) => ({ ...p, [giftId]: (p[giftId] ?? 0) + n })), []);
  /** Takes gifts out of your package; false if you don't have that many. */
  const takePackage = useCallback(
    (giftId: GiftId, n: number) => {
      if ((pkg[giftId] ?? 0) < n) return false;
      setPkg((p) => {
        const left = (p[giftId] ?? 0) - n;
        const next = { ...p, [giftId]: left };
        if (left <= 0) delete next[giftId];
        return next;
      });
      return true;
    },
    [pkg],
  );

  const ringsInBag = useMemo(() => {
    const count: Partial<Record<RingId, number>> = {};
    bag.forEach((b) => b.kind === "ring" && (count[b.ring] = (count[b.ring] ?? 0) + 1));
    return RINGS.filter((r) => count[r.id]).map((r) => ({ ring: r, count: count[r.id] ?? 0 }));
  }, [bag]);

  /* ---- Proposals ---- */
  const propose = useCallback(
    (toId: string, ring: RingId, message: string) => {
      if (myCouple) return toast("You already have a CP", "error");
      if (coupleOf(toId)) return toast(`${nameOf(toId)} already has a CP`, "error");
      const item = bag.find((b) => b.kind === "ring" && b.ring === ring);
      if (!item) return toast("Buy a ring in the Shop first", "error");
      setBag((list) => list.filter((b) => b.id !== item.id));
      setPending({ toId, ring, message, at: Date.now() });
      toast(`Proposal sent to ${nameOf(toId)} 💍`);
      // Demo: they think it over for a moment, then say yes
      window.setTimeout(() => {
        const r = ringById(ring);
        setPending(null);
        setMyCouple({ id: `cp-me-${toId}`, a: ME_ID, b: toId, ring, rings: [ring], since: Date.now(), love: r.price, message });
        toast(`${nameOf(toId)} said yes! You're a couple now 💞`, "gold");
        push({ kind: "love-home", personId: ME_ID });
      }, 3500);
    },
    [myCouple, coupleOf, bag, toast, push],
  );

  /** Give your partner another ring from your bag; it joins your ring box and adds love. */
  const giveRing = useCallback(
    (ring: RingId) => {
      if (!myCouple) return;
      const item = bag.find((b) => b.kind === "ring" && b.ring === ring);
      if (!item) return;
      const r = ringById(ring);
      setBag((list) => list.filter((b) => b.id !== item.id));
      setMyCouple((m) => (m ? { ...m, rings: [...m.rings, ring], love: m.love + r.price } : m));
      toast(`You gave ${nameOf(partnerOf(myCouple))} the ${r.name} ring · +${r.price.toLocaleString("en-IN")} love`, "gold");
    },
    [myCouple, bag, toast],
  );

  /** Buy a ring in the shop and put it straight into your ring box. */
  const buyRingForCouple = useCallback(
    (ring: RingId) => {
      if (!myCouple) return;
      const r = ringById(ring);
      if (!spend(r.price)) return toast("Not enough demo coins", "error");
      setMyCouple((m) => (m ? { ...m, rings: [...m.rings, ring], love: m.love + r.price } : m));
      toast(`${r.name} added to your ring box · +${r.price.toLocaleString("en-IN")} love`, "gold");
    },
    [myCouple, spend, toast],
  );

  /* ---- Blessings ---- */
  const addBlessing = useCallback(
    (coupleId: string, by: string) => {
      setBlessings((b) => ({ ...b, [coupleId]: [{ id: uid(), by, at: Date.now() }, ...(b[coupleId] ?? [])].slice(0, 200) }));
      if (myCouple?.id === coupleId) setMyCouple((m) => (m ? { ...m, love: m.love + BLESSING_COST } : m));
      else setLove((l) => ({ ...l, [coupleId]: (l[coupleId] ?? 0) + BLESSING_COST }));
    },
    [myCouple],
  );
  /** Bless someone else's couple: 99 coins, +99 love for them. */
  const bless = useCallback(
    (coupleId: string) => {
      const c = couples.find((x) => x.id === coupleId);
      if (!c) return;
      if (c.a === ME_ID || c.b === ME_ID) return toast("You can't bless your own CP 🙂", "error");
      if (!spend(BLESSING_COST)) return toast("Not enough demo coins", "error");
      addBlessing(coupleId, ME_ID);
      toast(`🙏 You blessed ${nameOf(c.a)} & ${nameOf(c.b)} · +${BLESSING_COST} love`, "gold");
    },
    [couples, spend, addBlessing, toast],
  );
  const blessingsOf = useCallback(
    (c: Couple) => {
      const list = blessings[c.id] ?? [];
      const people = [...new Set([...list.map((b) => b.by), ...(c.blessedBy ?? [])])];
      return { count: (c.blessings ?? 0) + list.length, people, list };
    },
    [blessings],
  );
  // Demo: friends bless your couple now and then
  const myCoupleId = myCouple?.id;
  const live = useRef(myCouple);
  useEffect(() => {
    live.current = myCouple;
  }, [myCouple]);
  useEffect(() => {
    if (!myCoupleId) return;
    let count = 0;
    const t = window.setInterval(() => {
      const c = live.current;
      if (!c || count >= 3 || Math.random() < 0.5) return;
      const pool = PEOPLE.filter((p) => p.id !== c.a && p.id !== c.b);
      const by = pool[Math.floor(Math.random() * pool.length)].id;
      count++;
      addBlessing(c.id, by);
      toast(`🙏 ${nameOf(by)} blessed you and ${nameOf(partnerOf(c))}`, "gold");
    }, 35_000);
    return () => window.clearInterval(t);
  }, [myCoupleId, addBlessing, toast]);

  const endCouple = useCallback(() => {
    if (!myCouple) return;
    toast(`You and ${nameOf(partnerOf(myCouple))} are no longer a CP`);
    setMyCouple(null);
  }, [myCouple, toast]);

  /* ---- Profile visitors ---- */
  // Names stay hidden until you buy the visitor log
  const logUntil = useRef(visitorLogUntil);
  logUntil.current = visitorLogUntil;
  const addVisitor = useCallback(
    (id: string) => {
      setVisitors((list) => addVisit(list, id));
      toast(logUntil.current > Date.now() ? `👀 ${nameOf(id)} visited your profile` : "👀 Someone visited your profile. Unlock the visitor log to see who.");
    },
    [toast],
  );

  /** Opening someone's profile leaves your footprint there; sometimes they visit back. */
  const recordVisit = useCallback(
    (id: string) => {
      if (id === ME_ID) return;
      setVisited((list) => addVisit(list, id));
      if (Math.random() < 0.4) window.setTimeout(() => addVisitor(id), 6000 + Math.random() * 6000);
    },
    [addVisitor],
  );

  // Demo: people online now and then drop by your profile (a few per session)
  useEffect(() => {
    let count = 0;
    const visit = () => {
      const online = PEOPLE.filter((p) => p.online);
      if (count >= 4 || !online.length) return;
      count++;
      addVisitor(online[Math.floor(Math.random() * online.length)].id);
    };
    const first = window.setTimeout(visit, 20_000);
    const t = window.setInterval(() => Math.random() < 0.5 && visit(), 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [addVisitor]);

  const newVisitors = useMemo(() => visitors.filter((v) => v.at > visitorsSeenAt).length, [visitors, visitorsSeenAt]);
  const markVisitorsSeen = useCallback(() => setVisitorsSeenAt(Date.now()), []);

  const visitorLogOn = visitorLogUntil > now;
  /** Buy a visitor log plan with coins. Buying while one is on adds the days to it. */
  const buyVisitorLog = useCallback(
    (plan: VisitorLogPlanId) => {
      const p = VISITOR_LOG_PLANS.find((x) => x.id === plan);
      if (!p) return false;
      if (!spend(p.price)) {
        toast("Not enough demo coins", "error");
        return false;
      }
      setVisitorLogUntil((until) => Math.max(until, Date.now()) + p.days * DAY_MS);
      setNow(Date.now());
      toast(`Visitor log unlocked for ${p.label} 👀`, "gold");
      return true;
    },
    [spend, toast],
  );

  return { equip, worn, vipSets, giftSets, vipEffects, wearAnimFrame, wearBubble, wearEntry, wearPage, effectsFor, buyBubble, pkg, addPackage, takePackage, visitors, visited, visitorsSeenAt, newVisitors, markVisitorsSeen, recordVisit, visitorLogUntil, visitorLogOn, buyVisitorLog, bag, now, buyRing, ringsInBag, couples, coupleOf, myCouple, pending, propose, giveRing, endCouple, buyRingForCouple, bless, blessingsOf };
}

const partnerOf = (c: Couple) => (c.a === ME_ID ? c.b : c.a);

export type MarketState = ReturnType<typeof useMarketState>;
const Ctx = createContext<MarketState | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const state = useMarketState();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useMarket() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMarket must be used inside MarketProvider");
  return v;
}
