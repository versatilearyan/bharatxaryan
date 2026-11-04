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
import { ChatInput, ClosedRoomCard, EmojiButton, EmojiSheet, GiftButton, InviteSheet, RoomChat, RoomMenuSheet, MicOrderBar, RoomTopBar, SeatLayout } from "./RoomParts";
import type { RoomSession } from "./useRoomSession";

/** YouTube Watch Together. This is the room's "video" mode: there are no video calls. */
export function WatchTogetherRoom({ s }: { s: RoomSession }) {
  const { toast } = useApp();
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
      <RoomTopBar s={s} onMenu={() => s.setPanel("online")} />

      {/* Player, or the "choose a video" card before one is picked */}
      <div className="relative z-10 px-3">
        {s.video ? (
          <>
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#0c0b0f] ring-1 ring-line">
              <YouTubePlayer videoId={s.video.id} onChooseAnother={() => setSheet("add")} sync={s.videoSync} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <YouTubeMark className="h-4 w-6 shrink-0" />
              <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-cream">{s.video.title}</p>
              <button type="button" onClick={() => setSheet("add")} className="flex items-center gap-1 rounded-full bg-cream/[0.07] px-2.5 py-1 text-[11px] font-bold text-cream">
                <RefreshCw className="h-3 w-3" aria-hidden /> Change
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center rounded-[22px] bg-[#1c1b21] px-6 pb-6 pt-7 text-center ring-1 ring-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <YouTubeMark className="h-7 w-10" />
              <span className="font-display text-[22px] font-bold tracking-[-0.03em] text-cream">YouTube</span>
            </div>
            <p className="mt-4 max-w-[260px] text-[14px] leading-snug text-cream/75">Choose a YouTube video to watch and chat with friends in the room</p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setSheet("add")}
              className="mt-5 h-11 rounded-full bg-[#14b8a6] px-8 text-[14.5px] font-bold text-white shadow-[0_10px_24px_-10px_rgb(20_184_166/0.8)]"
            >
              Add a video
            </motion.button>
          </div>
        )}
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
      <div className="relative z-10 mt-4">
        {s.roomOpen ? (
          <>
            <SeatLayout s={s} gold={vip} grid />
            <MicOrderBar s={s} />
          </>
        ) : (
          <ClosedRoomCard s={s} />
        )}
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
