"use client";

import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { useFestival } from "./FestivalProvider";

/** The festival's background picture behind the app (soft, so text stays readable). */
export function FestivalBackground() {
  const { config } = useFestival();
  if (!config || !config.sections.background || !config.assets.backgroundUrl) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <SvgaAnim src={config.assets.backgroundUrl} className="h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/30 to-ink/80" />
    </div>
  );
}
