"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api/client";
import { applyFestivalVars } from "@/lib/festival/theme";
import type { ActiveFestival, FestivalConfig } from "@/lib/festival/types";

type Value = { config: FestivalConfig | null; id?: number; version?: number; preview: boolean };
const Ctx = createContext<Value>({ config: null, preview: false });

/** The festival that is on, read from the server (published version only). */
export function useFestival() {
  return useContext(Ctx);
}

/**
 * Gives every screen the festival's look. In the real app it asks the server for the published festival (and again every few minutes).
 * In the admin panel's phone preview, `preview` carries the draft instead and nothing is fetched, so a draft can never reach real users.
 * The colours are written onto the page as the app's own colour variables, so every existing screen changes with them.
 */
export function FestivalProvider({ children, preview }: { children: ReactNode; preview?: FestivalConfig | null }) {
  // The admin preview page runs its own provider with the draft; this outer one stays out of its way
  const path = usePathname() ?? "";
  const inert = preview === undefined && path.startsWith("/festival-preview");
  const isPreview = preview !== undefined;
  const [live, setLive] = useState<{ config: FestivalConfig; id?: number; version?: number } | null>(null);

  useEffect(() => {
    if (isPreview || inert) return;
    let on = true;
    const load = () =>
      api<ActiveFestival>("/api/v1/festival/active")
        .then((r) => on && setLive(r.active && r.config ? { config: r.config, id: r.id, version: r.version } : null))
        .catch(() => undefined);
    void load();
    const t = window.setInterval(load, 5 * 60_000);
    const vis = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", vis);
    return () => {
      on = false;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [isPreview, inert]);

  const value = useMemo<Value>(() => (isPreview ? { config: preview ?? null, preview: true } : inert ? { config: null, preview: true } : { config: live?.config ?? null, id: live?.id, version: live?.version, preview: false }), [isPreview, inert, preview, live]);

  useEffect(() => {
    if (inert) return;
    applyFestivalVars(document.documentElement, value.config);
    return () => applyFestivalVars(document.documentElement, null);
  }, [value.config, inert]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
