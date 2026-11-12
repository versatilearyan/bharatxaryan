"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { GOOGLE_CLIENT_ID, loadGoogle } from "@/lib/auth/auth";
import { isNativeApp, nativeCall } from "@/lib/native/bridge";
import { GoogleIcon } from "./parts";

let initialized = false;
let latest: { onCredential: (idToken: string) => void; onError: (message: string) => void } | null = null;

/**
 * Google's own "Continue with Google" button (Google Identity Services).
 * Google draws the button and runs the sign-in popup; we get the ID token in
 * onCredential. If Google isn't configured or can't load, a disabled
 * look-alike explains why instead.
 */
export function GoogleButton({ onCredential, onError, disabled = false, busy = false }: { onCredential: (idToken: string) => void; onError: (message: string) => void; disabled?: boolean; busy?: boolean }) {
  const slot = useRef<HTMLDivElement>(null);
  // In the Android app Google's website button is blocked, so the app does the Google sign-in and hands back the ID token
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  const [state, setState] = useState<"loading" | "ready" | "failed">(GOOGLE_CLIENT_ID ? "loading" : "failed");
  // Google is initialized once per page, so its callback always calls the latest props
  latest = { onCredential, onError };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || native) return;
    let live = true;
    loadGoogle()
      .then((g) => {
        if (!live || !slot.current) return;
        if (!initialized) {
          initialized = true;
          g.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            ux_mode: "popup",
            auto_select: false,
            cancel_on_tap_outside: true,
            callback: (r) => {
              if (r.credential) latest?.onCredential(r.credential);
              else latest?.onError("Google sign-in didn't finish. Try again.");
            },
          });
        }
        g.accounts.id.renderButton(slot.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "pill", logo_alignment: "center", width: Math.min(400, Math.round(slot.current.getBoundingClientRect().width) || 360) });
        setState("ready");
      })
      .catch(() => live && setState("failed"));
    return () => {
      live = false;
    };
  }, [native]);

  if (native) {
    return (
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => {
          nativeCall<{ idToken?: string }>("googleSignIn")
            .then((r) => (r.idToken ? latest?.onCredential(r.idToken) : latest?.onError("Google sign-in didn't finish. Try again.")))
            .catch((e: Error) => latest?.onError(/cancel/i.test(e.message) ? "" : e.message || "Google sign-in didn't finish. Try again."));
        }}
        className="relative flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-[15px] font-semibold text-[#1f1f1f] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" /> : <GoogleIcon />} Continue with Google
      </button>
    );
  }

  if (state === "failed") {
    return (
      <div>
        <button type="button" disabled className="relative flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-full bg-white text-[15px] font-bold text-[#1f1f1f] opacity-60">
          <GoogleIcon /> Continue with Google
        </button>
        <p className="mt-1.5 text-center text-[11.5px] font-semibold text-[#ff8a8f]">{GOOGLE_CLIENT_ID ? "Couldn't load Google sign-in. Check your connection and reload." : "Google sign-in isn't set up yet (NEXT_PUBLIC_GOOGLE_CLIENT_ID)."}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-full bg-white" aria-busy={busy || state === "loading" || undefined}>
      <div ref={slot} className={`flex w-full justify-center ${busy || disabled ? "pointer-events-none opacity-50" : ""}`} />
      {busy || state === "loading" ? (
        <span className="absolute inset-0 grid place-items-center bg-white/70">
          <Loader2 className="h-5 w-5 animate-spin text-[#1f1f1f]" aria-label="Loading" />
        </span>
      ) : null}
    </div>
  );
}
