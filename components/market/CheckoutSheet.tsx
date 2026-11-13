"use client";

/**
 * Checkout for things sold in rupees (coin packs, red packets), through the
 * backend and PayU's hosted checkout:
 *
 * 1. The person checks the item and enters billing details.
 * 2. POST /api/v1/payments/initiate with the purpose, the backend product id
 *    and those details (never a price: the backend sets it).
 * 3. The app goes to the checkout page the backend returned (only if it is
 *    PayU's own https domain), where the person pays by UPI, card or net banking.
 *
 * Card and UPI details are entered on PayU's page, never here. Billing details
 * stay in this component's state and are cleared when the sheet closes. Nothing
 * is credited by the app: the backend verifies the payment and delivers the
 * item, and the app only shows what the backend reports afterwards
 * (PaymentReturn.tsx).
 *
 * An item without `purchase` (VIP, or a sample item with no backend product)
 * can't be bought online yet, and the sheet says so instead of pretending.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Loader2, Lock, ShieldCheck } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ApiError } from "@/lib/api/client";
import { initiatePayment, paymentErrorText, productIdNumber, type PaymentPurpose } from "@/lib/api/payments";
import { useApp } from "@/lib/app/store";
import { formatInr } from "@/lib/app/redpacket";
import { readToken } from "@/lib/auth/token";
import { BILLING_FIELDS, billingErrors, cleanBilling, EMPTY_BILLING, splitName, type BillingDetails } from "@/lib/payments/billing";
import { ACTIVE_GATEWAY, checkoutProblem, goToCheckout } from "@/lib/payments/gateway";
import { savePending } from "@/lib/payments/pending";
import { isNativeApp } from "@/lib/native/bridge";
import { buyWithGooglePlay, playProductFor } from "@/lib/native/play";
import { useMe } from "@/lib/app/me-store";
import { forgetCached } from "@/lib/app/use-wallet";

export type CheckoutItem = {
  id: string;
  name: string;
  note: string;
  art: ReactNode;
  /** The listed price, shown for reference. The backend sets the amount actually charged. */
  inr: number;
  /** "gold" for coin packs, "red" (the default) for red packets. */
  tone?: "gold" | "red";
  /** What to buy on the backend. Missing: this item can't be bought online yet. */
  purchase?: { purpose: PaymentPurpose; productId: string; ownedBefore?: number };
};

type Stage = "form" | "starting" | "leaving";

const inputClass = "h-11 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-cream placeholder:text-cream/30 focus:border-gold/50 focus:outline-none";

export function CheckoutSheet({ item, onClose }: { item: CheckoutItem | null; onClose: () => void }) {
  const { profile, refreshCoins, toast } = useApp();
  const me = useMe();
  // The app installed from the Play Store (its user agent says PanchayatPlay) buys with Google Play (Google's rule).
  // The app downloaded from our website pays with PayU, just like the website.
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp() && /PanchayatPlay/.test(navigator.userAgent)), []);
  const [playId, setPlayId] = useState<string | null | undefined>(undefined);
  const [stage, setStage] = useState<Stage>("form");
  const [billing, setBilling] = useState<BillingDetails>(EMPTY_BILLING);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  /** Set the moment Pay is pressed, so a double tap can't start two payments. */
  const busy = useRef(false);
  // The item stays on screen while the sheet slides away
  const [shown, setShown] = useState<CheckoutItem | null>(item);
  if (item && item !== shown) setShown(item);

  // A fresh form each time the sheet opens (your name filled in to start with). Nothing typed is kept.
  const open = Boolean(item);
  useEffect(() => {
    if (!open) {
      setBilling(EMPTY_BILLING);
      return;
    }
    setStage("form");
    setBilling({ ...EMPTY_BILLING, ...splitName(profile.name) });
    setTried(false);
    setError("");
    setServerFields({});
    busy.current = false;
    // profile.name only seeds the form when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  // Back from the gateway via the browser's back button: the page comes back from its cache mid-"Opening PayU", so unlock the form
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      busy.current = false;
      setStage("form");
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const errors = billingErrors(billing);
  const valid = Object.keys(errors).length === 0;
  const fieldError = (k: keyof BillingDetails) => (tried && errors[k]) || serverFields[k] || "";

  const close = () => {
    if (stage !== "form") return; // don't walk away while the payment is being set up
    onClose();
  };

  const it = item ?? shown;
  const purchase = it?.purchase;
  const productId = purchase ? productIdNumber(purchase.productId) : null;
  // Is this item on sale in Google Play?
  useEffect(() => {
    if (!native || !open || !purchase || productId === null) return;
    setPlayId(undefined);
    let live = true;
    playProductFor(purchase.purpose, productId)
      .then((id) => live && setPlayId(id))
      .catch(() => live && setPlayId(null));
    return () => {
      live = false;
    };
  }, [native, open, purchase?.purpose, productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const payPlay = async () => {
    if (busy.current || stage !== "form" || !it || !purchase || productId === null) return;
    busy.current = true;
    setStage("starting");
    setError("");
    try {
      await buyWithGooglePlay(purchase.purpose, productId);
      forgetCached("inventory:");
      await refreshCoins();
      if (purchase.purpose === "VIP") me.refresh(true);
      toast(purchase.purpose === "VIP" ? "VIP is on 👑" : "Added to your wallet 🪙", "gold");
      busy.current = false;
      setStage("form");
      onClose();
    } catch (e) {
      busy.current = false;
      setStage("form");
      const m = e instanceof Error ? e.message : "";
      // Closing Google's sheet is not an error
      if (!/cancel/i.test(m)) setError(m || "The purchase didn't finish. If money was taken, it will be added soon.");
    }
  };
  const signedIn = Boolean(readToken());
  const canBuy = Boolean(purchase && productId !== null && signedIn);

  const pay = async () => {
    setTried(true);
    if (busy.current || stage !== "form" || !it || !purchase || productId === null || !valid) return;
    busy.current = true;
    setStage("starting");
    setError("");
    setServerFields({});
    try {
      const init = await initiatePayment({ purpose: purchase.purpose, productId, ...cleanBilling(billing) });
      const problem = checkoutProblem(init);
      if (problem) throw new Error(problem);
      // Remember only what's needed to check the result afterwards (no billing details)
      savePending({ purpose: purchase.purpose, productId: purchase.productId, name: it.name, ownedBefore: purchase.ownedBefore, reference: init.reference, startedAt: Date.now() });
      setStage("leaving");
      goToCheckout(init);
    } catch (e) {
      busy.current = false;
      setStage("form");
      setError(paymentErrorText(e));
      if (e instanceof ApiError && e.status === 400) setServerFields(e.fields);
    }
  };

  if (!it) return null;
  const gold = it.tone === "gold";

  return (
    <BottomSheet open={open} onClose={close} title="Checkout" tall>
      <div className="space-y-4 px-5 pb-6 pt-1">
        <AnimatePresence mode="wait" initial={false}>
          {stage !== "form" ? (
            <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center pt-6 text-center" aria-live="polite" data-testid="checkout-starting">
              <span className="relative grid h-24 w-24 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-gold/15" aria-hidden />
                <span className="grid h-20 w-20 place-items-center rounded-full bg-surface ring-2 ring-gold/50">
                  <Loader2 className="h-9 w-9 animate-spin text-gold" aria-hidden />
                </span>
              </span>
              <p className="mt-5 font-display text-[20px] font-bold text-cream">{stage === "starting" ? (native ? "Opening Google Play…" : "Setting up your payment…") : `Opening ${ACTIVE_GATEWAY.name}…`}</p>
              <p className="mt-1 text-[12px] text-muted">Don&apos;t close this screen or press back.</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Order summary */}
              <div className={`flex items-center gap-3 rounded-3xl p-3.5 ring-1 ${gold ? "bg-gradient-to-br from-[#4a3214] via-[#2a1a0c] to-[#1a1008] ring-gold/40" : "bg-gradient-to-br from-[#6b1a1a] to-[#2a0c0c] ring-[#ff6b6b]/25"}`}>
                <span className="grid h-14 w-14 shrink-0 place-items-center">{it.art}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[16px] font-bold text-cream">{it.name}</span>
                  <span className="block text-[11.5px] text-cream/70">{it.note}</span>
                </span>
                <span className="font-display text-[19px] font-bold text-gold">{formatInr(it.inr)}</span>
              </div>

              {!purchase || productId === null ? (
                <p role="status" className="rounded-2xl bg-surface p-4 text-[13px] leading-snug text-cream/85 ring-1 ring-line">
                  This can&apos;t be bought online yet. Payments currently work for coin packs and red packets from the Wallet. Nothing has been charged.
                </p>
              ) : !signedIn ? (
                <p role="status" className="rounded-2xl bg-surface p-4 text-[13px] leading-snug text-cream/85 ring-1 ring-line">
                  Sign in to buy this. Payments go through your Panchayat account so the item reaches your wallet.
                </p>
              ) : native ? (
                <>
                  <div className="space-y-1.5 rounded-2xl bg-surface p-4 text-[13px] ring-1 ring-line">
                    <Row k={<span className="font-bold text-cream">Price</span>} v={<span className="font-display text-[16px] font-bold text-cream">{formatInr(it.inr)}</span>} />
                    <p className="text-[11px] text-muted">Google Play shows the final price (with taxes) before you pay.</p>
                  </div>
                  {playId === null ? (
                    <p role="status" className="rounded-2xl bg-surface p-4 text-[13px] leading-snug text-cream/85 ring-1 ring-line">
                      This isn&apos;t available in the app yet. Nothing has been charged.
                    </p>
                  ) : null}
                  {error ? (
                    <p role="alert" className="rounded-2xl bg-[#3a1418] px-3.5 py-3 text-[12.5px] text-[#ffb0b4] ring-1 ring-coral/25">
                      {error}
                    </p>
                  ) : null}
                  <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => void payPlay()} disabled={!playId} className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[16px] font-extrabold text-[#2a1a0c] disabled:opacity-50">
                    {playId === undefined ? "Checking…" : `Buy with Google Play`}
                  </motion.button>
                  <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-cream/45">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /> Paid securely through Google Play
                  </p>
                </>
              ) : (
                <>
                  {/* Billing details (needed by the payment gateway) */}
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Billing details</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {BILLING_FIELDS.map((f) => (
                        <label key={f.key} className={`block ${f.key === "address1" ? "col-span-2" : ""}`}>
                          <span className="mb-1 block text-[11.5px] font-semibold text-cream/70">{f.label}</span>
                          <input
                            value={billing[f.key]}
                            onChange={(e) => setBilling((b) => ({ ...b, [f.key]: f.inputMode === "tel" || f.inputMode === "numeric" ? e.target.value.replace(/\D/g, "").slice(0, f.max) : e.target.value.slice(0, f.max) }))}
                            inputMode={f.inputMode}
                            autoComplete={f.autoComplete}
                            placeholder={f.placeholder}
                            aria-label={f.label}
                            aria-invalid={Boolean(fieldError(f.key))}
                            className={inputClass}
                          />
                          {fieldError(f.key) ? (
                            <span role="alert" className="mt-1 block text-[11.5px] font-semibold text-[#ff8a8f]">
                              {fieldError(f.key)}
                            </span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-muted">Used only for this payment and not saved on this device.</p>
                  </div>

                  {/* Price */}
                  <div className="space-y-1.5 rounded-2xl bg-surface p-4 text-[13px] ring-1 ring-line">
                    <Row k={<span className="font-bold text-cream">Price (incl. GST)</span>} v={<span className="font-display text-[16px] font-bold text-cream">{formatInr(it.inr)}</span>} />
                    <p className="text-[11px] text-muted">The amount charged is set by Panchayat and shown on {ACTIVE_GATEWAY.name}&apos;s page before you pay.</p>
                  </div>

                  {error ? (
                    <p role="alert" className="rounded-2xl bg-[#3a1418] px-3.5 py-3 text-[12.5px] text-[#ffb0b4] ring-1 ring-coral/25">
                      {error}
                    </p>
                  ) : null}

                  <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => void pay()} disabled={!canBuy} className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gold text-[15.5px] font-bold text-ink disabled:opacity-60">
                    <Lock className="h-4 w-4" aria-hidden /> Pay {formatInr(it.inr)} with {ACTIVE_GATEWAY.name}
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  </motion.button>
                  <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-cream/45">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /> You&apos;ll pay on {ACTIVE_GATEWAY.name}&apos;s secure page · UPI · Cards · Net banking
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}

function Row({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{k}</span>
      <span className="min-w-0 truncate text-right text-cream">{v}</span>
    </div>
  );
}
