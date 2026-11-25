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
        These Terms &amp; Conditions (&quot;Terms&quot;) are a legal agreement between you and <b className="text-cream">{LEGAL.legalName}</b>, {LEGAL.businessType},
        India, the owner and operator of {LEGAL.brand} (&quot;{LEGAL.brand}&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;). They govern your use of the website{" "}
        {LEGAL.website} and the {LEGAL.brand} mobile app (together, the &quot;Service&quot;). By creating an account, buying anything or otherwise using the Service,
        you confirm that you have read, understood and agree to these Terms. If you do not agree, please do not use the Service.
      </p>
      <OperatorBox />

      <H>1. Who we are</H>
      <p>
        The Service is owned and operated by <b className="text-cream">{LEGAL.legalName}</b>, an individual running the business as a sole proprietor in India. All
        payments for {LEGAL.brand} are received by {LEGAL.legalName}. Contact details are on our <L href="/contact">Contact Us</L> page.
      </p>

      <H>2. Eligibility</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>You must be at least 18 years old and able to enter into a binding contract under Indian law.</li>
        <li>You must not use the Service if you have been banned from it before, or where using it is against the law that applies to you.</li>
        <li>By using the Service you confirm that the information you give us is true and complete.</li>
      </ul>

      <H>3. Your account</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>You can sign in with your email, phone number or Google account. Keep your sign-in details safe and don&apos;t share your account.</li>
        <li>You are responsible for everything that happens under your account. Tell us at once at {LEGAL.email} if you think someone else is using it.</li>
        <li>One person may hold one personal account. Creating accounts to abuse rewards, gifts or offers is not allowed.</li>
        <li>
          You can delete your account at any time from the app (<L href="/delete-account">how to delete your account</L>).
        </li>
      </ul>

      <H>4. The Service</H>
      <p>
        {LEGAL.brand} is a social voice-chat platform: live voice rooms, text chat, Parivar (family groups), Moments, casual games and virtual gifting. Using the
        Service is free. Some features and virtual items can be bought (see section 5). {LEGAL.brand} is{" "}
        <b className="text-cream">not a gambling, betting or real-money gaming service</b>, and nothing on it can be won or withdrawn as money.
      </p>

      <H>5. Purchases, virtual coins and virtual items</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>
          You can buy digital items: coin packs, VIP plans and special packs. Current prices are on <L href="/pricing">Products &amp; Pricing</L> and are always
          shown in Indian Rupees (INR) before you pay.
        </li>
        <li>
          Coins, gifts, VIP status, frames, titles and other virtual items give you a limited, personal, non-transferable licence to use them inside the Service.
          They are <b className="text-cream">not money</b>, have <b className="text-cream">no cash value</b>, are not your property, and cannot be sold, exchanged,
          refunded for cash (except as our Refund Policy says) or transferred outside the Service.
        </li>
        <li>
          Payments are handled by our payment partners (such as PayU) or directly by UPI. Your card and bank details are entered on the partner&apos;s secure page;
          we never see or store them.
        </li>
        <li>Items are delivered to your account as described in our <L href="/shipping-policy">Shipping &amp; Delivery Policy</L>.</li>
        <li>Refunds and cancellations follow our <L href="/refund-policy">Refund &amp; Cancellation Policy</L>.</li>
        <li>
          Rewards such as daily gifts, lucky coins, chests and event prizes are chances, not guarantees. Their rules, amounts and availability can change or end at
          any time.
        </li>
        <li>We may correct balances, and remove coins or items gained by mistake, through bugs, fraud, chargebacks or misuse.</li>
        <li>Prices can change in future. A change never affects an order you have already paid for.</li>
      </ul>

      <H>6. Acceptable use</H>
      <p>When using the Service you agree not to:</p>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>harass, bully, threaten, abuse or discriminate against anyone, or share hate speech;</li>
        <li>share sexual content involving minors, sexually explicit content, violence, or anything illegal in India;</li>
        <li>impersonate anyone, create fake accounts, spam, or run scams, pyramid schemes or unauthorised sales;</li>
        <li>buy, sell or trade accounts, coins or items for real money outside the Service;</li>
        <li>cheat, use bots, scripts, hacks or bugs, or try to break, reverse-engineer or overload the Service;</li>
        <li>record or share other people&apos;s voice, photos or private chats without their consent;</li>
        <li>break anyone&apos;s copyright, trademark, privacy or other rights.</li>
      </ul>
      <p>
        We may remove content, mute, restrict, suspend or permanently ban accounts that break these rules, with or without notice. Room owners and admins can also
        mute, remove or ban people in their rooms.
      </p>

      <H>7. Your content</H>
      <p>
        You keep ownership of what you post (messages, photos, posts and voice). You give us a non-exclusive, royalty-free licence to store, show and share it
        inside the Service so the Service can work. You are responsible for your content and must only post what you have the right to share. We may remove
        content that breaks these Terms or the law.
      </p>

      <H>8. Our content and intellectual property</H>
      <p>
        The {LEGAL.brand} name, logo, app, website, designs, animations and software belong to {LEGAL.legalName} or our licensors and are protected by law. You may
        not copy, change, sell or use them except as these Terms allow.
      </p>

      <H>9. Privacy</H>
      <p>
        How we collect and use your personal data is explained in our <L href="/privacy">Privacy Policy</L>, which is part of these Terms.
      </p>

      <H>10. Availability and changes to the Service</H>
      <p>
        We work hard to keep the Service running, but we do not promise it will always be available, error-free or secure. We may change, add or remove features,
        or pause the Service for maintenance or for reasons beyond our control.
      </p>

      <H>11. Disclaimer and limitation of liability</H>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot;. To the fullest extent allowed by Indian law, we are not liable for any indirect,
        incidental, special or consequential loss, or for loss of data, profits or goodwill. Our total liability for any claim relating to the Service is limited to
        the amount you paid us in the 30 days before the claim arose. Nothing in these Terms limits any right you have as a consumer that cannot be limited by law.
      </p>

      <H>12. Indemnity</H>
      <p>
        You agree to compensate {LEGAL.legalName} for any loss, claim or expense (including reasonable legal fees) caused by your breach of these Terms, your
        content, or your misuse of the Service.
      </p>

      <H>13. Suspension and termination</H>
      <p>
        You can stop using the Service at any time. We may suspend or end your account if you break these Terms, if required by law, or to protect users or the
        Service. When an account ends, its coins and virtual items end with it and are not refundable, except where our Refund Policy or the law says otherwise.
      </p>

      <H>14. Governing law and disputes</H>
      <p>
        These Terms are governed by the laws of India. Please contact us first so we can try to solve any problem quickly. If a dispute can&apos;t be solved, it will
        be subject to the exclusive jurisdiction of the courts at the place where {LEGAL.legalName} resides in India.
      </p>

      <H>15. Grievance officer</H>
      <p>
        For complaints about the Service or content on it, contact our grievance officer: <b className="text-cream">{LEGAL.legalName}</b>, email {LEGAL.email}
        {LEGAL.phone ? `, phone ${LEGAL.phone}` : ""}. We acknowledge complaints within 24 hours and resolve them within 15 days.
      </p>

      <H>16. Changes to these Terms</H>
      <p>
        We may update these Terms from time to time. The &quot;Last updated&quot; date above shows the latest version, and important changes will be shown in the
        app. Continuing to use the Service after a change means you accept the new Terms.
      </p>

      <H>17. Contact</H>
      <p>
        Questions about these Terms: {LEGAL.email}, or see <L href="/contact">Contact Us</L>. We reply within 2 working days.
      </p>
      <PolicyLinks />
    </InfoPage>
  );
}
