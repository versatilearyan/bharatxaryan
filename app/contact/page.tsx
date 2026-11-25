import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";
import { H, PolicyLinks } from "@/components/sections/LegalBits";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Contact Us — Panchayat" };

export default function ContactPage() {
  const row = "grid grid-cols-[120px_1fr] gap-3 border-b border-line py-2.5 last:border-0";
  return (
    <InfoPage title="Contact Us">
      <p>We&apos;re happy to help with payments, refunds, your account or anything else about {LEGAL.brand}.</p>

      <div className="rounded-2xl bg-cream/[0.04] px-4 ring-1 ring-line">
        <div className={row}>
          <span className="text-cream/60">Legal name</span>
          <span className="font-semibold text-cream">{LEGAL.legalName}</span>
        </div>
        <div className={row}>
          <span className="text-cream/60">Business</span>
          <span className="text-cream">
            {LEGAL.brand} ({LEGAL.businessType})
          </span>
        </div>
        {LEGAL.address ? (
          <div className={row}>
            <span className="text-cream/60">Address</span>
            <span className="text-cream">{LEGAL.address}</span>
          </div>
        ) : null}
        <div className={row}>
          <span className="text-cream/60">Email</span>
          <a className="text-gold underline-offset-4 hover:underline" href={`mailto:${LEGAL.email}`}>
            {LEGAL.email}
          </a>
        </div>
        {LEGAL.phone ? (
          <div className={row}>
            <span className="text-cream/60">Phone</span>
            <a className="text-gold underline-offset-4 hover:underline" href={`tel:${LEGAL.phone.replace(/\s/g, "")}`}>
              {LEGAL.phone}
            </a>
          </div>
        ) : null}
        <div className={row}>
          <span className="text-cream/60">Support hours</span>
          <span className="text-cream">{LEGAL.supportHours}</span>
        </div>
      </div>

      <H>Payment or refund problem?</H>
      <p>
        In the app, open Wallet → &quot;Payment problem? Raise a ticket&quot;, or email {LEGAL.email} with your transaction ID (UTR) and payment date. We reply within
        2 working days.
      </p>
      <PolicyLinks />
    </InfoPage>
  );
}
