import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";
import { H, L, OperatorBox, PolicyLinks } from "@/components/sections/LegalBits";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy — Panchayat" };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy">
      <p className="text-sm">Last updated: {LEGAL.updated}</p>
      <p>
        This Privacy Policy explains how <b className="text-cream">{LEGAL.legalName}</b>, {LEGAL.businessType}, India, the owner and operator of {LEGAL.brand}{" "}
        (&quot;we&quot;, &quot;us&quot;), collects, uses, shares and protects your personal data when you use the website {LEGAL.website} and the {LEGAL.brand} app
        (the &quot;Service&quot;). {LEGAL.legalName} is responsible for your personal data (the &quot;data fiduciary&quot; under India&apos;s Digital Personal Data
        Protection Act, 2023). By using the Service you agree to this policy.
      </p>
      <OperatorBox />

      <H>1. Information we collect</H>
      <p>
        <b className="text-cream">Information you give us</b>
      </p>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Account details: your name, email address or phone number, and profile photo when you sign in with email, phone or Google.</li>
        <li>Profile details you choose to add: bio, gender, date of birth, banner, and other optional fields.</li>
        <li>Messages, photos, posts (Moments) and other content you send or upload.</li>
        <li>Support requests: what you write to us, and any screenshots you attach.</li>
        <li>
          Payment details: for a purchase we keep the order, amount, date, status and transaction ID. For UPI payments with proof we keep the transaction ID (UTR)
          and the screenshot you send. <b className="text-cream">We never collect or store your card number, CVV, UPI PIN or net-banking password</b>; these are
          entered only on our payment partner&apos;s secure page.
        </li>
      </ul>
      <p>
        <b className="text-cream">Information collected automatically</b>
      </p>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Activity in the app: rooms you join or create, gifts sent and received, levels, wallet balance and history, Parivar, friends and follows.</li>
        <li>Voice: audio in a room is streamed live to the people in it. We do not record room audio.</li>
        <li>Device and log data: device model, operating system, app version, IP address, and error and security logs.</li>
        <li>In the Android app: a push-notification token, so we can tell you about messages, gifts and follows.</li>
        <li>
          Approximate location, only if you turn on Nearby: rounded to about 1 km and used to show others a rough distance. We never show your exact location, and
          turning Nearby off erases it.
        </li>
      </ul>

      <H>2. How we use your information</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>To create and run your account and provide the Service: rooms, chats, gifts, wallet, rewards and Parivar.</li>
        <li>To process payments, deliver what you buy, prevent payment fraud and handle refunds.</li>
        <li>To keep the Service safe: detect spam, fraud, abuse and cheating, and enforce our <L href="/terms">Terms</L>.</li>
        <li>To answer your questions and complaints.</li>
        <li>To send service messages: sign-in codes, account, wallet, payment and security notices.</li>
        <li>To understand how the Service is used and improve it (using combined, non-identifying data where possible).</li>
        <li>To meet legal obligations, such as tax and accounting records, and lawful requests from authorities.</li>
      </ul>

      <H>3. Who can see your information</H>
      <p>
        Your name, profile photo, level, public ID and public posts are visible to other users. Private chats are visible only to the people in them. You can hide
        your online status in your profile settings. <b className="text-cream">We do not sell your personal data.</b>
      </p>

      <H>4. Sharing with service providers</H>
      <p>We share only what is needed with trusted providers who process it for us, under confidentiality and security obligations:</p>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Payments: PayU (payment gateway) and your bank or UPI app.</li>
        <li>Hosting and storage: our cloud servers in India.</li>
        <li>Live voice: our voice-streaming provider (LiveKit).</li>
        <li>Sign-in and notifications: Google (Google sign-in, push notifications).</li>
        <li>Emails: our email providers (Brevo, Amazon SES) for sign-in codes and service emails.</li>
      </ul>
      <p>
        We may also share information when the law requires it, to respond to a valid legal request, or to protect the rights, property or safety of our users,
        the public or {LEGAL.legalName}.
      </p>

      <H>5. How long we keep it</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Account and profile data: while your account is active, and deleted after you delete your account.</li>
        <li>Payment and wallet records: for as long as Indian tax and accounting law requires (generally up to 8 years).</li>
        <li>Security and fraud logs: up to 180 days, longer if needed to investigate abuse.</li>
        <li>
          You can delete your account in the app (Profile → &quot;Delete my account&quot;); see <L href="/delete-account">how to delete your account</L>.
        </li>
      </ul>

      <H>6. Security</H>
      <p>
        We protect your data with encryption in transit (HTTPS), encrypted storage of private messages, access controls and regular security checks. No system is
        perfectly secure, so please keep your sign-in safe and tell us at once about any suspected misuse.
      </p>

      <H>7. Your rights</H>
      <p>Under Indian law you can:</p>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>ask what personal data we hold about you and how we use it;</li>
        <li>ask us to correct, complete or update it;</li>
        <li>ask us to delete it (or delete your account yourself in the app);</li>
        <li>withdraw consent you gave earlier (this may stop some features from working);</li>
        <li>name a person to use these rights for you in case of death or incapacity;</li>
        <li>make a complaint to our grievance officer (below) and, if not satisfied, to the Data Protection Board of India.</li>
      </ul>
      <p>To use any of these rights, write to {LEGAL.email} from your account&apos;s email. We reply within 2 working days.</p>

      <H>8. Children</H>
      <p>
        The Service is only for people aged 18 or older. We do not knowingly collect data from children. If you believe a child has an account, tell us and we will
        remove it. See our <L href="/child-safety">Child Safety Standards</L>.
      </p>

      <H>9. Cookies and local storage</H>
      <p>
        The website and app use cookies and your device&apos;s local storage to keep you signed in, remember your settings and store animations so they load faster.
        We do not use them for advertising. You can clear them in your browser or app settings.
      </p>

      <H>10. Grievance officer</H>
      <p>
        <b className="text-cream">{LEGAL.legalName}</b>, email {LEGAL.email}
        {LEGAL.phone ? `, phone ${LEGAL.phone}` : ""}
        {LEGAL.address ? `, address ${LEGAL.address}` : ""}. We acknowledge complaints within 24 hours and resolve them within 15 days (and in any case within 30
        days).
      </p>

      <H>11. Changes to this policy</H>
      <p>
        We may update this policy. The &quot;Last updated&quot; date above shows the latest version, and important changes will be shown in the app.
      </p>
      <PolicyLinks />
    </InfoPage>
  );
}
