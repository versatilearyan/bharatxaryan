"use client";

/**
 * What happened to a payment, shown when you come back to the app after
 * starting one (PayU's page, the back button, or a fresh load in this tab).
 *
 * The backend verifies the payment and delivers the item. The app has no
 * payment-status endpoint and doesn't know where PayU sends you back to, so it
 * never decides "paid" from the URL or from simply being back. It only reports
 * what the backend's own data shows:
 *
 * - Red packet: GET /wallet/me/red-packets/inventory. More of that packet than
 *   before paying means the backend delivered it ("Added to your Bag").
 *   Otherwise: not confirmed yet, with Check again (no automatic polling).
 * - Coin pack: the app can't read a coin balance or payment status from the
 *   backend, so it says the status is unavailable rather than guessing.
 */
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, HelpCircle, Loader2, RotateCcw } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { getMyRedPacketInventory } from "@/lib/api/wallet";
import { ApiError } from "@/lib/api/client";
import { forgetCached } from "@/lib/app/use-wallet";
import { clearPending, readPending, type PendingPayment } from "@/lib/payments/pending";
import { readToken } from "@/lib/auth/token";

type Status = "verifying" | "confirmed" | "not-confirmed" | "unavailable" | "error";

export function PaymentReturn() {
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState("");

  const check = useCallback(async (p: PendingPayment) => {
    if (p.purpose === "COIN_PACK") {
      setStatus("unavailable");
      return;
    }
    if (!readToken()) {
      setError("Sign in again to check this payment.");
      setStatus("error");
      return;
    }
    setStatus("verifying");
    setError("");
    try {
      const inv = await getMyRedPacketInventory();
      // The Bag and Wallet show this list too: make them load it again next time
      forgetCached("inventory:");
      const now = inv[p.productId] ?? 0;
      setStatus(p.ownedBefore !== undefined && now > p.ownedBefore ? "confirmed" : "not-confirmed");
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Couldn't check right now.");
      setStatus("error");
    }
  }, []);

  // On load, and when the browser brings this page back from its cache (back button from PayU)
  useEffect(() => {
    const look = () => {
      const p = readPending();
      setPending(p);
      if (p) void check(p);
    };
    look();
    const onShow = (e: PageTransitionEvent) => e.persisted && look();
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [check]);

  const done = () => {
    clearPending();
    setPending(null);
  };

  const p = pending;
  return (
    <BottomSheet open={Boolean(p)} onClose={done} title="Your payment">
      {p ? (
        <div className="px-5 pb-6 pt-1 text-center" aria-live="polite" data-testid="payment-return" data-status={status}>
          {status === "verifying" ? (
            <Block icon={<Loader2 className="h-9 w-9 animate-spin text-gold" aria-hidden />} title="Checking with Panchayat…" text={`Looking for ${p.name} in your account.`} />
          ) : status === "confirmed" ? (
            <Block icon={<CheckCircle2 className="h-10 w-10 text-[#5fe39a]" aria-hidden />} title={`${p.name} is in your Bag`} text="Panchayat confirmed the payment and added it. Send it from the red packet button in any room." />
          ) : status === "not-confirmed" ? (
            <Block
              icon={<Clock className="h-10 w-10 text-gold" aria-hidden />}
              title="Not confirmed yet"
              text={`${p.name} isn't in your Bag yet. A payment can take a few minutes to confirm. If you cancelled or the payment failed, nothing is added. If money left your account and the packet doesn't arrive, contact support with the reference below.`}
            />
          ) : status === "unavailable" ? (
            <Block
              icon={<HelpCircle className="h-10 w-10 text-gold" aria-hidden />}
              title="Payment status unavailable"
              text={`The app can't check coin payments yet. If your payment for ${p.name} went through, Panchayat adds the coins to your account. If you cancelled on PayU's page, you weren't charged.`}
            />
          ) : (
            <Block icon={<HelpCircle className="h-10 w-10 text-coral" aria-hidden />} title="Couldn't check right now" text={error || "Try again in a moment."} />
          )}
          {p.reference ? <p className="mt-3 text-[11.5px] text-muted">Reference: {p.reference}</p> : null}
          <div className={`mt-5 grid gap-2 ${status === "not-confirmed" || status === "error" ? "grid-cols-2" : "grid-cols-1"}`}>
            {status === "not-confirmed" || status === "error" ? (
              <button type="button" onClick={() => void check(p)} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-surface text-[14px] font-bold text-cream ring-1 ring-line">
                <RotateCcw className="h-4 w-4" aria-hidden /> Check again
              </button>
            ) : null}
            <button type="button" onClick={done} disabled={status === "verifying"} className="h-12 rounded-full bg-gold text-[14px] font-bold text-ink disabled:opacity-60">
              {status === "confirmed" ? "Done" : "Close"}
            </button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}

function Block({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center pt-3">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-surface ring-1 ring-line">{icon}</span>
      <p className="mt-4 font-display text-[20px] font-bold text-cream">{title}</p>
      <p className="mt-1.5 text-[13px] leading-snug text-cream/80">{text}</p>
    </div>
  );
}
