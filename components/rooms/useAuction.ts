"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GIFTS, giftById } from "@/lib/app/data";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import { DECLARATIONS, DECLARATION_MAX, ORDINARY_OFFERS, RELATIONSHIPS, relationshipById, tokenFor, type RelationshipId, type TokenId } from "@/lib/app/tags";
import type { GiftId } from "@/lib/app/types";
import type { RoomSession } from "./useRoomSession";

export type AuctionMode = "ordinary" | "bff";
/** Gifts the owner can pick as the starting price. */
export const START_GIFTS: GiftId[] = GIFTS.filter((g) => !g.packageOnly).map((g) => g.id);

/** A bidder's gift volume: the coin value of every gift they sent to the auction seat this round. */
export type Bid = { id: string; total: number };
export type AuctionPhase = "idle" | "bidding" | "sold";
export type AuctionState = {
  phase: AuctionPhase;
  /** Who is sitting on the auction seat. */
  itemId: string | null;
  mode: AuctionMode;
  relation: RelationshipId;
  /** The tag declaration, set by the person on the auction seat. */
  declaration: string;
  /** What's on offer in Ordinary bidding. */
  offer: string;
  /** The starting price is a gift. A bid must reach at least its value. */
  startGift: GiftId | null;
  endsAt: number;
  /** Highest first. */
  bids: Bid[];
  winner: Bid | null;
  /** BFF only: what happened to the tag when the round closed. */
  tagResult: null | { kind: "new" | "existing" | "full"; token: TokenId };
};

const ROUND_MS = 45_000;
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Kharidari, WePlay style. Someone sits on the auction seat and declares the tag they
 * want (relationship and a short declaration). The owner or an admin picks Ordinary
 * bidding or BFF and a starting price gift. Bids are
 * gifts: every gift sent to the person on the auction seat adds to the sender's gift
 * volume, and gifts are not refunded. The biggest gift volume when the timer ends
 * wins. In BFF mode the winner and the person on the seat become a tag.
 *
 * In rooms you don't moderate, the owner's side and other people's gifts are simulated.
 */
export function useAuction(s: RoomSession) {
  const { toast, formTag } = useApp();
  const person = usePeople();
  const active = s.mode === "kharidari";
  const [a, setA] = useState<AuctionState>({
    phase: "idle",
    itemId: null,
    mode: "bff",
    relation: "besties",
    declaration: "",
    offer: ORDINARY_OFFERS[0],
    startGift: null,
    endsAt: 0,
    bids: [],
    winner: null,
    tagResult: null,
  });
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(a);
  ref.current = a;
  const sRef = useRef(s);
  sRef.current = s;

  const top = a.bids[0] ?? null;
  const startPrice = a.startGift ? giftById(a.startGift).cost : 0;
  const myTotal = a.bids.find((b) => b.id === ME_ID)?.total ?? 0;
  const secondsLeft = a.phase === "bidding" ? Math.max(0, Math.ceil((a.endsAt - now) / 1000)) : 0;
  const nameOf = useCallback((id: string) => (id === ME_ID ? "You" : person(id).name), [person]);
  const prize = (st: AuctionState) => (st.mode === "bff" ? relationshipById(st.relation).label : st.offer);

  // Gifts sent to the auction seat while bidding is open are bids
  useEffect(() => {
    s.giftListener.current = (fromId, toId, value) => {
      setA((st) => {
        if (st.phase !== "bidding" || toId !== st.itemId || fromId === st.itemId) return st;
        const total = (st.bids.find((b) => b.id === fromId)?.total ?? 0) + value;
        const bids = [{ id: fromId, total }, ...st.bids.filter((b) => b.id !== fromId)].sort((x, y) => y.total - x.total);
        // A late bid keeps the round open for at least 10 more seconds
        return { ...st, bids, endsAt: Math.max(st.endsAt, Date.now() + 10_000) };
      });
    };
    return () => {
      s.giftListener.current = null;
    };
  }, [s.giftListener]);

  const sitOnAuction = useCallback(
    (id: string) => {
      const st = ref.current;
      if (st.phase !== "idle" || st.itemId) return;
      // The owner's seat is fixed, so the owner can't move onto the auction seat
      if (id === sRef.current.room.hostId) {
        if (id === ME_ID) toast("Your owner seat is fixed. Seat someone else on the auction seat.");
        return;
      }
      sRef.current.vacate(id);
      // Other people declare their tag straight away; you set yours from the auction seat
      const sim = id !== ME_ID;
      setA((x) => ({ ...x, itemId: id, winner: null, bids: [], tagResult: null, declaration: sim ? pick(DECLARATIONS) : "", relation: sim ? pick(RELATIONSHIPS).id : x.relation }));
      sRef.current.addSystem(`${nameOf(id)} sat on the auction seat`);
    },
    [nameOf, toast],
  );

  const leaveAuction = useCallback(() => {
    if (ref.current.phase === "bidding") {
      toast("You can't leave the auction seat while bidding is open");
      return;
    }
    setA((x) => ({ ...x, itemId: null, phase: "idle", winner: null, bids: [], tagResult: null, declaration: "" }));
  }, [toast]);

  /** The person on the auction seat declares the tag they want before bidding starts. */
  const declare = useCallback(
    (relation: RelationshipId, declaration: string) => {
      const st = ref.current;
      if (st.itemId !== ME_ID) return;
      if (st.phase === "bidding") {
        toast("You can't change your declaration while bidding is open");
        return;
      }
      const text = declaration.trim().slice(0, DECLARATION_MAX);
      setA((x) => ({ ...x, relation, declaration: text }));
      const rel = relationshipById(relation);
      sRef.current.addSystem(`You declared: ${rel.label}${text ? `. “${text}”` : ""}`);
    },
    [toast],
  );

  const configure = useCallback((patch: Partial<Pick<AuctionState, "mode" | "offer" | "startGift">>) => {
    setA((x) => (x.phase === "bidding" ? x : { ...x, ...patch }));
  }, []);

  const start = useCallback(
    (by: "me" | "sim" = "me") => {
      const st = ref.current;
      if (st.phase === "bidding") return;
      if (!st.itemId) {
        if (by === "me") toast("Seat someone on the auction seat first");
        return;
      }
      if (by === "me" && !sRef.current.canModerate) {
        toast("Only the owner or an admin can start Kharidari");
        return;
      }
      if (!st.startGift) {
        if (by === "me") toast("Pick a starting price gift in Settings first");
        return;
      }
      setA((x) => ({ ...x, phase: "bidding", endsAt: Date.now() + ROUND_MS, bids: [], winner: null, tagResult: null }));
      const g = giftById(st.startGift);
      sRef.current.addSystem(
        `🔨 Kharidari started (${st.mode === "bff" ? "BFF" : "Ordinary bidding"}): ${st.itemId === ME_ID ? "you" : person(st.itemId).name} for ${prize(st)}. Starting price: ${g.name} (${g.cost})`,
      );
    },
    [toast, person],
  );

  const finish = useCallback(() => {
    const st = ref.current;
    if (st.phase !== "bidding" || !st.itemId) return;
    const ss = sRef.current;
    const item = st.itemId;
    // A bidder only qualifies once their gift volume reaches the starting price
    const qualified = st.bids.filter((b) => b.total >= (st.startGift ? giftById(st.startGift).cost : 0));
    const winner = qualified[0] ?? null;
    if (!winner) {
      ss.addSystem(`No bids reached the starting price for ${nameOf(item)}. Kharidari closed.`);
      setA((x) => ({ ...x, phase: "idle", bids: [], winner: null }));
      return;
    }
    const volume = winner.total.toLocaleString("en-IN");
    let tagResult: AuctionState["tagResult"] = null;
    if (st.mode === "bff") {
      const rel = relationshipById(st.relation);
      const kind = formTag(winner.id, item, st.relation, winner.total, ss.room.name, st.declaration || undefined);
      tagResult = { kind, token: tokenFor(winner.total) };
      const itemName = item === ME_ID ? "you" : person(item).name;
      if (kind === "new") ss.addSystem(`🎉 ${nameOf(winner.id)} won ${itemName} with ${volume} of gifts. New tag: ${rel.label}!`);
      else if (kind === "existing") ss.addSystem(`🎉 ${nameOf(winner.id)} won ${itemName} again. Their ${volume} of gifts went into their tag's intimacy.`);
      else ss.addSystem(`🎉 ${nameOf(winner.id)} won ${itemName} with ${volume} of gifts, but an intimate space is full, so no new tag.`);
      if (winner.id === ME_ID || item === ME_ID) {
        const other = nameOf(winner.id === ME_ID ? item : winner.id);
        toast(
          kind === "new" ? `You and ${other} are now ${rel.label}` : kind === "existing" ? `+${volume} intimacy with ${other}` : "Your intimate space is full. Remove a tag to make room.",
          kind === "full" ? "error" : "gold",
        );
      }
    } else {
      ss.addSystem(`🎉 ${nameOf(winner.id)} won “${st.offer}” from ${item === ME_ID ? "you" : person(item).name} with ${volume} of gifts`);
      if (winner.id === ME_ID) toast(`You won “${st.offer}” from ${person(item).name}`, "gold");
      else if (item === ME_ID) toast(`${person(winner.id).name} won “${st.offer}” from you!`, "gold");
    }
    setA((x) => ({ ...x, phase: "sold", winner, tagResult }));
  }, [nameOf, person, toast, formTag]);

  const endNow = useCallback(() => {
    if (!sRef.current.canModerate) return;
    finish();
  }, [finish]);

  // Clock
  useEffect(() => {
    if (!active || a.phase !== "bidding") return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [active, a.phase]);

  // Close the round when the timer runs out
  useEffect(() => {
    if (active && a.phase === "bidding" && now >= a.endsAt) finish();
  }, [active, a.phase, a.endsAt, now, finish]);

  // After a sale, the auction seat clears for the next round
  useEffect(() => {
    if (a.phase !== "sold") return;
    const t = window.setTimeout(() => setA((x) => ({ ...x, phase: "idle", itemId: null, bids: [], winner: null, tagResult: null })), 9000);
    return () => window.clearTimeout(t);
  }, [a.phase]);

  // Simulated room: someone sits on the auction seat, the owner starts a round, people send gifts
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => {
      const st = ref.current;
      const ss = sRef.current;
      const crowd = [...ss.seatedIds, ...ss.listenerIds].filter((id) => id !== ME_ID && id !== st.itemId);
      if (st.phase === "idle" && !ss.canModerate) {
        if (!st.itemId) {
          const candidates = crowd.filter((id) => id !== ss.room.hostId);
          if (candidates.length && Math.random() < 0.5) sitOnAuction(pick(candidates));
        } else if (Math.random() < 0.6) {
          setA((x) => ({
            ...x,
            mode: Math.random() < 0.75 ? "bff" : "ordinary",
            offer: pick(ORDINARY_OFFERS),
            startGift: pick(START_GIFTS.slice(0, 3)),
          }));
          window.setTimeout(() => start("sim"), 50);
        }
      } else if (st.phase === "bidding" && st.itemId && st.startGift) {
        const leader = st.bids[0];
        const cap = giftById(st.startGift).cost * 30;
        const chance = leader?.id === ME_ID ? 0.6 : 0.45;
        const bidder = pick(crowd.filter((id) => id !== leader?.id));
        if (!bidder || Math.random() > chance) return;
        const have = st.bids.find((b) => b.id === bidder)?.total ?? 0;
        const need = Math.max(giftById(st.startGift).cost, (leader?.total ?? 0) + 1) - have;
        if (have + need > cap) return;
        // Smallest gift that overtakes in a single send, else several of a cheaper one
        const g = GIFTS.find((x) => x.cost >= need && x.cost <= need * 3) ?? GIFTS.filter((x) => x.cost <= Math.max(need, 10)).at(-1) ?? GIFTS[0];
        const count = Math.min(99, Math.max(1, Math.ceil(need / g.cost)));
        ss.simGift(bidder, g.id, st.itemId, count);
      }
    }, 3000);
    return () => window.clearInterval(t);
  }, [active, sitOnAuction, start]);

  /** Send a gift to the person on the auction seat. Spends your coins right away. */
  const bid = useCallback(
    (giftId: GiftId, count = 1) => {
      const st = ref.current;
      if (st.phase !== "bidding" || !st.itemId) return;
      if (st.itemId === ME_ID) {
        toast("You can't bid on yourself");
        return;
      }
      sRef.current.sendGift(giftId, st.itemId, count);
    },
    [toast],
  );

  return { ...a, active, top, startPrice, myTotal, secondsLeft, bid, start, endNow, configure, declare, sitOnAuction, leaveAuction, roundMs: ROUND_MS };
}

export type Auction = ReturnType<typeof useAuction>;
