import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";
import { H, L, OperatorBox, PolicyLinks } from "@/components/sections/LegalBits";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "About Us — Panchayat" };

export default function AboutUsPage() {
  return (
    <InfoPage title="About Us">
      <p>
        <b className="text-cream">{LEGAL.brand}</b> is an Indian social voice-chat app where people hang out in live voice rooms, chat, make friends, join a Parivar
        (family), play casual games together and celebrate each other with virtual gifts.
      </p>
      <OperatorBox />

      <H>Who we are</H>
      <p>
        {LEGAL.brand} is owned and operated by <b className="text-cream">{LEGAL.legalName}</b>, {LEGAL.businessType}, from India. We build and run the app and the
        website {LEGAL.website}, and we look after every payment and support request ourselves.
      </p>

      <H>What we offer</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Free to use: voice rooms, chat, Parivar, Moments and games.</li>
        <li>
          Optional digital purchases: coin packs (to send gifts), VIP plans and special packs. All prices are on{" "}
          <L href="/pricing">Products &amp; Pricing</L>.
        </li>
        <li>Virtual coins and items are only for use inside the app. They have no cash value and can&apos;t be withdrawn.</li>
      </ul>

      <H>Our promise</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>A safe, respectful community for adults (18+), with moderation and reporting in every room.</li>
        <li>Clear prices, fast delivery and fair refunds (see <L href="/refund-policy">Refund &amp; Cancellation</L>).</li>
        <li>
          Real people answering support: {LEGAL.email}, {LEGAL.supportHours}.
        </li>
      </ul>
      <PolicyLinks />
    </InfoPage>
  );
}
