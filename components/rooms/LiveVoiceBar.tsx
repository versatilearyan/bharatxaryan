"use client";

import { Loader2, RefreshCw, Volume2, WifiOff } from "lucide-react";
import type { LiveVoice, VoiceStatus } from "./useLiveVoice";
import type { RoomParticipants } from "./useRoomParticipants";

const LABEL: Record<VoiceStatus, string> = {
  idle: "Voice",
  joining: "Joining voice…",
  connecting: "Connecting voice…",
  connected: "Voice connected",
  reconnecting: "Reconnecting…",
  disconnected: "Voice disconnected",
  error: "Voice not connected",
};

const DOT: Record<VoiceStatus, string> = {
  idle: "bg-cream/40",
  joining: "bg-gold",
  connecting: "bg-gold",
  connected: "bg-speak",
  reconnecting: "bg-gold",
  disconnected: "bg-coral",
  error: "bg-coral",
};

/**
 * The live voice status for a backend room: connection state, who is in the
 * voice call (with speaking and mic state from LiveKit), errors with Retry,
 * and a "Tap to hear the room" button when the browser blocked autoplay.
 */
export function LiveVoiceBar({ voice, participants, compact = false }: { voice: LiveVoice; participants?: RoomParticipants | null; compact?: boolean }) {
  const busy = voice.status === "joining" || voice.status === "connecting" || voice.status === "reconnecting";
  const failed = voice.status === "error" || voice.status === "disconnected";
  return (
    <div className={`mx-auto flex w-fit max-w-[calc(100%-24px)] flex-col items-center gap-1.5 ${compact ? "" : "mt-2"}`} role="status" aria-live="polite">
      {/* Hidden once voice is connected: the pill only shows while connecting or when something went wrong */}
      {voice.status !== "connected" ? (
        <div className="flex max-w-full items-center gap-2 rounded-full bg-black/35 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-cream ring-1 ring-white/10 backdrop-blur">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" aria-hidden /> : failed ? <WifiOff className="h-3.5 w-3.5 text-coral" aria-hidden /> : <span className={`h-2 w-2 rounded-full ${DOT[voice.status]}`} aria-hidden />}
          <span className="shrink-0">{LABEL[voice.status]}</span>
          {failed ? (
            <button type="button" onClick={voice.retry} className="flex items-center gap-1 rounded-full bg-cream/15 px-2 py-0.5 text-[10.5px] font-bold text-cream">
              <RefreshCw className="h-3 w-3" aria-hidden /> Retry
            </button>
          ) : (
            <span className="w-1" />
          )}
        </div>
      ) : null}
      {(voice.status === "connected" || voice.status === "reconnecting") && !voice.canPlayAudio ? (
        <button type="button" onClick={voice.startAudio} className="flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-[11px] font-extrabold text-ink">
          <Volume2 className="h-3.5 w-3.5" aria-hidden /> Tap to hear the room
        </button>
      ) : null}
      {voice.error ? <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-coral">{voice.error}</p> : null}
      {participants?.roomClosed ? <p className="max-w-[300px] text-center text-[10.5px] leading-snug text-coral">This room has been closed.</p> : null}
      {participants?.status === "error" ? (
        <p className="flex max-w-[300px] items-center gap-1.5 text-center text-[10.5px] leading-snug text-coral">
          Couldn&apos;t load who&apos;s in the room. {participants.error}
          <button type="button" onClick={participants.refresh} className="shrink-0 rounded-full bg-cream/15 px-2 py-0.5 font-bold text-cream">
            Retry
          </button>
        </p>
      ) : null}
    </div>
  );
}
