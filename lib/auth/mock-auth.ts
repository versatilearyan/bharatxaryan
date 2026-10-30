/**
 * TEMPORARY MOCK AUTHENTICATION. FRONTEND ONLY.
 *
 * Nothing here talks to a server, Google or Apple, and no email is sent.
 * Every function waits a little to feel like a network call, then answers
 * from the hardcoded data below. The screens in components/auth/ only call
 * these functions, so going live means rewriting this file and nothing else:
 *
 * - signInWithGoogle → Google Identity Services (or the Android/iOS Google SDK)
 *   gets an ID token; POST /auth/google { idToken } returns the session.
 * - signInWithApple  → Sign in with Apple JS (or the native button) gets an
 *   identity token; POST /auth/apple { idToken } returns the session.
 * - requestEmailCode → POST /auth/otp/send { email }
 * - verifyEmailCode  → POST /auth/otp/verify { requestId, code }
 *
 * (See section 6.1 of backend-flow.md.) Keep the returned shape, AuthUser,
 * and the screens won't need to change.
 */

export type AuthMethod = "google" | "apple" | "email";

/** Who signed in. A real backend would also return tokens; the mock keeps none. */
export type AuthUser = { method: AuthMethod; email: string; name?: string };

/** The demo verification code. Change it here only. */
export const DEMO_OTP = "123456";
export const OTP_LENGTH = 6;
/** Seconds before "Resend code" unlocks. */
export const RESEND_SECONDS = 30;

/** How long each fake step takes, so the loading states are visible. */
const DELAY = { open: 650, signIn: 1100, send: 900, verify: 1000 };

/** Mock Google accounts for the account picker. */
export const MOCK_GOOGLE_ACCOUNTS = [
  { name: "Aryan Sharma", email: "aryan.sharma@gmail.com", color: "#f4515b" },
  { name: "Riya Kapoor", email: "riya.kapoor@gmail.com", color: "#8f6bff" },
  { name: "Kabir Mehta", email: "kabir.m@gmail.com", color: "#19c3b2" },
] as const;

/** The mock Apple ID shown in the Apple dialog, and its "Hide my email" relay address. */
export const MOCK_APPLE_ID = { name: "Aryan Sharma", email: "aryan@icloud.com", relay: "x7k2p9qd4m@privaterelay.appleid.com" } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const cleanEmail = (email: string) => email.trim().toLowerCase();
/** "" if the email looks fine, otherwise a message to show. */
export function emailError(email: string) {
  const e = email.trim();
  if (!e) return "Enter your email address";
  if (!EMAIL_RE.test(e)) return "Enter a valid email, like name@example.com";
  return "";
}
/** "aryan.sharma@gmail.com" → "ar*********a@gmail.com" */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}${"*".repeat(Math.max(1, user.length - 3))}${user.slice(-1)}@${domain}`;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Mock: the Google window opening. Real: load Google Identity Services. */
export async function openGoogle() {
  await wait(DELAY.open);
}
/** Mock: the user picked a Google account. */
export async function signInWithGoogle(account: { email: string; name: string }): Promise<AuthUser> {
  await wait(DELAY.signIn);
  return { method: "google", email: cleanEmail(account.email), name: account.name };
}

/** Mock: the Apple window opening. */
export async function openApple() {
  await wait(DELAY.open);
}
/** Mock: the user confirmed in the Apple dialog, sharing or hiding their email. */
export async function signInWithApple(hideEmail: boolean): Promise<AuthUser> {
  await wait(DELAY.signIn);
  return { method: "apple", email: hideEmail ? MOCK_APPLE_ID.relay : MOCK_APPLE_ID.email, name: MOCK_APPLE_ID.name };
}

/** Mock: "send" a code. No email goes out; the code is always DEMO_OTP. */
export async function requestEmailCode(email: string): Promise<{ email: string; resendIn: number }> {
  const err = emailError(email);
  if (err) throw new Error(err);
  await wait(DELAY.send);
  return { email: cleanEmail(email), resendIn: RESEND_SECONDS };
}

/** Mock: check the code. Only DEMO_OTP passes. */
export async function verifyEmailCode(email: string, code: string): Promise<AuthUser> {
  await wait(DELAY.verify);
  if (code.length !== OTP_LENGTH) throw new Error(`Enter all ${OTP_LENGTH} digits`);
  if (code !== DEMO_OTP) throw new Error("That code isn't right. Check it and try again.");
  return { method: "email", email: cleanEmail(email) };
}
