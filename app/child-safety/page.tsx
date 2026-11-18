import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/sections/InfoPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Child Safety Standards — Panchayat",
  description: "Panchayat's standards against child sexual abuse and exploitation (CSAE), how to report it, and how we act on reports.",
};

const H = ({ children }: { children: string }) => <h2 className="pt-4 font-display text-2xl font-bold text-cream">{children}</h2>;

/** Panchayat's published standards against child sexual abuse and exploitation (CSAE), as Google Play asks of social apps. */
export default function ChildSafetyPage() {
  return (
    <InfoPage title="Child Safety Standards">
      <p className="text-sm">Last updated: 18 November 2026</p>
      <p>
        Panchayat is a voice-room, chat and games app for adults. We have zero tolerance for child sexual abuse and exploitation (CSAE) and for
        child sexual abuse material (CSAM). This page sets out our standards, how anyone can report a concern, and what we do about it.
      </p>

      <H>Our standards</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Panchayat is only for people aged 18 or older. Everyone gives their date of birth when they sign up, and the app does not let anyone under 18 create an account.</li>
        <li>
          It is strictly forbidden to share, request, sell or link to any sexual content involving a minor (CSAM), including drawn, edited or
          AI-made images, in any part of the app: rooms, chats, Moments, profiles, names, Parivar posts and games.
        </li>
        <li>It is strictly forbidden to groom, sexualise, sexually exploit, threaten or try to meet a minor, or to use Panchayat to contact children.</li>
        <li>These rules are part of our <Link href="/terms" className="text-gold underline-offset-4 hover:underline">Terms of Service</Link>, which everyone accepts to use the app.</li>
      </ul>

      <H>How to report</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>
          In the app: tap <b>Report</b> on a person&apos;s profile, on a chat message (hold the message) or in a room&apos;s menu, and choose the
          reason. Reports go straight to the Panchayat safety team.
        </li>
        <li>You can also block the person at once from their profile or the chat menu.</li>
        <li>
          {CONTACT_EMAIL ? (
            <>
              By email to our child safety contact:{" "}
              <a className="text-gold underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            <>
              Through our <Link href="/contact" className="text-gold underline-offset-4 hover:underline">Contact page</Link>.
            </>
          )}
        </li>
        <li>If a child is in immediate danger, call the police (112 in India) or Childline India (1098) first.</li>
      </ul>

      <H>What we do</H>
      <ul className="list-disc space-y-1.5 pl-6">
        <li>Reports about child safety are reviewed first, ahead of every other kind of report.</li>
        <li>Content that breaks these standards is removed as soon as we find it or it is reported to us.</li>
        <li>Accounts involved are banned for good, and the person may not open a new account.</li>
        <li>
          We report child sexual abuse material and exploitation to the authorities as the law requires, including the Indian police and the
          National Cybercrime Reporting Portal (cybercrime.gov.in), and to the National Center for Missing &amp; Exploited Children (NCMEC) where it applies,
          and we keep the evidence they need.
        </li>
        <li>We cooperate fully with law enforcement investigations.</li>
      </ul>

      <H>The law we follow</H>
      <p>
        Panchayat complies with the child safety laws that apply to it, including India&apos;s Protection of Children from Sexual Offences Act
        (POCSO), 2012, the Information Technology Act, 2000 and its Rules, and the child safety policies of Google Play.
      </p>

      <H>Child safety point of contact</H>
      <p>
        The Panchayat safety team is responsible for these standards and answers questions about them, from users, parents and authorities.
        {CONTACT_EMAIL ? (
          <>
            {" "}
            Write to{" "}
            <a className="text-gold underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </>
        ) : (
          <>
            {" "}
            Reach them through the <Link href="/contact" className="text-gold underline-offset-4 hover:underline">Contact page</Link> or with Report in the app.
          </>
        )}
      </p>
    </InfoPage>
  );
}
