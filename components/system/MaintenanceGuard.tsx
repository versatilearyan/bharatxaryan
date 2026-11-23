"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";
import { Logo } from "@/components/brand/Logo";

type Status = { maintenance: boolean; message: string; until: number | null; announcement: string };

/** Shared by MaintenanceGuard and AnnouncementBanner, so there's one poll of /api/v1/status, not two. */
function useAppStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!API_BASE_URL) return;
    let live = true;
    const check = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/v1/status`, { cache: "no-store" });
        if (!r.ok) return;
        const s = (await r.json()) as Status;
        if (live) setStatus(s);
      } catch {
        // offline: leave whatever we last knew on screen
      }
    };
    void check();
    timer.current = window.setInterval(() => void check(), 15_000);
    return () => {
      live = false;
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  return status;
}

/**
 * Full-screen block while maintenance mode is on (admin panel's Settings page). Polls the
 * backend's public /api/v1/status directly — that endpoint always answers, maintenance or not,
 * so this works even while every other request is being turned away. Clears itself the moment
 * staff turn maintenance back off, no refresh needed.
 */
export function MaintenanceGuard() {
  const status = useAppStatus();
  if (!status?.maintenance) return null;
  return <MaintenanceScreen message={status.message} until={status.until} />;
}

function MaintenanceScreen({ message, until }: { message: string; until: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const minutesLeft = until ? Math.max(0, Math.ceil((until - now) / 60_000)) : null;

  return (
    <div
      role="alert"
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-6 bg-ink px-6 text-center"
      style={{ backgroundImage: "radial-gradient(60% 50% at 50% 30%, rgb(231 188 114 / 0.08), transparent)" }}
    >
      <Logo size="2.4rem" sparkle />
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold/40">
        <span className="h-9 w-9 animate-spin rounded-full border-2 border-gold border-t-transparent" aria-hidden />
      </div>
      <div className="max-w-[420px] space-y-2">
        <h1 className="text-xl font-extrabold text-cream">We're briefly closing for maintenance</h1>
        <p className="text-[15px] leading-relaxed text-muted">{message}</p>
        {minutesLeft !== null ? (
          <p className="text-sm font-semibold text-gold">
            {minutesLeft > 0 ? `Back in about ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}` : "Just a little longer…"}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full border border-gold/40 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10"
      >
        Try again
      </button>
    </div>
  );
}

const DISMISSED_KEY = "panchayat-announcement-dismissed";

/**
 * A slim banner at the top of the screen for whatever's in the Settings page's Announcement field
 * (a sale, an event, "update the app" — plain text, staff's choice). Empty = nothing shows. Someone
 * who closes it won't see that exact text again, but a new announcement (the text changed) shows
 * even if they'd dismissed an earlier one.
 */
export function AnnouncementBanner() {
  const status = useAppStatus();
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISSED_KEY));
    } catch {
      /* storage unavailable */
    }
  }, []);
  const text = status?.announcement?.trim();
  if (status?.maintenance || !text || text === dismissed) return null;

  const dismiss = () => {
    setDismissed(text);
    try {
      window.localStorage.setItem(DISMISSED_KEY, text);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <div role="status" className="fixed inset-x-0 top-[var(--st)] z-[150] flex items-center gap-2 bg-gradient-to-r from-coral/95 to-pink/90 px-4 py-2 text-[13px] font-semibold text-white shadow-lg">
      <span className="min-w-0 flex-1 truncate">{text}</span>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="shrink-0 rounded-full p-1 leading-none hover:bg-white/15">
        ✕
      </button>
    </div>
  );
}
