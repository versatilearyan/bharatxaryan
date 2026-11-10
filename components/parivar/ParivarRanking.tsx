"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { FramedPicture, SignBadge } from "./ParivarFrames";
import { parivarApi, type RankRow } from "@/lib/api/parivar";
import { useApp } from "@/lib/app/store";

export type FamilyPeriod = "weekly" | "total";
export type FamilyData = { rows: RankRow[]; mine: RankRow | null } | null;

const n = (v: number) => v.toLocaleString("en-IN");

/** Loads the Parivar leaderboard while the Family tab is open. */
export function useFamilyRanking(active: boolean, period: FamilyPeriod): FamilyData {
  const [data, setData] = useState<FamilyData>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    setData(null);
    parivarApi
      .ranking(period)
      .then((d) => live && setData(d))
      .catch(() => live && setData({ rows: [], mine: null }));
    return () => {
      live = false;
    };
  }, [active, period]);
  return data;
}

function Logo({ r, size }: { r: RankRow; size: number }) {
  return (
    <FramedPicture frame={r.frame} size={size}>
      {r.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center" style={{ fontSize: size * 0.5, background: `radial-gradient(circle at 30% 25%, ${r.color}aa, ${r.color}33 70%), #1c1b22` }} aria-hidden>
          {r.emblem}
        </span>
      )}
    </FramedPicture>
  );
}

function Lv({ level }: { level: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-gradient-to-r from-[#2d6f9e] to-[#3fa7ff] px-1.5 py-0.5 text-[10.5px] font-extrabold text-white">
      <Shield className="h-3 w-3" aria-hidden /> {level}
    </span>
  );
}

// Left to right on the podium: 2nd, 1st, 3rd
const BANNER = [
  { bg: "linear-gradient(180deg,#3f7fe0,#1c4a9a)", edge: "#c9d6ff", logo: 62, lift: "mt-6" },
  { bg: "linear-gradient(180deg,#2fa57e,#0f5a44)", edge: "#ffd36e", logo: 76, lift: "" },
  { bg: "linear-gradient(180deg,#c98a6a,#7c4a33)", edge: "#ffb59a", logo: 62, lift: "mt-6" },
];

/** Podium and list, in the same style as the other leaderboards. */
export function FamilyBody({ data }: { data: FamilyData }) {
  const { push } = useApp();
  if (!data) return <div className="mx-4 mt-4 h-72 animate-pulse rounded-3xl bg-white/[0.06]" />;
  const [first, second, third] = data.rows;
  const open = (id: string) => push({ kind: "parivar", id });
  const slots: (RankRow | undefined)[] = [second, first, third];
  return (
    <div>
      <div className="mt-3 grid grid-cols-[1fr_1.12fr_1fr] items-end gap-1.5 px-3">
        {slots.map((r, i) => {
          const b = BANNER[i];
          if (!r) return <span key={i} />;
          return (
            <button key={r.id} type="button" onClick={() => open(r.id)} aria-label={`Number ${r.rank}: ${r.name}`} className={`relative flex min-w-0 flex-col items-center text-center ${b.lift}`}>
              <span className="relative z-10 -mb-9 block">
                <Logo r={r} size={b.logo} />
                <span className="absolute -top-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full text-[12px] font-extrabold text-[#2a1a0c]" style={{ background: b.edge }}>
                  {r.rank}
                </span>
              </span>
              <span className="flex w-full flex-col items-center px-1.5 pt-12 pb-9" style={{ background: b.bg, clipPath: "polygon(0 0, 100% 0, 100% 86%, 50% 100%, 0 86%)", borderTop: `2px solid ${b.edge}`, borderRadius: "14px 14px 0 0" }}>
                <span className="max-w-full truncate text-[12.5px] font-extrabold text-white">{r.name}</span>
                <span className="mt-1 flex items-center gap-1">
                  <Lv level={r.level} />
                  <SignBadge sign={r.sign} frame={r.frame} size="sm" />
                </span>
                <span className="mt-1.5 text-[14px] font-extrabold text-white">{n(r.score)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <ol className="mx-3 mt-4 overflow-hidden rounded-3xl bg-black/30 ring-1 ring-white/10">
        {data.rows.slice(3, 50).map((r) => (
          <li key={r.id} className="border-b border-white/[0.06] last:border-b-0">
            <button type="button" onClick={() => open(r.id)} className={`flex w-full items-center gap-3 px-3 py-3 text-left ${data.mine?.id === r.id ? "bg-gold/10" : ""}`}>
              <span className="w-7 text-center font-display text-[16px] font-extrabold text-cream/70">{r.rank}</span>
              <Logo r={r} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[16px] font-extrabold text-cream">{r.name}</span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <Lv level={r.level} />
                  <SignBadge sign={r.sign} frame={r.frame} size="sm" />
                </span>
              </span>
              <span className="text-right">
                <span className="block text-[15px] font-extrabold text-gold">{n(r.score)}</span>
                <span className="text-[10.5px] text-cream/50">Activeness</span>
              </span>
            </button>
          </li>
        ))}
        {!data.rows.length ? <li className="px-4 py-8 text-center text-[13px] text-muted">No Parivar has any activeness yet.</li> : null}
        {data.rows.length > 0 && data.rows.length <= 3 ? <li className="px-4 py-6 text-center text-[13px] text-muted">Nobody else here yet.</li> : null}
      </ol>
    </div>
  );
}

/** Your own Parivar, always visible at the bottom. */
export function FamilyBar({ data }: { data: FamilyData }) {
  const { push } = useApp();
  const m = data?.mine ?? null;
  return (
    <div className="pb-safe flex items-center gap-3 border-t border-white/10 bg-ink-2 px-3 py-2.5">
      <span className="w-9 text-center font-display text-[15px] font-extrabold text-cream/70">{m ? (m.rank > 999 ? "999+" : m.rank) : "–"}</span>
      {m ? <Logo r={m} size={40} /> : <span className="h-12 w-12 shrink-0 rounded-full bg-white/10" aria-hidden />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-cream">{m ? m.name : "No Parivar yet"}</span>
        {m ? (
          <span className="flex items-center gap-1.5 text-[11.5px] text-cream/55">
            <Lv level={m.level} /> <SignBadge sign={m.sign} frame={m.frame} size="sm" /> {n(m.score)}
          </span>
        ) : (
          <span className="text-[11.5px] text-cream/55">Join or start one</span>
        )}
      </span>
      <button type="button" onClick={() => push(m ? { kind: "parivar-chat", id: m.id } : { kind: "parivar-list" })} className="h-9 shrink-0 rounded-full bg-gold px-5 text-[12.5px] font-bold text-ink">
        {m ? "Enter" : "Find"}
      </button>
    </div>
  );
}

/** Weekly / Total switch for the Family tab. */
export function FamilyPeriodSwitch({ period, onChange }: { period: FamilyPeriod; onChange: (p: FamilyPeriod) => void }) {
  return (
    <div className="mx-4 my-2.5 flex rounded-full bg-black/30 p-1 ring-1 ring-white/10" role="tablist" aria-label="Period">
      {(["weekly", "total"] as const).map((k) => (
        <button key={k} type="button" role="tab" aria-selected={period === k} onClick={() => onChange(k)} className={`h-8 flex-1 rounded-full text-[12.5px] font-bold ${period === k ? "bg-cream text-ink" : "text-cream/65"}`}>
          {k === "weekly" ? "Weekly" : "Total"}
        </button>
      ))}
    </div>
  );
}
