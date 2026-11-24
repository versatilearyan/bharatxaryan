"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Crown, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { nameFace } from "@/lib/app/fonts";
import { vipName } from "@/lib/app/levels";
import { useApp } from "@/lib/app/store";
import type { NameFont } from "@/lib/app/types";
import { NameText } from "@/components/ui/NameText";

/**
 * Celebrity: for each finished day, the person who received the most Charm that day (India time), month by month,
 * newest day first. GET /api/v1/rankings/celebrity?month=YYYY-MM.
 */
type Day = { day: string; userId: string; name: string; avatarUrl?: string; vipLevel?: number; nameFont?: string; value: number };

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const shift = (key: string, by: number) => {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + by, 1));
};
const monthLabel = (key: string) => {
  if (key === monthKey(new Date())) return "This Month";
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export function CelebrityBoard() {
  const { setSheet } = useApp();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState("");
  const thisMonth = monthKey(new Date());

  useEffect(() => {
    let live = true;
    setDays(null);
    setError("");
    api<unknown>(`/api/v1/rankings/celebrity?month=${month}`, { auth: true })
      .then((raw) => {
        if (!live) return;
        const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        const list = Array.isArray(d.days) ? d.days : [];
        setDays(
          list.flatMap((x) => {
            const o = x && typeof x === "object" ? (x as Record<string, unknown>) : null;
            if (!o || typeof o.day !== "string") return [];
            return [{
              day: o.day,
              userId: String(o.userId ?? ""),
              name: typeof o.name === "string" ? o.name : "Panchayat member",
              avatarUrl: typeof o.avatarUrl === "string" && o.avatarUrl ? o.avatarUrl : undefined,
              vipLevel: typeof o.vipLevel === "number" ? o.vipLevel : undefined,
              nameFont: typeof o.nameFont === "string" ? o.nameFont.toLowerCase() : undefined,
              value: typeof o.value === "number" ? o.value : 0,
            }];
          }),
        );
      })
      .catch((e) => live && setError(e instanceof Error && e.message ? e.message : "Couldn't load the celebrities."));
    return () => {
      live = false;
    };
  }, [month]);

  return (
    <div className="px-4 pb-6">
      {/* Month switcher */}
      <div className="my-3 flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/50" />
        <div className="flex h-11 min-w-[210px] items-center rounded-2xl bg-gradient-to-r from-[#5a1a2e] via-[#7a2440] to-[#5a1a2e] px-1 shadow-[0_6px_20px_-8px_rgba(231,188,114,0.6)] ring-1 ring-gold/50">
          <button type="button" onClick={() => setMonth((m) => shift(m, -1))} aria-label="Previous month" className="grid h-9 w-9 place-items-center rounded-xl text-cream hover:bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="flex-1 text-center font-display text-[16px] font-extrabold text-cream">{monthLabel(month)}</span>
          <button type="button" disabled={month >= thisMonth} onClick={() => setMonth((m) => shift(m, 1))} aria-label="Next month" className="grid h-9 w-9 place-items-center rounded-xl text-cream hover:bg-white/10 disabled:opacity-30">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/50" />
      </div>

      {error ? (
        <p className="rounded-2xl bg-[#3a1418] px-4 py-6 text-center text-[13px] text-[#ffb0b4] ring-1 ring-coral/25">{error}</p>
      ) : !days ? (
        <p className="grid place-items-center py-14" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-gold" aria-label="Loading" />
        </p>
      ) : !days.length ? (
        <p className="px-6 py-14 text-center text-[13px] text-cream/55">No celebrity yet this month. The person who receives the most Charm in a day becomes that day&apos;s celebrity.</p>
      ) : (
        <div className="grid grid-cols-3 gap-x-2.5 gap-y-4">
          {days.map((d) => {
            const [, mm, dd] = d.day.split("-");
            return (
              <button key={d.day} type="button" onClick={() => setSheet({ kind: "person", personId: `srv-user:${d.userId}` })} className="flex min-w-0 flex-col items-center text-center" aria-label={`${d.name}, celebrity of ${dd}/${mm}`}>
                {/* The picture in a gold Panchayat frame with a crown notch at the bottom */}
                <span className="relative block w-full overflow-hidden rounded-[18px] bg-gradient-to-b from-[#f6d27a] to-[#b8862f] p-[3px] shadow-[0_8px_20px_-10px_rgba(231,188,114,0.9)]">
                  <span className="relative block aspect-[1/1] overflow-hidden rounded-[15px] bg-[#2a1018]">
                    {d.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-full w-full place-items-center font-display text-[30px] font-black text-gold/80">{d.name.charAt(0)}</span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#b8862f] to-transparent" />
                  </span>
                  <Crown className="absolute bottom-0.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 text-[#fff3c4] drop-shadow" aria-hidden />
                </span>
                <span className={`mt-1.5 line-clamp-1 max-w-full font-display text-[14px] font-extrabold ${vipName(d.vipLevel) || "text-cream"}`} style={nameFace(d.nameFont as NameFont | undefined)}>
                  <NameText text={d.name} />
                </span>
                <span className="text-[13px] font-semibold text-cream/55">
                  {dd}/{mm}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
