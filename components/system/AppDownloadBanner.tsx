"use client";

/**
 * A ribbon under the top bar of Home that keeps running all the time, like the server-wide gift notification:
 * "Install the Panchayat app (APK) · Coming soon on Google Play" scrolls along, with a Download button.
 * Shown only in a normal browser, never inside the Android app. The small X hides it until the next visit.
 */
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { isNativeApp } from "@/lib/native/bridge";

export function useIsNativeApp(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  return native;
}

const MESSAGE = "📲 Install the Panchayat app (APK) from panchayat.world/download";
const SOON = "Coming soon on Google Play";

export function AppDownloadBanner() {
  const [ready, setReady] = useState(false);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    setReady(!isNativeApp());
  }, []);
  if (!ready || closed) return null;
  const run = (k: string) => (
    <span key={k} className="flex shrink-0 items-center gap-6 pr-6" aria-hidden={k !== "a"}>
      <span>{MESSAGE}</span>
      <span className="font-extrabold text-[#ffd98a]">{SOON}</span>
    </span>
  );
  return (
    <div role="status" aria-label="Install the Panchayat app. Coming soon on Google Play" className="px-3 pb-2">
      <div className="relative flex h-[34px] items-center overflow-hidden rounded-full bg-[linear-gradient(90deg,rgb(76_24_140/0.96),rgb(132_40_160/0.92)_55%,rgb(190_60_140/0.88))] pl-3 pr-1 shadow-[0_4px_16px_-4px_rgb(150_60_220/0.7)] ring-1 ring-[#f6d899]/55">
        <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <div className="relative min-w-0 flex-1 overflow-hidden text-[11.5px] font-bold text-white drop-shadow-[0_1px_1px_rgb(40_0_60/0.6)]">
          <div className="apk-marquee flex w-max whitespace-nowrap">
            {run("a")}
            {run("b")}
          </div>
        </div>
        <a href="/download" className="relative ml-2 flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-b from-[#fff3c4] to-[#f0c66a] px-2.5 py-[3px] text-[11px] font-extrabold text-[#5b1fa8] shadow-[0_1px_4px_rgb(0_0_0/0.25)]">
          <Download className="h-3 w-3" aria-hidden /> Download
        </a>
        <button type="button" onClick={() => setClosed(true)} aria-label="Hide for now" className="relative ml-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/70 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
