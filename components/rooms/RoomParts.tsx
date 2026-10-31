"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Armchair, AudioLines, Bell, Check, ChevronDown, Copy, Gavel, Gift, Hand, Heart, ListOrdered, Lock, LogOut, Megaphone, MicOff, MonitorPlay, MoreHorizontal, Plus, Power, Send, Share2, Smile, UserPlus, UsersRound, Volume2, X } from "lucide-react";
import { GiftArt } from "@/components/art/GiftArt";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { VipBadge, VipBubbleArt, VipFrame, frameFit } from "@/components/effects/VipFx";
import { useMarket } from "@/lib/app/market-store";
import { PkSeatTag, SIDE } from "./PkParts";
import { sideOfSeat, usePkState } from "./usePk";
import { vipName } from "@/lib/app/levels";
import { Coin, IconButton, Pill, formatCount } from "@/components/ui/kit";
import { charmFromCoins, giftEarnings } from "@/lib/app/progress";
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

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

export function RoomTopBar({ s, onMenu, onLeave }: { s: RoomSession; onMenu: () => void; onLeave: () => void }) {
  const { minimizeRoom, toast, roomLevelOf, isJoined, isFollowingRoom, toggleJoinRoom, toggleFollowRoom } = useApp();
  const person = usePeople();
  const host = person(s.room.hostId);
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
      <div className="flex h-14 items-center gap-2 px-2.5">
        <IconButton label="Minimise room" onClick={minimizeRoom} className="!bg-black/30 backdrop-blur">
          <ChevronDown className="h-5 w-5" />
        </IconButton>
        <button type="button" onClick={() => s.setPanel("info")} aria-label={`${s.room.name}, room info`} className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-black/30 py-1 pl-1 pr-3 text-left backdrop-blur">
          <PersonAvatar person={host} size={30} />
          <span className="min-w-0">
            <span className={`block truncate text-[13.5px] font-bold leading-tight ${s.room.vip ? "gold-shine" : "text-cream"}`} style={nameFace(s.settings.nameFont)}>{s.room.name}</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[10.5px] text-cream/60">
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
              {/* Backend rooms: the backend's participant count (GET /participants/count); hidden until it loads */}
              {s.room.server && s.participants?.count == null ? null : (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-0.5" title={s.room.server ? "People in this room" : undefined}>
                    <UsersRound className="h-2.5 w-2.5" aria-hidden />
                    {s.room.server ? s.participants?.count : formatCount(s.room.members + (joined ? 1 : 0))}
                  </span>
                </>
              )}
            </span>
          </span>
        </button>
        {s.isOwner ? null : !joined ? (
          <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => toggleJoinRoom(s.room)} className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#ffb347] to-[#ff8a3d] px-3 text-[12px] font-extrabold text-[#2a1205]">
            <UserPlus className="h-3.5 w-3.5" aria-hidden /> Join
          </motion.button>
        ) : (
          <IconButton label={following ? "Unfollow room" : "Follow room"} onClick={() => toggleFollowRoom(s.room)} active={following} className={following ? "" : "!bg-black/30 backdrop-blur"}>
            <Heart className={`h-[18px] w-[18px] ${following ? "fill-current" : ""}`} />
          </IconButton>
        )}
        <IconButton label="Room menu" onClick={onMenu} className="!bg-black/30 backdrop-blur">
          <MoreHorizontal className="h-5 w-5" />
        </IconButton>
        <IconButton label="Leave room" onClick={onLeave} className="!bg-[#3a1418]/80 !text-[#ff8a8f]">
          <LogOut className="h-[18px] w-[18px]" />
        </IconButton>
      </div>
    </header>
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
  const { effectsFor } = useMarket();
  const frame = id ? effectsFor(id).frame : undefined;
  const pkNow = usePkState()?.pk;
  const pkSide = pkNow ? sideOfSeat(pkNow.mode, index) : null;

  const onEmpty = () => {
    if (s.canModerate) s.setSeatMenu(index);
    else s.takeSeat(index);
  };

  return (
    <div className="relative flex flex-col items-center gap-1" data-seat={index}>
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.span
            key={r.id}
            className="pointer-events-none absolute -top-2 z-10 text-[28px]"
            initial={{ y: 10, opacity: 0, scale: 0.5 }}
            animate={{ y: -34, opacity: 1, scale: 1.15 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.6 }}
            aria-hidden
          >
            {r.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
      {p ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => s.openCard(p.id)}
          aria-label={p.id === ME_ID ? "Your seat" : `${p.name}${role ? `, ${role}` : ""}${speaking ? ", speaking" : ""}`}
          className="relative"
        >
          {frame ? (
            <>
              {/* Animated seat frame (SVGA) fitted to the seat: the avatar shrinks into the frame's window */}
              <span className="relative grid place-items-center" style={{ width: size, height: size, marginBottom: frameFit(frame, size).drop }}>
                <VipFrame set={frame} size={frameFit(frame, size).avatar}>
                  <PersonAvatar person={{ ...p, frame: "none" }} size={frameFit(frame, size).avatar} speaking={speaking} muted={muted} />
                </VipFrame>
              </span>
            </>
          ) : (
            <PersonAvatar person={p} size={size} speaking={speaking} muted={muted} />
          )}
          {role ? <RoleBadge role={role} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2" /> : null}
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
      <span className={`relative z-[2] mt-1 truncate font-bold ${(p && vipName(p.vip, "room")) || "text-cream"} ${p ? "" : numbered ? "hidden" : "invisible"}`} style={{ ...nameFace(p?.nameFont), maxWidth: Math.max(72, size * 1.3), fontSize: size >= 70 ? 15 : size < 50 ? 11 : 12.5, marginTop: frame ? size * 0.14 : undefined }}>
        {p ? (p.id === ME_ID ? "You" : p.name) : "Empty"}
      </span>
      {id && s.giftCounts[id] ? (
        <span className="-mt-0.5 rounded-full bg-gold/15 px-1.5 text-[9.5px] font-bold text-gold">♥ {formatCount(s.giftCounts[id])}</span>
      ) : null}
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
  // Tag Lv 5 perk: a matching glow around both seats
  const glow = tag && tagLevel(tag.intimacy).level >= 5 ? { filter: `drop-shadow(0 0 ${Math.round(size / 9)}px ${relationshipById(tag.relation).tint})` } : undefined;
  return (
    <div className="flex items-start justify-center">
      <div className="relative z-10" style={glow}>
        <Seat s={s} index={a} size={size} gold={gold} numbered={numbered} />
      </div>
      {b !== undefined ? (
        <>
          {tag ? <TagLink tag={tag} gap={gap} size={size} /> : <Heartbeat gap={gap} size={size} live={Boolean(x && y)} linked={linked} />}
          <div className="relative z-10" style={glow}>
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
export function SeatLayout({ s, gold = false, scale = 1 }: { s: RoomSession; gold?: boolean; scale?: number }) {
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

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export function RoomChat({ s, className = "" }: { s: RoomSession; className?: string }) {
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
        <ChatLine key={m.id} m={m} />
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

function ChatLine({ m }: { m: RoomMessage }) {
  const person = usePeople();
  const { effectsFor } = useMarket();
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
        const charm = m.charm ?? Math.floor(charmFromCoins(g.cost * m.count));
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
              <span className="font-bold text-pink">Charm +{charm.toLocaleString("en-IN")}</span>
              <span className="flex items-center gap-1 font-bold text-gold">
                <Coin className="h-3.5 w-3.5" /> Coins +{earned.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        );
      }
      case "text": {
        const p = person(m.authorId);
        const fx = effectsFor(m.authorId, p.vip);
        const bubble = fx.bubble;
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
                  <VipBubbleArt set={bubble} />
                  <span className="relative break-words">{m.text}</span>
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
              {m.text}
            </p>
          </div>
        );
      }
    }
  })();
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {body}
    </motion.div>
  );
}

/** Text input used in the room control bars. */
export function ChatInput({ s, value, setValue, compact = false }: { s: RoomSession; value: string; setValue: (v: string) => void; compact?: boolean }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        s.send(value);
        setValue("");
      }}
      className={`flex h-10 min-w-0 flex-1 items-center rounded-full bg-cream/[0.08] pl-3.5 pr-1 ring-1 ring-line focus-within:ring-gold/40 ${compact ? "" : ""}`}
    >
      <input value={value} onChange={(e) => setValue(e.target.value)} disabled={s.chatBlocked} placeholder={s.chatBlocked ? "Text chat is off in this room" : "Say something…"} aria-label="Message the room" className="min-w-0 flex-1 bg-transparent text-[13px] text-cream placeholder:text-muted/70 focus:outline-none" maxLength={200} />
      {value.trim() ? (
        <button type="submit" aria-label="Send message" className="grid h-8 w-8 place-items-center rounded-full bg-coral text-white">
          <Send className="h-3.5 w-3.5" />
        </button>
      ) : null}
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
        <p className="mt-1.5 text-[11px] text-muted">{s.seated ? "Reactions float above your seat." : "Take a seat to show reactions above your avatar."}</p>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Add to message</p>
        <EmojiPicker className="mt-2" onPick={onInsert} />
      </div>
    </BottomSheet>
  );
}

export function InviteSheet({ open, onClose, roomName }: { open: boolean; onClose: () => void; roomName: string }) {
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
  const { toast, leaveRoom } = useApp();
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
        <RoomLevelCard room={s.room} className="mt-4" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {extra}
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
