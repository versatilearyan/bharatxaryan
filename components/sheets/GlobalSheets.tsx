"use client";

import { VipBadge } from "@/components/effects/VipFx";
import { nameTone } from "@/lib/app/fonts";
import { useMarket } from "@/lib/app/market-store";
import { RoomCover } from "@/components/rooms/RoomCover";
import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Copy, DoorOpen, Gift, Hash, MessageCircle, Radio, SearchX, Sparkles, UserCheck, UserPlus } from "lucide-react";
import { GameArt } from "@/components/art/GameArt";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CharmBadge } from "@/components/ui/CharmBadge";
import { TagStrip, TagTitleChip } from "@/components/rooms/TagParts";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Button, Coin, DemoNote, formatCoins, formatCount } from "@/components/ui/kit";
import { EditProfileSheet } from "@/components/profile/EditProfileSheet";
import { RedPacketShop } from "@/components/redpacket/RedPacket";
import { CATEGORIES, PEOPLE, TASKS, gameById } from "@/lib/app/data";
import { RoomTypeBadge } from "@/components/rooms/RoomCards";
import { useApp } from "@/lib/app/store";
import type { GameId } from "@/lib/app/types";
import { EXP_SOURCES, GAME_WIN_EXP, purchaseExp } from "@/lib/app/progress";
import { LevelPill } from "@/components/profile/IdTags";

/** App-level bottom sheets opened from Home, Discover, Profile and rooms. */
export function GlobalSheets() {
  const { sheet, setSheet } = useApp();
  const close = () => setSheet(null);
  return (
    <>
      <PersonSheet personId={sheet?.kind === "person" ? sheet.personId : null} onClose={close} />
      <NotificationsSheet open={sheet?.kind === "notifications"} onClose={close} />
      <TasksSheet open={sheet?.kind === "tasks"} onClose={close} />
      <FriendsSheet open={sheet?.kind === "friends"} onClose={close} />
      <CoinsSheet open={sheet?.kind === "coins"} onClose={close} />
      <GameSheet gameId={sheet?.kind === "game" ? sheet.gameId : null} onClose={close} />
      <EditProfileSheet open={sheet?.kind === "edit-profile"} onClose={close} />
      <FindUserSheet open={sheet?.kind === "find-user"} onClose={close} />
      <JoinRoomSheet open={sheet?.kind === "join-room"} onClose={close} />
      <RoomPasswordSheet roomId={sheet?.kind === "room-password" ? sheet.roomId : null} onClose={close} />
    </>
  );
}

function PersonSheet({ personId, onClose }: { personId: string | null; onClose: () => void }) {
  const { profile, toggleFollow, openConversation, rooms, openRoom, openIntimateSpace } = useApp();
  const p = PEOPLE.find((x) => x.id === personId);
  const fxOf = useMarket().effectsFor;
  const hosting = rooms.find((r) => r.hostId === personId);
  return (
    <BottomSheet open={Boolean(p)} onClose={onClose}>
      {p ? (
        <div className="px-5 pb-6 pt-2 text-center">
          <div className="flex justify-center">
            <PersonAvatar person={p} size={88} />
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5">
            <span className={`font-display text-[22px] font-extrabold ${nameTone(p.vip)}`}>{p.name}</span>
            {fxOf(p.id, p.vip).badge ? <VipBadge set={fxOf(p.id, p.vip).badge!} level={p.vip} size={24} animated /> : null}
          </p>
          <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[12px] text-muted">
            <LevelPill level={p.level} gender={p.gender} size="sm" />
            <CharmBadge personId={p.id} />
            {p.handle}
            {p.city ? ` · ${p.city}` : ""}
          </p>
          <CopyId id={p.uid} label="User ID" />
          <div className="mt-2">
            <TagTitleChip personId={p.id} />
          </div>
          <p className="mt-3 text-[14px] text-cream/85">{p.bio}</p>
          <div className="mt-3 flex justify-center gap-2">
            {p.tags.map((t) => (
              <span key={t} className="rounded-full bg-cream/[0.07] px-2.5 py-1 text-[11px] text-cream/80">
                {t}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted">{formatCount(p.followers)} followers</p>
          <TagStrip
            personId={p.id}
            onOpen={() => {
              onClose();
              openIntimateSpace(p.id);
            }}
          />
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant={profile.following.includes(p.id) ? "soft" : "primary"} onClick={() => toggleFollow(p.id)}>
              <UserPlus className="h-4 w-4" /> {profile.following.includes(p.id) ? "Following" : "Follow"}
            </Button>
            <Button variant="soft" onClick={() => openConversation(p.id)}>
              <MessageCircle className="h-4 w-4" /> Message
            </Button>
          </div>
          {hosting ? (
            <button type="button" onClick={() => openRoom(hosting.id)} className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-coral/10 px-4 py-3 text-left ring-1 ring-coral/30">
              <Radio className="h-4 w-4 text-coral" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[13px] text-cream">
                Hosting <span className="font-bold">{hosting.name}</span>
              </span>
              <span className="text-[12px] font-bold text-pink">Join</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  );
}

function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notices, markNoticesRead } = useApp();
  const icon = { gift: Gift, room: Radio, friend: UserPlus, system: Sparkles };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Notifications"
      headerRight={
        <button type="button" onClick={markNoticesRead} className="text-[12px] font-semibold text-gold">
          Mark all read
        </button>
      }
    >
      <ul className="pb-4">
        {notices.map((n) => {
          const Icon = icon[n.kind];
          return (
            <li key={n.id} className="flex items-start gap-3 px-5 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream/[0.07] text-gold">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[14px] ${n.read ? "text-cream/80" : "font-semibold text-cream"}`}>{n.title}</span>
                <span className="block text-[12px] text-muted">{n.body}</span>
              </span>
              <span className="flex flex-col items-end gap-1.5">
                <span className="text-[11px] text-muted">{n.at}</span>
                {!n.read ? <span className="h-2 w-2 rounded-full bg-coral" aria-label="Unread" /> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center justify-center gap-1.5 px-5 pb-5 text-[11px] text-muted">
        <Bell className="h-3 w-3" aria-hidden /> Sample notifications for this preview
      </p>
    </BottomSheet>
  );
}

function TasksSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { claimed, claimTask } = useApp();
  return (
    <BottomSheet open={open} onClose={onClose} title="Daily tasks">
      <ul className="space-y-2 px-5 pb-4">
        {TASKS.map((t) => {
          const done = t.progress >= t.goal;
          const got = claimed.includes(t.id);
          return (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-cream">{t.title}</span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream/10">
                    <span className="block h-full rounded-full bg-gradient-to-r from-coral to-gold" style={{ width: `${(Math.min(t.progress, t.goal) / t.goal) * 100}%` }} />
                  </span>
                  <span className="text-[11px] text-muted">
                    {Math.min(t.progress, t.goal)}/{t.goal}
                  </span>
                </span>
              </span>
              <button
                type="button"
                disabled={!done || got}
                onClick={() => claimTask(t.id, t.reward)}
                className={`flex h-9 min-w-[76px] items-center justify-center gap-1 rounded-full px-3 text-[12px] font-bold ${got ? "bg-cream/10 text-muted" : done ? "bg-gold text-ink" : "bg-cream/[0.06] text-cream/60"}`}
              >
                {got ? (
                  "Claimed"
                ) : (
                  <>
                    <Coin className="h-3.5 w-3.5" />+{t.reward}
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <DemoNote className="mx-5 mb-5">Task rewards are demo coins for trying out the app.</DemoNote>
    </BottomSheet>
  );
}

function FriendsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, rooms, openRoom, openConversation, setSheet } = useApp();
  const friends = PEOPLE.filter((p) => profile.following.includes(p.id));
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Friends · ${friends.length}`}
      tall
      headerRight={
        <button type="button" onClick={() => setSheet({ kind: "find-user" })} className="flex items-center gap-1 rounded-full bg-coral/15 px-3 py-1.5 text-[12px] font-bold text-pink">
          <UserPlus className="h-3.5 w-3.5" /> Add by ID
        </button>
      }
    >
      {friends.length === 0 ? (
        <div className="px-5 pb-8 pt-4 text-center">
          <p className="text-sm text-muted">You aren&apos;t following anyone yet.</p>
          <Button className="mt-4" onClick={() => setSheet({ kind: "find-user" })}>
            <UserPlus className="h-4 w-4" /> Add a friend by user ID
          </Button>
        </div>
      ) : (
        <ul className="pb-4">
          {friends.map((p) => {
            const inRoom = rooms.find((r) => r.seated.includes(p.id) && r.live);
            return (
              <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="relative">
                  <PersonAvatar person={p} size={46} />
                  {p.online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-speak ring-2 ring-ink-2" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-cream">{p.name}</span>
                  <span className="block truncate text-[11.5px] text-muted">{inRoom ? `In ${inRoom.name}` : p.online ? "Online" : "Offline"}</span>
                </span>
                {inRoom ? (
                  <button type="button" onClick={() => openRoom(inRoom.id)} className="h-8 rounded-full bg-coral px-3.5 text-[12px] font-bold text-white">
                    Join
                  </button>
                ) : null}
                <button type="button" onClick={() => openConversation(p.id)} className="grid h-8 w-8 place-items-center rounded-full bg-cream/[0.08] text-cream" aria-label={`Message ${p.name}`}>
                  <MessageCircle className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </BottomSheet>
  );
}

function CoinsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { coins, addCoins, toast, addExp } = useApp();
  return (
    <BottomSheet open={open} onClose={onClose} title="Demo wallet">
      <div className="px-5 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4a3214] via-[#2a1a0c] to-[#1a1008] p-5 ring-1 ring-gold/40">
          <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <p className="relative text-[12px] text-gold/80">Balance</p>
          <p className="relative mt-1 flex items-center gap-2 font-display text-[34px] font-extrabold text-cream">
            <Coin className="h-8 w-8" /> {coins.toLocaleString("en-IN")}
          </p>
          <p className="relative mt-1 text-[11.5px] text-cream/60">≈ {formatCoins(coins)} demo coins</p>
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Add free demo coins</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[1000, 5000, 10000, 20000].map((n) => (
            <motion.button
              key={n}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                addCoins(n);
                // Coin packs earn EXP; 10,000+ in one pack gives the big instant boost
                const xp = addExp(purchaseExp(n), "purchase");
                toast(`+${n.toLocaleString("en-IN")} demo coins · +${xp.toLocaleString("en-IN")} EXP`, "gold");
              }}
              className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 ring-1 ring-line hover:ring-gold/40"
            >
              <Coin className="h-6 w-6" />
              <span className="text-[14px] font-bold text-cream">+{formatCoins(n)}</span>
              <span className={`text-[10.5px] font-semibold ${n >= 10000 ? "text-gold" : "text-speak"}`}>Free · +{formatCount(purchaseExp(n))} EXP</span>
            </motion.button>
          ))}
        </div>
        <RedPacketShop />
        <DemoNote className="mt-4">Coins in this preview are pretend. There are no purchases, payments or real-money value.</DemoNote>
      </div>
    </BottomSheet>
  );
}

function GameSheet({ gameId, onClose }: { gameId: GameId | null; onClose: () => void }) {
  const { createRoom, profile, addExp, expToday, toast } = useApp();
  const [playing, setPlaying] = useState(false);
  /** A quick demo match: about 3 seconds, a win earns 20 EXP (up to the daily cap). */
  const quickMatch = () => {
    if (playing || !g) return;
    setPlaying(true);
    window.setTimeout(() => {
      setPlaying(false);
      if (Math.random() < 0.6) {
        const xp = addExp(GAME_WIN_EXP, "game");
        toast(xp ? `You won the ${g.name} match! +${xp} EXP` : `You won! Today's game EXP cap (${EXP_SOURCES.game.cap}) is reached.`, "gold");
      } else toast(`You lost this ${g.name} match. Wins earn ${GAME_WIN_EXP} EXP.`);
    }, 2800);
  };
  const g = gameId ? gameById(gameId) : undefined;
  const start = () => {
    if (!g) return;
    // A game table is a temporary voice room that closes when you leave
    onClose();
    createRoom({
      name: `${profile.name}'s ${g.name} table`,
      type: "voice",
      cover: { theme: "ember", motif: "lanterns" },
      isPrivate: false,
      seats: g.id === "chess" || g.id === "pool" ? 4 : 8,
      category: CATEGORIES.includes("Gaming") ? "Gaming" : "Chai Adda",
      permanent: false,
    });
  };
  return (
    <BottomSheet open={Boolean(g)} onClose={onClose}>
      {g ? (
        <div className="px-5 pb-6 pt-1">
          <div className="relative overflow-hidden rounded-3xl ring-1 ring-line">
            <div className="aspect-[16/9]">
              <GameArt id={g.id} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
            <p className="absolute bottom-3 left-4 font-display text-[26px] font-extrabold uppercase text-white">{g.name}</p>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-cream/85">{g.blurb}</p>
          <p className="mt-2 flex items-center gap-3 text-[12px] text-muted">
            <span>{g.players}</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-speak" />
              {formatCount(g.online)} playing (sample)
            </span>
          </p>
          <Button size="lg" className="mt-5 w-full" onClick={quickMatch} disabled={playing}>
            {playing ? "Playing a quick match…" : "Quick match (demo)"}
          </Button>
          <p className="mt-1.5 text-center text-[11px] text-muted">
            Wins earn {GAME_WIN_EXP} EXP · today {expToday("game")}/{EXP_SOURCES.game.cap}
          </p>
          <Button size="lg" variant="soft" className="mt-3 w-full" onClick={start}>
            Open a {g.name} room
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted">Game boards arrive in a later version. For now you get a voice room to play together.</p>
        </div>
      ) : null}
    </BottomSheet>
  );
}

function CopyId({ id, label }: { id: string; label: string }) {
  const { toast } = useApp();
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(id).catch(() => {});
        toast(`${label} ${id} copied`);
      }}
      className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-cream/[0.07] px-2.5 py-1 text-[11.5px] font-semibold text-cream/80"
    >
      {label} {id} <Copy className="h-3 w-3" aria-hidden />
    </button>
  );
}

/** Digits-only code field shared by the "find user" and "join room" sheets. */
function CodeField({ value, onChange, onSubmit, label, placeholder }: { value: string; onChange: (v: string) => void; onSubmit: () => void; label: string; placeholder: string }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex gap-2"
    >
      <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 focus-within:border-gold/50">
        <Hash className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
          inputMode="numeric"
          aria-label={label}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent font-display text-[17px] font-bold tracking-[0.12em] text-cream placeholder:font-sans placeholder:text-[14px] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted/70 focus:outline-none"
        />
      </label>
      <Button type="submit" disabled={value.length < 4}>
        Search
      </Button>
    </form>
  );
}

function FindUserSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, toggleFollow, openConversation } = useApp();
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const found = searched ? PEOPLE.find((p) => p.uid === searched) : undefined;
  const isMe = searched === profile.userId;
  return (
    <BottomSheet
      open={open}
      onClose={() => {
        onClose();
        setQ("");
        setSearched(null);
      }}
      title="Add friend by ID"
    >
      <div className="px-5 pb-6">
        <p className="mb-3 text-[12.5px] text-muted">Every Panchayat user has a number ID on their profile. Ask a friend for theirs.</p>
        <CodeField value={q} onChange={setQ} onSubmit={() => setSearched(q)} label="User ID" placeholder="Enter user ID, e.g. 208114" />
        <div className="mt-4" aria-live="polite">
          {isMe ? (
            <p className="rounded-2xl bg-cream/[0.05] p-4 text-center text-[13px] text-muted">That&apos;s your own ID.</p>
          ) : found ? (
            <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
              <PersonAvatar person={found} size={52} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-cream">{found.name}</span>
                <span className="block truncate text-[11.5px] text-muted">
                  ID {found.uid} · Lv.{found.level} · {found.city}
                </span>
              </span>
              <button
                type="button"
                onClick={() => toggleFollow(found.id)}
                aria-label={profile.following.includes(found.id) ? `Remove ${found.name}` : `Add ${found.name}`}
                className={`grid h-9 w-9 place-items-center rounded-full ${profile.following.includes(found.id) ? "bg-cream/10 text-cream" : "bg-coral text-white"}`}
              >
                {profile.following.includes(found.id) ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => openConversation(found.id)} aria-label={`Message ${found.name}`} className="grid h-9 w-9 place-items-center rounded-full bg-cream/[0.08] text-cream">
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          ) : searched ? (
            <p className="flex flex-col items-center gap-2 rounded-2xl bg-cream/[0.05] p-4 text-center text-[13px] text-muted">
              <SearchX className="h-6 w-6" aria-hidden />
              No user with ID {searched}. Check the number and try again.
            </p>
          ) : (
            <p className="text-[11.5px] text-muted">
              Try a sample ID: {PEOPLE.slice(0, 3).map((p, i) => (
                <button key={p.id} type="button" onClick={() => { setQ(p.uid); setSearched(p.uid); }} className="font-semibold text-gold">
                  {i ? ", " : ""}{p.uid}
                </button>
              ))}
            </p>
          )}
        </div>
        <p className="mt-4 text-center text-[11.5px] text-muted">
          Your ID is <span className="font-bold text-cream">{profile.userId}</span>
        </p>
      </div>
    </BottomSheet>
  );
}

function JoinRoomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { rooms, openRoom } = useApp();
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const found = searched ? rooms.find((r) => r.code === searched) : undefined;
  return (
    <BottomSheet
      open={open}
      onClose={() => {
        onClose();
        setQ("");
        setSearched(null);
      }}
      title="Join by room ID"
    >
      <div className="px-5 pb-6">
        <p className="mb-3 text-[12.5px] text-muted">Every room has a number ID under its name. Enter it to jump straight in.</p>
        <CodeField value={q} onChange={setQ} onSubmit={() => setSearched(q)} label="Room ID" placeholder="Enter room ID" />
        <div className="mt-4" aria-live="polite">
          {found ? (
            <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                <RoomCover room={found} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-cream">{found.name}</span>
                <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted">
                  <RoomTypeBadge type={found.type} /> ID {found.code}
                </span>
              </span>
              <Button onClick={() => openRoom(found.id)}>
                <DoorOpen className="h-4 w-4" /> Join
              </Button>
            </div>
          ) : searched ? (
            <p className="flex flex-col items-center gap-2 rounded-2xl bg-cream/[0.05] p-4 text-center text-[13px] text-muted">
              <SearchX className="h-6 w-6" aria-hidden />
              No room with ID {searched}. It may have closed, or the number is wrong.
            </p>
          ) : (
            <p className="text-[11.5px] text-muted">
              Try a sample ID: {rooms.slice(0, 3).map((r, i) => (
                <button key={r.id} type="button" onClick={() => { setQ(r.code); setSearched(r.code); }} className="font-semibold text-gold">
                  {i ? ", " : ""}{r.code}
                </button>
              ))}
            </p>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

function RoomPasswordSheet({ roomId, onClose }: { roomId: string | null; onClose: () => void }) {
  const { roomById, unlockRoom, enterRoom } = useApp();
  const room = roomId ? roomById(roomId) : undefined;
  const [pw, setPw] = useState("");
  const [wrong, setWrong] = useState(false);
  const submit = () => {
    if (!room) return;
    if (pw === room.password) {
      unlockRoom(room.id);
      setPw("");
      setWrong(false);
      enterRoom(room.id);
    } else {
      setWrong(true);
      setPw("");
    }
  };
  return (
    <BottomSheet
      open={Boolean(room)}
      onClose={() => {
        setPw("");
        setWrong(false);
        onClose();
      }}
      title="This room is locked"
    >
      {room ? (
        <form
          className="px-5 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <p className="text-[13px] text-muted">
            <span className="font-semibold text-cream">{room.name}</span> needs a 4-digit password from the owner.
          </p>
          <input
            value={pw}
            onChange={(e) => {
              setPw(e.target.value.replace(/\D/g, "").slice(0, 4));
              setWrong(false);
            }}
            inputMode="numeric"
            autoFocus
            aria-label="Room password"
            placeholder="••••"
            className={`mt-3 h-14 w-full rounded-2xl border bg-surface text-center font-display text-[26px] font-extrabold tracking-[0.5em] text-cream focus:outline-none ${wrong ? "border-coral" : "border-line focus:border-gold/50"}`}
          />
          {wrong ? <p className="mt-2 text-[12.5px] font-semibold text-pink">Wrong password. Try again.</p> : null}
          <Button type="submit" className="mt-3 w-full" disabled={pw.length !== 4}>
            Enter room
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted">Demo password for sample rooms: 2580</p>
        </form>
      ) : null}
    </BottomSheet>
  );
}
