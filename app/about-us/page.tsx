import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";
import { H, L, OperatorBox, PolicyLinks } from "@/components/sections/LegalBits";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "About Us — Panchayat" };

export default function AboutUsPage() {
  return (
    <InfoPage title="About Us">
      <p>
        <b className="text-cream">{LEGAL.brand}</b> is an Indian social voice-chat app: a digital chaupal where people gather in live voice rooms, talk, sing,
        make friends, form a Parivar (family), play casual games together and celebrate each other with virtual gifts.
      </p>
      <OperatorBox />

      <H>Who we are</H>
      <p>
        {LEGAL.brand} is owned and operated by <b className="text-cream">{LEGAL.legalName}</b>, {LEGAL.businessType}, from India. {LEGAL.legalName} builds and runs
        the app and the website {LEGAL.website}, and personally looks after payments, refunds and support for every user.
      </p>

      <H>Our mission</H>
      <p>
        To give everyone a warm, safe place to talk in their own language: a modern Panchayat where every voice is heard, friendships grow, and people can have fun
        together from anywhere in India.
      </p>

      <H>What you can do on {LEGAL.brand}</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>
          <b className="text-cream">Voice rooms:</b> join or create live rooms, take a seat, talk, sing and listen together.
        </li>
        <li>
          <b className="text-cream">Chat and friends:</b> private chats, group chats, follows and friend lists.
        </li>
        <li>
          <b className="text-cream">Parivar:</b> build a family group with its own level, treasury, chests and events.
        </li>
        <li>
          <b className="text-cream">Moments:</b> share photos and videos with your friends.
        </li>
        <li>
          <b className="text-cream">Games and events:</b> casual games, PK battles in rooms, rankings and festival events.
        </li>
        <li>
          <b className="text-cream">Gifts and VIP:</b> send animated gifts to people you like, and unlock VIP frames, chat bubbles and entry effects.
        </li>
      </ul>

      <H>What we sell</H>
      <p>
        {LEGAL.brand} is free to use. Optional digital items (coin packs, VIP plans and special packs) can be bought to send gifts and unlock extras. All prices are on{" "}
        <L href="/pricing">Products &amp; Pricing</L>. Virtual coins and items are only for use inside the app; they have no cash value and can&apos;t be withdrawn.
        {LEGAL.brand} is not a gambling or real-money gaming service.
      </p>

      <H>Our promise to you</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>A safe community for adults (18+), with moderation, reporting and blocking in every room and chat.</li>
        <li>Your privacy respected: we never sell your data (see our <L href="/privacy">Privacy Policy</L>).</li>
        <li>
          Clear prices, fast delivery (<L href="/shipping-policy">Shipping &amp; Delivery</L>) and fair refunds (<L href="/refund-policy">Refund &amp; Cancellation</L>
          ).
        </li>
        <li>
          Real people answering support: {LEGAL.email}, {LEGAL.supportHours}.
        </li>
      </ul>

      <H>Get in touch</H>
      <p>
        Questions, feedback or business enquiries: <L href="/contact">Contact Us</L>.
      </p>
      <PolicyLinks />
    </InfoPage>
  );
}
