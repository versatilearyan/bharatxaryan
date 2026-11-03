/**
 * Real sign-in against the Panchayat backend (Spring Boot, /api/v1/auth/*).
 *
 * - Email: POST send-otp { email }, then POST verify-otp { email, otp }.
 * - Google: Google Identity Services gives an ID token in the browser, then
 *   POST google { idToken }. The ID token is only passed through; the app keeps
 *   the backend's own accessToken (lib/auth/token.ts).
 * - New accounts: POST complete-profile { fullName, gender, dateOfBirth } with
 *   the backend JWT.
 *
 * Every call goes through lib/api/client.ts.
 */
import { api } from "@/lib/api/client";
import { clearToken, readToken, saveToken } from "./token";
import { GOOGLE_CLIENT_ID_SETTING } from "@/lib/config";
import type { Gender } from "@/lib/app/types";

export type AuthMethod = "google" | "apple" | "email";

/** Who signed in. The JWT itself is kept in lib/auth/token.ts, not here. */
export type AuthUser = { method: AuthMethod; email: string; name?: string; profileCompleted: boolean };

export const OTP_LENGTH = 6;
/** Seconds before "Resend code" unlocks. */
export const RESEND_SECONDS = 30;

export const GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID_SETTING;

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

type TokenResponse = { message?: string; accessToken?: string; tokenType?: string; refreshToken?: string; profileCompleted?: boolean; email?: string; fullName?: string; name?: string };

/** Keep the backend JWT and turn the response into an AuthUser. */
function accept(r: TokenResponse | null, method: AuthMethod, fallbackEmail: string, fallbackName?: string): AuthUser {
  if (!r || typeof r.accessToken !== "string" || !r.accessToken) throw new Error("The server didn't send a sign-in token. Try again.");
  saveToken(r.accessToken, r.tokenType, typeof r.refreshToken === "string" ? r.refreshToken : undefined);
  return {
    method,
    email: cleanEmail(typeof r.email === "string" && r.email ? r.email : fallbackEmail),
    name: r.fullName || r.name || fallbackName,
    profileCompleted: r.profileCompleted === true,
  };
}

/** Sends a 6-digit code to the email. Returns the backend's message to show, if any. */
export async function requestEmailCode(email: string): Promise<{ email: string; resendIn: number; message: string }> {
  const err = emailError(email);
  if (err) throw new Error(err);
  const clean = cleanEmail(email);
  const r = await api<{ message?: string } | null>("/api/v1/auth/send-otp", { method: "POST", body: { email: clean } });
  return { email: clean, resendIn: RESEND_SECONDS, message: typeof r?.message === "string" ? r.message : "" };
}

export async function verifyEmailCode(email: string, code: string): Promise<AuthUser> {
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) throw new Error(`Enter all ${OTP_LENGTH} digits`);
  const clean = cleanEmail(email);
  const r = await api<TokenResponse>("/api/v1/auth/verify-otp", { method: "POST", body: { email: clean, otp: code } });
  return accept(r, "email", clean);
}

/** Email and name from the Google ID token, for display only (the backend does the real verification). */
function googleClaims(idToken: string): { email: string; name?: string } {
  try {
    const part = idToken.split(".")[1];
    const bin = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return { email: typeof json.email === "string" ? json.email : "", name: typeof json.name === "string" ? json.name : undefined };
  } catch {
    return { email: "" };
  }
}

/** Swap a Google ID token (from Google Identity Services) for a Panchayat session. */
export async function signInWithGoogle(idToken: string): Promise<AuthUser> {
  const claims = googleClaims(idToken);
  const r = await api<TokenResponse>("/api/v1/auth/google", { method: "POST", body: { idToken } });
  return accept(r, "google", claims.email, claims.name);
}

export async function completeProfileRequest(details: { name: string; gender: Gender; dob: string }) {
  return api<{ message?: string } | null>("/api/v1/auth/complete-profile", {
    method: "POST",
    auth: true,
    body: { fullName: details.name.trim(), gender: details.gender === "male" ? "Male" : "Female", dateOfBirth: details.dob },
  });
}

export function signOutLocally() {
  // End this device's session on the server too (best effort; the refresh token stops working)
  const refreshToken = readToken()?.refreshToken;
  if (refreshToken) void api("/api/v1/auth/logout", { method: "POST", body: { refreshToken } }).catch(() => {});
  clearToken();
  // Stop Google from signing the same account straight back in
  window.google?.accounts.id.disableAutoSelect();
}

/* ---------- Google Identity Services ---------- */

type GsiButtonOptions = { type?: "standard"; theme?: "outline" | "filled_blue" | "filled_black"; size?: "large" | "medium" | "small"; text?: "signin_with" | "continue_with"; shape?: "pill" | "rectangular"; width?: number; logo_alignment?: "left" | "center" };
type Gsi = {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential?: string }) => void; ux_mode?: "popup"; auto_select?: boolean; cancel_on_tap_outside?: boolean; use_fedcm_for_button?: boolean }) => void;
      renderButton: (el: HTMLElement, o: GsiButtonOptions) => void;
      disableAutoSelect: () => void;
    };
  };
};
declare global {
  interface Window {
    google?: Gsi;
  }
}

let gsiLoading: Promise<Gsi> | null = null;
/** Loads https://accounts.google.com/gsi/client once. */
export function loadGoogle(): Promise<Gsi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google sign-in needs a browser"));
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (gsiLoading) return gsiLoading;
  gsiLoading = new Promise<Gsi>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => (window.google?.accounts?.id ? resolve(window.google) : reject(new Error("Google sign-in didn't load")));
    s.onerror = () => {
      gsiLoading = null;
      s.remove();
      reject(new Error("Couldn't load Google sign-in. Check your connection."));
    };
    document.head.appendChild(s);
  });
  return gsiLoading;
}
