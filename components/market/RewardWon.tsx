"use client";

/**
 * "You won!" — shown the moment the server gives you a spend reward
 * (/user/queue/rewards), with the item's animation, and a button to your Bag
 * where effects can be worn and gifts sent.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Sparkles, X } from "lucide-react";
import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { GiftArt } from "@/components/art/GiftArt";
import { readRewardPush, type BagReward } from "@/lib/api/rewards";
import { subscribe } from "@/lib/realtime/stomp";
import { clearRewards, refreshRewards, useGiftCatalogLoader } from "@/lib/app/rewards-store";
import { useApp } from "@/lib/app/store";
import type { GiftId } from "@/lib/app/types";

const TYPE_TEXT: Record<string, string> = { GIFT: "Gift", CHAT_BUBBLE: "Chat bubble", ENTRY_EFFECT: "Entry effect", PROFILE_EFFECT: "Profile effect" };
export const rewardTypeText = (t: string) => TYPE_TEXT[t] ?? t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ");

export function RewardWon() {
  const { push, signedIn } = useApp();
  const [won, setWon] = useState<BagReward[]>([]);
  useGiftCatalogLoader();

  useEffect(() => {
    if (!signedIn) {
      clearRewards();
      return;
    }
    void refreshRewards();
    return subscribe("/user/queue/rewards", (body) => {
      const list = readRewardPush(body);
      if (!list.length) return;
      setWon((w) => [...w, ...list].slice(-10));
      void refreshRewards();
    });
  }, [signedIn]);

  const r = won[0];
  const close = () => setWon((w) => w.slice(1));
  return (
    <AnimatePresence>
      {r ? (
        <motion.div key={r.id} className="absolute inset-0 z-[90] flex items-center justify-center bg-black/60 px-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="You won a reward">
          <motion.div initial={{ scale: 0.85, y: 12 }} animate={{ scale: 1, y: 0 }} className="relative w-full max-w-[300px] rounded-[28px] bg-gradient-to-b from-[#3b2a63] to-[#1b1530] p-5 text-center ring-1 ring-[#f6d899]/40">
            <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-cream">
              <X className="h-4 w-4" />
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-[#ffd98a]">
              <Sparkles className="h-3.5 w-3.5" /> You won
            </p>
            <div className="mx-auto mt-3 grid h-36 w-36 place-items-center overflow-hidden rounded-3xl bg-black/25">
              {r.itemType === "GIFT" && r.giftId ? (
                <span className="h-24 w-24">
                  <GiftArt id={r.giftId as GiftId} />
                </span>
              ) : r.mediaUrl && r.mediaFormat !== "MP3" ? (
                <SvgaAnim src={r.mediaUrl} className="h-full w-full" />
              ) : (
                <Gift className="h-12 w-12 text-gold" />
              )}
            </div>
            <p className="mt-3 text-[17px] font-extrabold text-cream">
              {r.itemName}
              {r.quantity > 1 ? ` ×${r.quantity}` : ""}
            </p>
            <p className="mt-0.5 text-[12.5px] text-[#c9bfe0]">
              {rewardTypeText(r.itemType)} · {r.expiresAt ? `${Math.max(1, Math.round((Date.parse(r.expiresAt) - Date.now()) / 86_400_000))} days` : "Permanent"}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#a99fc0]">From “{r.ruleName}” for spending coins</p>
            <button
              type="button"
              onClick={() => {
                close();
                push({ kind: "bag" });
              }}
              className="mt-4 h-11 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] text-[14px] font-bold text-[#2a1a0c]"
            >
              {r.slot ? "Wear it from your Bag" : r.itemType === "GIFT" ? "Send it from your Bag" : "Open your Bag"}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
