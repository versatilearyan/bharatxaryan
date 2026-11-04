"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Footprints, Lock } from "lucide-react";
import { Coin, ScreenHeader, formatCoins } from "@/components/ui/kit";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/app/store";

type Person = { userId: string | null; name: string; avatarUrl?: string; visits: number; lastAt: number; isNew: boolean };
type VisitList = { stats: { visitors: number; totalVisits: number; today: number; newCount: number }; logOn: boolean; logUntil: number | null; people: Person[] };
type Plan = { id: string; label: string; days: number; price: number; badge?: string };

const opts = { auth: true, forbiddenIsAccess: true } as const;
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

async function loadVisits(kind: "in" | "out"): Promise<VisitList> {
  const d = (await api<Record<string, unknown>>(`/api/v1/visitors/me?kind=${kind}`, opts)) ?? {};
  const s = (d.stats ?? {}) as Record<string, unknown>;
  return {
    stats: { visitors: Number(s.visitors) || 0, totalVisits: Number(s.totalVisits) || 0, today: Number(s.today) || 0, newCount: Number(s.newCount) || 0 },
    logOn: d.logOn === true,
    logUntil: typeof d.logUntil === "string" ? Date.parse(d.logUntil) : null,
    people: (Array.isArray(d.people) ? d.people : []).map((x) => {
      const o = x as Record<string, unknown>;
      return { userId: o.userId == null ? null : String(o.userId), name: String(o.name ?? "Someone"), avatarUrl: typeof o.avatarUrl === "string" ? o.avatarUrl : undefined, visits: Number(o.visits) || 1, lastAt: Date.parse(String(o.lastAt)) || Date.now(), isNew: o.isNew === true };
    }),
  };
}

/** Record that you opened someone's profile (backend users). */
export function recordServerVisit(userId: string) {
  void api(`/api/v1/visitors/${encodeURIComponent(userId)}`, { ...opts, method: "POST" }).catch(() => undefined);
}

/** Your visitor numbers (for the profile shortcut): total visitors and how many are new. */
export function useVisitorStats() {
  const { session } = useApp();
  const [s, setS] = useState<{ visitors: number; newCount: number } | null>(null);
  useEffect(() => {
    if (!session) return;
    let off = false;
    loadVisits("in")
      .then((v) => !off && setS({ visitors: v.stats.visitors, newCount: v.stats.newCount }))
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [session]);
  return s;
}

const ago = (t: number) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
};
const left = (until: number) => {
  const ms = Math.max(0, until - Date.now());
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d ? `${d}d ${h}h` : `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
};

function Face({ src, name, hidden }: { src?: string; name: string; hidden?: boolean }) {
  if (hidden)
    return (
      <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#3a3348] to-[#1e1a26] text-cream/50 ring-1 ring-white/10">
        <Lock className="h-4.5 w-4.5" />
      </span>
    );
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-12 w-12 rounded-full object-cover" />
  ) : (
    <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-[#ff7fa8] font-display text-[18px] font-extrabold text-white">{name.slice(0, 1).toUpperCase()}</span>
  );
}

/**
 * Visitors from the server: who opened your profile (names show while your
 * visitor log is on) and whose profiles you opened. Plans and prices come
 * from the admin panel; buying takes the coins from your balance.
 */
export function ServerVisitorsScreen() {
  const { pop, openProfile, coins, toast, setSheet } = useApp();
  const [tab, setTab] = useState<"in" | "out">("in");
  const [data, setData] = useState<Record<string, VisitList | undefined>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plan, setPlan] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (k: "in" | "out") => {
    try {
      const v = await loadVisits(k);
      setData((d) => ({ ...d, [k]: v }));
      return v;
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't load visitors.", "error");
      return null;
    }
  }, [toast]);
  useEffect(() => {
    void load("in").then((v) => {
      // Visitors count as seen once you can see who they are
      if (v?.logOn) void api("/api/v1/visitors/me/seen", { ...opts, method: "POST" }).catch(() => undefined);
    });
    void load("out");
    api<unknown[]>("/api/v1/visitors/plans", opts)
      .then((l) => {
        const list = (l ?? []).map((x) => {
          const o = x as Record<string, unknown>;
          return { id: String(o.id), label: String(o.label), days: Number(o.days) || 1, price: Number(o.price) || 0, badge: typeof o.badge === "string" && o.badge ? o.badge : undefined };
        });
        setPlans(list);
        setPlan((p) => p ?? (list.find((x) => x.badge === "POPULAR") ?? list[0])?.id ?? null);
      })
      .catch(() => undefined);
  }, [load]);

  const mine = data.in;
  const list = data[tab];
  const locked = tab === "in" && mine && !mine.logOn;
  const chosen = plans.find((p) => p.id === plan);

  const buy = async () => {
    if (!chosen) return;
    if (coins < chosen.price) {
      toast("Not enough coins.", "error");
      setSheet({ kind: "coins" });
      return;
    }
    setBusy(true);
    try {
      await api(`/api/v1/visitors/plans/${chosen.id}/buy`, { ...opts, method: "POST", body: { requestId: newId() } });
      toast(`Visitor log on for ${chosen.label} 👀`, "gold");
      setShowPlans(false);
      await load("in");
      void api("/api/v1/visitors/me/seen", { ...opts, method: "POST" }).catch(() => undefined);
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't buy the plan.", "error");
    } finally {
      setBusy(false);
    }
  };

  const stats = tab === "in" ? mine?.stats : data.out?.stats;

  return (
    <div className="app-scroll h-full bg-ink pb-safe">
      <ScreenHeader title="Visitors" onBack={pop} />
      <div className="mx-4 grid grid-cols-3 rounded-3xl bg-surface py-4 text-center ring-1 ring-line">
        {(
          [
            [stats?.visitors, tab === "in" ? "Visitors" : "People"],
            [stats?.totalVisits, "Total visits"],
            [stats?.today, "Today"],
          ] as const
        ).map(([n, label]) => (
          <div key={label}>
            <span className="block font-display text-[22px] font-extrabold text-cream">{n ?? "–"}</span>
            <span className="text-[12px] text-muted">{label}</span>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-3 flex rounded-full bg-surface p-1 ring-1 ring-line">
        {(
          [
            ["in", `Who visited me (${mine?.stats.visitors ?? 0})`],
            ["out", `I visited (${data.out?.stats.visitors ?? 0})`],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`relative h-11 flex-1 rounded-full text-[14px] font-bold ${tab === k ? "text-white" : "text-cream/70"}`}>
            {tab === k ? <motion.span layoutId="vis-tab" className="absolute inset-0 rounded-full bg-coral" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {/* Visitor log: on (time left, Extend) or off (buy to see who) */}
      {tab === "in" && mine ? (
        <AnimatePresence mode="wait">
          {showPlans || locked ? (
            <motion.section key="plans" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-4 mt-3 rounded-3xl bg-gradient-to-br from-[#3a1f5c] to-[#1c1230] p-4 ring-1 ring-gold/30">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-gold">
                  <Eye className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-display text-[17px] font-extrabold text-cream">{mine.logOn ? "Extend your visitor log" : "See who visited you"}</span>
                  <span className="text-[12px] text-cream/65">{mine.logOn ? "More days are added to the time you have left." : `${mine.stats.visitors} people visited your profile. Unlock the log to see who.`}</span>
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {plans.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPlan(p.id)} className={`relative rounded-2xl px-2 pb-3 pt-4 text-center ring-1 transition ${plan === p.id ? "bg-white/10 ring-gold" : "bg-black/25 ring-white/10"}`}>
                    {p.badge ? <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-coral px-2 py-0.5 text-[9.5px] font-extrabold text-white">{p.badge}</span> : null}
                    <span className="block font-display text-[16px] font-extrabold text-cream">{p.label}</span>
                    <span className="mt-1 flex items-center justify-center gap-1 text-[13px] font-bold text-gold">
                      <Coin className="h-3.5 w-3.5" /> {p.price.toLocaleString("en-IN")}
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" disabled={!chosen || busy} onClick={() => void buy()} className="mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-gold text-[15px] font-extrabold text-ink disabled:opacity-50">
                {busy ? "Buying…" : chosen ? (
                  <>
                    {mine.logOn ? "Extend" : "Unlock"} for {chosen.label} · <Coin className="h-4 w-4" /> {chosen.price.toLocaleString("en-IN")}
                  </>
                ) : (
                  "No plans yet"
                )}
              </button>
              <div className="mt-2 flex items-center justify-between text-[11.5px] text-cream/55">
                <span className="flex items-center gap-1">
                  Balance <Coin className="h-3 w-3" /> {formatCoins(coins)}
                </span>
                {mine.logOn ? (
                  <button type="button" onClick={() => setShowPlans(false)} className="font-bold">
                    Not now
                  </button>
                ) : null}
              </div>
            </motion.section>
          ) : (
            <motion.div key="on" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-gold/10 px-4 py-3 ring-1 ring-gold/30">
              <Eye className="h-4 w-4 text-gold" />
              <span className="flex-1 text-[13.5px] text-cream">
                Visitor log on · <b className="text-gold">{mine.logUntil ? left(mine.logUntil) : ""} left</b>
              </span>
              <button type="button" onClick={() => setShowPlans(true)} className="rounded-full bg-gold px-3.5 py-1.5 text-[12.5px] font-bold text-ink">
                Extend
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      ) : null}

      <ul className="mt-3 space-y-2 px-4 pb-8">
        {list && list.people.length === 0 ? (
          <li className="flex flex-col items-center py-12 text-center text-[13px] text-muted">
            <Footprints className="mb-2 h-8 w-8 opacity-60" />
            {tab === "in" ? "No visitors yet." : "You haven't opened anyone's profile yet."}
          </li>
        ) : null}
        {(list?.people ?? []).map((p, i) => {
          const hidden = tab === "in" && !mine?.logOn;
          return (
            <motion.li key={`${p.userId ?? "x"}-${i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
              <button
                type="button"
                disabled={!p.userId}
                onClick={() => p.userId && openProfile(`srv-user:${p.userId}`)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left ring-1 ${p.isNew && !hidden ? "bg-[#2a1418] ring-coral/30" : "bg-surface ring-line"}`}
              >
                <Face src={p.avatarUrl} name={p.name} hidden={hidden} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[15px] font-bold ${hidden ? "text-cream/60 blur-[3px]" : "text-cream"}`}>{hidden ? "Hidden visitor" : p.name}</span>
                  <span className="text-[12px] text-muted">
                    {tab === "in" ? "Visited your profile" : "You visited"}
                    {p.visits > 1 ? ` · ${p.visits} times` : ""}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  {p.isNew && !hidden ? <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-extrabold text-white">NEW</span> : null}
                  <span className="text-[11.5px] text-muted">{ago(p.lastAt)}</span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
