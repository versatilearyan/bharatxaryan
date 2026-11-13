"use client";

import { useEffect, useMemo, useState } from "react";
import { FestivalProvider } from "@/components/festival/FestivalProvider";
import { PreviewStage, type PreviewScreen } from "@/components/festival/PreviewStage";
import type { FestivalConfig } from "@/lib/festival/types";

const SCREENS: PreviewScreen[] = ["home", "login", "profile", "gifts", "voice", "popup"];

/**
 * The page the admin panel's phone preview shows (in an iframe). It does not read the server: the admin panel sends the draft with
 * postMessage, so every change shows at once and nothing is saved or shown to real users. The same festival code as the real app draws it.
 */
export default function FestivalPreviewPage() {
  const [draft, setDraft] = useState<FestivalConfig | null>(null);
  const [screen, setScreen] = useState<PreviewScreen>("home");
  const [lightPreview, setLightPreview] = useState(false);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // Only the page that embeds this one (the admin panel) may drive it
      if (e.source !== window.parent) return;
      const m = e.data as { type?: string; config?: FestivalConfig; screen?: PreviewScreen; light?: boolean } | null;
      if (!m || typeof m !== "object") return;
      if (m.type === "festival-draft" && m.config) setDraft(m.config);
      if (m.type === "festival-screen" && m.screen && SCREENS.includes(m.screen)) setScreen(m.screen);
      if (m.type === "festival-light") setLightPreview(Boolean(m.light));
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "festival-preview-ready" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // "Light" in the preview only swaps the base colours; it is not saved
  const shown = useMemo<FestivalConfig | null>(() => {
    if (!draft) return null;
    return lightPreview ? { ...draft, theme: { ...draft.theme, mode: "light", background: "#fbf6ec", surface: "#ffffff", text: "#2a1a0c" } } : draft;
  }, [draft, lightPreview]);

  const go = (s: PreviewScreen) => {
    setScreen(s);
    window.parent.postMessage({ type: "festival-preview-screen", screen: s }, "*");
  };

  return (
    <FestivalProvider preview={shown}>
      <div className="h-[100dvh] w-full bg-ink">
        <PreviewStage screen={screen} onScreen={go} />
      </div>
    </FestivalProvider>
  );
}
