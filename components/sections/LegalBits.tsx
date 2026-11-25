import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL } from "@/lib/site";

/** A section heading on the legal pages. */
export function H({ children }: { children: ReactNode }) {
  return <h2 className="pt-4 font-display text-2xl font-bold text-cream">{children}</h2>;
}

/** An in-text link styled like the rest of the legal pages. */
export function L({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-gold underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

/** Who runs Panchayat and how to reach them (the same block on every legal page). */
export function OperatorBox() {
  return (
    <div className="rounded-2xl bg-cream/[0.04] p-4 text-[15px] ring-1 ring-line">
      <p>
        <b className="text-cream">{LEGAL.brand}</b> is owned and operated by <b className="text-cream">{LEGAL.legalName}</b> ({LEGAL.businessType}).
      </p>
      {LEGAL.address ? <p className="mt-1">Address: {LEGAL.address}</p> : null}
      <p className="mt-1">
        Email:{" "}
        <a className="text-gold underline-offset-4 hover:underline" href={`mailto:${LEGAL.email}`}>
          {LEGAL.email}
        </a>
        {LEGAL.phone ? <> · Phone: {LEGAL.phone}</> : null}
      </p>
    </div>
  );
}

/** Links to every policy page (bottom of each legal page). */
export function PolicyLinks() {
  return (
    <p className="pt-2 text-sm">
      <L href="/terms">Terms &amp; Conditions</L> · <L href="/privacy">Privacy Policy</L> · <L href="/refund-policy">Refund &amp; Cancellation</L> ·{" "}
      <L href="/shipping-policy">Shipping &amp; Delivery</L> · <L href="/pricing">Products &amp; Pricing</L> · <L href="/about-us">About Us</L> ·{" "}
      <L href="/contact">Contact Us</L>
    </p>
  );
}
