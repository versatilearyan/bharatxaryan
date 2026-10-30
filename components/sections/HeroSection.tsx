"use client";

import { motion, type Variants } from "framer-motion";
import { Crown as CrownIcon, Gamepad2, Heart, MessageCircle, Mic, Users } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { VoiceRing } from "@/components/mock/VoiceRing";
import { GameGlyph } from "@/components/mock/GameTile";
import { LinkButton } from "@/components/ui/Button";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { FloatingIcon } from "@/components/ui/FloatingIcon";

const ease = [0.22, 1, 0.36, 1] as const;

const STRIP = [
  { icon: Mic, title: "Voice rooms", text: "Talk and hang out together" },
  { icon: Gamepad2, title: "Casual games", text: "Ludo, carrom and more" },
  { icon: Users, title: "Your people", text: "Friends who share your vibe" },
];

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export function HeroSection() {
  return (
    <section id="home" aria-labelledby="hero-title" className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden pt-28 sm:pt-32 lg:pt-28">
      {/* Atmospheric light: one warm coral pool and one gold, nothing else */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 right-[-10%] h-[42rem] w-[42rem] rounded-full bg-coral/20 blur-[140px]" />
        <div className="absolute top-[30%] left-[-15%] h-[30rem] w-[30rem] rounded-full bg-gold/10 blur-[130px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-14 px-4 pb-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:px-8 lg:pb-10">
        {/* Copy */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative z-10">
          <motion.div variants={item}>
            <ComingSoonBadge>THE PANCHAYAT WEB APP — COMING SOON</ComingSoonBadge>
          </motion.div>


          <motion.h1
            id="hero-title"
            variants={item}
            className="mt-8 font-display text-[clamp(3rem,9vw,5.4rem)] lg:text-[clamp(3rem,4.9vw,5rem)] font-extrabold leading-[0.92] tracking-[-0.045em] text-cream"
          >
            Less scrolling.
            <br />
            More connecting.
          </motion.h1>

          <motion.p variants={item} className="mt-7 max-w-[34rem] text-lg leading-relaxed text-muted sm:text-xl">
            Voice rooms and games with your people. Coming soon to your browser.
          </motion.p>

          <motion.div variants={item} className="mt-10 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="#waitlist">Join the Waitlist</LinkButton>
            <LinkButton href="#features" variant="ghost">
              See what’s coming
            </LinkButton>
          </motion.div>
        </motion.div>

        {/* Visual: everyone sits in a circle around the Panchayat crown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.1, delay: 0.35, ease }}
          className="relative mx-auto w-full max-w-[34rem]"
          aria-label="Eight friends sitting in a circle around the Panchayat logo, like a voice room"
          role="img"
        >
          {/* Slow orbit ring behind the circle */}
          <div aria-hidden className="absolute inset-[-4%] rounded-full border border-dashed border-gold/15 motion-safe:animate-[spin_90s_linear_infinite]" />
          <VoiceRing
            avatarSize={58}
            center={
              <div className="absolute inset-[24%] flex flex-col items-center justify-center rounded-full border border-gold/25 bg-[radial-gradient(circle_at_50%_35%,#2a2228,#141218_70%)] shadow-[0_30px_80px_-20px_rgb(244_81_91/0.45),inset_0_1px_0_rgb(255_241_213/0.08)]">
                <Logo size="6.6cqw" />
                <p className="mt-[2.4cqw] text-[2.3cqw] font-bold tracking-[0.22em] text-gold/90">PLAY • CHAT • CONNECT</p>
              </div>
            }
          />

          {/* Floating UI cards */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 1.0, ease }}
            className="absolute -left-4 -top-[3%] hidden sm:block lg:-left-12"
          >
            <div className="animate-float-slow flex items-center gap-3 rounded-2xl border border-line-strong bg-ink-2/90 p-3 pr-4 shadow-2xl backdrop-blur-md">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-speak/15">
                <Mic className="h-4 w-4 text-speak" aria-hidden />
              </span>
              <span>
                <span className="block text-[11px] text-muted">Voice room</span>
                <span className="block text-sm font-semibold text-cream">Riya is speaking</span>
              </span>
            </div>
          </motion.div>


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.3, ease }}
            className="absolute -bottom-[4%] -left-4 hidden sm:block lg:-left-12"
          >
            <div className="animate-float flex items-center gap-3 rounded-2xl border border-line-strong bg-ink-2/90 p-3 pr-4 shadow-2xl backdrop-blur-md" style={{ animationDelay: "2.4s" }}>
              <span className="h-9 w-9 rounded-xl bg-coral/15 p-1">
                <GameGlyph glyph="dice" hue="#f4515b" />
              </span>
              <span>
                <span className="block text-[11px] text-muted">Ludo</span>
                <span className="block text-sm font-semibold text-cream">3 of 4 seats taken</span>
              </span>
            </div>
          </motion.div>

          {/* Floating reactions */}
          {[
            { e: "😂", l: "68%", t: "2%", d: 0 },
            { e: "❤️", l: "90%", t: "30%", d: 1.4 },
                      ].map((r) => (
            <span
              key={r.e}
              aria-hidden
              className="animate-float absolute grid h-10 w-10 place-items-center rounded-full border border-line bg-surface/90 text-lg shadow-lg"
              style={{ left: r.l, top: r.t, animationDelay: `${r.d}s` }}
            >
              {r.e}
            </span>
          ))}
        </motion.div>
      </div>

      {/* What's inside: a quiet strip anchoring the bottom of the hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
        className="relative border-t border-line bg-ink/40 backdrop-blur-sm"
      >
        <ul className="mx-auto grid max-w-7xl grid-cols-1 gap-x-6 gap-y-4 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:px-8">
          {STRIP.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface/60 text-gold">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-cream">{title}</span>
                <span className="block text-[13px] leading-snug text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Decorative floating icons (desktop only, reduced on tablet) */}
      <FloatingIcon icon={CrownIcon} tone="gold" rotate={-12} className="left-[44%] top-[22%] hidden h-9 w-9 lg:grid" />
      <FloatingIcon icon={MessageCircle} tone="pink" rotate={8} slow delay={1} className="left-[2%] top-[58%] hidden h-10 w-10 xl:grid" />
      <FloatingIcon icon={Heart} tone="coral" rotate={-6} delay={2} className="right-[3%] top-[22%] hidden h-10 w-10 xl:grid" />
      <FloatingIcon icon={Gamepad2} tone="cream" rotate={10} slow delay={0.5} className="left-[45%] bottom-[22%] hidden h-10 w-10 lg:grid" />
    </section>
  );
}
