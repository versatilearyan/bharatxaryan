"use client";

import { useEffect, useId, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Extra classes for the panel (e.g. a VIP surface). */
  className?: string;
  /** Max height as a fraction of the app height. */
  tall?: boolean;
  headerRight?: ReactNode;
};

/**
 * Bottom sheet that lives inside the mobile app container (absolute, not fixed),
 * so on desktop it stays within the centered app instead of spanning the window.
 */
export function BottomSheet({ open, onClose, title, children, className = "", tall = false, headerRight }: Props) {
  const titleId = useId();
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative flex flex-col rounded-t-[28px] border-t border-line-strong bg-ink-2 shadow-[0_-20px_60px_rgb(0_0_0/0.5)] ${tall ? "max-h-[88%]" : "max-h-[78%]"} ${className}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="shrink-0 cursor-grab touch-none pb-1 pt-2.5" onPointerDown={(e) => drag.start(e)} aria-hidden>
              <div className="mx-auto h-1 w-10 rounded-full bg-cream/20" />
            </div>
            {title ? (
              <div className="flex shrink-0 touch-none items-center justify-between gap-3 px-5 pb-2 pt-2" onPointerDown={(e) => drag.start(e)}>
                <h2 id={titleId} className="font-display text-lg font-bold text-cream">
                  {title}
                </h2>
                <div className="flex items-center gap-2">
                  {headerRight}
                  <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-cream/5 text-muted hover:text-cream" aria-label="Close">
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ) : null}
            <div className="app-scroll min-h-0 flex-1 pb-safe">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
