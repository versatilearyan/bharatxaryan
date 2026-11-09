"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown } from "lucide-react";
import { notify } from "@/lib/app/notify";
import { useMe } from "@/lib/app/me-store";
import { useApp } from "@/lib/app/store";
import { subscribe } from "@/lib/realtime/stomp";

const SEEN = "panchayat-vip-renew-seen-v1";

const seen = () => {
  try {
    return window.localStorage.getItem(SEEN) ?? "";
  } catch {
    return "";
  }
};
const remember = (v: string) => {
  try {
    window.localStorage.setItem(SEEN, v);
  } catch {
    /* fine */
  }
};

/**
 * When VIP ends (a free trial too), every device is asked to renew: live if the app is open
 * (the server pushes VIP_EXPIRED), and when the app is opened later, once per VIP end date.
 * Mounted once in the app shell. "Renew VIP" opens the VIP screen with the payment.
 */
export function VipRenewPrompt() {
  const { session, push } = useApp();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const endsAt = me.profile.data?.vipExpiresAt ?? null;
  const active = me.profile.data?.vipActive;

  // Opened (or reopened) after it ended: ask once for this end date
  useEffect(() => {
    if (!session || !endsAt || active === undefined) return;
    const ended = Date.parse(endsAt) <= Date.now();
    if (ended && seen() !== endsAt) setOpen(true);
  }, [session, endsAt, active]);

  const onNotice = useCallback(
    (body: unknown) => {
      const b = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
      if (!b) return;
      if (b.type === "VIP_EXPIRED") {
        me.refresh(true);
        notify("invite");
        setOpen(true);
      } else if (b.type === "VIP_GRANTED") {
        me.refresh(true);
        setOpen(false);
      }
    },
    [me],
  );
  useEffect(() => (session ? subscribe("/user/queue/notify", onNotice) : undefined), [session, onNotice]);

  const close = () => {
    if (endsAt) remember(endsAt);
    setOpen(false);
  };
  const renew = () => {
    close();
    push({ kind: "vip-benefits" });
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[96] grid place-items-center bg-black/70 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Renew VIP">
          <motion.div initial={{ scale: 0.85, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="w-full max-w-[320px] rounded-[28px] bg-gradient-to-b from-[#5a1a28] to-[#1a0b11] p-6 text-center ring-2 ring-gold/50">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold/15 ring-1 ring-gold/40">
              <Crown className="h-8 w-8 text-gold" aria-hidden />
            </span>
            <p className="mt-3 font-display text-[22px] font-extrabold text-cream">Your VIP has ended</p>
            <p className="mt-1.5 text-[13px] leading-snug text-cream/75">Renew to get your VIP frame, badge, entry effect and VIP rooms back.</p>
            <button type="button" onClick={renew} className="mt-5 h-12 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c]">
              Renew VIP
            </button>
            <button type="button" onClick={close} className="mt-2 h-10 w-full text-[13px] font-semibold text-cream/60">
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
