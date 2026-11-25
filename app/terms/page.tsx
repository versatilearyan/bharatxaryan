import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";
import { H, L, OperatorBox, PolicyLinks } from "@/components/sections/LegalBits";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Terms & Conditions — Panchayat" };

export default function TermsPage() {
  return (
    <InfoPage title="Terms & Conditions">
      <p className="text-sm">Last updated: {LEGAL.updated}</p>
      <p>
        These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of the {LEGAL.brand} website ({LEGAL.website}) and the {LEGAL.brand} app (together, the
        &quot;Service&quot;). The Service is owned and operated by <b className="text-cream">{LEGAL.legalName}</b>, {LEGAL.businessType}, India (&quot;we&quot;,
        &quot;us&quot;). By using the Service you agree to these Terms. If you don&apos;t agree, please don&apos;t use it.
      </p>
      <OperatorBox />

      <H>1. Eligibility and your account</H>
      <p>
        You must be at least 18 years old. Give true details, keep your sign-in safe and don&apos;t share your account. You are responsible for what
        happens under it.
      </p>

      <H>2. What Panchayat is</H>
      <p>
        {LEGAL.brand} is a social voice-chat app: voice rooms, chat, Parivar (families), casual games and gifting. It is not a gambling or real-money
        gaming service.
      </p>

      <H>3. Virtual items and payments</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>
          You can buy digital items: coin packs, VIP plans and special packs (see <L href="/pricing">Products &amp; Pricing</L>). Prices are in Indian
          Rupees (INR) and are shown before you pay.
        </li>
        <li>
          Coins, gifts, VIP and other virtual items are a licence to use features inside the app. They have <b className="text-cream">no cash value</b>, can&apos;t
          be exchanged for money and can&apos;t be transferred outside the app.
        </li>
        <li>Payments are processed by our payment partners (such as PayU) or by UPI. We never see or store your card details.</li>
        <li>
          Refunds and cancellations follow our <L href="/refund-policy">Refund &amp; Cancellation Policy</L>; delivery follows our{" "}
          <L href="/shipping-policy">Shipping &amp; Delivery Policy</L>.
        </li>
        <li>Lucky coins, rewards and prizes are chances, not guarantees, and their rules can change. We may correct coins gained through bugs or misuse.</li>
      </ul>

      <H>4. Acceptable use</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>No harassment, hate, threats, sexual content involving minors, or anything illegal.</li>
        <li>No spam, scams, impersonation, or attempts to cheat the coin, gift, charm or Parivar systems.</li>
        <li>Don&apos;t record or share other people&apos;s voice or private chats without their consent.</li>
        <li>We may remove content and suspend or end accounts that break these Terms. Room owners and admins can mute, remove or ban people in their rooms.</li>
      </ul>

      <H>5. Your content</H>
      <p>You own what you post, and you allow us to host and show it so the Service can work. Only post what you have the right to share.</p>

      <H>6. Privacy</H>
      <p>
        How we handle your data is described in our <L href="/privacy">Privacy Policy</L>.
      </p>

      <H>7. The Service and liability</H>
      <p>
        We work to keep the Service running, but it is provided &quot;as is&quot; and may change, pause or have errors. To the extent the law allows, we are not
        liable for indirect or consequential losses, and our total liability for any claim is limited to the amount you paid us in the 30 days before it.
      </p>

      <H>8. Ending your use</H>
      <p>
        You can stop using the Service and delete your account at any time (<L href="/delete-account">how to delete your account</L>). We may suspend or end
        accounts that break these Terms.
      </p>

      <H>9. Governing law</H>
      <p>These Terms are governed by the laws of India. Any dispute is subject to the courts of India, at the place where the operator resides.</p>

      <H>10. Changes and contact</H>
      <p>
        We may update these Terms; the date above shows the latest version. Questions or complaints: write to {LEGAL.email} or see{" "}
        <L href="/contact">Contact Us</L>. We reply within 2 working days.
      </p>
      <PolicyLinks />
    </InfoPage>
  );
}
