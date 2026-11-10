import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/sections/InfoPage";

export const metadata: Metadata = { title: "Privacy Policy — Panchayat" };

const H = ({ children }: { children: string }) => <h2 className="pt-4 font-display text-2xl font-bold text-cream">{children}</h2>;

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy">
      <p className="text-sm">Last updated: 10 November 2026</p>
      <p>Panchayat is a voice-room and chat app. This page explains what we collect, why, and the choices you have.</p>

      <H>What we collect</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Account details: your name, email or phone number, and profile photo when you sign in with email, phone or Google.</li>
        <li>Profile and activity: your bio, level, charm, wallet balance, gifts sent and received, rooms you join or create, and your Parivar.</li>
        <li>Messages and media you send in chats and rooms, including photos you upload.</li>
        <li>Voice: audio in a room is streamed live to the people in it. We do not record room audio.</li>
        <li>Device and usage data: app version, device type, and basic logs we need to keep the service secure and working.</li>
      </ul>

      <H>How we use it</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>To run the app: sign you in, show your profile, rooms, chats, wallet and rewards.</li>
        <li>To keep Panchayat safe: prevent fraud, spam and abuse, and enforce our Terms.</li>
        <li>To send service messages such as account, wallet and security notices.</li>
      </ul>

      <H>Who can see what</H>
      <p>
        Your name, photo, level and public ID are visible to other users. You can choose to hide your online status in Profile. Private chats are
        visible only to the people in them. We do not sell your personal data.
      </p>

      <H>Sharing</H>
      <p>
        We use trusted service providers to run Panchayat, for example for hosting, live audio, sign-in and payments. They process data only to
        provide those services. We may also share information when the law requires it or to protect users from harm.
      </p>

      <H>Keeping and deleting data</H>
      <p>
        We keep your data while your account is active. To delete your account and the personal data tied to it, contact us from the{" "}
        <Link href="/contact" className="text-gold underline-offset-4 hover:underline">
          Contact page
        </Link>
        . Some records, such as wallet transactions, may be kept for as long as the law or fraud prevention needs.
      </p>

      <H>Security</H>
      <p>We protect data with encryption in transit and access controls. No service is perfectly secure, so please use a strong sign-in method.</p>

      <H>Children</H>
      <p>Panchayat is not for children under 13, or under the age required in your country. If you think a child has an account, tell us and we will remove it.</p>

      <H>Changes</H>
      <p>If we change this policy we will update the date above and, for big changes, tell you in the app.</p>
    </InfoPage>
  );
}
