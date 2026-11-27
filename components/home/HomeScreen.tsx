"use client";

import { eventCenterOn } from "@/lib/api/events";
import { Hut3D, Mic3D } from "@/components/art/Icons3D";
import { RoomCover } from "@/components/rooms/RoomCover";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronRight, Crown, Flame, MonitorPlay, Play, Plus, Radio, UsersRound } from "lucide-react";
import { activeRooms } from "@/lib/app/active-rooms";
import { useLiveCounts } from "@/lib/app/live-counts";
import { OfficialRooms } from "@/components/rooms/OfficialRoomsUi";
import { NewbieRooms } from "@/components/newbie/NewbieUi";
import { ShortcutIcon } from "@/components/art/ShortcutIcon";
import { Logo } from "@/components/brand/Logo";
import { FestivalBanner } from "@/components/festival/FestivalBanner";
import { GameMini } from "@/components/games/GameCards";
import { CoinBalance, SectionHeader } from "@/components/ui/premium";
import { rememberPlayed, useGameHighlights, useGameLive } from "@/lib/games/live";
import { useActivity } from "@/lib/app/activity-store";
import { useServerUnread } from "@/lib/app/chat-store";
import type { Game } from "@/lib/app/types";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin, Pill, SectionTitle, formatCoins, formatCount } from "@/components/ui/kit";
import { RoomCard, RoomRow } from "@/components/rooms/RoomCards";
import { PLAYABLE, PEOPLE } from "@/lib/app/data";
import { AppDownloadBanner } from "@/components/system/AppDownloadBanner";
import { usePeople } from "@/lib/app/people";
import { useApp } from "@/lib/app/store";
import { nameFace } from "@/lib/app/fonts";

export function HomeScreen() {
  return (
    <div className="app-scroll aurora h-full pb-[calc(100px+var(--mini,0px)+var(--sb))]">
      <TopBar />
      <Greeting />
      <HomeFestival />
      <NewbieRooms />
      <OfficialRooms />
      <Shortcuts />
      <GameModes />
      <FeaturedVip />
      <PopularRooms />
      <WatchTogether />
      <Trending />
      <RecommendedFriends />
    </div>
  );
}

/** A warm hello and the two things most people come for. */
function Greeting() {
  const { profile, push, setTab } = useApp();
  const first = (profile.name || "").trim().split(/\s+/)[0] || "dost";
  const hour = new Date().getHours();
  const when = hour < 12 ? "Suprabhat" : hour < 17 ? "Namaste" : hour < 21 ? "Shubh sandhya" : "Shubh ratri";
  return (
    <section className="px-4 pt-1" aria-label="Welcome">
      <h1 className="font-display text-[26px] font-black leading-tight tracking-tight text-cream">
        {when}, <span className="bg-gradient-to-r from-[#ffd86b] via-[#ff9ad5] to-[#b9a3ff] bg-clip-text text-transparent">{first}</span> 🙏
      </h1>
      <p className="mt-1 text-[13px] text-cream/65">Aaj kya karein? Gaddaar pakdo ya kisi room me baat karo.</p>
      <div className="mt-3.5 grid grid-cols-2 gap-3">
        <QuickTile
          onClick={() => push({ kind: "gaddar" })}
          title="Gaddaar khelo"
          sub="Bina room, seedha game"
          tag="Game"
          art={<Hut3D size={74} />}
          bg="from-[#ff6a3d] via-[#d9264f] to-[#6b0f2e]"
          glow="rgba(255,106,61,0.55)"
        />
        <QuickTile
          onClick={() => setTab("rooms")}
          title="Rooms me jao"
          sub="Live baat-cheet"
          tag="Live"
          live
          art={<Mic3D size={74} />}
          bg="from-[#8b5cf6] via-[#5b2bd6] to-[#1e0f5c]"
          glow="rgba(139,92,246,0.55)"
        />
      </div>
    </section>
  );
}

function HomeFestival() {
  const { setTab } = useApp();
  return <FestivalBanner onOpen={() => setTab("rooms")} />;
}

export function CoinPill() {
  const { coins, setSheet } = useApp();
  return <CoinBalance coins={coins} onClick={() => setSheet({ kind: "coins" })} />;
}

function TopBar() {
  const { profile, notices, setSheet, setTab, session } = useApp();
  const activity = useActivity();
  const chats = useServerUnread() ?? 0;
  // Signed in: new likes / comments / replies on your Moments plus unread messages; otherwise the sample list
  const unread = session ? activity.fresh + chats : notices.filter((n) => !n.read).length;
  return (
    <header className="pt-safe sticky top-0 z-20 bg-gradient-to-b from-[#160b1e]/95 via-[#160b1e]/85 to-[#160b1e]/40 backdrop-blur-xl">
      <div className="flex h-[60px] items-center gap-2 px-4">
        <span className="-ml-1 pt-1.5">
          <Logo size="1.2rem" sizes="160px" />
        </span>
        <span className="flex-1" />
        <CoinPill />
        <button
          type="button"
          onClick={() => setSheet({ kind: "notifications" })}
          className="pn-glass relative grid h-10 w-10 place-items-center rounded-full text-cream active:scale-90"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="h-[21px] w-[21px]" />
          {unread ? (
            session ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-coral px-1 text-[10px] font-black text-white ring-2 ring-ink">{unread > 99 ? "99+" : unread}</span>
            ) : (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-ink" />
            )
          ) : null}
        </button>
        <button type="button" onClick={() => setTab("profile")} aria-label="Your profile" className="rounded-full">
          <PersonAvatar person={{ id: "me", look: profile.look, photo: profile.photo, frame: profile.frame }} size={34} />
        </button>
      </div>
      <AppDownloadBanner />
    </header>
  );
}

function Shortcuts() {
  const { setSheet, profile, push } = useApp();
  // The Event Center button shows only while the admins have it switched on
  const [eventsOn, setEventsOn] = useState(false);
  useEffect(() => {
    let live = true;
    void eventCenterOn().then((on) => live && setEventsOn(on));
    return () => {
      live = false;
    };
  }, []);
  const person = usePeople();
  const online = PEOPLE.filter((p) => p.online && profile.following.includes(p.id));
  const items = [
    ...(eventsOn
      ? [
          {
            label: "Events",
            onClick: () => push({ kind: "eventCenter" }),
            art: <ShortcutIcon kind="events" />,
            dot: true,
          },
        ]
      : []),
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
    <div className={`mt-3 grid gap-2.5 px-4 ${items.length > 3 ? "grid-cols-4" : "grid-cols-3"}`}>
      {items.map((it, i) => (
        <motion.button key={it.label} type="button" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, type: "spring", stiffness: 260, damping: 24 }} whileTap={{ scale: 0.95 }} onClick={it.onClick} className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-[22px] bg-gradient-to-b pn-card lift rounded-[22px] py-3.5">
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
  const { setSheet, push } = useApp();
  const live = useGameLive();
  const hl = useGameHighlights(PLAYABLE.filter((g) => g.tag === "NEW").map((g) => g.id));
  const open = (g: Game) => {
    rememberPlayed(g.id);
    setSheet({ kind: "game", gameId: g.id });
  };
  return (
    <section className="mt-6" aria-labelledby="games-h">
      <SectionHeader
        title={
          <span id="games-h" className="inline-flex items-center gap-2">
            Game Modes
            {hl?.fresh ? (
              <motion.span className="rounded-full bg-[#ffd84d] px-2 py-0.5 font-sans text-[10.5px] font-black text-[#2a1200]" animate={{ y: [0, -3, 0] }} transition={{ duration: 1.1, repeat: Infinity }}>
                Naye ho? Game try karo 👇
              </motion.span>
            ) : null}
          </span>
        }
        icon={<Flame className="h-4.5 w-4.5 text-gold" aria-hidden />}
      />
      <ul className="no-scrollbar flex scroll-pl-4 snap-x gap-2.5 overflow-x-auto px-4 pb-2 pt-1">
        {PLAYABLE.map((g, i) => (
          <li key={g.id}>
            <GameMini g={g} live={live?.[g.id]} index={i} onOpen={() => open(g)} highlight={hl?.glow.has(g.id) ?? false} />
          </li>
        ))}
        <li>
          <button type="button" onClick={() => push({ kind: "games" })} className="pn-card grid h-[132px] w-[100px] shrink-0 snap-start place-items-center rounded-[20px] text-center" aria-label="Sab games">
            <span>
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-gold/20 text-[20px] text-gold">›</span>
              <span className="mt-1.5 block font-display text-[13px] font-black text-cream">Sab games</span>
            </span>
          </button>
        </li>
      </ul>
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
  const counts = useLiveCounts();
  // Only rooms that are live right now, with people in them (busiest first). Before the live numbers arrive nothing shows, so an empty room is never called live.
  const busy = (r: (typeof rooms)[number]) => (r.server ? (counts?.[r.server.id] ?? 0) : counts ? 0 : r.members);
  const trending = rooms.filter((r) => r.type === "voice" && r.live && !r.password && !r.isPrivate && busy(r) > 0).sort((a, b) => busy(b) - busy(a));
  if (!trending.length) return null;
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
  if (!people.length) return null;
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

/** A tall, poster-like shortcut tile: bold colour, a big 3D icon floating at the top right, the title at the bottom. */
function QuickTile({ onClick, title, sub, tag, live = false, art, bg, glow }: { onClick: () => void; title: string; sub: string; tag: string; live?: boolean; art: ReactNode; bg: string; glow: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      aria-label={`${title}, ${sub}`}
      className={`group relative flex h-[132px] flex-col justify-end overflow-hidden rounded-[24px] bg-gradient-to-br ${bg} p-3 pb-3.5 text-left ring-1 ring-white/20`}
      style={{ boxShadow: `0 14px 28px -14px ${glow}, inset 0 1px 0 rgba(255,255,255,0.35)` }}
    >
      {/* soft light and dotted texture */}
      <span aria-hidden className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1.2px)] [background-size:12px_12px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/45 to-transparent" />
      {/* the 3D icon, tilted and floating */}
      <motion.span
        aria-hidden
        className="absolute -top-1 -right-2 drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]"
        animate={{ y: [0, -4, 0], rotate: [8, 4, 8] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {art}
      </motion.span>
      {/* small tag */}
      <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[9.5px] font-black tracking-[0.14em] text-white uppercase ring-1 ring-white/25 backdrop-blur-sm">
        {live ? (
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80]/70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
          </span>
        ) : null}
        {tag}
      </span>
      <span className="relative block">
        <span className="block font-display text-[16.5px] leading-tight font-black whitespace-nowrap text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.35)]">{title}</span>
        <span className="mt-1 block truncate text-[11px] font-semibold text-white/85">{sub}</span>
      </span>
    </motion.button>
  );
}
