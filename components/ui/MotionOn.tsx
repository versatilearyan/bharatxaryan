"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Keeps animations on inside it even in Smooth graphics (battery saver), where the app stops decorative moving loops
 * (AppShell). Used for the things people expect to move: gift animations, sheets, the photo viewer and the cropper.
 */
export function MotionOn({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
