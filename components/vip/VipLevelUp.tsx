"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { notify } from "@/lib/app/notify";
import { useMe } from "@/lib/app/me-store";
import { useApp } from "@/lib/app/store";
import { subscribe } from "@/lib/realtime/stomp";

type Reward = { id: string; type: string; format?: string; url?: string; level: number };
type LevelUp = { from: number; level: number; rewards: Reward[] };

const LABEL: Record<string, string> = { FRAME: "Avatar frame", BUBBLE: "Chat bubble", BADGE: "VIP badge", ENTRY: "Entry effect", ENTRY_ANIMATION: "Entry effect" };

/**
 * VIP level-up: when your growth reaches a new VIP level, a celebration shows
 * the level and the rewards it unlocks (frame, bubble, badge, entry), then
 * takes you to your Bag to wear them. Mounted once in the app shell.
 */
export function VipLevelUpPrompt() {
  const { session, push } = useApp();
  const me = useMe();
  const [up, setUp] = useState<LevelUp | null>(null);

  const onNotice = useCallback(
    (body: unknown) => {
      const b = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
      if (!b || b.type !== "VIP_LEVEL_UP") return;
      const rewards = (Array.isArray(b.rewards) ? b.rewards : []).flatMap((r) => {
        const o = r && typeof r === "object" ? (r as Record<string, unknown>) : null;
        return o && o.id != null ? [{ id: String(o.id), type: String(o.type ?? ""), format: o.format ? String(o.format) : undefined, url: o.url ? String(o.url) : undefined, level: Number(o.level) || 0 }] : [];
      });
      setUp({ from: Number(b.from) || 0, level: Number(b.level) || 0, rewards });
      notify("invite");
      // Your profile (level, badge, frame) changed
      me.refresh(true);
    },
    [me],
  );
  useEffect(() => (session ? subscribe("/user/queue/notify", onNotice) : undefined), [session, onNotice]);

  const wear = () => {
    setUp(null);
    push({ kind: "bag" });
  };

  return (
    <AnimatePresence>
      {up ? (
        <motion.div className="fixed inset-0 z-[97] grid place-items-center bg-black/75 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`VIP ${up.level} unlocked`}>
          {/* Gold sparks */}
          {Array.from({ length: 18 }, (_, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute text-[16px]"
              style={{ left: `${(i * 53) % 100}%`, top: "50%" }}
              initial={{ opacity: 0, y: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0], y: -260 - (i % 5) * 40, x: ((i % 7) - 3) * 18, scale: 1 }}
              transition={{ duration: 2.2, delay: (i % 6) * 0.12, repeat: Infinity, repeatDelay: 1.2 }}
              aria-hidden
            >
              {i % 3 ? "✨" : "⭐"}
            </motion.span>
          ))}
          <motion.div
            initial={{ scale: 0.7, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative w-full max-w-[340px] overflow-hidden rounded-[30px] bg-gradient-to-b from-[#5a1a28] via-[#2e1018] to-[#160a0e] p-6 text-center ring-1 ring-gold/60"
          >
            <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-30" aria-hidden />
            <motion.div animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }} className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-[#fff1c9] via-[#e7bc72] to-[#9a6a24] shadow-[0_0_40px_rgba(231,188,114,0.6)]">
              <Crown className="h-10 w-10 text-[#3a1a08]" />
            </motion.div>
            <p className="relative mt-3 text-[12px] font-bold uppercase tracking-[0.2em] text-gold/80">Level up</p>
            <p className="relative font-display text-[34px] font-extrabold italic text-foil">VIP {up.level}</p>
            <p className="relative mt-0.5 text-[13px] text-cream/75">Your rewards for VIP {up.level} are ready to wear.</p>

            {up.rewards.length ? (
              <div className="relative mt-4 grid grid-cols-2 gap-2.5">
                {up.rewards.slice(0, 4).map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.12 }} className="flex flex-col items-center rounded-2xl bg-black/30 px-2 pb-2 pt-2.5 ring-1 ring-gold/25">
                    <span className="grid h-16 w-16 place-items-center overflow-hidden">
                      {r.url ? <SvgaAnim src={r.url} className="h-16 w-16 object-contain" /> : <Sparkles className="h-8 w-8 text-gold" />}
                    </span>
                    <span className="mt-1 text-[11.5px] font-bold text-cream">{LABEL[r.type] ?? r.type}</span>
                    <span className="text-[10px] text-gold/70">VIP {r.level}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="relative mt-4 rounded-2xl bg-black/30 px-3 py-3 text-[12.5px] text-cream/75 ring-1 ring-gold/20">A brighter name, a new badge and more perks come with VIP {up.level}.</p>
            )}

            <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={wear} className="relative mt-5 h-12 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c]">
              Wear my rewards
            </motion.button>
            <button type="button" onClick={() => setUp(null)} className="relative mt-2 text-[12px] text-cream/55">
              Later
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
