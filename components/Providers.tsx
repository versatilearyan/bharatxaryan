"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { FestivalProvider } from "@/components/festival/FestivalProvider";
import { FestivalDecor } from "@/components/festival/FestivalDecor";

/** Framer Motion respects the OS "reduce motion" setting everywhere. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <FestivalProvider>
        {children}
        <FestivalDecor />
      </FestivalProvider>
    </MotionConfig>
  );
}
