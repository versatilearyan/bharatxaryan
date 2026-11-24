"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Armchair, BadgeCheck, Gift, Sparkles, Users } from "lucide-react";
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

/** The host's photo inside a ring that fills up as the room fills (gold, or coral when full). */
function FillRing({ r, fill, full, size }: { r: NewbieRoom; fill: number; full: boolean; size: number }) {
  const stroke = 3.5;
  const rad = size / 2 - stroke / 2;
  const len = 2 * Math.PI * rad;
  const inner = size - stroke * 2 - 6;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <span aria-hidden className="absolute inset-1 rounded-full bg-gold/25 blur-md" />
      <svg aria-hidden className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke="rgba(231,188,114,0.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke={full ? "#ff8a7a" : "url(#nb-ring)"} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - Math.max(fill, 4) / 100)} />
        <defs>
          <linearGradient id="nb-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff1c9" />
            <stop offset="100%" stopColor="#f5b347" />
          </linearGradient>
        </defs>
      </svg>
      {r.host.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.host.avatarUrl} alt="" className="relative rounded-full bg-[#2a1520] object-cover" style={{ width: inner, height: inner }} />
      ) : (
        <span className="relative grid place-items-center rounded-full bg-[#2a1520] font-bold text-gold" style={{ width: inner, height: inner, fontSize: inner * 0.4 }}>
          {(r.host.name ?? "H").slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className={`absolute right-1 bottom-1 h-3.5 w-3.5 rounded-full ring-[2.5px] ring-[#2a0d16] ${r.host.online ? "bg-[#3ddc84]" : "bg-[#8a8290]"}`} title={r.host.online ? "Host is online" : "Host is away"} />
    </span>
  );
}

/**
 * A warm "sunrise" welcome card: the host's photo in a ring that fills as the room fills, a NEW ribbon,
 * the host's name and a big friendly button. Tall when several rooms sit side by side, wide when there's one.
 */
function RoomCard({ r, mine, wide }: { r: NewbieRoom; mine: boolean; wide: boolean }) {
  const { openRoom } = useApp();
  const full = r.seatsFree <= 0;
  const capacity = Math.max(r.capacity || 0, r.joined + Math.max(0, r.seatsFree), 1);
  const fill = Math.min(100, Math.round((r.joined / capacity) * 100));
  const cta = full ? "Room full" : mine ? "Wapas jao" : "Namaste 🙏 Join";
  const button = (
    <span className={`relative block rounded-full py-2 text-center text-[12.5px] font-extrabold ${full ? "bg-cream/10 text-cream/45" : "bg-gradient-to-b from-[#f6d899] to-[#c9954a] text-[#2a1a0c] shadow-[0_4px_0_#8a5a1f,0_10px_18px_-8px_rgba(231,188,114,0.6)]"}`}>{cta}</span>
  );
  const stats = (
    <span className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold text-cream/85">
      <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 ring-1 ring-gold/25">
        <Users className="h-3 w-3 text-gold" aria-hidden /> {r.joined}/{capacity}
      </span>
      {r.newbiesInside ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 ring-1 ring-gold/25">
          <Sparkles className="h-3 w-3 text-gold" aria-hidden /> {r.newbiesInside} new
        </span>
      ) : null}
    </span>
  );
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      onClick={() => openRoom(serverRoomAppId(String(r.roomId)))}
      aria-label={`${r.name}, hosted by ${r.host.name ?? "a host"}. ${r.joined} in room, ${full ? "full" : `${r.seatsFree} spots free`}`}
      className={`relative shrink-0 snap-start overflow-hidden rounded-[24px] bg-gradient-to-b from-[#6b1f30] via-[#3d1220] to-[#1a0b11] text-left ring-1 ring-gold/40 shadow-[0_16px_30px_-18px_rgba(231,188,114,0.6)] ${wide ? "w-full p-3.5" : "w-[158px] p-3"}`}
    >
      {/* sun glow, soft rays and dotted texture */}
      <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <span aria-hidden className="pointer-events-none absolute -top-14 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-gold/20 blur-2xl" />
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(246,216,153,0.9)_1px,transparent_1.2px)] [background-size:12px_12px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      {/* NEW ribbon */}
      <span className={`absolute top-2.5 ${wide ? "right-2.5" : "left-1/2 -translate-x-1/2"} inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-[#f6d899] to-[#c9954a] px-2 py-0.5 text-[9px] font-black tracking-[0.16em] text-[#2a1a0c] uppercase`}>
        <Sparkles className="h-2.5 w-2.5" aria-hidden /> New
      </span>
      {wide ? (
        <span className="relative flex items-center gap-3">
          <FillRing r={r} fill={fill} full={full} size={72} />
          <span className="min-w-0 flex-1">
            <span className="text-[10px] font-black tracking-[0.16em] text-gold/80 uppercase">Welcome host</span>
            <span className="mt-0.5 flex items-center gap-1">
              <span className="truncate font-display text-[19px] leading-tight font-black text-foil">{r.host.name ?? "Host"}</span>
              <BadgeCheck className="h-4 w-4 shrink-0 text-gold" aria-label="Official Sarpanch host" />
            </span>
            <span className="mt-1.5 block">{stats}</span>
          </span>
        </span>
      ) : (
        <span className="relative flex flex-col items-center pt-6 text-center">
          <FillRing r={r} fill={fill} full={full} size={76} />
          <span className="mt-2 text-[9.5px] font-black tracking-[0.16em] text-gold/80 uppercase">Welcome host</span>
          <span className="mt-0.5 flex max-w-full items-center gap-1">
            <span className="truncate font-display text-[16px] leading-tight font-black text-foil">{r.host.name ?? "Host"}</span>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Official Sarpanch host" />
          </span>
          <span className="mt-2">{stats}</span>
        </span>
      )}
      <span className="relative mt-3 block">{button}</span>
    </motion.button>
  );
}

/** NEWBIE WELCOME ROOMS: the open welcome rooms, at the very top. Nothing shows while there are none. */
export function NewbieRooms({ className = "mt-3" }: { className?: string }) {
  const rooms = useNewbieRooms();
  const me = useNewbieMe();
  if (!rooms.length) return null;
  const wide = rooms.length === 1;
  return (
    <section className={className} aria-labelledby="newbie-h">
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <span className="min-w-0">
          <h2 id="newbie-h" className="flex items-center gap-2 font-display text-[21px] font-black tracking-tight text-cream">
            <span aria-hidden className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#f6d899] to-[#c9954a]" />
            Naye ho? Namaste! 🙏
          </h2>
          <span className="mt-0.5 block truncate pl-3.5 text-[12px] text-cream/60">Welcome rooms with friendly hosts</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-bold text-gold ring-1 ring-gold/30">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3ddc84]" aria-hidden /> {rooms.length} open
        </span>
      </div>
      <div className={`no-scrollbar flex gap-3 px-4 pb-1 ${wide ? "" : "snap-x snap-mandatory overflow-x-auto scroll-px-4"}`}>
        {rooms.map((r) => (
          <RoomCard key={r.roomId} r={r} mine={me?.roomId === String(r.roomId)} wide={wide} />
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
/** Each person can hide the seats (to enjoy the room picture and the chat) and show them again. Remembered on this device. */
function useSeatsOn() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      if (window.localStorage.getItem("pv-newbie-seats") === "off") setOn(false);
    } catch {
      /* no storage */
    }
  }, []);
  const set = (v: boolean) => {
    setOn(v);
    try {
      window.localStorage.setItem("pv-newbie-seats", v ? "on" : "off");
    } catch {
      /* no storage */
    }
  };
  return [on, set] as const;
}

export function NewbieSeatLayout({ s, scale = 1 }: { s: RoomSession; scale?: number }) {
  const [seatsOn, setSeatsOn] = useSeatsOn();
  const hostSize = Math.round(92 * scale);
  const size = Math.round(56 * scale);
  const regular = s.seats.map((_, i) => i).filter((i) => i >= 1 && i < 10);
  const extra = s.seats.map((_, i) => i).filter((i) => i >= 10);
  return (
    <div className="relative w-full px-2">
      <button
        type="button"
        onClick={() => setSeatsOn(!seatsOn)}
        aria-pressed={seatsOn}
        aria-label={seatsOn ? "Hide the seats" : "Show the seats"}
        className={`absolute top-1 right-2 z-20 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide ring-1 backdrop-blur ${seatsOn ? "bg-gold/25 text-gold ring-gold/50" : "bg-black/55 text-cream/70 ring-white/20"}`}
      >
        <Armchair className="h-3.5 w-3.5" aria-hidden /> Seats {seatsOn ? "ON" : "OFF"}
      </button>
      <div className="relative mx-auto flex w-fit flex-col items-center pt-3">
        <motion.span aria-hidden className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(246,216,153,0.6),transparent_68%)] blur-md" style={{ width: hostSize + 46, height: hostSize + 46 }} animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />
        <span className="relative rounded-full bg-gradient-to-br from-[#f6d899] via-[#e7bc72] to-[#b8862f] p-[3px] shadow-[0_0_30px_rgba(231,188,114,0.7)]">
          <span className="block rounded-full bg-[#1a0f08] p-[3px]">
            <Seat s={s} index={0} size={hostSize} gold />
          </span>
        </span>
        <span className="absolute top-0 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#f6d899] to-[#d9a84f] px-3 py-0.5 text-[10px] font-extrabold tracking-[0.2em] text-[#2a1a0c] shadow-md">HOST</span>
      </div>

      {seatsOn ? <div className="mt-3 flex flex-wrap justify-center gap-x-2 gap-y-2.5">
        {regular.map((i) => (
          <div key={i} className="flex justify-center" style={{ width: size + 18 }}>
            <Seat s={s} index={i} size={size} gold />
          </div>
        ))}
      </div> : null}

      <AnimatePresence initial={false}>
        {seatsOn && extra.length ? (
          // Opacity only, no height animation: animating height here fights the room's own seat-area
          // resize observer (it fires on every intermediate frame), which was flickering the whole layout.
          <motion.div key="extra" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
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
