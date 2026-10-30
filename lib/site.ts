/**
 * Site-wide configuration.
 *
 * Everything here is safe to edit without touching components.
 * Values set to `null` are intentionally empty: the UI renders them as
 * "coming soon" text instead of links, so there are never dead links.
 */

export const SITE = {
  name: "Panchayat",
  tagline: "PLAY • CHAT • CONNECT",
  title: "Panchayat — Play, Chat, Connect",
  description:
    "Panchayat is an upcoming social gaming and voice-chat app. Hang out in voice rooms, play casual games together and meet your people. Join the waitlist for early access.",
  /** Set to your production domain before deploying (used for Open Graph URLs). */
  url: "https://example.com",
};

/**
 * BRAND LOGO
 * ----------
 * The official logo lives at public/brand/panchayat-logo.png. Set `logoSrc`
 * to null to fall back to the code-drawn wordmark in components/brand/Logo.tsx.
 */
export const BRAND = {
  logoSrc: "/brand/panchayat-logo.png" as string | null,
  logoWidth: 2096,
  logoHeight: 670,
};

export const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Coming Soon", href: "#coming-soon" },
] as const;

/**
 * Social profiles. Leave `href: null` until the official accounts exist —
 * the footer will show them as "soon" instead of linking anywhere.
 */
export const SOCIAL_LINKS: { label: string; href: string | null }[] = [
  { label: "Instagram", href: null },
  { label: "X", href: null },
  { label: "YouTube", href: null },
  { label: "Discord", href: null },
];

/** Public contact email. `null` until an official address exists. */
export const CONTACT_EMAIL: string | null = null;
