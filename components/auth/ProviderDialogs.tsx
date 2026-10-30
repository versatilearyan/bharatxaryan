"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, EyeOff, Loader2, Mail, UserPlus, X } from "lucide-react";
import { MOCK_APPLE_ID, MOCK_GOOGLE_ACCOUNTS, cleanEmail, emailError } from "@/lib/auth/mock-auth";
import { AppleIcon, AuthButton, GoogleIcon } from "./parts";

/* TEMPORARY MOCK UI: these dialogs stand in for the real Google and Apple
   sign-in windows. Replace them with the providers' own buttons and popups. */

type Phase = "pick" | "working" | "done";

/** A dialog box inside the app frame. Escape or the backdrop cancels, unless it's busy. */
function Dialog({ open, onClose, busy, label, children, tone = "dark" }: { open: boolean; onClose: () => void; busy: boolean; label: string; children: React.ReactNode; tone?: "dark" | "light" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);
  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={label}>
          <motion.button type="button" aria-label="Cancel" tabIndex={-1} className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()} />
          <motion.div
            className={`relative w-full max-w-[360px] overflow-hidden rounded-3xl shadow-2xl ${tone === "light" ? "bg-white text-[#1f1f1f]" : "bg-[#1c1c1e] text-white ring-1 ring-white/10"}`}
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function Working({ text, done, light = false }: { text: string; done: boolean; light?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10" role="status" aria-live="polite">
      {done ? (
        <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="grid h-14 w-14 place-items-center rounded-full bg-[#34c759] text-white">
          <Check className="h-7 w-7" strokeWidth={3} />
        </motion.span>
      ) : (
        <Loader2 className={`h-10 w-10 animate-spin ${light ? "text-[#1a73e8]" : "text-white"}`} aria-hidden />
      )}
      <p className={`text-[14px] font-semibold ${light ? "text-[#3c4043]" : "text-white/85"}`}>{done ? "Signed in" : text}</p>
    </div>
  );
}

/* ---------------- Google ---------------- */

/** Mock "Choose an account" window, styled after Google's so it feels familiar. */
export function GoogleDialog({ open, onCancel, onPick }: { open: boolean; onCancel: () => void; onPick: (account: { name: string; email: string }) => Promise<void> }) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [other, setOther] = useState(false);
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const inputId = useId();
  useEffect(() => {
    if (open) {
      setPhase("pick");
      setOther(false);
      setEmail("");
      setTried(false);
    }
  }, [open]);
  const pick = async (account: { name: string; email: string }) => {
    setPhase("working");
    await onPick(account);
    setPhase("done");
  };
  const err = emailError(email);
  return (
    <Dialog open={open} onClose={onCancel} busy={phase !== "pick"} label="Sign in with Google" tone="light">
      <div className="flex items-center gap-2 border-b border-[#e8eaed] px-5 py-3.5">
        <GoogleIcon className="h-5 w-5" />
        <span className="text-[13.5px] font-medium text-[#3c4043]">Sign in with Google</span>
        {phase === "pick" ? (
          <button type="button" onClick={onCancel} aria-label="Cancel" className="ml-auto grid h-8 w-8 place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4] focus-visible:outline-2 focus-visible:outline-[#1a73e8]">
            <X className="h-4.5 w-4.5" />
          </button>
        ) : null}
      </div>
      {phase !== "pick" ? (
        <Working text="Signing you in…" done={phase === "done"} light />
      ) : other ? (
        <form
          className="px-5 pb-5 pt-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (!err) void pick({ name: cleanEmail(email).split("@")[0], email });
          }}
        >
          <button type="button" onClick={() => setOther(false)} className="-ml-1 flex items-center gap-1 rounded-full px-1 text-[13px] font-medium text-[#1a73e8] hover:underline">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="mt-3 text-[20px] font-normal text-[#202124]">Use another account</h2>
          <label htmlFor={inputId} className="mt-4 block text-[12px] font-medium text-[#5f6368]">
            Email
          </label>
          <input id={inputId} type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(tried && err) || undefined} className={`mt-1 h-12 w-full rounded-lg border px-3.5 text-[15px] text-[#202124] outline-none focus:border-2 ${tried && err ? "border-[#d93025]" : "border-[#dadce0] focus:border-[#1a73e8]"}`} placeholder="name@gmail.com" />
          <p className="mt-1 min-h-[18px] text-[12px] text-[#d93025]" role={tried && err ? "alert" : undefined}>
            {tried ? err : ""}
          </p>
          <button type="submit" className="mt-3 h-10 w-full rounded-full bg-[#1a73e8] text-[14px] font-medium text-white hover:bg-[#1765cc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8]">
            Next
          </button>
        </form>
      ) : (
        <div className="pb-3 pt-4">
          <h2 className="px-5 text-[20px] font-normal text-[#202124]">Choose an account</h2>
          <p className="px-5 pt-0.5 text-[13px] text-[#5f6368]">to continue to Panchayat</p>
          <ul className="mt-3 border-t border-[#e8eaed]">
            {MOCK_GOOGLE_ACCOUNTS.map((a) => (
              <li key={a.email} className="border-b border-[#e8eaed]">
                <button type="button" onClick={() => void pick(a)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#f8f9fa] focus-visible:bg-[#e8f0fe] focus-visible:outline-none">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-semibold text-white" style={{ background: a.color }} aria-hidden>
                    {a.name[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[#3c4043]">{a.name}</span>
                    <span className="block truncate text-[12.5px] text-[#5f6368]">{a.email}</span>
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => setOther(true)} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[14px] font-medium text-[#3c4043] hover:bg-[#f8f9fa] focus-visible:bg-[#e8f0fe] focus-visible:outline-none">
                <span className="grid h-9 w-9 place-items-center rounded-full text-[#5f6368]" aria-hidden>
                  <UserPlus className="h-5 w-5" />
                </span>
                Use another account
              </button>
            </li>
          </ul>
          <p className="px-5 pt-3 text-[11px] leading-snug text-[#5f6368]">Demo only: these are sample accounts. Nothing is sent to Google.</p>
        </div>
      )}
    </Dialog>
  );
}

/* ---------------- Apple ---------------- */

/** Mock Sign in with Apple sheet: confirm the Apple ID and choose to share or hide the email. */
export function AppleDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: (hideEmail: boolean) => Promise<void> }) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [hide, setHide] = useState(false);
  useEffect(() => {
    if (open) {
      setPhase("pick");
      setHide(false);
    }
  }, [open]);
  const go = async () => {
    setPhase("working");
    await onConfirm(hide);
    setPhase("done");
  };
  return (
    <Dialog open={open} onClose={onCancel} busy={phase !== "pick"} label="Sign in with Apple">
      <div className="flex items-center px-4 pt-3.5">
        <span className="w-8" />
        <AppleIcon className="mx-auto h-6 w-6" />
        {phase === "pick" ? (
          <button type="button" onClick={onCancel} aria-label="Cancel" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-8" />
        )}
      </div>
      {phase !== "pick" ? (
        <Working text="Signing in with Apple…" done={phase === "done"} />
      ) : (
        <div className="px-5 pb-5 pt-2">
          <h2 className="text-center text-[20px] font-semibold">Sign in with Apple</h2>
          <p className="mt-1 text-center text-[13px] text-white/60">Use your Apple ID to sign in to Panchayat.</p>

          <div className="mt-4 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-[#8e8e93] to-[#636366] text-[14px] font-semibold" aria-hidden>
                {MOCK_APPLE_ID.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">{MOCK_APPLE_ID.name}</span>
                <span className="block truncate text-[12.5px] text-white/55">{MOCK_APPLE_ID.email}</span>
              </span>
            </div>
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Email</p>
          <div className="mt-1.5 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10" role="radiogroup" aria-label="Email to share">
            {[
              { hideIt: false, icon: <Mail className="h-4.5 w-4.5" />, title: "Share My Email", sub: MOCK_APPLE_ID.email },
              { hideIt: true, icon: <EyeOff className="h-4.5 w-4.5" />, title: "Hide My Email", sub: "Forwards to your email" },
            ].map((o, i) => (
              <button
                key={o.title}
                type="button"
                role="radio"
                aria-checked={hide === o.hideIt}
                onClick={() => setHide(o.hideIt)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] focus-visible:bg-white/[0.08] focus-visible:outline-none ${i ? "border-t border-white/10" : ""}`}
              >
                <span className="text-white/70">{o.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">{o.title}</span>
                  <span className="block truncate text-[12px] text-white/50">{o.sub}</span>
                </span>
                <span className={`grid h-5 w-5 place-items-center rounded-full ${hide === o.hideIt ? "bg-[#0a84ff]" : "ring-1 ring-white/30"}`} aria-hidden>
                  {hide === o.hideIt ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <AuthButton tone="soft" onClick={onCancel} className="!h-11 !text-[14px]">
              Cancel
            </AuthButton>
            <AuthButton tone="light" onClick={() => void go()} className="!h-11 !text-[14px]">
              Continue
            </AuthButton>
          </div>
          <p className="mt-3 text-center text-[11px] leading-snug text-white/45">Demo only: a sample Apple ID. Nothing is sent to Apple.</p>
        </div>
      )}
    </Dialog>
  );
}
