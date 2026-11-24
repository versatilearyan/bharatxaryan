"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Crown, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin } from "@/components/ui/kit";
import { manualTopupApi, type RoyalInfo, type TopupInfo, type TopupRequest } from "@/lib/api/manual-topup";
import { RoyalPackCard, RoyalPackStep, shortCoins } from "./RoyalPack";
import { getWalletCoinPacks, type WalletCoinPack } from "@/lib/api/wallet";
import { shrinkToJpeg } from "@/lib/app/chat-wallpaper";
import { formatInr } from "@/lib/app/redpacket";
import { useApp } from "@/lib/app/store";

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const inputClass = "h-11 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-cream placeholder:text-cream/30 focus:border-gold/50 focus:outline-none";

/**
 * Pay Mukhiya ji by UPI, for people whose Google Pay / Paytm doesn't like the payment gateway:
 * 1. pick a coin pack (the price and coins always come from the pack),
 * 2. pay the UPI ID / QR shown, then send the transaction ID (UTR) and a screenshot,
 * 3. Mukhiya ji checks the payment in the bank and approves: the coins arrive in the wallet and a message comes in the Mukhiya ji chat.
 * Everything that happens is also written in that chat (automated messages with a button that brings you back here).
 */
export function ManualTopupSheet({ open, onClose, packId, requestId, royal: wantRoyal }: { open: boolean; onClose: () => void; packId?: string; requestId?: string; royal?: boolean }) {
  const { toast, setSheet } = useApp();
  const [info, setInfo] = useState<TopupInfo | null>(null);
  const [packs, setPacks] = useState<WalletCoinPack[] | null>(null);
  const [royal, setRoyal] = useState<RoyalInfo | null>(null);
  const [mine, setMine] = useState<TopupRequest[]>([]);
  const [current, setCurrent] = useState<TopupRequest | null>(null);
  const [step, setStep] = useState<"pick" | "pay" | "proof" | "royal">("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [utr, setUtr] = useState("");
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [copied, setCopied] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      const [i, m] = await Promise.all([manualTopupApi.info(), manualTopupApi.mine()]);
      setInfo(i);
      setMine(m);
      return { i, m };
    } catch (e) {
      setError(errText(e, "Couldn't load. Try again."));
      return null;
    }
  }, []);

  // Each time it opens: fresh, then go to the right step (a request from the chat, a pack, or the pack list)
  useEffect(() => {
    if (!open) return;
    setError("");
    setUtr("");
    setShot(null);
    setCurrent(null);
    setStep("pick");
    let live = true;
    void (async () => {
      const r = await reload();
      if (!live || !r) return;
      getWalletCoinPacks().then((p) => live && setPacks(p)).catch(() => live && setPacks([]));
      manualTopupApi.royal().then((x) => live && setRoyal(x)).catch(() => undefined);
      if (wantRoyal && r.i.enabled) {
        setStep("royal");
      } else if (requestId) {
        const found = r.m.find((x) => x.id === requestId);
        if (found) {
          setCurrent(found);
          setStep(found.status === "REQUESTED" ? "pay" : "pick");
        }
      } else if (packId && r.i.enabled) {
        void start(packId);
      }
    })();
    return () => {
      live = false;
    };
    // start is stable enough for opening; only re-run when the sheet opens or its target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, packId, requestId, wantRoyal]);

  const startRoyal = async (plate: string, title: "KING" | "QUEEN") => {
    setBusy(true);
    setError("");
    try {
      const r = await manualTopupApi.requestRoyal(plate, title);
      setCurrent(r);
      setStep("pay");
      void reload();
    } catch (e) {
      setError(errText(e, "Couldn't start the Royal Pack."));
    } finally {
      setBusy(false);
    }
  };

  useEffect(
    () => () => {
      if (shot) URL.revokeObjectURL(shot.url);
    },
    [shot],
  );

  const start = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      const r = await manualTopupApi.request(id);
      setCurrent(r);
      setStep("pay");
      void reload();
    } catch (e) {
      setError(errText(e, "Couldn't start the top-up."));
    } finally {
      setBusy(false);
    }
  };

  const copy = (text: string, key: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(key);
        window.setTimeout(() => setCopied(""), 1500);
      },
      () => toast("Couldn't copy. Select and copy it by hand."),
    );
  };

  const pickShot = async (f?: File) => {
    if (!f) return;
    setError("");
    try {
      const blob = await shrinkToJpeg(f);
      setShot({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(errText(e, "Couldn't read that picture."));
    }
  };

  const submit = async () => {
    if (!current || !shot || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await manualTopupApi.submit(current.id, utr, shot.blob);
      setCurrent(r);
      setStep("pick");
      toast(`Sent to ${info?.name ?? "Mukhiya ji"} for checking`, "gold");
      void reload();
    } catch (e) {
      setError(errText(e, "Couldn't send. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!current || busy) return;
    setBusy(true);
    try {
      await manualTopupApi.cancel(current.id);
      setCurrent(null);
      setStep("pick");
      void reload();
    } catch (e) {
      setError(errText(e, "Couldn't cancel."));
    } finally {
      setBusy(false);
    }
  };

  const name = info?.name ?? "Mukhiya ji";
  const utrOk = /^[A-Za-z0-9]{10,30}$/.test(utr.replace(/\s/g, ""));
  const waiting = mine.filter((m) => m.status === "SUBMITTED" || m.status === "REQUESTED");
  const label = (s: TopupRequest["status"]) => (s === "SUBMITTED" ? `${name} is checking` : s === "APPROVED" ? "Coins added ✅" : s === "REJECTED" ? "Not verified" : s === "REQUESTED" ? "Waiting for your payment" : "Cancelled");

  return (
    <BottomSheet open={open} onClose={onClose} title={step === "royal" ? `👑 ${royal?.name ?? "Royal Pack"}` : `Pay ${name} by UPI`} tall>
      <div className="space-y-4 px-5 pb-6">
        {!info ? (
          <p className="grid place-items-center py-10" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-gold" aria-label="Loading" />
          </p>
        ) : !info.enabled ? (
          <p className="rounded-2xl bg-surface px-4 py-6 text-center text-[13px] text-muted ring-1 ring-line">Manual UPI top-up isn&apos;t available right now. Please use the normal payment.</p>
        ) : (
          <>
            {error ? (
              <p role="alert" className="rounded-2xl bg-[#3a1418] px-3.5 py-3 text-[12.5px] text-[#ffb0b4] ring-1 ring-coral/25">
                {error}
              </p>
            ) : null}

            {step === "royal" ? (
              royal?.enabled && royal.frame ? (
                <RoyalPackStep info={royal} munshiName={name} busy={busy} initialName={current?.kind === "ROYAL" ? current.plateName : undefined} onContinue={(p, t) => void startRoyal(p, t)} onBack={() => setStep("pick")} />
              ) : royal ? (
                <p className="rounded-2xl bg-surface px-4 py-6 text-center text-[13px] text-muted ring-1 ring-line">The Royal Pack isn&apos;t on sale right now.</p>
              ) : (
                <p className="grid place-items-center py-10" role="status">
                  <Loader2 className="h-5 w-5 animate-spin text-gold" aria-label="Loading" />
                </p>
              )
            ) : step === "pay" && current ? (
              <>
                {current.kind === "ROYAL" ? (
                  <div className="rounded-2xl bg-[radial-gradient(120%_100%_at_15%_0%,#4b1f86_0%,#26113f_50%,#140a22_100%)] p-4 ring-1 ring-gold/50">
                    <p className="flex items-center gap-1.5 text-[12px] font-bold text-gold">
                      <Crown className="h-3.5 w-3.5" aria-hidden /> {current.packName}
                    </p>
                    <p className="mt-1 font-display text-[28px] font-extrabold text-cream">Pay {formatInr(current.amountInr)}</p>
                    <p className="mt-0.5 text-[12.5px] text-cream/75">
                      Frame name <b className="text-gold">{current.plateName}</b>
                      {current.coins > 0 ? ` · ${shortCoins(current.coins)} coins` : ""} · 2 royal titles
                    </p>
                    <button type="button" onClick={() => setStep("royal")} className="mt-1 text-[12px] font-semibold text-gold underline">
                      Change the name
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-gradient-to-br from-[#4a3214] via-[#2a1a0c] to-[#1a1008] p-4 ring-1 ring-gold/40">
                    <p className="text-[12px] text-gold/80">{current.packName}</p>
                    <p className="mt-1 font-display text-[28px] font-extrabold text-cream">Pay {formatInr(current.amountInr)}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-cream/70">
                      You get <Coin className="h-3.5 w-3.5" /> {current.coins.toLocaleString("en-IN")} coins
                    </p>
                  </div>
                )}
                <div className="space-y-2 rounded-2xl bg-surface p-4 ring-1 ring-line">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">1. Pay this UPI ID</p>
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[15px] font-semibold text-cream">{info.upiId}</span>
                    <button type="button" onClick={() => copy(info.upiId ?? "", "upi")} className="flex h-9 items-center gap-1 rounded-full bg-cream/10 px-3 text-[12px] font-semibold text-cream">
                      {copied === "upi" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied === "upi" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {info.payeeName ? <p className="text-[12px] text-cream/60">Name: {info.payeeName}</p> : null}
                  {info.qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={info.qrUrl} alt="UPI QR code" className="mx-auto mt-1 h-44 w-44 rounded-xl bg-white object-contain p-2" />
                  ) : null}
                  {current.upiLink ? (
                    <a href={current.upiLink} className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink to-gold text-[14px] font-bold text-white">
                      <Smartphone className="h-4 w-4" aria-hidden /> Open my UPI app
                    </a>
                  ) : null}
                  <p className="text-[12px] text-cream/60">
                    Pay exactly <b className="text-cream">{formatInr(current.amountInr)}</b>. If you can, write <b className="text-cream">{current.reference}</b> in the payment note.{" "}
                    <button type="button" onClick={() => copy(current.reference, "ref")} className="font-semibold text-gold">
                      {copied === "ref" ? "Copied" : "Copy reference"}
                    </button>
                  </p>
                  {info.note ? <p className="rounded-xl bg-cream/[0.06] px-3 py-2 text-[12px] text-cream/75">{info.note}</p> : null}
                </div>
                <button type="button" onClick={() => setStep("proof")} className="h-12 w-full rounded-full bg-coral text-[15px] font-extrabold text-white">
                  I have paid · send the proof
                </button>
                <button type="button" disabled={busy} onClick={() => void cancel()} className="h-10 w-full rounded-full text-[13px] font-semibold text-cream/60">
                  Cancel this request
                </button>
              </>
            ) : step === "proof" && current ? (
              <>
                <p className="text-[13px] text-cream/80">
                  Send the <b>transaction ID (UTR)</b> and a <b>screenshot</b> of the payment for {formatInr(current.amountInr)}. {name} checks it in the bank, then {current.kind === "ROYAL" ? "gives you everything in the pack" : "your coins arrive"}.
                </p>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-cream/70">Transaction ID (UTR)</span>
                  <input value={utr} onChange={(e) => setUtr(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 30))} inputMode="text" autoComplete="off" placeholder="12-digit number from your payment app" aria-label="Transaction ID" className={inputClass} />
                </label>
                <div>
                  <span className="mb-1 block text-[12px] font-semibold text-cream/70">Payment screenshot</span>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Choose payment screenshot" onChange={(e) => { void pickShot(e.target.files?.[0]); e.target.value = ""; }} />
                  {shot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shot.url} alt="Your screenshot" className="mb-2 max-h-56 w-full rounded-xl object-contain ring-1 ring-line" />
                  ) : null}
                  <button type="button" onClick={() => fileRef.current?.click()} className="h-11 w-full rounded-2xl border border-dashed border-gold/50 text-[13.5px] font-semibold text-gold">
                    {shot ? "Choose another screenshot" : "Choose a screenshot from the gallery"}
                  </button>
                </div>
                <button type="button" disabled={!utrOk || !shot || busy} onClick={() => void submit()} className="flex h-12 w-full items-center justify-center rounded-full bg-coral text-[15px] font-extrabold text-white disabled:opacity-40">
                  {busy ? "Sending…" : `Send to ${name}`}
                </button>
                <button type="button" onClick={() => setStep("pay")} className="h-10 w-full rounded-full text-[13px] font-semibold text-cream/60">
                  Back
                </button>
              </>
            ) : (
              <>
                {current && current.status !== "REQUESTED" ? (
                  <div className={`rounded-2xl p-4 text-[13px] ring-1 ${current.status === "REJECTED" ? "bg-[#3a1418] text-[#ffb0b4] ring-coral/25" : "bg-emerald-500/10 text-cream ring-emerald-400/30"}`} role="status">
                    <p className="font-bold">{label(current.status)}</p>
                    <p className="mt-1 text-cream/75">
                      {current.status === "SUBMITTED"
                        ? `We got your proof for ${formatInr(current.amountInr)} (${current.utr ?? ""}). ${name} will check it and message you in the chat. You can close this.`
                        : current.status === "REJECTED"
                          ? (current.rejectReason ?? "The payment couldn't be verified.")
                          : current.kind === "ROYAL"
                            ? "Your Royal frame, titles and coins are yours. Check the message from " + name + "."
                            : "Your coins are in the wallet."}
                    </p>
                  </div>
                ) : null}
                {waiting.length ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Your top-ups</p>
                    {waiting.map((m) => (
                      <button key={m.id} type="button" onClick={() => { setCurrent(m); setStep(m.status === "REQUESTED" ? "pay" : "pick"); }} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-line">
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-cream">{m.packName} · {formatInr(m.amountInr)}</span>
                          <span className="block text-[11.5px] text-muted">{label(m.status)} · {m.reference}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {royal?.enabled ? <RoyalPackCard info={royal} munshiName={name} onOpen={() => setStep("royal")} /> : null}
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Choose a coin pack</p>
                {!packs ? (
                  <p className="grid place-items-center py-6" role="status">
                    <Loader2 className="h-5 w-5 animate-spin text-gold" aria-label="Loading packs" />
                  </p>
                ) : !packs.length ? (
                  <p className="rounded-2xl bg-surface px-4 py-6 text-center text-[12.5px] text-muted ring-1 ring-line">No coin packs are on sale right now.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {packs.map((p) => (
                      <button key={p.id} type="button" disabled={busy} onClick={() => void start(p.id)} className="rounded-2xl bg-surface p-3 text-left ring-1 ring-line disabled:opacity-60">
                        <span className="flex items-center gap-1.5 font-display text-[16px] font-extrabold text-cream">
                          <Coin className="h-4 w-4" /> {p.coins.toLocaleString("en-IN")}
                        </span>
                        {p.bonusCoins > 0 ? <span className="block text-[11px] text-gold">+{p.bonusCoins.toLocaleString("en-IN")} bonus</span> : null}
                        <span className="mt-1 block text-[13.5px] font-bold text-gold">{formatInr(p.priceInRupees)}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-cream/45">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /> Coins are added only after {name} verifies your payment.
                </p>
                <button type="button" onClick={() => setSheet({ kind: "ticket" })} className="h-10 w-full rounded-full text-[13px] font-semibold text-cream/60">
                  Problem with a payment? Raise a ticket
                </button>
                <button type="button" onClick={() => setSheet({ kind: "coins" })} className="h-10 w-full rounded-full text-[13px] font-semibold text-cream/60">
                  Back to the normal payment
                </button>
              </>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
