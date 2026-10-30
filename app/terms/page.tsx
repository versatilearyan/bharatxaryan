import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";

export const metadata: Metadata = { title: "Terms — Panchayat", robots: { index: false } };

// PLACEHOLDER: replace with the real terms of service before launch.
export default function TermsPage() {
  return (
    <InfoPage title="Terms">
      <p>Terms of service for Panchayat will be published here before the app launches.</p>
    </InfoPage>
  );
}
