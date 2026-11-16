"use client";

/**
 * "Play together": the games hub, like a game centre with three tabs (Games, Shop, How to play), in the Panchayat style.
 * The big banner is Gaon ka Gaddaar, which needs no voice room: it has its own lobby with a code.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play } from "lucide-react";
import { GameArt } from "@/components/art/GameArt";
import { GaddarGuide } from "@/components/games/gaddar/GaddarGuide";
import { GaddarHeroArt } from "@/components/art/GaddarHero";
import { PLAYABLE } from "@/lib/app/data";
import { useApp } from "@/lib/app/store";

const TABS = ["Games", "Shop", "How to play"] as const;
type Tab = (typeof TABS)[number];

export function GamesHub() {
  const { pop, push, setSheet } = useApp();
  const [tab, setTab] = useState<Tab>("Games");
  const [guide, setGuide] = useState(false);
  const others = PLAYABLE.filter((g) => g.id !== "gaddar");

  return (
    <div className="app-scroll relative h-full bg-[radial-gradient(130%_60%_at_50%_0%,#3a1d2c_0%,#1a1220_45%,#100d14_100%)] pb-10">
      <header className="pt-safe flex items-center gap-2 px-3 pt-2">
        <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="font-display text-[20px] font-extrabold text-cream">Play together</h1>
      </header>

      <nav className="mt-2 flex gap-5 border-b border-white/10 px-5" role="tablist" aria-label="Games">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`relative pb-2.5 pt-2 font-display text-[13px] font-extrabold uppercase tracking-wide ${tab === t ? "text-[#c9a7ff]" : "text-cream/55"}`}
          >
            {t}
            {tab === t ? <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-[#c9a7ff]" /> : null}
          </button>
        ))}
      </nav>

      {tab === "Games" ? (
        <>

          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mx-4 mt-4 overflow-hidden rounded-3xl ring-1 ring-gold/25">
            <div className="relative aspect-[16/8.2]">
              <GaddarHeroArt />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-4 right-3 flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-full bg-[#b45cff] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">New</span>
                  <h2 className="mt-1 font-display text-[22px] font-extrabold leading-tight text-white drop-shadow">Gaon ka Gaddaar</h2>
                  <p className="text-[12px] text-white/80">Gaddaar ko pehchano · 4 se 10</p>
                </div>
                <button type="button" onClick={() => push({ kind: "gaddar" })} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white px-5 font-display text-[15px] font-extrabold text-ink shadow-lg active:scale-95">
                  <Play className="h-4 w-4 fill-current" aria-hidden /> Play
                </button>
              </div>
            </div>
          </motion.section>

          <ul className="mt-3 grid grid-cols-2 gap-3 px-4">
            {others.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => setSheet({ kind: "game", gameId: g.id })} className="relative block aspect-[1.2] w-full overflow-hidden rounded-3xl text-left ring-1 ring-white/10" aria-label={`${g.name}, ${g.players}`}>
                  <span className={g.soon ? "block h-full w-full opacity-60 grayscale-[60%]" : "block h-full w-full"}>
                    <GameArt id={g.id} />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
                  {g.soon ? <span className="absolute right-2 top-2 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-gold ring-1 ring-gold/40">Soon</span> : null}
                  {g.tag && !g.soon ? (
                    <span className="absolute left-2 top-2 flex gap-1">
                      {g.tag === "NEW" ? <span className="rounded-full bg-[#3fbf7f] px-2 py-0.5 text-[9px] font-extrabold uppercase text-white">NEW</span> : null}
                      <span className="rounded-full bg-coral px-2 py-0.5 text-[9px] font-extrabold uppercase text-white">🔥 HOT</span>
                    </span>
                  ) : null}
                  <span className="absolute bottom-2 left-2.5 right-1 font-display text-[14px] font-extrabold leading-tight text-white drop-shadow">{g.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {tab === "Shop" ? (
        <div className="mx-4 mt-5 space-y-3">
          <section className="rounded-3xl bg-gradient-to-br from-[#4a2a14] to-[#241812] p-5 text-center ring-1 ring-gold/25">
            <p className="text-[40px] leading-none" aria-hidden>
              🛍️
            </p>
            <h2 className="mt-2 font-display text-[18px] font-extrabold text-gold">Gaon ki dukaan</h2>
            <p className="mt-1 text-[13px] text-cream/75">Gaddaar ke liye naye turban, kurte aur nishaan jald aa rahe hain. Tab tak app ki dukaan me frame, entry aur badge dekho.</p>
            <button type="button" onClick={() => push({ kind: "shop" })} className="mt-4 h-11 rounded-full bg-gradient-to-r from-[#f6d899] to-[#c9954a] px-6 font-display text-[14px] font-extrabold text-[#2a1a0c]">
              Dukaan kholo
            </button>
          </section>
        </div>
      ) : null}

      {tab === "How to play" ? (
        <div className="mx-4 mt-5 space-y-3">
          <section className="rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <h2 className="flex items-center gap-2 font-display text-[16px] font-extrabold text-gold">🛖 Gaon ka Gaddaar</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-cream/80">Kaam poore karo, gaddaar ko pehchano. Mic band, sirf text. Roles, sabotage, surang, maps aur tips ka poora guide:</p>
            <button type="button" onClick={() => setGuide(true)} className="mt-3 h-11 w-full rounded-full bg-gold font-display text-[14px] font-extrabold text-ink">
              📖 Poora guide kholo
            </button>
          </section>
          {[
            ["👑", "Raja Mantri Chor Sipahi", "Chhupe patte: Raja 1000, Mantri 800, Sipahi 500, Chor 0. Mantri ko Chor pehchanna hai, warna Chor uske 800 le jata hai. 4-5 chair ki 3D table, mic, chat aur emotes."],
            ["🎲", "Ludo", "Paansa phenko, 6 aaye to goti nikalo, doosre ki goti kaato aur sabse pehle ghar pahucho. 2 se 4 players."],
            ["🃏", "Jackaroo", "Ludo jaisa, par paanse ki jagah patte. Do-do ki team, Jack se goti badlo. 2 ya 4 players."],
            ["♟️", "Chess", "Dost ya room ke kisi aur se shatranj khelo, voice ke saath."],
          ].map(([icon, name, text]) => (
            <section key={name} className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/5">
              <h3 className="font-display text-[14px] font-bold text-cream">
                {icon} {name}
              </h3>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-cream/70">{text}</p>
            </section>
          ))}
        </div>
      ) : null}
      {guide ? <GaddarGuide onClose={() => setGuide(false)} /> : null}
    </div>
  );
}
