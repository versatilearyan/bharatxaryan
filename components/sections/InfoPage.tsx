import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

/** Simple layout for placeholder pages (privacy, terms, contact). */
export function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col px-4 py-16 sm:px-6">
      <Link href="/" aria-label="Back to Panchayat home" className="w-fit rounded-lg pt-3">
        <Logo size="2rem" />
      </Link>
      <h1 className="mt-14 font-display text-5xl font-bold tracking-[-0.035em] text-cream">{title}</h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">{children}</div>
      <Link href="/" className="mt-10 w-fit text-sm font-semibold text-gold underline-offset-4 hover:underline">
        Back to the homepage
      </Link>
    </main>
  );
}
