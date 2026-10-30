"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DAY_MS } from "./market";
import { LIBRARY, MAX_SONG_MB, REVIEW_MAX_DAYS, REVIEW_MIN_DAYS, type Contribution, type Song } from "./music";
import { ME_ID, useApp } from "./store";

const STORAGE_KEY = "panchayat-music-v1";
type Saved = { contributions: Contribution[]; favourites: string[]; volume: number };

/* Song files you contribute are kept in IndexedDB (too big for localStorage). */
const DB = "panchayat-songs";
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function putFile(id: string, file: Blob) {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction("files", "readwrite");
    tx.objectStore("files").put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function getFile(id: string): Promise<Blob | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction("files").objectStore("files").get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}
async function deleteFile(id: string) {
  const d = await db();
  d.transaction("files", "readwrite").objectStore("files").delete(id);
}

const uid = () => Math.random().toString(36).slice(2, 10);

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

function useMusicState() {
  const { activeRoomId, toast, resetCount } = useApp();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [volume, setVolumeState] = useState(0.8);
  /** Object URLs for contributed songs that are live. */
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const s = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Saved>;
      if (Array.isArray(s.contributions)) setContributions(s.contributions);
      if (Array.isArray(s.favourites)) setFavourites(s.favourites);
      if (typeof s.volume === "number") setVolumeState(s.volume);
    } catch {
      /* nothing saved */
    }
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ contributions, favourites, volume } satisfies Saved));
    } catch {
      /* storage unavailable */
    }
  }, [contributions, favourites, volume]);

  const firstReset = useRef(resetCount);
  useEffect(() => {
    if (resetCount === firstReset.current) return;
    contributions.forEach((c) => deleteFile(c.id).catch(() => {}));
    setContributions([]);
    setFavourites([]);
  }, [resetCount]); // only on reset

  // Review countdowns tick once a minute
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const isLive = useCallback((c: Contribution) => now >= c.liveAt, [now]);

  // Load the files of songs that went live
  useEffect(() => {
    let alive = true;
    contributions
      .filter((c) => now >= c.liveAt && !urls[c.id])
      .forEach((c) =>
        getFile(c.id)
          .then((f) => f && alive && setUrls((u) => ({ ...u, [c.id]: URL.createObjectURL(f) })))
          .catch(() => {}),
      );
    return () => {
      alive = false;
    };
  }, [contributions, now, urls]);

  /** Everything people can play: built-in songs plus contributions that passed review. */
  const library = useMemo<Song[]>(
    () => [...contributions.filter((c) => now >= c.liveAt && urls[c.id]).map((c) => ({ id: c.id, title: c.title, artist: c.artist, uploader: ME_ID, duration: c.duration, src: urls[c.id] })), ...LIBRARY],
    [contributions, now, urls],
  );
  const songById = useCallback((id: string) => library.find((s) => s.id === id), [library]);

  /** Send a song for review. It goes live 2–3 days later. */
  const contribute = useCallback(
    async (file: File, title: string, artist: string) => {
      if (!file.type.startsWith("audio/")) return toast("Pick an audio file (mp3, m4a, wav…)", "error"), false;
      if (file.size > MAX_SONG_MB * 1024 * 1024) return toast(`Songs can be up to ${MAX_SONG_MB} MB`, "error"), false;
      const id = `c-${uid()}`;
      try {
        await putFile(id, file);
      } catch {
        return toast("Couldn't save the song on this device", "error"), false;
      }
      const days = REVIEW_MIN_DAYS + Math.random() * (REVIEW_MAX_DAYS - REVIEW_MIN_DAYS);
      const duration = await durationOf(file);
      const at = Date.now();
      setContributions((list) => [{ id, title: title.trim(), artist: artist.trim() || "Unknown artist", duration, at, liveAt: at + days * DAY_MS }, ...list]);
      toast("Song sent for review 🎵 It goes live in 2–3 days", "gold");
      return true;
    },
    [toast],
  );
  /** Demo only: finish the review now. */
  const approveNow = useCallback((id: string) => {
    setContributions((list) => list.map((c) => (c.id === id ? { ...c, liveAt: Date.now() } : c)));
    setNow(Date.now());
  }, []);
  const removeContribution = useCallback((id: string) => {
    setContributions((list) => list.filter((c) => c.id !== id));
    deleteFile(id).catch(() => {});
  }, []);
  const toggleFavourite = useCallback((id: string) => setFavourites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [id, ...f])), []);

  /* ---- The room's player ---- */
  const audio = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [pos, setPos] = useState(0);
  const current = queue[index] ? songById(queue[index]) : undefined;

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

  // Load the current song when it changes
  const src = current?.src;
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (!src) {
      a.pause();
      a.removeAttribute("src");
      setPos(0);
      return;
    }
    if (a.src.endsWith(src)) return;
    a.src = src;
    setPos(0);
    a.play().catch(() => setPlaying(false));
  }, [src]);

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

  const order = useCallback(
    (id: string) => {
      const s = songById(id);
      if (!s) return;
      setQueue((q) => {
        if (!q.length) setIndex(0);
        return [...q, id];
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

  // Leaving the room stops its music
  useEffect(() => {
    if (activeRoomId) return;
    setQueue([]);
    setIndex(0);
    audio.current?.pause();
  }, [activeRoomId]);

  return {
    library, songById, contributions, isLive, contribute, approveNow, removeContribution, favourites, toggleFavourite, now,
    queue, index, current, playing, repeat, setRepeat, pos, volume, setVolume, order, removeFromQueue, playAt, toggle, next, seek,
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
