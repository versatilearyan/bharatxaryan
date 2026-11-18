"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock3, Gem } from "lucide-react";
import { useBackClose } from "@/lib/app/back";
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

/** Room tier names, two levels each (shown in the title: "Levels of Advanced Voice Room"). */
export const ROOM_TIERS = ["Basic", "Basic", "Advanced", "Advanced", "Elite", "Elite", "Royal", "Royal", "Legend", "Legend"];

/**
 * The room level badge for each of the 10 levels, like the reference: a grey diamond, a green one, blue gems, purple
 * shields, orange winged shields and gold crowned shields, with the number on top.
 */
export function RoomLevelBadge({ level, size = 40 }: { level: number; size?: number }) {
  const L = Math.max(1, Math.min(10, level));
  const c: Record<number, [string, string, string]> = {
    1: ["#9aa0a8", "#5b616a", "#d6dade"],
    2: ["#4fe08f", "#14a35a", "#b6f5d2"],
    3: ["#5fd2ff", "#1c8fd8", "#c4efff"],
    4: ["#58b9ff", "#1f6fe0", "#c2e3ff"],
    5: ["#c27bff", "#7b2fd8", "#ead2ff"],
    6: ["#b06bff", "#6a22c9", "#e4ccff"],
    7: ["#ff8a5c", "#e0402a", "#ffd2bf"],
    8: ["#ff7a4a", "#d23320", "#ffc9b3"],
    9: ["#ffd45c", "#c278ff", "#fff1c2"],
    10: ["#ffd04a", "#9b4dff", "#ffeeb0"],
  };
  const [top, bot, hi] = c[L];
  const gid = `rlb-${L}`;
  const shape =
    L <= 2
      ? "M32 4 L58 32 L32 60 L6 32 Z" // diamond
      : L === 3
        ? "M32 5 L56 22 L48 54 L16 54 L8 22 Z" // cut gem
        : L === 4
          ? "M32 4 L56 14 L54 38 Q50 52 32 60 Q14 52 10 38 L8 14 Z" // shield
          : L <= 6
            ? "M32 4 L54 16 L54 44 L32 58 L10 44 L10 16 Z" // hexagon
            : "M32 6 L52 14 L52 38 Q48 52 32 60 Q16 52 12 38 L12 14 Z"; // crest shield
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label={`Level ${L}`} role="img">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bot} />
        </linearGradient>
      </defs>
      {/* wings for 7 and 8 */}
      {L === 7 || L === 8 ? (
        <>
          <path d="M12 24 C2 22 0 34 6 40 C8 34 10 32 14 32 Z" fill={top} stroke={bot} strokeWidth="1.5" />
          <path d="M52 24 C62 22 64 34 58 40 C56 34 54 32 50 32 Z" fill={top} stroke={bot} strokeWidth="1.5" />
        </>
      ) : null}
      {/* crown for 9 and 10 */}
      {L >= 9 ? <path d="M18 10 L22 2 L28 8 L32 0 L36 8 L42 2 L46 10 Z" fill="#ffd04a" stroke="#c48a10" strokeWidth="1.5" strokeLinejoin="round" /> : null}
      {L >= 9 ? <path d="M10 22 C2 24 2 36 8 42 L12 38 Z M54 22 C62 24 62 36 56 42 L52 38 Z" fill="#ffd04a" stroke="#c48a10" strokeWidth="1.2" /> : null}
      <path d={shape} fill={`url(#${gid})`} stroke={L >= 9 ? "#ffd04a" : "#ffffff"} strokeWidth={L >= 9 ? 3 : 2.5} strokeLinejoin="round" />
      <path d={shape} fill="none" stroke={hi} strokeOpacity="0.6" strokeWidth="1" transform="translate(32 32) scale(0.82) translate(-32 -32)" />
      <ellipse cx="26" cy="20" rx="8" ry="4" fill="#ffffff" opacity="0.35" />
      <text x="32" y={L <= 2 ? 40 : 41} textAnchor="middle" fontSize={L >= 10 ? 19 : 22} fontWeight="900" fill="#ffffff" stroke={bot} strokeWidth="2.5" paintOrder="stroke" fontFamily="system-ui, sans-serif">
        {L}
      </text>
    </svg>
  );
}

/**
 * The room level screen, like the reference: a full white page "Levels of <tier> Voice Room" with the progress to the next
 * level, then Tasks Today (today's EXP) and Level Explanation (what every level gives) as two tabs.
 */
export function RoomLevelSheet({ open, onClose, room }: { open: boolean; onClose: () => void; room: Room }) {
  const [tab, setTab] = useState<"tasks" | "levels">("levels");
  const [info, setInfo] = useState<RoomLevelInfo | null>(null);
  const id = room.server?.id;
  useBackClose(open, onClose);

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
  // Until the server answers, the level comes from the room's EXP
  const level = info?.level ?? Math.max(1, ROOM_LEVEL_TABLE.filter((r) => exp >= r.exp).length);
  const cur = ROOM_LEVEL_TABLE[level - 1];
  const next = ROOM_LEVEL_TABLE[level] ?? null;
  const progress = next ? Math.max(0, Math.min(1, (exp - cur.exp) / (next.exp - cur.exp))) : 1;
  const t = info?.today;
  const tier = ROOM_TIERS[level - 1] ?? "Basic";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-[70] flex w-full flex-col overflow-hidden bg-white text-[#1f1d3a]"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 40 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Levels of ${tier} Voice Room`}
        >
          <header className="pt-safe shrink-0 bg-white">
            <div className="relative flex h-14 items-center justify-center px-12">
              <button type="button" onClick={onClose} aria-label="Back" className="absolute left-2 grid h-10 w-10 place-items-center text-[#1f1d3a]">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h2 className="truncate text-[18px] font-bold">Levels of {tier} Voice Room</h2>
            </div>
          </header>

          <div className="app-scroll min-h-0 w-full min-w-0 flex-1 overflow-x-hidden px-4 pb-8">
            {/* progress to the next level */}
            <div className="rounded-2xl bg-[#e9fbfd] px-4 pb-4 pt-3 ring-1 ring-[#cdf1f6]">
              <div className="flex items-center gap-3">
                <RoomLevelBadge level={level} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#cfeef3]" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-[#36c8e8] to-[#2f8cf0]" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.7 }} />
                  </div>
                </div>
                {next ? <RoomLevelBadge level={next.level} size={46} /> : null}
              </div>
              <div className="mt-2 flex items-center justify-between text-[15px] font-extrabold">
                <span>Lv{level}</span>
                <span className="text-[14px] font-bold text-[#2f9fd8]">
                  {exp}
                  {next ? `/${next.exp}` : ""}
                </span>
                <span>{next ? `Lv${next.level}` : "Max"}</span>
              </div>
            </div>

            {/* tabs */}
            <div className="mx-auto mt-6 flex w-fit rounded-full bg-[#f4f4f7] p-1" role="tablist">
              {(
                [
                  ["tasks", "Tasks Today"],
                  ["levels", "Level Explanation"],
                ] as const
              ).map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-full px-6 py-2 text-[16px] transition ${tab === key ? "bg-white font-extrabold text-[#1f1d3a] shadow-[0_2px_8px_rgba(0,0,0,0.08)]" : "font-semibold text-[#8d8a9c]"}`}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "tasks" ? (
              <div className="mt-6 space-y-3">
                <LightTask title="Spend time in the room" rule="Every person in the room: 5 minutes = 5 EXP (double for VIP)" done={t?.voice ?? 0} cap={t?.voiceCap ?? 5000} />
                <LightTask title="Send gifts or red packets" rule="10 coins = 1 EXP. Red packets count for the 10,000 and 50,000 ones" done={t?.gift ?? 0} cap={t?.giftCap ?? 50000} />
                <div className="rounded-2xl bg-[#f7f7fa] p-4 ring-1 ring-[#ececf2]">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[15px] font-extrabold">EXP today</p>
                    <p className="text-[13px] font-bold text-[#2f9fd8]">
                      {n(t?.total ?? 0)}/{n(t?.totalCap ?? 55000)}
                    </p>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-[12.5px] leading-snug text-[#8d8a9c]">
                    <li>• A room can earn at most {n(t?.totalCap ?? 55000)} EXP a day.</li>
                    <li>• A locked room (private, or with a password) earns no EXP{info?.locked ? ": this room is locked now." : "."}</li>
                    <li>• Gifts from a Bag don&apos;t count. The day changes at midnight (India time).</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6 w-full max-w-full overflow-x-auto rounded-2xl border border-[#e6e6ee]">
                  <table className="w-full min-w-[620px] border-collapse text-center text-[16px]">
                    <thead>
                      <tr className="bg-[#f6f6f9] text-[14px] font-medium text-[#8d8a9c]">
                        <th className="w-[76px] border-b border-r border-dashed border-[#e3e3ea] px-2 py-3 font-medium">Levels</th>
                        <th className="border-b border-r border-dashed border-[#e3e3ea] px-2 py-3 font-medium">EXP</th>
                        <th className="border-b border-r border-dashed border-[#e3e3ea] px-2 py-3 font-medium">Members</th>
                        <th className="border-b border-r border-dashed border-[#e3e3ea] px-2 py-3 font-medium">Admins</th>
                        <th className="border-b border-r border-dashed border-[#e3e3ea] px-2 py-3 font-medium leading-tight">Number of<br />Co-owners</th>
                        <th className="border-b border-dashed border-[#e3e3ea] px-2 py-3 font-medium">Background</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ROOM_LEVEL_TABLE.map((r) => (
                        <tr key={r.level} className={r.level === level ? "bg-[#e9fbfd]" : ""}>
                          <td className="border-b border-r border-dashed border-[#e3e3ea] px-2 py-3">
                            <span className="inline-grid place-items-center">
                              <RoomLevelBadge level={r.level} size={r.level >= 7 ? 44 : 40} />
                            </span>
                          </td>
                          <td className="border-b border-r border-dashed border-[#e3e3ea] px-2 py-3 font-medium">{r.exp ? `${r.exp / 1000}k` : "-"}</td>
                          <td className="border-b border-r border-dashed border-[#e3e3ea] px-2 py-3 font-medium">{k(r.members)}</td>
                          <td className="border-b border-r border-dashed border-[#e3e3ea] px-2 py-3 font-medium">{r.admins}</td>
                          <td className="border-b border-r border-dashed border-[#e3e3ea] px-2 py-3 font-medium">{r.coOwners || "-"}</td>
                          <td className="border-b border-dashed border-[#e3e3ea] px-2 py-3 text-[13px] font-medium text-[#5b5868]">{r.background || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-[15px] leading-snug text-[#a5a3bd]">Co-owner is not available in family rooms (More Level Privileges to Come)</p>
              </>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LightTask({ title, rule, done, cap }: { title: string; rule: string; done: number; cap: number }) {
  const p = cap > 0 ? Math.min(1, done / cap) : 0;
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-[#ececf2] shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[15px] font-extrabold">{title}</p>
        <p className="shrink-0 text-[13px] font-bold text-[#2f9fd8]">
          {n(done)}/{n(cap)}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8eef5]">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-[#36c8e8] to-[#2f8cf0]" initial={false} animate={{ width: `${p * 100}%` }} transition={{ duration: 0.6 }} />
      </div>
      <p className="mt-1.5 text-[12px] text-[#8d8a9c]">{rule}</p>
    </div>
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
