"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { CharmIconArt, CharmLevelArt } from "@/components/ui/CharmBadge";
import { formatPoints } from "@/lib/app/levels";
import { CHARM_TIERS, EXP_SOURCES, expToNext, isDoubleCharmDay, type ExpSource } from "@/lib/app/progress";
import { useApp } from "@/lib/app/store";

/** Your Active Level: EXP bar and what each source gave you today. */
export function ActiveLevelCard() {
  const { profile, expToday } = useApp();
  const xpNext = expToNext(profile.level);
  const pct = Math.min(100, Math.round((profile.xp / xpNext) * 100));
  const [showExp, setShowExp] = useState(true);
  return (
    <>
      {/* Active Level */}
      <section className="mx-4 mt-4 rounded-2xl bg-surface p-4 ring-1 ring-line" aria-labelledby="lvl-h">
        <div className="flex items-center justify-between text-[12.5px]">
          <span id="lvl-h" className="font-semibold text-cream">
            Active Level {profile.level}
          </span>
          <span className="text-muted">
            {profile.xp.toLocaleString("en-IN")} / {xpNext.toLocaleString("en-IN")} EXP
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream/10" role="progressbar" aria-label="EXP to next level" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <motion.div className="h-full rounded-full bg-gradient-to-r from-coral to-gold" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
        </div>
        <button type="button" onClick={() => setShowExp((v) => !v)} aria-expanded={showExp} className="mt-2 flex w-full items-center justify-between text-[11.5px] font-semibold text-muted hover:text-cream">
          How to earn EXP today
          <ChevronRight className={`h-3.5 w-3.5 transition ${showExp ? "rotate-90" : ""}`} aria-hidden />
        </button>
        {showExp ? (
          <ul className="mt-2 space-y-1.5">
            {(Object.keys(EXP_SOURCES) as ExpSource[]).map((k) => {
              const src = EXP_SOURCES[k];
              const got = expToday(k);
              const capped = Number.isFinite(src.cap);
              return (
                <li key={k} className="rounded-xl bg-cream/[0.04] px-3 py-2">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-semibold text-cream">{src.label}</span>
                    <span className={`text-[11.5px] font-bold ${capped && got >= src.cap ? "text-speak" : "text-gold"}`}>{capped ? `${got}/${src.cap} today` : `+${got.toLocaleString("en-IN")} today`}</span>
                  </div>
                  <p className="text-[11px] text-muted">{src.detail}</p>
                  {capped ? (
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-cream/10">
                      <div className="h-full rounded-full bg-gold/70" style={{ width: `${Math.min(100, (got / src.cap) * 100)}%` }} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

    </>
  );
}

/** Charm: points from gifts received and the Star / Diamond / Crown ladder. */
export function CharmCard({ personId = "me" }: { personId?: string }) {
  const { charmOf } = useApp();
  const charm = charmOf(personId);
  const doubleDay = isDoubleCharmDay();
  return (
    <>
      {/* Charm */}
      <section className="mx-4 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#2a1f45] to-[#1a1626] p-4 ring-1 ring-[#b48bff]/30" aria-labelledby="charm-h">
        <div className="flex items-center justify-between">
          <h2 id="charm-h" className="flex items-center gap-1.5 text-[12.5px] font-semibold text-cream">
            {charm.tier ? <CharmIconArt icon={charm.tier.icon} size={18} /> : null} Charm {charm.tier ? `· ${charm.tier.name}` : ""}
          </h2>
          {doubleDay ? <span className="rounded-full bg-pink/20 px-2 py-0.5 text-[10.5px] font-extrabold text-pink">Double Charm Day ×2</span> : null}
        </div>
        <p className="mt-1 font-display text-[24px] font-extrabold text-cream">
          {charm.points.toLocaleString("en-IN")} <span className="text-[12px] font-semibold text-muted">points</span>
        </p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/35" role="progressbar" aria-label="Charm toward the next icon" aria-valuenow={Math.round(charm.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#b48bff] to-[#ff8fa3]" initial={{ width: 0 }} animate={{ width: `${charm.progress * 100}%` }} transition={{ duration: 0.8 }} />
        </div>
        <p className="mt-1.5 text-[11px] text-cream/65">
          {charm.nextTier ? `${(charm.nextTier.min - charm.points).toLocaleString("en-IN")} points to ${charm.nextTier.name}` : "Top charm icon reached"} · Charm only comes from gifts you receive: 5 coins = 1 point, and you also get 30% of each gift back as coins
          {doubleDay ? " (2.5 coins today)" : ""}.
        </p>
        <div className="mt-3 grid grid-cols-6 gap-1">
          {CHARM_TIERS.map((t) => {
            const on = charm.points >= t.min;
            return (
              <div key={t.name} className={`flex flex-col items-center rounded-lg py-1.5 ${on ? "bg-white/[0.08]" : "opacity-40"}`} title={`${t.name}: ${t.min.toLocaleString("en-IN")} points`}>
                <CharmLevelArt tier={t} size={22} />
                <span className="mt-0.5 text-[9.5px] font-bold text-cream">{t.name}</span>
                <span className="text-[8.5px] text-cream/55">{formatPoints(t.min)}</span>
              </div>
            );
          })}
        </div>
      </section>

    </>
  );
}
