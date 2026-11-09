/**
 * The one thing remembered across the trip to the payment page: which product
 * a payment was started for, so the app can check afterwards whether the
 * backend delivered it. No billing details, amounts or gateway data.
 * Kept in this tab's sessionStorage and removed once the person has seen the result.
 */
import type { PaymentPurpose } from "@/lib/api/payments";

export type PendingPayment = {
  purpose: PaymentPurpose;
  productId: string;
  name: string;
  /** Red packets: how many of this product the inventory said you had just before paying. */
  ownedBefore?: number;
  reference?: string;
  startedAt: number;
};

const KEY = "panchayat-pending-payment-v1";
/** Older than this, a leftover marker is ignored. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function savePending(p: PendingPayment) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: the payment still works, the app just can't follow it up */
  }
}

export function readPending(): PendingPayment | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingPayment;
    if (!p || (p.purpose !== "COIN_PACK" && p.purpose !== "RED_PACKET" && p.purpose !== "VIP") || typeof p.productId !== "string" || typeof p.startedAt !== "number") return null;
    if (Date.now() - p.startedAt > MAX_AGE_MS) {
      clearPending();
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPending() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
