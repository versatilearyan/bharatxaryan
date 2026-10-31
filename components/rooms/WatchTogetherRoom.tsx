"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AudioLines, MoreHorizontal, Plus, RefreshCw, Trash2, UsersRound, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { GiftPanel } from "@/components/gifts/GiftPanel";
import { IconButton } from "@/components/ui/kit";
import { useApp } from "@/lib/app/store";
import { AddVideoModal } from "./AddVideoModal";
import { VipDecor } from "./VoiceRoom";
import { YouTubeMark, YouTubePlayer } from "./YouTubePlayer";
import { ChatInput, EmojiButton, EmojiSheet, GiftButton, InviteSheet, RoomChat, RoomMenuSheet, MicOrderBar, RoomTopBar, SeatLayout } from "./RoomParts";
import type { RoomSession } from "./useRoomSession";

/** YouTube Watch Together. This is the room's "video" mode: there are no video calls. */
export function WatchTogetherRoom({ s }: { s: RoomSession }) {
  const { leaveRoom, toast } = useApp();
  const [sheet, setSheetState] = useState<null | "gift" | "emoji" | "menu" | "invite" | "add">(null);
  // Anyone on the mic can pick a video; the owner and admins can always change it
  const canPickVideo = s.canModerate || s.seated;
  const setSheet = (v: typeof sheet) => {
    if (v === "add" && !canPickVideo) {
      toast("Take a seat to add a video. The owner and admins can always change it.");
      return;
    }
    setSheetState(v);
  };
  const [draft, setDraft] = useState("");
  const close = () => setSheet(null);
  const vip = s.room.vip;

  return (
    <div className={`relative flex h-full flex-col overflow-hidden ${vip ? "bg-wine-2" : "bg-ink"}`}>
      {vip ? <VipDecor /> : null}
      <RoomTopBar s={s} onMenu={() => setSheet("menu")} onLeave={leaveRoom} />

      {/* Player */}
      <div className="relative z-10 px-3">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#0c0b0f] ring-1 ring-line">
          {s.video ? (
            <YouTubePlayer videoId={s.video.id} onChooseAnother={() => setSheet("add")} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3" style={{ background: "radial-gradient(circle at 50% 30%, #2a1a22, #0c0b0f 70%)" }}>
              <div className="flex items-center gap-2">
                <YouTubeMark className="h-6 w-9" />
                <span className="font-display text-[17px] font-bold tracking-tight text-cream">YouTube</span>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setSheet("add")}
                className="flex h-10 items-center gap-1.5 rounded-full bg-[#ff0033] px-4 text-[13px] font-bold text-white shadow-[0_10px_24px_-8px_rgb(255_0_51/0.7)]"
              >
                <Plus className="h-4 w-4" aria-hidden /> Add YouTube Video
              </motion.button>
              <p className="text-[11px] text-muted">Paste any public YouTube link</p>
            </div>
          )}
        </div>
        {s.video ? (
          <div className="mt-2 flex items-center gap-2">
            <YouTubeMark className="h-4 w-6 shrink-0" />
            <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-cream">{s.video.title}</p>
            <button type="button" onClick={() => setSheet("add")} className="flex items-center gap-1 rounded-full bg-cream/[0.07] px-2.5 py-1 text-[11px] font-bold text-cream">
              <RefreshCw className="h-3 w-3" aria-hidden /> Change
            </button>
          </div>
        ) : null}
      </div>

      {/* Mode switch */}
      <div className="relative z-10 mt-3 flex items-center justify-between px-4">
        {s.canModerate ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => s.setMode("voice")}
            className="flex h-8 items-center gap-1.5 rounded-full bg-cream/[0.08] px-3 text-[11.5px] font-bold text-cream ring-1 ring-line-strong"
          >
            <AudioLines className="h-3.5 w-3.5" aria-hidden /> Back to voice room
          </motion.button>
        ) : (
          <span className="text-[11px] font-semibold text-cream/70">YouTube mode</span>
        )}
        <span className="text-[10.5px] text-muted">Plays on your device · not synced</span>
      </div>

      {/* Seats */}
      <div className="relative z-10 mt-3 px-1">
        <SeatLayout s={s} gold={vip} scale={0.68} />
        <MicOrderBar s={s} />
      </div>

      <RoomChat s={s} className="relative z-10 mt-2 min-h-0 flex-1 pb-2" />

      {/* Controls */}
      <div className="pb-safe relative z-10 border-t border-line bg-ink/90 backdrop-blur">
        <div className="flex items-center gap-1.5 px-2.5 py-2.5">
          <IconButton label={s.speakerOn ? "Turn speaker off" : "Turn speaker on"} onClick={s.toggleSpeaker}>
            {s.speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-muted" />}
          </IconButton>
          <IconButton label={s.muted ? "Unmute microphone" : "Mute microphone"} onClick={s.toggleMute} active={s.seated && !s.muted}>
            {s.seated && !s.muted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-muted" />}
          </IconButton>
          <ChatInput s={s} value={draft} setValue={setDraft} />
          <EmojiButton onClick={() => setSheet("emoji")} />
          <GiftButton onClick={() => setSheet("gift")} />
          <IconButton label="More options" onClick={() => setSheet("menu")}>
            <MoreHorizontal className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      <AddVideoModal open={sheet === "add"} onClose={close} onAdd={(v) => s.setVideo(v)} />
      <GiftPanel open={sheet === "gift"} onClose={close} s={s} />
      <EmojiSheet open={sheet === "emoji"} onClose={close} s={s} onInsert={(e) => setDraft((d) => d + e)} />
      <InviteSheet open={sheet === "invite"} onClose={close} roomName={s.room.name} />
      <RoomMenuSheet
        open={sheet === "menu"}
        onClose={close}
        s={s}
        extra={
          <>
            <MenuTile icon={<Plus className="h-5 w-5" />} label={s.video ? "Change video" : "Add video"} onClick={() => setSheet("add")} />
            {s.video && s.canModerate ? (
              <MenuTile
                icon={<Trash2 className="h-5 w-5" />}
                label="Remove video"
                onClick={() => {
                  s.setVideo(null);
                  close();
                }}
              />
            ) : null}
            <MenuTile icon={<UsersRound className="h-5 w-5" />} label="Invite" onClick={() => setSheet("invite")} />
          </>
        }
      />
    </div>
  );
}

function MenuTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 hover:bg-cream/[0.04]">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream/[0.07] text-cream">{icon}</span>
      <span className="text-[11.5px] text-cream/80">{label}</span>
    </button>
  );
}
