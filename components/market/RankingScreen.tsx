"use client";

import { NameText } from "@/components/ui/NameText";
import { backdropStyle } from "@/components/ui/PanchayatBackground";
import { useEffect, useMemo, useState } from "react";
import { getRanking, type Ranking, type RankingType } from "@/lib/api/rankings";
import type { VoiceRoom } from "@/lib/api/voice-rooms";
import { serverRoomAppId, toAppRoom, userPersonId, useServerRooms } from "@/lib/app/server-rooms";
import { motion } from "framer-motion";
import { ChevronLeft, Heart } from "lucide-react";
import { CpRing } from "@/components/market/CpRing";
import { RoomCover } from "@/components/rooms/RoomCover";
import { FamilyBar, FamilyBody, FamilyPeriodSwitch, useFamilyRanking, type FamilyPeriod } from "@/components/parivar/ParivarRanking";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { PEOPLE } from "@/lib/app/data";
import { CelebrityBoard } from "./CelebrityBoard";
import { RANK_PERIODS, RANK_TABS, periodShare, sampleScore, type RankPeriod, type RankTab } from "@/lib/app/market";
import { cpApi, type CpCouple, type CpRankingRow } from "@/lib/api/cp";
import { useMarket } from "@/lib/app/market-store";
import { usePeople } from "@/lib/app/people";
import { COINS_PER_GROWTH, vipName } from "@/lib/app/levels";
import { seeded } from "@/lib/app/social";
import { nameFace } from "@/lib/app/fonts";
import { ME_ID, useApp } from "@/lib/app/store";
import type { Person, Room } from "@/lib/app/types";

type Row = { key: string; people?: Person[]; room?: Room; ring?: string; title: string; value: number; mine: boolean; open: () => void };

/**
 * Top 3 frames. `cy` and `hole` are where the frame's inner circle sits, as a
 * share of the frame's size, so the avatar fits the opening exactly.
 */
const PODIUM = [
  { place: 2, frame: "/ranking/rank-2.png", size: 116, cy: 0.471, hole: 0.43, ring: "#c9d6ff", lift: "mt-7" },
  { place: 1, frame: "/ranking/rank-1.png", size: 136, cy: 0.484, hole: 0.44, ring: "#ffd36e", lift: "" },
  { place: 3, frame: "/ranking/rank-3.png", size: 116, cy: 0.453, hole: 0.4, ring: "#ffb59a", lift: "mt-9" },
];

/** Panchayat leaderboards: popularity, VIP spending, couples and rooms. */
export function RankingScreen() {
  const app = useApp();
  const { pop, charmOf, vipPoints, rooms, roomPointsOf, openRoom, openProfile, myPermanentRoom, push, setTab } = app;
  const { couples, myCouple } = useMarket();
  const person = usePeople();
  const [tab, setTabId] = useState<RankTab>("popularity");
  const [period, setPeriod] = useState<RankPeriod>("today");
  // Popularity only: the Celebrity board (each day's top Charm receiver) instead of a period leaderboard
  const [celeb, setCeleb] = useState(false);
  const [famPeriod, setFamPeriod] = useState<FamilyPeriod>("weekly");
  const fam = useFamilyRanking(tab === "family", famPeriod);
  const unit = RANK_TABS.find((t) => t.id === tab)?.unit ?? "";

  // Signed in: Popularity (charm), VIP (coins spent) and Room come from the server's real gifts
  const { myId, rememberPeople } = useServerRooms();
  const serverType: RankingType | null = myId ? (tab === "popularity" ? "charm" : tab === "vip" ? "wealth" : tab === "room" ? "room" : null) : null;
  const [srv, setSrv] = useState<{ key: string; data: Ranking | null; error: string }>({ key: "", data: null, error: "" });
  const srvKey = serverType ? `${serverType}:${period}` : "";
  useEffect(() => {
    if (!serverType) return;
    let live = true;
    const key = `${serverType}:${period}`;
    setSrv((s) => (s.key === key ? s : { key, data: null, error: "" }));
    getRanking(serverType, period)
      .then((data) => {
        if (!live) return;
        setSrv({ key, data, error: "" });
        // Names and pictures for the people in it
        const add: Record<string, { name: string; avatarUrl?: string }> = {};
        for (const r of data.rows) if (r.userId && r.userId !== myId) add[userPersonId(r.userId)] = { name: r.name, avatarUrl: r.avatarUrl };
        if (Object.keys(add).length) rememberPeople(add);
      })
      .catch((e) => live && setSrv({ key, data: null, error: e instanceof Error && e.message ? e.message : "Couldn't load the ranking." }));
    return () => {
      live = false;
    };
  }, [serverType, period, myId, rememberPeople]);

  // Signed in: the Couple leaderboard comes from the server too (real CPs, gifts between partners)
  const cpActive = tab === "couple" && Boolean(myId);
  const [cp, setCp] = useState<{ key: string; rows: CpRankingRow[] | null; error: string }>({ key: "", rows: null, error: "" });
  const cpKey = cpActive ? `cp:${period}` : "";
  useEffect(() => {
    if (!cpActive) return;
    let live = true;
    const key = `cp:${period}`;
    setCp((s) => (s.key === key ? s : { key, rows: null, error: "" }));
    cpApi
      .ranking(period, 50)
      .then((rows) => {
        if (!live) return;
        setCp({ key, rows, error: "" });
        // Names and pictures for the partners in it
        const add: Record<string, { name: string; avatarUrl?: string }> = {};
        for (const r of rows) {
          if (r.couple.a !== myId) add[userPersonId(r.couple.a)] = r.couple.people[r.couple.a] ?? { userId: r.couple.a, name: "Someone" };
          if (r.couple.b !== myId) add[userPersonId(r.couple.b)] = r.couple.people[r.couple.b] ?? { userId: r.couple.b, name: "Someone" };
        }
        if (Object.keys(add).length) rememberPeople(add);
      })
      .catch((e) => live && setCp({ key, rows: null, error: e instanceof Error && e.message ? e.message : "Couldn't load the ranking." }));
    return () => {
      live = false;
    };
  }, [cpActive, period, myId, rememberPeople]);

  // Your own real CP (signed in), for the "Find a CP" / "Love Home" button and the bottom row
  const [myRealCouple, setMyRealCouple] = useState<CpCouple | null>(null);
  useEffect(() => {
    if (!myId) return setMyRealCouple(null);
    let live = true;
    cpApi
      .mine()
      .then((c) => live && setMyRealCouple(c))
      .catch(() => {
        /* the rest of the ranking still shows */
      });
    return () => {
      live = false;
    };
  }, [myId]);

  const cpRows = useMemo<Row[] | null>(() => {
    if (!cpActive) return null;
    const data = cp.key === cpKey ? cp.rows : null;
    if (!data) return [];
    const idOf = (raw: string) => (raw === myId ? ME_ID : userPersonId(raw));
    return data.map((r) => {
      const aId = idOf(r.couple.a);
      const bId = idOf(r.couple.b);
      return {
        key: r.couple.id,
        people: [person(aId), person(bId)],
        ring: r.couple.ring || undefined,
        title: `${person(aId).name} & ${person(bId).name}`,
        value: r.love,
        mine: aId === ME_ID || bId === ME_ID,
        open: () => push({ kind: "love-home", personId: aId === ME_ID ? bId : aId }),
      };
    });
  }, [cpActive, cp, cpKey, myId, person, push]);

  const serverRows = useMemo<Row[] | null>(() => {
    if (!serverType) return null;
    const data = srv.key === srvKey ? srv.data : null;
    if (!data) return [];
    if (serverType === "room") {
      return data.rows.map((r) => {
        const appId = serverRoomAppId(r.roomId ?? "");
        const room = rooms.find((x) => x.id === appId) ?? toAppRoom({ id: r.roomId ?? "", name: r.name, roomType: "VOICE", isPrivate: false, settings: {} } as VoiceRoom, myId);
        return { key: appId, room, title: r.name, value: r.value, mine: room.hostId === ME_ID, open: () => (r.live ? openRoom(appId) : undefined) };
      });
    }
    const list: Row[] = data.rows.map((r) => {
      const mine = r.userId === myId;
      const pid = mine ? ME_ID : userPersonId(r.userId ?? "");
      return { key: pid, people: [person(pid)], title: mine ? person(ME_ID).name : r.name, value: r.value, mine, open: () => (mine ? setTab("profile") : openProfile(pid)) };
    });
    if (!list.some((r) => r.mine) && data.me.value > 0) list.push({ key: ME_ID, people: [person(ME_ID)], title: person(ME_ID).name, value: data.me.value, mine: true, open: () => setTab("profile") });
    return list.sort((a, b) => b.value - a.value);
  }, [serverType, srv, srvKey, rooms, myId, person, openRoom, openProfile, setTab]);

  const rows = useMemo<Row[]>(() => {
    if (serverRows) return serverRows;
    if (cpRows) return cpRows;
    const share = periodShare(period);
    const myToday = (v: number) => (period === "yesterday" ? 0 : v);
    if (tab === "popularity" || tab === "vip") {
      const list: Row[] = PEOPLE.map((p) => ({ key: p.id, people: [p], title: p.name, value: sampleScore(p.id, tab, period), mine: false, open: () => openProfile(p.id) }));
      const mine = tab === "popularity" ? charmOf(ME_ID).points : vipPoints * COINS_PER_GROWTH;
      list.push({ key: ME_ID, people: [person(ME_ID)], title: person(ME_ID).name, value: myToday(mine), mine: true, open: () => setTab("profile") });
      return list.sort((a, b) => b.value - a.value);
    }
    if (tab === "couple") {
      // Not signed in: a demo preview (your own sample CP, no real leaderboard)
      return couples
        .map((c) => ({
          key: c.id,
          people: [person(c.a), person(c.b)],
          ring: c.ring,
          title: `${person(c.a).name} & ${person(c.b).name}`,
          value: c.id === myCouple?.id ? myToday(Math.round(c.love * share)) : Math.round(c.love * share * (0.6 + seeded(`${c.id}:${period}`) * 0.4)),
          mine: c.id === myCouple?.id,
          open: () => push({ kind: "love-home", personId: c.a }),
        }))
        .sort((a, b) => b.value - a.value);
    }
    return rooms
      .filter((r) => r.permanent)
      .map((r) => ({
        key: r.id,
        room: r,
        title: r.name,
        value: Math.round(roomPointsOf(r) * share * 0.02 * (0.5 + seeded(`${r.id}:${period}`))),
        mine: r.hostId === ME_ID,
        open: () => openRoom(r.id),
      }))
      .sort((a, b) => b.value - a.value);
  }, [serverRows, cpRows, tab, period, charmOf, vipPoints, couples, myCouple, rooms, roomPointsOf, person, openProfile, openRoom, push, setTab]);

  const top = [rows[1], rows[0], rows[2]];
  const myIndex = rows.findIndex((r) => r.mine);
  const me = myIndex >= 0 ? rows[myIndex] : null;
  // Signed in with a real CP that gained no love this period (so it isn't in the leaderboard): show it anyway, at 0
  const meRow =
    me ??
    (cpActive && myRealCouple
      ? (() => {
          const aId = myRealCouple.a === myId ? ME_ID : userPersonId(myRealCouple.a);
          const bId = myRealCouple.b === myId ? ME_ID : userPersonId(myRealCouple.b);
          return { key: myRealCouple.id, people: [person(aId), person(bId)], ring: myRealCouple.ring || undefined, title: `${person(aId).name} & ${person(bId).name}`, value: 0, mine: true, open: () => push({ kind: "love-home", personId: aId === ME_ID ? bId : aId }) };
        })()
      : null);
  const cta =
    tab === "popularity"
      ? { label: "Get gifts", go: () => (pop(), app.setTab("rooms")) }
      : tab === "vip"
        ? { label: "Add coins", go: () => app.setSheet({ kind: "coins" }) }
        : tab === "couple"
          ? { label: (myId ? myRealCouple : myCouple) ? "Love Home" : "Find a CP", go: () => push({ kind: "love-home", personId: ME_ID }) }
          : { label: myPermanentRoom ? "Open room" : "Create room", go: () => (myPermanentRoom ? openRoom(myPermanentRoom.id) : push({ kind: "create-room" })) };

  return (
    <div className="relative flex h-full flex-col" style={backdropStyle("ranking")}>
      <div className="app-scroll min-h-0 flex-1 pb-4">
        <header className="pt-safe sticky top-0 z-10 bg-[#2a1018]/80 backdrop-blur-xl">
          <div className="flex h-12 items-center px-2">
            <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-cream hover:bg-white/5">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="flex-1 text-center font-display text-[18px] font-extrabold text-cream">Ranking</h1>
            <span className="w-10" />
          </div>
          <div className="no-scrollbar flex gap-5 overflow-x-auto px-4" role="tablist" aria-label="Ranking type">
            {RANK_TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTabId(t.id)} className={`relative shrink-0 pb-2 font-display text-[16px] font-bold ${tab === t.id ? "text-cream" : "text-cream/45"}`}>
                {t.label}
                {tab === t.id ? <motion.span layoutId="rank-tab" className="absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-gold" /> : null}
              </button>
            ))}
            {/* PK has its own board (PK Coins earned in PK battles), kept apart from the others */}
            <button type="button" onClick={() => push({ kind: "pkCoins" })} className="relative shrink-0 pb-2 font-display text-[16px] font-bold text-cream/45">
              PK
            </button>
          </div>
          {tab === "family" ? (
            <FamilyPeriodSwitch period={famPeriod} onChange={setFamPeriod} />
          ) : (
            <div className="mx-4 my-2.5 flex rounded-full bg-black/30 p-1 ring-1 ring-white/10" role="tablist" aria-label="Period">
              {RANK_PERIODS.map((p) => (
                <button key={p.id} type="button" role="tab" aria-selected={!(tab === "popularity" && celeb) && period === p.id} onClick={() => { setCeleb(false); setPeriod(p.id); }} className={`h-8 flex-1 rounded-full text-[12.5px] font-bold ${!(tab === "popularity" && celeb) && period === p.id ? "bg-cream text-ink" : "text-cream/65"}`}>
                  {p.label}
                </button>
              ))}
              {tab === "popularity" && myId ? (
                <button type="button" role="tab" aria-selected={celeb} onClick={() => setCeleb(true)} className={`h-8 flex-1 rounded-full text-[12.5px] font-bold ${celeb ? "bg-gradient-to-r from-[#f6d27a] to-[#ffb84d] text-[#2a1600]" : "text-cream/65"}`}>
                  Celebrity
                </button>
              ) : null}
            </div>
          )}
        </header>

        {tab === "family" ? <FamilyBody data={fam} /> : tab === "popularity" && celeb && myId ? <CelebrityBoard /> : <>

        {/* Podium: the top 3 in their leaderboard frames */}
        <div className="mt-2 grid grid-cols-[1fr_1.15fr_1fr] items-start gap-1 px-2">
          {top.map((r, i) => {
            const pd = PODIUM[i];
            if (!r) return <span key={i} />;
            return (
              <button key={r.key} type="button" onClick={r.open} aria-label={`Number ${pd.place}: ${r.title}`} className={`relative flex min-w-0 flex-col items-center text-center ${pd.lift}`}>
                <RankFrame r={r} pd={pd} />
                <span className={`-mt-1 line-clamp-1 max-w-full font-display text-[13px] font-bold ${(r.people?.length === 1 && vipName(r.people[0].vip)) || "text-cream"}`} style={nameFace(r.people?.length === 1 ? r.people[0].nameFont : r.room?.settings?.nameFont)}><NameText text={r.title} /></span>
                <span className="text-[12.5px] font-extrabold" style={{ color: pd.ring }}>
                  {r.value.toLocaleString("en-IN")}
                </span>
              </button>
            );
          })}
        </div>

        <ol className="mx-3 mt-4 overflow-hidden rounded-3xl bg-black/25 ring-1 ring-white/10">
          {rows.slice(3, 30).map((r, i) => (
            <li key={r.key} className="border-b border-white/[0.06] last:border-b-0">
              <button type="button" onClick={r.open} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${r.mine ? "bg-gold/10" : ""}`}>
                <span className="w-6 text-center font-display text-[15px] font-extrabold text-cream/70">{i + 4}</span>
                <Avatars r={r} size={40} />
                <span className={`min-w-0 flex-1 truncate text-[14.5px] font-semibold ${(r.people?.length === 1 && vipName(r.people[0].vip)) || "text-cream"}`} style={nameFace(r.people?.length === 1 ? r.people[0].nameFont : r.room?.settings?.nameFont)}><NameText text={r.mine && !r.room ? `${r.title} (you)` : r.title} /></span>
                <span className="text-right">
                  <span className="block text-[14px] font-extrabold text-gold">{r.value.toLocaleString("en-IN")}</span>
                  <span className="text-[10.5px] text-cream/50">{unit}</span>
                </span>
              </button>
            </li>
          ))}
          {serverType && srv.error ? (
            <li className="px-4 py-6 text-center text-[13px] text-coral">{srv.error}</li>
          ) : cpActive && cp.error ? (
            <li className="px-4 py-6 text-center text-[13px] text-coral">{cp.error}</li>
          ) : serverType && !(srv.key === srvKey && srv.data) ? (
            <li className="px-4 py-6 text-center text-[13px] text-muted">Loading…</li>
          ) : cpActive && !(cp.key === cpKey && cp.rows) ? (
            <li className="px-4 py-6 text-center text-[13px] text-muted">Loading…</li>
          ) : rows.length <= 3 ? (
            <li className="px-4 py-6 text-center text-[13px] text-muted">{rows.length ? "Nobody else here yet." : cpActive ? "No couples here yet. Gifts between partners count." : "Nobody here yet. Gifts sent in rooms count."}</li>
          ) : null}
        </ol>
        </>}
      </div>

      {/* Your own row, always visible */}
      {tab === "family" ? <FamilyBar data={fam} /> : <div className="pb-safe flex items-center gap-3 border-t border-white/10 bg-ink-2 px-3 py-2.5">
        <span className="w-6 text-center font-display text-[15px] font-extrabold text-cream/70">{me && me.value > 0 ? myIndex + 1 : "–"}</span>
        {meRow ? <Avatars r={meRow} size={40} /> : <PersonAvatar person={person(ME_ID)} size={40} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold text-cream">{meRow ? meRow.title : tab === "couple" ? "No CP yet" : "No room yet"}</span>
          <span className="text-[11.5px] text-cream/55">
            {unit} {(meRow?.value ?? 0).toLocaleString("en-IN")}
          </span>
        </span>
        <button type="button" onClick={cta.go} className="h-9 shrink-0 rounded-full bg-gold px-4 text-[12.5px] font-bold text-ink">
          {cta.label}
        </button>
      </div>}
    </div>
  );
}

function Avatars({ r, size }: { r: Row; size: number }) {
  if (r.room)
    return (
      <span className="relative block shrink-0 overflow-hidden rounded-xl" style={{ width: size, height: size }}>
        <RoomCover room={r.room} />
      </span>
    );
  const [a, b] = r.people ?? [];
  if (!b) return <PersonAvatar person={a} size={size} />;
  return (
    <span className="relative flex shrink-0 items-center">
      <PersonAvatar person={{ ...a, frame: "none" }} size={Math.round(size * 0.8)} />
      <span className="-ml-2.5">
        <PersonAvatar person={{ ...b, frame: "none" }} size={Math.round(size * 0.8)} />
      </span>
      {r.ring ? (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
          <CpRing id={r.ring} size={Math.round(size * 0.5)} />
        </span>
      ) : (
        <Heart className="absolute -bottom-1 left-1/2 h-4 w-4 -translate-x-1/2 fill-pink text-pink" aria-hidden />
      )}
    </span>
  );
}


/** An avatar (or couple, or room cover) set inside a top-3 leaderboard frame. */
function RankFrame({ r, pd }: { r: Row; pd: (typeof PODIUM)[number] }) {
  const hole = Math.round(pd.size * pd.hole);
  const [a, b] = r.people ?? [];
  return (
    <span className="relative block shrink-0" style={{ width: pd.size, height: pd.size }}>
      <span className="absolute left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full bg-ink" style={{ top: pd.size * pd.cy, width: hole, height: hole }}>
        {r.room ? (
          <span className="absolute inset-0">
            <RoomCover room={r.room} />
          </span>
        ) : b ? (
          <span className="flex items-center">
            <PersonAvatar person={{ ...a, frame: "none" }} size={Math.round(hole * 0.56)} />
            <span className="-ml-2">
              <PersonAvatar person={{ ...b, frame: "none" }} size={Math.round(hole * 0.56)} />
            </span>
          </span>
        ) : a ? (
          <PersonAvatar person={{ ...a, frame: "none" }} size={hole} />
        ) : null}
      </span>
      <img src={pd.frame} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full select-none" draggable={false} />
    </span>
  );
}
