"use client";

/** The game cards for Game Modes: a big hero card and compact cards with art, a short line, status and Play now. */
import { motion } from "framer-motion";
import { Play, Users } from "lucide-react";
import { GameArt } from "@/components/art/GameArt";
import { GaddarHeroArt } from "@/components/art/GaddarHero";
import { RmcsHeroArt } from "@/components/art/GameCovers";
import type { Game } from "@/lib/app/types";

/** One short line for each game (the long text stays in the game's own sheet). */
export const TAGLINE: Record<string, string> = {
  gaddar: "Gaddaar ko pehchano · 4 se 10",
  rmcs: "Chor ko pakdo · 4 ya 5",
  hill: "Akele · coins wallet me",
  jackaroo: "Patte aur goti · teams",
  ludo: "Paansa phenko, ghar pahucho",
  chess: "Shatranj · 2 players",
};

function Status({ g, live }: { g: Game; live?: number }) {
  return (
    <span className="absolute left-2 top-2 flex flex-wrap gap-1">
      {g.tag === "NEW" ? <span className="rounded-full bg-[#3fbf7f] px-2 py-0.5 text-[9px] font-black uppercase text-white">New</span> : null}
      {g.tag === "HOT" ? <span className="rounded-full bg-coral px-2 py-0.5 text-[9px] font-black uppercase text-white">🔥 Hot</span> : null}
      {live ? (
        <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black text-white">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7dff9a]/70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7dff9a]" />
          </span>
          {live} khel rahe
        </span>
      ) : null}
    </span>
  );
}

/** The wide card with a big Play Now. */
export function GameHeroCard({ g, live, onOpen, hero = "gaddar" }: { g: Game; live?: number; onOpen: () => void; hero?: "gaddar" | "rmcs" }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.985 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={onOpen} aria-label={`${g.name}, ${g.players}`} className="relative mx-4 block w-[calc(100%-2rem)] overflow-hidden rounded-[26px] text-left shadow-[0_18px_40px_-18px_rgba(255,61,139,0.7)] ring-1 ring-white/25">
      <span className="relative block aspect-[16/8.2]">
        {hero === "rmcs" ? <RmcsHeroArt /> : <GaddarHeroArt />}
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        <Status g={g} live={live} />
        <span className="absolute bottom-3 left-4 right-3 flex items-end gap-3">
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[22px] font-black leading-tight text-white drop-shadow">{g.id === "gaddar" ? "Gaon ka Gaddaar" : g.name}</span>
            <span className="block text-[12px] text-white/85">{TAGLINE[g.id] ?? g.players}</span>
          </span>
          <span className="pn-btn-gold flex h-11 shrink-0 items-center gap-1.5 rounded-full px-5 font-display text-[14px] font-black text-[#2a1a0c]">
            <Play className="h-4 w-4 fill-current" aria-hidden /> Play now
          </span>
        </span>
      </span>
    </motion.button>
  );
}

/** A compact card: picture, name, one line, Play now. */
export function GameTile({ g, live, onOpen, index = 0 }: { g: Game; live?: number; onOpen: () => void; index?: number }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 6) * 0.04 }} onClick={onOpen} aria-label={`${g.name}, ${g.players}`} className="pn-card relative block w-full overflow-hidden rounded-[22px] text-left">
      <span className="relative block aspect-[1.25] overflow-hidden">
        <GameArt id={g.id} />
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <Status g={g} live={live} />
      </span>
      <span className="block px-3 pb-3 pt-2">
        <span className="block truncate font-display text-[15px] font-black text-cream">{g.name}</span>
        <span className="block truncate text-[11.5px] text-cream/55">{TAGLINE[g.id] ?? g.players}</span>
        <span className="pn-btn-primary mt-2 flex h-8 items-center justify-center gap-1 rounded-full font-display text-[12px] font-black text-white">
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden /> Play now
        </span>
      </span>
    </motion.button>
  );
}

export function PlayersHint({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cream/60">
      <Users className="h-3 w-3" aria-hidden /> {n}
    </span>
  );
}

/** The small card for the Home screen: just the picture, the name and a status, one tap to open. */
export function GameMini({ g, live, onOpen, index = 0, highlight = false }: { g: Game; live?: number; onOpen: () => void; index?: number; highlight?: boolean }) {
  const card = (
    <motion.button type="button" whileTap={{ scale: 0.95 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 6) * 0.04 }} onClick={onOpen} aria-label={highlight ? `${g.name}, ${g.players}, new for you` : `${g.name}, ${g.players}`} className={`relative block h-[132px] w-[116px] shrink-0 snap-start overflow-hidden rounded-[20px] text-left shadow-[0_10px_22px_-12px_rgba(0,0,0,0.9)] ${highlight ? "ring-2 ring-[#ffd84d]" : "ring-1 ring-white/20"}`}>
      <GameArt id={g.id} />
      {highlight ? <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 z-[1] opacity-40" aria-hidden /> : null}
      <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <span className="absolute left-1.5 top-1.5 flex gap-1">
        {g.tag === "NEW" ? <span className="rounded-full bg-[#3fbf7f] px-1.5 py-0.5 text-[8.5px] font-black uppercase text-white">New</span> : null}
        {g.tag === "HOT" ? <span className="rounded-full bg-coral px-1.5 py-0.5 text-[8.5px] font-black uppercase text-white">🔥</span> : null}
        {live ? <span className="rounded-full bg-black/65 px-1.5 py-0.5 text-[8.5px] font-black text-[#7dff9a]">● {live}</span> : null}
      </span>
      <span className="absolute inset-x-2 bottom-1.5 block truncate font-display text-[13px] font-black leading-tight text-white drop-shadow">{g.name}</span>
      {highlight ? (
        <motion.span
          className="absolute right-1.5 top-1.5 z-[2] rounded-full bg-[#ffd84d] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#2a1200] shadow"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          Khelo!
        </motion.span>
      ) : null}
    </motion.button>
  );
  if (!highlight) return card;
  // a soft golden glow that breathes around the card until it is opened once
  return (
    <span className="relative block shrink-0 snap-start rounded-[22px]">
      <motion.span
        className="pointer-events-none absolute -inset-1 rounded-[24px] bg-[#ffd84d]/45 blur-md"
        animate={{ opacity: [0.35, 0.95, 0.35] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      {card}
    </span>
  );
}
