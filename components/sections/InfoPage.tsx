import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { BackButton } from "@/components/system/BackButton";

/** Simple layout for placeholder pages (privacy, terms, contact). */
export function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex items-center justify-between gap-3">
        <BackButton />
        <Link href="/" aria-label="Back to Panchayat home" className="w-fit rounded-lg">
          <Logo size="2rem" />
        </Link>
      </div>
      <h1 className="mt-8 font-display text-[32px] font-bold leading-tight tracking-[-0.035em] text-cream sm:mt-14 sm:text-5xl">{title}</h1>
      <div className="mt-5 space-y-4 break-words text-[16px] leading-relaxed text-muted sm:mt-6 sm:text-lg">{children}</div>
      <Link href="/" className="mt-10 w-fit text-sm font-semibold text-gold underline-offset-4 hover:underline">
        Back to the homepage
      </Link>
    </main>
  );
}
