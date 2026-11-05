"use client";

import { useEffect, useState } from "react";

/**
 * How big to draw the seats so the chat and the bottom bar (chat box, mic,
 * gift) always fit on the screen: smaller on short phones, full size on tall
 * screens and laptops. Follows the visible height (address bars included).
 */
export function useSeatScale() {
  const pick = (h: number, w: number) => {
    const byHeight = h < 640 ? 0.68 : h < 720 ? 0.76 : h < 800 ? 0.84 : h < 900 ? 0.92 : 1;
    const byWidth = w < 360 ? 0.86 : 1;
    return Math.min(byHeight, byWidth);
  };
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      setScale(pick(vv?.height ?? window.innerHeight, vv?.width ?? window.innerWidth));
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  return scale;
}
