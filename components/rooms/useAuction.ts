"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SERVER_USER_PREFIX, useServerRooms } from "@/lib/app/server-rooms";
import { auctionApi, readAuction, roomAuctionTopic, type ServerAuction } from "@/lib/api/room-games";
import { subscribe } from "@/lib/realtime/stomp";
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
 * Backend rooms: the server runs it (seat, timer, real gifts as bids, winner,
 * tags) and everyone sees the same auction. Demo rooms: in rooms you don't
 * moderate, the owner's side and other people's gifts are simulated.
 */
export function useAuction(s: RoomSession) {
  const { toast, formTag, loadServerTags } = useApp();
  const person = usePeople();
  const active = s.mode === "kharidari";
  const serverId = s.room.server?.id ?? null;
  const { myId } = useServerRooms();
  const [localA, setA] = useState<AuctionState>({
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
  /* ---- Backend rooms: the server's auction ---- */
  const [srv, setSrv] = useState<ServerAuction | null>(null);
  const srvVersion = useRef(-1);
  const srvReported = useRef(-1);
  const offset = useRef(0);
  const pid = useCallback((u: string) => (u === myId ? ME_ID : `${SERVER_USER_PREFIX}${u}`), [myId]);
  const nm = useCallback((id: string) => (id === ME_ID ? "You" : person(id).name), [person]);
  const applySrv = useCallback(
    (m: ServerAuction, broadcast: boolean) => {
      offset.current = m.serverTime - Date.now();
      const report = broadcast && m.event && m.version > srvReported.current;
      if (report) srvReported.current = m.version;
      if (m.version >= srvVersion.current) {
        srvVersion.current = m.version;
        setSrv(m);
      }
      if (!report || !m.event) return;
      const ss = sRef.current;
      const item = m.itemId ? pid(m.itemId) : null;
      const actor = m.event.actorId ? pid(m.event.actorId) : null;
      const rel = relationshipById((RELATIONSHIPS.some((r) => r.id === m.relation) ? m.relation : "besties") as RelationshipId);
      const prizeText = m.mode === "bff" ? rel.label : m.offer;
      switch (m.event.type) {
        case "SAT":
          if (item) ss.addSystem(`${nm(item)} sat on the auction seat`);
          break;
        case "DECLARED":
          if (item) ss.addSystem(`${nm(item)} declared: ${rel.label}${m.declaration ? `. “${m.declaration}”` : ""}`);
          break;
        case "STARTED":
          if (item && m.startGiftId) {
            const g = giftById(m.startGiftId as GiftId);
            ss.addSystem(`🔨 Kharidari started (${m.mode === "bff" ? "BFF" : "Ordinary bidding"}): ${item === ME_ID ? "you" : person(item).name} for ${prizeText}. Starting price: ${g.name} (${m.startPrice})`);
          }
          break;
        case "NO_SALE":
          if (actor) ss.addSystem(`No bids reached the starting price for ${nm(actor)}. Kharidari closed.`);
          break;
        case "SOLD": {
          if (!m.winner || !item) break;
          const winner = pid(m.winner.userId);
          const volume = m.winner.total.toLocaleString("en-IN");
          const itemName = item === ME_ID ? "you" : person(item).name;
          if (m.mode === "bff" && m.tagResult) {
            const kind = m.tagResult.kind;
            if (kind === "new") ss.addSystem(`🎉 ${nm(winner)} won ${itemName} with ${volume} of gifts. New tag: ${rel.label}!`);
            else if (kind === "existing") ss.addSystem(`🎉 ${nm(winner)} won ${itemName} again. Their ${volume} of gifts went into their tag's intimacy.`);
            else ss.addSystem(`🎉 ${nm(winner)} won ${itemName} with ${volume} of gifts, but an intimate space is full, so no new tag.`);
            if (winner === ME_ID || item === ME_ID) {
              const other = nm(winner === ME_ID ? item : winner);
              toast(kind === "new" ? `You and ${other} are now ${rel.label}` : kind === "existing" ? `+${volume} intimacy with ${other}` : "Your intimate space is full. Remove a tag to make room.", kind === "full" ? "error" : "gold");
              void loadServerTags("me");
            }
          } else {
            ss.addSystem(`🎉 ${nm(winner)} won “${m.offer}” from ${itemName} with ${volume} of gifts`);
            if (winner === ME_ID) toast(`You won “${m.offer}” from ${person(item).name}`, "gold");
            else if (item === ME_ID) toast(`${person(winner).name} won “${m.offer}” from you!`, "gold");
          }
          break;
        }
        default:
          break;
      }
    },
    [pid, nm, person, toast, loadServerTags],
  );
  useEffect(() => {
    srvVersion.current = -1;
    srvReported.current = -1;
    setSrv(null);
    if (!serverId) return;
    let off = false;
    auctionApi
      .get(serverId)
      .then((m) => !off && applySrv(m, false))
      .catch(() => {});
    const stop = subscribe(roomAuctionTopic(serverId), (body) => {
      const m = readAuction(body);
      if (m && m.roomId === serverId) applySrv(m, true);
    });
    return () => {
      off = true;
      stop();
    };
  }, [serverId]); // eslint-disable-line react-hooks/exhaustive-deps

  const serverA = useMemo<AuctionState | null>(() => {
    if (!srv) return null;
    return {
      phase: srv.phase,
      itemId: srv.itemId ? pid(srv.itemId) : null,
      mode: srv.mode,
      relation: (RELATIONSHIPS.some((r) => r.id === srv.relation) ? srv.relation : "besties") as RelationshipId,
      declaration: srv.declaration,
      offer: srv.offer,
      startGift: (srv.startGiftId as GiftId) ?? null,
      endsAt: srv.endsAt ? srv.endsAt - offset.current : 0,
      bids: srv.bids.map((b) => ({ id: pid(b.userId), total: b.total })),
      winner: srv.winner ? { id: pid(srv.winner.userId), total: srv.winner.total } : null,
      tagResult: srv.tagResult ? { kind: srv.tagResult.kind, token: (["bicycle", "scooter", "cottage"].includes(srv.tagResult.token) ? srv.tagResult.token : "bicycle") as TokenId } : null,
    };
  }, [srv, pid]);
  const a: AuctionState = serverId ? (serverA ?? { ...localA, phase: "idle", itemId: null, bids: [], winner: null, tagResult: null }) : localA;

  const server = useCallback(
    (run: (id: string) => Promise<ServerAuction>) => {
      if (!serverId) return;
      run(serverId)
        .then((m) => applySrv(m, false))
        .catch((e) => toast(e instanceof Error && e.message ? e.message : "That didn't work. Try again.", "error"));
    },
    [serverId, applySrv, toast],
  );

  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(a);
  ref.current = a;
  const sRef = useRef(s);
  sRef.current = s;

  const top = a.bids[0] ?? null;
  const startPrice = serverId && srv ? srv.startPrice : a.startGift ? giftById(a.startGift).cost : 0;
  const myTotal = a.bids.find((b) => b.id === ME_ID)?.total ?? 0;
  const secondsLeft = a.phase === "bidding" ? Math.max(0, Math.ceil((a.endsAt - now) / 1000)) : 0;
  const nameOf = useCallback((id: string) => (id === ME_ID ? "You" : person(id).name), [person]);
  const prize = (st: AuctionState) => (st.mode === "bff" ? relationshipById(st.relation).label : st.offer);

  // Gifts sent to the auction seat while bidding is open are bids
  useEffect(() => {
    // Backend rooms: the server counts real gifts as bids
    if (serverId) return;
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
  }, [s.giftListener, serverId]);

  const sitOnAuction = useCallback(
    (id: string) => {
      const st = ref.current;
      if (st.phase !== "idle" || st.itemId) return;
      // The owner's seat is fixed, so the owner can't move onto the auction seat
      if (id === sRef.current.room.hostId) {
        if (id === ME_ID) toast("Your owner seat is fixed. Seat someone else on the auction seat.");
        return;
      }
      if (serverId) {
        const uid = id === ME_ID ? undefined : id.startsWith(SERVER_USER_PREFIX) ? id.slice(SERVER_USER_PREFIX.length) : null;
        if (uid !== null) server((rid) => auctionApi.sit(rid, uid));
        return;
      }
      sRef.current.vacate(id);
      // Other people declare their tag straight away; you set yours from the auction seat
      const sim = id !== ME_ID;
      setA((x) => ({ ...x, itemId: id, winner: null, bids: [], tagResult: null, declaration: sim ? pick(DECLARATIONS) : "", relation: sim ? pick(RELATIONSHIPS).id : x.relation }));
      sRef.current.addSystem(`${nameOf(id)} sat on the auction seat`);
    },
    [nameOf, toast, serverId, server],
  );

  const leaveAuction = useCallback(() => {
    if (ref.current.phase === "bidding") {
      toast("You can't leave the auction seat while bidding is open");
      return;
    }
    if (serverId) return server((rid) => auctionApi.leave(rid));
    setA((x) => ({ ...x, itemId: null, phase: "idle", winner: null, bids: [], tagResult: null, declaration: "" }));
  }, [toast, serverId, server]);

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
      if (serverId) return server((rid) => auctionApi.declare(rid, relation, text));
      setA((x) => ({ ...x, relation, declaration: text }));
      const rel = relationshipById(relation);
      sRef.current.addSystem(`You declared: ${rel.label}${text ? `. “${text}”` : ""}`);
    },
    [toast, serverId, server],
  );

  const configure = useCallback(
    (patch: Partial<Pick<AuctionState, "mode" | "offer" | "startGift">>) => {
      if (serverId) return server((rid) => auctionApi.configure(rid, { mode: patch.mode, offer: patch.offer, startGiftId: patch.startGift ?? undefined }));
      setA((x) => (x.phase === "bidding" ? x : { ...x, ...patch }));
    },
    [serverId, server],
  );

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
      if (serverId) {
        if (by === "me") server((rid) => auctionApi.start(rid));
        return;
      }
      setA((x) => ({ ...x, phase: "bidding", endsAt: Date.now() + ROUND_MS, bids: [], winner: null, tagResult: null }));
      const g = giftById(st.startGift);
      sRef.current.addSystem(
        `🔨 Kharidari started (${st.mode === "bff" ? "BFF" : "Ordinary bidding"}): ${st.itemId === ME_ID ? "you" : person(st.itemId).name} for ${prize(st)}. Starting price: ${g.name} (${g.cost})`,
      );
    },
    [toast, person, serverId, server],
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
    if (serverId) return server((rid) => auctionApi.end(rid));
    finish();
  }, [finish, serverId, server]);

  // Clock
  useEffect(() => {
    if (!active || a.phase !== "bidding") return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [active, a.phase]);

  // Close the round when the timer runs out (backend rooms: the server does)
  useEffect(() => {
    if (!serverId && active && a.phase === "bidding" && now >= a.endsAt) finish();
  }, [active, a.phase, a.endsAt, now, finish, serverId]);

  // After a sale, the auction seat clears for the next round (backend rooms: the server does)
  useEffect(() => {
    if (serverId || a.phase !== "sold") return;
    const t = window.setTimeout(() => setA((x) => ({ ...x, phase: "idle", itemId: null, bids: [], winner: null, tagResult: null })), 9000);
    return () => window.clearTimeout(t);
  }, [a.phase, serverId]);

  // Simulated room: someone sits on the auction seat, the owner starts a round, people send gifts
  useEffect(() => {
    if (!active || serverId) return;
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
  }, [active, sitOnAuction, start, serverId]);

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
