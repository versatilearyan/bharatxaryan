"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Mail, RotateCw, UserRound } from "lucide-react";
import { SunsetScene } from "@/components/art/SunsetScene";
import { Logo } from "@/components/brand/Logo";
import { useApp } from "@/lib/app/store";
import type { Gender } from "@/lib/app/types";
import { OTP_LENGTH, completeProfileRequest, emailError, maskEmail, requestEmailCode, signInWithGoogle, verifyEmailCode, type AuthMethod, type AuthUser } from "@/lib/auth/auth";
import { ApiError } from "@/lib/api/client";
import { AuthButton, Field } from "./parts";
import { OtpInput } from "./OtpInput";
import { GoogleButton } from "./GoogleButton";

/** People must be at least this old to join. Keep in step with the backend's minimum age. */
export const MIN_AGE = 18;
const NAME_MAX = 24;
/** How long the "You're signed in" screen stays before the app opens. */
const SUCCESS_MS = 1300;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Whole years between a "YYYY-MM-DD" birthday and today. */
export function ageOn(dob: string, today = new Date()) {
  const [y, m, d] = dob.split("-").map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

const METHOD_LABEL: Record<AuthMethod, string> = { google: "Google", apple: "Apple", email: "email" };

type Step = "start" | "email" | "otp" | "success";

/**
 * The sign-in screens: Google, or email with a 6-digit code, then (for a new
 * account) name, gender and date of birth. Every step calls the Panchayat
 * backend through lib/auth/auth.ts.
 */
export function AuthFlow() {
  const { session, signIn } = useApp();
  const [step, setStep] = useState<Step>("start");
  const [email, setEmail] = useState("");
  const [codeFor, setCodeFor] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [sentNote, setSentNote] = useState("");
  const [done, setDone] = useState<AuthUser | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Any method succeeded: show the success screen, then sign in for real (in the app's state). */
  const succeed = useCallback(
    (user: AuthUser, delay = 0) => {
      window.setTimeout(() => {
        if (!alive.current) return;
        setDone(user);
        setStep("success");
        window.setTimeout(() => {
          if (!alive.current) return;
          // Back to the first screen underneath, for when this account signs out later
          setStep("start");
          setDone(null);
          signIn(user);
        }, SUCCESS_MS);
      }, delay);
    },
    [signIn],
  );

  const codeSent = (sentTo: string, resendIn: number, message: string) => {
    setSentNote(message || "Code sent. Check your inbox (and spam).");
    setCodeFor(sentTo);
    setEmail(sentTo);
    setResendAt(Date.now() + resendIn * 1000);
    setStep("otp");
  };

  // Signed in but the backend says this account has no profile yet: last step
  if (session && !session.profileCompleted) return <Shell back={null}><ProfileStep /></Shell>;

  const back = step === "email" || step === "otp" ? () => setStep(step === "otp" ? "email" : "start") : null;

  return (
    <Shell back={back}>
      <AnimatePresence mode="wait" initial={false}>
        {step === "start" ? (
          <Slide key="start">
            <StartStep
              email={email}
              setEmail={setEmail}
              onEmailScreen={() => setStep("email")}
              onCodeSent={codeSent}
              onSignedIn={(u) => succeed(u, 300)}
            />
          </Slide>
        ) : step === "email" ? (
          <Slide key="email">
            <EmailStep email={email} setEmail={setEmail} onCodeSent={codeSent} onBack={() => setStep("start")} />
          </Slide>
        ) : step === "otp" ? (
          <Slide key="otp">
            <OtpStep email={codeFor} sentNote={sentNote} resendAt={resendAt} setResendAt={setResendAt} onChangeEmail={() => setStep("email")} onBack={() => setStep("email")} onVerified={(u) => succeed(u, 450)} />
          </Slide>
        ) : done ? (
          <Slide key="success">
            <SuccessStep user={done} />
          </Slide>
        ) : null}
      </AnimatePresence>
    </Shell>
  );
}

/** Scene header and the scrolling column every step sits in. */
function Shell({ back, children }: { back: (() => void) | null; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-[80] flex flex-col overflow-hidden bg-ink">
      <div className="relative h-[30%] min-h-[190px] shrink-0">
        <SunsetScene theme="dusk" motif="banyan" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/10 to-ink" />
        {back ? (
          <button type="button" onClick={back} aria-label="Back" className="pt-safe absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-cream backdrop-blur outline-none focus-visible:ring-2 focus-visible:ring-gold">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
        <div className="absolute inset-x-0 bottom-3 flex justify-center">
          <Logo size="1.7rem" />
        </div>
      </div>
      <div className="app-scroll relative flex-1 px-6 pb-safe">
        <div className="mx-auto w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
      {children}
    </motion.div>
  );
}

function Title({ title, sub }: { title: string; sub: React.ReactNode }) {
  return (
    <>
      <h1 className="mt-4 font-display text-[26px] font-extrabold leading-tight text-cream">{title}</h1>
      <p className="mt-1 text-[13.5px] text-muted">{sub}</p>
    </>
  );
}

function Spacer() {
  return <div className="pb-6" />;
}

/** A message that's fine to show for anything thrown by the auth calls. */
function messageOf(e: unknown, fallback: string) {
  if (e instanceof ApiError || e instanceof Error) return e.message || fallback;
  return fallback;
}

function EmailInput({ id, value, onChange, invalid, autoFocus }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean; autoFocus?: boolean }) {
  return (
    <input
      id={id}
      type="email"
      inputMode="email"
      autoComplete="email"
      autoCapitalize="none"
      spellCheck={false}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="you@example.com"
      aria-invalid={invalid || undefined}
      aria-describedby={`${id}-msg`}
      className="min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none placeholder:text-cream/35"
    />
  );
}

/** Ask for a code; shared by the main screen and the email screen. */
function useSendCode(onCodeSent: (email: string, resendIn: number, message: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const send = async (email: string) => {
    if (busy) return;
    const err = emailError(email);
    setError(err);
    if (err) return;
    setBusy(true);
    try {
      const r = await requestEmailCode(email);
      onCodeSent(r.email, r.resendIn, r.message);
    } catch (e) {
      setError(messageOf(e, "Couldn't send the code. Try again."));
      setBusy(false);
    }
  };
  return { busy, error, setError, send };
}

function StartStep({ email, setEmail, onEmailScreen, onCodeSent, onSignedIn }: { email: string; setEmail: (v: string) => void; onEmailScreen: () => void; onCodeSent: (email: string, resendIn: number, message: string) => void; onSignedIn: (u: AuthUser) => void }) {
  const id = useId();
  const [google, setGoogle] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const { busy, error, setError, send } = useSendCode(onCodeSent);

  /** Google gave us an ID token: the backend checks it and returns its own JWT. */
  const withGoogle = async (idToken: string) => {
    if (google || busy) return;
    setGoogle(true);
    setGoogleError("");
    try {
      onSignedIn(await signInWithGoogle(idToken));
    } catch (e) {
      setGoogleError(messageOf(e, "Google sign-in didn't work. Try again."));
      setGoogle(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        // No email typed yet: open the email screen. Otherwise send the code straight away.
        if (!email.trim()) return onEmailScreen();
        send(email);
      }}
    >
      <Title title="Welcome to Panchayat" sub="Sign in or create an account to continue." />

      <div className="mt-6">
        <GoogleButton onCredential={withGoogle} onError={setGoogleError} busy={google} disabled={busy} />
        <p role={googleError ? "alert" : undefined} className="mt-1.5 min-h-[18px] text-center text-[12px] font-semibold text-[#ff8a8f]">
          {googleError}
        </p>
      </div>

      <div className="mb-5 mt-1 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted/80" role="separator" aria-label="or">
        <span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" />
      </div>

      <div className="-mt-5">
        <Field label="Email" id={id} icon={<Mail className="h-4.5 w-4.5" />} error={error}>
          <EmailInput
            id={id}
            value={email}
            invalid={!!error}
            onChange={(v) => {
              setEmail(v);
              if (error) setError("");
            }}
          />
        </Field>
      </div>
      <AuthButton type="submit" tone="coral" loading={busy} disabled={google} className="mt-2">
        <Mail className="h-4.5 w-4.5" /> Continue with Email
      </AuthButton>

      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-muted">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="font-semibold text-cream/85 underline underline-offset-2 hover:text-gold">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-semibold text-cream/85 underline underline-offset-2 hover:text-gold">
          Privacy Policy
        </Link>
        .
      </p>
      <Spacer />
    </form>
  );
}

function EmailStep({ email, setEmail, onCodeSent, onBack }: { email: string; setEmail: (v: string) => void; onCodeSent: (email: string, resendIn: number, message: string) => void; onBack: () => void }) {
  const id = useId();
  const { busy, error, setError, send } = useSendCode(onCodeSent);
  return (
    <form noValidate onSubmit={(e) => (e.preventDefault(), send(email))}>
      <Title title="Continue with Email" sub="Enter your email address to receive a verification code." />
      <Field label="Email" id={id} icon={<Mail className="h-4.5 w-4.5" />} error={error}>
        <EmailInput
          id={id}
          value={email}
          invalid={!!error}
          autoFocus
          onChange={(v) => {
            setEmail(v);
            if (error) setError("");
          }}
        />
      </Field>
      <AuthButton type="submit" tone="coral" loading={busy} className="mt-2">
        Continue
      </AuthButton>
      <AuthButton tone="soft" disabled={busy} onClick={onBack} className="mt-3">
        Back
      </AuthButton>
      <Spacer />
    </form>
  );
}

function OtpStep({ email, sentNote, resendAt, setResendAt, onChangeEmail, onBack, onVerified }: { email: string; sentNote: string; resendAt: number; setResendAt: (t: number) => void; onChangeEmail: () => void; onBack: () => void; onVerified: (u: AuthUser) => void }) {
  const msgId = useId();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "verifying" | "verified">("idle");
  const [error, setError] = useState("");
  const [note, setNote] = useState(sentNote);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (left <= 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [left, resendAt]);

  const verify = async (value = code) => {
    if (state !== "idle") return;
    if (!/^\d+$/.test(value) || value.length < OTP_LENGTH) return setError(`Enter all ${OTP_LENGTH} digits`);
    setError("");
    setNote("");
    setState("verifying");
    try {
      const user = await verifyEmailCode(email, value);
      setState("verified");
      onVerified(user);
    } catch (e) {
      setState("idle");
      // Wrong, expired or too many tries: the backend's message says which
      setError(messageOf(e, "Couldn't verify the code. Try again."));
    }
  };

  const resend = async () => {
    if (left > 0 || resending || state !== "idle") return;
    setResending(true);
    setError("");
    try {
      const r = await requestEmailCode(email);
      setResendAt(Date.now() + r.resendIn * 1000);
      setNow(Date.now());
      setCode("");
      setNote(r.message || "We sent a new code.");
    } catch (e) {
      setError(messageOf(e, "Couldn't send a new code. Try again."));
    }
    setResending(false);
  };

  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <form noValidate onSubmit={(e) => (e.preventDefault(), verify())}>
      <Title
        title="Verify your email"
        sub={
          <>
            Enter the 6-digit verification code.
            <span className="mt-1 flex flex-wrap items-center gap-x-2">
              <span>
                Sent to <b className="font-semibold text-cream">{maskEmail(email)}</b>
              </span>
              <button type="button" onClick={onChangeEmail} disabled={state !== "idle"} className="font-bold text-gold underline-offset-2 hover:underline disabled:opacity-50">
                Change email
              </button>
            </span>
          </>
        }
      />

      <div className="mt-6">
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError("");
          }}
          length={OTP_LENGTH}
          invalid={!!error}
          disabled={state !== "idle"}
          autoFocus
          describedBy={msgId}
          onComplete={(v) => verify(v)}
        />
        <p id={msgId} role={error ? "alert" : "status"} aria-live="polite" className={`mt-2 min-h-[18px] text-[12px] font-semibold ${error ? "text-[#ff8a8f]" : "text-[#5ee0a0]"}`}>
          {error || note}
        </p>
      </div>

      <AuthButton type="submit" tone={state === "verified" ? "gold" : "coral"} loading={state === "verifying"} disabled={state === "verified"} className="mt-5">
        {state === "verified" ? (
          <>
            <Check className="h-5 w-5" /> Verified
          </>
        ) : (
          "Verify"
        )}
      </AuthButton>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-muted">
        Didn&apos;t get it?
        {left > 0 ? (
          <span className="font-semibold text-cream/60" aria-live="off">
            Resend OTP in <span className="tabular-nums">{mm}</span>
          </span>
        ) : (
          <button type="button" onClick={resend} disabled={resending || state !== "idle"} className="inline-flex items-center gap-1 font-bold text-gold hover:underline disabled:opacity-50">
            <RotateCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} /> {resending ? "Sending…" : "Resend OTP"}
          </button>
        )}
      </div>

      <AuthButton tone="soft" disabled={state !== "idle"} onClick={onBack} className="mt-5">
        Back
      </AuthButton>
      <Spacer />
    </form>
  );
}

function SuccessStep({ user }: { user: AuthUser }) {
  return (
    <div className="flex flex-col items-center pt-8 text-center" role="status" aria-live="polite">
      <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 320, damping: 18 }} className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-gold to-coral text-ink shadow-[0_12px_40px_-12px_rgb(255_190_80/0.8)]">
        <Check className="h-10 w-10" strokeWidth={3} />
      </motion.span>
      <h1 className="mt-5 font-display text-[24px] font-extrabold text-cream">You&apos;re signed in</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        With {METHOD_LABEL[user.method]} as <b className="font-semibold text-cream">{user.email}</b>
      </p>
      <p className="mt-6 text-[12px] text-muted/80">Opening Panchayat…</p>
    </div>
  );
}

/** New account: name, male or female, and date of birth (18+). */
function ProfileStep() {
  const { session, completeProfile, signOut } = useApp();
  const nameId = useId();
  const dobId = useId();
  const [name, setName] = useState(session?.name?.slice(0, NAME_MAX) ?? "");
  const [gender, setGender] = useState<Gender | null>(null);
  const [dob, setDob] = useState("");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const latest = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_AGE);
    return iso(d);
  }, []);

  const nameError = !name.trim() ? "Enter your name" : "";
  const genderError = gender ? "" : "Pick one";
  const age = dob ? ageOn(dob) : null;
  const dobError = !dob ? "Enter your date of birth" : !/^\d{4}-\d{2}-\d{2}$/.test(dob) || age === null || Number.isNaN(age) || dob < "1920-01-01" ? "Check the date" : dob > iso(new Date()) ? "That date is in the future" : age < MIN_AGE ? `You need to be ${MIN_AGE} or older to join Panchayat` : "";

  const finish = async () => {
    setTried(true);
    if (saving || nameError || genderError || dobError || !gender) return;
    setSaving(true);
    setServerError("");
    setFieldErrors({});
    try {
      await completeProfileRequest({ name, gender, dob });
      completeProfile({ name, gender, dob });
    } catch (e) {
      // A 401/403 has already signed out (lib/api/client.ts); this shows everything else
      if (e instanceof ApiError) setFieldErrors(e.fields);
      setServerError(messageOf(e, "Couldn't save your profile. Try again."));
      setSaving(false);
    }
  };

  return (
    <Slide>
      <form noValidate onSubmit={(e) => (e.preventDefault(), finish())}>
        <Title title="A little about you" sub={<>Signed in as <b className="font-semibold text-cream">{session?.email}</b>. Finish setting up your profile.</>} />

        <Field label="Your name" id={nameId} icon={<UserRound className="h-4.5 w-4.5" />} error={tried ? nameError || fieldErrors.fullName || "" : ""} hint={`${name.length}/${NAME_MAX}`}>
          <input id={nameId} autoComplete="nickname" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="What should people call you?" className="min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none placeholder:text-cream/35" />
        </Field>

        <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.14em] text-muted">I am</p>
        <div className="mt-2 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Gender">
          {(
            [
              { id: "male", label: "Male", sign: "♂", tint: "#3d9bff" },
              { id: "female", label: "Female", sign: "♀", tint: "#ff5c8a" },
            ] as const
          ).map((g) => {
            const on = gender === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setGender(g.id)}
                className="flex flex-col items-center gap-1.5 rounded-2xl py-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold"
                style={{ background: on ? `${g.tint}22` : "rgb(255 255 255 / 0.04)", boxShadow: `inset 0 0 0 2px ${on ? g.tint : "rgb(255 255 255 / 0.08)"}` }}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full text-[26px] font-bold text-white" style={{ background: g.tint }} aria-hidden>
                  {g.sign}
                </span>
                <span className={`text-[14.5px] font-bold ${on ? "text-cream" : "text-cream/75"}`}>{g.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 min-h-[18px] text-[12px] font-semibold text-[#ff8a8f]">{tried ? genderError || fieldErrors.gender || "" : ""}</p>

        <div className="-mt-5">
          <Field label="Date of birth" id={dobId} error={tried ? dobError || fieldErrors.dateOfBirth || "" : ""} hint={age !== null && !Number.isNaN(age) && age >= 0 ? `${age} years` : undefined}>
            <input id={dobId} type="date" value={dob} min="1920-01-01" max={latest} onChange={(e) => setDob(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none [color-scheme:dark]" />
          </Field>
        </div>
        <p className="-mt-0.5 text-[11.5px] text-muted">You need to be {MIN_AGE} or older. Your birthday isn&apos;t shown to anyone.</p>

        <p role={serverError ? "alert" : undefined} className="mt-4 min-h-[18px] text-center text-[12px] font-semibold text-[#ff8a8f]">
          {serverError}
        </p>
        <AuthButton type="submit" tone="gold" loading={saving} className="mt-2">
          Let&apos;s go
        </AuthButton>
        <AuthButton tone="soft" onClick={signOut} disabled={saving} className="mt-3">
          Use a different account
        </AuthButton>
        <Spacer />
      </form>
    </Slide>
  );
}
