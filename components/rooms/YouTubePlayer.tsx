"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { playerErrorMessage, watchUrl } from "@/lib/app/youtube";

/* Minimal typing for the YouTube IFrame Player API */
type YTPlayer = { destroy: () => void };
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: { onError?: (e: { data: number }) => void; onReady?: () => void };
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
export function YouTubePlayer({ videoId, onChooseAnother }: { videoId: string; onChooseAnother: () => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<number | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    setError(null);
    setFallback(false);
    let player: YTPlayer | null = null;
    let cancelled = false;
    loadApi()
      .then((YT) => {
        if (cancelled || !mount.current) return;
        const el = document.createElement("div");
        mount.current.replaceChildren(el);
        player = new YT.Player(el, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
          events: { onError: (e) => setError(e.data) },
        });
      })
      .catch(() => !cancelled && setFallback(true));
    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
    };
  }, [videoId]);

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
