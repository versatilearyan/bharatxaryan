"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { playerErrorMessage, watchUrl } from "@/lib/app/youtube";

/* Minimal typing for the YouTube IFrame Player API */
type YTPlayer = {
  destroy: () => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime?: () => number;
  /** -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued */
  getPlayerState?: () => number;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: { onError?: (e: { data: number }) => void; onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Loads YouTube's official IFrame API once. Rejects if it can't load in time. */
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube API unavailable"));
    };
    document.head.appendChild(tag);
    window.setTimeout(() => !window.YT?.Player && reject(new Error("timeout")), 8000);
  });
  return apiPromise;
}

/**
 * Embedded YouTube player using YouTube's supported embed. Errors for
 * private, removed, age-restricted or non-embeddable videos are caught and
 * shown as a friendly message instead of a broken player.
 */
/**
 * Watching together in a backend room: the room's shared play state.
 * key changes with every update from the server; positionNow() is where the
 * video should be right now. canControl: your play/pause goes to everyone.
 */
export type VideoSync = {
  key: string;
  playing: boolean;
  positionNow: () => number;
  canControl: boolean;
  onControl: (action: "play" | "pause", position: number) => void;
};

export function YouTubePlayer({ videoId, onChooseAnother, sync }: { videoId: string; onChooseAnother: () => void; sync?: VideoSync }) {
  const mount = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<number | null>(null);
  const [fallback, setFallback] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const ready = useRef(false);
  const syncRef = useRef(sync);
  syncRef.current = sync;
  /** Changes made by this code (not the person) are ignored until then. */
  const quietUntil = useRef(0);

  /** Line the player up with the room: same position (within 2 s), playing or paused. */
  const follow = useCallback(() => {
    const p = playerRef.current;
    const s = syncRef.current;
    if (!p || !ready.current || !s) return;
    quietUntil.current = Date.now() + 1500;
    const want = Math.max(0, s.positionNow());
    const have = p.getCurrentTime?.() ?? 0;
    if (Math.abs(have - want) > 2) p.seekTo?.(want, true);
    const state = p.getPlayerState?.();
    if (s.playing && state !== 1 && state !== 3) p.playVideo?.();
    if (!s.playing && (state === 1 || state === 3)) p.pauseVideo?.();
  }, []);
  // Every update from the room, and a drift check every few seconds
  useEffect(() => follow(), [sync?.key, follow]);
  useEffect(() => {
    if (!sync) return;
    const t = window.setInterval(follow, 5000);
    return () => window.clearInterval(t);
  }, [Boolean(sync), follow]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setError(null);
    setFallback(false);
    let player: YTPlayer | null = null;
    let cancelled = false;
    ready.current = false;
    loadApi()
      .then((YT) => {
        if (cancelled || !mount.current) return;
        const el = document.createElement("div");
        mount.current.replaceChildren(el);
        player = new YT.Player(el, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
          events: {
            onError: (e) => setError(e.data),
            onReady: () => {
              ready.current = true;
              follow();
            },
            onStateChange: (e) => {
              const s = syncRef.current;
              const p = playerRef.current;
              if (!s || !p || Date.now() < quietUntil.current) return;
              if (e.data !== 1 && e.data !== 2) return;
              // Someone who may control it played, paused or jumped: tell the room. Anyone else snaps back to the room.
              if (s.canControl) s.onControl(e.data === 1 ? "play" : "pause", p.getCurrentTime?.() ?? 0);
              else window.setTimeout(follow, 300);
            },
          },
        });
        playerRef.current = player;
      })
      .catch(() => !cancelled && setFallback(true));
    return () => {
      cancelled = true;
      ready.current = false;
      playerRef.current = null;
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
    };
  }, [videoId, follow]);

  return (
    <div className="relative h-full w-full bg-black">
      {fallback ? (
        <iframe
          className="h-full w-full bg-black"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <div ref={mount} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
      )}
      {error !== null ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0c0b0f]/95 p-5 text-center">
          <p className="text-sm font-semibold text-cream">Can&apos;t play this video here</p>
          <p className="text-[12px] leading-snug text-muted">{playerErrorMessage(error)}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onChooseAnother} className="flex items-center gap-1.5 rounded-full bg-coral px-3.5 py-2 text-[12px] font-bold text-white">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Choose another
            </button>
            <a href={watchUrl(videoId)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-cream/10 px-3.5 py-2 text-[12px] font-bold text-cream">
              Open on YouTube <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** YouTube wordmark-style play logo (red rounded rectangle with white triangle). */
export function YouTubeMark({ className = "h-7 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} aria-hidden>
      <rect width="28" height="20" rx="5" fill="#ff0033" />
      <path d="M11 5.5 L19 10 L11 14.5 Z" fill="#fff" />
    </svg>
  );
}
