"use client";

/**
 * Makes the phone's back button and back gesture (and the browser's Back) go back one step inside the app instead of leaving it:
 *   1. the top open sheet or dialog closes,
 *   2. else an open room goes down to the mini player,
 *   3. else the top screen closes (profile, chat, ...),
 *   4. else you go to the Home tab,
 *   5. on Home, the first Back says "Press back again to exit" and the second one leaves.
 * It keeps one extra browser-history entry above the page, so a Back press comes to us (popstate) instead of closing the page.
 */
import { useEffect, useRef } from "react";
import { useApp } from "@/lib/app/store";
import { runTopBack } from "@/lib/app/back";
import { isNativeApp, nativeEmit } from "@/lib/native/bridge";

export function BackNavigation() {
  const { tab, stack, sheet, roomOpen, setSheet, minimizeRoom, pop, setTab, toast } = useApp();
  const view = useRef({ tab, stack, sheet, roomOpen });
  view.current = { tab, stack, sheet, roomOpen };
  const act = useRef({ setSheet, minimizeRoom, pop, setTab, toast });
  act.current = { setSheet, minimizeRoom, pop, setTab, toast };
  const armedUntil = useRef(0);

  useEffect(() => {
    const keep = () => {
      try {
        // Keep the state Next.js put there (it reloads the page on a Back to a state it doesn't know)
        window.history.pushState({ ...(window.history.state ?? {}), pvBack: true }, "", window.location.href);
      } catch {
        /* history is not available */
      }
    };
    keep();

    /** True when it did something. */
    const handle = (): boolean => {
      if (runTopBack()) return true;
      const v = view.current;
      if (v.sheet) {
        act.current.setSheet(null);
        return true;
      }
      if (v.roomOpen) {
        act.current.minimizeRoom();
        return true;
      }
      if (v.stack.length) {
        act.current.pop();
        return true;
      }
      if (v.tab !== "home") {
        act.current.setTab("home");
        return true;
      }
      return false;
    };

    const onPop = () => {
      if (handle()) {
        armedUntil.current = 0;
        keep();
        return;
      }
      if (Date.now() < armedUntil.current) {
        // The second Back in a row on Home: leave
        if (isNativeApp()) nativeEmit("exitApp");
        else window.history.back();
        return;
      }
      armedUntil.current = Date.now() + 2200;
      act.current.toast("Press back again to exit");
      keep();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return null;
}
