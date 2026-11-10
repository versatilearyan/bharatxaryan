"use client";

import { NewbieRooms } from "@/components/newbie/NewbieUi";
import { isGameTable, useLiveCounts } from "@/lib/app/live-counts";
import { activeRooms, byOnline } from "@/lib/app/active-rooms";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, Hash, Plus, Radio, SearchX } from "lucide-react";
import { RoomCover } from "./RoomCover";
import { Chips, IconButton, SearchField, SectionTitle } from "@/components/ui/kit";
import { RoomCard, RoomRow } from "./RoomCards";
import { personById } from "@/lib/app/data";
import { useApp } from "@/lib/app/store";
import { useServerRooms } from "@/lib/app/server-rooms";
import type { Room } from "@/lib/app/types";

const FILTERS = ["All", "Voice", "YouTube", "Kharidari", "VIP"] as const;
type Filter = (typeof FILTERS)[number];

const TOP = ["My room", "All"] as const;
type Top = (typeof TOP)[number];
const MINE = ["Recents", "Joined", "Following"] as const;
type Mine = (typeof MINE)[number];

const matches = (r: Room, f: Filter) =>
  f === "All" || (f === "VIP" ? r.vip : f === "Voice" ? r.type === "voice" : f === "Kharidari" ? r.type === "kharidari" : r.type === "watch");

export function RoomsScreen() {
  const { rooms: allRooms, push, setSheet } = useApp();
  // Game tables are live only while someone is in them: empty ones don't show
  const live = useLiveCounts();
  const rooms = useMemo(() => allRooms.filter((r) => !(r.server && isGameTable(r.name) && live && (live[r.server.id] ?? 0) === 0)), [allRooms, live]);
  const [top, setTop] = useState<Top>("All");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rooms.filter((r) => {
      if (!matches(r, filter)) return false;
      if (!needle) return true;
      const host = personById(r.hostId)?.name ?? "you";
      return [r.name, r.topic, r.category, host, r.code].some((s) => s.toLowerCase().includes(needle));
    });
  }, [rooms, q, filter]);
  const sortedResults = useMemo(() => [...results].sort(byOnline(live)), [results, live]);

  const browsing = !q.trim() && filter === "All";
  const recommended = [...rooms].filter((r) => r.live && !r.createdByMe).sort((a, b) => b.members - a.members).slice(0, 5);

  return (
    <div className="app-scroll h-full pb-[calc(96px+var(--mini,0px)+env(safe-area-inset-bottom))]">
      <header className="pt-safe sticky top-0 z-20 bg-ink/90 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="sr-only">Rooms</h1>
          <div role="tablist" aria-label="Rooms" className="flex items-baseline gap-4">
            {TOP.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={top === t}
                onClick={() => setTop(t)}
                className={`relative font-display font-extrabold transition-all ${top === t ? "text-[24px] text-cream" : "text-[17px] text-cream/45 hover:text-cream/70"}`}
              >
                {t}
                {top === t ? <motion.span layoutId="rooms-top" className="absolute -bottom-1 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-coral" /> : null}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSheet({ kind: "join-room" })} className="flex h-10 items-center gap-1 rounded-full bg-cream/[0.08] px-3.5 text-[12.5px] font-bold text-cream">
              <Hash className="h-4 w-4" aria-hidden /> Join by ID
            </button>
            <IconButton label="Create room" onClick={() => push({ kind: "create-room" })} className="!bg-coral !text-white">
              <Plus className="h-5 w-5" />
            </IconButton>
          </div>
        </div>
        {top === "All" ? <div className="space-y-3 px-4 pb-3">
          <SearchField value={q} onChange={setQ} placeholder="Search rooms, hosts or room ID" />
          <Chips items={FILTERS} value={filter} onChange={setFilter} label="Room type" />
        </div> : null}
      </header>

      {top === "My room" ? (
        <MyRoomTab onFind={() => setTop("All")} />
      ) : browsing ? (
        <>
          <NewbieRooms className="mt-1" />
          <LiveRooms />
          <section className="mt-3">
            <SectionTitle>Recommended</SectionTitle>
            <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
              {recommended.map((r) => (
                <RoomCard key={r.id} room={r} />
              ))}
            </div>
          </section>
          <Section title="Voice rooms" action={() => setFilter("Voice")}>
            {rooms.filter((r) => r.type === "voice" && !r.vip).slice(0, 4).map((r) => (
              <RoomRow key={r.id} room={r} />
            ))}
          </Section>
          <Section title="YouTube Watch Together" action={() => setFilter("YouTube")}>
            {rooms.filter((r) => r.type === "watch" && !r.vip).map((r) => (
              <RoomRow key={r.id} room={r} />
            ))}
          </Section>
          <Section title="Kharidari auctions" action={() => setFilter("Kharidari")}>
            {rooms.filter((r) => r.type === "kharidari").map((r) => (
              <RoomRow key={r.id} room={r} />
            ))}
          </Section>
          <section className="mt-7">
            <SectionTitle action="All VIP" onAction={() => setFilter("VIP")}>
              VIP rooms
            </SectionTitle>
            <div className="grid grid-cols-2 gap-3 px-4">
              {rooms.filter((r) => r.vip).slice(0, 2).map((r) => (
                <RoomCard key={r.id} room={r} wide />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="pt-2" aria-live="polite">
          <p className="px-4 pb-1 text-xs text-muted">
            {results.length} {results.length === 1 ? "room" : "rooms"}
          </p>
          <AnimatePresence initial={false}>
            {sortedResults.map((r) => (
              <motion.div key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <RoomRow room={r} />
              </motion.div>
            ))}
          </AnimatePresence>
          {results.length === 0 ? (
            <div className="flex flex-col items-center px-8 pt-14 text-center">
              <SearchX className="h-10 w-10 text-muted" aria-hidden />
              <p className="mt-3 font-display text-lg font-bold text-cream">No rooms found</p>
              <p className="mt-1 text-sm text-muted">Try another word, or start your own room.</p>
              <button type="button" onClick={() => push({ kind: "create-room" })} className="mt-5 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white">
                Create a room
              </button>
            </div>
          ) : null}
        </section>
      )}

    </div>
  );
}

/** "My room": your own room on top, then rooms you visited, joined or follow. */
function MyRoomTab({ onFind }: { onFind: () => void }) {
  const { rooms, myRooms, push, isJoined, isFollowingRoom, recentRoomIds, openRoom, roomLevelOf } = useApp();
  const [tab, setTab] = useState<Mine>("Recents");
  const mine = myRooms[0];
  const list =
    tab === "Recents"
      ? recentRoomIds.map((id) => rooms.find((r) => r.id === id)).filter((r): r is Room => !!r && r.id !== mine?.id)
      : rooms.filter((r) => !r.createdByMe && r.id !== mine?.id && (tab === "Joined" ? isJoined(r.id) : isFollowingRoom(r.id)));
  return (
    <div className="px-4 pt-2">
      {mine ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => openRoom(mine.id)}
          className="relative flex w-full items-center gap-3 rounded-3xl bg-surface p-3 text-left ring-1 ring-line"
        >
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
            <RoomCover room={mine} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[17px] font-bold text-cream">{mine.name}</span>
            <span className="mt-1 flex items-center gap-1.5 text-[11.5px]">
              <span className="font-bold text-coral">{mine.type === "watch" ? "YouTube" : mine.type === "kharidari" ? "Kharidari" : "Voice"}</span>
              {mine.permanent ? <span className="rounded-md bg-gold/15 px-1.5 py-0.5 font-bold text-gold">Lv.{roomLevelOf(mine).level}</span> : null}
              <span className="truncate text-muted">ID {mine.code}</span>
            </span>
          </span>
          <span className="absolute right-0 top-0 rounded-bl-xl rounded-tr-3xl bg-coral px-2.5 py-0.5 text-[10.5px] font-bold text-white">My room</span>
        </motion.button>
      ) : (
        <button
          type="button"
          onClick={() => push({ kind: "create-room" })}
          className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-cream/20 bg-surface/60 p-3 text-left"
        >
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-coral/15 text-coral">
            <Plus className="h-7 w-7" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[16px] font-bold text-cream">Create your room</span>
            <span className="mt-0.5 block text-[12px] text-muted">Your own room shows up here</span>
          </span>
        </button>
      )}

      <div role="tablist" aria-label="My rooms" className="mt-5 flex items-baseline gap-5">
        {MINE.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`relative font-display font-bold transition-all ${tab === t ? "text-[18px] text-cream" : "text-[14px] text-cream/45 hover:text-cream/70"}`}
          >
            {t}
            {tab === t ? <motion.span layoutId="rooms-mine" className="absolute -bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-coral" /> : null}
          </button>
        ))}
      </div>

      {list.length ? (
        <div className="-mx-4 mt-2">
          {list.map((r) => (
            <RoomRow key={r.id} room={r} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 pt-14 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-cream/[0.06] text-cream/50">
            <Compass className="h-9 w-9" aria-hidden />
          </span>
          <p className="mt-4 text-[13.5px] text-muted">
            {tab === "Recents" ? "No rooms visited yet" : tab === "Joined" ? "You haven't joined any rooms yet" : "You aren't following any rooms yet"}
          </p>
          <button type="button" onClick={onFind} className="mt-5 rounded-full bg-coral px-8 py-2.5 text-[14px] font-bold text-white">
            Go find rooms
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Rooms from the backend. "Active now" is the rooms with people in them, the busiest first, with the
 * number online; rooms nobody is in follow below. The list reloads by itself while the tab is open, and
 * a failed load just keeps what is already showing (no error box).
 */
function LiveRooms() {
  const live = useServerRooms();
  const counts = useLiveCounts();
  const { rooms } = useApp();
  const { refresh } = live;
  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [refresh]);
  const real = useMemo(() => rooms.filter((r) => r.server && !r.createdByMe), [rooms]);
  const active = useMemo(() => activeRooms(real, counts, { gameTables: true }), [real, counts]);
  const quiet = useMemo(() => real.filter((r) => !active.includes(r) && !(isGameTable(r.name) && counts)).sort((a, b) => b.members - a.members), [real, active, counts]);
  const firstLoad = live.status === "loading" && !live.loadedAt;
  return (
    <section className="mt-5" aria-live="polite" aria-busy={live.status === "loading"}>
      <SectionTitle action={live.status === "loading" ? undefined : "Refresh"} onAction={() => void refresh()}>
        Active now
      </SectionTitle>
      {firstLoad ? (
        <div className="space-y-2 px-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-cream/[0.06]" />
          ))}
        </div>
      ) : active.length ? (
        active.map((r) => <RoomRow key={r.id} room={r} />)
      ) : (
        <div className="mx-4 flex items-center gap-3 rounded-2xl bg-cream/[0.05] px-4 py-3">
          <Radio className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          <p className="text-[12.5px] leading-snug text-muted">Nobody is in a room right now. Create one and invite your friends.</p>
        </div>
      )}
      {quiet.length ? (
        <>
          <SectionTitle>Other rooms</SectionTitle>
          {quiet.map((r) => (
            <RoomRow key={r.id} room={r} />
          ))}
        </>
      ) : null}
    </section>
  );
}

function Section({ title, action, children }: { title: string; action?: () => void; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <SectionTitle action={action ? "See all" : undefined} onAction={action}>
        {title}
      </SectionTitle>
      <div>{children}</div>
    </section>
  );
}
