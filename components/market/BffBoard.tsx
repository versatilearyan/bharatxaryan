"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { nameFace } from "@/lib/app/fonts";
import { vipName } from "@/lib/app/levels";
import { relationshipById, tagLevel, useTagTypes } from "@/lib/app/tags";
import { useApp } from "@/lib/app/store";
import type { NameFont } from "@/lib/app/types";
import { NameText } from "@/components/ui/NameText";

/**
 * BFF ranking: tag pairs (Bestie, BFF, Confidant ...) by Intimacy. Weekly = coins gifted between the two since
 * Monday; Total = the tag's whole Intimacy. GET /api/v1/rankings/bff?period=week|total
 */
type P = { userId: string; name: string; avatarUrl?: string; vipLevel?: number; nameFont?: string };
type Row = { rank: number; relation: string; intimacy: number; value: number; a: P; b: P };

const readP = (v: unknown): P => {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return {
    userId: String(o.userId ?? ""),
    name: typeof o.name === "string" ? o.name : "Panchayat member",
    avatarUrl: typeof o.avatarUrl === "string" && o.avatarUrl ? o.avatarUrl : undefined,
    vipLevel: typeof o.vipLevel === "number" ? o.vipLevel : undefined,
    nameFont: typeof o.nameFont === "string" ? o.nameFont.toLowerCase() : undefined,
  };
};

const CROWN = ["#f6c64a", "#c9d3ff", "#f0a56a"];

function Avatar({ p, z }: { p: P; z: number }) {
  return (
    <span className="relative block h-[58px] w-[58px] shrink-0 overflow-hidden rounded-full bg-[#2a1018] ring-2 ring-white/80" style={{ zIndex: z }}>
      {p.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="grid h-full w-full place-items-center font-display text-[22px] font-black text-gold/80">{p.name.charAt(0)}</span>
      )}
    </span>
  );
}

export function BffBoard() {
  const { setSheet } = useApp();
  useTagTypes();
  const [period, setPeriod] = useState<"week" | "total">("week");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setRows(null);
    setError("");
    api<unknown>(`/api/v1/rankings/bff?period=${period}`, { auth: true })
      .then((raw) => {
        if (!live) return;
        const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        const list = Array.isArray(d.rows) ? d.rows : [];
        setRows(
          list.flatMap((x) => {
            const o = x && typeof x === "object" ? (x as Record<string, unknown>) : null;
            if (!o) return [];
            return [{ rank: Number(o.rank) || 0, relation: String(o.relation ?? "besties"), intimacy: Number(o.intimacy) || 0, value: Number(o.value) || 0, a: readP(o.a), b: readP(o.b) }];
          }),
        );
      })
      .catch((e) => live && setError(e instanceof Error && e.message ? e.message : "Couldn't load the BFF ranking."));
    return () => {
      live = false;
    };
  }, [period]);

  const open = (p: P) => setSheet({ kind: "person", personId: `srv-user:${p.userId}` });

  return (
    <div className="px-4 pb-6">
      <div className="my-2.5 flex rounded-full bg-black/30 p-1 ring-1 ring-white/10" role="tablist" aria-label="BFF period">
        {(["week", "total"] as const).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)} className={`h-9 flex-1 rounded-full text-[13px] font-bold ${period === p ? "bg-cream text-ink" : "text-cream/65"}`}>
            {p === "week" ? "Weekly" : "Total"}
          </button>
        ))}
      </div>
      {error ? (
        <p className="rounded-2xl bg-[#3a1418] px-4 py-6 text-center text-[13px] text-[#ffb0b4] ring-1 ring-coral/25">{error}</p>
      ) : !rows ? (
        <p className="grid place-items-center py-14" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-gold" aria-label="Loading" />
        </p>
      ) : !rows.length ? (
        <p className="px-6 py-14 text-center text-[13px] text-cream/55">No tag pairs yet {period === "week" ? "this week" : ""}. Gifts between two people with a tag (Bestie, BFF and more) raise their Intimacy.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const rel = relationshipById(r.relation);
            const lv = tagLevel(r.intimacy).level;
            return (
              <li key={`${r.a.userId}-${r.b.userId}`} className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#4a1d6e] via-[#5a2585] to-[#4a1d6e] px-3 py-2.5 ring-1 ring-gold/40">
                <span className="grid w-9 shrink-0 place-items-center">
                  {r.rank <= 3 ? (
                    <span className="relative grid h-9 w-9 place-items-center text-[22px]" style={{ color: CROWN[r.rank - 1] }} aria-label={`Number ${r.rank}`}>
                      👑<span className="absolute inset-0 grid place-items-center pt-1 font-display text-[11px] font-black text-[#2a1600]">{r.rank}</span>
                    </span>
                  ) : (
                    <span className="font-display text-[18px] font-black text-cream">{r.rank}</span>
                  )}
                </span>
                {/* The two of them, with their tag's badge and level between */}
                <button type="button" onClick={() => open(r.a)} className="relative flex shrink-0 items-center" aria-label={`${r.a.name} and ${r.b.name}`}>
                  <Avatar p={r.a} z={1} />
                  <span className="-ml-3">
                    <Avatar p={r.b} z={0} />
                  </span>
                  <span className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-[62%] text-[24px] drop-shadow" aria-hidden>
                    {rel.emoji}
                  </span>
                  <span className="absolute bottom-0 left-1/2 z-[2] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#f6d27a] to-[#d99a2b] px-1.5 text-[10px] font-black text-[#2a1600] ring-1 ring-white/70">
                    Lv{lv}
                  </span>
                </button>
                <span className="min-w-0 flex-1">
                  {[r.a, r.b].map((p) => (
                    <button key={p.userId} type="button" onClick={() => open(p)} className="flex max-w-full items-center gap-1 text-left">
                      <span className="text-[12px]" aria-hidden>{rel.emoji}</span>
                      <span className={`truncate font-display text-[14px] font-bold ${vipName(p.vipLevel) || "text-cream"}`} style={nameFace(p.nameFont as NameFont | undefined)}>
                        <NameText text={p.name} />
                      </span>
                    </button>
                  ))}
                  <span className="block text-[11.5px] font-bold" style={{ color: rel.tint }}>
                    {rel.one} · Lv {lv}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-[16px] font-black text-cream">{r.value.toLocaleString("en-IN")}</span>
                  <span className="block text-[11px] text-cream/55">Intimacy</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
