"use client";

import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";

/**
 * Next.js shows this instead of its own generic "Application error" screen whenever a page throws
 * while rendering — a bug, not a server response (those already go through lib/api/client's own
 * friendly messages). Never shows the error itself: only ever a plain, on-brand "try again".
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the real error in the console for us, never on screen for whoever hit it
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-6 text-center" style={{ backgroundImage: "radial-gradient(60% 50% at 50% 30%, rgb(231 188 114 / 0.08), transparent)" }}>
      <Logo size="2.4rem" />
      <div className="max-w-[420px] space-y-2">
        <h1 className="text-xl font-extrabold text-cream">Something didn&apos;t load right</h1>
        <p className="text-[15px] leading-relaxed text-muted">We hit a snag on our side. Please try again — if it keeps happening, come back in a few minutes.</p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => reset()} className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink transition hover:brightness-95">
          Try again
        </button>
        <button type="button" onClick={() => (window.location.href = "/")} className="rounded-full border border-gold/40 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Go home
        </button>
      </div>
    </div>
  );
}
