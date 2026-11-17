"use client";

/**
 * "Play together": the games hub, like a game centre with three tabs (Games, Shop, How to play), in the Panchayat style.
 * The big banner is Gaon ka Gaddaar, which needs no voice room: it has its own lobby with a code.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { GaddarGuide } from "@/components/games/gaddar/GaddarGuide";
import { PLAYABLE } from "@/lib/app/data";
import { GameHeroCard, GameTile } from "@/components/games/GameCards";
import { PremiumIconButton, SectionHeader, Skeleton } from "@/components/ui/premium";
import { ScreenBackdrop } from "@/components/ui/PanchayatBackground";
import { readRecent, rememberPlayed, useGameLive } from "@/lib/games/live";
import type { Game, GameId } from "@/lib/app/types";
import { useApp } from "@/lib/app/store";

const TABS = ["Games", "Shop", "How to play"] as const;
type Tab = (typeof TABS)[number];

export function GamesHub() {
  const { pop, push, setSheet } = useApp();
  const [tab, setTab] = useState<Tab>("Games");
  const [guide, setGuide] = useState(false);
  const live = useGameLive();
  const [recent, setRecent] = useState<GameId[]>([]);
  useEffect(() => setRecent(readRecent()), []);
  const open = (g: Game) => {
    rememberPlayed(g.id);
    setSheet({ kind: "game", gameId: g.id });
  };
  const byId = (id: GameId) => PLAYABLE.find((g) => g.id === id);
  // The groups. "Trending now" is only what people are really playing this minute.
  const trending = useMemo(() => PLAYABLE.filter((g) => (live?.[g.id] ?? 0) > 0).sort((a, b) => (live?.[b.id] ?? 0) - (live?.[a.id] ?? 0)), [live]);
  const fresh = PLAYABLE.filter((g) => g.tag === "NEW");
  const multi = PLAYABLE.filter((g) => ["gaddar", "rmcs", "ludo", "jackaroo"].includes(g.id));
  const quick = PLAYABLE.filter((g) => ["chess", "ludo", "hill"].includes(g.id));
  const played = recent.map(byId).filter((g): g is Game => !!g);
  const rows: { key: string; title: string; sub: string; list: Game[] }[] = [
    { key: "trending", title: "Trending now", sub: "Abhi sabse zyada khele ja rahe", list: trending },
    { key: "recent", title: "Recently played", sub: "Jo aapne pichli baar khele", list: played },
    { key: "new", title: "New games", sub: "Naye aaye hain", list: fresh },
    { key: "multi", title: "Multiplayer", sub: "Dosto ke saath khelo", list: multi },
    { key: "quick", title: "Quick games", sub: "Jaldi shuru, jaldi khatam", list: quick },
  ].filter((r) => r.list.length > 0);

  return (
    <ScreenBackdrop variant="games">
    <div className="app-scroll relative h-full pb-10">
      <header className="pt-safe flex items-center gap-2 px-3 pt-2">
        <PremiumIconButton label="Back" onClick={pop}>
          <ChevronLeft className="h-6 w-6" />
        </PremiumIconButton>
        <div className="min-w-0">
          <h1 className="font-display text-[22px] font-black leading-tight tracking-tight text-cream">Play together</h1>
          <p className="text-[11.5px] text-cream/60">Games jo Panchayat ko zinda rakhte hain</p>
        </div>
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
          <div className="mt-4 space-y-3">
            {byId("gaddar") ? <GameHeroCard g={byId("gaddar")!} live={live?.gaddar} onOpen={() => open(byId("gaddar")!)} /> : null}
            {byId("rmcs") ? <GameHeroCard g={byId("rmcs")!} live={live?.rmcs} hero="rmcs" onOpen={() => open(byId("rmcs")!)} /> : null}
          </div>
          {live === null && rows.length === 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 px-4">
              <Skeleton className="h-[180px]" />
              <Skeleton className="h-[180px]" />
            </div>
          ) : null}
          {rows.map((r) => (
            <section key={r.key} className="mt-6" aria-label={r.title}>
              <SectionHeader title={r.title} sub={r.sub} />
              <ul className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 pb-1">
                {r.list.map((g, i) => (
                  <li key={g.id} className="w-[168px] shrink-0 snap-start">
                    <GameTile g={g} live={live?.[g.id]} index={i} onOpen={() => open(g)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
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
    </ScreenBackdrop>
  );
}
