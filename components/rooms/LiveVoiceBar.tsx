"use client";

import { Volume2 } from "lucide-react";
import type { LiveVoice } from "./useLiveVoice";
import type { RoomParticipants } from "./useRoomParticipants";

/**
 * What a person sees about voice, which is almost nothing: the call connects and recovers by itself in the
 * background (see useLiveVoice), so there is no "connecting", "reconnecting" or "failed" label, no error
 * text and no Retry. Only three things need the person: the browser blocked sound until a tap, the
 * microphone is blocked or missing (they can fix that), and the room was closed.
 */
export function LiveVoiceBar({ voice, participants, compact = false }: { voice: LiveVoice; participants?: RoomParticipants | null; compact?: boolean }) {
  const needsTap = (voice.status === "connected" || voice.status === "reconnecting") && !voice.canPlayAudio;
  if (!needsTap && !voice.micNotice && !participants?.roomClosed) return null;
  return (
    <div className={`mx-auto flex w-fit max-w-[calc(100%-24px)] flex-col items-center gap-1.5 ${compact ? "" : "mt-2"}`} role="status" aria-live="polite">
      {needsTap ? (
        <button type="button" onClick={voice.startAudio} className="flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-[11px] font-extrabold text-ink">
          <Volume2 className="h-3.5 w-3.5" aria-hidden /> Tap to hear the room
        </button>
      ) : null}
      {voice.micNotice ? <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-gold">{voice.micNotice}</p> : null}
      {participants?.roomClosed ? <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-cream/70">This room has been closed.</p> : null}
    </div>
  );
}
