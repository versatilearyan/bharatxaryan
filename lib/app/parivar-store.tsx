"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PEOPLE, personById } from "./data";
import { dayKey } from "./progress";
import { CHECKIN_XP, GIFT_COINS_PER_XP, PARIVAR_CHATTER, PARIVAR_CREATE_COST, SAMPLE_PARIVARS, deputyCap, memberCap, parivarLevel, type Parivar, type ParivarChat, type ParivarRole } from "./parivar";
import { ME_ID, useApp } from "./store";

// v2: sample families removed
const STORAGE_KEY = "panchayat-parivar-v2";
type Saved = { parivars: Parivar[]; applied: string | null; requests: string[]; chat: Record<string, ParivarChat[]>; checkin: string };
type NewParivar = Pick<Parivar, "name" | "tag" | "emblem" | "color" | "announcement" | "joinMode">;

const uid = () => Math.random().toString(36).slice(2, 10);
const nameOf = (id: string) => personById(id)?.name ?? "Someone";
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function useParivarState() {
  const { spend, toast, push, pop, resetCount, parivarHook } = useApp();
  const [parivars, setParivars] = useState<Parivar[]>(SAMPLE_PARIVARS);
  /** The Parivar you asked to join and are waiting on. */
  const [applied, setApplied] = useState<string | null>(null);
  /** People asking to join your Parivar (seen by the Mukhiya and Up-Mukhiyas). */
  const [requests, setRequests] = useState<string[]>([]);
  const [chat, setChat] = useState<Record<string, ParivarChat[]>>({});
  const [checkin, setCheckin] = useState("");
  const hydrated = useRef(false);
  // Latest values for timers
  const live = useRef({ parivars, applied, requests });
  useEffect(() => {
    live.current = { parivars, applied, requests };
  }, [parivars, applied, requests]);

  useEffect(() => {
    try {
      const s = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Saved>;
      if (Array.isArray(s.parivars)) setParivars(s.parivars);
      if (s.applied) setApplied(s.applied);
      if (Array.isArray(s.requests)) setRequests(s.requests);
      if (s.chat) setChat(s.chat);
      if (s.checkin) setCheckin(s.checkin);
    } catch {
      /* nothing saved */
    }
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ parivars, applied, requests, chat, checkin } satisfies Saved));
    } catch {
      /* storage unavailable */
    }
  }, [parivars, applied, requests, chat, checkin]);

  // Reset demo data: back to the sample Parivars, and you're in none
  const firstReset = useRef(resetCount);
  useEffect(() => {
    if (resetCount === firstReset.current) return;
    setParivars(SAMPLE_PARIVARS);
    setApplied(null);
    setRequests([]);
    setChat({});
    setCheckin("");
  }, [resetCount]);

  const parivarOf = useCallback((personId: string) => parivars.find((p) => p.members.some((m) => m.id === personId)) ?? null, [parivars]);
  const byId = useCallback((id: string) => parivars.find((p) => p.id === id) ?? null, [parivars]);
  const mine = parivarOf(ME_ID);
  const myRole: ParivarRole | null = mine?.members.find((m) => m.id === ME_ID)?.role ?? null;
  const canManage = myRole === "mukhiya" || myRole === "up-mukhiya";

  const update = useCallback((id: string, fn: (p: Parivar) => Parivar) => setParivars((list) => list.map((p) => (p.id === id ? fn(p) : p))), []);
  const addXp = useCallback(
    (id: string, memberId: string, xp: number) =>
      update(id, (p) => {
        const before = parivarLevel(p.xp).level;
        const after = parivarLevel(p.xp + xp).level;
        if (after > before && p.members.some((m) => m.id === ME_ID)) window.setTimeout(() => toast(`${p.name} reached Parivar Lv ${after}! Room for ${memberCap(after)} members now.`, "gold"), 600);
        return { ...p, xp: p.xp + xp, weekXp: p.weekXp + xp, members: p.members.map((m) => (m.id === memberId ? { ...m, contribution: m.contribution + xp } : m)) };
      }),
    [update, toast],
  );
  const addMember = useCallback((id: string, personId: string) => update(id, (p) => ({ ...p, members: [...p.members.filter((m) => m.id !== personId), { id: personId, role: "sadasya", contribution: 0, joinedAt: Date.now() }] })), [update]);
  const say = useCallback((id: string, authorId: string, text: string) => setChat((c) => ({ ...c, [id]: [...(c[id] ?? []), { id: uid(), authorId, text, at: Date.now() }].slice(-80) })), []);

  // Gifts you send in rooms earn your Parivar EXP; sample members' gifts grow theirs
  useEffect(() => {
    parivarHook.current = (from, coins) => {
      const p = parivars.find((x) => x.members.some((m) => m.id === from));
      const xp = Math.floor(coins / GIFT_COINS_PER_XP);
      if (p && xp > 0) addXp(p.id, from, xp);
    };
    return () => {
      parivarHook.current = null;
    };
  }, [parivars, addXp, parivarHook]);

  /* ---- Create, join, leave ---- */
  const create = useCallback(
    (d: NewParivar) => {
      if (mine) return toast("Leave your Parivar before creating a new one", "error");
      if (parivars.some((p) => p.name.toLowerCase() === d.name.trim().toLowerCase())) return toast("That name is taken. Try another.", "error");
      if (!spend(PARIVAR_CREATE_COST)) return toast("Not enough demo coins", "error");
      const p: Parivar = { ...d, name: d.name.trim(), tag: d.tag.trim().toUpperCase(), id: `pv-${uid()}`, code: String(880600 + Math.floor(Math.random() * 99_000)), xp: 0, weekXp: 0, members: [{ id: ME_ID, role: "mukhiya", contribution: 0, joinedAt: Date.now() }], createdAt: Date.now() };
      setParivars((list) => [...list, p]);
      setApplied(null);
      say(p.id, "system", `${p.name} was founded. Welcome, Mukhiya!`);
      toast(`${p.emblem} ${p.name} is ready. Invite your people!`, "gold");
      pop();
      push({ kind: "parivar", id: p.id });
    },
    [mine, parivars, spend, toast, say, pop, push],
  );

  const join = useCallback(
    (id: string) => {
      const p = byId(id);
      if (!p) return;
      if (mine) return toast("You're already in a Parivar. Leave it first.", "error");
      if (p.members.length >= memberCap(parivarLevel(p.xp).level)) return toast(`${p.name} is full`, "error");
      if (p.joinMode === "open") {
        addMember(id, ME_ID);
        setApplied(null);
        say(id, "system", "You joined the Parivar 🎉");
        return toast(`Welcome to ${p.name}! ${p.emblem}`, "gold");
      }
      setApplied(id);
      toast(`Request sent to ${p.name}`);
      // Demo: the Mukhiya says yes after a moment
      window.setTimeout(() => {
        if (live.current.applied !== id) return;
        setApplied(null);
        addMember(id, ME_ID);
        say(id, "system", "You joined the Parivar 🎉");
        toast(`${nameOf(p.members.find((m) => m.role === "mukhiya")?.id ?? "")} approved you. Welcome to ${p.name}!`, "gold");
      }, 4000);
    },
    [byId, mine, addMember, say, toast],
  );
  const cancelApply = useCallback(() => setApplied(null), []);

  const leave = useCallback(() => {
    if (!mine) return;
    if (myRole === "mukhiya" && mine.members.length > 1) return toast("Make someone else Mukhiya before leaving, or disband the Parivar", "error");
    if (myRole === "mukhiya") return toast("You're the only member. Disband the Parivar instead.", "error");
    update(mine.id, (p) => ({ ...p, members: p.members.filter((m) => m.id !== ME_ID) }));
    setRequests([]);
    toast(`You left ${mine.name}`);
  }, [mine, myRole, update, toast]);

  const disband = useCallback(() => {
    if (!mine || myRole !== "mukhiya") return;
    setParivars((list) => list.filter((p) => p.id !== mine.id));
    setRequests([]);
    toast(`${mine.name} was disbanded`);
    pop();
  }, [mine, myRole, toast, pop]);

  /* ---- Managing members ---- */
  const approve = useCallback(
    (personId: string) => {
      if (!mine || !canManage) return;
      if (mine.members.length >= memberCap(parivarLevel(mine.xp).level)) return toast("Your Parivar is full. Level up for more room.", "error");
      setRequests((r) => r.filter((x) => x !== personId));
      addMember(mine.id, personId);
      say(mine.id, "system", `${nameOf(personId)} joined the Parivar 🎉`);
      toast(`${nameOf(personId)} joined ${mine.name}`);
    },
    [mine, canManage, addMember, say, toast],
  );
  const reject = useCallback((personId: string) => setRequests((r) => r.filter((x) => x !== personId)), []);

  const setRole = useCallback(
    (personId: string, role: ParivarRole) => {
      if (!mine || myRole !== "mukhiya") return;
      if (role === "up-mukhiya" && mine.members.filter((m) => m.role === "up-mukhiya").length >= deputyCap(parivarLevel(mine.xp).level)) return toast(`Lv ${parivarLevel(mine.xp).level} allows ${deputyCap(parivarLevel(mine.xp).level)} Up-Mukhiya. Level up for more.`, "error");
      update(mine.id, (p) => ({
        ...p,
        // Handing over Mukhiya makes you an Up-Mukhiya
        members: p.members.map((m) => (m.id === personId ? { ...m, role } : role === "mukhiya" && m.id === ME_ID ? { ...m, role: "up-mukhiya" } : m)),
      }));
      say(mine.id, "system", role === "mukhiya" ? `${nameOf(personId)} is the new Mukhiya 👑` : role === "up-mukhiya" ? `${nameOf(personId)} is now an Up-Mukhiya` : `${nameOf(personId)} is now a Sadasya`);
    },
    [mine, myRole, update, say, toast],
  );

  const kick = useCallback(
    (personId: string) => {
      if (!mine || !canManage) return;
      const target = mine.members.find((m) => m.id === personId);
      if (!target || target.role === "mukhiya" || (myRole === "up-mukhiya" && target.role !== "sadasya")) return toast("You can't remove them", "error");
      update(mine.id, (p) => ({ ...p, members: p.members.filter((m) => m.id !== personId) }));
      say(mine.id, "system", `${nameOf(personId)} was removed from the Parivar`);
    },
    [mine, canManage, myRole, update, say, toast],
  );

  const setAnnouncement = useCallback((text: string) => mine && canManage && update(mine.id, (p) => ({ ...p, announcement: text.trim() })), [mine, canManage, update]);
  const setJoinMode = useCallback((mode: Parivar["joinMode"]) => mine && myRole === "mukhiya" && update(mine.id, (p) => ({ ...p, joinMode: mode })), [mine, myRole, update]);

  /* ---- Daily check-in and chat ---- */
  const checkedIn = checkin === dayKey();
  const checkIn = useCallback(() => {
    if (!mine || checkedIn) return;
    setCheckin(dayKey());
    addXp(mine.id, ME_ID, CHECKIN_XP);
    toast(`Checked in · +${CHECKIN_XP} Parivar EXP`, "gold");
  }, [mine, checkedIn, addXp, toast]);

  const send = useCallback(
    (text: string) => {
      if (!mine || !text.trim()) return;
      say(mine.id, ME_ID, text.trim().slice(0, 200));
      const others = mine.members.filter((m) => m.id !== ME_ID);
      if (others.length) window.setTimeout(() => say(mine.id, pick(others).id, pick(PARIVAR_CHATTER)), 2500 + Math.random() * 2500);
    },
    [mine, say],
  );

  // Demo: people who aren't in a Parivar ask to join yours (or join straight away if it's open)
  const mineId = mine?.id;
  useEffect(() => {
    if (!mineId) return;
    let count = 0;
    const t = window.setInterval(() => {
      const { parivars: list, requests: asked } = live.current;
      const p = list.find((x) => x.id === mineId);
      if (!p || count >= 3 || Math.random() < 0.5) return;
      const free = PEOPLE.filter((x) => !list.some((y) => y.members.some((m) => m.id === x.id)) && !asked.includes(x.id));
      if (!free.length || p.members.length >= memberCap(parivarLevel(p.xp).level)) return;
      count++;
      const who = pick(free).id;
      if (p.joinMode === "open") {
        addMember(p.id, who);
        say(p.id, "system", `${nameOf(who)} joined the Parivar 🎉`);
        toast(`${nameOf(who)} joined ${p.name}`);
      } else {
        setRequests((r) => [...r, who]);
        toast(`${nameOf(who)} wants to join ${p.name}`);
      }
    }, 25_000);
    return () => window.clearInterval(t);
  }, [mineId, addMember, say, toast]);

  const ranking = useMemo(() => [...parivars].sort((a, b) => b.weekXp - a.weekXp), [parivars]);

  return { parivars, ranking, byId, parivarOf, mine, myRole, canManage, applied, requests, chat, checkedIn, create, join, cancelApply, leave, disband, approve, reject, setRole, kick, setAnnouncement, setJoinMode, checkIn, send };
}

export type ParivarState = ReturnType<typeof useParivarState>;
const Ctx = createContext<ParivarState | null>(null);

export function ParivarProvider({ children }: { children: ReactNode }) {
  const state = useParivarState();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useParivar() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useParivar must be used inside ParivarProvider");
  return v;
}
