"use client";

/**
 * Tells people using an old Android app (the APK from our website) that a new version is ready.
 * The app says which build it is in its user agent ("PanchayatBuild/4"); apps made before that
 * say nothing and count as build 0. When the newest build is higher, a small dialog offers the
 * download. "Later" remembers this build in localStorage (not sessionStorage, which the Android
 * WebView can forget every time the app is reopened) so it doesn't nag again until a newer build
 * ships. Never shown in a browser or in the Google Play build (Play updates the app by itself).
 */
import { useEffect, useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { isNativeApp } from "@/lib/native/bridge";

/** Raise this together with the app's versionCode every time a new APK is put on the server (1.0.7 = build 8). */
export const LATEST_APP_BUILD = 8;
export const LATEST_APP_VERSION = "1.0.7";

const SEEN = "panchayat.updatePrompt";

export function appBuild(ua: string): number {
  const m = /PanchayatBuild\/(\d+)/.exec(ua);
  return m ? Number(m[1]) : 0;
}

export function AppUpdatePrompt() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!isNativeApp() || /PanchayatPlay/.test(navigator.userAgent)) return;
    if (appBuild(navigator.userAgent) >= LATEST_APP_BUILD) return;
    try {
      // Dismissed this exact build already: a newer build (a higher number) still prompts again
      if (Number(localStorage.getItem(SEEN)) === LATEST_APP_BUILD) return;
    } catch {
      /* storage blocked: show it */
    }
    const t = window.setTimeout(() => setOpen(true), 2500);
    return () => window.clearTimeout(t);
  }, []);
  const later = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN, String(LATEST_APP_BUILD));
    } catch {
      /* ignore */
    }
  };
  return (
    <Modal open={open} onClose={later} title="New version available" className="max-w-[340px] text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold">
        <Sparkles className="h-7 w-7" aria-hidden />
      </span>
      <p className="mt-3 text-[13px] leading-relaxed text-cream/80">
        Panchayat {LATEST_APP_VERSION} is ready, with steady room seats, chest rewards you can use from your Bag and smoother rooms. Update the app to use all the new features.
      </p>
      <a href="/download/apk" onClick={later} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[14px] font-extrabold text-[#2a1a0c]">
        <Download className="h-4 w-4" aria-hidden /> Update now
      </a>
      <button type="button" onClick={later} className="mt-2 h-10 w-full rounded-full text-[13px] font-semibold text-cream/60">
        Later
      </button>
    </Modal>
  );
}
