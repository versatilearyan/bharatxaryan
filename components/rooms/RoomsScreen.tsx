"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Hash, Plus, RefreshCw, Radio, SearchX } from "lucide-react";
import { Chips, IconButton, SearchField, SectionTitle } from "@/components/ui/kit";
import { RoomCard, RoomRow } from "./RoomCards";
import { personById } from "@/lib/app/data";
import { useApp } from "@/lib/app/store";
import { useServerRooms } from "@/lib/app/server-rooms";
import type { Room } from "@/lib/app/types";

const FILTERS = ["All", "Voice", "YouTube", "Kharidari", "VIP"] as const;
type Filter = (typeof FILTERS)[number];

const matches = (r: Room, f: Filter) =>
  f === "All" || (f === "VIP" ? r.vip : f === "Voice" ? r.type === "voice" : f === "Kharidari" ? r.type === "kharidari" : r.type === "watch");

export function RoomsScreen() {
  const { rooms, myRooms, push, setSheet, isJoined, isFollowingRoom } = useApp();
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

  const browsing = !q.trim() && filter === "All";
  const recommended = [...rooms].filter((r) => r.live && !r.createdByMe).sort((a, b) => b.members - a.members).slice(0, 5);

  return (
    <div className="app-scroll h-full pb-[calc(96px+var(--mini,0px)+env(safe-area-inset-bottom))]">
      <header className="pt-safe sticky top-0 z-20 bg-ink/90 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="font-display text-[24px] font-extrabold text-cream">Rooms</h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSheet({ kind: "join-room" })} className="flex h-10 items-center gap-1 rounded-full bg-cream/[0.08] px-3.5 text-[12.5px] font-bold text-cream">
              <Hash className="h-4 w-4" aria-hidden /> Join by ID
            </button>
            <IconButton label="Create room" onClick={() => push({ kind: "create-room" })} className="!bg-coral !text-white">
              <Plus className="h-5 w-5" />
            </IconButton>
          </div>
        </div>
        <div className="space-y-3 px-4 pb-3">
          <SearchField value={q} onChange={setQ} placeholder="Search rooms, hosts or room ID" />
          <Chips items={FILTERS} value={filter} onChange={setFilter} label="Room type" />
        </div>
      </header>

      {browsing ? (
        <>
          <LiveRooms />
          {myRooms.length ? (
            <Section title="Your rooms">
              {myRooms.map((r) => (
                <RoomRow key={r.id} room={r} />
              ))}
            </Section>
          ) : null}
          {rooms.some((r) => !r.createdByMe && (isJoined(r.id) || isFollowingRoom(r.id))) ? (
            <Section title="Joined & following">
              {rooms
                .filter((r) => !r.createdByMe && (isJoined(r.id) || isFollowingRoom(r.id)))
                .map((r) => (
                  <RoomRow key={r.id} room={r} />
                ))}
            </Section>
          ) : null}
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
            {results.map((r) => (
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

      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => push({ kind: "create-room" })}
        className="absolute bottom-[calc(80px+var(--mini,0px)+env(safe-area-inset-bottom))] right-4 z-20 flex h-12 items-center gap-2 rounded-full bg-coral px-5 font-bold text-white shadow-[0_12px_30px_-8px_rgb(244_81_91/0.8)]"
      >
        <Plus className="h-5 w-5" aria-hidden /> Create Room
      </motion.button>
    </div>
  );
}

/** Rooms from the backend: loading skeletons, an empty state, and errors with Retry. */
function LiveRooms() {
  const live = useServerRooms();
  const { rooms } = useApp();
  const { refresh } = live;
  // Reload when the Rooms tab opens so closed rooms drop off
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const list = rooms.filter((r) => r.server && !r.createdByMe);
  const firstLoad = live.status === "loading" && !live.loadedAt;
  return (
    <section className="mt-5" aria-live="polite" aria-busy={live.status === "loading"}>
      <SectionTitle action={live.status === "loading" ? undefined : "Refresh"} onAction={() => void refresh()}>
        Live rooms
      </SectionTitle>
      {firstLoad ? (
        <div className="space-y-2 px-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-cream/[0.06]" />
          ))}
        </div>
      ) : live.status === "error" ? (
        <div className="mx-4 flex items-center gap-3 rounded-2xl bg-coral/10 px-4 py-3 ring-1 ring-coral/25">
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-cream">{live.error || "Couldn't load live rooms."}</p>
          <button type="button" onClick={() => void refresh()} className="flex shrink-0 items-center gap-1 rounded-full bg-cream/15 px-3 py-1.5 text-[12px] font-bold text-cream">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry
          </button>
        </div>
      ) : list.length ? (
        list.map((r) => <RoomRow key={r.id} room={r} />)
      ) : live.status === "ready" ? (
        <div className="mx-4 flex items-center gap-3 rounded-2xl bg-cream/[0.05] px-4 py-3">
          <Radio className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          <p className="text-[12.5px] leading-snug text-muted">No live rooms right now. Create one and invite your friends.</p>
        </div>
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
