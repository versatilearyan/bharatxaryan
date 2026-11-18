"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Swords } from "lucide-react";
import { ScreenHeader } from "@/components/ui/kit";
import { getPkHistory, getPkMe, getPkRanking, type PkMe, type PkPeriod, type PkRanking, type PkTx } from "@/lib/api/pk-coins";
import { userPersonId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { PkCoin, formatPk } from "./PkCoin";

const PERIODS: { id: PkPeriod; label: string }[] = [
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "all", label: "Overall" },
];

const KIND: Record<PkTx["kind"], string> = { EARN: "PK gift", SPEND: "PK Shop", GRANT: "From Panchayat", DEDUCT: "Taken back" };

/**
 * PK Coins: your balance, the PK ranking (weekly, monthly, overall: PK Coins earned in PK battles, a board of its
 * own) and your PK Coin history. PK Coins are spent in the Shop's PK section.
 */
export function PkCoinsScreen() {
  const { pop, push, openProfile } = useApp();
  const { myId } = useServerRooms();
  const [view, setView] = useState<"ranking" | "history">("ranking");
  const [period, setPeriod] = useState<PkPeriod>("week");
  const [me, setMe] = useState<PkMe | null>(null);
  const [board, setBoard] = useState<{ period: PkPeriod; data: PkRanking | null; error: string }>({ period: "week", data: null, error: "" });
  const [history, setHistory] = useState<PkTx[] | null>(null);

  useEffect(() => {
    getPkMe().then(setMe, () => {});
  }, []);
  useEffect(() => {
    let live = true;
    setBoard({ period, data: null, error: "" });
    getPkRanking(period).then(
      (data) => live && setBoard({ period, data, error: "" }),
      (e) => live && setBoard({ period, data: null, error: e instanceof Error && e.message ? e.message : "Couldn't load the PK ranking." }),
    );
    return () => {
      live = false;
    };
  }, [period]);
  useEffect(() => {
    if (view === "history" && history === null) getPkHistory(100).then(setHistory, () => setHistory([]));
  }, [view, history]);

  const mine = board.data?.me ?? (me ? me[period] : null);

  return (
    <div className="app-scroll h-full bg-ink pb-10">
      <ScreenHeader
        title="PK Coins"
        onBack={pop}
        right={
          <button type="button" onClick={() => push({ kind: "shop" })} className="flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-[12.5px] font-bold text-cream ring-1 ring-line">
            <ShoppingBag className="h-4 w-4" aria-hidden /> PK Shop
          </button>
        }
      />

      <section className="mx-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#5b1230] via-[#24123a] to-[#0f2a66] p-4 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <PkCoin className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-cream/70">Your PK Coins</p>
            <p className="font-display text-[28px] font-bold leading-tight text-cream">{formatPk(me?.balance ?? 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-cream/60">Earned in total</p>
            <p className="font-display text-[16px] font-bold text-gold">{formatPk(me?.earned ?? 0)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {PERIODS.map((p) => {
            const s = me?.[p.id];
            return (
              <div key={p.id} className="min-w-0 rounded-2xl bg-black/25 px-2 py-2 text-center">
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-wider text-cream/55">{p.label}</p>
                <p className="font-display text-[15px] font-bold text-cream">{s?.rank ? `#${s.rank}` : "–"}</p>
                <p className="flex items-center justify-center gap-0.5 text-[11px] text-cream/70">
                  <PkCoin className="h-3 w-3" /> {formatPk(s?.score ?? 0)}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-snug text-cream/70">
          <Swords className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
          {me && !me.enabled
            ? "PK Coins are paused right now."
            : `Send gifts while a PK is live to earn PK Coins (${me?.percent ?? 10} for every 100 coins of gifts${me?.officialBonus ? `, +${me.officialBonus}% in Official PK rooms` : ""}). Spend them in the Shop's PK section; PK items last ${me?.itemDays ?? 7} days unless the item says otherwise.`}
        </p>
      </section>

      <div className="mx-4 mt-4 flex gap-1 rounded-full bg-surface p-1 ring-1 ring-line" role="tablist">
        {(["ranking", "history"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`h-9 flex-1 rounded-full text-[13px] font-bold ${view === v ? "bg-coral text-white" : "text-cream/65"}`}>
            {v === "ranking" ? "PK Ranking" : "My history"}
          </button>
        ))}
      </div>

      {view === "ranking" ? (
        <>
          <div className="mx-4 mt-3 flex gap-2">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" onClick={() => setPeriod(p.id)} className={`h-8 flex-1 rounded-full text-[12.5px] font-bold ring-1 ${period === p.id ? "bg-gold text-ink ring-gold" : "bg-surface text-cream/70 ring-line"}`}>
                {p.label}
              </button>
            ))}
          </div>
          {board.error ? (
            <p className="mx-4 mt-6 text-center text-[13px] text-muted">{board.error}</p>
          ) : !board.data ? (
            <ul className="mx-4 mt-3 space-y-2" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="h-14 animate-pulse rounded-2xl bg-surface" />
              ))}
            </ul>
          ) : board.data.rows.length === 0 ? (
            <p className="mx-4 mt-8 text-center text-[13px] text-muted">No one has earned PK Coins {period === "week" ? "this week" : period === "month" ? "this month" : ""} yet. Send a gift in a live PK to be first.</p>
          ) : (
            <ol className="mx-4 mt-3 space-y-2">
              {board.data.rows.map((r) => {
                const isMe = !!myId && r.userId === myId;
                const medal = r.rank === 1 ? "#ffd36e" : r.rank === 2 ? "#c9d6ff" : r.rank === 3 ? "#ffb59a" : null;
                return (
                  <motion.li key={r.userId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(r.rank, 12) * 0.02 }}>
                    <button
                      type="button"
                      onClick={() => !isMe && openProfile(userPersonId(r.userId))}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ring-1 ${isMe ? "bg-coral/15 ring-coral/40" : "bg-surface ring-line"}`}
                    >
                      <span className="w-7 shrink-0 text-center font-display text-[16px] font-bold" style={{ color: medal ?? "rgba(255,240,220,.55)" }}>
                        {r.rank}
                      </span>
                      <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-cream/10 ring-2" style={{ ["--tw-ring-color" as string]: medal ?? "transparent" }}>
                        {r.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[15px] font-bold text-cream/70">{r.name.slice(0, 1)}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold text-cream">{r.name}</span>
                        {r.publicId ? <span className="block text-[11px] text-muted">ID {r.publicId}</span> : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-display text-[14px] font-bold text-gold">
                        <PkCoin className="h-4 w-4" /> {formatPk(r.score)}
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </ol>
          )}
          {mine ? (
            <div className="pb-safe sticky bottom-0 mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-[#1a1030]/95 px-4 py-3 ring-1 ring-gold/40 backdrop-blur">
              <span className="text-[12.5px] font-semibold text-cream/80">You</span>
              <span className="font-display text-[15px] font-bold text-cream">{mine.rank ? `#${mine.rank}` : "Not ranked yet"}</span>
              <span className="ml-auto flex items-center gap-1 font-display text-[14px] font-bold text-gold">
                <PkCoin className="h-4 w-4" /> {formatPk(mine.score)}
              </span>
            </div>
          ) : null}
        </>
      ) : history === null ? (
        <ul className="mx-4 mt-3 space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-14 animate-pulse rounded-2xl bg-surface" />
          ))}
        </ul>
      ) : history.length === 0 ? (
        <p className="mx-4 mt-8 text-center text-[13px] text-muted">No PK Coins yet. Send a gift while a PK is live to earn some.</p>
      ) : (
        <ul className="mx-4 mt-3 space-y-2">
          {history.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-line">
              <PkCoin className="h-8 w-8" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold text-cream">{KIND[t.kind]}</span>
                <span className="block truncate text-[11px] text-muted">
                  {t.reason ? `${t.reason} · ` : ""}
                  {t.at ? new Date(t.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </span>
              <span className={`shrink-0 font-display text-[15px] font-bold ${t.amount >= 0 ? "text-emerald-400" : "text-coral"}`}>
                {t.amount >= 0 ? "+" : "−"}
                {formatPk(Math.abs(t.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
