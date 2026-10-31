"use client";

/**
 * Payment gateway checkout for things sold in rupees: coin packs and red packets.
 *
 * Payments aren't connected yet (PAYMENTS_LIVE in lib/app/coin-packs.ts), so
 * this runs in test mode: no payment provider is called and nothing is
 * charged. What you type (UPI ID, card details) stays in this component's
 * state, is never saved or logged, and is cleared when the sheet closes. Swap
 * `pay` for a real gateway (Razorpay, Cashfree, ...) once the backend can
 * create orders and verify payments: the item must only be granted after the
 * server confirms.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, ChevronRight, CreditCard, Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatInr } from "@/lib/app/redpacket";
import { PAYMENTS_LIVE } from "@/lib/app/coin-packs";

export type CheckoutItem = {
  id: string;
  name: string;
  note: string;
  art: ReactNode;
  inr: number;
  /** "gold" for coin packs, "red" (the default) for red packets. */
  tone?: "gold" | "red";
  /** Shown under the receipt once paid. */
  successText?: string;
};

type Method = "upi" | "card" | "netbanking";
type Stage = "form" | "paying" | "done";

const METHODS: { id: Method; label: string; sub: string; icon: typeof Smartphone }[] = [
  { id: "upi", label: "UPI", sub: "Google Pay, PhonePe, Paytm or any UPI ID", icon: Smartphone },
  { id: "card", label: "Debit / credit card", sub: "Visa, Mastercard, RuPay", icon: CreditCard },
  { id: "netbanking", label: "Net banking", sub: "All major Indian banks", icon: Building2 },
];
const UPI_APPS = ["Google Pay", "PhonePe", "Paytm", "BHIM"];
const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "Punjab National Bank"];
const PAY_MS = 2600;

const UPI_ID = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9]{1,64}$/i;
const digits = (s: string) => s.replace(/\D/g, "");
/** Card numbers in groups of four, up to 19 digits. */
const formatCard = (s: string) => digits(s).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
const formatExpiry = (s: string) => {
  const d = digits(s).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
/** Luhn check, so typos are caught the way a real gateway would. */
function luhn(num: string) {
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let n = Number(num[num.length - 1 - i]);
    if (i % 2) n = n * 2 > 9 ? n * 2 - 9 : n * 2;
    sum += n;
  }
  return num.length >= 12 && sum % 10 === 0;
}
function expiryError(v: string) {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return "Enter the expiry as MM/YY";
  const month = Number(m[1]);
  if (month < 1 || month > 12) return "Enter a valid month";
  const now = new Date();
  const end = new Date(2000 + Number(m[2]), month, 1);
  return end <= now ? "This card has expired" : "";
}
const orderId = () => `PNCH${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const inputClass = "h-11 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-cream placeholder:text-cream/30 focus:border-gold/50 focus:outline-none";

export function CheckoutSheet({ item, onClose, onPaid, onViewBag }: { item: CheckoutItem | null; onClose: () => void; onPaid: (id: string) => void; onViewBag?: () => void }) {
  const [method, setMethod] = useState<Method>("upi");
  const [stage, setStage] = useState<Stage>("form");
  const [upiApp, setUpiApp] = useState("");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [bank, setBank] = useState("");
  const [tried, setTried] = useState(false);
  const [order, setOrder] = useState("");
  const timer = useRef(0);
  // The item stays on screen while the sheet slides away
  const [shown, setShown] = useState<CheckoutItem | null>(item);
  if (item && item !== shown) setShown(item);

  // A fresh, empty form every time the sheet opens. Nothing typed is kept.
  const open = Boolean(item);
  useEffect(() => {
    if (!open) return;
    setMethod("upi");
    setStage("form");
    setUpiApp("");
    setUpi("");
    setCard({ number: "", expiry: "", cvv: "", name: "" });
    setBank("");
    setTried(false);
    setOrder("");
  }, [open, item?.id]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cardNumber = digits(card.number);
  const errors: Record<string, string> =
    method === "upi"
      ? { upi: upiApp || UPI_ID.test(upi.trim()) ? "" : "Pick a UPI app or enter a UPI ID like name@okbank" }
      : method === "card"
        ? {
            number: luhn(cardNumber) ? "" : "Enter a valid card number",
            expiry: expiryError(card.expiry),
            cvv: /^\d{3,4}$/.test(card.cvv) ? "" : "Enter the 3 or 4 digit CVV",
            name: card.name.trim().length >= 2 ? "" : "Enter the name on the card",
          }
        : { bank: bank ? "" : "Choose your bank" };
  const valid = Object.values(errors).every((e) => !e);
  const err = (k: string) => (tried && errors[k] ? <span role="alert" className="mt-1 block text-[11.5px] font-semibold text-[#ff8a8f]">{errors[k]}</span> : null);

  const close = () => {
    if (stage === "paying") return; // don't walk away mid-payment
    window.clearTimeout(timer.current);
    onClose();
  };

  const pay = () => {
    setTried(true);
    if (!valid || !item || stage !== "form") return;
    setStage("paying");
    const paidFor = item.id;
    timer.current = window.setTimeout(() => {
      setOrder(orderId());
      setStage("done");
      onPaid(paidFor);
    }, PAY_MS);
  };

  const it = item ?? shown;
  if (!it) return null;
  const gold = it.tone === "gold";
  const paidWith = method === "upi" ? (upiApp ? `UPI · ${upiApp}` : `UPI · ${upi.trim()}`) : method === "card" ? `Card ending ${cardNumber.slice(-4)}` : bank;
  const waitingText = method === "upi" ? `Approve the payment in ${upiApp || "your UPI app"}` : method === "card" ? "Confirming with your bank (OTP)" : `Waiting for ${bank}`;

  return (
    <BottomSheet open={open} onClose={close} title={stage === "done" ? "Payment successful" : "Checkout"} tall headerRight={PAYMENTS_LIVE ? undefined : <TestModePill />}>
      <div className="space-y-4 px-5 pb-6 pt-1">
        <AnimatePresence mode="wait" initial={false}>
          {stage === "done" ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center pt-4 text-center" data-testid="checkout-success">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.1 }} className="grid h-20 w-20 place-items-center rounded-full bg-[#2fbf71] text-white shadow-[0_10px_40px_rgb(47_191_113/0.45)]">
                <Check className="h-10 w-10" strokeWidth={3} aria-hidden />
              </motion.span>
              <p className="mt-4 font-display text-[26px] font-bold text-cream">{formatInr(it.inr)}</p>
              <p className="text-[13px] text-muted">paid for {it.name}</p>
              <div className="mt-5 w-full space-y-2 rounded-2xl bg-surface p-4 text-left text-[12.5px] ring-1 ring-line">
                <Row k="Order ID" v={order} />
                <Row k="Paid with" v={paidWith} />
                <Row k="Status" v={<span className="font-bold text-[#5fe39a]">{PAYMENTS_LIVE ? "Success" : "Success (test mode)"}</span>} />
              </div>
              <p className="mt-4 text-[13px] text-cream/80">{it.successText ?? "Your red packet is in your Bag. Send it in any room."}</p>
              <div className={`mt-5 grid w-full gap-2 ${onViewBag ? "grid-cols-2" : "grid-cols-1"}`}>
                <button type="button" onClick={close} className={`h-12 rounded-full text-[14px] font-bold ${onViewBag ? "bg-surface text-cream ring-1 ring-line" : "bg-gold text-ink"}`}>
                  Done
                </button>
                {onViewBag ? (
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onViewBag();
                    }}
                    className="h-12 rounded-full bg-gold text-[14px] font-bold text-ink"
                  >
                    Open Bag
                  </button>
                ) : null}
              </div>
            </motion.div>
          ) : stage === "paying" ? (
            <motion.div key="paying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center pt-6 text-center" aria-live="polite">
              <span className="relative grid h-24 w-24 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-gold/15" aria-hidden />
                <span className="grid h-20 w-20 place-items-center rounded-full bg-surface ring-2 ring-gold/50">
                  <Loader2 className="h-9 w-9 animate-spin text-gold" aria-hidden />
                </span>
              </span>
              <p className="mt-5 font-display text-[22px] font-bold text-cream">{formatInr(it.inr)}</p>
              <p className="mt-1 text-[14px] font-semibold text-cream">{waitingText}</p>
              <p className="mt-1 text-[12px] text-muted">Don&apos;t close this screen or press back.</p>
              <ol className="mt-6 w-full space-y-2.5 rounded-2xl bg-surface p-4 text-left text-[12.5px] ring-1 ring-line">
                <Step done label="Order created" />
                <Step active label={method === "upi" ? "Waiting for UPI approval" : "Authorising payment"} />
                <Step label={gold ? "Adding coins to your wallet" : "Adding to your Bag"} />
              </ol>
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

              {/* Method */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Pay with</p>
                <div className="space-y-2" role="radiogroup" aria-label="Payment method">
                  {METHODS.map((m) => {
                    const on = method === m.id;
                    const Icon = m.icon;
                    return (
                      <div key={m.id} className={`rounded-2xl ring-1 transition ${on ? "bg-gold/[0.08] ring-gold/60" : "bg-surface ring-line"}`}>
                        <button type="button" role="radio" aria-checked={on} onClick={() => (setMethod(m.id), setTried(false))} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${on ? "bg-gold text-ink" : "bg-cream/5 text-cream/70"}`}>
                            <Icon className="h-4.5 w-4.5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-bold text-cream">{m.label}</span>
                            <span className="block text-[11.5px] text-muted">{m.sub}</span>
                          </span>
                          <span className={`grid h-5 w-5 place-items-center rounded-full ring-2 ${on ? "ring-gold" : "ring-cream/25"}`}>{on ? <span className="h-2.5 w-2.5 rounded-full bg-gold" /> : null}</span>
                        </button>
                        {on ? (
                          <div className="space-y-2.5 px-3.5 pb-3.5">
                            {m.id === "upi" ? (
                              <>
                                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="UPI app">
                                  {UPI_APPS.map((a) => (
                                    <button
                                      key={a}
                                      type="button"
                                      role="radio"
                                      aria-checked={upiApp === a}
                                      onClick={() => (setUpiApp(upiApp === a ? "" : a), setUpi(""))}
                                      className={`flex h-11 items-center justify-center rounded-xl text-[13px] font-bold ring-1 ${upiApp === a ? "bg-gold/15 text-cream ring-gold/60" : "bg-black/25 text-cream/80 ring-line"}`}
                                    >
                                      {a}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted">
                                  <span className="h-px flex-1 bg-line" /> or pay with a UPI ID <span className="h-px flex-1 bg-line" />
                                </div>
                                <label className="block">
                                  <span className="sr-only">UPI ID</span>
                                  <input value={upi} onChange={(e) => (setUpi(e.target.value), setUpiApp(""))} inputMode="email" autoComplete="off" spellCheck={false} placeholder="yourname@okbank" className={inputClass} />
                                  {err("upi")}
                                  <span className="mt-1.5 block text-[11px] text-muted">You approve the request in your UPI app.</span>
                                </label>
                              </>
                            ) : m.id === "card" ? (
                              <>
                                <label className="block">
                                  <span className="sr-only">Card number</span>
                                  <input value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: formatCard(e.target.value) }))} inputMode="numeric" autoComplete="off" placeholder="Card number" className={`${inputClass} tracking-wider`} />
                                  {err("number")}
                                </label>
                                <div className="grid grid-cols-2 gap-2.5">
                                  <label className="block">
                                    <span className="sr-only">Expiry</span>
                                    <input value={card.expiry} onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))} inputMode="numeric" autoComplete="off" placeholder="MM/YY" className={inputClass} />
                                    {err("expiry")}
                                  </label>
                                  <label className="block">
                                    <span className="sr-only">CVV</span>
                                    <input value={card.cvv} onChange={(e) => setCard((c) => ({ ...c, cvv: digits(e.target.value).slice(0, 4) }))} type="password" inputMode="numeric" autoComplete="off" placeholder="CVV" className={inputClass} />
                                    {err("cvv")}
                                  </label>
                                </div>
                                <label className="block">
                                  <span className="sr-only">Name on card</span>
                                  <input value={card.name} onChange={(e) => setCard((c) => ({ ...c, name: e.target.value.slice(0, 40) }))} autoComplete="off" placeholder="Name on card" className={inputClass} />
                                  {err("name")}
                                </label>
                              </>
                            ) : (
                              <div>
                                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Bank">
                                  {BANKS.map((b) => (
                                    <button key={b} type="button" role="radio" aria-checked={bank === b} onClick={() => setBank(b)} className={`flex h-11 items-center justify-between gap-1 rounded-xl px-3 text-left text-[12px] font-semibold ring-1 ${bank === b ? "bg-gold/15 text-cream ring-gold/60" : "bg-black/25 text-cream/75 ring-line"}`}>
                                      <span className="truncate">{b}</span>
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                                    </button>
                                  ))}
                                </div>
                                {err("bank")}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price */}
              <div className="space-y-1.5 rounded-2xl bg-surface p-4 text-[13px] ring-1 ring-line">
                <Row k="Item price" v={formatInr(it.inr)} />
                <Row k="Convenience fee" v={<span className="text-[#5fe39a]">Free</span>} />
                <div className="my-1 h-px bg-line" />
                <Row k={<span className="font-bold text-cream">Total (incl. GST)</span>} v={<span className="font-display text-[16px] font-bold text-cream">{formatInr(it.inr)}</span>} />
              </div>

              {PAYMENTS_LIVE ? null : (
                <p className="rounded-xl border border-gold/20 bg-gold/[0.06] px-3 py-2 text-[11.5px] leading-snug text-gold/90">Test mode: the payment gateway isn&apos;t connected yet, so nothing is charged. Card and UPI details stay on this screen and are never saved or sent.</p>
              )}

              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={pay} className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gold text-[15.5px] font-bold text-ink">
                <Lock className="h-4 w-4" aria-hidden /> Pay {formatInr(it.inr)}
              </motion.button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-cream/45">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> 100% secure payment · UPI · Cards · Net banking
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}

function TestModePill() {
  return <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-gold">Test mode</span>;
}

function Step({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${done ? "bg-[#2fbf71] text-white" : active ? "ring-2 ring-gold" : "ring-2 ring-cream/20"}`}>
        {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : active ? <Loader2 className="h-3 w-3 animate-spin text-gold" aria-hidden /> : null}
      </span>
      <span className={done || active ? "text-cream" : "text-muted"}>{label}</span>
    </li>
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
