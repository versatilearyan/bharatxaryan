import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";
import { H, L, PolicyLinks } from "@/components/sections/LegalBits";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Contact Us — Panchayat" };

export default function ContactPage() {
  const row = "grid grid-cols-[130px_1fr] gap-3 border-b border-line py-2.5 last:border-0";
  return (
    <InfoPage title="Contact Us">
      <p>
        We&apos;re happy to help with payments, refunds, your account, safety concerns or anything else about {LEGAL.brand}. {LEGAL.brand} is owned and operated by{" "}
        <b className="text-cream">{LEGAL.legalName}</b>.
      </p>

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
          <span className="text-cream/60">Website</span>
          <span className="text-cream">{LEGAL.website}</span>
        </div>
        <div className={row}>
          <span className="text-cream/60">Support hours</span>
          <span className="text-cream">{LEGAL.supportHours}</span>
        </div>
      </div>

      <H>Payment, refund or delivery problem</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>In the app: Wallet → &quot;Payment problem? Raise a ticket&quot;.</li>
        <li>
          Or email {LEGAL.email} with your registered email or phone, the amount, the payment date and the transaction ID (UTR).
        </li>
        <li>
          We reply within 2 working days. See <L href="/refund-policy">Refund &amp; Cancellation</L> and <L href="/shipping-policy">Shipping &amp; Delivery</L>.
        </li>
      </ul>

      <H>Account, safety and reports</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>To report a person, room or message, use the Report option in the app, or email us with details and screenshots.</li>
        <li>
          To delete your account, see <L href="/delete-account">how to delete your account</L>.
        </li>
        <li>For a child-safety concern, email us at once; we act on these first.</li>
      </ul>

      <H>Grievance officer</H>
      <p>
        <b className="text-cream">{LEGAL.legalName}</b>, email {LEGAL.email}
        {LEGAL.phone ? `, phone ${LEGAL.phone}` : ""}. Complaints are acknowledged within 24 hours and resolved within 15 days.
      </p>
      <PolicyLinks />
    </InfoPage>
  );
}
