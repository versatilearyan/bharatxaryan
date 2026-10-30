"use client";

import { RoomCover } from "@/components/rooms/RoomCover";
import { motion } from "framer-motion";
import { Crown, Gavel, Lock, Mic, MonitorPlay, UsersRound } from "lucide-react";
import { CharmBadge } from "@/components/ui/CharmBadge";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { LiveDot, Pill, formatCount } from "@/components/ui/kit";
import { usePeople } from "@/lib/app/people";
import { useApp } from "@/lib/app/store";
import type { Room, RoomType } from "@/lib/app/types";
import { nameFace } from "@/lib/app/fonts";

export const ROOM_TYPE_LABEL: Record<RoomType, string> = { voice: "Voice", watch: "YouTube", kharidari: "Kharidari" };
export const ROOM_TYPE_ICON = { voice: Mic, watch: MonitorPlay, kharidari: Gavel } as const;

/** Backend rooms send no participant count, so show the capacity instead of a made-up number. */
const headcount = (room: Room) => (room.server ? (room.server.maxParticipants ? `Up to ${room.server.maxParticipants}` : "") : formatCount(room.members));

export function RoomTypeBadge({ type }: { type: RoomType }) {
  const Icon = ROOM_TYPE_ICON[type];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cream/[0.08] px-2 py-0.5 text-[10.5px] font-semibold text-cream/80">
      <Icon className="h-3 w-3" aria-hidden />
      {ROOM_TYPE_LABEL[type]}
    </span>
  );
}

/** Horizontal list row, like "Popular rooms" in the reference. */
export function RoomRow({ room }: { room: Room }) {
  const { openRoom, roomLevelOf } = useApp();
  const person = usePeople();
  const host = person(room.hostId);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => openRoom(room.id)}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left transition-colors hover:bg-cream/[0.03]"
    >
      <span className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-2xl ring-1 ring-line">
        <RoomCover room={room} />
        <span className="absolute bottom-1 left-1">
          <PersonAvatar person={host} size={26} />
        </span>
        {room.vip ? (
          <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-ink">
            <Crown className="h-3 w-3" aria-hidden />
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={`truncate font-display text-[16px] font-bold ${room.vip ? "gold-shine pr-1" : "text-cream"}`} style={nameFace(room.settings?.nameFont)}>{room.name}</span>
          {room.isPrivate || room.password ? <Lock className="h-3.5 w-3.5 shrink-0 text-muted" aria-label={room.password ? "Password" : "Private"} /> : null}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
          <span className="rounded-md bg-[#3a2f6e]/70 px-1.5 py-0.5 font-semibold text-[#c9b8ff]">{room.category}</span>
          {room.permanent ? (
            <span className="rounded-md bg-gold/15 px-1.5 py-0.5 font-bold text-gold">Lv.{roomLevelOf(room).level}</span>
          ) : (
            <span className="rounded-md bg-cream/10 px-1.5 py-0.5 font-bold text-cream/70">Temp</span>
          )}
          {headcount(room) ? (
            <span className="inline-flex items-center gap-1">
              <UsersRound className="h-3 w-3" aria-hidden />
              {headcount(room)}
            </span>
          ) : null}
          <span className="inline-flex min-w-0 items-center gap-1">
            <span className="truncate">{host.name}</span>
            <CharmBadge personId={host.id} />
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        {room.live ? (
          <Pill tone="live">
            <LiveDot /> Live
          </Pill>
        ) : (
          <Pill tone="default">Quiet</Pill>
        )}
        <span className="rounded-full bg-coral/15 px-3 py-1 text-[11.5px] font-bold text-pink">Join</span>
      </span>
    </motion.button>
  );
}

/** Vertical cover card for carousels and grids. */
export function RoomCard({ room, wide = false }: { room: Room; wide?: boolean }) {
  const { openRoom } = useApp();
  const person = usePeople();
  const host = person(room.hostId);
  const Icon = ROOM_TYPE_ICON[room.type];
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => openRoom(room.id)}
      className={`group relative shrink-0 overflow-hidden rounded-3xl text-left ring-1 ${room.vip ? "ring-gold/40" : "ring-line"} ${wide ? "w-full" : "w-[168px]"}`}
      aria-label={`${room.name}, ${ROOM_TYPE_LABEL[room.type]} room hosted by ${host.name}${room.server ? "" : `, ${room.members} people`}`}
    >
      <span className={`block ${wide ? "aspect-[16/9]" : "aspect-[4/5]"}`}>
        <RoomCover room={room} shade />
      </span>
      <span className="absolute left-2.5 top-2.5 flex gap-1.5">
        {room.vip ? (
          <Pill tone="vip">
            <Crown className="h-3 w-3" aria-hidden /> VIP
          </Pill>
        ) : room.live ? (
          <Pill tone="live">
            <LiveDot /> Live
          </Pill>
        ) : null}
      </span>
      <span className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-cream backdrop-blur">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="absolute inset-x-0 bottom-0 p-3">
        <span className={`line-clamp-2 font-display text-[15px] font-bold leading-tight ${room.vip ? "gold-shine pr-1" : "text-cream"}`} style={nameFace(room.settings?.nameFont)}>{room.name}</span>
        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-cream/75">
          <PersonAvatar person={host} size={18} />
          <span className="truncate">{host.name}</span>
          {headcount(room) ? (
            <span className="ml-auto inline-flex items-center gap-0.5">
              <UsersRound className="h-3 w-3" aria-hidden />
              {headcount(room)}
            </span>
          ) : null}
        </span>
      </span>
    </motion.button>
  );
}
