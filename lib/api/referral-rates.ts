"use client";

/**
 * What Refer & earn pays right now (the admin panel sets it): the inviter's coins per friend and the new user's
 * welcome red packet. GET /api/v1/referrals/rates. Shared by every screen that mentions the amounts.
 */
import { useEffect, useState } from "react";
import { api } from "./client";

export type ReferralRates = { enabled: boolean; reward: number; welcomeGift: number };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

let cached: ReferralRates | null = null;
let at = 0;

export const coinText = (n: number) => n.toLocaleString("en-IN");

/** The current rates once loaded (null until then, or when signed out). */
export function useReferralRates(active = true): ReferralRates | null {
  const [rates, setRates] = useState<ReferralRates | null>(() => (active && cached && Date.now() - at < 60_000 ? cached : null));
  useEffect(() => {
    if (!active) return;
    if (cached && Date.now() - at < 60_000) {
      setRates(cached);
      return;
    }
    let off = false;
    api<Record<string, unknown>>("/api/v1/referrals/rates", { auth: true })
      .then((d) => {
        const r = { enabled: d.enabled !== false, reward: num(d.reward), welcomeGift: num(d.welcomeGift) };
        cached = r;
        at = Date.now();
        if (!off) setRates(r);
      })
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [active]);
  return rates;
}
