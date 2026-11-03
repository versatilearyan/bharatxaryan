"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PEOPLE } from "@/lib/app/data";
import { charmFromCoins } from "@/lib/app/progress";
import { ME_ID, useApp } from "@/lib/app/store";
import { usePeople } from "@/lib/app/people";
import { SERVER_USER_PREFIX, useServerRooms } from "@/lib/app/server-rooms";
import { pkApi, readPk, roomPkTopic, type PkMessage } from "@/lib/api/room-games";
import { subscribe } from "@/lib/realtime/stomp";
import type { RoomSession } from "./useRoomSession";

/**
 * PK battles in a voice room: red against blue.
 * 1v1: the two top seats face off. Multiplayer: the owner's seat and the left
 * pairs are red, the partner seat and the right pairs are blue.
 * Rules: by gifts (1 charm received = 1 score) or by votes (PK support: each
 * listener backs one side). The owner or an admin sets it up, starts it and can
 * close it; it ends on its own when the time is up.
 *
 * Backend rooms: the server runs the battle (its timer, scores from real
 * gifts, one vote each) and everyone sees the same one. Demo rooms: local.
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
const endText = (p: Pick<Pk, "red" | "blue">, winner: Pk["winner"]) =>
  winner === "draw"
    ? `PK over: it's a draw at ${p.red.toLocaleString("en-IN")} each!`
    : `PK over: ${winner === "red" ? "Red" : "Blue"} team wins ${Math.max(p.red, p.blue).toLocaleString("en-IN")} to ${Math.min(p.red, p.blue).toLocaleString("en-IN")}! 🏆`;

export function usePk(s: RoomSession) {
  const { profile, toast } = useApp();
  const person = usePeople();
  const { myId } = useServerRooms();
  const serverId = s.room.server?.id ?? null;
  const [localPk, setPk] = useState<Pk | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const seatsRef = useRef(s.seats);
  useEffect(() => {
    seatsRef.current = s.seats;
  }, [s.seats]);
  const name = profile.name;

  /* ---- Backend rooms: the server's battle ---- */
  const [srv, setSrv] = useState<PkMessage | null>(null);
  const srvVersion = useRef(-1);
  const srvReported = useRef(-1);
  /** Server clock minus this device's clock. */
  const offset = useRef(0);
  /** A finished battle you closed on your screen. */
  const [hiddenVersion, setHiddenVersion] = useState(-1);
  const pid = useCallback((u: string) => (u === myId ? ME_ID : `${SERVER_USER_PREFIX}${u}`), [myId]);
  const who = useCallback((u?: string) => (!u ? "Someone" : u === myId ? name : person(pid(u)).name), [myId, name, person, pid]);
  const applySrv = useCallback(
    (m: PkMessage, broadcast: boolean) => {
      offset.current = m.serverTime - Date.now();
      const report = broadcast && m.event && m.version > srvReported.current;
      if (report) srvReported.current = m.version;
      if (m.version >= srvVersion.current) {
        srvVersion.current = m.version;
        setSrv(m);
      }
      if (!report || !m.event) return;
      const p = m.pk;
      const by = who(m.event.actorId);
      if (m.event.type === "SETUP" && p) s.addSystem(`${by} set up a ${p.mode === "1v1" ? "1v1" : "Multiplayer"} PK for ${p.minutes} min. Take a PK seat: red or blue!`);
      else if (m.event.type === "STARTED" && p) s.addSystem(`${by} has started a PK. The rule for this round is ${RULE_TEXT[p.rule]}.`);
      else if (m.event.type === "CLOSED") s.addSystem(`${by} closed the PK.`);
      else if (m.event.type === "ENDED" && p) s.addSystem(endText(p, p.winner));
    },
    [who, s],
  );
  useEffect(() => {
    srvVersion.current = -1;
    srvReported.current = -1;
    setSrv(null);
    if (!serverId) return;
    let off = false;
    pkApi
      .get(serverId)
      .then((m) => !off && applySrv(m, false))
      .catch(() => {});
    const stop = subscribe(roomPkTopic(serverId), (body) => {
      const m = readPk(body);
      if (m && m.roomId === serverId) applySrv(m, true);
    });
    return () => {
      off = true;
      stop();
    };
  }, [serverId]); // eslint-disable-line react-hooks/exhaustive-deps

  const serverPk = useMemo<Pk | null>(() => {
    const p = srv?.pk;
    if (!p || (p.phase === "done" && srv.version === hiddenVersion)) return null;
    const map = (r: Record<string, number>) => Object.fromEntries(Object.entries(r).map(([u, v]) => [pid(u), v]));
    return {
      mode: p.mode,
      rule: p.rule,
      minutes: p.minutes,
      phase: p.phase,
      // The server's end time on this device's clock
      endsAt: p.endsAt ? p.endsAt - offset.current : 0,
      red: p.red,
      blue: p.blue,
      backers: { red: map(p.backers.red), blue: map(p.backers.blue) },
      myVote: myId ? (p.votes[myId] ?? null) : null,
      winner: p.winner,
    };
  }, [srv, hiddenVersion, pid, myId]);

  const pk = serverId ? serverPk : localPk;
  const live = useRef(pk);
  useEffect(() => {
    live.current = pk;
  }, [pk]);

  const server = useCallback(
    (run: (id: string) => Promise<PkMessage>) => {
      if (!serverId) return;
      run(serverId)
        .then((m) => applySrv(m, false))
        .catch((e) => toast(e instanceof Error && e.message ? e.message : "That didn't work. Try again.", "error"));
    },
    [serverId, applySrv, toast],
  );

  const setup = useCallback(
    (mode: PkMode, rule: PkRule, minutes: number) => {
      if (serverId) return server((id) => pkApi.setup(id, mode, rule, minutes));
      setPk({ mode, rule, minutes, phase: "ready", endsAt: 0, red: 0, blue: 0, backers: { red: {}, blue: {} }, myVote: null, winner: null });
      s.addSystem(`${name} set up a ${mode === "1v1" ? "1v1" : "Multiplayer"} PK for ${minutes} min. Take a PK seat: red or blue!`);
    },
    [s, name, serverId, server],
  );
  const start = useCallback(() => {
    if (serverId) return server((id) => pkApi.start(id));
    setPk((p) => (p && p.phase === "ready" ? { ...p, phase: "live", endsAt: Date.now() + p.minutes * 60_000 } : p));
    const p = live.current;
    if (p) s.addSystem(`${name} has started a PK. The rule for this round is ${RULE_TEXT[p.rule]}.`);
  }, [s, name, serverId, server]);
  const close = useCallback(() => {
    if (serverId) {
      // A finished battle: just hide it here. A running one: the server closes it for everyone.
      if (live.current?.phase === "done") setHiddenVersion(srvVersion.current);
      else server((id) => pkApi.close(id));
      return;
    }
    setPk(null);
    s.addSystem(`${name} closed the PK.`);
  }, [s, name, serverId, server]);
  const dismiss = useCallback(() => {
    if (serverId) setHiddenVersion(srvVersion.current);
    else setPk(null);
  }, [serverId]);

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
      if (serverId) return server((id) => pkApi.vote(id, side));
      setPk((x) => (x ? { ...x, myVote: side } : x));
      score(side, ME_ID, 1);
    },
    [score, serverId, server],
  );

  // Demo rooms: gifts to someone on a PK seat score for their side (backend rooms: the server scores real gifts)
  useEffect(() => {
    if (serverId) return;
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
  }, [s.pkListener, score, serverId]);

  // The clock (and, in demo rooms, the end of the round; the server ends its own)
  const phase = pk?.phase;
  useEffect(() => {
    if (phase !== "live") return;
    const t = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (serverId) return;
      const p = live.current;
      if (p && p.phase === "live" && at >= p.endsAt) {
        const winner: Pk["winner"] = p.red === p.blue ? "draw" : p.red > p.blue ? "red" : "blue";
        setPk({ ...p, phase: "done", winner });
        s.addSystem(endText(p, winner));
      }
    }, 500);
    return () => window.clearInterval(t);
  }, [phase, s, serverId]);

  // Demo rooms: the sample crowd votes while the PK is live
  useEffect(() => {
    if (phase !== "live" || serverId) return;
    const t = window.setInterval(() => {
      const p = live.current;
      if (!p) return;
      const crowd = PEOPLE.filter((x) => x.online).map((x) => x.id);
      if (p.rule === "votes" && Math.random() < 0.6) score(Math.random() < 0.5 ? "red" : "blue", pick(crowd), 1);
    }, 2600);
    return () => window.clearInterval(t);
  }, [phase, score, serverId]);

  return { pk, now, setup, start, close, dismiss, vote };
}

export type PkState = ReturnType<typeof usePk>;
export const PkContext = createContext<PkState | null>(null);
export const usePkState = () => useContext(PkContext);
