"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Play, Volume2, VolumeX } from "lucide-react";

/**
 * A video that plays the app's way, not the browser's: no control bar. It plays by itself (muted, looping) only while
 * it's on screen and pauses when scrolled away, so a feed of videos stays smooth. Tap = pause / play, the speaker
 * button = sound on / off, a thin line shows the progress, and a spinner shows while it's loading.
 */
export function SmoothVideo({ src, className = "", sound = false, fit = "cover" }: { src: string; className?: string; sound?: boolean; fit?: "cover" | "contain" }) {
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(!sound);
  const [paused, setPaused] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Play only while at least half of it is on screen
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && e.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (visible && !userPaused) {
      v.play().catch(() => {
        // Sound blocked before a tap: play muted instead
        v.muted = true;
        setMuted(true);
        void v.play().catch(() => undefined);
      });
    } else {
      v.pause();
    }
  }, [visible, userPaused]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      setUserPaused(false);
      void v.play().catch(() => undefined);
    } else {
      setUserPaused(true);
      v.pause();
    }
  };

  return (
    <div ref={box} className={`relative overflow-hidden bg-black ${className}`}>
      <video
        ref={ref}
        src={visible || !paused ? src : undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        onClick={toggle}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) setProgress(v.currentTime / v.duration);
        }}
        className={`block h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
      />
      {waiting && visible && !userPaused ? (
        <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
          <Loader2 className="h-7 w-7 animate-spin text-white/80" />
        </span>
      ) : null}
      {userPaused ? (
        <button type="button" onClick={toggle} className="absolute inset-0 grid place-items-center bg-black/25" aria-label="Play">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-black/50 backdrop-blur">
            <Play className="h-7 w-7 translate-x-0.5 fill-white text-white" />
          </span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          const v = ref.current;
          const next = !muted;
          setMuted(next);
          if (v) v.muted = next;
        }}
        aria-label={muted ? "Sound on" : "Sound off"}
        className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/15" aria-hidden>
        <span className="block h-full bg-white/85 transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
      </span>
    </div>
  );
}
