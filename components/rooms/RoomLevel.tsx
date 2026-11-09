"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Clock3, Gem } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ROOM_LEVEL_PERKS } from "@/lib/app/data";
import { POINTS_PER_COIN, ROOM_LEVEL_TABLE, formatPoints } from "@/lib/app/levels";
import { useApp } from "@/lib/app/store";
import { getRoomLevel, type RoomLevelInfo } from "@/lib/api/voice-rooms";
import type { Room } from "@/lib/app/types";

const n = (v: number) => v.toLocaleString("en-IN");
const k = (v: number) => (v >= 1_000_000 ? `${v / 1_000}k` : v >= 1_000 ? `${v / 1_000}k` : String(v));

/** Room level progress (permanent rooms) or the temporary-room notice. */
export function RoomLevelCard({ room, className = "" }: { room: Room; className?: string }) {
  const { roomLevelOf } = useApp();
  const [open, setOpen] = useState(false);
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
  // Backend rooms level up from room EXP (time spent in the room and gifts)
  if (room.server) {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className={`block w-full rounded-2xl bg-gradient-to-br from-gold/15 to-transparent p-3 text-left ring-1 ring-gold/25 ${className}`} aria-label="Open room level details">
          <span className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold/20 text-gold">
              <Gem className="h-4.5 w-4.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-cream">
                Room level {l.level}
                <span className="font-medium text-muted"> / 10</span>
              </span>
              <span className="block text-[11px] text-muted">
                {n(l.points)} EXP{l.next !== null ? ` · ${n(l.next - l.points)} to level ${l.level + 1}` : " · max level"}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
          </span>
          <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-cream/10">
            <motion.span className="block h-full rounded-full bg-gradient-to-r from-coral to-gold" initial={false} animate={{ width: `${l.progress * 100}%` }} transition={{ duration: 0.6 }} />
          </span>
          <span className="mt-2 block text-[11px] text-cream/70">Time spent in the room and gifts earn EXP. Tap for tasks and what each level unlocks.</span>
        </button>
        <RoomLevelSheet open={open} onClose={() => setOpen(false)} room={room} />
      </>
    );
  }
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

/** Room level screen: today's EXP tasks, and what each of the 10 levels unlocks. */
export function RoomLevelSheet({ open, onClose, room }: { open: boolean; onClose: () => void; room: Room }) {
  const [tab, setTab] = useState<"tasks" | "levels">("tasks");
  const [info, setInfo] = useState<RoomLevelInfo | null>(null);
  const id = room.server?.id;

  // Fresh numbers when it opens, and every minute while it stays open
  useEffect(() => {
    if (!open || !id) return;
    let live = true;
    const load = () =>
      getRoomLevel(id)
        .then((d) => live && setInfo(d))
        .catch(() => undefined);
    void load();
    const t = window.setInterval(load, 60_000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [open, id]);

  const exp = info?.exp ?? room.exp ?? 0;
  const level = info?.level ?? 1;
  const cur = ROOM_LEVEL_TABLE[level - 1];
  const next = ROOM_LEVEL_TABLE[level] ?? null;
  const progress = next ? Math.max(0, Math.min(1, (exp - cur.exp) / (next.exp - cur.exp))) : 1;
  const t = info?.today;

  return (
    <BottomSheet open={open} onClose={onClose} title="Room level" tall>
      <div className="px-4 pb-6">
        <div className="rounded-3xl bg-gradient-to-b from-gold/15 to-transparent p-4 text-center ring-1 ring-gold/25">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gold/20 font-display text-[30px] font-extrabold text-gold">{level}</span>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div className="h-full rounded-full bg-gradient-to-r from-coral to-gold" initial={false} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.6 }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-muted">
            <span>Lv{level}</span>
            <span className="font-semibold text-cream">
              {n(exp)}
              {next ? ` / ${n(next.exp)}` : ""}
            </span>
            <span>{next ? `Lv${next.level}` : "Max"}</span>
          </div>
        </div>

        <div className="mt-4 flex rounded-full bg-cream/[0.06] p-1" role="tablist">
          {(
            [
              ["tasks", "Tasks today"],
              ["levels", "Level explanation"],
            ] as const
          ).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`flex-1 rounded-full py-2 text-[12.5px] font-bold ${tab === key ? "bg-gold text-ink" : "text-cream/70"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "tasks" ? (
          <div className="mt-4 space-y-4">
            <Task title="Spend time in the room" rule="Every person in the room: 5 minutes = 5 EXP (double for VIP)" done={t?.voice ?? 0} cap={t?.voiceCap ?? 5000} />
            <Task title="Send gifts or red packets" rule="10 coins = 1 EXP. Red packets count for the 10,000 and 50,000 ones" done={t?.gift ?? 0} cap={t?.giftCap ?? 50000} />
            <ul className="space-y-1.5 rounded-2xl bg-cream/[0.05] p-3 text-[11.5px] leading-snug text-muted">
              <li>• A room can earn at most {n(t?.totalCap ?? 55000)} EXP a day.</li>
              <li>• A locked room (private, or with a password) earns no EXP{info?.locked ? ": this room is locked now." : "."}</li>
              <li>• Gifts from a Bag don&apos;t count. The day changes at midnight (India time).</li>
            </ul>
          </div>
        ) : (
          <div className="mt-4">
            <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
              <table className="w-full min-w-[520px] text-center text-[12px]">
                <thead className="bg-cream/[0.06] text-[10.5px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-2 py-2">Level</th>
                    <th className="px-2 py-2">EXP</th>
                    <th className="px-2 py-2">Members</th>
                    <th className="px-2 py-2">Admins</th>
                    <th className="px-2 py-2">Co-owners</th>
                    <th className="px-2 py-2">Cards</th>
                    <th className="px-2 py-2 text-left">Room background</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ROOM_LEVEL_TABLE.map((r) => (
                    <tr key={r.level} className={r.level === level ? "bg-gold/15 font-bold text-cream" : r.level < level ? "text-cream/70" : "text-cream/85"}>
                      <td className="px-2 py-2">
                        <span className={`inline-grid h-6 w-6 place-items-center rounded-lg font-display text-[12px] font-extrabold ${r.level <= level ? "bg-gold/25 text-gold" : "bg-cream/10 text-cream/60"}`}>{r.level}</span>
                      </td>
                      <td className="px-2 py-2">{r.exp ? k(r.exp) : "-"}</td>
                      <td className="px-2 py-2">{k(r.members)}</td>
                      <td className="px-2 py-2">{r.admins}</td>
                      <td className="px-2 py-2">{r.coOwners || "-"}</td>
                      <td className="px-2 py-2">{r.cards}</td>
                      <td className="px-2 py-2 text-left">{r.background || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Your room can have up to {cur.admins} admins now{cur.members ? ` and ${n(cur.members)} members` : ""}. More level privileges are on the way.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function Task({ title, rule, done, cap }: { title: string; rule: string; done: number; cap: number }) {
  const p = cap > 0 ? Math.min(1, done / cap) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[14px] font-bold text-cream">{title}</p>
        <p className="text-[11.5px] text-muted">Today {n(done)}</p>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream/10">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-coral to-gold" initial={false} animate={{ width: `${p * 100}%` }} transition={{ duration: 0.6 }} />
      </div>
      <div className="mt-1 flex items-baseline justify-between text-[11px] text-muted">
        <span className="min-w-0 flex-1 pr-2">{rule}</span>
        <span>
          {n(done)}/{n(cap)}
        </span>
      </div>
    </div>
  );
}
