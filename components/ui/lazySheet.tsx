"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * Whether a sheet should exist right now: while it is open, and for a moment after it closes so its closing animation can play.
 * A closed sheet doesn't need to be built at all (some of them draw hundreds of things).
 */
export function useKeepMounted(open: boolean, ms = 450): boolean {
  const [kept, setKept] = useState(open);
  useEffect(() => {
    if (open) {
      setKept(true);
      return;
    }
    const t = window.setTimeout(() => setKept(false), ms);
    return () => window.clearTimeout(t);
  }, [open, ms]);
  return open || kept;
}

/** Wraps a sheet that takes `open` so it is only built while it is open (or closing). Everything else about it stays the same. */
export function lazySheet<P extends { open: boolean }>(Sheet: ComponentType<P>): ComponentType<P> {
  function LazySheet(props: P) {
    const mounted = useKeepMounted(props.open);
    return mounted ? <Sheet {...props} /> : null;
  }
  LazySheet.displayName = `Lazy(${Sheet.displayName || Sheet.name || "Sheet"})`;
  return LazySheet;
}
