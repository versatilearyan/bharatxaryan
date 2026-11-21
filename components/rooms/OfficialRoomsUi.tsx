"use client";

import { motion } from "framer-motion";
import { ShieldCheck, UsersRound } from "lucide-react";
import { RoomCover } from "@/components/rooms/RoomCover";
import { usePublicProfile } from "@/components/profile/usePublicProfile";
import { onMicIn, useLiveCounts } from "@/lib/app/live-counts";
import { usePeople } from "@/lib/app/people";
import { useApp } from "@/lib/app/store";
import type { Room } from "@/lib/app/types";

function OfficialCard({ room }: { room: Room }) {
  // The host's real name and photo (not "User 9"), loaded once
  usePublicProfile(room.server && room.hostId.startsWith("srv-user:") ? room.hostId : "");
  const live = useLiveCounts();
  const { openRoom } = useApp();
  const person = usePeople();
  const host = person(room.hostId);
  const n = room.server && live ? (live[room.server.id] ?? 0) : 0;
  const mic = room.server ? onMicIn(room.server.id) : 0;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => openRoom(room.id)}
      aria-label={`${room.name}, an official Panchayat room`}
      className="relative w-[220px] shrink-0 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#16233f] via-[#101a30] to-[#0a1222] p-3.5 text-left ring-1 ring-[#3b82f6]/40"
    >
      <span aria-hidden className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-[#2f6bf0]/25 blur-3xl" />
      <span className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#2f6bf0]/20 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-[#8ab4ff] ring-1 ring-[#3b82f6]/40">
          <ShieldCheck className="h-3 w-3" aria-hidden /> Official
        </span>
        {/* Official rooms always read as live, no matter who's inside right now */}
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#3ddc84]">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3ddc84]/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3ddc84]" />
          </span>
          Live
        </span>
      </span>
      <span className="relative mt-3 block h-[84px] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
        <RoomCover room={room} />
      </span>
      <span className="relative mt-2.5 flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[14.5px] font-extrabold text-cream">{room.name}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-cream/55">
            <UsersRound className="h-3 w-3" aria-hidden />
            {mic ? `🎙 ${mic} · ${n} inside` : `${n} inside`}
          </span>
        </span>
      </span>
    </motion.button>
  );
}

/**
 * 🛡️ OFFICIAL ROOMS: Panchayat's own rooms (owned by the Sarpanch), always shown as live,
 * in their own blue space right after the Newbie Welcome Rooms. Nothing shows while there are none.
 */
export function OfficialRooms({ className = "mt-5" }: { className?: string }) {
  const { rooms } = useApp();
  const official = rooms.filter((r) => r.official);
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
