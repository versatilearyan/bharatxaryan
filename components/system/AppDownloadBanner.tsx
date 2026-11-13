"use client";

/**
 * A notification-style banner at the top of the website: "Download the Panchayat app (APK). Coming soon on Google Play."
 * Shown only in a normal browser (never inside the Android app itself). Closing it hides it for 3 days.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { isNativeApp } from "@/lib/native/bridge";

const KEY = "panchayat.apkBanner.hiddenUntil";
const HIDE_MS = 3 * 24 * 3600 * 1000;

export function useIsNativeApp(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  return native;
}

export function AppDownloadBanner() {
  const native = useIsNativeApp();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isNativeApp()) return;
    let until = 0;
    try {
      until = Number(window.localStorage.getItem(KEY) ?? 0);
    } catch {
      /* storage blocked: show it */
    }
    if (Date.now() < until) return;
    const t = window.setTimeout(() => setShow(true), 1800);
    return () => window.clearTimeout(t);
  }, []);

  const hide = () => {
    setShow(false);
    try {
      window.localStorage.setItem(KEY, String(Date.now() + HIDE_MS));
    } catch {
      /* ignore */
    }
  };

  if (native) return null;
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-3"
        >
          <div role="status" className="pointer-events-auto relative mt-2 w-full max-w-[440px] overflow-hidden rounded-3xl bg-gradient-to-r from-[#3a2a14] via-[#2a1a0c] to-[#1c1824] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)] ring-1 ring-gold/40">
            <a href="/download" onClick={hide} className="flex w-full items-center gap-3 p-3 pr-10 text-left">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold/20 text-gold ring-2 ring-gold">
                <Download className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-cream">Download the Panchayat app (APK)</span>
                <span className="block text-[12px] leading-snug text-cream/75">Coming soon on Google Play</span>
              </span>
              <span className="shrink-0 rounded-full bg-gold px-3 py-1.5 text-[12px] font-extrabold text-ink">Download</span>
            </a>
            <button type="button" onClick={hide} aria-label="Dismiss" className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/40 text-cream/70">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
