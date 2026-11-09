"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CircleHelp } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin, Pill, formatCount } from "@/components/ui/kit";
import { PEOPLE } from "@/lib/app/data";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import type { Person } from "@/lib/app/types";
import type { RoomSession } from "./useRoomSession";
import { LevelPill, VipBadgeFor } from "@/components/profile/IdTags";
import { nameTone } from "@/lib/app/fonts";
import { VipBadge } from "@/components/effects/VipFx";
import { useRoomFx } from "./useRoomFx";
import { getContribution, type ContributionPeriod } from "@/lib/api/gifts";
import { SERVER_USER_PREFIX, useServerRooms } from "@/lib/app/server-rooms";

type Tab = "online" | "members" | "contribution";
export type Period = "Daily" | "Weekly" | "Total";

/** Stable pseudo-random number from a string, so sample boards don't jump around. */
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

const PERIOD_SHARE: Record<Period, number> = { Daily: 0.03, Weekly: 0.22, Total: 1 };

/**
 * Room people panel: who's online, room members, and the gift Contribution board
 * (Daily / Weekly / Total) with your own rank pinned at the bottom.
 */
export function RoomPeopleSheet({ s }: { s: RoomSession }) {
  const open = s.panel === "online" || s.panel === "members" || s.panel === "contribution";
  const onClose = () => s.setPanel(null);
  const [tab, setTab] = useState<Tab>("online");
  useEffect(() => {
    if (s.panel === "online" || s.panel === "members" || s.panel === "contribution") setTab(s.panel);
  }, [s.panel]);
  // Live rooms: only people really here now (connected to the room's voice). If voice
  // isn't up for anyone (it failed to connect), keep everyone the server lists.
  const onlineIds = useMemo(() => {
    const parts = s.participants;
    if (!parts || parts.connectedCount <= 0) return s.onlineIds;
    return s.onlineIds.filter((id) => id === ME_ID || parts.members.find((m) => m.personId === id)?.connected);
  }, [s.onlineIds, s.participants]);

  return (
    <BottomSheet open={open} onClose={onClose} tall className="!bg-[#17161c]">
      <div role="tablist" aria-label="Room people" className="flex items-end gap-6 border-b border-line px-5 pt-1">
        {(
          [
            ["online", "Online", onlineIds.length],
            ["members", "Members", s.room.members],
            ["contribution", "Contribution", null],
          ] as const
        ).map(([id, label, count]) => (
          <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)} className={`relative pb-3 text-left ${tab === id ? "text-cream" : "text-muted"}`}>
            <span className={`font-display ${tab === id ? "text-[18px] font-extrabold" : "text-[15px] font-semibold"}`}>{label}</span>
            {count !== null ? <span className="ml-1 text-[11px]">{formatCount(count)}</span> : null}
            {tab === id ? <motion.span layoutId="people-tab" className="absolute inset-x-1/4 -bottom-px h-[3px] rounded-full bg-coral" /> : null}
          </button>
        ))}
      </div>
      {tab === "online" ? <OnlineList s={s} ids={onlineIds} /> : tab === "members" ? <MembersList s={s} /> : <Contribution s={s} />}
    </BottomSheet>
  );
}

function Row({ p, right, sub, onClick, badge }: { p: Person; right?: React.ReactNode; sub?: React.ReactNode; onClick?: () => void; badge?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-cream/[0.03]">
      <PersonAvatar person={p} size={44} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={`truncate text-[15px] font-semibold ${nameTone(p.vip)}`}>{p.id === ME_ID ? `${p.name} (you)` : p.name}</span>
          {badge !== undefined ? badge : <VipBadgeFor personId={p.id} vip={p.vip} size={16} />}
          <LevelPill level={p.level} gender={p.gender} size="sm" />
        </span>
        {sub ? <span className="block truncate text-[11.5px] text-muted">{sub}</span> : null}
      </span>
      {right}
    </button>
  );
}

function OnlineList({ s, ids }: { s: RoomSession; ids: string[] }) {
  const person = usePeople();
  const { serverFx } = useRoomFx(s);
  return (
    <div className="pb-4 pt-2">
      {ids.map((id) => {
        const onMic = s.seatedIds.includes(id);
        // Live rooms: connection and mic state from LiveKit, role from the backend
        const m = s.participants?.members.find((x) => x.personId === id);
        const sub = s.participants
          ? !m?.connected
            ? m?.reconnecting
              ? "Reconnecting…"
              : "Not connected to voice"
            : m.speaking
              ? "Talking now"
              : m.micOn
                ? "Mic on"
                : "Mic off"
          : onMic
            ? s.forceMuted.includes(id)
              ? "Muted by admin"
              : s.speakingIds.includes(id)
                ? "Talking now"
                : "On mic"
            : "Listening";
        const backendRole = m?.role && m.role !== "OWNER" ? m.role.charAt(0) + m.role.slice(1).toLowerCase() : null;
        return (
          <Row
            key={id}
            p={person(id)}
            sub={sub}
            // Backend rooms: the badge from this person's own record (none when they have none)
            badge={serverFx(id) ? (serverFx(id)?.badge ? <VipBadge set={serverFx(id)!.badge!} level={serverFx(id)!.badge!.level || undefined} size={16} /> : null) : undefined}
            onClick={() => id !== ME_ID && s.openCard(id)}
            right={id === s.room.hostId ? <Pill tone="vip">Owner</Pill> : s.admins.includes(id) ? <Pill>Admin</Pill> : backendRole ? <Pill>{backendRole}</Pill> : onMic ? <Pill>Mic</Pill> : null}
          />
        );
      })}
    </div>
  );
}

function MembersList({ s }: { s: RoomSession }) {
  const person = usePeople();
  const { isJoined, toggleJoinRoom } = useApp();
  const joined = isJoined(s.room.id);
  const admins = s.admins.filter((id) => id !== s.room.hostId && !s.kicked.includes(id));
  const members = PEOPLE.filter((p) => p.id !== s.room.hostId && !admins.includes(p.id) && !s.kicked.includes(p.id)).slice(0, 8);
  return (
    <div className="pb-4 pt-2">
      {!s.isOwner ? (
        <div className="mx-5 my-2 flex items-center justify-between rounded-2xl bg-cream/[0.05] p-3">
          <p className="text-[12.5px] text-cream/80">{joined ? `You're a member${s.role === "admin" ? " and an admin" : ""} of this room` : "Join to become a member of this room"}</p>
          <button type="button" onClick={() => toggleJoinRoom(s.room)} className={`h-8 rounded-full px-3.5 text-[12px] font-bold ${joined ? "bg-cream/10 text-cream" : "bg-coral text-white"}`}>
            {joined ? "Joined" : "Join"}
          </button>
        </div>
      ) : null}
      <Row p={person(s.room.hostId)} sub={`Owner · ID ${person(s.room.hostId).uid}`} right={<Pill tone="vip">Owner</Pill>} onClick={() => s.room.hostId !== ME_ID && s.openCard(s.room.hostId)} />
      {admins.map((id) => (
        <Row key={id} p={person(id)} sub={`Admin · ID ${person(id).uid}`} right={<Pill>Admin</Pill>} onClick={() => id !== ME_ID && s.openCard(id)} />
      ))}
      {joined && !s.isOwner && !admins.includes(ME_ID) ? <Row p={person(ME_ID)} sub="Member" /> : null}
      {members.map((p) => (
        <Row key={p.id} p={p} sub={`Member · ID ${p.uid}`} onClick={() => s.openCard(p.id)} />
      ))}
      <p className="px-5 pt-3 text-[11px] text-muted">
        Showing a sample of {formatCount(s.room.members)} members.{s.isOwner ? " Tap someone to make them an admin or remove them." : ""}
      </p>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) return <span className="w-7 text-center font-display text-[16px] font-bold text-muted">{rank}</span>;
  const fill = rank === 1 ? "#f2c14e" : rank === 2 ? "#b9c4d6" : "#d49a6a";
  return (
    <svg viewBox="0 0 28 24" className="h-6 w-7" aria-label={`Rank ${rank}`}>
      <path d="M3 8 L8.5 13 L14 4 L19.5 13 L25 8 L22.5 21 H5.5 Z" fill={fill} />
      <text x="14" y="19" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff" fontFamily="sans-serif">
        {rank}
      </text>
    </svg>
  );
}

type Board = { rows: { id: string; coins: number }[]; mine: number; myRank: number; loading?: boolean; error?: string };

/**
 * The room's contribution board for a period: coins gifted here per person, highest first.
 * Backend rooms: the server's real totals (daily, weekly since Monday, all time), loaded
 * again whenever a gift lands. Demo rooms: sample values plus your own gifts.
 */
export function useContributionBoard(s: RoomSession, period: Period): Board {
  const sample = useSampleBoard(s, period);
  const { myId } = useServerRooms();
  const serverId = s.room.server?.id ?? null;
  const giftsSeen = Object.values(s.giftCounts).reduce((a, b) => a + b, 0);
  const [live, setLive] = useState<Board | null>(null);
  useEffect(() => {
    if (!serverId) return;
    let off = false;
    setLive((b) => (b ? { ...b, loading: true } : { rows: [], mine: 0, myRank: 0, loading: true }));
    getContribution(serverId, period.toLowerCase() as ContributionPeriod)
      .then((d) => {
        if (off) return;
        const pid = (uid: string) => (uid === myId ? ME_ID : `${SERVER_USER_PREFIX}${uid}`);
        setLive({ rows: d.rows.map((r) => ({ id: pid(r.userId), coins: r.coins })), mine: d.me.coins, myRank: d.me.rank ?? 0 });
      })
      .catch((e) => !off && setLive({ rows: [], mine: 0, myRank: 0, error: e instanceof Error ? e.message : "Couldn't load the board." }));
    return () => {
      off = true;
    };
  }, [serverId, period, giftsSeen, myId]);
  return serverId ? (live ?? { rows: [], mine: 0, myRank: 0, loading: true }) : sample;
}

function useSampleBoard(s: RoomSession, period: Period): Board {
  const { myContrib } = useApp();
  const mine = myContrib[s.room.id] ?? 0;
  return useMemo(() => {
    const base = Math.max(1, s.room.basePoints / 100); // coins this room has received in total (sample)
    const rows = PEOPLE.filter((p) => p.id !== s.room.hostId).map((p) => {
      const r = hash(`${s.room.id}:${p.id}`);
      const total = Math.round(base * Math.pow(r, 3) * 0.6);
      const periodShare = PERIOD_SHARE[period] * (0.6 + hash(`${p.id}:${period}`) * 0.8);
      return { id: p.id, coins: period === "Total" ? total : Math.round(total * periodShare) };
    });
    rows.push({ id: ME_ID, coins: mine });
    const sorted = rows.filter((r) => r.coins > 0).sort((a, b) => b.coins - a.coins);
    return { rows: sorted, mine, myRank: sorted.findIndex((r) => r.id === ME_ID) + 1 };
  }, [s.room.id, s.room.basePoints, s.room.hostId, period, mine]);
}

function Contribution({ s }: { s: RoomSession }) {
  const person = usePeople();
  const [period, setPeriod] = useState<Period>("Daily");
  const [help, setHelp] = useState(false);

  const board = useContributionBoard(s, period);
  const { mine, myRank } = board;

  return (
    <div className="relative flex min-h-[60vh] flex-col">
      <div className="flex items-center gap-2 px-5 py-3">
        {(["Daily", "Weekly", "Total"] as const).map((p) => (
          <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)} className={`h-9 rounded-full px-4 text-[13px] font-bold ${period === p ? "bg-coral/15 text-pink ring-1 ring-coral/40" : "bg-cream/[0.06] text-cream/75"}`}>
            {p}
          </button>
        ))}
        <button type="button" onClick={() => setHelp((h) => !h)} className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted hover:text-cream" aria-label="How contribution works" aria-expanded={help}>
          <CircleHelp className="h-5 w-5" />
        </button>
      </div>
      {help ? <p className="mx-5 mb-2 rounded-xl bg-cream/[0.05] p-3 text-[12px] text-muted">{s.room.server ? "Contribution counts the coins each person has gifted in this room. Daily resets at midnight (India time), weekly on Monday." : "Contribution counts the coins each person has gifted in this room. Sample values, plus your real demo gifts."}</p> : null}
      {board.error ? <p className="mx-5 mb-2 text-[12px] text-pink">{board.error}</p> : null}
      {s.room.server && !board.loading && !board.error && !board.rows.length ? <p className="mx-5 my-6 text-center text-[13px] text-muted">No gifts here yet in this period.</p> : null}

      <ol className="flex-1 pb-24">
        {board.rows.slice(0, 20).map((r, i) => {
          const p = person(r.id);
          return (
            <li key={r.id}>
              <button type="button" onClick={() => r.id !== ME_ID && s.openCard(r.id)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${r.id === ME_ID ? "bg-coral/[0.07]" : "hover:bg-cream/[0.03]"}`}>
                <span className="grid w-7 place-items-center">
                  <RankBadge rank={i + 1} />
                </span>
                <PersonAvatar person={p} size={50} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[15px] font-bold ${nameTone(p.vip)}`}>{r.id === ME_ID ? `${p.name} (you)` : p.name}</span>
                  <span className="mt-0.5 flex items-center gap-1">
                    <VipBadgeFor personId={p.id} vip={p.vip} size={16} />
                    <LevelPill level={p.level} gender={p.gender} size="sm" />
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-[16px] font-extrabold text-[#ffa25c]">{r.coins.toLocaleString("en-IN")}</span>
                  <span className="text-[11px] text-muted">coins</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Your rank, pinned */}
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-[#201e26] px-4 py-3">
        <span className="grid w-7 place-items-center">{myRank ? <RankBadge rank={myRank} /> : <span className="text-[12px] text-muted">—</span>}</span>
        <PersonAvatar person={person(ME_ID)} size={46} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-cream">{person(ME_ID).name}</span>
          <span className="text-[11px] text-muted">{myRank ? `Rank ${myRank} in ${period.toLowerCase()} contribution` : "Send a gift to get on the board"}</span>
        </span>
        <span className="flex items-center gap-1 font-display text-[16px] font-extrabold text-[#ffa25c]">
          <Coin className="h-4 w-4" />
          {mine.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}
