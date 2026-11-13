"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioPresets, ConnectionError, ConnectionErrorReason, ConnectionState, DisconnectReason, MediaDeviceFailure, Room, RoomEvent, Track, type LocalTrackPublication, type Participant, type RemoteTrack, type RemoteTrackPublication } from "livekit-client";
import { joinRoom, roomErrorText } from "@/lib/api/voice-rooms";
import { reportVoiceMetric } from "@/lib/api/voice-metrics";

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
 *
 * Staying connected: while a connection is alive the SDK does its own ICE
 * restarts and reconnects (TURN comes from the server's ICE list and is only
 * chosen when direct UDP fails). This file adds nothing to that. Only when the
 * SDK has given up, or the first connect fails, does it ask the backend for a
 * fresh token and connect the same Room again, a limited number of times, and
 * only for failures that can get better. Then it stops and offers Retry.
 *
 * What a web page can't do: when Android suspends or kills the browser, nothing
 * here runs, and a service worker can't hold a microphone or a call. The call
 * comes back when the page does (see deploy/STABILITY_AUDIT.md).
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
  /** "Title — Artist" when they're playing a song into the room. */
  music?: string;
};

/** The participant states the rooms work with. LEFT is when this hook is gone: you pressed Exit. */
export type VoiceParticipantState = "CONNECTING" | "CONNECTED" | "RECONNECTING" | "DISCONNECTED" | "LEFT";

export function voiceParticipantState(status: VoiceStatus): VoiceParticipantState {
  if (status === "connected") return "CONNECTED";
  if (status === "reconnecting") return "RECONNECTING";
  if (status === "disconnected" || status === "error") return "DISCONNECTED";
  return "CONNECTING";
}

/** Waits before each new connection after the SDK gave up: about a minute, then Retry. */
const RECOVERY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000, 30000];
/** Back in the call after this long away: tell the backend, which may have counted you as gone. */
const REANNOUNCE_AFTER_MS = 45_000;
/** How long to wait for the server's permission to talk after taking a seat. */
const PERMISSION_WAIT_MS = 4000;

/** The SDK ended the call and trying again wouldn't help (or isn't wanted). */
const FINAL_DISCONNECTS = new Set<DisconnectReason | undefined>([
  DisconnectReason.CLIENT_INITIATED,
  DisconnectReason.DUPLICATE_IDENTITY,
  DisconnectReason.PARTICIPANT_REMOVED,
  DisconnectReason.ROOM_DELETED,
]);

/** Which way the audio is really going, from the browser's selected ICE pair. No addresses are read out. */
async function mediaPath(room: Room): Promise<string> {
  try {
    const pc = room.engine?.pcManager;
    for (const transport of [pc?.subscriber, pc?.publisher]) {
      const stats = await transport?.getStats();
      if (!stats) continue;
      let pairId: string | undefined;
      stats.forEach((s: { type: string; selectedCandidatePairId?: string }) => {
        if (s.type === "transport" && s.selectedCandidatePairId) pairId = s.selectedCandidatePairId;
      });
      const pair = pairId ? stats.get(pairId) : undefined;
      const local = pair ? stats.get(pair.localCandidateId) : undefined;
      if (!local) continue;
      if (local.candidateType === "relay") return `turn_${local.relayProtocol ?? "udp"}`;
      return `direct_${local.protocol ?? "udp"}`;
    }
  } catch {
    /* only a measurement */
  }
  return "unknown";
}

/** Resolves when you may publish, or after the wait (the SDK then says why it can't). */
function waitForPublishPermission(room: Room) {
  if (room.localParticipant.permissions?.canPublish !== false) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      room.off(RoomEvent.ParticipantPermissionsChanged, onChange);
      resolve();
    };
    const onChange = () => {
      if (room.localParticipant.permissions?.canPublish) done();
    };
    const timer = setTimeout(done, PERMISSION_WAIT_MS);
    room.on(RoomEvent.ParticipantPermissionsChanged, onChange);
  });
}

/** The voice server's address from the last join, remembered so the next connection can be warmed up before its token arrives. */
const SERVER_URL_KEY = "panchayat.voiceUrl";
function rememberedServerUrl(): string | null {
  try {
    return window.localStorage.getItem(SERVER_URL_KEY);
  } catch {
    return null;
  }
}
function rememberServerUrl(url: string) {
  try {
    window.localStorage.setItem(SERVER_URL_KEY, url);
  } catch {
    /* storage unavailable: the warm-up is just skipped */
  }
}

/**
 * Looks up and opens the connection to the voice server ahead of time (DNS and TLS only: no call is
 * made), so entering a room connects sooner. Safe to call any time and as often as you like.
 */
let warmed = false;
export function warmVoiceConnection() {
  if (warmed || typeof window === "undefined") return;
  const url = rememberedServerUrl();
  if (!url) return;
  warmed = true;
  void new Room().prepareConnection(url).catch(() => {
    warmed = false;
  });
}

/** Songs go into the call as their own audio track named "music:<title>". */
const MUSIC_PREFIX = "music:";

/**
 * One Web Audio graph per <audio> element (an element can only be connected
 * once): the song keeps playing on this device's speakers, and a copy goes to
 * a stream that can be published to the room.
 */
const graphs = new WeakMap<HTMLAudioElement, { ctx: AudioContext; dest: MediaStreamAudioDestinationNode }>();
function musicStream(el: HTMLAudioElement) {
  let g = graphs.get(el);
  if (!g) {
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(el);
    const dest = ctx.createMediaStreamDestination();
    source.connect(ctx.destination);
    source.connect(dest);
    g = { ctx, dest };
    graphs.set(el, g);
  }
  if (g.ctx.state === "suspended") void g.ctx.resume();
  return g.dest.stream;
}

export type LiveVoice = {
  status: VoiceStatus;
  /** The backend has you in the room. Chat, seats and the rest don't wait for the voice connection. */
  joined: boolean;
  error: string;
  /** The server took you out of this room (kick or ban), or refused the join (full, closed): the room screen is left. */
  removed: boolean;
  /** Only about your microphone, and only when you can do something about it (blocked, not found, in use). */
  micNotice: string;
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
  /** Send a song into the call, or stop (null). */
  setMusic: (el: HTMLAudioElement | null, title: string) => void;
  /** Only these people's songs are heard (the room owner and admins). null = everyone's. */
  setMusicAllowed: (ids: string[] | null) => void;
  /** Mute other people's songs on this device. */
  setRemoteMusicMuted: (muted: boolean) => void;
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
    music: [...p.trackPublications.values()].find((t) => t.trackName?.startsWith(MUSIC_PREFIX))?.trackName.slice(MUSIC_PREFIX.length),
  }));
}

/** `serverRoomId` is the backend room id, or null for local sample rooms (then nothing connects). */
export function useLiveVoice(serverRoomId: string | null): LiveVoice | null {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [joined, setJoined] = useState(false);
  /** The room the backend has let you into, across a manual Retry. */
  const joinedRoom = useRef<string | null>(null);
  /** You had your mic on: a new connection after a drop turns it back on. */
  const wantMic = useRef(false);
  const [error, setError] = useState("");
  const [micNotice, setMicNotice] = useState("");
  const statusRef = useRef<VoiceStatus>("idle");
  statusRef.current = status;
  const [removed, setRemoved] = useState(false);
  const [people, setPeople] = useState<VoicePerson[]>([]);
  const [micOn, setMicOn] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [canPlayAudio, setCanPlayAudio] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const speakerRef = useRef(true);
  /** The song you're sending into the call, if any. */
  const musicPub = useRef<{ name: string; pub: LocalTrackPublication } | null>(null);
  /** Changes to your song run one at a time. */
  const musicQueue = useRef<Promise<unknown>>(Promise.resolve());
  const remoteMusicMuted = useRef(false);
  const musicAllowed = useRef<Set<string> | null>(null);
  const heardMusic = (identity: string) => !musicAllowed.current || musicAllowed.current.has(identity.replace(/^user[-_:]/i, ""));

  useEffect(() => {
    if (!serverRoomId) return;
    let cancelled = false;
    // A new connection: no song is going out on it yet
    musicPub.current = null;
    // disconnectOnPageLeave: by default the SDK ends the call on pagehide and on Chrome's
    // "freeze" event, which Android fires when you switch apps, and it stays ended.
    // Unmounting (Exit) still disconnects, and a page that's gone is dropped by the server.
    const room = new Room({ adaptiveStream: false, dynacast: false, disconnectOnPageLeave: false, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    roomRef.current = room;
    if (joinedRoom.current !== serverRoomId) {
      joinedRoom.current = null;
      wantMic.current = false;
    }
    let recoveries = 0;
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
    let connecting = false;
    /** The call is down: since when, to measure the reconnect. */
    let droppedAt = 0;
    /** Gave up and offered Retry; coming back online or to the page tries again once. */
    let gaveUp = false;
    /** The backend or LiveKit said no (kicked, full, wrong password...): stays ended until Retry. */
    let refused = false;
    const openedAt = performance.now();
    let joinReported = false;
    // Hidden <audio> elements for everyone else's voice
    const audioBox = document.createElement("div");
    audioBox.style.display = "none";
    audioBox.dataset.liveVoice = serverRoomId;
    document.body.appendChild(audioBox);

    const sync = () => {
      if (cancelled) return;
      // Speaking changes arrive many times a second with 20 people: only a real change re-renders the room
      const next = snapshot(room);
      setPeople((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setMicOn(room.localParticipant.isMicrophoneEnabled);
    };
    const applySpeaker = () => {
      for (const p of room.remoteParticipants.values()) p.setVolume(speakerRef.current ? 1 : 0);
    };

    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, pub: RemoteTrackPublication, participant: { identity: string }) => {
        if (track.kind !== Track.Kind.Audio) return;
        const el = track.attach();
        // Other people's songs: silent for listeners who turned music off
        if (pub.trackName?.startsWith(MUSIC_PREFIX)) {
          el.dataset.music = "1";
          el.dataset.musicFrom = participant.identity;
          // Only the room owner's and admins' songs are played for the room
          el.muted = remoteMusicMuted.current || !heardMusic(participant.identity);
        }
        audioBox.appendChild(el);
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
      .on(RoomEvent.LocalTrackUnpublished, (pub: LocalTrackPublication) => {
        // The server took away permission to talk (seat lost or muted): the song stopped going out
        if (musicPub.current?.pub === pub) musicPub.current = null;
        sync();
      })
      .on(RoomEvent.ParticipantNameChanged, sync)
      .on(RoomEvent.AudioPlaybackStatusChanged, () => !cancelled && setCanPlayAudio(room.canPlaybackAudio))
      .on(RoomEvent.MediaDevicesError, (e: Error) => !cancelled && setMicNotice(micErrorText(e)))
      .on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
        if (cancelled) return;
        if (s === ConnectionState.Reconnecting || s === ConnectionState.SignalReconnecting) {
          if (!droppedAt) droppedAt = performance.now();
          setStatus("reconnecting");
        } else if (s === ConnectionState.Connected) {
          setStatus("connected");
          setError("");
          const away = droppedAt ? performance.now() - droppedAt : 0;
          droppedAt = 0;
          if (away) reportVoiceMetric({ name: "reconnect", ms: Math.round(away) });
          void mediaPathSoon();
          // The SDK got back on its own after a long time: the backend may have counted you as gone.
          // (A new connection from recover() has just told it.)
          if (away > REANNOUNCE_AFTER_MS && !connecting) void joinRoom(serverRoomId).catch(failJoin);
        }
      })
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        if (cancelled || refused) return;
        if (reason === DisconnectReason.PARTICIPANT_REMOVED) setRemoved(true);
        setMicOn(false);
        sync();
        if (FINAL_DISCONNECTS.has(reason)) {
          droppedAt = 0;
          setStatus("disconnected");
          setError(disconnectText(reason));
          return;
        }
        // The SDK has used up its own reconnects
        if (!droppedAt) droppedAt = performance.now();
        scheduleRecovery(disconnectText(reason));
      });

    const mediaPathSoon = async () => {
      // The browser picks its ICE pair a moment after the call is up
      await new Promise((r) => setTimeout(r, 2000));
      if (!cancelled && room.state === ConnectionState.Connected) reportVoiceMetric({ name: "media_path", path: await mediaPath(room) });
    };

    /** The backend refused you (not a dropped network): nothing is retried. */
    const failJoin = (e: unknown) => {
      if (cancelled || !(e instanceof Error && e.name === "ApiError")) return;
      const status = (e as Error & { status?: number }).status ?? 0;
      if (status === 0 || status >= 500) return;
      // The server said no (kicked or banned, room full, room closed): the room screen shows its message and closes
      if (status === 403 || status === 404 || status === 409 || status === 423) setRemoved(true);
      refused = true;
      setStatus("error");
      setError(roomErrorText(e, "join"));
      room.disconnect(true).catch(() => {});
    };

    const stopRecovering = (message: string) => {
      gaveUp = true;
      setStatus("disconnected");
      setError(message);
      reportVoiceMetric({ name: "reconnect_gave_up", reason: "dropped" });
    };

    const scheduleRecovery = (message: string) => {
      if (cancelled || connecting || recoveryTimer) return;
      gaveUp = false;
      setStatus("reconnecting");
      // Offline: nothing can work, so no attempts are used until the browser says it's back (below)
      if (navigator.onLine === false) return;
      if (recoveries >= RECOVERY_DELAYS_MS.length) {
        stopRecovering(message);
        return;
      }
      recoveryTimer = setTimeout(() => {
        recoveryTimer = undefined;
        void connectNow(message);
      }, RECOVERY_DELAYS_MS[recoveries]);
      recoveries += 1;
    };

    /** One connection: a fresh token from the backend, then the same Room connects again. */
    const connectNow = async (message: string) => {
      if (cancelled || connecting) return;
      connecting = true;
      try {
        const join = await joinRoom(serverRoomId);
        if (cancelled) return;
        rememberServerUrl(join.serverUrl);
        joinedRoom.current = serverRoomId;
        setJoined(true);
        if (!joinReported) {
          joinReported = true;
          reportVoiceMetric({ name: "room_join", ms: Math.round(performance.now() - openedAt) });
        }
        if (!droppedAt) setStatus("connecting");
        const started = performance.now();
        // The server URL comes from the join response, never from the backend's own address
        await room.connect(join.serverUrl, join.token, { autoSubscribe: true });
        if (cancelled) {
          await room.disconnect();
          return;
        }
        reportVoiceMetric({ name: "voice_connect", ms: Math.round(performance.now() - started) });
        connecting = false;
        recoveries = 0;
        gaveUp = false;
        setStatus("connected");
        setError("");
        setCanPlayAudio(room.canPlaybackAudio);
        // Still inside the tap that opened the room on most browsers: start sound now if it's allowed
        if (!room.canPlaybackAudio) room.startAudio().catch(() => {});
        sync();
        if (wantMic.current) {
          // Your mic was on before the drop. If you lost your seat meanwhile, the room turns it off again.
          room.localParticipant.setMicrophoneEnabled(true).catch(() => {}).finally(sync);
        }
      } catch (e) {
        connecting = false;
        if (cancelled) return;
        const isApi = e instanceof Error && e.name === "ApiError";
        const apiStatus = isApi ? ((e as Error & { status?: number }).status ?? 0) : 0;
        if (isApi && apiStatus !== 0 && apiStatus < 500) {
          reportVoiceMetric({ name: "connect_failed", reason: "not_allowed" });
          failJoin(e);
          return;
        }
        if (e instanceof ConnectionError && e.reason === ConnectionErrorReason.NotAllowed) {
          // LiveKit refused the token the backend made (wrong API key/secret or project)
          reportVoiceMetric({ name: "connect_failed", reason: "not_allowed" });
          refused = true;
          setStatus("error");
          setError("The voice server didn't accept this room's access. Try again later.");
          return;
        }
        reportVoiceMetric({ name: "connect_failed", reason: isApi ? (apiStatus >= 500 ? "server" : "network") : e instanceof ConnectionError && e.reason === ConnectionErrorReason.Timeout ? "timeout" : "network" });
        if (!droppedAt) droppedAt = performance.now();
        scheduleRecovery(isApi ? roomErrorText(e, "join") : message);
      } finally {
        connecting = false;
      }
    };

    /** The network or the page came back: try now instead of waiting out the delay. */
    const resume = () => {
      if (cancelled || connecting || refused) return;
      if (room.state === ConnectionState.Connected || room.state === ConnectionState.Reconnecting || room.state === ConnectionState.SignalReconnecting) return;
      // A call that ended for a final reason, or was refused, stays ended
      if (!droppedAt || (!recoveryTimer && !gaveUp && navigator.onLine === false)) return;
      if (recoveryTimer) clearTimeout(recoveryTimer);
      recoveryTimer = undefined;
      if (gaveUp) recoveries = 0;
      gaveUp = false;
      setStatus("reconnecting");
      void connectNow(disconnectText());
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!room.canPlaybackAudio) room.startAudio().catch(() => {});
      resume();
    };
    /** Sound blocked by the browser: the next tap anywhere is allowed to start it. */
    const onTap = () => {
      if (!room.canPlaybackAudio) room.startAudio().catch(() => {});
    };
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("pointerdown", onTap, { passive: true });

    // Tells Android this page is playing a call. It can help the browser keep it going; it promises nothing.
    if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
      navigator.mediaSession.metadata = new MediaMetadata({ title: "Voice room", artist: "Panchayat" });
      navigator.mediaSession.playbackState = "playing";
    }

    // The address is known from the last visit: open the connection to it while the token is being made
    const known = rememberedServerUrl();
    if (known) void room.prepareConnection(known).catch(() => {});

    const opening = setTimeout(() => {
      setStatus(joinedRoom.current === serverRoomId ? "connecting" : "joining");
      setRemoved(false);
      setError("");
      setPeople([]);
      setMicOn(false);
      void connectNow(disconnectText());
      // Wait a tick so a mount that is undone straight away (React strict mode) never asks for a token
    }, 0);
    setJoined(joinedRoom.current === serverRoomId);

    return () => {
      cancelled = true;
      clearTimeout(opening);
      if (recoveryTimer) clearTimeout(recoveryTimer);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("pointerdown", onTap);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      }
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
      // Voice isn't up yet (or dropped): the mic turns on by itself once it is. If recovery had stopped, start it again.
      wantMic.current = on;
      if (statusRef.current === "disconnected" || statusRef.current === "error") setAttempt((n) => n + 1);
      return true;
    }
    setMicBusy(true);
    try {
      // Just took a seat: the server's permission to talk may land a moment after the tap
      if (on) await waitForPublishPermission(room);
      const started = performance.now();
      await room.localParticipant.setMicrophoneEnabled(on);
      if (on) reportVoiceMetric({ name: "mic_publish", ms: Math.round(performance.now() - started) });
      wantMic.current = on;
      setError("");
      setMicNotice("");
      return true;
    } catch (e) {
      if (on) reportVoiceMetric({ name: "connect_failed", reason: MediaDeviceFailure.getFailure(e) === MediaDeviceFailure.PermissionDenied ? "mic_denied" : "mic_other" });
      setMicNotice(micErrorText(e));
      return false;
    } finally {
      setMicOn(room.localParticipant.isMicrophoneEnabled);
      setPeople(snapshot(room));
      setMicBusy(false);
    }
  }, []);

  /**
   * Send a song into the call (el = the <audio> it plays in), or stop sending
   * it (null). Needs permission to talk; without it the song only plays here.
   */
  const setMusic = useCallback((el: HTMLAudioElement | null, title: string) => {
    const run = async () => {
      const room = roomRef.current;
      const name = `${MUSIC_PREFIX}${title.slice(0, 120)}`;
      const cur = musicPub.current;
      if (cur && (!el || cur.name !== name)) {
        musicPub.current = null;
        if (cur.pub.track) await room?.localParticipant.unpublishTrack(cur.pub.track, true).catch(() => {});
      }
      if (!el || !room || room.state !== ConnectionState.Connected || musicPub.current) return;
      const source = musicStream(el).getAudioTracks()[0];
      if (!source) return;
      try {
        // A copy for each send, so stopping it never stops the song on this device
        const pub = await room.localParticipant.publishTrack(source.clone(), { name, source: Track.Source.Unknown, dtx: false, red: false, audioPreset: AudioPresets.music });
        musicPub.current = { name, pub };
      } catch {
        /* no permission to talk right now: the song only plays on this device */
      }
      setPeople(snapshot(room));
    };
    musicQueue.current = musicQueue.current.then(run, run);
  }, []);

  /** Mute or unmute other people's songs on this device ("Music off"). */
  const setRemoteMusicMuted = useCallback((muted: boolean) => {
    remoteMusicMuted.current = muted;
    document.querySelectorAll<HTMLAudioElement>("[data-live-voice] audio[data-music]").forEach((a) => {
      a.muted = muted || !heardMusic(a.dataset.musicFrom ?? "");
    });
  }, []);

  /** Who may play songs in this room: the owner and the admins. Songs from anyone else stay silent here. */
  const setMusicAllowed = useCallback((ids: string[] | null) => {
    musicAllowed.current = ids ? new Set(ids) : null;
    document.querySelectorAll<HTMLAudioElement>("[data-live-voice] audio[data-music]").forEach((a) => {
      a.muted = remoteMusicMuted.current || !heardMusic(a.dataset.musicFrom ?? "");
    });
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

  // One object for as long as nothing in it changed, so a re-render above doesn't re-run everything below
  return useMemo(
    () => (serverRoomId ? { status, joined, error, removed, micNotice, people, micOn, micBusy, canPlayAudio, setMic, setSpeaker, startAudio, retry, setMusic, setMusicAllowed, setRemoteMusicMuted } : null),
    [serverRoomId, status, joined, error, removed, micNotice, people, micOn, micBusy, canPlayAudio, setMic, setSpeaker, startAudio, retry, setMusic, setMusicAllowed, setRemoteMusicMuted],
  );
}
