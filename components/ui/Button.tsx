import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[0.95rem] font-semibold transition-[transform,background-color,box-shadow,border-color,color] duration-300 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-[linear-gradient(180deg,#ff6a72_0%,#f4515b_55%,#e03a48_100%)] text-white shadow-[0_10px_30px_-10px_rgb(244_81_91/0.7),inset_0_1px_0_rgb(255_255_255/0.35)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgb(255_100_124/0.85),inset_0_1px_0_rgb(255_255_255/0.4)]",
  ghost:
    "border border-line-strong bg-cream/[0.03] text-cream hover:border-gold/50 hover:bg-cream/[0.07]",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

type LinkButtonProps = ComponentPropsWithoutRef<"a"> & { variant?: Variant; children: ReactNode };

/** An in-page link styled as a button (every one points at a real section). */
export function LinkButton({ variant = "primary", className = "", children, ...rest }: LinkButtonProps) {
  return (
    <a className={buttonClass(variant, className)} {...rest}>
      {children}
    </a>
  );
}
