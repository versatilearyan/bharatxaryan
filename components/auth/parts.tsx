"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

/** Big rounded button with a loading spinner. It stays the same size while loading, so nothing shifts. */
export function AuthButton({ loading = false, tone = "coral", children, className = "", disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; tone?: "coral" | "gold" | "light" | "dark" | "soft" }) {
  const tones = {
    coral: "bg-coral text-white shadow-[0_10px_24px_-10px_rgb(255_90_90/0.8)] hover:brightness-110",
    gold: "bg-gradient-to-r from-gold to-coral text-ink hover:brightness-105",
    light: "bg-white text-[#1f1f1f] hover:bg-[#f2f2f2]",
    dark: "bg-black text-white ring-1 ring-white/20 hover:bg-[#151515]",
    soft: "bg-cream/[0.07] text-cream ring-1 ring-line hover:bg-cream/[0.11]",
  } as const;
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-bold transition-[filter,background-color,transform] outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${tones[tone]} ${className}`}
      {...rest}
    >
      <span className={`flex items-center gap-2.5 ${loading ? "invisible" : ""}`}>{children}</span>
      {loading ? <Loader2 className="absolute h-5 w-5 animate-spin" aria-label="Loading" /> : null}
    </button>
  );
}

/** A labelled input row. The message line always takes its space, so errors don't push the layout. */
export function Field({ label, id, icon, error, hint, children }: { label: string; id: string; icon?: ReactNode; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <label htmlFor={id} className="flex items-baseline justify-between text-[12px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
        {hint ? <span className="text-[11px] font-semibold normal-case tracking-normal text-muted/80">{hint}</span> : null}
      </label>
      <div className={`mt-2 flex h-12 items-center gap-2.5 rounded-2xl bg-surface px-4 ring-1 transition-shadow ${error ? "ring-[#ff8a8f]" : "ring-line focus-within:ring-2 focus-within:ring-gold/70"}`}>
        {icon ? <span className="text-cream/50">{icon}</span> : null}
        {children}
      </div>
      <p id={`${id}-msg`} role={error ? "alert" : undefined} className="mt-1.5 min-h-[18px] text-[12px] font-semibold text-[#ff8a8f]">
        {error}
      </p>
    </div>
  );
}

export function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function AppleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.41-3.66zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28z" />
    </svg>
  );
}
