"use client";

/**
 * Makes the phone's back button and back gesture (and the browser's Back) go back one step inside the app instead of leaving it:
 *   1. the top open sheet or dialog closes,
 *   2. else an open room asks "Leave this room?" first, and only minimizes to the mini player once you confirm,
 *   3. else the top screen closes (profile, chat, ...),
 *   4. else you go to the Home tab,
 *   5. on Home, the first Back says "Press back again to exit" and the second one leaves.
 * It keeps one extra browser-history entry above the page, so a Back press comes to us (popstate) instead of closing the page.
 */
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app/store";
import { runTopBack, useBackClose } from "@/lib/app/back";
import { isNativeApp, nativeEmit } from "@/lib/native/bridge";
import { Modal } from "@/components/ui/Modal";

export function BackNavigation() {
  const { tab, stack, sheet, roomOpen, setSheet, minimizeRoom, pop, setTab, toast } = useApp();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const view = useRef({ tab, stack, sheet, roomOpen });
  view.current = { tab, stack, sheet, roomOpen };
  const act = useRef({ setSheet, minimizeRoom, pop, setTab, toast, setConfirmLeave });
  act.current = { setSheet, minimizeRoom, pop, setTab, toast, setConfirmLeave };
  const armedUntil = useRef(0);
  // A back press while the "Leave this room?" dialog is open closes just the dialog (asks nothing twice)
  useBackClose(confirmLeave, () => setConfirmLeave(false));

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
        // Never leave the room on a single back press: ask first, and only minimize (to the mini player) once confirmed
        act.current.setConfirmLeave(true);
        return true;
      }
      if (v.stack.length) {
        // Inside a game, a back gesture never throws you out of it: the app goes to the phone's home screen
        // (the game keeps going and you come back to it); on the website you're told to use the game's own Exit
        const top = v.stack[v.stack.length - 1] as { kind: string; roomId?: string; table?: string };
        const inGame = top.kind === "hill" || top.kind === "chess" || ((top.kind === "ludo" || top.kind === "jackaroo" || top.kind === "gaddar" || top.kind === "rmcs") && Boolean(top.roomId || top.table));
        if (inGame) {
          if (isNativeApp()) nativeEmit("minimizeApp");
          else act.current.toast("Game chal raha hai. Bahar jaane ke liye game ka Exit button dabao.");
          return true;
        }
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

  return (
    <Modal open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Leave this room?" className="max-w-[300px] text-center">
      <p className="text-[13px] leading-relaxed text-cream/80">It keeps running in the background — you can still listen and come back any time.</p>
      <button
        type="button"
        onClick={() => {
          setConfirmLeave(false);
          minimizeRoom();
        }}
        className="mt-4 h-11 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[14px] font-extrabold text-[#2a1a0c]"
      >
        Exit
      </button>
      <button type="button" onClick={() => setConfirmLeave(false)} className="mt-2 h-10 w-full rounded-full text-[13px] font-semibold text-cream/60">
        Stay in the room
      </button>
    </Modal>
  );
}
