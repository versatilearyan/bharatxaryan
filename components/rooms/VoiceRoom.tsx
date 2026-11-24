"use client";

import { OfficialBadge, OfficialPkBadge } from "@/components/rooms/OfficialBadge";
import { useFitSeatScale, useSeatScale } from "./useSeatScale";
import { RoomCover } from "@/components/rooms/RoomCover";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Hand, Mic, MicOff, Swords, Volume2, VolumeX } from "lucide-react";
import { CreatePkSheet, PkPanel } from "./PkParts";
import { MusicPill, MusicSheet } from "./RoomMusic";
import { usePkState } from "./usePk";
import { useSongRequests } from "./useSongRequests";
import { useMusic } from "@/lib/app/music-store";
import { IconButton } from "@/components/ui/kit";
import { GiftPanel } from "@/components/gifts/LazyGiftPanel";
import { ChatInput, ClosedRoomCard, EmojiButton, EmojiSheet, GiftButton, InviteSheet, RoomChat, RoomMenuSheet, MicOrderBar, RoomTopBar, SeatLayout, PkArena } from "./RoomParts";
import { LiveVoiceBar } from "./LiveVoiceBar";
import { BACKGROUNDS } from "./RoomSettings";
import { NewbieSeatLayout, NewbieWelcome } from "@/components/newbie/NewbieUi";
import type { RoomSession } from "./useRoomSession";

export function VoiceRoom({ s }: { s: RoomSession }) {
  const [sheet, setSheet] = useState<null | "gift" | "emoji" | "menu" | "invite" | "pk" | "music">(null);
  const pkOn = Boolean(usePkState()?.pk);
  const songs = useSongRequests(s.room.server?.id ?? null);
  const arena = usePkState()?.pk?.mode === "1v1";
  const { musicOff } = useMusic();
  const [draft, setDraft] = useState("");
  const vip = s.room.vip;
  // Seats are sized to leave the chat its share of the room, however many seats there are
  const rootRef = useRef<HTMLDivElement>(null);
  const seatsRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  // Every seat keeps its own fixed slot (names/badges never shift it), but the whole group scales down together,
  // never a single seat alone, when there isn't room for it all (extra seats, PK) — so nothing ever scrolls or is cut off.
  const seatScale = useFitSeatScale(useSeatScale(), rootRef, seatsRef, chatRef);
  const close = () => setSheet(null);

  return (
    <div ref={rootRef} className={`relative flex h-full min-h-0 flex-col overflow-hidden ${vip ? "bg-wine-2" : "bg-ink"}`}>
      {/* Backdrop: room cover fading into the room surface */}
      {s.room.newbieBackground && /\.mp4(\?|#|$)/i.test(s.room.newbieBackground) ? (
        // The room's own video background (an Official PK room, or a host at level 5+)
        <div className="absolute inset-0" aria-hidden>
          <video src={s.room.newbieBackground} autoPlay loop muted playsInline className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black/85" />
        </div>
      ) : s.room.newbie || s.room.newbieBackground ? (
        <div className="absolute inset-0" aria-hidden style={{ backgroundImage: `linear-gradient(to bottom, rgba(10,6,3,0.12), rgba(10,6,3,0.5) 62%, rgba(10,6,3,0.88)), url(${s.room.newbieBackground ?? "/backgrounds/newbie-room.jpg"}), radial-gradient(120% 70% at 50% 0%, #6b4a1f 0%, #2a1a0c 50%, #0c0703 100%)`, backgroundSize: "cover", backgroundPosition: "center top" }} />
      ) : s.settings.background === "cover" ? (
        <div className="absolute inset-x-0 top-0 h-[58%]" aria-hidden>
          <RoomCover room={s.room} />
          <div className={`absolute inset-0 bg-gradient-to-b ${vip ? "from-[#241018]/40 via-[#241018]/80 to-[#241018]" : "from-ink/30 via-ink/75 to-ink"}`} />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: BACKGROUNDS.find((b) => b.id === s.settings.background)?.css }} aria-hidden />
      )}
      {vip ? <VipDecor /> : null}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_28%_at_12%_0%,rgba(124,77,255,0.30),transparent),radial-gradient(60%_26%_at_100%_8%,rgba(255,61,139,0.24),transparent),radial-gradient(80%_24%_at_50%_100%,rgba(20,184,166,0.14),transparent)]" aria-hidden />

      <RoomTopBar s={s} onMenu={() => s.setPanel("online")} />

      <div className="relative z-10 flex items-center justify-between gap-2 px-4 pt-1">
        <p className="min-w-0 truncate text-[12px] text-cream/70">
          {s.room.official ? <OfficialBadge full className="mr-1.5 align-middle" /> : null}
          {s.room.officialPk ? <OfficialPkBadge full title={s.room.officialPkTitle} className="mr-1.5 align-middle" /> : null}
          <span className="mr-1.5 rounded-md bg-cream/10 px-1.5 py-0.5 text-[10px] font-bold text-cream/80">{s.room.category}</span>
          {s.settings.event ? <span className="mr-1.5 rounded-md bg-coral px-1.5 py-0.5 text-[10px] font-bold text-white">🎉 Event</span> : null}
          {s.room.topic}
        </p>
      </div>

      {arena ? null : <PkPanel s={s} />}

      {/* Seats: the owner's fixed seat + intimacy seat on top, then linked pairs. No scrolling here: the whole
          group shrinks together to stay on screen with the chat, however many seats there are. */}
      <div ref={seatsRef} className={`relative z-10 shrink-0 ${pkOn ? "mt-1.5" : "mt-2"}`}>
        {musicOff ? null : <MusicPill className="absolute right-2 top-6 z-20" onlyMe={s.musicOnlyMe} requestCount={s.canModerate ? songs.requests.length : 0} onOpen={() => setSheet("music")} />}
        {s.roomOpen ? (
          <>
            {/* Slightly smaller seats leave more room for the chat */}
            {arena ? <PkArena s={s} gold={vip} scale={seatScale} /> : s.room.newbie ? <NewbieSeatLayout s={s} scale={seatScale} /> : <SeatLayout s={s} gold={vip} scale={seatScale} />}
          </>
        ) : (
          <ClosedRoomCard s={s} />
        )}
        {s.voice ? (
          <LiveVoiceBar voice={s.voice} participants={s.participants} />
        ) : (
          <p className="mt-1 text-center text-[9.5px] text-cream/40">Voice isn&apos;t connected in this web preview.</p>
        )}
      </div>
      {/* Outside the measured seat area: turning mic order on/off must never resize (and so rescale) the seats */}
      {s.roomOpen ? <MicOrderBar s={s} /> : null}

      {/* The chat takes the rest of the room (never less than its share: the seats shrink instead) and scrolls inside */}
      <div ref={chatRef} className="relative z-10 mt-1 flex min-h-[72px] flex-1 basis-0 flex-col">
        <RoomChat s={s} className="min-h-0 flex-1 overflow-x-hidden pb-2" />
      </div>

      {/* Controls */}
      <div className={`pb-safe relative z-10 shrink-0 border-t ${vip ? "border-gold/15 bg-[#1a0b11]/90" : "border-line bg-ink/90"} backdrop-blur`}>
        <div className="flex items-center gap-1.5 px-2.5 py-2.5">
          <IconButton label={s.speakerOn ? "Turn speaker off" : "Turn speaker on"} onClick={s.toggleSpeaker}>
            {s.speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-muted" />}
          </IconButton>
          <IconButton label={s.muted ? "Unmute microphone" : "Mute microphone"} onClick={s.toggleMute} active={s.seated && !s.muted} disabled={Boolean(s.voice?.micBusy)}>
            {s.seated && !s.muted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-muted" />}
          </IconButton>
          <ChatInput s={s} value={draft} setValue={setDraft} />
          <EmojiButton onClick={() => setSheet("emoji")} />
          <IconButton label="Room options: mode, mic order, raise hand, leave" onClick={() => setSheet("menu")} active={s.handRaised} className={s.handRaised ? "!bg-gold !text-ink" : ""}>
            <Hand className="h-5 w-5" />
          </IconButton>
          <GiftButton onClick={() => setSheet("gift")} />
        </div>
      </div>

      <NewbieWelcome s={s} />
      <GiftPanel open={sheet === "gift"} onClose={close} s={s} />
      <CreatePkSheet open={sheet === "pk"} onClose={close} />
      <MusicSheet open={sheet === "music"} onClose={close} canControl={s.canModerate} requests={songs} />
      <EmojiSheet open={sheet === "emoji"} onClose={close} s={s} onInsert={(e) => setDraft((d) => d + e)} />
      <InviteSheet open={sheet === "invite"} onClose={close} roomName={s.room.name} roomId={s.room.server?.id} roomCode={s.room.code} />
      <RoomMenuSheet
        open={sheet === "menu"}
        onClose={close}
        s={s}
        onInvite={() => setSheet("invite")}
        extra={
          s.canModerate && !pkOn ? (
            <button type="button" onClick={() => setSheet("pk")} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 hover:bg-cream/[0.04]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#ff4f7b] to-[#3d9bff] text-white">
                <Swords className="h-5 w-5" />
              </span>
              <span className="text-[11.5px] text-cream/80">Start PK</span>
            </button>
          ) : null
        }
      />
    </div>
  );
}

/** Gold filigree corners and a crown for VIP rooms. */
export function VipDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
      <div className="absolute inset-2 rounded-[28px] border border-gold/25" />
      <div className="absolute inset-3.5 rounded-[24px] border border-gold/10" />
      <motion.div
        className="absolute left-1/2 top-[calc(var(--st)+5.35rem)] -translate-x-1/2"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Crown className="h-5 w-5 text-gold drop-shadow-[0_0_8px_rgb(231_188_114/0.8)]" />
      </motion.div>
    </div>
  );
}

