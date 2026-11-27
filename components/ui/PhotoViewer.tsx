"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { useBackClose } from "@/lib/app/back";
import { MotionOn } from "@/components/ui/MotionOn";

/**
 * Full-screen photo view used everywhere (room chat, messages, Moments). Always easy to leave: a Back arrow at the
 * top left, an X at the top right, the phone's Back button, Esc, or a tap outside the picture. Drawn on the page's
 * own layer (portal), so a parent that moves or scales can never trap it half-way on screen.
 */
function PhotoViewerInner({ open, onClose, children, label = "Photo" }: { open: boolean; onClose: () => void; children: ReactNode; label?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useBackClose(open, onClose);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          {children}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-[calc(var(--st,0px)+10px)]">
            <button type="button" onClick={onClose} aria-label="Back" className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-white/20 pl-2.5 pr-3.5 text-[14px] font-semibold text-white backdrop-blur active:bg-white/30">
              <ArrowLeft className="h-5 w-5" /> Back
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur active:bg-white/30">
              <X className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** A single photo, fitted to the screen, for PhotoViewer. */
export function ViewerImage({ src, alt = "Photo" }: { src: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <motion.img src={src} alt={alt} draggable={false} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-full max-w-full select-none object-contain" />
  );
}

/** Stays animated in Smooth graphics too (see MotionOn). */
export function PhotoViewer(props: Parameters<typeof PhotoViewerInner>[0]) {
  return (
    <MotionOn>
      <PhotoViewerInner {...props} />
    </MotionOn>
  );
}
