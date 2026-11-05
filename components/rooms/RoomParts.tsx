"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Armchair, AudioLines, Bell, Check, ChevronDown, Copy, Gavel, Gift, Hand, Heart, ImagePlus, ListOrdered, Lock, LogOut, Megaphone, MicOff, MonitorPlay, MoreHorizontal, Music2, Plus, Power, Send, Share2, Smile, UserPlus, UsersRound, Volume2, X } from "lucide-react";
import { GiftArt } from "@/components/art/GiftArt";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { RoomCover } from "./RoomCover";
import { useMusic } from "@/lib/app/music-store";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { VipBadge, VipBubbleArt, VipFrame, frameFit } from "@/components/effects/VipFx";
import { useRoomFx } from "./useRoomFx";
import { PkSeatTag, SIDE } from "./PkParts";
import { sideOfSeat, usePkState } from "./usePk";
import { vipName } from "@/lib/app/levels";
import { Coin, IconButton, Pill, formatCount } from "@/components/ui/kit";
import { giftEarnings } from "@/lib/app/progress";
import { PEOPLE, REACTIONS, giftById } from "@/lib/app/data";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import { useServerRooms } from "@/lib/app/server-rooms";
import type { RoomMessage } from "@/lib/app/types";
import { MODE_LABEL, type RoomMode } from "./useRoomSession";
import { RoomLevelCard } from "./RoomLevel";
import { relationshipById, tagLevel } from "@/lib/app/tags";
import { TagLink } from "./TagParts";
import type { RoomSession } from "./useRoomSession";
import { nameFace } from "@/lib/app/fonts";
import { ParivarTag } from "@/components/parivar/ParivarScreens";
import { LevelPill } from "@/components/profile/IdTags";
import { ANIMATED_EMOTES, EmoteBurst, GAME_EMOTES } from "./Emotes";
import { MentionPicker, MentionText, mentions, useMentionAlerts } from "./Mentions";
import { SeatCpRing, SeatTagBadge } from "./RoomSocial";
import { ChatInviteSheet } from "@/components/social/Invites";

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

export function RoomTopBar({ s, onMenu, onLeave }: { s: RoomSession; onMenu: () => void; onLeave?: () => void }) {
  const { minimizeRoom, toast, roomLevelOf, isJoined, isFollowingRoom, toggleJoinRoom, toggleFollowRoom } = useApp();
  const [copied, setCopied] = useState(false);
  const lvl = roomLevelOf(s.room);
  const joined = isJoined(s.room.id);
  const following = isFollowingRoom(s.room.id);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(s.room.code);
    } catch {
      /* clipboard not available; still show feedback */
    }
    setCopied(true);
    toast("Room ID copied");
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="pt-safe relative z-20">
      <div className="flex h-14 items-center gap-1.5 px-2.5">
        <IconButton label="Minimise room" onClick={minimizeRoom} className="!h-9 !w-9 shrink-0 !bg-black/30 backdrop-blur">
          <ChevronDown className="h-5 w-5" />
        </IconButton>
        {/* Room pill: room info, with Join / Follow tucked in at the end */}
        <div className="flex h-10 min-w-0 max-w-[46%] shrink items-center rounded-full bg-black/30 pr-1 backdrop-blur">
        <button type="button" onClick={() => s.setPanel("info")} aria-label={`${s.room.name}, room info`} className="flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-full pl-1 pr-1 text-left">
          {/* The room's cover (the owner's picture or the illustrated scene) */}
          <span className="h-[30px] w-[30px] shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
            <RoomCover room={s.room} />
          </span>
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className={`block truncate text-[13.5px] font-bold leading-tight ${s.room.vip ? "gold-shine" : "text-cream"}`} style={nameFace(s.settings.nameFont)}>{s.room.name}</span>
            <span className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[10.5px] text-cream/60">
              {s.room.permanent ? (
                <span className="rounded bg-gold/20 px-1 text-[9.5px] font-extrabold text-gold">Lv.{lvl.level}</span>
              ) : (
                <span className="rounded bg-cream/15 px-1 text-[9.5px] font-bold text-cream/80">Temp</span>
              )}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  copyId();
                }}
                onKeyDown={(e) => e.key === "Enter" && copyId()}
                className="inline-flex items-center gap-0.5 hover:text-cream"
                aria-label={`Room ID ${s.room.code}, copy`}
              >
                ID {s.room.code} {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
              </span>
            </span>
          </span>
        </button>
        {s.isOwner ? null : !joined ? (
          <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => toggleJoinRoom(s.room)} aria-label="Join room" className="flex h-7 shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-r from-[#ffb347] to-[#ff8a3d] px-2 text-[11px] font-extrabold text-[#2a1205]">
            <UserPlus className="h-3 w-3" aria-hidden /> Join
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={() => toggleFollowRoom(s.room)}
            aria-label={following ? "Unfollow room" : "Follow room"}
            aria-pressed={following}
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${following ? "bg-coral/20 text-coral" : "bg-cream/10 text-cream/80"}`}
          >
            <Heart className={`h-3.5 w-3.5 ${following ? "fill-current" : ""}`} />
          </motion.button>
        )}
        </div>
        <TopGifters s={s} />
        <IconButton label="Room menu" onClick={onMenu} className="!h-9 !w-9 shrink-0 !bg-black/30 backdrop-blur">
          <MoreHorizontal className="h-5 w-5" />
        </IconButton>
        {onLeave ? (
          <IconButton label="Leave room" onClick={onLeave} className="!bg-[#3a1418]/80 !text-[#ff8a8f]">
            <LogOut className="h-[18px] w-[18px]" />
          </IconButton>
        ) : null}
      </div>
    </header>
  );
}

/**
 * Top bar, right side (its own space; the room pill never grows into it): the
 * three people in the room with the highest charm, each with their charm level,
 * then how many people are live in the room. Tapping either opens Online / Members / Contribution.
 */
function TopGifters({ s }: { s: RoomSession }) {
  const person = usePeople();
  const { charmOf } = useApp();
  const ids = s.room.server ? s.onlineIds : Array.from(new Set([...s.onlineIds, ...s.seats.filter((x): x is string => Boolean(x))]));
  const top = ids
    .map((id) => ({ id, c: charmOf(id) }))
    .filter((r) => r.c.tier)
    .sort((a, b) => b.c.points - a.c.points)
    .slice(0, 3);
  // Backend rooms: the backend's participant count; demo rooms: who's here
  const live = s.room.server ? s.participants?.count : s.onlineIds.length;
  // Gold, silver, bronze
  const tone = [
    { ring: "#f2c14e", tag: "linear-gradient(180deg,#ffd76a,#e9a91c)" },
    { ring: "#c3cede", tag: "linear-gradient(180deg,#d9e2ee,#8f9db3)" },
    { ring: "#d49a6a", tag: "linear-gradient(180deg,#e7b384,#a86b3c)" },
  ];
  return (
    <div className="ml-auto flex min-w-[140px] shrink-0 items-center justify-end gap-1.5">
      {top.length ? (
        <button type="button" onClick={() => s.setPanel("online")} className="flex items-start gap-1" aria-label={`Top charm in the room: ${top.map((r) => `${person(r.id).name}, charm level ${r.c.tier?.rank}`).join("; ")}`}>
          {top.map((r, i) => (
            <span key={r.id} className="flex w-[30px] flex-col items-center">
              <span className="rounded-full p-[1.5px]" style={{ background: tone[i].ring }}>
                <span className="block rounded-full ring-1 ring-black/40">
                  <PersonAvatar person={{ ...person(r.id), frame: "none" }} size={25} />
                </span>
              </span>
              <span className="relative -mt-[7px] min-w-[20px] rounded-full px-[3px] text-center text-[8.5px] font-extrabold leading-[12px] text-white shadow-[0_1px_2px_rgb(0_0_0/0.45)] [text-shadow:0_1px_1px_rgb(0_0_0/0.35)]" style={{ background: tone[i].tag }}>
                {r.c.tier?.rank}
              </span>
            </span>
          ))}
        </button>
      ) : null}
      {live == null ? null : (
        <button type="button" onClick={() => s.setPanel("online")} className="grid h-8 min-w-8 place-items-center rounded-full bg-black/30 px-1.5 text-[12.5px] font-extrabold tabular-nums text-cream backdrop-blur" aria-label={`${live} live in the room. Online, members and contribution`}>
          {formatCount(live)}
        </button>
      )}
    </div>
  );
}

/** Shown while the room is vacant (no owner or admin in it), or opened by an admin while the owner is away. */
/** Shown in place of the seats while no owner or admin is in the room. */
export function ClosedRoomCard({ s }: { s: RoomSession }) {
  const { rooms, openRoom } = useApp();
  const picks = rooms
    .filter((r) => r.id !== s.room.id && r.live && !r.password && !r.isPrivate && !r.vip && (r.type === "voice" || r.type === "watch"))
    .sort((a, b) => (b.server ? 0 : b.members) - (a.server ? 0 : a.members))
    .slice(0, 3);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className="relative z-10 mx-4 rounded-[26px] bg-black/55 px-4 pb-5 pt-6 text-center ring-1 ring-cream/10 backdrop-blur-md"
    >
      <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/30">
        <Lock className="h-5 w-5" aria-hidden />
      </span>
      <p className="mx-auto max-w-[300px] font-display text-[17px] font-bold leading-snug text-cream">
        The room owner and admins have left the room. Mics are unavailable for now.
      </p>
      <p className="mt-1.5 text-[12px] text-cream/60">Seats open again when the owner or an admin joins.</p>
      {picks.length ? (
        <>
          <p className="mt-5 text-[12px] font-bold uppercase tracking-wide text-cream/55">Recommended rooms</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {picks.map((r) => (
              <motion.button
                key={r.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => openRoom(r.id)}
                className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-2 hover:bg-cream/[0.04]"
                aria-label={`Join ${r.name}`}
              >
                <span className="relative h-[72px] w-[72px] overflow-hidden rounded-full ring-2 ring-gold/50">
                  <RoomCover room={r} />
                </span>
                <span className="w-full truncate text-[13px] font-bold text-cream" style={nameFace(r.settings?.nameFont)}>{r.name}</span>
                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-cream/75">
                  {r.server ? "Live" : `${formatCount(r.members)} online`}
                  <AudioLines className="h-3 w-3 text-[#5fe39a]" aria-hidden />
                </span>
              </motion.button>
            ))}
          </div>
        </>
      ) : null}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Seats                                                               */
/* ------------------------------------------------------------------ */

/** Small role badge under an avatar. */
export function RoleBadge({ role, className = "" }: { role: "owner" | "admin"; className?: string }) {
  return role === "owner" ? (
    <span className={`rounded-full bg-gold px-1.5 text-[9px] font-extrabold uppercase text-ink ${className}`}>Owner</span>
  ) : (
    <span className={`rounded-full bg-[#8f7ae0] px-1.5 text-[9px] font-extrabold uppercase text-white ${className}`}>Admin</span>
  );
}

export function Seat({ s, index, size = 56, gold = false, numbered = false }: { s: RoomSession; index: number; size?: number; gold?: boolean; numbered?: boolean }) {
  const person = usePeople();
  const id = s.seats[index];
  const isOwnerSeat = index === 0;
  const role = id === s.room.hostId ? "owner" : id && s.admins.includes(id) ? "admin" : null;
  const speaking = id ? s.speakingIds.includes(id) : false;
  const reactions = s.reactions.filter((r) => id && r.personId === id);
  const p = id ? person(id) : null;
  const closed = s.closedSeats.includes(index);
  const seatMuted = s.mutedSeats.includes(index);
  const muted = id ? (id === ME_ID ? s.muted : s.forceMuted.includes(id) || seatMuted) : false;
  const { fxFor } = useRoomFx(s);
  // Backend rooms: this person's own frame from their participants record, seen the same by everyone
  const fx = id ? fxFor(id) : {};
  const [failedFrame, setFailedFrame] = useState("");
  // A frame file that can't be played falls back to the normal avatar
  const frame = fx.frame && fx.frame.frame !== failedFrame ? fx.frame : undefined;
  // Owner's seat while the owner is out of the room: their photo stays, dimmed, with "Leave" on it
  const ownerAway = isOwnerSeat && !id && !closed && s.room.hostId !== ME_ID && !s.onlineIds.includes(s.room.hostId);
  const owner = ownerAway ? person(s.room.hostId) : null;
  const pkNow = usePkState()?.pk;
  const pkSide = pkNow ? sideOfSeat(pkNow.mode, index) : null;

  const onEmpty = () => {
    if (s.canModerate) s.setSeatMenu(index);
    else s.takeSeat(index);
  };

  // Someone landing on this seat (sitting down or moving here): a gold pulse at the seat,
  // and "Seat N" over it when it's you
  const prevId = useRef<string | null | undefined>(undefined);
  const [landed, setLanded] = useState(0);
  useEffect(() => {
    if (prevId.current !== undefined && id && prevId.current !== id) setLanded((n) => n + 1);
    prevId.current = id ?? null;
  }, [id]);

  return (
    <div className="relative flex flex-col items-center gap-1" data-seat={index}>
      <AnimatePresence>
        {landed ? (
          <motion.span
            key={`pulse-${landed}`}
            initial={{ scale: 0.75, opacity: 0.95 }}
            animate={{ scale: 1.75, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-0 z-10 rounded-full border-2 border-gold shadow-[0_0_18px_rgba(231,188,114,0.8)]"
            style={{ width: size, height: size, marginLeft: -size / 2 }}
            aria-hidden
          />
        ) : null}
        {landed && id === ME_ID ? (
          <motion.span
            key={`label-${landed}`}
            initial={{ y: 4, opacity: 0, scale: 0.8 }}
            animate={{ y: -10, opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 1.6, times: [0, 0.15, 0.75, 1] }}
            className="pointer-events-none absolute -top-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold text-ink shadow"
          >
            Seat {index}
          </motion.span>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {reactions.map((r) => (
          <EmoteBurst key={r.id} emote={r.emoji} result={r.result} />
        ))}
      </AnimatePresence>
      {p ? (
        <motion.button
          type="button"
          layoutId={`seat-person-${p.id}`}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => s.openCard(p.id)}
          aria-label={p.id === ME_ID ? "Your seat" : `${p.name}${role ? `, ${role}` : ""}${speaking ? ", speaking" : ""}`}
          className="relative"
        >
          {frame ? (
            <>
              {/* Animated seat frame (SVGA) fitted to the seat: the avatar shrinks into the frame's window */}
              <span className="relative grid place-items-center" style={{ width: size, height: size, marginBottom: frameFit(frame, size).drop }}>
                <VipFrame set={frame} size={frameFit(frame, size).avatar} onError={() => setFailedFrame(frame.frame)}>
                  <PersonAvatar person={{ ...p, frame: "none" }} size={frameFit(frame, size).avatar} speaking={speaking} muted={muted} />
                </VipFrame>
              </span>
            </>
          ) : (
            <PersonAvatar person={p} size={size} speaking={speaking} muted={muted} />
          )}
          {role ? <RoleBadge role={role} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2" /> : null}
        </motion.button>
      ) : owner ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => s.openCard(owner.id)}
          aria-label={`${owner.name}, owner, left the room`}
          className="relative"
        >
          <span className="relative block rounded-full" style={{ width: size, height: size }}>
            <span className="block opacity-45 grayscale-[0.6]">
              <PersonAvatar person={{ ...owner, frame: "none" }} size={size} />
            </span>
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 font-bold text-cream/90" style={{ fontSize: size >= 70 ? 14 : size < 50 ? 10.5 : 12 }}>
              Leave
            </span>
          </span>
        </motion.button>
      ) : (
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onEmpty}
          className={`grid place-items-center rounded-full ${closed ? "border-cream/10 bg-black/40 text-cream/30" : gold ? "border-gold/60 bg-[#241018] text-gold/70" : "border-[#7d6a4f] bg-[#232329] text-[#a6a3ad]"} hover:text-cream`}
          style={{ width: size, height: size, borderWidth: Math.max(1.5, size / 42) }}
          aria-label={closed ? `Seat ${index + 1}, closed` : isOwnerSeat ? "Owner's seat" : `Empty seat ${index + 1}${s.canModerate ? ", seat options" : ". Take this seat"}`}
        >
          {closed ? (
            <Lock style={{ width: size * 0.3, height: size * 0.3 }} />
          ) : numbered ? (
            <span className="font-display font-extrabold text-cream/70" style={{ fontSize: size * 0.36 }}>
              {index}
            </span>
          ) : (
            <Plus strokeWidth={1.6} style={{ width: size * 0.42, height: size * 0.42 }} />
          )}
        </motion.button>
      )}
      {seatMuted ? (
        <span className="pointer-events-none absolute right-0 top-0 z-[3] grid h-5 w-5 place-items-center rounded-full bg-[#e2242f] text-white ring-2 ring-[#1a1018]" title="Seat muted by the owner or an admin" aria-label="Seat muted">
          <MicOff className="h-3 w-3" aria-hidden />
        </span>
      ) : null}
      {pkSide ? (
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: size - 4, width: 0 }}>
          <PkSeatTag side={pkSide} />
        </span>
      ) : null}
      {/* Empty seats have no label (as in the reference); the space is kept so rows don't jump */}
      <span className={`relative z-[2] mt-1 truncate font-bold ${owner ? "text-cream/60" : (p && vipName(p.vip, "room")) || "text-cream"} ${p || owner ? "" : numbered ? "hidden" : "invisible"}`} style={{ ...nameFace(p?.nameFont), maxWidth: Math.max(72, size * 1.3), fontSize: size >= 70 ? 15 : size < 50 ? 11 : 12.5, marginTop: frame ? size * 0.14 : undefined }}>
        {p ? <SeatCpRing personId={p.id} /> : null}
        {p ? <SeatTagBadge personId={p.id} /> : null}
        {p ? p.name : owner ? owner.name : "Empty"}
      </span>
    </div>
  );
}

/** Reference phone width the seat layout was measured on. Everything scales from it. */
const REF_WIDTH = 393;

/** Track an element's width so the seat layout can scale with the screen. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(REF_WIDTH);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** The glowing heartbeat line between two paired seats, on a soft band joining them. */
function Heartbeat({ gap, size, live, linked }: { gap: number; size: number; live: boolean; linked: boolean }) {
  if (!linked) return <span style={{ width: gap }} className="shrink-0" />;
  return (
    <span className="relative z-0 flex shrink-0 items-center justify-center" style={{ width: gap, height: size }} aria-hidden>
      {/* Band behind the line, reaching under both seats */}
      <span className="absolute top-1/2 -translate-y-1/2 bg-gradient-to-r from-black/5 via-black/25 to-black/5" style={{ left: -size / 2, right: -size / 2, height: size * 0.75 }} />
      <svg viewBox="0 0 48 20" className={`relative ${live ? "text-pink" : "text-cream/80"}`} style={{ width: gap, height: gap * 0.42, filter: `drop-shadow(0 0 ${live ? 4 : 3}px ${live ? "rgb(255 104 124 / 0.9)" : "rgb(255 255 255 / 0.55)"})` }}>
        <motion.path
          d="M0 10 H13 L16 6 L19.5 17 L23.5 2 L27 15 L30 9 L33 12 H48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={live ? { pathLength: [0.15, 1, 1], opacity: [0.7, 1, 0.7] } : { pathLength: 1, opacity: 1 }}
          transition={live ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
        />
      </svg>
    </span>
  );
}

export function Pair({ s, a, b, size, gap, gold, linked, numbered = false }: { s: RoomSession; a: number; b?: number; size: number; gap: number; gold: boolean; linked: boolean; numbered?: boolean }) {
  const { tagBetween } = useApp();
  const x = s.seats[a];
  const y = b !== undefined ? s.seats[b] : null;
  // Tagged people sitting beside each other show their tag instead of the heartbeat
  const tag = x && y ? tagBetween(x, y) : null;
  return (
    <div className="flex items-start justify-center">
      <div className="relative z-10">
        <Seat s={s} index={a} size={size} gold={gold} numbered={numbered} />
      </div>
      {b !== undefined ? (
        <>
          {tag ? <TagLink tag={tag} gap={gap} size={size} /> : <Heartbeat gap={gap} size={size} live={Boolean(x && y)} linked={linked} />}
          <div className="relative z-10">
            <Seat s={s} index={b} size={size} gold={gold} numbered={numbered} />
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Seat layout from the reference, at the same proportions (measured on a 393pt-wide phone):
 * the owner's fixed seat and the partner seat on top (85pt seats, 47pt heartbeat link),
 * then rows of linked pairs (62pt seats, 32pt link, 32pt between pairs, 24pt side margins).
 * `scale` shrinks the whole layout for denser modes such as YouTube.
 */
export function SeatLayout({ s, gold = false, scale = 1, grid = false }: { s: RoomSession; gold?: boolean; scale?: number; grid?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const k = (Math.min(width, 430) / REF_WIDTH) * scale;
  const big = Math.round(85 * k);
  const small = Math.round(62 * k);
  const bigGap = Math.round(47 * k);
  const smallGap = Math.round(32 * k);
  const rest = s.seats.map((_, i) => i).slice(2);
  const pairs: [number, number | undefined][] = [];
  for (let i = 0; i < rest.length; i += 2) pairs.push([rest[i], rest[i + 1]]);
  const partner = s.settings.partnerSeat;
  const team = usePkState()?.pk?.mode === "team";
  if (grid) return <SeatGrid s={s} gold={gold} width={width} gridRef={ref} />;
  return (
    <div ref={ref} className="w-full">
      <Pair s={s} a={0} b={s.seats.length > 1 ? 1 : undefined} size={big} gap={bigGap} gold={gold} linked={partner !== "off"} />
      <div className="relative flex flex-wrap justify-center" style={{ columnGap: Math.round(32 * k), rowGap: Math.round(14 * k), marginTop: Math.round(14 * k) }}>
        {/* Multiplayer PK: the left pairs are red, the right pairs blue */}
        {team ? (
          <>
            <span className="pointer-events-none absolute inset-y-[-6px] left-2 right-1/2 rounded-l-2xl" style={{ background: SIDE.red.soft, boxShadow: `inset 0 0 0 1px ${SIDE.red.solid}55` }} aria-hidden />
            <span className="pointer-events-none absolute inset-y-[-6px] left-1/2 right-2 rounded-r-2xl" style={{ background: SIDE.blue.soft, boxShadow: `inset 0 0 0 1px ${SIDE.blue.solid}55` }} aria-hidden />
          </>
        ) : null}
        {pairs.map(([a, b]) => (
          <Pair key={a} s={s} a={a} b={b} size={small} gap={smallGap} gold={gold} linked={partner === "all"} />
        ))}
      </div>
    </div>
  );
}

/**
 * YouTube room seats: every seat (the owner's included) in linked pairs, three pairs to a row,
 * sized so a row fills the screen width with even side margins.
 */
function SeatGrid({ s, gold, width, gridRef }: { s: RoomSession; gold: boolean; width: number; gridRef: React.RefObject<HTMLDivElement | null> }) {
  // Row = 6 seats + 3 links (0.26 seat each) + 2 gaps between pairs (0.3 seat each), 12px margins
  const unit = (Math.min(width, 430) - 24) / (6 + 3 * 0.26 + 2 * 0.3);
  const size = Math.floor(unit);
  const gap = Math.round(unit * 0.26);
  const pairs: [number, number | undefined][] = [];
  for (let i = 0; i < s.seats.length; i += 2) pairs.push([i, i + 1 < s.seats.length ? i + 1 : undefined]);
  const partner = s.settings.partnerSeat;
  return (
    <div ref={gridRef} className="flex w-full flex-wrap justify-center px-3" style={{ columnGap: Math.round(unit * 0.3), rowGap: Math.round(unit * 0.22) }}>
      {pairs.map(([a, b]) => (
        <Pair key={a} s={s} a={a} b={b} size={size} gap={gap} gold={gold} linked={a === 0 ? partner !== "off" : partner === "all"} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export function RoomChat({ s, className = "" }: { s: RoomSession; className?: string }) {
  const { fxFor } = useRoomFx(s);
  useMentionAlerts(s);
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [s.messages.length]);
  return (
    <div
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      }}
      className={`app-scroll space-y-1.5 px-3 ${className}`}
      aria-live="polite"
      aria-label="Room chat"
    >
      <Announcement s={s} />
      {s.messages.map((m) => (
        <ChatLine key={m.id} m={m} fxFor={fxFor} />
      ))}
    </div>
  );
}

function Announcement({ s }: { s: RoomSession }) {
  const { announcementOf } = useApp();
  const text = announcementOf(s.room);
  if (!text) return null;
  return (
    <button type="button" onClick={() => s.setPanel("info")} className="block w-full rounded-2xl bg-black/35 px-3 py-2 text-left">
      <span className="flex items-center gap-1 text-[12px] font-bold text-gold">
        <Volume2 className="h-3.5 w-3.5" aria-hidden /> Announcement:
      </span>
      <span className="mt-0.5 block text-[13px] text-cream">{text}</span>
    </button>
  );
}

function ChatLine({ m, fxFor }: { m: RoomMessage; fxFor: ReturnType<typeof useRoomFx>["fxFor"] }) {
  const person = usePeople();
  const myName = useApp().profile.name;
  // A bubble file that can't be played falls back to the plain bubble
  const [failedBubble, setFailedBubble] = useState("");
  const base = "w-fit max-w-[92%] rounded-2xl px-3 py-1.5 text-[12.5px] leading-snug";
  const body = (() => {
    switch (m.kind) {
      case "system":
        return (
          <p className={`${base} bg-black/35 text-cream/90`}>
            <Bell className="mr-1 inline h-3 w-3 fill-[#ffc94a] align-[-1px] text-[#ffc94a]" aria-hidden />
            <span className="font-bold text-[#ffc94a]">System: </span>
            {m.text}
          </p>
        );
      case "join":
        return (
          <p className={`${base} bg-black/25 text-cream/70`}>
            <span className="font-semibold text-speak">{m.authorId === ME_ID ? "You" : person(m.authorId).name}</span> joined the room
          </p>
        );
      case "video":
        return (
          <p className={`${base} bg-[#ff0033]/15 text-cream`}>
            <span className="font-semibold text-[#ff6b81]">{m.authorId === ME_ID ? "You" : person(m.authorId).name}</span> added a video: <span className="font-semibold">{m.title}</span>
          </p>
        );
      case "gift": {
        const g = giftById(m.giftId);
        const from = person(m.fromId);
        const earned = m.earned ?? giftEarnings(g.cost * m.count);
        // Gift card: who sent what, then what the receiver got back
        return (
          <div className="w-[min(92%,280px)] overflow-hidden rounded-2xl bg-gradient-to-br from-gold/20 via-black/40 to-black/40 text-cream ring-1 ring-gold/25">
            <div className="flex items-center gap-2.5 px-3 pb-2 pt-2.5">
              <span className="min-w-0 flex-1 text-[12.5px] leading-snug">
                <span className={`font-bold ${vipName(from.vip, "room") || "text-gold"}`} style={nameFace(from.nameFont)}>{m.fromId === ME_ID ? "You" : from.name}</span> sent{" "}
                <span className="font-bold text-gold">{m.toId === ME_ID ? (m.fromId === ME_ID ? "yourself" : "you") : person(m.toId).name}</span> {g.name} <span className="font-display font-extrabold italic text-gold">×{m.count}</span>
                {g.blurb ? <span className="mt-0.5 block text-[11.5px] text-cream/65">{g.blurb}</span> : null}
              </span>
              <GiftArt id={m.giftId} className="h-11 w-11 shrink-0" />
            </div>
            <div className="flex items-center gap-3 border-t border-white/10 px-3 py-1.5 text-[11.5px]">
              <span className="text-cream/60">Receiver&apos;s</span>
              <span className="flex items-center gap-1 font-bold text-gold">
                <Coin className="h-3.5 w-3.5" /> Coins +{earned.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        );
      }
      case "text": {
        const p = person(m.authorId);
        const fx = fxFor(m.authorId, p.vip);
        if (m.imageUrl)
          return (
            <div className="flex items-start gap-2">
              <PersonAvatar person={p} size={24} className="mt-0.5" />
              <div className="min-w-0">
                <span className={`block text-[11px] font-bold ${m.authorId === ME_ID ? "text-pink" : "text-cream/60"}`} style={nameFace(p.nameFont)}>
                  <span className={vipName(p.vip, "room")}>{m.authorId === ME_ID ? "You" : p.name}</span>
                  {fx.badge ? <VipBadge set={fx.badge} level={p.vip} size={16} className="ml-1" /> : null}
                </span>
                <ChatPhoto src={m.imageUrl} />
              </div>
            </div>
          );
        const bubble = fx.bubble && fx.bubble.bubble !== failedBubble ? fx.bubble : undefined;
        if (bubble)
          return (
            <div className="flex items-start gap-2">
              <PersonAvatar person={p} size={24} className="mt-0.5" />
              <div className="min-w-0">
                <span className={`block text-[11px] font-bold ${m.authorId === ME_ID ? "text-pink" : "text-cream/60"}`} style={nameFace(p.nameFont)}>
                  <span className={vipName(p.vip, "room")}>{m.authorId === ME_ID ? "You" : p.name}</span>
                  {fx.badge ? <VipBadge set={fx.badge} level={p.vip} size={16} className="ml-1" /> : null}
                  <ParivarTag personId={p.id} className="ml-1 !px-1 !text-[9px]" />
                </span>
                {/* Animated chat bubble (SVGA): the text box is normal bubble size and the art's
                    inner box (x 9–90%, y 19–81% of the file) is stretched over it */}
                <p className="relative mx-2 my-2.5 flex min-h-[34px] w-fit min-w-[96px] max-w-[230px] items-center px-3 py-1.5 text-[12.5px] font-semibold leading-snug text-white [text-shadow:0_1px_2px_rgb(120_10_30/0.7)]">
                  <VipBubbleArt set={bubble} onError={() => setFailedBubble(bubble.bubble)} />
                  <span className="relative break-words">
                    <MentionText text={m.text} />
                  </span>
                </p>
              </div>
            </div>
          );
        return (
          <div className="flex items-start gap-2">
            <PersonAvatar person={p} size={24} className="mt-0.5" />
            <p className={`${base} ${fx.bubbleClass ?? "bg-black/30 text-cream"}`}>
              <span className={`mr-1.5 text-[11px] font-bold ${fx.bubbleClass ? "text-white/85" : m.authorId === ME_ID ? "text-pink" : "text-cream/60"}`} style={nameFace(p.nameFont)}>
                <span className={vipName(p.vip, "room")}>{m.authorId === ME_ID ? "You" : p.name}</span>
                {fx.badge ? <VipBadge set={fx.badge} level={p.vip} size={16} className="ml-1" /> : null}
                  <ParivarTag personId={p.id} className="ml-1 !px-1 !text-[9px]" />
              </span>
              <MentionText text={m.text} />
            </p>
          </div>
        );
      }
    }
  })();
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={m.kind === "text" && m.authorId !== ME_ID && mentions(m.text, myName) ? "rounded-2xl bg-gold/[0.08] ring-1 ring-gold/40" : undefined}>
      {body}
    </motion.div>
  );
}

/** A photo in the room chat: a rounded thumbnail that opens full screen. */
function ChatPhoto({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button type="button" onClick={() => !failed && setOpen(true)} className="relative mt-1 block overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10" style={{ width: 150, height: loaded ? undefined : 150 }} aria-label="Open photo">
        {failed ? (
          <span className="grid h-[150px] w-[150px] place-items-center text-[11px] text-cream/60">Photo unavailable</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Photo in chat" loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={`block max-h-[220px] w-[150px] object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`} />
        )}
        {!loaded && !failed ? <span className="absolute inset-0 animate-pulse bg-white/[0.06]" aria-hidden /> : null}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-[95] grid place-items-center bg-black/90 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} role="dialog" aria-label="Photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img src={src} alt="Photo in chat" className="max-h-full max-w-full rounded-xl object-contain" initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }} />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute right-4 top-[calc(env(safe-area-inset-top)+14px)] grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Opens the photo picker and sends the chosen photo to the room chat. Shows upload progress. */
export function PhotoButton({ s }: { s: RoomSession }) {
  const ref = useRef<HTMLInputElement>(null);
  const p = s.photoProgress;
  // The owner can turn photos off ("No Images"); the owner can still send them
  if (!s.room.server || (s.settings.noImages && !s.isOwner)) return null;
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void s.sendPhoto(f);
        }}
      />
      <button type="button" disabled={p !== null || s.chatBlocked} onClick={() => ref.current?.click()} aria-label="Send a photo" className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-cream/75 hover:text-cream disabled:opacity-50">
        {p !== null ? (
          <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90" aria-label={`Sending photo, ${Math.round(p * 100)}%`}>
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#f5b54a" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.max(4, p * 94.2)} 94.2`} />
          </svg>
        ) : (
          <ImagePlus className="h-4.5 w-4.5" />
        )}
      </button>
    </>
  );
}

/** Text input used in the room control bars. */
export function ChatInput({ s, value, setValue, compact = false }: { s: RoomSession; value: string; setValue: (v: string) => void; compact?: boolean }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Cleared only when the line went out (a backend room may be offline)
        if (s.send(value) !== false) setValue("");
      }}
      className={`relative flex h-10 min-w-0 flex-1 items-center rounded-full bg-cream/[0.08] pl-3.5 pr-1 ring-1 ring-line focus-within:ring-gold/40 ${compact ? "" : ""}`}
    >
      <MentionPicker s={s} value={value} onPick={setValue} />
      <input value={value} onChange={(e) => setValue(e.target.value)} disabled={s.chatBlocked} placeholder={s.chatBlocked ? "Text chat is off in this room" : "Say something… (@ to mention)"} aria-label="Message the room" className="min-w-0 flex-1 bg-transparent text-[13px] text-cream placeholder:text-muted/70 focus:outline-none" maxLength={200} />
      {value.trim() ? (
        <button type="submit" aria-label="Send message" className="grid h-8 w-8 place-items-center rounded-full bg-coral text-white">
          <Send className="h-3.5 w-3.5" />
        </button>
      ) : (
        <PhotoButton s={s} />
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Sheets                                                              */
/* ------------------------------------------------------------------ */

export function EmojiSheet({ open, onClose, s, onInsert }: { open: boolean; onClose: () => void; s: RoomSession; onInsert: (e: string) => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Emoji">
      <div className="px-5 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Quick reactions</p>
        <div className="mt-2 flex justify-between">
          {REACTIONS.map((e) => (
            <motion.button
              key={e}
              type="button"
              whileTap={{ scale: 0.8 }}
              onClick={() => {
                if (!s.seated) s.addSystem(`You reacted ${e}`);
                s.react(e);
                onClose();
              }}
              className="grid h-12 w-12 place-items-center rounded-2xl bg-cream/[0.06] text-[26px] hover:bg-cream/10"
              aria-label={`React ${e}`}
            >
              {e}
            </motion.button>
          ))}
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Emotes</p>
        <div className="mt-2 grid grid-cols-8 gap-1.5">
          {ANIMATED_EMOTES.map((e) => (
            <motion.button
              key={e}
              type="button"
              whileTap={{ scale: 0.75, rotate: -10 }}
              onClick={() => {
                s.react(e);
                onClose();
              }}
              className="grid aspect-square place-items-center rounded-xl bg-cream/[0.06] text-[22px]"
              aria-label={`Emote ${e}`}
            >
              {e}
            </motion.button>
          ))}
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Games</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {GAME_EMOTES.map((g) => (
            <motion.button
              key={g.id}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                if (!s.room.server) {
                  s.addSystem("Game emotes work in live rooms");
                  return;
                }
                s.react(g.id);
                onClose();
              }}
              className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-[#3a2f6e] to-[#1f1a3d] py-2.5 ring-1 ring-[#8f74ff]/30"
            >
              <span className="text-[24px]">{g.icon}</span>
              <span className="text-[10.5px] font-bold text-cream/80">{g.label}</span>
            </motion.button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted">{s.seated ? "Emotes play above your seat for everyone." : "Take a seat to show emotes above your avatar."}</p>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Add to message</p>
        <EmojiPicker className="mt-2" onPick={onInsert} />
      </div>
    </BottomSheet>
  );
}

/** Invite people: in live rooms into your chats and to your friends (with Join); otherwise the demo list. */
export function InviteSheet({ open, onClose, roomName, roomId, roomCode }: { open: boolean; onClose: () => void; roomName: string; roomId?: string; roomCode?: string }) {
  if (roomId) return <ChatInviteSheet open={open} onClose={onClose} kind="ROOM" roomId={roomId} code={roomCode} title={`Invite to ${roomName}`} />;
  return <DemoInviteSheet open={open} onClose={onClose} roomName={roomName} />;
}

function DemoInviteSheet({ open, onClose, roomName }: { open: boolean; onClose: () => void; roomName: string }) {
  const { profile, toast } = useApp();
  const [sent, setSent] = useState<string[]>([]);
  const friends = PEOPLE.filter((p) => profile.following.includes(p.id) || p.online).slice(0, 8);
  const share = async () => {
    const text = `Join me in "${roomName}" on Panchayat`;
    try {
      if (navigator.share) await navigator.share({ title: "Panchayat", text, url: window.location.origin });
      else {
        await navigator.clipboard.writeText(`${text}: ${window.location.origin}`);
        toast("Invite link copied");
      }
    } catch {
      /* user cancelled share */
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Invite friends">
      <div className="px-5 pb-5">
        <button type="button" onClick={share} className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-cream/[0.06] p-3 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-coral/20 text-pink">
            <Share2 className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-cream">Share invite link</span>
            <span className="text-[11px] text-muted">Opens Panchayat. Rooms are local to each device in this preview.</span>
          </span>
        </button>
        <ul>
          {friends.map((p) => {
            const done = sent.includes(p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <PersonAvatar person={p} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-cream">{p.name}</span>
                  <span className="text-[11px] text-muted">{p.online ? "Online" : "Offline"}</span>
                </span>
                <button
                  type="button"
                  disabled={done}
                  onClick={() => {
                    setSent((x) => [...x, p.id]);
                    toast(`Demo invite shown for ${p.name}`);
                  }}
                  className={`h-8 rounded-full px-4 text-xs font-bold ${done ? "bg-cream/10 text-muted" : "bg-coral text-white"}`}
                >
                  {done ? "Invited" : "Invite"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </BottomSheet>
  );
}

const MODES: { id: RoomMode; icon: ReactNode; hint: string }[] = [
  { id: "voice", icon: <AudioLines className="h-5 w-5" />, hint: "Voice seats" },
  { id: "youtube", icon: <MonitorPlay className="h-5 w-5" />, hint: "Watch together" },
  { id: "kharidari", icon: <Gavel className="h-5 w-5" />, hint: "Auction" },
];

export function RoomMenuSheet({ open, onClose, s, extra, onInvite }: { open: boolean; onClose: () => void; s: RoomSession; extra?: ReactNode; onInvite?: () => void }) {
  const { toast, leaveRoom, push } = useApp();
  const music = useMusic();
  const live = useServerRooms();
  // Only the owner of a backend room can close it
  const canClose = Boolean(s.room.server?.mine);
  const [confirmClose, setConfirmClose] = useState(false);
  useEffect(() => {
    if (!open) setConfirmClose(false);
  }, [open]);
  const Item = ({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) => (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 hover:bg-cream/[0.04]">
      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${danger ? "bg-[#3a1418] text-[#ff8a8f]" : "bg-cream/[0.07] text-cream"}`}>{icon}</span>
      <span className={`text-[11.5px] ${danger ? "text-[#ff8a8f]" : "text-cream/80"}`}>{label}</span>
    </button>
  );
  return (
    <BottomSheet open={open} onClose={onClose} title="Room">
      <div className="px-5 pb-5">
        <div className="rounded-2xl bg-cream/[0.05] p-3">
          <p className="text-sm font-semibold text-cream">{s.room.name}</p>
          <p className="mt-0.5 text-[12px] text-muted">{s.room.topic}</p>
          <p className="mt-2 text-[11px] text-muted">
            ID {s.room.code} · {s.room.category} · {s.room.isPrivate ? "Private" : "Public"} · {s.room.seats} seats
          </p>
        </div>
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Mode</p>
          {s.canModerate ? (
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Room mode">
              {MODES.map((m) => {
                const on = s.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      s.setMode(m.id);
                      onClose();
                    }}
                    className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 ring-1 ${on ? "bg-coral/15 text-coral ring-coral" : "bg-cream/[0.05] text-cream ring-line"}`}
                  >
                    {m.icon}
                    <span className="text-[12.5px] font-bold text-cream">{MODE_LABEL[m.id]}</span>
                    <span className="text-[10.5px] text-muted">{m.hint}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-1.5 text-[12.5px] text-cream/80">
              {MODE_LABEL[s.mode]} <span className="text-muted">· the owner and admins set the mode</span>
            </p>
          )}
        </div>
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Mic order</p>
          {s.canModerate ? (
            <button
              type="button"
              role="switch"
              aria-checked={s.micOrder}
              onClick={() => s.setMicOrder(!s.micOrder)}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-cream/[0.05] px-3.5 py-3 text-left ring-1 ring-line"
            >
              <ListOrdered className="h-5 w-5 shrink-0 text-cream/80" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-bold text-cream">Ask before taking a seat</span>
                <span className="block text-[11px] text-muted">People request a seat; the owner or an admin approves.</span>
              </span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${s.micOrder ? "bg-speak" : "bg-cream/15"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${s.micOrder ? "left-[22px]" : "left-0.5"}`} />
              </span>
            </button>
          ) : (
            <p className="mt-1.5 text-[12.5px] text-cream/80">
              {s.micOrder ? "On: ask the owner or an admin for a seat" : "Off: take any empty seat"} <span className="text-muted">· the owner and admins set this</span>
            </p>
          )}
        </div>
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Music</p>
          <button
            type="button"
            role="switch"
            aria-checked={!music.musicOff}
            onClick={() => music.setMusicOff(!music.musicOff)}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-cream/[0.05] px-3.5 py-3 text-left ring-1 ring-line"
          >
            <Music2 className="h-5 w-5 shrink-0 text-cream/80" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-bold text-cream">Room music</span>
              <span className="block text-[11px] text-muted">{music.musicOff ? "Off: the music is hidden and silent for you." : "On: hear the room's songs. Turn off to hide the music."}</span>
            </span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${music.musicOff ? "bg-cream/15" : "bg-speak"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${music.musicOff ? "left-0.5" : "left-[22px]"}`} />
            </span>
          </button>
        </div>
        <RoomLevelCard room={s.room} className="mt-4" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {extra}
          {s.room.server ? (
            <Item
              icon={<span className="text-[19px] leading-none">🎲</span>}
              label="Ludo"
              onClick={() => {
                onClose();
                push({ kind: "ludo", roomId: s.room.server!.id });
              }}
            />
          ) : null}
          {s.room.server ? (
            <Item
              icon={<span className="text-[19px] leading-none">🃏</span>}
              label="Jackaroo"
              onClick={() => {
                onClose();
                push({ kind: "jackaroo", roomId: s.room.server!.id });
              }}
            />
          ) : null}
          {onInvite ? <Item icon={<UserPlus className="h-5 w-5" />} label="Invite" onClick={onInvite} /> : null}
          {!s.isOwner ? (
            <Item
              icon={<Hand className="h-5 w-5" />}
              label={s.handRaised ? "Lower hand" : "Raise hand"}
              onClick={() => {
                s.toggleHand();
                onClose();
              }}
            />
          ) : null}
          {s.seated && !s.isOwner ? (
            <Item
              icon={<ChevronDown className="h-5 w-5" />}
              label="Leave mic"
              onClick={() => {
                s.leaveSeat();
                onClose();
              }}
            />
          ) : null}
          <Item
            icon={<Megaphone className="h-5 w-5" />}
            label="Report"
            onClick={() => {
              toast("Thanks. Reporting is a demo in this preview");
              onClose();
            }}
          />
          <Item
            icon={<LogOut className="h-5 w-5" />}
            label="Leave room"
            danger
            onClick={() => {
              onClose();
              leaveRoom();
            }}
          />
          {canClose ? <Item icon={<Power className="h-5 w-5" />} label="Close room" danger onClick={() => setConfirmClose(true)} /> : null}
        </div>
        {canClose && confirmClose ? (
          <div className="mt-3 rounded-2xl bg-[#3a1418]/70 p-3.5 ring-1 ring-[#ff8a8f]/30" role="alertdialog" aria-label="Close this room?">
            <p className="text-sm font-bold text-cream">Close this room for everyone?</p>
            <p className="mt-1 text-[12px] leading-snug text-cream/70">
              It will stop showing in the room list and nobody can join it again. People already in the voice call may stay connected until the server ends the call.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirmClose(false)} disabled={live.closing} className="h-10 flex-1 rounded-full bg-cream/10 text-[13px] font-bold text-cream disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                disabled={live.closing}
                onClick={async () => {
                  if (await live.closeActive()) onClose();
                }}
                className="h-10 flex-1 rounded-full bg-[#e5484d] text-[13px] font-bold text-white disabled:opacity-60"
              >
                {live.closing ? "Closing…" : "Close room"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </BottomSheet>
  );
}

/** Gold gift button used in every room. */
export function GiftButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      aria-label="Send a gift"
      title="Gifts"
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f6d899] to-[#c9954a] text-[#3a1a0c] shadow-[0_6px_18px_-6px_rgb(231_188_114/0.8)]"
    >
      <Gift className="h-5 w-5" />
    </motion.button>
  );
}

export function EmojiButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton label="Emoji and reactions" onClick={onClick}>
      <Smile className="h-5 w-5" />
    </IconButton>
  );
}

/**
 * Mic order queue. With mic order on, a "Waiting" pill under the seats opens
 * the queue (MicQueueSheet): everyone can see who's waiting and in what order,
 * join or leave it, and the owner and admins approve or decline from it.
 */
export function MicOrderBar({ s }: { s: RoomSession }) {
  const mine = s.micRequests.some((r) => r.id === ME_ID);
  const myPlace = s.micRequests.findIndex((r) => r.id === ME_ID) + 1;
  if (!s.micOrder && !mine) return null;
  const count = s.micRequests.length;
  return (
    <div className="mt-2 flex justify-center">
      <button
        type="button"
        onClick={() => s.setQueueOpen(true)}
        className="flex h-8 items-center gap-1.5 rounded-full bg-black/45 px-3.5 text-[12px] font-bold text-cream ring-1 ring-white/15 backdrop-blur"
        aria-label={`Mic queue, ${count} waiting`}
      >
        <ListOrdered className="h-4 w-4" aria-hidden />
        {mine ? `You're No.${myPlace} in the queue` : "Waiting"}
        <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] ${count ? "bg-coral text-white" : "bg-cream/15 text-cream/70"}`}>{count}</span>
      </button>
    </div>
  );
}

/** The "Waiting" sheet: the mic queue. Rendered at room level so it covers the whole room. */
export function MicQueueSheet({ s }: { s: RoomSession }) {
  const person = usePeople();
  const { profile } = useApp();
  const mine = s.micRequests.some((r) => r.id === ME_ID);
  const count = s.micRequests.length;
  return (
    <BottomSheet open={s.queueOpen} onClose={() => s.setQueueOpen(false)} title="Waiting" tall>
      <div className="flex min-h-[46vh] flex-col px-5 pb-5">
        {count === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <span className="relative">
              <Armchair className="h-16 w-16 text-gold/35" strokeWidth={1.6} aria-hidden />
              <span className="absolute -right-1 -top-2 h-3 w-0.5 rotate-[30deg] rounded-full bg-gold/35" aria-hidden />
              <span className="absolute -right-3.5 top-0 h-0.5 w-3 -rotate-[25deg] rounded-full bg-gold/35" aria-hidden />
            </span>
            <p className="mt-3 text-[15px] font-bold text-muted">None queuing</p>
          </div>
        ) : (
          <ul className="flex-1">
            {s.micRequests.map((r, i) => {
              const me = r.id === ME_ID;
              const p = person(r.id);
              return (
                <li key={r.id} className={`flex items-center gap-3 border-b border-line py-2.5 ${me ? "-mx-2 rounded-xl bg-gold/10 px-2 ring-1 ring-gold/40" : ""}`}>
                  <span className={`w-6 text-center font-display text-[15px] font-extrabold ${i < 3 ? "text-foil" : "text-muted"}`}>{i + 1}</span>
                  <PersonAvatar person={me ? { id: ME_ID, look: profile.look, photo: profile.photo, frame: "none" } : { ...p, frame: "none" }} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-bold text-cream">{me ? `${profile.name} (you)` : p.name}</span>
                    <span className="block text-[11.5px] text-muted">{r.seat > 0 ? `Asked for seat No.${r.seat + 1}` : "Any seat"}</span>
                  </span>
                  {s.canModerate && !me ? (
                    <>
                      <button type="button" onClick={() => s.declineMicRequest(r.id)} className="h-8 rounded-full bg-cream/10 px-3 text-[12px] font-bold text-cream">
                        Decline
                      </button>
                      <button type="button" onClick={() => s.approveMicRequest(r.id)} className="h-8 rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] px-3 text-[12px] font-bold text-[#2a1a0c]">
                        Approve
                      </button>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {!s.canModerate && !s.seated ? (
          <button
            type="button"
            onClick={() => (mine ? s.cancelMicRequest() : s.requestSeat(-1))}
            className={`mt-4 h-12 w-full rounded-full text-[15px] font-bold ${mine ? "bg-cream/10 text-cream ring-1 ring-line" : "bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] text-[#2a1a0c]"}`}
          >
            {mine ? "Leave the queue" : "Join the queue"}
          </button>
        ) : null}
        {s.canModerate ? <p className="mt-3 text-center text-[11.5px] text-muted">Approve puts them on the seat they asked for, or the next free one.</p> : null}
      </div>
    </BottomSheet>
  );
}
