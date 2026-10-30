"use client";

import { RoomCover } from "@/components/rooms/RoomCover";
import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Hand, Mic, MicOff, Swords, Volume2, VolumeX } from "lucide-react";
import { CreatePkSheet, PkPanel } from "./PkParts";
import { MusicPill, MusicSheet } from "./RoomMusic";
import { usePkState } from "./usePk";
import { IconButton } from "@/components/ui/kit";
import { GiftPanel } from "@/components/gifts/GiftPanel";
import { useApp } from "@/lib/app/store";
import { ChatInput, EmojiButton, EmojiSheet, GiftButton, InviteSheet, RoomChat, RoomMenuSheet, RoomTopBar, SeatLayout } from "./RoomParts";
import { YouTubeMark } from "./YouTubePlayer";
import { LiveVoiceBar } from "./LiveVoiceBar";
import { BACKGROUNDS } from "./RoomSettings";
import type { RoomSession } from "./useRoomSession";

export function VoiceRoom({ s }: { s: RoomSession }) {
  const { leaveRoom } = useApp();
  const [sheet, setSheet] = useState<null | "gift" | "emoji" | "menu" | "invite" | "pk" | "music">(null);
  const pkOn = Boolean(usePkState()?.pk);
  const [draft, setDraft] = useState("");
  const vip = s.room.vip;
  const close = () => setSheet(null);

  return (
    <div className={`relative flex h-full flex-col overflow-hidden ${vip ? "bg-wine-2" : "bg-ink"}`}>
      {/* Backdrop: room cover fading into the room surface */}
      {s.settings.background === "cover" ? (
        <div className="absolute inset-x-0 top-0 h-[58%]" aria-hidden>
          <RoomCover room={s.room} />
          <div className={`absolute inset-0 bg-gradient-to-b ${vip ? "from-[#241018]/40 via-[#241018]/80 to-[#241018]" : "from-ink/30 via-ink/75 to-ink"}`} />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: BACKGROUNDS.find((b) => b.id === s.settings.background)?.css }} aria-hidden />
      )}
      {vip ? <VipDecor /> : null}

      <RoomTopBar s={s} onMenu={() => setSheet("menu")} onLeave={leaveRoom} />

      <div className="relative z-10 flex items-center justify-between gap-2 px-4 pt-1">
        <p className="min-w-0 truncate text-[12px] text-cream/70">
          <span className="mr-1.5 rounded-md bg-cream/10 px-1.5 py-0.5 text-[10px] font-bold text-cream/80">{s.room.category}</span>
          {s.settings.event ? <span className="mr-1.5 rounded-md bg-coral px-1.5 py-0.5 text-[10px] font-bold text-white">🎉 Event</span> : null}
          {s.room.topic}
        </p>
        {s.canModerate && !pkOn ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setSheet("pk")}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#ff4f7b] to-[#3d9bff] px-3 text-[11.5px] font-extrabold text-white"
          >
            <Swords className="h-3.5 w-3.5" aria-hidden /> PK
          </motion.button>
        ) : null}
        {s.canModerate ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => s.setMode("youtube")}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-cream/10 px-3 text-[11.5px] font-bold text-cream ring-1 ring-line-strong backdrop-blur hover:bg-cream/15"
          >
            <YouTubeMark className="h-3.5 w-5" /> Watch YouTube
          </motion.button>
        ) : null}
      </div>

      <PkPanel s={s} />

      {/* Seats: the owner's fixed seat + intimacy seat on top, then linked pairs */}
      <div className={`relative z-10 ${pkOn ? "mt-3" : "mt-5"}`}>
        <MusicPill className="absolute right-2 top-6 z-20" onOpen={() => setSheet("music")} />
        <SeatLayout s={s} gold={vip} />
        {s.voice ? (
          <LiveVoiceBar voice={s.voice} participants={s.participants} />
        ) : (
          <p className="mt-2 text-center text-[10.5px] text-cream/45">Voice isn&apos;t connected in this web preview. Mic and speaker are local controls.</p>
        )}
      </div>

      <RoomChat s={s} className="relative z-10 mt-2 min-h-0 flex-1 pb-2" />

      {/* Controls */}
      <div className={`pb-safe relative z-10 border-t ${vip ? "border-gold/15 bg-[#1a0b11]/90" : "border-line bg-ink/90"} backdrop-blur`}>
        <div className="flex items-center gap-1.5 px-2.5 py-2.5">
          <IconButton label={s.speakerOn ? "Turn speaker off" : "Turn speaker on"} onClick={s.toggleSpeaker}>
            {s.speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-muted" />}
          </IconButton>
          <IconButton label={s.muted ? "Unmute microphone" : "Mute microphone"} onClick={s.toggleMute} active={s.seated && !s.muted} disabled={Boolean(s.voice && (s.voice.status !== "connected" || s.voice.micBusy))}>
            {s.seated && !s.muted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-muted" />}
          </IconButton>
          <ChatInput s={s} value={draft} setValue={setDraft} />
          <EmojiButton onClick={() => setSheet("emoji")} />
          <IconButton label={s.handRaised ? "Lower hand" : "Raise hand"} onClick={s.toggleHand} active={s.handRaised} className={s.handRaised ? "!bg-gold !text-ink" : ""}>
            <Hand className="h-5 w-5" />
          </IconButton>
          <GiftButton onClick={() => setSheet("gift")} />
        </div>
      </div>

      <GiftPanel open={sheet === "gift"} onClose={close} s={s} />
      <CreatePkSheet open={sheet === "pk"} onClose={close} />
      <MusicSheet open={sheet === "music"} onClose={close} />
      <EmojiSheet open={sheet === "emoji"} onClose={close} s={s} onInsert={(e) => setDraft((d) => d + e)} />
      <InviteSheet open={sheet === "invite"} onClose={close} roomName={s.room.name} />
      <RoomMenuSheet open={sheet === "menu"} onClose={close} s={s} onInvite={() => setSheet("invite")} />
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
        className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+5.35rem)] -translate-x-1/2"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Crown className="h-5 w-5 text-gold drop-shadow-[0_0_8px_rgb(231_188_114/0.8)]" />
      </motion.div>
    </div>
  );
}
