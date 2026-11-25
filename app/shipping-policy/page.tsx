import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";
import { H, L, OperatorBox, PolicyLinks } from "@/components/sections/LegalBits";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Shipping & Delivery Policy — Panchayat" };

export default function ShippingPolicyPage() {
  return (
    <InfoPage title="Shipping & Delivery Policy">
      <p className="text-sm">Last updated: {LEGAL.updated}</p>
      <p>
        {LEGAL.brand} sells only <b className="text-cream">digital items</b> (coin packs, VIP plans and special packs). Nothing is shipped to an address, and there are no
        shipping or delivery charges.
      </p>
      <OperatorBox />

      <H>How and when you receive your purchase</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>
          <b className="text-cream">Online payment (PayU):</b> delivered to your {LEGAL.brand} account automatically, usually within a few minutes after the payment is
          successful.
        </li>
        <li>
          <b className="text-cream">UPI payment with proof:</b> delivered within 24 hours after you send the transaction ID (UTR) and screenshot, once the payment is
          checked.
        </li>
        <li>You get a message in the app when the item is delivered, and you can see it in your Wallet or Bag.</li>
      </ul>

      <H>Cash on delivery</H>
      <p>Cash on delivery is not available. All items are paid online or by UPI before delivery.</p>

      <H>Not received?</H>
      <p>
        If your item hasn&apos;t arrived within 48 hours of payment, raise a ticket in the app or write to {LEGAL.email} with your transaction ID. If we can&apos;t
        deliver it, you get a full refund as described in our <L href="/refund-policy">Refund &amp; Cancellation Policy</L>.
      </p>
      <PolicyLinks />
    </InfoPage>
  );
}
