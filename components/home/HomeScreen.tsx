"use client";

import { RoomCover } from "@/components/rooms/RoomCover";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronDown, Crown, Flame, MonitorPlay, Plus, Radio, UsersRound } from "lucide-react";
import { activeRooms } from "@/lib/app/active-rooms";
import { useLiveCounts } from "@/lib/app/live-counts";
import { ShortcutIcon } from "@/components/art/ShortcutIcon";
import { Logo } from "@/components/brand/Logo";
import { GameArt } from "@/components/art/GameArt";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin, Pill, SectionTitle, formatCoins, formatCount } from "@/components/ui/kit";
import { RoomCard, RoomRow } from "@/components/rooms/RoomCards";
import { GAMES, PEOPLE } from "@/lib/app/data";
import { usePeople } from "@/lib/app/people";
import { useApp } from "@/lib/app/store";
import { nameFace } from "@/lib/app/fonts";

export function HomeScreen() {
  return (
    <div className="app-scroll h-full pb-[calc(84px+var(--mini,0px)+env(safe-area-inset-bottom))]">
      <TopBar />
      <Shortcuts />
      <GameModes />
      <FeaturedVip />
      <PopularRooms />
      <WatchTogether />
      <Trending />
      <RecommendedFriends />
      <p className="px-6 pt-8 text-center text-[11px] leading-relaxed text-muted/70">
        Panchayat web preview. Rooms, coins, gifts and chats are demo data that stay on this device.
      </p>
    </div>
  );
}

export function CoinPill() {
  const { coins, setSheet } = useApp();
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={() => setSheet({ kind: "coins" })}
      className="flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface/80 pl-1.5 pr-2.5"
      aria-label={`${coins} demo coins. Open wallet`}
    >
      <Coin className="h-5 w-5" />
      <span className="text-[13.5px] font-bold text-cream">{formatCoins(coins)}</span>
      <Plus className="h-3.5 w-3.5 text-muted" aria-hidden />
    </motion.button>
  );
}

function TopBar() {
  const { profile, notices, setSheet, setTab } = useApp();
  const unread = notices.filter((n) => !n.read).length;
  return (
    <header className="pt-safe sticky top-0 z-20 bg-gradient-to-b from-ink via-ink/95 to-ink/80 backdrop-blur-xl">
      <div className="flex h-[60px] items-center gap-2 px-4">
        <span className="-ml-1 pt-1.5">
          <Logo size="1.2rem" sizes="160px" />
        </span>
        <span className="flex-1" />
        <CoinPill />
        <button
          type="button"
          onClick={() => setSheet({ kind: "notifications" })}
          className="relative grid h-9 w-9 place-items-center rounded-full text-cream hover:bg-cream/5"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="h-[21px] w-[21px]" />
          {unread ? <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-ink" /> : null}
        </button>
        <button type="button" onClick={() => setTab("profile")} aria-label="Your profile" className="rounded-full">
          <PersonAvatar person={{ id: "me", look: profile.look, photo: profile.photo, frame: profile.frame }} size={34} />
        </button>
      </div>
    </header>
  );
}

function Shortcuts() {
  const { setSheet, profile, push } = useApp();
  const person = usePeople();
  const online = PEOPLE.filter((p) => p.online && profile.following.includes(p.id));
  const items = [
    {
      label: "Ranking",
      onClick: () => push({ kind: "ranking" }),
      art: <ShortcutIcon kind="ranking" />,
    },
    {
      label: "Tasks",
      onClick: () => setSheet({ kind: "tasks" }),
      art: <ShortcutIcon kind="tasks" />,
      dot: true,
    },
    {
      label: "Friends",
      onClick: () => setSheet({ kind: "friends" }),
      art: (
        <ShortcutIcon kind="friends">
          <span className="flex -space-x-3">
            {(online.length ? online : PEOPLE).slice(0, 2).map((p) => (
              <PersonAvatar key={p.id} person={{ ...person(p.id), frame: "none" }} size={26} className="rounded-full ring-2 ring-[#e7bc72]" />
            ))}
          </span>
        </ShortcutIcon>
      ),
    },
  ];
  return (
    <div className="mt-3 grid grid-cols-3 gap-2.5 px-4">
      {items.map((it, i) => (
        <motion.button key={it.label} type="button" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, type: "spring", stiffness: 260, damping: 24 }} whileTap={{ scale: 0.95 }} onClick={it.onClick} className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-[22px] bg-gradient-to-b from-white/[0.07] to-white/[0.02] py-3 ring-1 ring-white/10 backdrop-blur-sm">
          <span aria-hidden className="pointer-events-none absolute -top-8 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-gold/15 blur-2xl" />
          <span className="relative h-[54px] w-[54px]">
            <span className="block origin-top-left scale-[0.82]">{it.art}</span>
            {it.dot ? <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-[#0c0b10]" /> : null}
          </span>
          <span className="relative text-[12.5px] font-bold tracking-wide text-cream/90">{it.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

function GameModes() {
  const { setSheet } = useApp();
  const [all, setAll] = useState(false);
  const games = all ? GAMES : GAMES.slice(0, 6);
  return (
    <section className="mt-8" aria-labelledby="games-h">
      <div className="mb-3 flex items-center gap-1.5 px-4">
        <h2 id="games-h" className="font-display text-[19px] font-bold text-cream">
          Game Modes
        </h2>
        <Flame className="h-4.5 w-4.5 text-gold" aria-hidden />
      </div>
      <motion.ul layout className="grid grid-cols-3 gap-2.5 px-4">
        {games.map((g) => (
          <motion.li key={g.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setSheet({ kind: "game", gameId: g.id })}
              className="relative block aspect-square w-full overflow-hidden rounded-2xl text-left ring-1 ring-line"
              aria-label={`${g.name}, ${g.players}`}
            >
              <span className={g.soon ? "block h-full w-full opacity-60 grayscale-[60%]" : "block h-full w-full"}>
                <GameArt id={g.id} />
              </span>
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
              {g.soon ? (
                <span className="absolute right-2 top-2 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-gold ring-1 ring-gold/40">Soon</span>
              ) : null}
              {g.tag && !g.soon ? (
                <Pill tone={g.tag === "NEW" ? "new" : "live"} className="absolute left-2 top-2 !text-[9px]">
                  {g.tag}
                </Pill>
              ) : null}
              <span className={`absolute bottom-2 left-2.5 right-1 font-display font-extrabold uppercase leading-tight tracking-wide text-white drop-shadow ${g.name.length > 8 ? "text-[11px]" : "text-[13px]"}`}>{g.name}</span>
            </motion.button>
          </motion.li>
        ))}
      </motion.ul>
      <button type="button" onClick={() => setAll((v) => !v)} className="mx-auto mt-3 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:text-cream">
        {all ? "Show fewer games" : `All ${GAMES.length} games`}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${all ? "rotate-180" : ""}`} aria-hidden />
      </button>
    </section>
  );
}

function FeaturedVip() {
  const { roomById, openRoom } = useApp();
  const person = usePeople();
  const room = roomById("r-royal");
  if (!room) return null;
  const host = person(room.hostId);
  return (
    <section className="mt-6 px-4" aria-label="Featured VIP room">
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => openRoom(room.id)}
        className="relative block w-full overflow-hidden rounded-3xl text-left ring-1 ring-gold/45"
      >
        <span className="block aspect-[16/8]">
          <RoomCover room={room} />
        </span>
        <span className="absolute inset-0 bg-gradient-to-r from-[#1a0a10]/95 via-[#2a0f18]/70 to-transparent" />
        <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <span className="absolute inset-y-0 left-0 flex w-[66%] flex-col justify-center p-4">
          <Pill tone="vip" className="self-start">
            <Crown className="h-3 w-3" aria-hidden /> Featured VIP
          </Pill>
          <span className="mt-2 font-display text-[22px] font-extrabold leading-tight gold-shine pr-1" style={nameFace(room.settings?.nameFont)}>{room.name}</span>
          <span className="mt-1 text-[12px] text-cream/75">{room.topic}</span>
          <span className="mt-3 flex items-center gap-2 text-[11.5px] text-cream/80">
            <PersonAvatar person={host} size={22} />
            {host.name}
            <span className="text-cream/40">•</span>
            <UsersRound className="h-3 w-3" aria-hidden /> {formatCount(room.members)}
          </span>
        </span>
      </motion.button>
    </section>
  );
}

/** Rooms with people in them right now, the one with the most people online first. */
function PopularRooms() {
  const { rooms, setTab, push } = useApp();
  const live = useLiveCounts();
  const popular = useMemo(() => activeRooms(rooms, live).slice(0, 5), [rooms, live]);
  // Until the live numbers arrive (or if they can't): the real rooms, biggest first, so the section is never empty or stuck
  const meanwhile = useMemo(() => rooms.filter((r) => r.server && !r.createdByMe).sort((a, b) => b.members - a.members).slice(0, 4), [rooms]);
  const shown = live ? popular : meanwhile;
  return (
    <section className="mt-8" aria-labelledby="popular-h">
      <SectionTitle action="See all" onAction={() => setTab("rooms")}>
        <span id="popular-h">Popular rooms</span>
      </SectionTitle>
      {shown.length ? (
        <div>
          {shown.map((r) => (
            <RoomRow key={r.id} room={r} />
          ))}
        </div>
      ) : (
        <div className="mx-4 flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
            <Radio className="h-5 w-5" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-muted">Nobody is in a room right now. Start one and call your friends.</p>
          <button type="button" onClick={() => push({ kind: "create-room" })} className="shrink-0 rounded-full bg-coral px-3.5 py-1.5 text-[12px] font-bold text-white">
            Start a room
          </button>
        </div>
      )}
    </section>
  );
}

function WatchTogether() {
  const { roomById, openRoom } = useApp();
  const room = roomById("r-movie");
  if (!room) return null;
  return (
    <section className="mt-6 px-4" aria-label="Watch Together">
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => openRoom(room.id)}
        className="relative flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-surface p-3 text-left ring-1 ring-line"
      >
        <span className="relative aspect-video w-[46%] shrink-0 overflow-hidden rounded-2xl">
          <RoomCover room={room} />
          <span className="absolute inset-0 grid place-items-center bg-black/25">
            <span className="grid h-9 w-12 place-items-center rounded-xl bg-[#ff0033] shadow-lg">
              <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
                <path d="M3 1.5 L10.5 6 L3 10.5 Z" fill="#fff" />
              </svg>
            </span>
          </span>
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-pink">
            <MonitorPlay className="h-3.5 w-3.5" aria-hidden /> Watch Together
          </span>
          <span className="mt-1 block font-display text-[16px] font-bold leading-tight text-cream">{room.name}</span>
          <span className="mt-1 block text-[11.5px] text-muted">Add a YouTube video, then talk about it live.</span>
          <span className="mt-2 inline-block rounded-full bg-coral px-3 py-1 text-[11.5px] font-bold text-white">Open room</span>
        </span>
      </motion.button>
    </section>
  );
}

function Trending() {
  const { rooms } = useApp();
  const trending = rooms.filter((r) => r.type === "voice" && r.live).sort((a, b) => b.members - a.members);
  return (
    <section className="mt-8" aria-labelledby="trending-h">
      <SectionTitle>
        <span id="trending-h">Trending voice rooms</span>
      </SectionTitle>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {trending.map((r) => (
          <RoomCard key={r.id} room={r} />
        ))}
      </div>
    </section>
  );
}

function RecommendedFriends() {
  const { profile, toggleFollow, setSheet } = useApp();
  const people = PEOPLE.slice(2, 10);
  return (
    <section className="mt-8" aria-labelledby="friends-h">
      <SectionTitle>
        <span id="friends-h">People you may like</span>
      </SectionTitle>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {people.map((p) => {
          const following = profile.following.includes(p.id);
          return (
            <div key={p.id} className="flex w-[124px] shrink-0 flex-col items-center rounded-3xl bg-surface p-3 ring-1 ring-line">
              <button type="button" onClick={() => setSheet({ kind: "person", personId: p.id })} className="flex flex-col items-center" aria-label={`View ${p.name}`}>
                <PersonAvatar person={p} size={58} />
                <span className="mt-2 max-w-full truncate text-[13.5px] font-bold text-cream">{p.name}</span>
                <span className="max-w-full truncate text-[11px] text-muted">
                  Lv.{p.level} · {p.city}
                </span>
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                onClick={() => toggleFollow(p.id)}
                className={`mt-2.5 h-8 w-full rounded-full text-[12px] font-bold ${following ? "bg-cream/10 text-cream" : "bg-coral text-white"}`}
              >
                {following ? "Following" : "Follow"}
              </motion.button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
