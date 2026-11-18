"use client";

import { Fragment } from "react";

/** Emoji, flags and pictographs (with their joiners and variation selectors) as one run. */
const EMOJI = /((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D|\p{Emoji_Modifier}|\p{Extended_Pictographic}|\p{Regional_Indicator})*)/u;

/**
 * A name inside a VIP highlight (gold-shine, vip-shine, vip-red): those paint the letters with a moving gradient and make
 * the text itself transparent, which also hid emoji. The emoji are kept out of the highlight here and show in their own
 * colours; only the letters shine.
 */
export function NameText({ text }: { text: string | undefined | null }) {
  if (!text) return null;
  const parts = text.split(EMOJI);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="vip-emoji">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
