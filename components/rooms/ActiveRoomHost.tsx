"use client";

import { useEffect, useRef, useState } from "react";
import { RoomCover } from "@/components/rooms/RoomCover";
import { VipEntryBanner } from "@/components/effects/VipFx";
import { preloadSvga } from "@/components/effects/SvgaAnim";
import { useMarket } from "@/lib/app/market-store";
import { AnimatePresence, motion } from "framer-motion";
import { Gavel, Mic, MicOff, MonitorPlay, X } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import type { Room } from "@/lib/app/types";
import { KharidariRoom } from "./KharidariRoom";
import { RoomOverlays } from "./RoomOverlays";
import { useAuction, type Auction } from "./useAuction";
import { PkContext, usePk } from "./usePk";
import { useRoomSession, type RoomMode, type RoomSession } from "./useRoomSession";
import { VoiceRoom } from "./VoiceRoom";
import { WatchTogetherRoom } from "./WatchTogetherRoom";
import { nameFace, nameTone } from "@/lib/app/fonts";
import { RoomRedPacket } from "@/components/redpacket/RedPacket";

/**
 * Keeps the room you joined mounted for as long as you're in it.
 * Minimising slides the room away but its seats, chat and YouTube player keep
 * running, and a mini player floats above the tabs so you can browse the app.
 */
export function ActiveRoomHost() {
  const { activeRoomId, roomById } = useApp();
  const room = activeRoomId ? roomById(activeRoomId) : undefined;
  if (!room) return null;
  return <ActiveRoom key={room.id} room={room} />;
}

function ActiveRoom({ room }: { room: Room }) {
  const { roomOpen } = useApp();
  const s = useRoomSession(room);
  // The auction keeps its clock and simulated bidders running in the background too
  const auction = useAuction(s);
  // PK battles keep scoring while the room is minimised, like the auction
  const pk = usePk(s);
  const mode = s.mode;

  return (
    <>
      <motion.section
        className="absolute inset-0 z-[45] bg-ink"
        initial={{ y: "100%" }}
        animate={{ y: roomOpen ? 0 : "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 38 }}
        style={{ pointerEvents: roomOpen ? "auto" : "none" }}
        inert={!roomOpen}
        aria-label={room.name}
      >
        <PkContext.Provider value={pk}>{mode === "youtube" ? <WatchTogetherRoom s={s} /> : mode === "kharidari" ? <KharidariRoom s={s} a={auction} /> : <VoiceRoom s={s} />}</PkContext.Provider>
        <RoomRedPacket s={s} />
        <RoomOverlays s={s} />
        <EntryEffect />
      </motion.section>
      <AnimatePresence>{!roomOpen ? <MiniRoom s={s} mode={mode} a={auction} /> : null}</AnimatePresence>
    </>
  );
}

/**
 * Your entry banner (SVGA) with your name, played once when you enter the room.
 * It slides in from the right and sits on the right, just below the last row of seats.
 */
function EntryEffect() {
  const { profile, vip } = useApp();
  const src = useMarket().effectsFor(ME_ID).entry;
  const [show, setShow] = useState(false);
  const [top, setTop] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  // Wait until the banner file is loaded and the seats have settled, place it once, then slide it in.
  // (Showing it earlier made the art pop in late and the banner jump when the seats moved.)
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    Promise.all([preloadSvga(src.entry), new Promise((r) => window.setTimeout(r, 600))])
      .then(() => {
        const room = box.current?.parentElement;
        if (cancelled || !room) return;
        const seats = Array.from(room.querySelectorAll("[data-seat]"));
        const roomTop = room.getBoundingClientRect().top;
        setTop(seats.length ? Math.max(...seats.map((el) => el.getBoundingClientRect().bottom)) - roomTop - 8 : room.clientHeight * 0.46);
        setShow(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Plays once, when you enter the room
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setShow(false), 4800);
    return () => window.clearTimeout(t);
  }, [show]);
  return (
    <div ref={box} className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden={!show}>
      <AnimatePresence>
        {show && src ? (
          <motion.div
            className="absolute right-2 w-[60%] max-w-[240px]"
            style={{ top }}
            initial={{ x: "110%" }}
            animate={{ x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 28 }}
            role="status"
          >
            <VipEntryBanner set={src} avatar={<PersonAvatar person={{ id: ME_ID, look: profile.look, photo: profile.photo, frame: "none" }} size={64} className="!h-full !w-full" />}>
              <span className={nameTone(vip.level, "text-[#ffe08a]", "room")}>{profile.name}</span> entered
            </VipEntryBanner>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Floating "now in room" bar shown while the room runs in the background. */
function MiniRoom({ s, mode, a }: { s: RoomSession; mode: RoomMode; a: Auction }) {
  const { expandRoom, leaveRoom } = useApp();
  const person = usePeople();
  const talking = s.speakingIds.filter((id) => id !== ME_ID);
  const status =
    mode === "youtube" && s.video
      ? `Playing: ${s.video.title}`
      : mode === "kharidari" && a.phase === "bidding"
        ? `Kharidari · ${a.secondsLeft}s left${a.top ? ` · top ${a.top.total.toLocaleString("en-IN")}` : ""}`
      : talking.length
        ? `${talking.map((id) => person(id).name).slice(0, 2).join(" & ")} ${talking.length > 1 ? "are" : "is"} talking`
        : `${s.seatedIds.length} on mic`;

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 30, opacity: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="absolute inset-x-2.5 bottom-[calc(70px+env(safe-area-inset-bottom))] z-[35] flex items-center gap-2.5 rounded-2xl bg-surface-2/95 p-1.5 pr-2 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.8)] ring-1 ring-line-strong backdrop-blur-xl"
    >
      <button type="button" onClick={expandRoom} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`Back to ${s.room.name}`}>
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl">
          <RoomCover room={s.room} />
          <span className="absolute inset-0 grid place-items-center bg-black/35">
            {mode === "youtube" ? (
              <MonitorPlay className="h-4 w-4 text-white" aria-hidden />
            ) : mode === "kharidari" ? (
              <Gavel className="h-4 w-4 text-white" aria-hidden />
            ) : (
              <span className="flex h-4 items-end gap-[2px]" aria-hidden>
                {[0, 0.15, 0.3, 0.45].map((d) => (
                  <span key={d} className="block h-4 w-[3px] origin-bottom animate-eq rounded-full bg-speak" style={{ animationDelay: `${d}s` }} />
                ))}
              </span>
            )}
          </span>
        </span>
        <span className="min-w-0">
          <span className={`block truncate text-[13.5px] font-bold ${s.room.vip ? "gold-shine pr-1" : "text-cream"}`} style={nameFace(s.settings.nameFont)}>{s.room.name}</span>
          <span className="block truncate text-[11px] text-speak">{status}</span>
        </span>
      </button>
      <span className="flex -space-x-2">
        {talking.slice(0, 2).map((id) => (
          <PersonAvatar key={id} person={{ ...person(id), frame: "none" }} size={24} className="rounded-full ring-2 ring-surface-2" />
        ))}
      </span>
      {s.seated ? (
        <button type="button" onClick={s.toggleMute} className={`grid h-9 w-9 place-items-center rounded-full ${s.muted ? "bg-cream/10 text-muted" : "bg-coral text-white"}`} aria-label={s.muted ? "Unmute microphone" : "Mute microphone"}>
          {s.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
      ) : null}
      <button type="button" onClick={leaveRoom} className="grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-cream" aria-label="Leave room">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
