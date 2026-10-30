"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Crown, Gem, MessageSquareQuote, Palette, Sparkles, Armchair, DoorOpen } from "lucide-react";
import { SunsetScene } from "@/components/art/SunsetScene";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin, DemoNote, ScreenHeader } from "@/components/ui/kit";
import { POINTS_PER_COIN, VIP_THRESHOLDS, formatPoints } from "@/lib/app/levels";
import { VIP_TIERS } from "@/lib/app/data";
import { VIP_SETS } from "@/lib/app/effects";
import { VIP_DAYS, useApp } from "@/lib/app/store";

const PERK_ICONS = [BadgeCheck, MessageSquareQuote, DoorOpen, Armchair, Palette, Gem, Sparkles, Crown, Crown, Crown];

const THEMES = [
  { name: "Darbar Gold", cover: { theme: "gold", motif: "temple" } as const },
  { name: "Velvet Night", cover: { theme: "night", motif: "lanterns" } as const },
  { name: "Ember Palace", cover: { theme: "ember", motif: "river" } as const },
];

/** VIP benefits and tiers. Sample membership data only, no payments. */
export function VipBenefits() {
  const { pop, profile, vip, vipUntil, buyNextVip, endVip, setTab, coins, toast } = useApp();
  const [tier, setTier] = useState(Math.max(1, vip.level));
  // Follow your level when it changes (bought or ended)
  useEffect(() => setTier(Math.max(1, vip.level)), [vip.level]);
  const current = VIP_TIERS.find((t) => t.tier === tier)!;
  const unlocked = VIP_TIERS.filter((t) => t.tier <= tier).flatMap((t) => t.perks);
  /** Coins that take you straight to the next level (spending is what grows VIP). */
  const nextCost = vip.next === null ? 0 : Math.ceil((vip.next - vip.points) / POINTS_PER_COIN);
  const buyNext = () => {
    if (vip.next === null) return;
    const to = buyNextVip();
    if (!to) return toast(`You need ${nextCost.toLocaleString("en-IN")} coins for VIP ${vip.level + 1}`, "error");
    setTier(to);
    const set = VIP_SETS.find((x) => x.level === to);
    toast(
      to === 1
        ? `Welcome to VIP 1 for ${VIP_DAYS} days! Your badge, frame, chat bubble and entry are on.`
        : set
          ? `You're now VIP ${to}! The VIP ${to} badge, frame, chat bubble and entry are unlocked and on.`
          : `You're now VIP ${to}! Your VIP runs ${VIP_DAYS} days from today.`,
      "gold",
    );
  };
  const until = vipUntil ? new Date(vipUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <div className="app-scroll h-full bg-gradient-to-b from-[#241018] to-ink pb-safe">
      <ScreenHeader title={<span className="text-foil">VIP Benefits</span>} onBack={pop} />

      {/* Membership card */}
      <div className="px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5a1a28] via-[#3a1622] to-[#1a0b11] p-5 ring-1 ring-gold/40">
          <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div className="relative flex items-center gap-3">
            <PersonAvatar person={{ id: "me", look: profile.look, photo: profile.photo, frame: "none" }} size={52} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-cream">{profile.name}</p>
              <p className="text-[11.5px] text-cream/60">{vip.level ? `You are VIP ${vip.level}` : "Not VIP yet"}</p>
            </div>
            <span className="font-display text-[34px] font-extrabold italic text-foil">V{vip.level}</span>
          </div>

          {/* Growth points */}
          <div className="relative mt-4">
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="font-semibold text-gold">Growth points</span>
              <span className="text-cream/80">
                <span className="font-bold text-cream">{vip.points.toLocaleString("en-IN")}</span>
                {vip.next ? ` / ${vip.next.toLocaleString("en-IN")}` : ""}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/35" role="progressbar" aria-label="VIP growth" aria-valuenow={Math.round(vip.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <motion.div className="h-full rounded-full bg-gradient-to-r from-[#f6d899] to-[#c9954a]" initial={{ width: 0 }} animate={{ width: `${vip.progress * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
            <p className="mt-1.5 text-[11px] text-cream/65">
              {vip.next
                ? `${(vip.next - vip.points).toLocaleString("en-IN")} pts (${Math.ceil((vip.next - vip.points) / POINTS_PER_COIN).toLocaleString("en-IN")} coins) to VIP ${vip.level + 1}`
                : "You've reached the top VIP level"}
            </p>
          </div>

          {vip.next !== null ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={buyNext}
              className="relative mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[14.5px] font-extrabold text-[#2a1a0c]"
            >
              {vip.level ? `Get VIP ${vip.level + 1}` : "Buy VIP 1"} ·<Coin className="h-4 w-4" /> {nextCost.toLocaleString("en-IN")}
            </motion.button>
          ) : null}
          <p className="relative mt-1.5 text-center text-[11px] text-cream/55">
            {vip.level ? `VIP ends ${until}. ` : `Lasts ${VIP_DAYS} days. `}Demo coins: you have {coins.toLocaleString("en-IN")}.
          </p>
          {vip.level ? (
            <button type="button" onClick={endVip} className="relative mx-auto mt-1 block text-[11.5px] font-bold text-cream/60 underline underline-offset-2 hover:text-cream">
              End VIP now (demo)
            </button>
          ) : null}

          <p className="relative mt-4 text-[10.5px] font-bold uppercase tracking-[0.16em] text-cream/55">Preview a level</p>
          <div className="relative mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Preview VIP tier">
            {VIP_TIERS.map((t) => (
              <button
                key={t.tier}
                type="button"
                role="radio"
                aria-checked={tier === t.tier}
                onClick={() => setTier(t.tier)}
                className={`relative grid h-10 place-items-center rounded-full text-[12px] font-extrabold ring-1 transition-colors ${
                  t.tier === tier ? "bg-gradient-to-b from-[#f6d899] to-[#c9954a] text-[#2a1a0c] ring-gold" : t.tier <= vip.level ? "bg-gold/25 text-gold ring-gold/50" : "bg-black/30 text-cream/50 ring-gold/20"
                }`}
              >
                V{t.tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Perks */}
      <section className="mt-6 px-4">
        <h2 className="font-display text-lg font-bold text-cream">
          {current.name} privileges <span className="text-sm font-semibold text-muted">· {unlocked.length}</span>
        </h2>
        <p className="mt-0.5 text-[12px] text-muted">{tier <= vip.level ? "Unlocked" : `Unlocks at ${VIP_THRESHOLDS[tier - 1].toLocaleString("en-IN")} growth points`}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <AnimatePresence initial={false}>
            {unlocked.map((perk, i) => {
              const Icon = PERK_ICONS[i] ?? Crown;
              return (
                <motion.div
                  key={perk}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-wine/60 px-2 py-3 text-center ring-1 ring-gold/15"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/15 text-gold">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-[11px] leading-tight text-cream/85">{perk}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* How growth works */}
      <section className="mt-7 px-4" aria-labelledby="grow-h">
        <h2 id="grow-h" className="font-display text-lg font-bold text-cream">How to grow</h2>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-wine/60 p-4 ring-1 ring-gold/20">
          <span className="flex items-center gap-1 font-display text-[18px] font-extrabold text-cream">
            <Coin className="h-5 w-5" /> 1
          </span>
          <span className="text-cream/50">=</span>
          <span className="font-display text-[18px] font-extrabold text-foil">{POINTS_PER_COIN} pts</span>
          <span className="ml-auto max-w-[45%] text-right text-[11.5px] text-cream/70">While you&apos;re VIP, every coin you spend on gifts or a permanent room</span>
        </div>
        <ol className="mt-3 overflow-hidden rounded-2xl ring-1 ring-gold/15">
          {VIP_THRESHOLDS.map((pts, i) => {
            const reached = vip.level >= i + 1;
            return (
              <li key={pts} className={`flex items-center justify-between px-4 py-2.5 text-[13px] ${i % 2 ? "bg-black/15" : "bg-black/5"} ${vip.level === i + 1 ? "!bg-gold/15" : ""}`}>
                <span className={`font-display font-extrabold ${reached ? "text-foil" : "text-cream/70"}`}>VIP {i + 1}</span>
                <span className="text-cream/80">{formatPoints(pts)} pts</span>
                <span className="flex w-24 items-center justify-end gap-1 text-muted">
                  <Coin className="h-3.5 w-3.5" /> {(pts / POINTS_PER_COIN).toLocaleString("en-IN")}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Exclusive themes */}
      <section className="mt-7">
        <h2 className="px-4 font-display text-lg font-bold text-cream">Exclusive room themes</h2>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4">
          {THEMES.map((t) => (
            <div key={t.name} className="relative w-[200px] shrink-0 overflow-hidden rounded-3xl ring-1 ring-gold/30">
              <div className="aspect-[4/3]">
                <SunsetScene {...t.cover} shade />
              </div>
              <div className="pointer-events-none absolute inset-2 rounded-[18px] border border-gold/40" />
              <p className="absolute bottom-3 left-4 font-display text-[15px] font-bold text-foil">{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-3 px-4 pb-10 pt-7">
        <DemoNote>Coins in this preview are pretend demo coins. VIP growth is saved on this device, and nothing is charged.</DemoNote>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            pop();
            setTab("rooms");
          }}
          className="h-12 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c]"
        >
          Send gifts in a room to grow
        </motion.button>
      </div>
    </div>
  );
}
