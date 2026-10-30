"use client";

import { RoomCover } from "@/components/rooms/RoomCover";
import { motion } from "framer-motion";
import { ChevronLeft, Crown, Sparkles, UsersRound } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { IconButton, formatCount } from "@/components/ui/kit";
import { usePeople } from "@/lib/app/people";
import { useApp } from "@/lib/app/store";
import { nameFace } from "@/lib/app/fonts";

/** Entry screen shown before joining a VIP room. */
export function VipEntry({ roomId }: { roomId: string }) {
  const { roomById, pop, enterRoom, push } = useApp();
  const person = usePeople();
  const room = roomById(roomId);
  if (!room) return null;
  const host = person(room.hostId);
  const guests = room.seated.slice(1).map(person);

  return (
    <div className="app-scroll relative h-full bg-gradient-to-b from-[#2a0f18] via-wine-2 to-[#0f080b]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[52%]" aria-hidden>
        <RoomCover room={room} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#2a0f18]/20 via-[#241018]/70 to-[#241018]" />
      </div>
      <div className="pointer-events-none absolute inset-3 rounded-[30px] border border-gold/25" aria-hidden />

      <header className="pt-safe relative z-10 flex h-14 items-center px-3">
        <IconButton label="Back" onClick={pop} className="!bg-black/30">
          <ChevronLeft className="h-6 w-6" />
        </IconButton>
      </header>

      <div className="relative z-10 flex flex-col items-center px-6 pb-10 pt-6 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="relative">
          <motion.span
            className="absolute -inset-5 rounded-full"
            style={{ background: "conic-gradient(from 0deg, transparent, rgb(231 188 114 / 0.55), transparent 40%)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            aria-hidden
          />
          <PersonAvatar person={{ ...host, frame: "none" }} size={104} />
          <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-[#f6d899] to-[#c9954a] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#2a1a0c]">
            <Crown className="h-3 w-3" /> VIP{host.vip ?? ""} Host
          </span>
        </motion.div>

        <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.24em] text-gold/80">VIP Room</p>
        <h1 className="mt-1 font-display text-[30px] font-extrabold leading-tight gold-shine pr-1" style={nameFace(room.settings?.nameFont)}>{room.name}</h1>
        <p className="mt-2 text-sm text-cream/75">{room.topic}</p>

        <div className="mt-4 flex items-center gap-3 text-[12px] text-cream/70">
          <span className="flex -space-x-2">
            {guests.slice(0, 4).map((g) => (
              <PersonAvatar key={g.id} person={{ ...g, frame: "none" }} size={26} className="rounded-full ring-2 ring-[#241018]" />
            ))}
          </span>
          <span className="flex items-center gap-1">
            <UsersRound className="h-3.5 w-3.5" /> {formatCount(room.members)} inside
          </span>
        </div>

        <div className="mt-7 w-full rounded-3xl border border-gold/25 bg-black/25 p-4 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Room theme</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["Velvet seats", "Gold mic ring", "Royal banner"].map((t, i) => (
              <div key={t} className="flex flex-col items-center gap-2 rounded-2xl bg-wine/70 p-3 ring-1 ring-gold/20">
                <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: i === 1 ? "conic-gradient(#fff1c9,#e7bc72,#a8742f,#e7bc72,#fff1c9)" : "radial-gradient(circle,#5a1a28,#241018)" }}>
                  {i === 0 ? <span className="h-5 w-5 rounded-md bg-[#7a1f35]" /> : i === 1 ? <span className="h-7 w-7 rounded-full bg-[#241018]" /> : <Sparkles className="h-5 w-5 text-gold" />}
                </span>
                <span className="text-[10.5px] text-cream/80">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => enterRoom(roomId)}
          className="relative mt-7 h-13 w-full overflow-hidden rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] py-3.5 font-display text-[16px] font-extrabold text-[#2a1a0c] shadow-[0_14px_40px_-12px_rgb(231_188_114/0.8)]"
        >
          <span className="foil-shimmer animate-shimmer absolute inset-0" aria-hidden />
          <span className="relative">Enter as guest</span>
        </motion.button>
        <button type="button" onClick={() => push({ kind: "vip-benefits" })} className="mt-3 text-[13px] font-semibold text-gold underline-offset-4 hover:underline">
          See VIP benefits
        </button>
        <p className="mt-5 text-[11px] text-cream/45">Guest preview. You aren&apos;t a VIP member, and nothing is charged.</p>
      </div>
    </div>
  );
}
