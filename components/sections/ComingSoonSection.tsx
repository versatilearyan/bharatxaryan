import { Bell, Wrench } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { VoiceRing } from "@/components/mock/VoiceRing";
import { GameTile } from "@/components/mock/GameTile";
import { LinkButton } from "@/components/ui/Button";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { Reveal } from "@/components/ui/Reveal";
import { GAMES, MEMBERS, ROOMS_LIST } from "@/lib/mock-data";

export function ComingSoonSection() {
  return (
    <section id="coming-soon" aria-labelledby="coming-soon-title" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-ink-2 px-5 py-12 sm:px-10 sm:py-16 lg:px-14">
          {/* Gold horizon glow distinguishes this panel from the rest of the page */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(60%_80%_at_50%_100%,rgb(231_188_114/0.16),transparent_70%)]" />

          <div className="relative grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <ComingSoonBadge />
              <h2
                id="coming-soon-title"
                className="mt-6 font-display text-[clamp(2.1rem,5vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.035em] text-cream text-balance"
              >
                The Panchayat Web App Is Coming Soon.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                Your favorite people, games, and conversations—coming to your browser. We’re building a new place to hang
                out, play, and connect.
              </p>
              <div className="mt-8 flex flex-col items-start gap-5">
                <LinkButton href="#waitlist">
                  <Bell className="h-4 w-4" aria-hidden />
                  Notify me at launch
                </LinkButton>
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Wrench className="h-4 w-4 text-gold" aria-hidden />
                  The experience is currently in development. No launch date yet.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <BrowserMockup />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrowserMockup() {
  return (
    <figure className="relative" aria-label="Preview of the Panchayat web app in a browser window, blurred because it is still in development">
      <div className="overflow-hidden rounded-2xl border border-line-strong bg-ink shadow-[0_40px_100px_-30px_rgb(0_0_0/0.8)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-coral/70" />
            <span className="h-3 w-3 rounded-full bg-gold/70" />
            <span className="h-3 w-3 rounded-full bg-cream/25" />
          </div>
          <div className="mx-auto flex h-7 w-full max-w-xs items-center justify-center rounded-lg bg-ink/70 text-xs text-muted">
            Panchayat web app
          </div>
          <span className="w-10" aria-hidden />
        </div>

        {/* Blurred, preview-only interface */}
        <div className="relative">
          <div aria-hidden className="pointer-events-none grid select-none grid-cols-[9rem_1fr] gap-4 p-4 blur-[5px] sm:grid-cols-[11rem_1fr]">
            <div className="space-y-2">
              <div className="mb-4 scale-90 origin-left">
                <Logo size="1.2rem" />
              </div>
              {ROOMS_LIST.map((r) => (
                <div key={r.name} className="rounded-xl bg-surface px-3 py-2.5 text-[11px] text-cream/80">
                  {r.name}
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="mx-auto w-[78%] max-w-[18rem]">
                <VoiceRing members={MEMBERS.slice(0, 6)} avatarSize={40} live={false} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GAMES.slice(0, 4).map((g) => (
                  <GameTile key={g.id} game={g} compact />
                ))}
              </div>
            </div>
          </div>

          {/* Overlay label */}
          <div className="absolute inset-0 grid place-items-center bg-ink/35">
            <div className="rounded-2xl border border-gold/30 bg-ink/85 px-7 py-5 text-center shadow-2xl backdrop-blur-md">
              <p className="font-display text-3xl font-bold tracking-[-0.03em] text-cream sm:text-4xl">Coming Soon</p>
              <p className="mt-1 text-sm text-muted">In development, preview only</p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
