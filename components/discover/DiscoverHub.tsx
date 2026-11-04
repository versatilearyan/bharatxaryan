"use client";

/**
 * Top of Discover: a Moments row (newest poster's photo, a dot when there's
 * something new since you last looked) and three tiles: CP, Parivar and Nearby.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { momentsApi } from "@/lib/api/social";
import { readToken } from "@/lib/auth/token";
import { useApp } from "@/lib/app/store";

const SEEN_KEY = "panchayat-moments-seen";

function TileArt({ kind }: { kind: "parivar" }) {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden>
      <defs>
        <linearGradient id="dh-pv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc06b" />
          <stop offset="1" stopColor="#f2652e" />
        </linearGradient>
      </defs>
      <path d="M14 10h36v34L32 56 14 44Z" fill="url(#dh-pv)" />
      <path d="M14 10h36v6H14Z" fill="#ffe2b0" opacity=".7" />
      <path d="m32 22 3.6 7.3 8 1.2-5.8 5.6 1.4 8L32 40.3l-7.2 3.8 1.4-8-5.8-5.6 8-1.2Z" fill="#fff6e6" />
    </svg>
  );
}

export function DiscoverHub() {
  const { push, toast } = useApp();
  const [latest, setLatest] = useState<{ avatarUrl?: string; name: string; at: number } | null>(null);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    if (!readToken()) return;
    let live = true;
    momentsApi
      .feed("all", { limit: 1 })
      .then(({ items }) => {
        const m = items[0];
        if (!live || !m) return;
        setLatest({ avatarUrl: m.author.avatarUrl, name: m.author.name, at: m.at });
        let seen = 0;
        try {
          seen = Number(window.localStorage.getItem(SEEN_KEY) ?? 0);
        } catch {
          /* private mode */
        }
        setFresh(m.at > seen);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const openMoments = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setFresh(false);
    push({ kind: "moments" });
  };

  return (
    <section className="mt-4 px-4" aria-label="Discover">
      <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={openMoments} className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#4a1626] via-[#2c1622] to-[#1c1824] px-4 py-3.5 text-left ring-1 ring-gold/25 shadow-[0_10px_30px_-16px_rgba(244,81,91,0.6)]">
        <span className="flex-1 font-display text-[18px] font-bold text-cream">Moments</span>
        {latest ? (
          <span className="relative">
            {latest.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={latest.avatarUrl} alt={latest.name} className="h-8 w-8 rounded-full object-cover ring-2 ring-ink" />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-coral text-[13px] font-bold text-white">{latest.name.slice(0, 1)}</span>
            )}
            {fresh ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-surface" aria-label="New moments" /> : null}
          </span>
        ) : null}
        <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => toast("Parivar is coming soon. Get your people ready! 🪔")}
        className="relative mt-3 flex w-full items-center gap-3.5 overflow-hidden rounded-3xl bg-gradient-to-r from-[#5a2a14] via-[#3a1420] to-[#1c1824] p-3 pr-4 text-left ring-1 ring-gold/30 shadow-[0_12px_30px_-16px_rgba(231,188,114,0.5)]"
      >
        <motion.span
          className="pointer-events-none absolute -left-10 top-0 h-full w-14 rotate-12 bg-white/10 blur-md"
          animate={{ x: ["0%", "1100%"] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
          aria-hidden
        />
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-black/25 ring-1 ring-gold/25">
          <TileArt kind="parivar" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block bg-gradient-to-r from-[#fff1c9] via-gold to-[#ffb37a] bg-clip-text font-display text-[19px] font-extrabold text-transparent">Parivar</span>
          <span className="block text-[12.5px] leading-snug text-cream/70">Families with a Mukhiya, levels, a tag on your name and your own chat.</span>
        </span>
        <span className="shrink-0 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-gold ring-1 ring-gold/40">Coming soon</span>
      </motion.button>
    </section>
  );
}
