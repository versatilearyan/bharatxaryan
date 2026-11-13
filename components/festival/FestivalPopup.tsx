"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { useFestival } from "./FestivalProvider";

const KEY = "panchayat-festival-popup-seen";

/** The festival pop-up. In the app it shows once per festival version (if the admin chose so). `open` forces it in the admin panel's preview. */
export function FestivalPopup({ onCta, open }: { onCta?: () => void; open?: boolean }) {
  const { config, id, version, preview } = useFestival();
  const [shown, setShown] = useState(false);
  const wanted = Boolean(config && config.sections.popup);
  useEffect(() => {
    if (preview || !wanted || !config) return;
    try {
      const seen = localStorage.getItem(KEY);
      const tag = `${id}:${version}`;
      if (config.popup.showOnce && seen === tag) return;
    } catch {
      /* storage blocked: show it */
    }
    const t = window.setTimeout(() => setShown(true), 1800);
    return () => window.clearTimeout(t);
  }, [preview, wanted, config, id, version]);
  const visible = preview ? Boolean(open && wanted) : shown;
  const close = () => {
    setShown(false);
    try {
      localStorage.setItem(KEY, `${id}:${version}`);
    } catch {
      /* the pop-up may show again */
    }
  };
  if (!config) return null;
  const p = config.popup;
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div className={`${preview ? "absolute" : "fixed"} inset-0 z-[80] grid place-items-center bg-black/65 px-6`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={p.title}>
          <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} className="w-full max-w-[320px] overflow-hidden rounded-[26px] bg-surface text-center ring-1 ring-gold/40">
            <div className="relative h-36" style={{ background: `linear-gradient(135deg, ${config.theme.accent}, ${config.theme.primary})` }}>
              {config.assets.popupImageUrl ? <SvgaAnim src={config.assets.popupImageUrl} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="px-5 pb-5 pt-4">
              <h3 className="font-display text-[19px] font-extrabold text-cream">{p.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-cream/75">{p.body}</p>
              <button
                type="button"
                onClick={() => {
                  if (!preview) {
                    close();
                    onCta?.();
                  }
                }}
                className="mt-4 w-full py-2.5 text-[14px] font-extrabold text-[#2a1a0c]"
                style={{ background: "var(--festival-primary, #e7bc72)", borderRadius: "var(--festival-radius, 9999px)" }}
              >
                {p.buttonText}
              </button>
              {!preview ? (
                <button type="button" onClick={close} className="mt-2 text-[12px] font-semibold text-muted">
                  Not now
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
