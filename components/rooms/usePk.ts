"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { PEOPLE } from "@/lib/app/data";
import { charmFromCoins } from "@/lib/app/progress";
import { ME_ID, useApp } from "@/lib/app/store";
import type { RoomSession } from "./useRoomSession";

/**
 * PK battles in a voice room: red against blue.
 * 1v1: the two top seats face off. Multiplayer: the owner's seat and the left
 * pairs are red, the partner seat and the right pairs are blue.
 * Rules: by gifts (1 charm received = 1 score) or by votes (PK support: each
 * listener backs one side). The owner or an admin sets it up, starts it and can
 * close it; it ends on its own when the time is up.
 */
export type PkMode = "1v1" | "team";
export type PkRule = "gifts" | "votes";
export type PkSide = "red" | "blue";
export const PK_MINUTES = [3, 5, 10, 15, 30, 60] as const;

export type Pk = {
  mode: PkMode;
  rule: PkRule;
  minutes: number;
  phase: "ready" | "live" | "done";
  endsAt: number;
  red: number;
  blue: number;
  /** Who gave each side its score, for the top supporters row. */
  backers: Record<PkSide, Record<string, number>>;
  myVote: PkSide | null;
  winner: PkSide | "draw" | null;
};

/** Which side a seat is on, or null. Seats 2+ come in pairs laid out two pairs per row. */
export function sideOfSeat(mode: PkMode, index: number): PkSide | null {
  if (index === 0) return "red";
  if (index === 1) return "blue";
  if (mode === "1v1") return null;
  return Math.floor((index - 2) / 2) % 2 === 0 ? "red" : "blue";
}

const RULE_TEXT: Record<PkRule, string> = { gifts: "based on Charm received from gifts", votes: "based on votes from the room (PK support)" };
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export function usePk(s: RoomSession) {
  const { profile } = useApp();
  const [pk, setPk] = useState<Pk | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const live = useRef(pk);
  useEffect(() => {
    live.current = pk;
  }, [pk]);
  const seatsRef = useRef(s.seats);
  useEffect(() => {
    seatsRef.current = s.seats;
  }, [s.seats]);
  const name = profile.name;

  const setup = useCallback(
    (mode: PkMode, rule: PkRule, minutes: number) => {
      setPk({ mode, rule, minutes, phase: "ready", endsAt: 0, red: 0, blue: 0, backers: { red: {}, blue: {} }, myVote: null, winner: null });
      s.addSystem(`${name} set up a ${mode === "1v1" ? "1v1" : "Multiplayer"} PK for ${minutes} min. Take a PK seat: red or blue!`);
    },
    [s, name],
  );
  const start = useCallback(() => {
    setPk((p) => (p && p.phase === "ready" ? { ...p, phase: "live", endsAt: Date.now() + p.minutes * 60_000 } : p));
    const p = live.current;
    if (p) s.addSystem(`${name} has started a PK. The rule for this round is ${RULE_TEXT[p.rule]}.`);
  }, [s, name]);
  const close = useCallback(() => {
    setPk(null);
    s.addSystem(`${name} closed the PK.`);
  }, [s, name]);
  const dismiss = useCallback(() => setPk(null), []);

  const score = useCallback((side: PkSide, by: string, points: number) => {
    setPk((p) => {
      if (!p || p.phase !== "live") return p;
      const backers = { ...p.backers, [side]: { ...p.backers[side], [by]: (p.backers[side][by] ?? 0) + points } };
      return { ...p, [side]: p[side] + points, backers };
    });
  }, []);

  /** PK support: your one vote this round. */
  const vote = useCallback(
    (side: PkSide) => {
      const p = live.current;
      if (!p || p.phase !== "live" || p.rule !== "votes" || p.myVote) return;
      setPk((x) => (x ? { ...x, myVote: side } : x));
      score(side, ME_ID, 1);
    },
    [score],
  );

  // Gifts to someone on a PK seat score for their side
  useEffect(() => {
    s.pkListener.current = (fromId, toId, value) => {
      const p = live.current;
      if (!p || p.phase !== "live" || p.rule !== "gifts") return;
      const seat = seatsRef.current.indexOf(toId);
      const side = seat >= 0 ? sideOfSeat(p.mode, seat) : null;
      if (side) score(side, fromId, Math.max(1, Math.floor(charmFromCoins(value))));
    };
    return () => {
      s.pkListener.current = null;
    };
  }, [s.pkListener, score]);

  // The clock, and the end of the round
  const phase = pk?.phase;
  useEffect(() => {
    if (phase !== "live") return;
    const t = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      const p = live.current;
      if (p && p.phase === "live" && at >= p.endsAt) {
        const winner: Pk["winner"] = p.red === p.blue ? "draw" : p.red > p.blue ? "red" : "blue";
        setPk({ ...p, phase: "done", winner });
        s.addSystem(winner === "draw" ? `PK over: it's a draw at ${p.red.toLocaleString("en-IN")} each!` : `PK over: ${winner === "red" ? "Red" : "Blue"} team wins ${Math.max(p.red, p.blue).toLocaleString("en-IN")} to ${Math.min(p.red, p.blue).toLocaleString("en-IN")}! 🏆`);
      }
    }, 500);
    return () => window.clearInterval(t);
  }, [phase, s]);

  // Demo: the room joins in while the PK is live
  useEffect(() => {
    if (phase !== "live") return;
    const t = window.setInterval(() => {
      const p = live.current;
      if (!p) return;
      const crowd = PEOPLE.filter((x) => x.online).map((x) => x.id);
      if (p.rule === "votes") {
        // A listener backs a side now and then
        if (Math.random() < 0.6) score(Math.random() < 0.5 ? "red" : "blue", pick(crowd), 1);
        return;
      }
      // Gift PKs are scored by real gifts only: the demo crowd no longer sends the small default gifts
    }, 2600);
    return () => window.clearInterval(t);
  }, [phase, score]);

  return { pk, now, setup, start, close, dismiss, vote };
}

export type PkState = ReturnType<typeof usePk>;
export const PkContext = createContext<PkState | null>(null);
export const usePkState = () => useContext(PkContext);
