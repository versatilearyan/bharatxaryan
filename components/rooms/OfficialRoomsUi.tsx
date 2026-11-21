"use client";

import { motion } from "framer-motion";
import { ShieldCheck, UsersRound } from "lucide-react";
import { RoomCover } from "@/components/rooms/RoomCover";
import { usePublicProfile } from "@/components/profile/usePublicProfile";
import { byOnline } from "@/lib/app/active-rooms";
import { onMicIn, useLiveCounts } from "@/lib/app/live-counts";
import { useApp } from "@/lib/app/store";
import type { Room } from "@/lib/app/types";

/** A big hero card, same scale as Newbie's, in Panchayat's blue instead of Newbie's gold. */
function OfficialCard({ room }: { room: Room }) {
  // The host's real name and photo (not "User 9"), loaded once
  usePublicProfile(room.server && room.hostId.startsWith("srv-user:") ? room.hostId : "");
  const live = useLiveCounts();
  const { openRoom } = useApp();
  const n = room.server && live ? (live[room.server.id] ?? 0) : 0;
  const mic = room.server ? onMicIn(room.server.id) : 0;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => openRoom(room.id)}
      aria-label={`${room.name}, an official Panchayat room`}
      className="relative w-[262px] shrink-0 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#7fb4ff] via-[#3b82f6] to-[#1c3f8f] p-[1.5px] text-left"
    >
      <span className="relative block overflow-hidden rounded-[25px] bg-gradient-to-br from-[#101c38] via-[#0a1222] to-[#060a16] p-3.5">
        <span aria-hidden className="pointer-events-none absolute -top-12 -right-10 h-36 w-36 rounded-full bg-[#3b82f6]/25 blur-3xl" />
        <span className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#3b82f6]/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#8ab4ff] ring-1 ring-[#3b82f6]/40">
            <ShieldCheck className="h-3 w-3" aria-hidden /> Official
          </span>
          {/* Official rooms always read as live, no matter who's inside right now */}
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3ddc84]">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3ddc84]/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3ddc84]" />
            </span>
            Live
          </span>
        </span>
        <span className="relative mt-3 block h-[110px] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
          <RoomCover room={room} />
        </span>
        <span className="relative mt-3 block truncate font-display text-[17px] font-extrabold text-cream">{room.name}</span>
        <span className="relative mt-1.5 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-cream/85">
            <UsersRound className="h-3 w-3 text-[#8ab4ff]" aria-hidden /> {n} inside
          </span>
          {mic ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-cream/85">🎙 {mic} on mic</span>
          ) : null}
        </span>
        <span className="relative mt-3.5 flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-[#6ea2ff] to-[#2f6bf0] text-[13.5px] font-extrabold text-white">Join</span>
      </span>
    </motion.button>
  );
}

/**
 * 🛡️ OFFICIAL ROOMS: Panchayat's own rooms, always shown as live, in their own big blue space right
 * after the Newbie Welcome Rooms, busiest room first. Nothing shows while there are none.
 */
export function OfficialRooms({ className = "mt-5" }: { className?: string }) {
  const { rooms } = useApp();
  const live = useLiveCounts();
  // Newbie Welcome rooms get their own section above this one, even the ones that also carry the official flag
  const official = [...rooms.filter((r) => r.official && !r.newbie)].sort(byOnline(live));
  if (!official.length) return null;
  return (
    <section className={className} aria-labelledby="official-rooms-h">
      <div className="mb-2.5 flex items-center justify-between px-4">
        <h2 id="official-rooms-h" className="bg-gradient-to-r from-[#8ab4ff] via-[#5f8dfb] to-[#2f6bf0] bg-clip-text font-display text-[15px] font-extrabold tracking-[0.12em] text-transparent">
          🛡️ OFFICIAL ROOMS
        </h2>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {official.map((r) => (
          <OfficialCard key={r.id} room={r} />
        ))}
      </div>
    </section>
  );
}
