"use client";

/** Small shared building blocks for the Panchayat app screens. */
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

export const formatCoins = (n: number) =>
  n >= 100_000 ? `${(n / 1000).toFixed(0)}K` : n >= 10_000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : n.toLocaleString("en-IN");

export const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n));

/** Gold demo coin. */
export function Coin({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`shrink-0 ${className}`} aria-hidden>
      <defs>
        <linearGradient id="coin-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c9" />
          <stop offset="0.5" stopColor="#f2cd83" />
          <stop offset="1" stopColor="#b9853a" />
        </linearGradient>
      </defs>
      <circle cx="10" cy="10" r="9" fill="url(#coin-g)" />
      <circle cx="10" cy="10" r="6.4" fill="none" stroke="#a8742f" strokeWidth="1.2" />
      <path d="M7.4 12.6 L8.4 7.4 H11 Q13 7.4 12.6 9.3 Q12.2 11 10.2 11 H8.7" fill="none" stroke="#8a5a1f" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type BtnVariant = "primary" | "gold" | "ghost" | "soft" | "danger";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-coral text-white shadow-[0_8px_24px_-8px_rgb(244_81_91/0.7)] hover:bg-[#f7606a]",
  gold: "bg-gradient-to-b from-[#f6d899] to-[#c9954a] text-[#2a1a0c] shadow-[0_8px_24px_-10px_rgb(231_188_114/0.7)]",
  ghost: "border border-line-strong text-cream hover:bg-cream/5",
  soft: "bg-cream/[0.07] text-cream hover:bg-cream/[0.11]",
  danger: "bg-[#3a1418] text-[#ff8a8f] hover:bg-[#4a1a20]",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: HTMLMotionProps<"button"> & { variant?: BtnVariant; size?: "sm" | "md" | "lg"; children: ReactNode }) {
  const sz = size === "sm" ? "h-8 px-3.5 text-xs" : size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-4.5 text-sm";
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${sz} ${BTN[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function IconButton({
  label,
  className = "",
  children,
  active = false,
  ...rest
}: HTMLMotionProps<"button"> & { label: string; active?: boolean; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      aria-label={label}
      title={label}
      className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors ${active ? "bg-coral text-white" : "bg-cream/[0.07] text-cream hover:bg-cream/[0.12]"} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function ScreenHeader({ title, onBack, right, sub }: { title: ReactNode; onBack?: () => void; right?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-20 bg-ink/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-3">
        {onBack ? (
          <IconButton label="Back" onClick={onBack} className="!bg-transparent">
            <ChevronLeft className="h-6 w-6" />
          </IconButton>
        ) : (
          <span className="w-1" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[19px] font-bold text-cream">{title}</h1>
          {sub ? <p className="truncate text-[11px] text-muted">{sub}</p> : null}
        </div>
        {right}
      </div>
    </header>
  );
}

export function SectionTitle({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-end justify-between px-4">
      <h2 className="font-display text-[19px] font-bold text-cream">{children}</h2>
      {action && onAction ? (
        <button type="button" onClick={onAction} className="flex items-center gap-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted hover:text-cream">
          {action}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 focus-within:border-gold/50">
      <Search className="h-4.5 w-4.5 text-muted" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent text-sm text-cream placeholder:text-muted/70 focus:outline-none"
        aria-label={placeholder}
        type="text"
        inputMode="search"
        enterKeyHint="search"
      />
      {value ? (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="grid h-6 w-6 place-items-center rounded-full bg-cream/10 text-muted">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </label>
  );
}

export function Chips<T extends string>({ items, value, onChange, label }: { items: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {items.map((it) => {
        const on = it === value;
        return (
          <button
            key={it}
            role="tab"
            aria-selected={on}
            type="button"
            onClick={() => onChange(it)}
            className={`relative h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors ${on ? "text-ink" : "bg-surface text-cream/75 hover:text-cream"}`}
          >
            {on ? <motion.span layoutId={`chip-${label}`} className="absolute inset-0 rounded-full bg-cream" transition={{ type: "spring", stiffness: 500, damping: 38 }} /> : null}
            <span className="relative">{it}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-coral" : "bg-cream/15"}`}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 34 }} className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${checked ? "right-1" : "left-1"}`} />
    </button>
  );
}

export function Pill({ children, tone = "default", className = "" }: { children: ReactNode; tone?: "default" | "live" | "vip" | "new" | "muted"; className?: string }) {
  const t = {
    default: "bg-cream/10 text-cream",
    live: "bg-coral text-white",
    vip: "bg-gradient-to-r from-[#f6d899] to-[#c9954a] text-[#2a1a0c]",
    new: "bg-[#3fbf7f] text-white",
    muted: "bg-black/45 text-cream backdrop-blur",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${t} ${className}`}>{children}</span>;
}

export function LiveDot() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
    </span>
  );
}

/** Small "this is a demo" note, used wherever a real service would normally be. */
export function DemoNote({ children, className = "" }: { children: ReactNode; className?: string } & ComponentPropsWithoutRef<"p">) {
  return <p className={`rounded-xl border border-gold/20 bg-gold/[0.06] px-3 py-2 text-[11.5px] leading-snug text-gold/90 ${className}`}>{children}</p>;
}
