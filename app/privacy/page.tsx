import type { Metadata } from "next";
import { InfoPage } from "@/components/sections/InfoPage";

export const metadata: Metadata = { title: "Privacy Policy — Panchayat", robots: { index: false } };

// PLACEHOLDER: replace with the real privacy policy before launch.
export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy">
      <p>Our full privacy policy will be published here before Panchayat launches.</p>
      <p>
        For now, this website does not collect personal data. The waitlist form on the About page is a demo: it checks your
        email in your browser and does not send or store it.
      </p>
    </InfoPage>
  );
}
