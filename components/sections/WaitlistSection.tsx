import { Crown } from "@/components/brand/Crown";
import { Reveal } from "@/components/ui/Reveal";
import { WaitlistForm } from "./WaitlistForm";

export function WaitlistSection() {
  return (
    <section id="waitlist" aria-labelledby="waitlist-title" className="relative py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[34rem] bg-[radial-gradient(50%_60%_at_50%_100%,rgb(244_81_91/0.16),transparent)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="relative grid items-center gap-12 overflow-hidden rounded-[2rem] border border-line bg-ink-2 px-5 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1fr_1.05fr] lg:px-14">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-coral/15 blur-[110px]" />
        <div aria-hidden className="pattern-panchayat pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(90deg,#000,transparent_55%)]" />
        <Reveal className="relative">
          <Crown sparkle className="h-12 w-16" />
          <h2
            id="waitlist-title"
            className="mt-6 font-display text-[clamp(2.3rem,6vw,4.2rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-cream text-balance"
          >
            Be there when Panchayat opens.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            Get early access updates and be among the first to experience Panchayat.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="relative">
          <WaitlistForm />
        </Reveal>
      </div>
      </div>
    </section>
  );
}
