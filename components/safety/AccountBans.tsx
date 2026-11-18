"use client";

/**
 * Account bans, live:
 *  - everyone sees a short banner "<name>'s ID has been banned" when staff ban someone (/topic/account-bans);
 *  - the banned person, if the app is open, gets a full screen at once saying so (/user/queue/account),
 *    and the only way on is to sign out.
 * Their rooms are closed by the server, so everyone in them is sent out with the usual "room closed".
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ban } from "lucide-react";
import { subscribe } from "@/lib/realtime/stomp";
import { useApp } from "@/lib/app/store";

type Banned = { name: string; publicId?: string; avatarUrl?: string; permanent: boolean; days?: number | null; key: number };
type Mine = { message: string; permanent: boolean; until?: string | null };

export function AccountBans() {
  const { signOut } = useApp();
  const [news, setNews] = useState<Banned | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);

  useEffect(() => {
    const offAll = subscribe("/topic/account-bans", (body) => {
      const b = (body ?? {}) as Record<string, unknown>;
      setNews({
        name: typeof b.name === "string" && b.name ? b.name : "Someone",
        publicId: typeof b.publicId === "string" ? b.publicId : b.publicId != null ? String(b.publicId) : undefined,
        avatarUrl: typeof b.avatarUrl === "string" ? b.avatarUrl : undefined,
        permanent: b.permanent === true,
        days: typeof b.days === "number" ? b.days : null,
        key: Date.now(),
      });
    });
    const offMine = subscribe("/user/queue/account", (body) => {
      const b = (body ?? {}) as Record<string, unknown>;
      if (b.type !== "BANNED") return;
      setMine({ message: typeof b.message === "string" ? b.message : "Your Panchayat account has been banned.", permanent: b.permanent === true, until: typeof b.until === "string" ? b.until : null });
    });
    return () => {
      offAll();
      offMine();
    };
  }, []);

  // The banner goes away by itself
  useEffect(() => {
    if (!news) return;
    const t = window.setTimeout(() => setNews(null), 6000);
    return () => window.clearTimeout(t);
  }, [news]);

  return (
    <>
      <AnimatePresence>
        {news && !mine ? (
          <motion.div
            key={news.key}
            className="pointer-events-none absolute inset-x-3 top-[calc(var(--st)+64px)] z-[94] flex justify-center"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            role="status"
          >
            <div className="flex max-w-[360px] items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#5a0d16] to-[#2a0a10] px-3 py-2 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)] ring-1 ring-[#ff6b6b]/50">
              {news.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={news.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover grayscale" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e2404a]/25 text-[#ff8a8f]">
                  <Ban className="h-5 w-5" aria-hidden />
                </span>
              )}
              <p className="min-w-0 text-[12.5px] leading-snug text-cream">
                🚫 <b className="text-[#ffb0b4]">{news.name}</b>
                {news.publicId ? <span className="text-cream/60"> (ID {news.publicId})</span> : null} ki ID {news.permanent ? "ban ho gayi hai" : `${news.days ?? ""} din ke liye suspend ho gayi hai`}.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {mine ? (
          <motion.div className="fixed inset-0 z-[200] grid place-items-center bg-black/90 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alertdialog" aria-label="Account banned">
            <div className="w-full max-w-[340px] rounded-[28px] bg-gradient-to-b from-[#3a0d16] to-[#14070a] p-6 text-center ring-1 ring-[#ff6b6b]/40">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e2404a]/20 text-[#ff6b6b]">
                <Ban className="h-9 w-9" aria-hidden />
              </span>
              <p className="mt-3 font-display text-[22px] font-extrabold text-cream">{mine.permanent ? "Aapki ID ban ho gayi hai" : "Aapki ID suspend ho gayi hai"}</p>
              <p className="mt-2 text-[13px] leading-snug text-cream/75">{mine.message}</p>
              <p className="mt-2 text-[11.5px] text-cream/45">Aapke rooms band kar diye gaye hain. Galti lagti hai to support@panchayat.world pe likhein.</p>
              <button type="button" onClick={() => { setMine(null); signOut(); }} className="mt-5 h-11 w-full rounded-full bg-white/10 text-[14px] font-bold text-cream">
                OK
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
