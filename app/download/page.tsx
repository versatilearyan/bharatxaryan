import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShieldCheck, Smartphone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { apkInfo } from "@/lib/apk";
import { PlayStoreSoon } from "@/components/sections/PlayStoreSoon";

export const metadata: Metadata = { title: "Download the Android app — Panchayat" };
export const dynamic = "force-dynamic";

const STEPS = [
  "Download the file with the button above.",
  "Open it from your notifications or the Downloads folder.",
  "If Android asks, allow “Install unknown apps” for your browser, then tap Install.",
  "Open Panchayat and sign in. Your account, wallet and rooms are the same as on the website.",
];

export default async function DownloadPage() {
  const info = await apkInfo();
  const mb = info ? Math.max(1, Math.round(info.size / 1048576)) : 0;
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col px-4 py-16 sm:px-6">
      <Link href="/about" aria-label="Panchayat home" className="w-fit rounded-lg pt-3">
        <Logo size="2rem" />
      </Link>
      <h1 className="mt-14 font-display text-5xl font-bold tracking-[-0.035em] text-cream">Panchayat for Android</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">The full Panchayat app on your phone: voice rooms, games, chat, gifts and your Parivar.</p>

      <PlayStoreSoon className="mt-8" />

      <div className="mt-4 rounded-3xl bg-surface p-5 ring-1 ring-line">
        {info ? (
          <>
            <a
              href="/download/apk"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gold font-display text-[17px] font-extrabold text-ink"
              data-testid="download-apk"
            >
              <Download className="h-5 w-5" aria-hidden /> Download the app (Android)
            </a>
            <p className="mt-3 text-center text-sm text-muted">
              {mb} MB · updated {info.updated.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
            </p>
          </>
        ) : (
          <p role="status" className="text-center text-cream">
            The Android app is being uploaded. Please check back soon.
          </p>
        )}
      </div>

      <h2 className="mt-10 flex items-center gap-2 font-display text-2xl font-bold text-cream">
        <Smartphone className="h-6 w-6 text-gold" aria-hidden /> How to install
      </h2>
      <ol className="mt-4 list-decimal space-y-2 pl-6 text-base leading-relaxed text-muted">
        {STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      <p className="mt-8 flex items-start gap-2 text-sm leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
        Payments in the app use the same secure PayU checkout as the website (UPI, cards, net banking). The app only ever opens panchayat.world.
      </p>
      <Link href="/" className="mt-10 w-fit text-sm font-semibold text-gold underline-offset-4 hover:underline">
        Prefer the browser? Open the web app
      </Link>
    </main>
  );
}
