"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Crown, Gem, MessageSquareQuote, Palette, Sparkles, Armchair, DoorOpen } from "lucide-react";
import { SunsetScene } from "@/components/art/SunsetScene";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin, DemoNote, ScreenHeader } from "@/components/ui/kit";
import { COINS_PER_GROWTH, VIP_PRICE_INR, VIP_THRESHOLDS, formatPoints, vipLevel } from "@/lib/app/levels";
import { useMe } from "@/lib/app/me-store";
import { CheckoutSheet } from "@/components/market/CheckoutSheet";
import { formatInr } from "@/lib/app/redpacket";
import { VIP_TIERS } from "@/lib/app/data";
import { VIP_SETS } from "@/lib/app/effects";
import { VIP_DAYS, useApp } from "@/lib/app/store";
import { VipCosmeticsPreview } from "./VipCosmeticsPreview";

const PERK_ICONS = [BadgeCheck, MessageSquareQuote, DoorOpen, Armchair, Palette, Gem, Sparkles, Crown, Crown, Crown, Crown];

const THEMES = [
  { name: "Darbar Gold", cover: { theme: "gold", motif: "temple" } as const },
  { name: "Velvet Night", cover: { theme: "night", motif: "lanterns" } as const },
  { name: "Ember Palace", cover: { theme: "ember", motif: "river" } as const },
];

/** VIP benefits and tiers. VIP is a monthly subscription paid at checkout; levels grow with coins spent while VIP. */
export function VipBenefits() {
  const { pop, profile, vip: localVip, vipUntil, buyVip, endVip, setTab, toast } = useApp();
  // Signed in: your VIP level and growth points are the server's (every 100 coins spent while VIP)
  const me = useMe();
  useEffect(() => me.refresh(true), []); // eslint-disable-line react-hooks/exhaustive-deps
  const srvPoints = me.stats.data?.vipPoints;
  const srvActive = me.profile.data?.vipActive;
  const vip = srvPoints !== undefined && srvActive !== undefined ? vipLevel(srvPoints, srvActive) : localVip;
  const [tier, setTier] = useState(Math.max(1, vip.level));
  const [paying, setPaying] = useState(false);
  // Follow your level when it changes (bought or ended)
  useEffect(() => setTier(Math.max(1, vip.level)), [vip.level]);
  const current = VIP_TIERS.find((t) => t.tier === tier)!;
  const unlocked = VIP_TIERS.filter((t) => t.tier <= tier).flatMap((t) => t.perks);
  /** Coins still to spend for the next level. */
  const coinsToNext = vip.next === null ? 0 : (vip.next - vip.points) * COINS_PER_GROWTH;
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
              {!vip.level
                ? `Subscribe to become VIP 1, then every ${COINS_PER_GROWTH} coins you spend adds 1 growth point.`
                : vip.next
                  ? `${(vip.next - vip.points).toLocaleString("en-IN")} pts (spend ${coinsToNext.toLocaleString("en-IN")} coins) to VIP ${vip.level + 1}`
                  : "You've reached the top VIP level"}
            </p>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setPaying(true)}
            className="relative mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[14.5px] font-extrabold text-[#2a1a0c]"
          >
            {vip.level ? "Renew VIP" : "Become VIP"} · {formatInr(VIP_PRICE_INR)}/month
          </motion.button>
          <p className="relative mt-1.5 text-center text-[11px] text-cream/55">
            {vip.level ? `VIP ends ${until}. Renewing adds ${VIP_DAYS} days.` : `${VIP_DAYS} days of VIP 1. Higher levels come from growth.`}
          </p>
          {vip.level ? (
            <button type="button" onClick={endVip} className="relative mx-auto mt-1 block text-[11.5px] font-bold text-cream/60 underline underline-offset-2 hover:text-cream">
              End VIP now (demo)
            </button>
          ) : null}

          <p className="relative mt-4 text-[10.5px] font-bold uppercase tracking-[0.16em] text-cream/55">Preview a level</p>
          <div className="relative mt-2 grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Preview VIP tier">
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

      {/* Growth rate: how VIP growth is earned, and the points for every level */}
      <section className="mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-b from-[#2a1620] to-[#1a0e14] p-4 ring-1 ring-gold/25" aria-labelledby="growth-rate">
        <div className="flex items-center justify-between">
          <h2 id="growth-rate" className="font-display text-[16px] font-extrabold text-cream">
            Growth rate
          </h2>
          <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11.5px] font-extrabold text-gold">
            1 pt / {COINS_PER_GROWTH} <Coin className="-mt-0.5 inline h-3 w-3" />
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2 text-center">
          {(
            [
              ["🎁", "Gifts in rooms"],
              ["💝", "Profile, CP & BFF gifts"],
              ["🛍️", "Shop purchases"],
            ] as const
          ).map(([icon, label]) => (
            <li key={label} className="rounded-2xl bg-black/25 px-1.5 py-2.5 ring-1 ring-white/5">
              <span className="block text-[20px]" aria-hidden>
                {icon}
              </span>
              <span className="mt-0.5 block text-[11px] font-semibold leading-tight text-cream/80">{label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-cream/60">
          Only while you&apos;re VIP. Gifts sent from your Bag don&apos;t count. Your level never drops while VIP is active; when it ends, growth starts again with your next subscription.
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-white/10">
          {VIP_THRESHOLDS.map((pts, i) => {
            const lv = i + 1;
            const here = vip.level === lv;
            const done = vip.level > lv;
            return (
              <div key={lv} className={`flex items-center gap-3 px-3 py-2 text-[12.5px] ${here ? "bg-gold/15" : i % 2 ? "bg-black/20" : "bg-black/10"}`}>
                <span className={`w-12 font-display font-extrabold italic ${here ? "text-gold" : done ? "text-cream/70" : "text-cream/45"}`}>VIP {lv}</span>
                <span className={`flex-1 ${here ? "font-bold text-cream" : "text-cream/65"}`}>{lv === 1 ? "Subscribe" : `${pts.toLocaleString("en-IN")} pts`}</span>
                <span className="text-[11px] text-cream/45">{lv === 1 ? "" : `${(pts * COINS_PER_GROWTH).toLocaleString("en-IN")} coins`}</span>
                {done ? <span className="text-[12px] text-speak">✓</span> : here ? <span className="rounded-full bg-gold px-1.5 text-[10px] font-extrabold text-ink">YOU</span> : <span className="w-3" />}
              </div>
            );
          })}
        </div>
      </section>

      <CheckoutSheet
        item={
          paying
            ? {
                id: "vip-month",
                name: vip.level ? "Renew VIP · 1 month" : "VIP · 1 month",
                note: `${VIP_DAYS} days of VIP. Spend coins to grow your level.`,
                art: <Crown className="h-11 w-11 text-gold" aria-hidden />,
                inr: VIP_PRICE_INR,
                tone: "gold",
              }
            : null
        }
        onClose={() => setPaying(false)}
      />

      {/* Perks */}
      <section className="mt-6 px-4">
        <h2 className="font-display text-lg font-bold text-cream">
          {current.name} privileges <span className="text-sm font-semibold text-muted">· {unlocked.length}</span>
        </h2>
        <p className="mt-0.5 text-[12px] text-muted">{tier <= vip.level ? "Unlocked" : tier === 1 ? `Unlocks when you subscribe (${formatInr(VIP_PRICE_INR)}/month)` : `Unlocks at ${VIP_THRESHOLDS[tier - 1].toLocaleString("en-IN")} growth points`}</p>
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

      {/* What the previewed level comes with, from the server */}
      <VipCosmeticsPreview level={tier} />

      {/* How growth works */}
      <section className="mt-7 px-4" aria-labelledby="grow-h">
        <h2 id="grow-h" className="font-display text-lg font-bold text-cream">How to grow</h2>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-wine/60 p-4 ring-1 ring-gold/20">
          <span className="flex items-center gap-1 font-display text-[18px] font-extrabold text-cream">
            <Coin className="h-5 w-5" /> {COINS_PER_GROWTH}
          </span>
          <span className="text-cream/50">=</span>
          <span className="font-display text-[18px] font-extrabold text-foil">1 pt</span>
          <span className="ml-auto max-w-[50%] text-right text-[11.5px] text-cream/70">Coins you spend while you&apos;re VIP</span>
        </div>
        <ul className="mt-3 space-y-1 rounded-2xl bg-black/15 p-4 text-[12.5px] text-cream/80 ring-1 ring-gold/15">
          <li>• Sending gifts</li>
          <li>• Shopping in the Shop</li>
          <li>• Permanent rooms, red packets and anything else paid with coins</li>
          <li className="pt-1 text-[11.5px] text-muted">When you&apos;re not VIP, coins you spend don&apos;t add growth.</li>
        </ul>
        <ol className="mt-3 overflow-hidden rounded-2xl ring-1 ring-gold/15">
          {VIP_THRESHOLDS.map((pts, i) => {
            const reached = vip.level >= i + 1;
            return (
              <li key={pts} className={`flex items-center justify-between px-4 py-2.5 text-[13px] ${i % 2 ? "bg-black/15" : "bg-black/5"} ${vip.level === i + 1 ? "!bg-gold/15" : ""}`}>
                <span className={`font-display font-extrabold ${reached ? "text-foil" : "text-cream/70"}`}>VIP {i + 1}</span>
                <span className="text-cream/80">{i === 0 ? "Subscribe" : `${pts.toLocaleString("en-IN")} pts`}</span>
                <span className="flex w-28 items-center justify-end gap-1 text-muted">
                  {i === 0 ? (
                    `${formatInr(VIP_PRICE_INR)}/month`
                  ) : (
                    <>
                      <Coin className="h-3.5 w-3.5" /> {formatPoints(pts * COINS_PER_GROWTH)}
                    </>
                  )}
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
        <DemoNote>VIP growth is saved on this device.</DemoNote>
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
