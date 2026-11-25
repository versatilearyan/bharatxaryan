import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";
import { H, L, OperatorBox, PolicyLinks } from "@/components/sections/LegalBits";
import { PriceList } from "@/components/sections/PriceList";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Products & Pricing — Panchayat" };

export default function PricingPage() {
  return (
    <InfoPage title="Products & Pricing">
      <p>
        {LEGAL.brand} is free to use. These optional digital items can be bought inside the app. The prices below are the current prices, shown live from our
        server.
      </p>
      <PriceList />

      <H>How to buy</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Open the app → Wallet (for coins) or VIP, choose an item and pay online or by UPI.</li>
        <li>
          Delivery: see <L href="/shipping-policy">Shipping &amp; Delivery</L>. Refunds: see <L href="/refund-policy">Refund &amp; Cancellation</L>.
        </li>
      </ul>
      <OperatorBox />
      <PolicyLinks />
    </InfoPage>
  );
}
