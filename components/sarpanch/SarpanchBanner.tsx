"use client";

/**
 * Notification for Sarpanch messages (sent from the admin panel or automatically):
 * a banner slides down from the top with the photo, title and text; tapping it
 * opens the Sarpanch chat. When the browser allows notifications (asked the first
 * time you tap a banner), a system notification is shown as well.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { SERVER_USER_PREFIX } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { OfficialTick, sarpanchApi } from "./Sarpanch";

export const SARPANCH_EVENT = "panchayat:sarpanch-message";
export type SarpanchNotice = { id: string; title?: string; text?: string; imageUrl?: string };

/** Called by the chat store when a SYSTEM message arrives. */
export function announceSarpanch(n: SarpanchNotice) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SarpanchNotice>(SARPANCH_EVENT, { detail: n }));
  try {
    if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
      new Notification(n.title ? `Sarpanch · ${n.title}` : "Sarpanch", { body: n.text ?? "", icon: "/icon.svg", tag: `sarpanch-${n.id}` });
    }
  } catch {
    /* notifications not available */
  }
}

let sarpanch: { userId: string; avatarUrl?: string } | null = null;

export function SarpanchBanner() {
  const { push } = useApp();
  const [n, setN] = useState<SarpanchNotice | null>(null);
  const [face, setFace] = useState<string | undefined>(sarpanch?.avatarUrl);

  useEffect(() => {
    let t: number | undefined;
    const on = (e: Event) => {
      const d = (e as CustomEvent<SarpanchNotice>).detail;
      setN(d);
      window.clearTimeout(t);
      t = window.setTimeout(() => setN(null), 7000);
      if (!sarpanch)
        sarpanchApi
          .profile()
          .then((p) => {
            sarpanch = { userId: p.userId, avatarUrl: p.avatarUrl };
            setFace(p.avatarUrl);
          })
          .catch(() => undefined);
    };
    window.addEventListener(SARPANCH_EVENT, on);
    return () => {
      window.removeEventListener(SARPANCH_EVENT, on);
      window.clearTimeout(t);
    };
  }, []);

  const open = () => {
    setN(null);
    try {
      if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    } catch {
      /* ignore */
    }
    if (sarpanch) push({ kind: "conversation", personId: `${SERVER_USER_PREFIX}${sarpanch.userId}` });
    else push({ kind: "sarpanch" });
  };

  return (
    <AnimatePresence>
      {n ? (
        <motion.div
          key={n.id}
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-3"
        >
          <div className="pointer-events-auto mt-2 w-full max-w-[440px] overflow-hidden rounded-3xl bg-gradient-to-r from-[#4a1626] via-[#2c1622] to-[#1c1824] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)] ring-1 ring-gold/40">
            <button type="button" onClick={open} className="flex w-full items-start gap-3 p-3 text-left">
              {face ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={face} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-gold" />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold/20 font-display text-lg font-bold text-gold ring-2 ring-gold">स</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[12px] font-bold text-gold">
                  Sarpanch <OfficialTick className="h-3.5 w-3.5" />
                </span>
                {n.title ? <span className="block truncate text-[14px] font-bold text-cream">{n.title}</span> : null}
                {n.text ? <span className="line-clamp-2 text-[12.5px] leading-snug text-cream/80">{n.text}</span> : null}
              </span>
              {n.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : null}
            </button>
            <button type="button" onClick={() => setN(null)} aria-label="Dismiss" className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/40 text-cream/70">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
