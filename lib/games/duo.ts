"use client";

/**
 * Duo Dash: the game's API (session, couple ranking) and its private voice channel.
 * The voice is a LiveKit channel "duo-CODE" for just the two players (no Panchayat voice room is made).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, AudioPresets, type RemoteTrack } from "livekit-client";
import { api } from "@/lib/api/client";

export type DuoRing = { id: string; name: string; rarity: string; imageUrl?: string; qty: number };
export type DuoSession = { code: string; ticket: string; gameServer?: string; voice: { url: string; room: string; token: string }; rings?: DuoRing[] };
export type DuoPerson = { id: string; name: string; avatarUrl?: string };
export type DuoCouple = { rank: number; a: DuoPerson; b: DuoPerson; bestLevel: number; levelsDone: number; stars: number; coins: number; coupleMoments: number; engaged?: boolean };
export type DuoMatch = { state: "idle" | "waiting" | "matched"; code?: string; partner?: DuoPerson; waitingSeconds?: number; lookingNow?: number };

const opts = { auth: true, forbiddenIsAccess: true } as const;

export const duoApi = {
  session: (code: string) => api<DuoSession>("/api/v1/duo/session", { ...opts, method: "POST", body: { code } }),
  leaderboard: async (period: "all" | "week"): Promise<DuoCouple[]> => {
    const d = await api<{ couples?: DuoCouple[] }>(`/api/v1/duo/leaderboard?period=${period}`, opts);
    return Array.isArray(d?.couples) ? d.couples : [];
  },
  matchJoin: (gender?: "male" | "female") => api<DuoMatch>("/api/v1/duo/match", { ...opts, method: "POST", body: gender ? { gender } : {} }),
  matchStatus: () => api<DuoMatch>("/api/v1/duo/match", opts),
  matchLeave: () => api<DuoMatch>("/api/v1/duo/match", { ...opts, method: "DELETE" }),
};

/** A fresh 6-digit game code. */
export function newDuoCode(): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(100000 + (a[0] % 900000));
}

export type DuoVoice = { state: "off" | "connecting" | "on" | "error"; micOn: boolean; partnerHere: boolean; partnerTalking: boolean; meTalking: boolean; toggleMic: () => void };

/** Joins the two-person voice channel; mic starts on. Echo cancellation and noise suppression are on. */
export function useDuoVoice(session: DuoSession | null): DuoVoice {
  const [state, setState] = useState<DuoVoice["state"]>("off");
  const [micOn, setMicOn] = useState(false);
  const [partnerHere, setPartnerHere] = useState(false);
  const [partnerTalking, setPartnerTalking] = useState(false);
  const [meTalking, setMeTalking] = useState(false);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!session?.voice?.token || !session.voice.url) return;
    let cancelled = false;
    const room = new Room({
      adaptiveStream: false,
      dynacast: false,
      disconnectOnPageLeave: false,
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      publishDefaults: { audioPreset: AudioPresets.music, dtx: true, red: true },
    });
    roomRef.current = room;
    const box = document.createElement("div");
    box.style.display = "none";
    document.body.appendChild(box);
    const sync = () => {
      if (cancelled) return;
      const others = [...room.remoteParticipants.values()];
      setPartnerHere(others.length > 0);
      setPartnerTalking(others.some((p) => p.isSpeaking));
      setMeTalking(room.localParticipant.isSpeaking);
      setMicOn(room.localParticipant.isMicrophoneEnabled);
    };
    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        track.detach().forEach((old) => old.remove());
        box.appendChild(track.attach());
        sync();
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove());
        sync();
      })
      .on(RoomEvent.ParticipantConnected, sync)
      .on(RoomEvent.ParticipantDisconnected, sync)
      .on(RoomEvent.ActiveSpeakersChanged, sync)
      .on(RoomEvent.LocalTrackPublished, sync)
      .on(RoomEvent.Reconnected, () => setState("on"))
      .on(RoomEvent.Disconnected, () => !cancelled && setState("off"));
    setState("connecting");
    void (async () => {
      try {
        await room.connect(session.voice.url, session.voice.token, { autoSubscribe: true });
        if (cancelled) return;
        setState("on");
        await room.localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
        await room.startAudio().catch(() => undefined);
        sync();
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      void room.disconnect(true);
      box.remove();
      roomRef.current = null;
    };
  }, [session?.voice?.token, session?.voice?.url]);

  const toggleMic = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isMicrophoneEnabled;
    void room.localParticipant.setMicrophoneEnabled(next).then(() => setMicOn(next)).catch(() => undefined);
    void room.startAudio().catch(() => undefined);
  }, []);

  return { state, micOn, partnerHere, partnerTalking, meTalking, toggleMic };
}
