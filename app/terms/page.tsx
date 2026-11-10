import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/sections/InfoPage";

export const metadata: Metadata = { title: "Terms — Panchayat" };

const H = ({ children }: { children: string }) => <h2 className="pt-4 font-display text-2xl font-bold text-cream">{children}</h2>;

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Service">
      <p className="text-sm">Last updated: 10 November 2026</p>
      <p>By using Panchayat you agree to these terms. If you don't agree, please don't use the app.</p>

      <H>Your account</H>
      <p>
        You must be at least 13 years old (or the minimum age in your country). Give true details, keep your sign-in safe, and don't share your
        account. You are responsible for what happens under it.
      </p>

      <H>Be respectful</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>No harassment, hate, threats, sexual content involving minors, or anything illegal.</li>
        <li>No spam, scams, impersonation, or trying to cheat the coin, gift, charm or Parivar systems.</li>
        <li>Don't record or share other people's voice or private chats without their consent.</li>
        <li>Room owners and admins can mute, remove or ban people from their rooms. We may remove content or suspend accounts that break these rules.</li>
      </ul>

      <H>Coins, gifts and Parivar</H>
      <p>
        Coins and gifts are virtual items with no cash value. Lucky coins, rewards and Parivar prizes are chances, not guarantees, and their rules and
        amounts can change. Purchases of coins are final except where the law says otherwise. We may correct or reverse coins gained through bugs or misuse.
      </p>

      <H>Your content</H>
      <p>
        You own what you post, but you give Panchayat permission to host and show it so the app can work. Only post what you have the right to share.
      </p>

      <H>The service</H>
      <p>
        We work to keep Panchayat running, but it is provided "as is" and may change, pause or have errors. To the extent the law allows, we are not
        liable for indirect losses from using the app.
      </p>

      <H>Ending your use</H>
      <p>You can stop using Panchayat at any time. We may suspend or end accounts that break these terms.</p>

      <H>Contact</H>
      <p>
        Questions? Reach us from the{" "}
        <Link href="/contact" className="text-gold underline-offset-4 hover:underline">
          Contact page
        </Link>
        . See also our{" "}
        <Link href="/privacy" className="text-gold underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </InfoPage>
  );
}
