import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SITE, SOCIAL_LINKS } from "@/lib/site";

const LINKS = [
  { label: "Open the app", href: "/" },
  { label: "Home", href: "/about#home" },
  { label: "Features", href: "/about#features" },
  { label: "Coming Soon", href: "/about#coming-soon" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-ink-2/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/about#home" aria-label="Panchayat home" className="inline-block rounded-lg pt-3">
              <Logo size="2.2rem" />
            </Link>
            <p className="mt-4 text-xs font-bold tracking-[0.26em] text-gold">{SITE.tagline}</p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <nav aria-label="Footer">
              <p className="text-sm font-semibold text-cream">Explore</p>
              <ul className="mt-4 space-y-3">
                {LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted transition-colors hover:text-cream">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="text-sm font-semibold text-cream">Social</p>
              <ul className="mt-4 space-y-3">
                {SOCIAL_LINKS.map((s) => (
                  <li key={s.label}>
                    {s.href ? (
                      <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted transition-colors hover:text-cream">
                        {s.label}
                      </a>
                    ) : (
                      // Placeholder: set the URL in lib/site.ts to turn this into a link
                      <span className="text-sm text-muted/60">
                        {s.label} <span className="text-[11px]">(soon)</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-cream">Legal</p>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/privacy" className="text-sm text-muted transition-colors hover:text-cream">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-muted transition-colors hover:text-cream">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:justify-between">
          <p>© {year} Panchayat. All rights reserved.</p>
          <p>The Panchayat web app is in development.</p>
        </div>
      </div>
    </footer>
  );
}
