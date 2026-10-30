import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/sections/InfoPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Contact — Panchayat" };

export default function ContactPage() {
  return (
    <InfoPage title="Contact">
      {CONTACT_EMAIL ? (
        <p>
          Reach the Panchayat team at{" "}
          <a className="text-gold underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      ) : (
        <>
          <p>Official contact details will be shared here closer to launch.</p>
          <p>
            Want to hear from us first?{" "}
            <Link className="text-gold underline underline-offset-4" href="/about#waitlist">
              Join the waitlist
            </Link>
            .
          </p>
        </>
      )}
    </InfoPage>
  );
}
