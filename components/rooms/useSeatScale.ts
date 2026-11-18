"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * How big to draw the seats by screen: smaller on short phones, full size on tall screens and laptops.
 * Uses the window's height, not the visible one, so opening the keyboard doesn't resize the seats.
 */
export function useSeatScale() {
  const pick = (h: number, w: number) => {
    const byHeight = h < 640 ? 0.68 : h < 720 ? 0.76 : h < 800 ? 0.84 : h < 900 ? 0.92 : 1;
    const byWidth = w < 360 ? 0.86 : 1;
    return Math.min(byHeight, byWidth);
  };
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(pick(Math.max(window.innerHeight, document.documentElement.clientHeight), window.innerWidth));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return scale;
}

const typing = () => {
  const a = typeof document !== "undefined" ? document.activeElement : null;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || (a as HTMLElement).isContentEditable);
};

/**
 * The seat scale that keeps the chat visible whatever the number of seats.
 *
 * The seats sit above the chat and don't shrink; more seats mean more rows, and before this the extra height pushed the
 * chat (and the chat box under it) out of the room. Here the seat area is measured against the room: when the chat
 * would get less than its share (a quarter of the room, at least 120px), the seats are drawn smaller until it fits;
 * when there's room again they grow back, never past the screen's own scale. While you type nothing changes size,
 * so the keyboard doesn't make the room jump.
 */
export function useFitSeatScale(base: number, root: RefObject<HTMLElement | null>, seats: RefObject<HTMLElement | null>, chat: RefObject<HTMLElement | null>) {
  const [scale, setScale] = useState(base);
  const scaleRef = useRef(base);
  scaleRef.current = scale;

  // A new screen scale (rotation, a bigger window) starts again from it
  useLayoutEffect(() => {
    setScale(base);
  }, [base]);

  useEffect(() => {
    const r = root.current;
    const s = seats.current;
    const c = chat.current;
    if (!r || !s || !c || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rootH = r.clientHeight;
        const seatsH = s.offsetHeight;
        const chatH = c.clientHeight;
        if (!rootH || !seatsH) return;
        const want = Math.max(120, Math.round(rootH * 0.26));
        const now = scaleRef.current;
        let next = now;
        if (chatH < want - 4) {
          // Not while typing, unless the chat has almost nothing left
          if (typing() && chatH >= 72) return;
          next = now * Math.max(0.5, (seatsH - (want - chatH)) / seatsH);
        } else if (chatH > want + 24 && now < base) {
          if (typing()) return;
          next = Math.min(base, now * ((seatsH + (chatH - want)) / seatsH));
        }
        next = Math.max(0.45, Math.min(base, next));
        if (Math.abs(next - now) > 0.015) setScale(Number(next.toFixed(3)));
      });
    };
    const ro = new ResizeObserver(fit);
    ro.observe(r);
    ro.observe(s);
    ro.observe(c);
    fit();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [root, seats, chat, base]);

  return scale;
}
