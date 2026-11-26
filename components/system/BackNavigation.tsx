"use client";

/**
 * Makes the phone's back button and back gesture (and the browser's Back) go back one step inside the app instead of leaving it:
 *   1. the top open sheet or dialog closes,
 *   2. else an open room asks "Leave this room?" first, and only actually leaves (disconnecting the voice call) once you confirm,
 *   3. else a running game asks "Leave the game?" first, and only closes it once you confirm,
 *   4. else the top screen closes (profile, chat, ...),
 *   5. else you go to the Home tab,
 *   6. on Home, Back never closes anything: in the Android app it goes to the phone's home screen (the app keeps running in
 *      the background, like Instagram, and opens again right where you were); on the website it stays on Home and scrolls up.
 * It keeps one extra browser-history entry above the page, so a Back press comes to us (popstate) instead of closing the page.
 */
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app/store";
import { runTopBack, useBackClose } from "@/lib/app/back";
import { isNativeApp, nativeEmit } from "@/lib/native/bridge";
import { Modal } from "@/components/ui/Modal";

export function BackNavigation() {
  const { tab, stack, sheet, roomOpen, setSheet, leaveRoom, pop, setTab, toast } = useApp();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmLeaveGame, setConfirmLeaveGame] = useState(false);
  const view = useRef({ tab, stack, sheet, roomOpen });
  view.current = { tab, stack, sheet, roomOpen };
  const act = useRef({ setSheet, leaveRoom, pop, setTab, toast, setConfirmLeave, setConfirmLeaveGame });
  act.current = { setSheet, leaveRoom, pop, setTab, toast, setConfirmLeave, setConfirmLeaveGame };
  const armedUntil = useRef(0);
  // A back press while either dialog is open closes just that dialog (asks nothing twice)
  useBackClose(confirmLeave, () => setConfirmLeave(false));
  useBackClose(confirmLeaveGame, () => setConfirmLeaveGame(false));

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
        // Never leave the room on a single back press: ask first, and only actually leave once confirmed
        act.current.setConfirmLeave(true);
        return true;
      }
      if (v.stack.length) {
        // Inside a game, a back gesture never throws you out of it by itself: it asks "Leave the game?" first
        const top = v.stack[v.stack.length - 1] as { kind: string; roomId?: string; table?: string; code?: string };
        const inGame = top.kind === "hill" || top.kind === "chess" || ((top.kind === "ludo" || top.kind === "jackaroo" || top.kind === "gaddar" || top.kind === "rmcs") && Boolean(top.roomId || top.table)) || (top.kind === "coop" && Boolean(top.code));
        if (inGame) {
          act.current.setConfirmLeaveGame(true);
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
      // On Home: never close the app or leave the website
      armedUntil.current = 0;
      if (isNativeApp()) {
        // The app goes to the phone's home screen and keeps running (open it again: same place)
        nativeEmit("minimizeApp");
        keep();
        return;
      }
      // Website: stay here and go back to the top of the page
      document.querySelectorAll<HTMLElement>(".app-scroll, main, [data-scroll-root]").forEach((el) => {
        if (el.scrollTop > 0) el.scrollTo({ top: 0, behavior: "smooth" });
      });
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" });
      keep();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <>
      <Modal open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Leave this room?" className="max-w-[300px] text-center">
        <p className="text-[13px] leading-relaxed text-cream/80">You'll be taken off the mic and out of the room. You can always join again.</p>
        <button
          type="button"
          onClick={() => {
            setConfirmLeave(false);
            leaveRoom();
          }}
          className="mt-4 h-11 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[14px] font-extrabold text-[#2a1a0c]"
        >
          Exit
        </button>
        <button type="button" onClick={() => setConfirmLeave(false)} className="mt-2 h-10 w-full rounded-full text-[13px] font-semibold text-cream/60">
          Stay in the room
        </button>
      </Modal>
      <Modal open={confirmLeaveGame} onClose={() => setConfirmLeaveGame(false)} title="Leave the game?" className="max-w-[300px] text-center">
        <p className="text-[13px] leading-relaxed text-cream/80">If a match is running, leaving now may count as a loss or forfeit.</p>
        <button
          type="button"
          onClick={() => {
            setConfirmLeaveGame(false);
            pop();
          }}
          className="mt-4 h-11 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[14px] font-extrabold text-[#2a1a0c]"
        >
          Exit
        </button>
        <button type="button" onClick={() => setConfirmLeaveGame(false)} className="mt-2 h-10 w-full rounded-full text-[13px] font-semibold text-cream/60">
          Stay in the game
        </button>
      </Modal>
    </>
  );
}
