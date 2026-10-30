"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Footprints, Lock } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin, ScreenHeader, formatCoins } from "@/components/ui/kit";
import { DAY_MS, VISITOR_LOG_PLANS, timeAgo, timeLeft, type Visit, type VisitorLogPlanId } from "@/lib/app/market";
import { useMarket } from "@/lib/app/market-store";
import { usePeople } from "@/lib/app/people";
import { useApp } from "@/lib/app/store";
import { nameFace, nameTone } from "@/lib/app/fonts";

/**
 * Who opened your profile, and whose profiles you opened. Seeing who visited
 * takes a visitor log (2 days, 7 days or a month, paid in coins); the profiles
 * you visited are always free.
 */
export function VisitorsScreen() {
  const { pop, openProfile, coins, setSheet } = useApp();
  const { visitors, visited, visitorsSeenAt, markVisitorsSeen, now, visitorLogOn, visitorLogUntil, buyVisitorLog } = useMarket();
  const person = usePeople();
  const [tab, setTab] = useState<"visitors" | "visited">("visitors");
  // Keep the "New" marks for this visit, then count them as seen
  const [seenAt] = useState(visitorsSeenAt);
  // Visitors only count as seen once you can actually see them
  useEffect(() => {
    if (!visitorLogOn) return;
    markVisitorsSeen();
    return markVisitorsSeen;
  }, [markVisitorsSeen, visitors.length, visitorLogOn]);
  const [plan, setPlan] = useState<VisitorLogPlanId>("7d");
  const [showPlans, setShowPlans] = useState(false);
  const locked = tab === "visitors" && !visitorLogOn;

  const list = tab === "visitors" ? visitors : visited;
  const total = visitors.reduce((n, v) => n + v.times, 0);
  const today = visitors.filter((v) => now - v.at < DAY_MS).length;

  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader title="Visitors" onBack={pop} />

      <div className="mx-4 grid grid-cols-3 rounded-2xl bg-surface py-3 ring-1 ring-line">
        {[
          ["Visitors", visitors.length],
          ["Total visits", total],
          ["Today", today],
        ].map(([k, v]) => (
          <span key={k} className="text-center">
            <span className="block font-display text-[19px] font-bold text-cream">{v}</span>
            <span className="text-[10.5px] text-muted">{k}</span>
          </span>
        ))}
      </div>

      <div className="mx-4 mt-3 flex rounded-full bg-surface p-1 ring-1 ring-line" role="tablist">
        {(["visitors", "visited"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-9 flex-1 rounded-full text-[13.5px] font-bold ${tab === t ? "bg-coral text-white" : "text-cream/65"}`}>
            {t === "visitors" ? `Who visited me (${visitors.length})` : `I visited (${visited.length})`}
          </button>
        ))}
      </div>

      {tab === "visitors" && visitorLogOn && !showPlans ? (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-gold/[0.08] px-3.5 py-2.5 ring-1 ring-gold/30" data-testid="visitor-log-active">
          <Eye className="h-4 w-4 shrink-0 text-gold" aria-hidden />
          <span className="min-w-0 flex-1 text-[12.5px] text-cream">
            Visitor log on · <span className="font-bold text-gold">{timeLeft(visitorLogUntil, now)}</span>
          </span>
          <button type="button" onClick={() => setShowPlans(true)} className="h-7 rounded-full bg-gold px-3 text-[11.5px] font-bold text-ink">
            Extend
          </button>
        </div>
      ) : null}

      {tab === "visitors" && (!visitorLogOn || showPlans) ? (
        <section className="mx-4 mt-3 rounded-3xl bg-gradient-to-br from-[#3a2450] to-[#1c1426] p-4 ring-1 ring-gold/25" aria-label="Visitor log plans">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold">
              <Eye className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[16px] font-bold text-cream">{visitorLogOn ? "Extend your visitor log" : "Unlock your visitor log"}</span>
              <span className="block text-[12px] leading-snug text-cream/70">
                {visitorLogOn ? "More days are added to the time you have left." : visitors.length ? `${visitors.length} ${visitors.length === 1 ? "person has" : "people have"} visited your profile. See who, and when.` : "See everyone who opens your profile, and when."}
              </span>
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Visitor log plan">
            {VISITOR_LOG_PLANS.map((p) => {
              const on = plan === p.id;
              const tag = p.id === "7d" ? "Popular" : p.id === "30d" ? "Best value" : "";
              return (
                <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setPlan(p.id)} className={`relative flex flex-col items-center rounded-2xl px-1 pb-2.5 pt-3.5 ring-1 transition ${on ? "bg-gold/15 ring-gold" : "bg-black/25 ring-line"}`}>
                  {tag ? <span className="absolute -top-2 rounded-full bg-coral px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-white">{tag}</span> : null}
                  <span className="font-display text-[15px] font-bold text-cream">{p.label}</span>
                  <span className="mt-1 flex items-center gap-1 text-[13px] font-bold text-gold">
                    <Coin className="h-3.5 w-3.5" /> {p.price.toLocaleString("en-IN")}
                  </span>
                </button>
              );
            })}
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              const p = VISITOR_LOG_PLANS.find((x) => x.id === plan)!;
              if (coins < p.price) {
                setSheet({ kind: "coins" });
                return;
              }
              if (buyVisitorLog(plan)) setShowPlans(false);
            }}
            className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-gold text-[14px] font-bold text-ink"
          >
            {(() => {
              const p = VISITOR_LOG_PLANS.find((x) => x.id === plan)!;
              return coins < p.price ? (
                "Not enough coins · Add coins"
              ) : (
                <>
                  {visitorLogOn ? "Extend" : "Unlock"} for {p.label} · <Coin className="h-4 w-4" /> {p.price.toLocaleString("en-IN")}
                </>
              );
            })()}
          </motion.button>
          <p className="mt-2 flex items-center justify-between text-[11px] text-cream/50">
            <span className="flex items-center gap-1">
              Balance <Coin className="h-3 w-3" /> {formatCoins(coins)}
            </span>
            {visitorLogOn ? (
              <button type="button" onClick={() => setShowPlans(false)} className="font-semibold text-cream/70">
                Not now
              </button>
            ) : null}
          </p>
        </section>
      ) : null}

      <ul className="mt-3 space-y-2 px-4">
        {list.map((v: Visit, i) => {
          const p = person(v.id);
          const isNew = tab === "visitors" && v.at > seenAt;
          if (locked)
            return (
              <li key={v.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line" aria-label="Hidden visitor">
                <span className="relative grid h-[46px] w-[46px] shrink-0 place-items-center overflow-hidden rounded-full">
                  <span className="blur-[6px]" aria-hidden>
                    <PersonAvatar person={p} size={46} />
                  </span>
                  <Lock className="absolute h-4 w-4 text-cream/80" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block h-3.5 w-28 rounded-full bg-cream/15" aria-hidden />
                  <span className="mt-1.5 block text-[11.5px] text-muted">Visited your profile{v.times > 1 ? ` · ${v.times} times` : ""}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  {isNew ? <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-extrabold text-white">NEW</span> : null}
                  <span className="text-[11px] text-cream/55">{timeAgo(v.at, now)}</span>
                </span>
              </li>
            );
          return (
            <motion.li key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
              <button type="button" onClick={() => openProfile(v.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ${isNew ? "bg-coral/10 ring-coral/30" : "bg-surface ring-line"}`}>
                <PersonAvatar person={p} size={46} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[14.5px] font-bold ${nameTone(p.vip)}`} style={nameFace(p.nameFont)}>{p.name}</span>
                  <span className="block text-[11.5px] text-muted">
                    {tab === "visitors" ? "Visited your profile" : "You visited"}
                    {v.times > 1 ? ` · ${v.times} times` : ""}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  {isNew ? <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-extrabold text-white">NEW</span> : null}
                  <span className="text-[11px] text-cream/55">{timeAgo(v.at, now)}</span>
                </span>
              </button>
            </motion.li>
          );
        })}
        {list.length === 0 ? (
          <li className="rounded-2xl bg-surface px-4 py-8 text-center ring-1 ring-line">
            {tab === "visitors" ? <Eye className="mx-auto h-9 w-9 text-cream/40" aria-hidden /> : <Footprints className="mx-auto h-9 w-9 text-cream/40" aria-hidden />}
            <p className="mt-2 text-[13px] text-muted">{tab === "visitors" ? "No visitors yet. Hop into rooms and people will check out your profile." : "Profiles you open show up here."}</p>
          </li>
        ) : null}
      </ul>
      <p className="mx-4 mt-4 text-center text-[11px] text-cream/40">Only you can see this list.</p>
    </div>
  );
}
