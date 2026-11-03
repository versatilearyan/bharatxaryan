"use client";

/**
 * What happened to a payment, shown when you come back to the app after
 * starting one.
 *
 * After checkout the backend verifies the payment with PayU, credits it, and
 * sends the browser back here as /?payment=<txnId>&result=<hint>. The "result"
 * is only a hint for wording: the app never decides "paid" from the URL. It
 * asks the backend (GET /api/v1/payments/{txnId}/status, your own payments
 * only) and, when a coin pack succeeded, reloads the real coin balance.
 *
 * Without the URL (back button from PayU, or a reload) it uses the payment
 * remembered in this tab before leaving (lib/payments/pending.ts).
 */
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, HelpCircle, Loader2, RotateCcw, XCircle } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { getPaymentStatus } from "@/lib/api/payments";
import { ApiError } from "@/lib/api/client";
import { useApp } from "@/lib/app/store";
import { forgetCached } from "@/lib/app/use-wallet";
import { clearPending, readPending } from "@/lib/payments/pending";
import { readToken } from "@/lib/auth/token";

type Status = "verifying" | "confirmed" | "not-confirmed" | "failed" | "error";

type Followed = {
  txnId: string;
  /** What was bought, when this tab remembers it. */
  name?: string;
  /** The backend's hint from the redirect (success / failed / pending / error). */
  hint?: string;
};

/** Reads ?payment=&result= and removes them from the address bar, so a reload or a shared link doesn't show the sheet again. */
function takeReturnParams(): { txnId?: string; hint?: string } {
  try {
    const url = new URL(window.location.href);
    const txnId = url.searchParams.get("payment") ?? undefined;
    const hint = url.searchParams.get("result") ?? undefined;
    if (!txnId && !hint) return {};
    url.searchParams.delete("payment");
    url.searchParams.delete("result");
    window.history.replaceState(window.history.state, "", url.pathname + (url.search ? url.search : "") + url.hash);
    return { txnId: txnId && /^[A-Za-z0-9_-]{1,64}$/.test(txnId) ? txnId : undefined, hint };
  } catch {
    return {};
  }
}

export function PaymentReturn() {
  const { refreshCoins, toast } = useApp();
  const [followed, setFollowed] = useState<Followed | null>(null);
  const [status, setStatus] = useState<Status>("verifying");
  const [coinsAdded, setCoinsAdded] = useState<number | undefined>();
  const [purpose, setPurpose] = useState<string | undefined>();
  const [error, setError] = useState("");

  const check = useCallback(
    async (f: Followed) => {
      if (!readToken()) {
        setError("Sign in again to check this payment.");
        setStatus("error");
        return;
      }
      setStatus("verifying");
      setError("");
      try {
        const s = await getPaymentStatus(f.txnId);
        setPurpose(s.purpose);
        if (s.status === "SUCCESS") {
          setCoinsAdded(s.coins);
          // Show the new balance and make the Wallet / Bag load fresh lists
          await refreshCoins();
          forgetCached("inventory:");
          setStatus("confirmed");
          clearPending();
        } else if (s.status === "FAILED" || (s.status === "PENDING" && f.hint === "failed")) {
          setStatus("failed");
          clearPending();
        } else if (s.status === "NOT_FOUND") {
          setError("This payment isn't on your account. If you used a different login, sign in with it.");
          setStatus("error");
        } else {
          setStatus("not-confirmed");
        }
      } catch (e) {
        setError(e instanceof ApiError || e instanceof Error ? e.message : "Couldn't check right now.");
        setStatus("error");
      }
    },
    [refreshCoins],
  );

  // On load, and when the browser brings this page back from its cache (back button from PayU)
  useEffect(() => {
    const look = () => {
      const fromUrl = takeReturnParams();
      const pending = readPending();
      const txnId = fromUrl.txnId ?? pending?.reference;
      if (!txnId) {
        if (fromUrl.hint === "error") toast("We couldn't match that payment. If money was taken, contact support.");
        return;
      }
      const f: Followed = { txnId, name: pending?.reference === txnId ? pending.name : undefined, hint: fromUrl.hint };
      setFollowed(f);
      void check(f);
    };
    look();
    const onShow = (e: PageTransitionEvent) => e.persisted && look();
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [check, toast]);

  const done = () => {
    clearPending();
    setFollowed(null);
    setCoinsAdded(undefined);
  };

  const f = followed;
  const item = f?.name ?? (purpose === "RED_PACKET" ? "Your red packet" : "Your coins");
  return (
    <BottomSheet open={Boolean(f)} onClose={done} title="Your payment">
      {f ? (
        <div className="px-5 pb-6 pt-1 text-center" aria-live="polite" data-testid="payment-return" data-status={status}>
          {status === "verifying" ? (
            <Block icon={<Loader2 className="h-9 w-9 animate-spin text-gold" aria-hidden />} title="Checking your payment…" text="Confirming with Panchayat." />
          ) : status === "confirmed" ? (
            <Block
              icon={<CheckCircle2 className="h-10 w-10 text-[#5fe39a]" aria-hidden />}
              title="Payment successful"
              text={
                purpose === "RED_PACKET"
                  ? `${item} is in your Bag. Send it from the red packet button in any room.`
                  : coinsAdded
                    ? `${coinsAdded.toLocaleString("en-IN")} coins were added to your wallet.`
                    : "Your coins were added to your wallet."
              }
            />
          ) : status === "failed" ? (
            <Block
              icon={<XCircle className="h-10 w-10 text-coral" aria-hidden />}
              title="Payment not completed"
              text="The payment failed or was cancelled, so nothing was added. If money left your account, it is usually refunded by your bank in a few days. Contact support with the reference below if it isn't."
            />
          ) : status === "not-confirmed" ? (
            <Block
              icon={<Clock className="h-10 w-10 text-gold" aria-hidden />}
              title="Not confirmed yet"
              text="Some payments take a few minutes to confirm. Check again shortly. If you cancelled, nothing was charged."
            />
          ) : (
            <Block icon={<HelpCircle className="h-10 w-10 text-coral" aria-hidden />} title="Couldn't check right now" text={error || "Try again in a moment."} />
          )}
          <p className="mt-3 text-[11.5px] text-muted">Reference: {f.txnId}</p>
          <div className={`mt-5 grid gap-2 ${status === "not-confirmed" || status === "error" ? "grid-cols-2" : "grid-cols-1"}`}>
            {status === "not-confirmed" || status === "error" ? (
              <button type="button" onClick={() => void check(f)} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-surface text-[14px] font-bold text-cream ring-1 ring-line">
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
