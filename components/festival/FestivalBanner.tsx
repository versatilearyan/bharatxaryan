"use client";

import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { useFestival } from "./FestivalProvider";

/** The festival banner at the top of Home: the admin's picture or animation, a title, a line and a button in the festival's button style. */
export function FestivalBanner({ onOpen }: { onOpen?: () => void }) {
  const { config } = useFestival();
  if (!config || !config.sections.banner) return null;
  const b = config.banner;
  return (
    <section className="relative mx-4 mt-3 overflow-hidden rounded-[22px] ring-1 ring-gold/40" style={{ background: `linear-gradient(135deg, ${config.theme.accent}, ${config.theme.primary})`, minHeight: 124 }} aria-label={b.title}>
      {config.assets.bannerUrl ? <SvgaAnim src={config.assets.bannerUrl} className="absolute inset-0 h-full w-full object-cover" /> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
      <div className="relative flex min-h-[124px] flex-col justify-center gap-1 px-4 py-3">
        <h2 className="max-w-[75%] font-display text-[22px] font-extrabold leading-tight text-white drop-shadow">{b.title}</h2>
        {b.subtitle ? <p className="max-w-[75%] text-[12.5px] font-semibold text-white/90 drop-shadow">{b.subtitle}</p> : null}
        {b.buttonText ? (
          <button type="button" onClick={onOpen} className="mt-1.5 w-fit px-4 py-2 text-[12.5px] font-extrabold text-[#2a1a0c] shadow-lg" style={{ background: "var(--festival-primary, #e7bc72)", borderRadius: "var(--festival-radius, 9999px)" }}>
            {b.buttonText}
          </button>
        ) : null}
      </div>
    </section>
  );
}
