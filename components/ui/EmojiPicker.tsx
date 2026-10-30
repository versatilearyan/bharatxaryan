"use client";

import { motion } from "framer-motion";
import { EMOJIS } from "@/lib/app/data";

/** Compact emoji grid. Used by chat inputs and room reactions. */
export function EmojiPicker({ onPick, emojis = EMOJIS, className = "" }: { onPick: (e: string) => void; emojis?: string[]; className?: string }) {
  return (
    <div className={`grid grid-cols-8 gap-1 ${className}`} role="listbox" aria-label="Emoji">
      {emojis.map((e) => (
        <motion.button
          key={e}
          type="button"
          role="option"
          aria-selected={false}
          aria-label={`Emoji ${e}`}
          whileTap={{ scale: 0.8 }}
          onClick={() => onPick(e)}
          className="grid aspect-square place-items-center rounded-xl text-[22px] hover:bg-cream/10"
        >
          {e}
        </motion.button>
      ))}
    </div>
  );
}
