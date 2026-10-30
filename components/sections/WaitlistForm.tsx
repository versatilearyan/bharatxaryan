"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";

/**
 * ⚠️ FRONTEND-ONLY DEMO
 * ---------------------
 * This form does NOT submit to any server or third-party service.
 * The email and name are validated in the browser and then discarded:
 * nothing is stored (no localStorage, no cookies) and nothing is sent.
 *
 * To connect a real waitlist later, replace the body of `submitToWaitlist`
 * with a call to your provider (e.g. a POST to your own API route).
 */
async function submitToWaitlist(_data: { email: string; name?: string }): Promise<void> {
  // Simulated latency so the loading state is visible. No network request is made.
  await new Promise((resolve) => setTimeout(resolve, 700));
}

// Pragmatic email check: something@something.tld, no spaces
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Status = "idle" | "submitting" | "success";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const emailRef = useRef<HTMLInputElement>(null);
  const ids = { email: useId(), name: useId(), error: useId() };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address to join the waitlist.");
      emailRef.current?.focus();
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError("That email doesn’t look right. Check it has an @ and a domain, like name@example.com.");
      emailRef.current?.focus();
      return;
    }
    setError(null);
    setStatus("submitting");
    await submitToWaitlist({ email: trimmed, name: name.trim() || undefined });
    setStatus("success");
  };

  const reset = () => {
    setEmail("");
    setName("");
    setStatus("idle");
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[1.5rem] border border-gold/35 bg-gold/[0.06] p-7 text-center sm:p-9"
            role="status"
            aria-live="polite"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.1 }}
              className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold text-ink"
            >
              <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
            </motion.span>
            <p className="mt-5 font-display text-2xl font-bold text-cream">
              {name.trim() ? `You’re on the list, ${name.trim()}.` : "You’re on the list."}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-muted">
              This is a demo, so your email wasn’t actually sent or saved. When the real waitlist opens, this is where
              you’ll get your confirmation.
            </p>
            <button type="button" onClick={reset} className="mt-6 text-sm font-semibold text-gold underline-offset-4 hover:underline">
              Try another email
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            noValidate
            onSubmit={onSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="rounded-[1.5rem] border border-line-strong bg-surface/70 p-5 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)] sm:p-7"
            aria-describedby="waitlist-demo-note"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor={ids.email} className="mb-2 block text-sm font-semibold text-cream">
                  Email address
                </label>
                <input
                  ref={emailRef}
                  id={ids.email}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="you@example.com"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? ids.error : undefined}
                  className={`h-13 w-full rounded-2xl border bg-ink px-4 text-base text-cream placeholder:text-muted/60 transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 ${
                    error ? "border-coral focus:ring-coral/50" : "border-line-strong focus:border-gold/60 focus:ring-gold/30"
                  }`}
                />
                <AnimatePresence>
                  {error ? (
                    <motion.p
                      id={ids.error}
                      role="alert"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 overflow-hidden pt-2 text-sm text-pink"
                    >
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      {error}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={ids.name} className="mb-2 block text-sm font-semibold text-cream">
                  Name <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id={ids.name}
                  type="text"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  className="h-13 w-full rounded-2xl border border-line-strong bg-ink px-4 text-base text-cream placeholder:text-muted/60 transition-colors focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
            </div>

            <button type="submit" disabled={status === "submitting"} className={buttonClass("primary", "mt-6 w-full")}>
              {status === "submitting" ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  Joining…
                </>
              ) : (
                "Join the Waitlist"
              )}
            </button>
            <p id="waitlist-demo-note" className="mt-4 text-center text-xs text-muted">
              Demo form: nothing is sent or stored yet.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
