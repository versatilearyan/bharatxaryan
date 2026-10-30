"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause } from "lucide-react";

const TRACK = "/audio/panchayat-raag.mp3"; // original instrumental, see scripts/compose-music.py
const VOLUME = 0.45;

/**
 * Background music button. Browsers block autoplay with sound, and visitors
 * should choose music themselves, so it only starts when clicked.
 */
export function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  const fadeTo = (target: number, done?: () => void) => {
    const a = audioRef.current;
    if (!a) return;
    if (fadeRef.current) window.clearInterval(fadeRef.current);
    fadeRef.current = window.setInterval(() => {
      const next = a.volume + (target > a.volume ? 0.03 : -0.05);
      if ((target > a.volume && next >= target) || (target <= a.volume && next <= target)) {
        a.volume = Math.max(0, Math.min(1, target));
        if (fadeRef.current) window.clearInterval(fadeRef.current);
        done?.();
      } else {
        a.volume = Math.max(0, Math.min(1, next));
      }
    }, 40);
  };

  const toggle = async () => {
    if (!audioRef.current) {
      const a = new Audio(TRACK);
      a.loop = true;
      a.volume = 0;
      audioRef.current = a;
    }
    const a = audioRef.current;
    if (playing) {
      setPlaying(false);
      fadeTo(0, () => a.pause());
    } else {
      try {
        await a.play();
        setPlaying(true);
        fadeTo(VOLUME);
      } catch {
        setPlaying(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? "Pause music" : "Play music"}
      title={playing ? "Pause music" : "Play music: Raag Bhupali on bansuri and tabla"}
      className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
        playing ? "border-gold/50 bg-gold/10 text-gold" : "border-line-strong text-cream/80 hover:border-gold/40 hover:text-cream"
      }`}
    >
      {playing ? (
        <>
          <Pause className="h-4 w-4" aria-hidden />
          <span className="flex h-3.5 items-end gap-[3px]" aria-hidden>
            {[0, 0.2, 0.4].map((d) => (
              <span key={d} className="block h-full w-[3px] origin-bottom rounded-full bg-gold animate-eq" style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
        </>
      ) : (
        <Music className="h-4 w-4 text-gold" aria-hidden />
      )}
      <span className="hidden lg:inline">{playing ? "Music on" : "Play music"}</span>
    </button>
  );
}
