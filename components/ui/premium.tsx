"use client";

/**
 * Panchayat's premium building blocks, on one set of design tokens (see the --pn-* values in globals.css):
 * PremiumCard, GradientButton, CoinBalance, SectionHeader, PremiumIconButton and Skeleton.
 * They only draw things; every screen keeps its own data and behaviour.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Coin, formatCoins } from "@/components/ui/kit";

/** A glass card with a soft top light. `tone` picks the edge: plain, gold (special) or plum. */
export function PremiumCard({ tone = "plain", className = "", children, ...rest }: HTMLMotionProps<"div"> & { tone?: "plain" | "gold" | "plum"; children: ReactNode }) {
  const edge = tone === "gold" ? "pn-card-gold" : tone === "plum" ? "pn-card-plum" : "pn-card";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: "easeOut" }} className={`${edge} rounded-[22px] ${className}`} {...rest}>
      {children}
    </motion.div>
  );
}

/** The main button: a clear gradient with a little depth. */
export function GradientButton({ variant = "primary", size = "md", className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "gold" | "plum"; size?: "sm" | "md" | "lg" }) {
  const look = variant === "gold" ? "pn-btn-gold text-[#2a1a0c]" : variant === "plum" ? "pn-btn-plum text-white" : "pn-btn-primary text-white";
  const sz = size === "sm" ? "h-9 px-4 text-[12.5px]" : size === "lg" ? "h-13 px-7 text-[16px]" : "h-11 px-5 text-[14px]";
  return (
    <button type="button" className={`${look} ${sz} inline-flex items-center justify-center gap-1.5 rounded-full font-display font-extrabold tracking-wide transition active:translate-y-px active:scale-[0.98] disabled:opacity-50 ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** Coins in a glass pill. Tap it to open the wallet; it gives a little bounce when pressed. */
export function CoinBalance({ coins, onClick }: { coins: number; onClick?: () => void }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={onClick} aria-label={`${coins.toLocaleString("en-IN")} coins. Open wallet`} className="pn-glass flex h-10 items-center gap-1.5 rounded-full pl-1.5 pr-3.5 text-cream">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-gold/15 ring-1 ring-gold/40">
        <Coin className="h-5 w-5" />
      </span>
      <span className="font-display text-[15px] font-black tabular-nums">{formatCoins(coins)}</span>
      <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-b from-[#f6d899] to-[#d9a84f] text-[14px] font-black leading-none text-[#2a1a0c]" aria-hidden>
        +
      </span>
    </motion.button>
  );
}

/** A heading for a block of the screen, with an optional "See all". */
export function SectionHeader({ title, sub, action, onAction, icon }: { title: ReactNode; sub?: ReactNode; action?: string; onAction?: () => void; icon?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-display text-[20px] font-black leading-tight tracking-tight text-cream">
          <span aria-hidden className="h-5 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-[#f6d899] to-[#c2417a]" />
          <span className="truncate">{title}</span>
          {icon}
        </h2>
        {sub ? <p className="mt-0.5 pl-3.5 text-[12px] text-cream/55">{sub}</p> : null}
      </div>
      {action && onAction ? (
        <button type="button" onClick={onAction} className="pn-glass flex shrink-0 items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-cream/80">
          {action}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/** A round icon button (back, share, close...). */
export function PremiumIconButton({ label, children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={`pn-glass grid h-10 w-10 shrink-0 place-items-center rounded-full text-cream transition active:scale-90 ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** A placeholder block that shimmers while real data loads. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`pn-skeleton rounded-2xl ${className}`} />;
}
