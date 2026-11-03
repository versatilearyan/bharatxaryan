"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionError, ConnectionErrorReason, ConnectionState, DisconnectReason, MediaDeviceFailure, Room, RoomEvent, Track, type Participant, type RemoteTrack } from "livekit-client";
import { joinRoom, roomErrorText } from "@/lib/api/voice-rooms";

/**
 * Real voice for a backend room over LiveKit.
 *
 * 1. POST /voice-rooms/{id}/join gives a LiveKit server URL and an access token
 *    (made by the backend; the browser never sees the LiveKit secret).
 * 2. Connect with livekit-client and play everyone else's audio.
 * 3. The microphone is only asked for when you turn it on (a tap), and the
 *    mic state shown is the SDK's real state, not a flag.
 * 4. Unmounting (leaving the room, closing it, switching rooms) disconnects,
 *    stops the mic track, removes the audio elements and all listeners.
 *
 * Status is "connected" only after room.connect() has finished.
 */
export type VoiceStatus = "idle" | "joining" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

export type VoicePerson = {
  /** LiveKit identity (the backend user id for other people). */
  identity: string;
  name: string;
  isLocal: boolean;
  speaking: boolean;
  micOn: boolean;
  /** The published microphone track's SID, needed for a moderator mute. */
  micSid?: string;
};

export type LiveVoice = {
  status: VoiceStatus;
  error: string;
  /** The server took you out of this room (kick or ban): the call ended and joining again is refused. */
  removed: boolean;
  people: VoicePerson[];
  /** Your microphone is publishing and not muted (from the SDK). */
  micOn: boolean;
  /** True while turning the mic on or off. */
  micBusy: boolean;
  /** False when the browser blocked sound until a tap. */
  canPlayAudio: boolean;
  /** Turn your mic on or off. Resolves false (with an error shown) when it couldn't. */
  setMic: (on: boolean) => Promise<boolean>;
  /** Mute or unmute everyone else's audio on this device. */
  setSpeaker: (on: boolean) => void;
  /** Ask the browser to start audio after it blocked autoplay. */
  startAudio: () => void;
  retry: () => void;
};

export function micErrorText(e: unknown): string {
  const failure = MediaDeviceFailure.getFailure(e);
  if (failure === MediaDeviceFailure.PermissionDenied) return "Microphone access is blocked. Allow the mic for this site in your browser settings, then try again.";
  if (failure === MediaDeviceFailure.NotFound) return "No microphone was found. Plug one in and try again.";
  if (failure === MediaDeviceFailure.DeviceInUse) return "Your microphone is being used by another app.";
  if (e instanceof Error && /secure|https/i.test(e.message)) return "The microphone needs a secure (https) page.";
  return "Couldn't turn on your microphone. Try again.";
}

function disconnectText(reason?: DisconnectReason): string {
  switch (reason) {
    case DisconnectReason.CLIENT_INITIATED:
      return "";
    case DisconnectReason.DUPLICATE_IDENTITY:
      return "You joined this room somewhere else, so this device was disconnected.";
    case DisconnectReason.PARTICIPANT_REMOVED:
      return "You were removed from the voice room.";
    case DisconnectReason.ROOM_DELETED:
      return "The voice room was closed.";
    case DisconnectReason.JOIN_FAILURE:
      return "Couldn't connect to voice. Check your connection and try again.";
    default:
      return "Voice disconnected. Check your connection and try again.";
  }
}

function snapshot(room: Room): VoicePerson[] {
  const list: Participant[] = [room.localParticipant, ...room.remoteParticipants.values()];
  return list.map((p) => ({
    identity: p.identity,
    name: p.name || (p.isLocal ? "You" : `User ${p.identity}`),
    isLocal: p.isLocal,
    speaking: p.isSpeaking,
    micOn: p.isMicrophoneEnabled,
    micSid: p.getTrackPublication(Track.Source.Microphone)?.trackSid,
  }));
}

/** `serverRoomId` is the backend room id, or null for local sample rooms (then nothing connects). */
export function useLiveVoice(serverRoomId: string | null): LiveVoice | null {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState(false);
  const [people, setPeople] = useState<VoicePerson[]>([]);
  const [micOn, setMicOn] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [canPlayAudio, setCanPlayAudio] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const speakerRef = useRef(true);

  useEffect(() => {
    if (!serverRoomId) return;
    let cancelled = false;
    const room = new Room({ adaptiveStream: false, dynacast: false, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    roomRef.current = room;
    // Hidden <audio> elements for everyone else's voice
    const audioBox = document.createElement("div");
    audioBox.style.display = "none";
    audioBox.dataset.liveVoice = serverRoomId;
    document.body.appendChild(audioBox);

    const sync = () => {
      if (cancelled) return;
      setPeople(snapshot(room));
      setMicOn(room.localParticipant.isMicrophoneEnabled);
    };
    const applySpeaker = () => {
      for (const p of room.remoteParticipants.values()) p.setVolume(speakerRef.current ? 1 : 0);
    };

    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        audioBox.appendChild(track.attach());
        applySpeaker();
        sync();
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove());
        sync();
      })
      .on(RoomEvent.ParticipantConnected, sync)
      .on(RoomEvent.ParticipantDisconnected, sync)
      .on(RoomEvent.ActiveSpeakersChanged, sync)
      .on(RoomEvent.TrackMuted, sync)
      .on(RoomEvent.TrackUnmuted, sync)
      .on(RoomEvent.LocalTrackPublished, sync)
      .on(RoomEvent.LocalTrackUnpublished, sync)
      .on(RoomEvent.ParticipantNameChanged, sync)
      .on(RoomEvent.AudioPlaybackStatusChanged, () => !cancelled && setCanPlayAudio(room.canPlaybackAudio))
      .on(RoomEvent.MediaDevicesError, (e: Error) => !cancelled && setError(micErrorText(e)))
      .on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
        if (cancelled) return;
        if (s === ConnectionState.Reconnecting || s === ConnectionState.SignalReconnecting) setStatus("reconnecting");
        else if (s === ConnectionState.Connected) {
          setStatus("connected");
          setError("");
        }
      })
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        if (cancelled) return;
        if (reason === DisconnectReason.PARTICIPANT_REMOVED) setRemoved(true);
        setStatus("disconnected");
        setMicOn(false);
        setError(disconnectText(reason));
        sync();
      });

    (async () => {
      setStatus("joining");
      setRemoved(false);
      setError("");
      setPeople([]);
      setMicOn(false);
      try {
        // Wait a tick so a mount that is undone straight away (React strict mode) never asks for a token
        await new Promise((r) => setTimeout(r, 0));
        if (cancelled) return;
        const join = await joinRoom(serverRoomId);
        if (cancelled) return;
        setStatus("connecting");
        // The server URL comes from the join response, never from the backend's own address
        await room.connect(join.serverUrl, join.token, { autoSubscribe: true });
        if (cancelled) {
          await room.disconnect();
          return;
        }
        setStatus("connected");
        setCanPlayAudio(room.canPlaybackAudio);
        sync();
      } catch (e) {
        if (cancelled) return;
        // 403 on join: kicked or banned from this room
        if (e instanceof Error && e.name === "ApiError" && (e as Error & { status?: number }).status === 403) setRemoved(true);
        setStatus("error");
        setError(
          e instanceof Error && e.name === "ApiError"
            ? roomErrorText(e, "join")
            : e instanceof ConnectionError && e.reason === ConnectionErrorReason.NotAllowed
              ? // LiveKit refused the token the backend made (wrong API key/secret or project)
                "The voice server didn't accept this room's access. Try again later."
              : "Couldn't connect to voice. Check your connection and try again.",
        );
      }
    })();

    return () => {
      cancelled = true;
      roomRef.current = null;
      room.removeAllListeners();
      // Stops the mic track too (stopTracks defaults to true)
      void room.disconnect(true);
      audioBox.querySelectorAll("audio").forEach((el) => {
        el.pause();
        el.srcObject = null;
      });
      audioBox.remove();
    };
  }, [serverRoomId, attempt]);

  const setMic = useCallback(async (on: boolean) => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      setError("Voice isn't connected yet.");
      return false;
    }
    setMicBusy(true);
    try {
      await room.localParticipant.setMicrophoneEnabled(on);
      setError("");
      return true;
    } catch (e) {
      setError(micErrorText(e));
      return false;
    } finally {
      setMicOn(room.localParticipant.isMicrophoneEnabled);
      setPeople(snapshot(room));
      setMicBusy(false);
    }
  }, []);

  const setSpeaker = useCallback((on: boolean) => {
    speakerRef.current = on;
    const room = roomRef.current;
    if (room) for (const p of room.remoteParticipants.values()) p.setVolume(on ? 1 : 0);
  }, []);

  const startAudio = useCallback(() => {
    const room = roomRef.current;
    if (room) void room.startAudio().then(() => setCanPlayAudio(room.canPlaybackAudio));
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!serverRoomId) return null;
  return { status, error, removed, people, micOn, micBusy, canPlayAudio, setMic, setSpeaker, startAudio, retry };
}
