"use client";

import { useEffect, useId, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type Props = { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; className?: string };

/** Centered dialog inside the app container. */
export function Modal({ open, onClose, title, children, className = "" }: Props) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-50 grid place-items-center p-5" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative w-full rounded-3xl border border-line-strong bg-ink-2 p-5 shadow-2xl ${className}`}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id={titleId} className="font-display text-lg font-bold text-cream">
                {title}
              </h2>
              <button type="button" onClick={onClose} className="-mr-1 -mt-1 grid h-9 w-9 place-items-center rounded-full bg-cream/5 text-muted hover:text-cream" aria-label="Close">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
