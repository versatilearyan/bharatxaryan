"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Coffee, Film, Flame, Gamepad2, Laugh, Music2, BookOpen, Feather, Trophy, Sparkles, SearchX, type LucideIcon } from "lucide-react";
import { GameArt } from "@/components/art/GameArt";
import { SunsetScene } from "@/components/art/SunsetScene";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { SearchField, SectionTitle, formatCount } from "@/components/ui/kit";
import { RoomCard, RoomRow } from "@/components/rooms/RoomCards";
import { CATEGORIES, EVENTS, GAMES, PEOPLE } from "@/lib/app/data";
import { useApp } from "@/lib/app/store";
import { useParivar } from "@/lib/app/parivar-store";
import { PARIVAR_ENABLED } from "@/lib/app/parivar";
import { ParivarArt } from "@/components/art/ParivarArt";
import { LevelPill, VipBadgeFor } from "@/components/profile/IdTags";
import { nameTone } from "@/lib/app/fonts";

const CAT_ICON: Record<string, LucideIcon> = {
  "Chai Adda": Coffee,
  Music: Music2,
  Gaming: Gamepad2,
  Bollywood: Film,
  Cricket: Trophy,
  Poetry: Feather,
  Study: BookOpen,
  Devotional: Sparkles,
  Movies: Film,
  Comedy: Laugh,
};

export function DiscoverScreen() {
  const { rooms, profile, toggleFollow, setSheet, toast, push } = useApp();
  const { parivars, mine: mineParivar } = useParivar();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [reminders, setReminders] = useState<string[]>([]);

  const needle = q.trim().toLowerCase();
  const filtering = Boolean(needle || cat);

  const people = useMemo(
    () =>
      PEOPLE.filter(
        (p) =>
          (!cat || p.tags.includes(cat)) &&
          (!needle || [p.name, p.handle, p.city, p.bio, p.uid, ...p.tags].some((s) => s.toLowerCase().includes(needle))),
      ),
    [cat, needle],
  );
  const roomResults = useMemo(
    () => rooms.filter((r) => (!cat || r.category === cat) && (!needle || [r.name, r.topic, r.category, r.code].some((s) => s.toLowerCase().includes(needle)))),
    [rooms, cat, needle],
  );

  const hosts = [...PEOPLE].sort((a, b) => b.followers - a.followers).slice(0, 6);

  return (
    <div className="app-scroll h-full pb-[calc(84px+var(--mini,0px)+env(safe-area-inset-bottom))]">
      <header className="pt-safe sticky top-0 z-20 bg-ink/90 backdrop-blur-xl">
        <div className="flex h-14 items-center px-4">
          <h1 className="font-display text-[24px] font-extrabold text-cream">Discover</h1>
        </div>
        <div className="px-4 pb-3">
          <SearchField value={q} onChange={setQ} placeholder="Search people, rooms or IDs" />
        </div>
      </header>

      {/* Community categories */}
      <section aria-label="Community categories" className="pt-1">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          {CATEGORIES.map((c) => {
            const Icon = CAT_ICON[c] ?? Sparkles;
            const on = cat === c;
            return (
              <motion.button
                key={c}
                type="button"
                whileTap={{ scale: 0.94 }}
                aria-pressed={on}
                onClick={() => setCat(on ? null : c)}
                className={`flex h-10 shrink-0 items-center gap-1.5 rounded-2xl px-3.5 text-[13px] font-semibold ring-1 transition-colors ${on ? "bg-coral text-white ring-coral" : "bg-surface text-cream/85 ring-line"}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {c}
              </motion.button>
            );
          })}
        </div>
      </section>

      {filtering ? (
        <div aria-live="polite">
          <section className="mt-6">
            <SectionTitle>People · {people.length}</SectionTitle>
            <PeopleList ids={people.map((p) => p.id)} />
          </section>
          <section className="mt-6">
            <SectionTitle>Rooms · {roomResults.length}</SectionTitle>
            {roomResults.map((r) => (
              <RoomRow key={r.id} room={r} />
            ))}
          </section>
          {people.length + roomResults.length === 0 ? (
            <div className="flex flex-col items-center px-8 pt-10 text-center">
              <SearchX className="h-10 w-10 text-muted" aria-hidden />
              <p className="mt-3 font-display text-lg font-bold text-cream">Nothing found</p>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setCat(null);
                }}
                className="mt-4 rounded-full bg-cream/10 px-4 py-2 text-sm font-semibold text-cream"
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {/* Parivar */}
          <section className="mt-5 px-4">
            <button
              type="button"
              onClick={() => (PARIVAR_ENABLED ? push(mineParivar ? { kind: "parivar", id: mineParivar.id } : { kind: "parivar-list" }) : toast("Parivar is coming soon. Get your people ready! 🪔"))}
              className="relative flex w-full items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-r from-[#5a1a28] via-[#3a1420] to-[#1c1b22] p-3 pr-4 text-left ring-1 ring-gold/30"
            >
              <span className="block h-[68px] w-[68px] shrink-0 overflow-hidden rounded-2xl ring-1 ring-gold/30">
                <ParivarArt />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[19px] font-extrabold text-cream">Parivar</span>
                <span className="block text-[12.5px] leading-snug text-cream/70">
                  {!PARIVAR_ENABLED ? "Families with a Mukhiya, levels, a tag on your name and your own chat." : mineParivar ? `${mineParivar.name} · open your Parivar` : `${parivars.length} Parivars · join one or start your own`}
                </span>
              </span>
              {PARIVAR_ENABLED ? (
                <span className="rounded-full bg-gold px-3 py-1.5 text-[12px] font-bold text-ink">{mineParivar ? "Open" : "Explore"}</span>
              ) : (
                <span className="shrink-0 rounded-full bg-cream/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-gold ring-1 ring-gold/40">Coming soon</span>
              )}
            </button>
          </section>

          {/* Special events */}
          <section className="mt-6" aria-labelledby="events-h">
            <SectionTitle>
              <span id="events-h">Special events</span>
            </SectionTitle>
            <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4">
              {EVENTS.map((e) => {
                const on = reminders.includes(e.id);
                return (
                  <div key={e.id} className="relative w-[86%] shrink-0 snap-center overflow-hidden rounded-3xl ring-1 ring-line">
                    <div className="aspect-[16/8]">
                      <SunsetScene {...e.cover} shade />
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-gold">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {e.when}
                      </span>
                      <p className="mt-1 font-display text-[19px] font-extrabold leading-tight text-cream">{e.title}</p>
                      <p className="mt-0.5 text-[12px] text-cream/75">{e.body}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReminders((r) => (on ? r.filter((x) => x !== e.id) : [...r, e.id]));
                        toast(on ? "Reminder removed" : "Reminder set on this device");
                      }}
                      className={`absolute right-3 top-3 rounded-full px-3 py-1.5 text-[11.5px] font-bold backdrop-blur ${on ? "bg-gold text-ink" : "bg-black/45 text-cream"}`}
                    >
                      {on ? "Reminder on" : "Remind me"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trending rooms */}
          <section className="mt-8" aria-labelledby="trend-h">
            <SectionTitle>
              <span id="trend-h" className="flex items-center gap-1.5">
                Trending rooms <Flame className="h-4 w-4 text-coral" aria-hidden />
              </span>
            </SectionTitle>
            <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
              {[...rooms].sort((a, b) => b.members - a.members).slice(0, 6).map((r) => (
                <RoomCard key={r.id} room={r} />
              ))}
            </div>
          </section>

          {/* Popular hosts */}
          <section className="mt-8" aria-labelledby="hosts-h">
            <SectionTitle>
              <span id="hosts-h">Popular hosts</span>
            </SectionTitle>
            <div className="no-scrollbar flex gap-4 overflow-x-auto px-4">
              {hosts.map((h, i) => (
                <button key={h.id} type="button" onClick={() => setSheet({ kind: "person", personId: h.id })} className="flex w-[72px] shrink-0 flex-col items-center">
                  <span className="relative">
                    <PersonAvatar person={h} size={64} />
                    <span className={`absolute -left-1 -top-1 grid h-6 w-6 place-items-center rounded-full text-[11px] font-extrabold ring-2 ring-ink ${i === 0 ? "bg-gold text-ink" : i === 1 ? "bg-[#cfd3dc] text-ink" : i === 2 ? "bg-[#c98b5a] text-ink" : "bg-surface-2 text-cream"}`}>
                      {i + 1}
                    </span>
                  </span>
                  <span className="mt-1.5 max-w-full truncate text-[12.5px] font-semibold text-cream">{h.name}</span>
                  <span className="text-[10.5px] text-muted">{formatCount(h.followers)} fans</span>
                </button>
              ))}
            </div>
          </section>

          {/* Featured games */}
          <section className="mt-8" aria-labelledby="fgames-h">
            <SectionTitle>
              <span id="fgames-h">Featured games</span>
            </SectionTitle>
            <div className="grid grid-cols-2 gap-3 px-4">
              {GAMES.slice(0, 4).map((g) => (
                <motion.button
                  key={g.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSheet({ kind: "game", gameId: g.id })}
                  className="flex items-center gap-3 rounded-2xl bg-surface p-2.5 text-left ring-1 ring-line"
                >
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                    <GameArt id={g.id} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold text-cream">{g.name}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-speak" /> {formatCount(g.online)} playing
                    </span>
                  </span>
                </motion.button>
              ))}
            </div>
          </section>

          {/* Recommended people */}
          <section className="mt-8" aria-labelledby="rec-h">
            <SectionTitle>
              <span id="rec-h">Recommended people</span>
            </SectionTitle>
            <PeopleList ids={PEOPLE.filter((p) => !profile.following.includes(p.id)).slice(0, 6).map((p) => p.id)} />
          </section>
        </>
      )}
    </div>
  );

  function PeopleList({ ids }: { ids: string[] }) {
    return (
      <ul>
        {ids.map((id) => {
          const p = PEOPLE.find((x) => x.id === id)!;
          const following = profile.following.includes(id);
          return (
            <li key={id} className="flex items-center gap-3 px-4 py-2.5">
              <button type="button" onClick={() => setSheet({ kind: "person", personId: id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <PersonAvatar person={p} size={48} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className={`truncate text-[15px] font-semibold ${nameTone(p.vip)}`}>{p.name}</span>
                    <VipBadgeFor personId={p.id} vip={p.vip} size={16} />
                    <LevelPill level={p.level} gender={p.gender} size="sm" />
                  </span>
                  <span className="block truncate text-[12px] text-muted">{p.bio}</span>
                </span>
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                onClick={() => toggleFollow(id)}
                className={`h-8 shrink-0 rounded-full px-4 text-[12px] font-bold ${following ? "bg-cream/10 text-cream" : "bg-coral text-white"}`}
              >
                {following ? "Following" : "Follow"}
              </motion.button>
            </li>
          );
        })}
      </ul>
    );
  }
}
