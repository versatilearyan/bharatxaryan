"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { RoomCover } from "@/components/rooms/RoomCover";
import { usePublicProfile } from "@/components/profile/usePublicProfile";
import { byOnline } from "@/lib/app/active-rooms";
import { onMicIn, useLiveCounts } from "@/lib/app/live-counts";
import { useApp } from "@/lib/app/store";
import type { Room } from "@/lib/app/types";

/** A small, low-key card: official rooms are a quiet utility space (payments, feedback, PK), not a hero moment like Newbie's. */
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
      className="relative flex w-[168px] shrink-0 items-center gap-2 overflow-hidden rounded-2xl bg-[#121a2c] p-2 text-left ring-1 ring-[#3b82f6]/25"
    >
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10">
        <RoomCover room={room} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 shrink-0 text-[#6ea2ff]" aria-hidden />
          <span className="truncate font-display text-[12.5px] font-bold text-cream">{room.name}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-cream/50">
          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3ddc84]/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3ddc84]" />
          </span>
          {mic ? `${mic} on mic · ${n} inside` : `${n} inside`}
        </span>
      </span>
    </motion.button>
  );
}

/**
 * 🛡️ OFFICIAL ROOMS: Panchayat's own utility rooms (payments, feedback, PK and the like), always shown
 * as live. Kept deliberately smaller and quieter than the Newbie Welcome Rooms hero cards, in its own
 * space right after them, busiest room first. Nothing shows while there are none.
 */
export function OfficialRooms({ className = "mt-5" }: { className?: string }) {
  const { rooms } = useApp();
  const live = useLiveCounts();
  const official = [...rooms.filter((r) => r.official)].sort(byOnline(live));
  if (!official.length) return null;
  return (
    <section className={className} aria-labelledby="official-rooms-h">
      <div className="mb-2 flex items-center justify-between px-4">
        <h2 id="official-rooms-h" className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-[0.1em] text-[#6ea2ff]/80">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Official rooms
        </h2>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
        {official.map((r) => (
          <OfficialCard key={r.id} room={r} />
        ))}
      </div>
    </section>
  );
}
