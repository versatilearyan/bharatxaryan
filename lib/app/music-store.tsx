"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { musicApi } from "@/lib/api/music";
import { LIBRARY, MAX_SONG_MB, isExternalSong, type Song } from "./music";
import { useApp } from "./store";

const STORAGE_KEY = "panchayat-music-v2";
type Saved = { favourites: string[]; volume: number };
/** Saved on its own and written the moment it changes, so a reload keeps it. */
const MUSIC_OFF_KEY = "panchayat-music-off-v1";

/** Reads an audio file's length in seconds. */
function durationOf(file: Blob) {
  return new Promise<number>((resolve) => {
    const a = new Audio();
    const url = URL.createObjectURL(file);
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      resolve(Number.isFinite(a.duration) ? Math.round(a.duration) : 0);
      URL.revokeObjectURL(url);
    };
    a.onerror = () => {
      resolve(0);
      URL.revokeObjectURL(url);
    };
    a.src = url;
  });
}

/** A song from another site, or a file on another address, needs a CORS request so it can go into the call. */
function needsCors(song?: Song) {
  if (!song?.src) return false;
  if (isExternalSong(song)) return true;
  try {
    return new URL(song.src, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function useMusicState() {
  const { activeRoomId, toast, signedIn } = useApp();
  const [favourites, setFavourites] = useState<string[]>([]);
  const [volume, setVolumeState] = useState(0.8);
  /** This listener turned room music off: the music pill is hidden and nothing plays for them. */
  const [musicOff, setMusicOffState] = useState(false);
  const setMusicOff = useCallback((off: boolean) => {
    setMusicOffState(off);
    try {
      window.localStorage.setItem(MUSIC_OFF_KEY, off ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const s = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Saved>;
      if (Array.isArray(s.favourites)) setFavourites(s.favourites);
      if (typeof s.volume === "number") setVolumeState(s.volume);
      setMusicOffState(window.localStorage.getItem(MUSIC_OFF_KEY) === "1");
    } catch {
      /* nothing saved */
    }
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ favourites, volume } satisfies Saved));
    } catch {
      /* storage unavailable */
    }
  }, [favourites, volume]);

  /* ---- The shared library: songs people uploaded (live for everyone at once) ---- */
  const [uploaded, setUploaded] = useState<Song[]>([]);
  const [loaded, setLoaded] = useState(false);
  /** Songs from Audius / Jamendo that were ordered here, so the queue can find them again. */
  const [external, setExternal] = useState<Record<string, Song>>({});
  const refreshSongs = useCallback(async () => {
    try {
      setUploaded(await musicApi.songs());
    } catch {
      /* the built-in songs still work */
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    if (signedIn) void refreshSongs();
  }, [signedIn, refreshSongs]);

  const library = useMemo<Song[]>(() => [...uploaded, ...LIBRARY.map((s) => ({ ...s, source: "built-in" as const }))], [uploaded]);
  const songById = useCallback((id: string) => library.find((s) => s.id === id) ?? external[id], [library, external]);
  const mine = useMemo(() => uploaded.filter((s) => s.mine), [uploaded]);

  /** Upload an MP3. It is in everyone's library straight away. */
  const upload = useCallback(
    async (file: File, title: string, artist: string) => {
      if (!/\.mp3$/i.test(file.name)) return toast("Pick an MP3 file", "error"), false;
      if (file.size > MAX_SONG_MB * 1024 * 1024) return toast(`Songs can be up to ${MAX_SONG_MB} MB`, "error"), false;
      try {
        const duration = await durationOf(file);
        const song = await musicApi.upload(file, title.trim(), artist.trim() || "Unknown artist", duration);
        setUploaded((l) => [song, ...l.filter((x) => x.id !== song.id)]);
        toast("Your song is live for everyone 🎵", "gold");
        return true;
      } catch (e) {
        toast(e instanceof Error && e.message ? e.message : "Couldn't upload the song", "error");
        return false;
      }
    },
    [toast],
  );
  const removeSong = useCallback(
    async (id: string) => {
      try {
        await musicApi.remove(id);
        setUploaded((l) => l.filter((s) => s.id !== id));
      } catch (e) {
        toast(e instanceof Error && e.message ? e.message : "Couldn't remove the song", "error");
      }
    },
    [toast],
  );
  const toggleFavourite = useCallback((id: string) => setFavourites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [id, ...f])), []);

  /* ---- The room's player ---- */
  const audio = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [pos, setPos] = useState(0);
  const current = queue[index] ? songById(queue[index]) : undefined;
  /** The song that could not be sent into the call (the host of the file refused the request), so it plays only here. */
  const [onlyHere, setOnlyHere] = useState<string | null>(null);

  useEffect(() => {
    const a = new Audio();
    audio.current = a;
    a.ontimeupdate = () => setPos(a.currentTime);
    a.onpause = () => setPlaying(false);
    a.onplay = () => setPlaying(true);
    return () => {
      a.pause();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);
  // Music off: silent for this listener (the room's queue carries on for everyone else)
  useEffect(() => {
    if (audio.current) audio.current.muted = musicOff;
  }, [musicOff]);

  // Load the current song when it changes
  const src = current?.src;
  const cors = needsCors(current);
  const currentId = current?.id;
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (!src) {
      a.pause();
      a.removeAttribute("src");
      setPos(0);
      return;
    }
    if (a.src.endsWith(src) && a.src !== "") return;
    a.crossOrigin = cors ? "anonymous" : null;
    a.onerror = () => {
      // The other site did not allow the request: play it for this person only, instead of nothing
      if (a.crossOrigin) {
        a.crossOrigin = null;
        a.src = src;
        setOnlyHere(currentId ?? null);
        toast("This song plays only for you", "error");
        a.play().catch(() => setPlaying(false));
      } else {
        toast("This song couldn't be played", "error");
      }
    };
    setOnlyHere(null);
    a.src = src;
    setPos(0);
    a.play().catch(() => setPlaying(false));
  }, [src, cors, currentId, toast]);

  const next = useCallback(() => {
    setIndex((i) => (queue.length ? (i + 1) % queue.length : 0));
    if (queue.length === 1 && audio.current) {
      audio.current.currentTime = 0;
      audio.current.play().catch(() => {});
    }
  }, [queue.length]);
  // At the end of a song: repeat it, or move on (the queue loops)
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.onended = () => {
      if (repeat) {
        a.currentTime = 0;
        a.play().catch(() => {});
      } else next();
    };
  }, [repeat, next]);

  /** Order a song from the library, or one found in Audius / Jamendo. */
  const order = useCallback(
    (idOrSong: string | Song) => {
      const s = typeof idOrSong === "string" ? songById(idOrSong) : idOrSong;
      if (!s) return;
      if (typeof idOrSong !== "string") setExternal((e) => ({ ...e, [s.id]: s }));
      setQueue((q) => {
        if (!q.length) setIndex(0);
        return [...q, s.id];
      });
      toast(`🎵 ${s.title} added to the room's songs`);
    },
    [songById, toast],
  );
  const removeFromQueue = useCallback(
    (at: number) => {
      setQueue((q) => q.filter((_, i) => i !== at));
      setIndex((i) => (at < i ? i - 1 : at === i && i >= queue.length - 1 ? 0 : i));
    },
    [queue.length],
  );
  const playAt = useCallback((at: number) => {
    setIndex(at);
    audio.current?.play().catch(() => {});
  }, []);
  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a || !src) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, [src]);
  const seek = useCallback((t: number) => {
    if (audio.current) audio.current.currentTime = t;
  }, []);
  const setVolume = useCallback((v: number) => setVolumeState(Math.max(0, Math.min(1, v))), []);

  const audioElement = useCallback(() => audio.current, []);

  // Leaving the room stops its music
  useEffect(() => {
    if (activeRoomId) return;
    setQueue([]);
    setIndex(0);
    audio.current?.pause();
  }, [activeRoomId]);

  return {
    library, songById, mine, loaded, refreshSongs, upload, removeSong, favourites, toggleFavourite,
    queue, index, current, playing, repeat, setRepeat, pos, volume, setVolume, order, removeFromQueue, playAt, toggle, next, seek,
    musicOff, setMusicOff, onlyHere,
    /** The element the current song plays in (streamed into a live room's call by whoever plays it). */
    audioElement,
  };
}

export type MusicState = ReturnType<typeof useMusicState>;
const Ctx = createContext<MusicState | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const state = useMusicState();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useMusic() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMusic must be used inside <MusicProvider>");
  return v;
}
