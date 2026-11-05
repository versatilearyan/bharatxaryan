"use client";

/**
 * Sarpanch's welcome red packet for new users (50,000 coins): shows once by
 * itself after sign-up, and from the Sarpanch message's "Open red packet".
 * Tapping the envelope opens it; the server credits the coins once.
 */
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { api } from "@/lib/api/client";
import { readToken } from "@/lib/auth/token";
import { useApp } from "@/lib/app/store";
import { Coin } from "@/components/ui/kit";

export const WELCOME_GIFT_EVENT = "panchayat:welcome-gift";
const SEEN = "panchayat-welcome-gift-shown";

export function WelcomeGift() {
  const { session, refreshCoins, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(50_000);
  const [stage, setStage] = useState<"closed" | "opening" | "opened">("closed");

  const check = useCallback(async (force: boolean) => {
    if (!readToken()) return;
    try {
      const d = await api<{ available: boolean; amount: number }>("/api/v1/welcome-gift", { auth: true });
      if (!d?.available) {
        if (force) toast("You've already opened your welcome red packet 🧧");
        return;
      }
      setAmount(d.amount);
      let seen = false;
      try {
        seen = window.sessionStorage.getItem(SEEN) === "1";
      } catch {
        /* ignore */
      }
      if (force || !seen) {
        setStage("closed");
        setOpen(true);
        try {
          window.sessionStorage.setItem(SEEN, "1");
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* try again next time */
    }
  }, [toast]);

  // Once after sign-in, and whenever the Sarpanch message's button asks
  useEffect(() => {
    if (!session) return;
    const t = window.setTimeout(() => void check(false), 1500);
    const on = () => void check(true);
    window.addEventListener(WELCOME_GIFT_EVENT, on);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(WELCOME_GIFT_EVENT, on);
    };
  }, [session, check]);

  const openIt = async () => {
    if (stage !== "closed") return;
    setStage("opening");
    try {
      await api("/api/v1/welcome-gift/claim", { method: "POST", auth: true });
      window.setTimeout(() => setStage("opened"), 700);
      void refreshCoins();
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't open it. Try again.", "error");
      setStage("closed");
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] grid place-items-center bg-black/75 backdrop-blur-sm">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="pt-safe absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-cream">
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center px-6 text-center">
            <p className="font-display text-[14px] font-bold text-gold">🙏 Sarpanch sent you a red packet</p>
            <motion.button
              type="button"
              onClick={() => void openIt()}
              disabled={stage !== "closed"}
              initial={{ scale: 0.6, y: 40 }}
              animate={stage === "opening" ? { scale: [1, 1.08, 0.9, 1.15], rotate: [0, -6, 6, 0] } : stage === "opened" ? { scale: 0.85, y: -10 } : { scale: [1, 1.04, 1], y: 0 }}
              transition={stage === "closed" ? { duration: 1.4, repeat: Infinity } : { duration: 0.7 }}
              className="relative mt-4 h-[260px] w-[200px] overflow-hidden rounded-[28px] bg-gradient-to-b from-[#ff3b3b] to-[#b3001b] shadow-[0_20px_60px_-10px_rgba(255,59,59,0.7)] ring-2 ring-[#ffd36e]/60"
              aria-label="Open the red packet"
            >
              <span className="absolute inset-x-0 top-0 h-[42%] rounded-b-[50%] bg-gradient-to-b from-[#ff5252] to-[#d1001f] shadow-[0_6px_14px_rgba(0,0,0,0.35)]" />
              <span className="absolute left-1/2 top-[34%] grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e7a93a] font-display text-[26px] font-extrabold text-[#9a1a00] ring-4 ring-[#b3001b]">
                {stage === "opened" ? "✓" : "開"}
              </span>
              <span className="absolute inset-x-0 bottom-6 text-center">
                <span className="block font-display text-[13px] font-bold text-[#ffe9a8]">Welcome gift</span>
                <span className="mt-0.5 flex items-center justify-center gap-1 font-display text-[22px] font-extrabold text-white">
                  <Coin className="h-5 w-5" /> {amount.toLocaleString("en-IN")}
                </span>
              </span>
            </motion.button>
            {stage === "opened" ? (
              <>
                {Array.from({ length: 18 }).map((_, i) => (
                  <motion.span key={i} className="pointer-events-none absolute left-1/2 top-1/2" initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: Math.cos((i / 18) * Math.PI * 2) * 160, y: Math.sin((i / 18) * Math.PI * 2) * 160 - 40, opacity: 0 }} transition={{ duration: 1.2 }}>
                    <Coin className="h-6 w-6" />
                  </motion.span>
                ))}
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 font-display text-[24px] font-extrabold text-gold">
                  +{amount.toLocaleString("en-IN")} coins!
                </motion.p>
                <p className="mt-1 text-[13px] text-cream/80">Added to your balance. Have fun on Panchayat 🎉</p>
                <button type="button" onClick={() => setOpen(false)} className="mt-4 h-11 rounded-full bg-gradient-to-r from-coral to-gold px-8 text-[14px] font-extrabold text-white">
                  Let&apos;s go
                </button>
              </>
            ) : (
              <p className="mt-5 text-[13px] text-cream/80">{stage === "opening" ? "Opening…" : "Tap the red packet to open it"}</p>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
