"use client";

/**
 * Home: a big "new game" card for Duo Dash right under the greeting, so people find it quickly.
 * It can be hidden for a day with the ×; it stops showing for good once this phone has opened Duo Dash 3 times.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Play, X } from "lucide-react";
import { DuoHeroArt } from "@/components/art/DuoDashArt";
import { rememberPlayed } from "@/lib/games/live";
import { useApp } from "@/lib/app/store";

const HIDE_KEY = "panchayat.duo.promo.hidden";
const OPENS_KEY = "panchayat.duo.promo.opens";

export function DuoPromo() {
  const { push } = useApp();
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const hidden = Number(localStorage.getItem(HIDE_KEY) ?? 0);
      const opens = Number(localStorage.getItem(OPENS_KEY) ?? 0);
      setShow(Date.now() > hidden && opens < 3);
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  const open = () => {
    try {
      localStorage.setItem(OPENS_KEY, String(Number(localStorage.getItem(OPENS_KEY) ?? 0) + 1));
    } catch {
      /* private mode */
    }
    rememberPlayed("coop");
    push({ kind: "coop" });
  };
  const hide = () => {
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now() + 24 * 3600 * 1000));
    } catch {
      /* private mode */
    }
    setShow(false);
  };
  return (
    <motion.section initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className="relative mx-4 mt-4" aria-label="New game: Duo Dash">
      {/* breathing glow */}
      <motion.span className="pointer-events-none absolute -inset-1 rounded-[30px] bg-gradient-to-r from-[#ff3d8b] via-[#ffd84d] to-[#8b5cf6] opacity-60 blur-lg" animate={{ opacity: [0.35, 0.8, 0.35] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} aria-hidden />
      <div role="button" tabIndex={0} onClick={open} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open()} className="relative block h-[168px] w-full cursor-pointer overflow-hidden rounded-[28px] text-left ring-2 ring-[#ffd84d]/80">
        <span className="absolute inset-0">
          <DuoHeroArt />
        </span>
        <span className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
        <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <span className="absolute inset-y-0 left-0 flex w-[62%] flex-col justify-center p-4">
          <span className="flex items-center gap-1.5">
            <motion.span className="rounded-full bg-[#c6ff3d] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#14210a]" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.1, repeat: Infinity }}>
              New game
            </motion.span>
            <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white">2 players</span>
          </span>
          <span className="mt-1.5 font-display text-[28px] font-black uppercase italic leading-none text-white drop-shadow-[0_3px_0_#ff3d8b]">Duo Dash</span>
          <span className="mt-1 flex items-center gap-1 text-[12px] font-bold text-white/85">
            <Heart className="h-3.5 w-3.5 fill-[#ff3d8b] text-[#ff3d8b]" aria-hidden /> Do dil, ek mission · 150 levels
          </span>
          <span className="mt-2.5 inline-flex w-max items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff3d8b] to-[#ff7a2f] px-4 py-2 text-[13px] font-black uppercase text-white shadow-[0_8px_20px_-8px_rgba(255,61,139,0.9)]">
            <Play className="h-4 w-4 fill-white" aria-hidden /> Abhi khelo
          </span>
        </span>
      </div>
      <button type="button" onClick={hide} aria-label="Hide for today" className="absolute right-2.5 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white/85 backdrop-blur">
        <X className="h-4 w-4" />
      </button>
    </motion.section>
  );
}
