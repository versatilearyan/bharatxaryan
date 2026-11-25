import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";
import { H, L, OperatorBox, PolicyLinks } from "@/components/sections/LegalBits";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Refund & Cancellation Policy — Panchayat" };

export default function RefundPolicyPage() {
  return (
    <InfoPage title="Refund & Cancellation Policy">
      <p className="text-sm">Last updated: {LEGAL.updated}</p>
      <p>
        Everything sold on {LEGAL.brand} is a <b className="text-cream">digital item</b> (coin packs, VIP plans, special packs) that is delivered to your account
        inside the app. This policy explains when you can get your money back and how long it takes.
      </p>
      <OperatorBox />

      <H>You get a full refund when</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Money was taken from your account but the item did not reach your {LEGAL.brand} account within 48 hours.</li>
        <li>You were charged twice for the same purchase, or charged a wrong amount.</li>
        <li>A UPI payment you sent to us is rejected and the item is not delivered.</li>
      </ul>

      <H>No refund when</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>The item was delivered to your account (coins added, VIP turned on), including coins already spent on gifts.</li>
        <li>You changed your mind after delivery, or your account was suspended for breaking our <L href="/terms">Terms</L>.</li>
      </ul>

      <H>How to ask for a refund (time limits)</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>
          Raise the request within <b className="text-cream">{LEGAL.refundRequestDays} days</b> of the payment: in the app (Wallet → &quot;Payment problem? Raise a
          ticket&quot;) or by email to {LEGAL.email}, with the transaction ID (UTR) and payment date.
        </li>
        <li>We review it within 2 working days.</li>
        <li>
          Approved refunds are sent within <b className="text-cream">{LEGAL.refundProcessDays} working days</b> to the original payment method (same UPI ID, card or
          bank account). Your bank may take another 5–7 working days to show it.
        </li>
      </ul>

      <H>Cancellation</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>A UPI top-up request you have not paid yet can be cancelled any time in the app (&quot;Cancel this request&quot;). Nothing is charged.</li>
        <li>A purchase can&apos;t be cancelled after it is delivered, because the digital item is already in your account.</li>
        <li>VIP plans are one-time purchases for a fixed number of days. There is no auto-renewal and nothing to cancel; VIP simply ends when its days are over.</li>
      </ul>

      <H>Returns</H>
      <p>Digital items can&apos;t be returned. Nothing physical is sold, so there are no product returns.</p>
      <PolicyLinks />
    </InfoPage>
  );
}
