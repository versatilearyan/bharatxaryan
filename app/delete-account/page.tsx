import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/sections/InfoPage";

export const metadata: Metadata = { title: "Delete your account — Panchayat" };

const H = ({ children }: { children: string }) => <h2 className="pt-4 font-display text-2xl font-bold text-cream">{children}</h2>;

export default function DeleteAccountPage() {
  return (
    <InfoPage title="Delete your Panchayat account">
      <p>You can delete your Panchayat account yourself, in the app or on the website. It takes less than a minute.</p>

      <H>How to delete it</H>
      <ol className="list-decimal space-y-1.5 pl-6">
        <li>Open Panchayat and sign in to the account you want to delete.</li>
        <li>Go to the Profile tab.</li>
        <li>Scroll down to Settings and tap &quot;Delete my account&quot;.</li>
        <li>Type DELETE and confirm.</li>
      </ol>

      <H>What happens</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Your name, email, profile picture and bio are removed, and you are signed out everywhere.</li>
        <li>Rooms you own are closed and you leave your Parivar. If you are the Mukhiya of a Parivar with members, hand over leadership first.</li>
        <li>Coins, VIP and other items on the account are lost and can&apos;t be restored.</li>
        <li>Gifts and messages you sent stay in other people&apos;s history, without your name. Wallet and payment records may be kept for as long as the law or fraud prevention needs.</li>
      </ul>

      <H>Can&apos;t sign in?</H>
      <p>
        If you can&apos;t open the app, ask us to delete the account from the{" "}
        <Link href="/contact" className="text-gold underline-offset-4 hover:underline">
          Contact page
        </Link>
        . We will confirm it is your account first.
      </p>
    </InfoPage>
  );
}
