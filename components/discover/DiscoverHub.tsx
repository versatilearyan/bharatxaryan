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
import { fetchDailyTasks } from "@/components/sheets/ServerTasks";

const SEEN_KEY = "panchayat-moments-seen";

function TileArt({ kind }: { kind: "cp" | "ranking" | "tasks" }) {
  if (kind === "cp")
    return (
      <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden>
        <defs>
          <linearGradient id="dh-cp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff9ac0" />
            <stop offset="1" stopColor="#e2366f" />
          </linearGradient>
        </defs>
        <path d="M12 22 32 8l20 14v26a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z" fill="url(#dh-cp)" />
        <circle cx="26" cy="38" r="9" fill="none" stroke="#fff5f8" strokeWidth="3.5" />
        <circle cx="38" cy="38" r="9" fill="none" stroke="#ffd6e4" strokeWidth="3.5" />
        <path d="M32 16l3 4h-6Z" fill="#fff" opacity=".9" />
      </svg>
    );
  if (kind === "ranking")
    return (
      <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden>
        <defs>
          <linearGradient id="dh-rk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1c9" />
            <stop offset=".5" stopColor="#e7bc72" />
            <stop offset="1" stopColor="#a8701f" />
          </linearGradient>
        </defs>
        <path d="M20 10h24v14a12 12 0 0 1-24 0Z" fill="url(#dh-rk)" />
        <path d="M20 14h-7a7 7 0 0 0 7 9M44 14h7a7 7 0 0 1-7 9" fill="none" stroke="#e7bc72" strokeWidth="3" />
        <rect x="29" y="35" width="6" height="8" fill="#c88f35" />
        <rect x="21" y="43" width="22" height="7" rx="2" fill="url(#dh-rk)" />
        <path d="m32 15 2 4.2 4.6.6-3.3 3.2.8 4.5L32 25.3l-4.1 2.2.8-4.5-3.3-3.2 4.6-.6Z" fill="#fff8e6" />
      </svg>
    );
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden>
      <defs>
        <linearGradient id="dh-tk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9a4ff" />
          <stop offset="1" stopColor="#6a45e8" />
        </linearGradient>
      </defs>
      <rect x="14" y="10" width="36" height="44" rx="7" fill="url(#dh-tk)" />
      <rect x="24" y="6" width="16" height="9" rx="3" fill="#e7bc72" />
      {[22, 32, 42].map((y, i) => (
        <g key={y}>
          <circle cx="23" cy={y} r="3.2" fill={i < 2 ? "#4fd6a5" : "#ffffff55"} />
          <rect x="30" y={y - 2} width="14" height="4" rx="2" fill="#ffffffcc" />
        </g>
      ))}
    </svg>
  );
}

export function DiscoverHub() {
  const { push, setSheet, sheet } = useApp();
  const [claimable, setClaimable] = useState(0);
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

  // A dot on Tasks when a reward is ready to claim (rechecked when the tasks sheet closes)
  useEffect(() => {
    if (!readToken() || sheet) return;
    fetchDailyTasks()
      .then((t) => setClaimable(t.filter((x) => x.done && !x.claimed).length))
      .catch(() => undefined);
  }, [sheet]);

  const openMoments = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setFresh(false);
    push({ kind: "moments" });
  };

  const tiles: { key: "cp" | "ranking" | "tasks"; label: string; dot?: boolean; onClick: () => void }[] = [
    { key: "cp", label: "CP", onClick: () => push({ kind: "intimate-space", personId: "me" }) },
    { key: "ranking", label: "Ranking", onClick: () => push({ kind: "ranking" }) },
    { key: "tasks", label: "Tasks", dot: claimable > 0, onClick: () => setSheet({ kind: "tasks" }) },
  ];

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

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {tiles.map((t) => (
          <motion.button key={t.key} whileTap={{ scale: 0.95 }} type="button" onClick={t.onClick} className={`relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b pb-3.5 pt-4 ring-1 ring-gold/20 ${t.key === "cp" ? "from-[#5a1a36] to-[#1f1420]" : t.key === "ranking" ? "from-[#5a3a14] to-[#1f1814]" : "from-[#33206b] to-[#18142a]"}`}>
            <motion.span whileHover={{ y: -2 }}>
              <TileArt kind={t.key} />
            </motion.span>
            <span className="relative font-display text-[15px] font-bold text-cream">
              {t.label}
              {t.dot ? <span className="absolute -right-2.5 -top-0.5 h-2 w-2 rounded-full bg-coral" /> : null}
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
