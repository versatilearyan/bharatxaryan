"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Sparkles, Users } from "lucide-react";
import { NewbieBadge } from "./NewbieBadge";
import { Seat } from "@/components/rooms/RoomParts";
import { useSeatScale } from "@/components/rooms/useSeatScale";
import type { RoomSession } from "@/components/rooms/useRoomSession";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { NewbieRoom } from "@/lib/api/newbie";
import { markWelcomeSeen, useNewbieMe, useNewbieRooms } from "@/lib/app/newbie";
import { serverRoomAppId } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";

export { NewbieBadge };

/* ------------------------------------------------------------------ the top of Home and Rooms */

function HostAvatar({ r, size = 54 }: { r: NewbieRoom; size?: number }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="block overflow-hidden rounded-full bg-gradient-to-br from-[#f6d899] via-[#e7bc72] to-[#b8862f] p-[2px] shadow-[0_0_18px_rgba(231,188,114,0.55)]">
        {r.host.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.host.avatarUrl} alt="" className="block rounded-full bg-[#1a0f08] object-cover" style={{ width: size - 4, height: size - 4 }} />
        ) : (
          <span className="grid place-items-center rounded-full bg-[#2a1520] font-bold text-gold" style={{ width: size - 4, height: size - 4, fontSize: size * 0.4 }}>
            {(r.host.name ?? "H").slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span className={`absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full ring-2 ring-[#1a0f08] ${r.host.online ? "bg-[#3ddc84]" : "bg-[#7a7380]"}`} title={r.host.online ? "Host is online" : "Host is away"} />
    </span>
  );
}

function RoomCard({ r, mine }: { r: NewbieRoom; mine: boolean }) {
  const { openRoom } = useApp();
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => openRoom(serverRoomAppId(String(r.roomId)))}
      aria-label={`${r.name}, hosted by ${r.host.name ?? "a host"}`}
      className="relative w-[262px] shrink-0 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#f6d899] via-[#e7bc72] to-[#9a6f2c] p-[1.5px] text-left shadow-[0_14px_34px_-14px_rgba(231,188,114,0.6)]"
    >
      <span className="relative block overflow-hidden rounded-[25px] bg-gradient-to-br from-[#2a1a10] via-[#1b1109] to-[#120a06] p-3.5">
        <span aria-hidden className="pointer-events-none absolute -top-12 -right-10 h-36 w-36 rounded-full bg-gold/25 blur-3xl" />
        <span className="relative flex items-center justify-between">
          <NewbieBadge className="!text-[10px] !px-2 !py-0.5" />
          <span className="text-[11px] font-bold text-cream/45">#{r.number}</span>
        </span>
        <span className="relative mt-3 flex items-center gap-3">
          <HostAvatar r={r} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[16px] leading-tight font-extrabold text-cream">{r.host.name ?? "Host"}</span>
            <span className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-gold">HOST · {r.host.online ? "Online" : "Away"}</span>
          </span>
        </span>
        <span className="relative mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-cream/85">
            <Users className="h-3 w-3 text-gold" aria-hidden /> {r.joined} in room
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-cream/85">🌱 {r.newbiesInside} new</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-cream/85">{r.seatsFree > 0 ? `${r.seatsFree} spots free` : "Full"}</span>
        </span>
        <span className="relative mt-3.5 flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#f6d899] to-[#d9a84f] text-[13.5px] font-extrabold text-[#2a1a0c]">{mine ? "Join your welcome room" : "Join & say hi"}</span>
      </span>
    </motion.button>
  );
}

/** 🌟 NEWBIE WELCOME ROOMS: the open welcome rooms, at the very top. Nothing shows while there are none. */
export function NewbieRooms({ className = "mt-3" }: { className?: string }) {
  const rooms = useNewbieRooms();
  const me = useNewbieMe();
  if (!rooms.length) return null;
  return (
    <section className={className} aria-labelledby="newbie-h">
      <div className="mb-2.5 flex items-center justify-between px-4">
        <h2 id="newbie-h" className="bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#d9a84f] bg-clip-text font-display text-[15px] font-extrabold tracking-[0.12em] text-transparent">
          🌟 NEWBIE WELCOME ROOMS
        </h2>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-cream/55">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3ddc84]" aria-hidden /> {rooms.length} open
        </span>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {rooms.map((r) => (
          <RoomCard key={r.roomId} r={r} mine={me?.roomId === String(r.roomId)} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ inside the room */

/**
 * The seats of a welcome room: a bigger glowing seat for the host on top, the regular seats under it, and (when the
 * host has opened them) a separate section with the 6 extra seats.
 */
export function NewbieSeatLayout({ s, scale = 1 }: { s: RoomSession; scale?: number }) {
  const hostSize = Math.round(92 * scale);
  const size = Math.round(56 * scale);
  const regular = s.seats.map((_, i) => i).filter((i) => i >= 1 && i < 10);
  const extra = s.seats.map((_, i) => i).filter((i) => i >= 10);
  return (
    <div className="w-full px-2">
      <div className="relative mx-auto flex w-fit flex-col items-center pt-3">
        <motion.span aria-hidden className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(246,216,153,0.6),transparent_68%)] blur-md" style={{ width: hostSize + 46, height: hostSize + 46 }} animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />
        <span className="relative rounded-full bg-gradient-to-br from-[#f6d899] via-[#e7bc72] to-[#b8862f] p-[3px] shadow-[0_0_30px_rgba(231,188,114,0.7)]">
          <span className="block rounded-full bg-[#1a0f08] p-[3px]">
            <Seat s={s} index={0} size={hostSize} gold />
          </span>
        </span>
        <span className="absolute top-0 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#f6d899] to-[#d9a84f] px-3 py-0.5 text-[10px] font-extrabold tracking-[0.2em] text-[#2a1a0c] shadow-md">HOST</span>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-2 gap-y-2.5">
        {regular.map((i) => (
          <div key={i} className="flex justify-center" style={{ width: size + 18 }}>
            <Seat s={s} index={i} size={size} gold />
          </div>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {extra.length ? (
          <motion.div key="extra" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mx-1 mt-3.5 rounded-3xl bg-gradient-to-b from-gold/[0.12] to-gold/[0.03] px-2 py-3 ring-1 ring-gold/30">
              <p className="text-center text-[10.5px] font-extrabold tracking-[0.22em] text-gold">✨ EXTRA WELCOME SEATS</p>
              <div className="mt-2.5 flex flex-wrap justify-center gap-x-2 gap-y-2.5">
                {extra.map((i) => (
                  <div key={i} className="flex justify-center" style={{ width: size + 18 }}>
                    <Seat s={s} index={i} size={size} gold />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export { useSeatScale };

/* ------------------------------------------------------------------ the welcome card */

const FEATURES: [string, string, string][] = [
  ["🎙️", "Voice Rooms", "Talk with people and make new friends."],
  ["👨‍👩‍👧‍👦", "Families", "Create or join your own Panchayat family."],
  ["🎁", "Gifts", "Send beautiful animated gifts to your friends."],
  ["💎", "Coins", "Explore coin rewards, activities and gifting."],
  ["❤️", "Friends", "Follow, connect and chat with people."],
  ["🏆", "Rankings", "Take part in rankings and community activities."],
  ["🎉", "Events", "Join exciting activities and special events."],
];

/**
 * Shown once, the first time a newbie enters a welcome room (the server remembers that they have seen it).
 * Title and message come from the admin panel.
 */
export function NewbieWelcome({ s }: { s: RoomSession }) {
  const me = useNewbieMe();
  const { minimizeRoom, setTab } = useApp();
  const [open, setOpen] = useState(false);
  const [tour, setTour] = useState(false);
  const eligible = Boolean(s.room.newbie && me?.newbie && !me.welcomeSeen && !s.room.createdByMe);
  useEffect(() => {
    if (eligible) setOpen(true);
  }, [eligible]);
  const done = () => {
    setOpen(false);
    markWelcomeSeen();
  };
  const host = s.room.hostId;
  return (
    <BottomSheet open={open} onClose={done} title="" tall>
      <div className="px-4 pb-5">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3a2412] via-[#241409] to-[#150b05] p-5 text-center ring-1 ring-gold/40">
          <span aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-gold/30 blur-3xl" />
          <motion.p initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 240, damping: 14 }} className="relative text-[44px]" aria-hidden>
            🎉
          </motion.p>
          <h2 className="relative mt-1 font-display text-[22px] leading-tight font-extrabold text-cream">{me?.welcomeTitle ?? "Welcome to Panchayat!"}</h2>
          <p className="relative mt-1 text-[14px] font-semibold text-gold">Hey Newbie! ❤️</p>
          <p className="relative mx-auto mt-2 max-w-[300px] text-[13px] leading-relaxed text-cream/75">{me?.welcomeMessage}</p>
          <AnimatePresence initial={false}>
            {tour ? (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative mt-3 overflow-hidden text-left">
                {FEATURES.map(([icon, name, text], i) => (
                  <li key={name} className="flex items-start gap-3 border-t border-white/[0.07] py-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gold/12 text-[17px]" aria-hidden>
                      {icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-bold text-cream">
                        {i + 1}. {name}
                      </span>
                      <span className="block text-[12px] text-cream/55">{text}</span>
                    </span>
                  </li>
                ))}
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => setTour((v) => !v)} className="h-11 rounded-full bg-gradient-to-b from-[#f6d899] to-[#d9a84f] text-[13px] font-extrabold text-[#2a1a0c]">
            {tour ? "Hide features" : "Explore Panchayat"}
          </button>
          <button
            type="button"
            onClick={() => {
              done();
              s.openCard(host);
            }}
            className="h-11 rounded-full bg-white/[0.09] text-[13px] font-bold text-cream ring-1 ring-white/10"
          >
            Meet the Host
          </button>
          <button
            type="button"
            onClick={() => {
              done();
              minimizeRoom();
              setTab("rooms");
            }}
            className="h-11 rounded-full bg-white/[0.09] text-[13px] font-bold text-cream ring-1 ring-white/10"
          >
            Explore Voice Rooms
          </button>
          <button type="button" onClick={() => window.open("/terms", "_blank", "noopener")} className="h-11 rounded-full bg-white/[0.09] text-[13px] font-bold text-cream ring-1 ring-white/10">
            Community Rules
          </button>
        </div>
        <button type="button" onClick={done} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] font-bold text-cream/60">
          <Gift className="h-4 w-4 text-gold" aria-hidden /> Got it, let me in
        </button>
      </div>
    </BottomSheet>
  );
}
