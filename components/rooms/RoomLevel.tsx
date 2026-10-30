"use client";

import { motion } from "framer-motion";
import { Clock3, Gem } from "lucide-react";
import { ROOM_LEVEL_PERKS } from "@/lib/app/data";
import { POINTS_PER_COIN, formatPoints } from "@/lib/app/levels";
import { useApp } from "@/lib/app/store";
import type { Room } from "@/lib/app/types";

/** Room level progress (permanent rooms) or the temporary-room notice. */
export function RoomLevelCard({ room, className = "" }: { room: Room; className?: string }) {
  const { roomLevelOf } = useApp();
  if (!room.permanent) {
    return (
      <div className={`flex items-start gap-2.5 rounded-2xl bg-cream/[0.05] p-3 ${className}`}>
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
        <p className="text-[12px] leading-snug text-muted">
          Temporary room. It closes when the host leaves and doesn&apos;t level up. Permanent rooms cost 1,000 coins and grow to level 10 from gifts.
        </p>
      </div>
    );
  }
  const l = roomLevelOf(room);
  const nextPerk = l.level < 10 ? ROOM_LEVEL_PERKS[l.level + 1] : null;
  return (
    <div className={`rounded-2xl bg-gradient-to-br from-gold/15 to-transparent p-3 ring-1 ring-gold/25 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold/20 text-gold">
          <Gem className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-cream">
            Room level {l.level}
            <span className="font-medium text-muted"> / 10</span>
          </p>
          <p className="text-[11px] text-muted">
            {formatPoints(l.points)} pts{l.next !== null ? ` · ${formatPoints(l.next - l.points)} to level ${l.level + 1}` : " · max level"}
          </p>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-cream/10">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-coral to-gold" initial={false} animate={{ width: `${l.progress * 100}%` }} transition={{ duration: 0.6 }} />
      </div>
      <p className="mt-2 text-[11px] text-cream/70">
        Every 1 coin gifted here adds {POINTS_PER_COIN} points.{nextPerk ? ` Next: ${nextPerk}.` : ""}
      </p>
    </div>
  );
}
