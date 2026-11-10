"use client";

import { useEffect, useState } from "react";

/**
 * Makes sure everybody runs the latest release. Pages that were opened before a deploy keep the old code in memory, so
 * this asks the server which build is live (when the page opens, when the person comes back to it, and every few
 * minutes). When a newer build is out it offers "Update", and reloads by itself if the app was left in the background
 * for a while, so nobody is cut off in the middle of a voice room.
 */
export function VersionGuard() {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let first: string | null = null;
    let hiddenAt = 0;
    let isStale = false;
    const check = async () => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const { id } = (await r.json()) as { id?: string };
        if (!id || id === "dev") return;
        if (first === null) first = id;
        else if (id !== first) {
          isStale = true;
          setStale(true);
        }
      } catch {
        // offline: try again later
      }
    };
    void check();
    const t = window.setInterval(() => document.visibilityState === "visible" && void check(), 5 * 60_000);
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      // Back after a while in the background: update quietly if a new release is out
      if (isStale && hiddenAt && Date.now() - hiddenAt > 2 * 60_000) window.location.reload();
      else void check();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  if (!stale) return null;
  return (
    <div role="status" className="pt-safe fixed inset-x-0 top-0 z-[200] flex justify-center px-3 pt-2">
      <button type="button" onClick={() => window.location.reload()} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f6d899] to-[#d9a84f] px-4 py-2 text-[13px] font-extrabold text-[#2a1a0c] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)]">
        ✨ A new version is ready · Update
      </button>
    </div>
  );
}
