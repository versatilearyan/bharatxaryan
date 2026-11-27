"use client";

/**
 * Discover: three tabs.
 *  - Notice: only the notices written from the Sarpanch account (Read more / Show less on long ones)
 *  - Moments: the Moments feed (a red dot while something new was posted since you last looked)
 *  - Parivar: the Parivar list and rankings
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { momentsApi } from "@/lib/api/social";
import { readToken } from "@/lib/auth/token";
import { MomentsScreen } from "@/components/social/MomentsScreen";
import { NoticeFeed } from "./NoticeFeed";

const ParivarTab = dynamic(() => import("@/components/parivar/ParivarServer").then((m) => () => <m.ParivarListScreen embedded />), { ssr: false });

type DTab = "notice" | "moments" | "parivar";
const TAB_KEY = "panchayat.discover.tab";
const MOMENTS_SEEN_KEY = "panchayat-moments-seen";

/** A red dot on Moments while someone posted after you last opened it. */
function useMomentsDot(): [boolean, () => void] {
  const [dot, setDot] = useState(false);
  useEffect(() => {
    if (!readToken()) return;
    let live = true;
    momentsApi
      .feed("all", { limit: 1 })
      .then(({ items }) => {
        const m = items[0];
        if (!live || !m) return;
        let seen = 0;
        try {
          seen = Number(window.localStorage.getItem(MOMENTS_SEEN_KEY) ?? 0);
        } catch {
          /* private mode */
        }
        setDot(m.at > seen);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const seen = () => {
    try {
      window.localStorage.setItem(MOMENTS_SEEN_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setDot(false);
  };
  return [dot, seen];
}

const TABS: { key: DTab; label: string }[] = [
  { key: "notice", label: "Notice" },
  { key: "moments", label: "Moments" },
  { key: "parivar", label: "Parivar" },
];

export function DiscoverScreen() {
  const [tab, setTabState] = useState<DTab>("notice");
  const [momentsDot, momentsSeen] = useMomentsDot();
  useEffect(() => {
    try {
      const t = window.sessionStorage.getItem(TAB_KEY);
      if (t === "moments" || t === "parivar") setTabState(t);
    } catch {
      /* private mode */
    }
  }, []);
  useEffect(() => {
    if (tab === "moments") momentsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  const pick = (t: DTab) => {
    setTabState(t);
    try {
      window.sessionStorage.setItem(TAB_KEY, t);
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="aurora flex h-full flex-col">
      <header className="pt-safe relative z-20 shrink-0 bg-gradient-to-b from-[#0a0712]/80 to-[#0a0712]/40 backdrop-blur-xl">
        <div className="flex h-14 items-center px-4">
          <h1 className="bg-gradient-to-r from-[#fff1c9] via-gold to-[#ffb37a] bg-clip-text font-display text-[26px] font-extrabold text-transparent">Discover</h1>
        </div>
        <div role="tablist" aria-label="Discover" className="flex gap-6 px-4 pb-2">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => pick(t.key)} className={`relative pb-2 font-display text-[16px] font-extrabold transition-colors ${on ? "text-cream" : "text-cream/45"}`}>
                {t.label}
                {t.key === "moments" && momentsDot ? <span className="absolute -right-2.5 top-1 h-2 w-2 rounded-full bg-coral" aria-label="new" /> : null}
                {on ? <motion.span layoutId="discover-tab" className="absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-gradient-to-r from-[#f6d899] to-coral" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
              </button>
            );
          })}
        </div>
      </header>

      {tab === "moments" ? (
        <div className="min-h-0 flex-1">
          <MomentsScreen embedded />
        </div>
      ) : tab === "parivar" ? (
        <div className="min-h-0 flex-1">
          <ParivarTab />
        </div>
      ) : (
        <div className="app-scroll min-h-0 flex-1 pb-[calc(100px+var(--mini,0px)+var(--sb))]">
          <NoticeFeed />
        </div>
      )}
    </div>
  );
}
