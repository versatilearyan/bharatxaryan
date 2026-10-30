"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/lib/app/store";

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[max(env(safe-area-inset-top),0px)] z-[70] flex flex-col items-center gap-2 pt-3" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className={`max-w-[88%] rounded-full px-4 py-2 text-[13px] font-semibold shadow-xl backdrop-blur ${
              t.tone === "gold" ? "bg-gradient-to-r from-[#f6d899] to-[#c9954a] text-[#2a1a0c]" : t.tone === "error" ? "bg-[#3a1418]/95 text-[#ffb0b4]" : "bg-surface-2/95 text-cream ring-1 ring-line-strong"
            }`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
