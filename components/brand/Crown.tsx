"use client";

import { useId, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";

type CrownProps = {
  className?: string;
  /** Adds the twinkling sparkle animation around the crown. */
  sparkle?: boolean;
  title?: string;
  style?: CSSProperties;
};

/** The small golden Panchayat crown, drawn in SVG so it stays crisp at any size. */
export function Crown({ className, sparkle = false, title, style }: CrownProps) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();

  return (
    <span className={`inline-block ${className?.includes("absolute") ? "" : "relative"} ${className ?? ""}`} style={style}>
      <svg viewBox="0 0 64 48" className="h-full w-full overflow-visible" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
        {title ? <title>{title}</title> : null}
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1c9" />
            <stop offset="0.45" stopColor="#f2cd83" />
            <stop offset="1" stopColor="#b9853a" />
          </linearGradient>
          <linearGradient id={`s-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M6 16 L18 28 L32 6 L46 28 L58 16 L53 40 Q32 45 11 40 Z"
          fill={`url(#g-${id})`}
          stroke="#8a5d22"
          strokeOpacity="0.5"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M10 18 L18 29 L30 10 L26 30 Q16 33 12 36 Z" fill={`url(#s-${id})`} opacity="0.55" />
        <rect x="10" y="38" width="44" height="6" rx="3" fill="#c7913f" />
        <circle cx="6" cy="15" r="3.4" fill="#ff647c" />
        <circle cx="32" cy="5" r="3.8" fill="#f4515b" />
        <circle cx="58" cy="15" r="3.4" fill="#ff647c" />
        <circle cx="32" cy="33" r="2.6" fill="#fff1d5" opacity="0.9" />
      </svg>

      {sparkle && !reduce ? (
        <>
          {[
            { top: "-30%", left: "88%", delay: 0, size: "38%" },
            { top: "-20%", left: "-22%", delay: 1.1, size: "26%" },
            { top: "55%", left: "102%", delay: 1.9, size: "22%" },
          ].map((s, i) => (
            <motion.svg
              key={i}
              viewBox="0 0 20 20"
              aria-hidden
              className="pointer-events-none absolute"
              style={{ top: s.top, left: s.left, width: s.size, height: s.size }}
              initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 0.3], rotate: [0, 90, 90] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, delay: s.delay, ease: "easeInOut" }}
            >
              <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z" fill="#fff1d5" />
            </motion.svg>
          ))}
        </>
      ) : null}
    </span>
  );
}
