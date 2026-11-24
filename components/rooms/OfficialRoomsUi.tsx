"use client";

import { RoomCard } from "@/components/rooms/RoomCards";
import { SectionTitle } from "@/components/ui/kit";
import { byOnline } from "@/lib/app/active-rooms";
import { useLiveCounts } from "@/lib/app/live-counts";
import { useApp } from "@/lib/app/store";

/**
 * OFFICIAL ROOMS: Panchayat's own rooms, always shown as live, right after the Newbie Welcome Rooms,
 * busiest room first. Same cards as Trending voice rooms. Nothing shows while there are none.
 */
export function OfficialRooms({ className = "mt-8" }: { className?: string }) {
  const { rooms } = useApp();
  const live = useLiveCounts();
  // Newbie Welcome rooms get their own section above this one, even the ones that also carry the official flag
  // Official PK rooms have their own section at the very top of Rooms
  const official = [...rooms.filter((r) => r.official && !r.newbie && !r.officialPk)].sort(byOnline(live));
  if (!official.length) return null;
  return (
    <section className={className} aria-labelledby="official-rooms-h">
      <SectionTitle>
        <span id="official-rooms-h">Official rooms</span>
      </SectionTitle>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {official.map((r) => (
          // Official rooms always read as live, no matter who's inside right now
          <RoomCard key={r.id} room={r.live ? r : { ...r, live: true }} />
        ))}
      </div>
    </section>
  );
}

/** OFFICIAL PK: the admin's Official PK rooms, first thing on the Rooms tab, busiest first, always shown as live. */
export function OfficialPkRooms({ className = "mt-1" }: { className?: string }) {
  const { rooms } = useApp();
  const live = useLiveCounts();
  const pk = [...rooms.filter((r) => r.officialPk)].sort(byOnline(live));
  if (!pk.length) return null;
  return (
    <section className={className} aria-labelledby="official-pk-rooms-h">
      <SectionTitle>
        <span id="official-pk-rooms-h">⚔️ Official PK</span>
      </SectionTitle>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {pk.map((r) => (
          <RoomCard key={r.id} room={r.live ? r : { ...r, live: true }} />
        ))}
      </div>
    </section>
  );
}
