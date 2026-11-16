"use client";

/**
 * Sarpanch's daily red packet and the locked prize.
 *  - While the app is open it tells the server once a minute (that is the "active time" the locked prize counts).
 *  - The Sarpanch chat message's button opens this card: today's red packet, and how far the locked prize is.
 */
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, LockOpen, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { readToken } from "@/lib/auth/token";
import { useApp } from "@/lib/app/store";
import { Coin } from "@/components/ui/kit";

export const DAILY_GIFT_EVENT = "panchayat:daily-gift";

type State = {
  dailyEnabled: boolean;
  dailyCoins: number;
  dailyClaimed: boolean;
  bonus: { enabled: boolean; coins: number; daysRequired: number; daysDone: number; minutesRequired: number; todayMinutes: number; unlocked: boolean; claimed: boolean };
};

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
function read(raw: unknown): State {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const b = (o.bonus && typeof o.bonus === "object" ? o.bonus : {}) as Record<string, unknown>;
  return {
    dailyEnabled: o.dailyEnabled === true,
    dailyCoins: num(o.dailyCoins),
    dailyClaimed: o.dailyClaimed === true,
    bonus: { enabled: b.enabled === true, coins: num(b.coins), daysRequired: num(b.daysRequired, 7), daysDone: num(b.daysDone), minutesRequired: num(b.minutesRequired, 120), todayMinutes: num(b.todayMinutes), unlocked: b.unlocked === true, claimed: b.claimed === true },
  };
}

export function DailyGift() {
  const { session, refreshCoins, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState<State | null>(null);
  const [busy, setBusy] = useState<"daily" | "bonus" | null>(null);
  const [won, setWon] = useState<number | null>(null);

  // the once-a-minute "I'm here" ping
  useEffect(() => {
    if (!session) return;
    const ping = () => {
      if (document.visibilityState !== "visible" || !readToken()) return;
      api<unknown>("/api/v1/daily-gift/ping", { method: "POST", auth: true, body: {} }).then((r) => setSt(read(r))).catch(() => undefined);
    };
    const first = window.setTimeout(ping, 4000);
    const i = window.setInterval(ping, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(i);
    };
  }, [session]);

  const show = useCallback(async () => {
    if (!readToken()) return;
    try {
      setSt(read(await api<unknown>("/api/v1/daily-gift", { auth: true })));
      setWon(null);
      setOpen(true);
    } catch {
      toast("Abhi nahi khul paya. Thodi der baad dekho.", "error");
    }
  }, [toast]);

  useEffect(() => {
    const on = () => void show();
    window.addEventListener(DAILY_GIFT_EVENT, on);
    return () => window.removeEventListener(DAILY_GIFT_EVENT, on);
  }, [show]);

  const claim = async (which: "daily" | "bonus") => {
    if (busy) return;
    setBusy(which);
    try {
      const r = await api<{ amount: number }>(which === "daily" ? "/api/v1/daily-gift/claim" : "/api/v1/daily-gift/bonus/claim", { method: "POST", auth: true, body: {} });
      setWon(num(r.amount));
      setSt(read(await api<unknown>("/api/v1/daily-gift", { auth: true })));
      void refreshCoins();
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Nahi hua. Dobara try karo.", "error");
    } finally {
      setBusy(null);
    }
  };

  const b = st?.bonus;
  return (
    <AnimatePresence>
      {open && st ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="pt-safe absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-cream">
            <X className="h-5 w-5" />
          </button>
          <div className="w-full max-w-[380px] space-y-3">
            {won !== null ? (
              <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl bg-gradient-to-b from-[#ffe9a8] to-[#e7a93a] p-5 text-center text-[#4a2600] shadow-2xl">
                <p className="font-display text-[15px] font-extrabold">🎉 Mubarak ho!</p>
                <p className="mt-1 flex items-center justify-center gap-1.5 font-display text-[32px] font-black">
                  <Coin className="h-8 w-8" /> +{won.toLocaleString("en-IN")}
                </p>
                <p className="text-[12.5px] font-bold">Coins aapke wallet me aa gaye.</p>
              </motion.div>
            ) : null}

            {st.dailyEnabled ? (
              <section className="rounded-3xl bg-gradient-to-b from-[#ff3b3b] to-[#b3001b] p-4 text-center text-white shadow-[0_20px_50px_-12px_rgba(255,59,59,0.7)] ring-2 ring-[#ffd36e]/60">
                <p className="font-display text-[14px] font-extrabold text-[#ffe9a8]">🙏 Sarpanch ji ka daily red packet</p>
                <p className="mt-2 flex items-center justify-center gap-1.5 font-display text-[30px] font-black">
                  <Coin className="h-7 w-7" /> {st.dailyCoins.toLocaleString("en-IN")}
                </p>
                <button type="button" disabled={st.dailyClaimed || busy !== null} onClick={() => void claim("daily")} className="mt-3 h-12 w-full rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e7a93a] font-display text-[15px] font-black uppercase text-[#7a1500] shadow-[0_4px_0_#9a5a00] disabled:opacity-60">
                  {st.dailyClaimed ? "Aaj ka khul chuka ✓" : busy === "daily" ? "Khul raha hai…" : "Red packet kholo"}
                </button>
                {st.dailyClaimed ? <p className="mt-2 text-[12px] font-bold text-white/80">Kal naya red packet aayega.</p> : null}
              </section>
            ) : null}

            {b?.enabled ? (
              <section className="rounded-3xl bg-gradient-to-b from-[#2b1a52] to-[#150a2c] p-4 text-white ring-1 ring-white/20">
                <div className="flex items-center gap-2">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10">{b.unlocked ? <LockOpen className="h-6 w-6 text-[#7dff9a]" /> : <Lock className="h-6 w-6 text-[#ffe27a]" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[16px] font-black">Locked prize</p>
                    <p className="flex items-center gap-1 text-[13px] font-bold text-[#ffe27a]">
                      <Coin className="h-4 w-4" /> {b.coins.toLocaleString("en-IN")} coins
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5" aria-label={`${b.daysDone} of ${b.daysRequired} days done`}>
                  {Array.from({ length: b.daysRequired }).map((_, i) => (
                    <span key={i} className={`h-2.5 flex-1 rounded-full ${i < b.daysDone ? "bg-gradient-to-r from-[#7dff9a] to-[#2ea44f]" : "bg-white/15"}`} />
                  ))}
                </div>
                <p className="mt-1.5 text-[12.5px] font-bold text-white/85">
                  {b.unlocked ? "Prize khul gaya! 🎉" : `${b.daysDone}/${b.daysRequired} din poore. ${Math.max(0, b.daysRequired - b.daysDone)} din aur!`}
                </p>
                {!b.unlocked ? (
                  <>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-gradient-to-r from-[#ff7ab8] to-[#ffb347]" style={{ width: `${Math.min(100, (b.todayMinutes / Math.max(1, b.minutesRequired)) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[11.5px] text-white/65">
                      Aaj: {b.todayMinutes}/{b.minutesRequired} minute active. Itna rahoge to aaj ka din ginega.
                    </p>
                  </>
                ) : null}
                {b.unlocked ? (
                  <button type="button" disabled={b.claimed || busy !== null} onClick={() => void claim("bonus")} className="mt-3 h-12 w-full rounded-full bg-gradient-to-r from-[#7dff9a] to-[#2ea44f] font-display text-[15px] font-black uppercase text-[#08260f] shadow-[0_4px_0_#16672f] disabled:opacity-60">
                    {b.claimed ? "Prize le liya ✓" : busy === "bonus" ? "Khul raha hai…" : "Prize kholo"}
                  </button>
                ) : null}
              </section>
            ) : null}

            {!st.dailyEnabled && !b?.enabled ? <p className="rounded-2xl bg-white/10 p-4 text-center text-[13px] font-bold text-white">Abhi koi reward chalu nahi hai.</p> : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
