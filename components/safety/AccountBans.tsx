"use client";

/**
 * Account bans, live: the banned person, if the app is open, gets a full screen at once saying so (/user/queue/account),
 * and the only way on is to sign out. Other people see the ban only on that person's profile.
 * Their rooms are closed by the server, so everyone in them is sent out with the usual "room closed".
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ban } from "lucide-react";
import { subscribe } from "@/lib/realtime/stomp";
import { useApp } from "@/lib/app/store";

type Mine = { message: string; permanent: boolean; until?: string | null };

export function AccountBans() {
  const { signOut } = useApp();
  const [mine, setMine] = useState<Mine | null>(null);

  useEffect(
    () =>
      subscribe("/user/queue/account", (body) => {
        const b = (body ?? {}) as Record<string, unknown>;
        if (b.type !== "BANNED") return;
        setMine({ message: typeof b.message === "string" ? b.message : "Your Panchayat account has been banned.", permanent: b.permanent === true, until: typeof b.until === "string" ? b.until : null });
      }),
    [],
  );

  return (
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
  );
}
