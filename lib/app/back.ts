"use client";

/**
 * The back button / back gesture. Every open sheet and dialog registers here while it is open, so "back" closes the
 * top-most one first (instead of leaving the app). BackNavigation (components/system) then handles screens, the room and tabs.
 */
import { useEffect, useRef } from "react";

const handlers: { id: number; fn: () => void }[] = [];
let seq = 0;

export function registerBack(fn: () => void): () => void {
  const id = ++seq;
  handlers.push({ id, fn });
  return () => {
    const i = handlers.findIndex((h) => h.id === id);
    if (i >= 0) handlers.splice(i, 1);
  };
}

/** Closes the top-most open sheet or dialog. False when none is open. */
export function runTopBack(): boolean {
  const h = handlers[handlers.length - 1];
  if (!h) return false;
  h.fn();
  return true;
}

/** Call from a sheet or dialog: while `open`, the back button closes it. */
export function useBackClose(open: boolean, onClose: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!open) return;
    return registerBack(() => ref.current());
  }, [open]);
}
