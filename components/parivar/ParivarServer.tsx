"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Search, Shield, UsersRound } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin, ScreenHeader } from "@/components/ui/kit";
import { parivarApi, type ParivarApplication, type ParivarCard, type ParivarConfig, type ParivarProfile, type ParivarRole, type RankRow } from "@/lib/api/parivar";
import { useApp } from "@/lib/app/store";

const n = (v: number) => v.toLocaleString("en-IN");
const errText = (e: unknown, fallback = "That didn't work. Try again.") => (e instanceof Error && e.message ? e.message : fallback);
const EMBLEMS = ["🪔", "🦚", "👑", "🐘", "🌺", "🏏", "🎵", "🌙", "🔥", "🪷"];
const COLORS = ["#e7bc72", "#f4515b", "#19c3b2", "#8f6bff", "#ff8a3d", "#3fa7ff", "#ff5c8a", "#6fe0a6"];
const ROLE_LABEL: Record<ParivarRole, string> = { LEADER: "Mukhiya", DEPUTY: "Up-Mukhiya", ADMIN: "Sahayak", MEMBER: "Sadasya" };

export function Emblem({ p, size = 48 }: { p: Pick<ParivarCard, "emblem" | "color" | "logoUrl">; size?: number }) {
  return p.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.logoUrl} alt="" width={size} height={size} className="shrink-0 rounded-2xl object-cover ring-1 ring-white/15" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-2xl ring-1 ring-white/15" style={{ width: size, height: size, fontSize: size * 0.52, background: `radial-gradient(circle at 30% 25%, ${p.color}aa, ${p.color}33 70%), #1c1b22` }} aria-hidden>
      {p.emblem}
    </span>
  );
}

function LevelBadge({ level }: { level: number }) {
  return <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10.5px] font-extrabold text-gold">Lv {level}</span>;
}

function Avatar({ name, url, size = 36 }: { name: string; url?: string; size?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-[#2a1520] font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ---------------------------- Discover and ranking ---------------------------- */

export function ParivarListScreen() {
  const { pop, push, toast } = useApp();
  const [tab, setTab] = useState<"discover" | "weekly" | "total">("discover");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"popular" | "top" | "new">("popular");
  const [cards, setCards] = useState<ParivarCard[] | null>(null);
  const [me, setMe] = useState<{ parivarId: string | null; role: ParivarRole | null; appliedTo: string | null; enabled: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    parivarApi
      .mine()
      .then(setMe)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (tab !== "discover") return;
    let live = true;
    const t = window.setTimeout(() => {
      parivarApi
        .list(q.trim(), sort)
        .then((r) => live && setCards(r.content))
        .catch(() => live && setCards([]));
    }, q ? 250 : 0);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [tab, q, sort]);

  const join = async (c: ParivarCard) => {
    if (busy) return;
    setBusy(c.id);
    try {
      const r = await parivarApi.join(c.id);
      if (r.myRole) {
        toast(`You joined ${c.name} 🪔`, "gold");
        push({ kind: "parivar", id: c.id });
      } else {
        toast("Request sent. The Mukhiya will answer it.", "gold");
        setCards((l) => (l ?? []).map((x) => (x.id === c.id ? { ...x, myApplication: "PENDING" } : x)));
        setMe((m) => (m ? { ...m, appliedTo: c.id } : m));
      }
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setBusy(null);
    }
  };

  if (me && !me.enabled) {
    return (
      <div className="app-scroll h-full bg-ink pb-8">
        <ScreenHeader title="Parivar" onBack={pop} />
        <div className="px-8 pt-24 text-center">
          <p className="text-[54px]" aria-hidden>
            🪔
          </p>
          <p className="mt-2 font-display text-[22px] font-extrabold text-cream">Parivar is coming soon</p>
          <p className="mt-1 text-[13px] text-muted">Get your people ready!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader title="Parivar" onBack={pop} />
      {me?.parivarId ? (
        <button type="button" onClick={() => push({ kind: "parivar", id: me.parivarId! })} className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-3xl bg-gradient-to-r from-gold/20 to-surface p-3 text-left ring-1 ring-gold/30">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/20 text-gold">
            <UsersRound className="h-6 w-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-cream">My Parivar</span>
            <span className="text-[12px] text-muted">{me.role ? ROLE_LABEL[me.role] : ""} · tap to open</span>
          </span>
        </button>
      ) : (
        <button type="button" onClick={() => push({ kind: "parivar-create" })} className="mx-4 flex h-12 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[14.5px] font-extrabold text-[#2a1a0c]">
          🪔 Start your own Parivar
        </button>
      )}

      <div className="mx-4 mt-4 flex rounded-full bg-cream/[0.06] p-1" role="tablist">
        {(
          [
            ["discover", "Discover"],
            ["weekly", "Weekly"],
            ["total", "Total"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-full py-2 text-[12.5px] font-bold ${tab === k ? "bg-gold text-ink" : "text-cream/70"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "discover" ? (
        <>
          <div className="mx-4 mt-3 flex h-11 items-center gap-2 rounded-full bg-surface px-4 ring-1 ring-line">
            <Search className="h-4 w-4 text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, sign or Parivar ID" className="min-w-0 flex-1 bg-transparent text-[14px] text-cream placeholder:text-cream/35 focus:outline-none" aria-label="Search Parivars" />
          </div>
          <div className="no-scrollbar mx-4 mt-2 flex gap-2 overflow-x-auto">
            {(
              [
                ["popular", "Popular"],
                ["top", "Top"],
                ["new", "New"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setSort(k)} className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-bold ring-1 ${sort === k ? "bg-gold/20 text-gold ring-gold/40" : "text-cream/70 ring-line"}`}>
                {label}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-2 px-4">
            {cards === null ? [0, 1, 2].map((i) => <li key={i} className="h-[78px] animate-pulse rounded-2xl bg-cream/[0.06]" />) : null}
            {cards && !cards.length ? <li className="py-10 text-center text-[13px] text-muted">{q ? "No Parivar matches." : "No Parivars yet. Be the first to start one."}</li> : null}
            {(cards ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                <button type="button" onClick={() => push({ kind: "parivar", id: c.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Emblem p={c} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[14.5px] font-bold text-cream">{c.name}</span>
                      <LevelBadge level={c.level} />
                    </span>
                    <span className="block truncate text-[11.5px] text-muted">
                      [{c.sign}] · ID {c.code} · {n(c.members)}/{n(c.capacity)} members
                    </span>
                    {c.intro ? <span className="block truncate text-[11.5px] text-cream/60">{c.intro}</span> : null}
                  </span>
                </button>
                {me?.parivarId ? null : c.myApplication === "PENDING" ? (
                  <span className="shrink-0 rounded-full bg-cream/10 px-3 py-1.5 text-[11.5px] font-bold text-cream/70">Requested</span>
                ) : (
                  <button type="button" disabled={busy === c.id || c.members >= c.capacity} onClick={() => void join(c)} className="shrink-0 rounded-full bg-coral/15 px-3.5 py-1.5 text-[12px] font-bold text-pink disabled:opacity-50">
                    {c.members >= c.capacity ? "Full" : c.joinMode === "OPEN" ? "Join" : "Apply"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <RankingView period={tab} />
      )}
    </div>
  );
}

function RankingView({ period }: { period: "weekly" | "total" }) {
  const { push } = useApp();
  const [data, setData] = useState<{ rows: RankRow[]; mine: RankRow | null } | null>(null);
  useEffect(() => {
    let live = true;
    setData(null);
    parivarApi
      .ranking(period)
      .then((d) => live && setData(d))
      .catch(() => live && setData({ rows: [], mine: null }));
    return () => {
      live = false;
    };
  }, [period]);
  if (!data) return <div className="mx-4 mt-4 h-52 animate-pulse rounded-3xl bg-cream/[0.06]" />;
  const [first, second, third] = data.rows;
  const rest = data.rows.slice(3);
  const open = (id: string) => push({ kind: "parivar", id });
  const Pod = ({ r, h, ring }: { r?: RankRow; h: string; ring: string }) =>
    r ? (
      <button type="button" onClick={() => open(r.id)} className={`flex flex-col items-center ${h}`}>
        <span className="relative">
          <Emblem p={r} size={r.rank === 1 ? 72 : 58} />
          <span className="absolute -bottom-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full text-[12px] font-extrabold text-ink" style={{ background: ring }}>
            {r.rank}
          </span>
        </span>
        <span className="mt-3 max-w-[96px] truncate text-[12.5px] font-bold text-cream">{r.name}</span>
        <span className="text-[11px] text-gold">{n(r.score)}</span>
      </button>
    ) : (
      <span />
    );
  return (
    <div className="pb-24">
      <div className="mx-4 mt-4 grid grid-cols-3 items-end gap-2 rounded-3xl bg-gradient-to-b from-gold/15 to-transparent p-4 ring-1 ring-gold/20">
        <Pod r={second} h="pb-2" ring="#c9d6ff" />
        <Pod r={first} h="pb-6" ring="#ffd36e" />
        <Pod r={third} h="pb-0" ring="#ffb59a" />
      </div>
      <ul className="mt-3 space-y-1.5 px-4">
        {!data.rows.length ? <li className="py-10 text-center text-[13px] text-muted">Nothing here yet.</li> : null}
        {rest.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => open(r.id)} className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 text-left ring-1 ring-line">
              <span className="w-7 text-center font-display text-[15px] font-extrabold text-muted">{r.rank}</span>
              <Emblem p={r} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold text-cream">{r.name}</span>
                <span className="text-[11px] text-muted">[{r.sign}] · Lv {r.level}</span>
              </span>
              <span className="text-[12.5px] font-bold text-gold">{n(r.score)}</span>
            </button>
          </li>
        ))}
      </ul>
      {/* Your own Parivar, always at the bottom */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
        {data.mine ? (
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#241018]/95 px-3 py-2.5 ring-1 ring-gold/40 backdrop-blur">
            <span className="w-7 text-center font-display text-[15px] font-extrabold text-gold">{data.mine.rank}</span>
            <Emblem p={data.mine} size={38} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-cream">{data.mine.name}</span>
              <span className="text-[11px] text-muted">
                [{data.mine.sign}] · Lv {data.mine.level} · {n(data.mine.score)}
              </span>
            </span>
            <button type="button" onClick={() => open(data.mine!.id)} className="rounded-full bg-gold px-3.5 py-1.5 text-[12px] font-extrabold text-ink">
              Enter
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => push({ kind: "parivar-create" })} className="pointer-events-auto flex h-11 w-full items-center justify-center rounded-2xl bg-[#241018]/95 text-[13px] font-bold text-gold ring-1 ring-gold/40 backdrop-blur">
            You are not in a Parivar. Start or join one
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- Create ---------------------------- */

export function ParivarCreateScreen() {
  const { pop, push, toast, refreshCoins } = useApp();
  const [cfg, setCfg] = useState<ParivarConfig | null>(null);
  const [name, setName] = useState("");
  const [sign, setSign] = useState("");
  const [intro, setIntro] = useState("");
  const [emblem, setEmblem] = useState(EMBLEMS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [joinMode, setJoinMode] = useState<"OPEN" | "APPROVAL">("OPEN");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const idem = useRef(parivarApi.newKey());

  useEffect(() => {
    parivarApi
      .config()
      .then(setCfg)
      .catch(() => undefined);
  }, []);

  const valid = name.trim().length >= 3 && /^[A-Za-z0-9]{2,4}$/.test(sign.trim());
  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const p = await parivarApi.create({ name: name.trim(), sign: sign.trim().toUpperCase(), emblem, color, intro: intro.trim(), joinMode }, idem.current);
      void refreshCoins();
      toast(`${p.name} is ready 🪔`, "gold");
      pop();
      push({ kind: "parivar", id: p.id });
    } catch (e) {
      toast(errText(e), "error");
      setBusy(false);
      setConfirm(false);
      // A new attempt after an error is a new request
      idem.current = parivarApi.newKey();
    }
  };

  return (
    <div className="app-scroll h-full bg-ink pb-10">
      <ScreenHeader title="Start a Parivar" onBack={pop} />
      <div className="space-y-4 px-4">
        {cfg ? (
          <div className="rounded-3xl bg-gradient-to-br from-gold/15 to-surface p-4 ring-1 ring-gold/25">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">What it takes</p>
            <div className="mt-2 flex items-center justify-between text-[13.5px]">
              <span className="text-cream">Coins</span>
              <span className="flex items-center gap-1 font-bold text-gold">
                <Coin className="h-4 w-4" /> {cfg.requiredCoins === null ? "—" : n(cfg.requiredCoins)}
                <span className="font-medium text-muted"> (you have {n(cfg.myCoins)})</span>
              </span>
            </div>
            {cfg.requiredCharm > 0 ? (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-cream">Charm</span>
                  <span className="font-bold text-gold">
                    {n(Math.min(cfg.myCharm, cfg.requiredCharm))} / {n(cfg.requiredCharm)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-coral to-gold" style={{ width: `${Math.min(100, (cfg.myCharm / cfg.requiredCharm) * 100)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted">{cfg.consumeCharm ? "This Charm is used up when you create." : "This Charm is only checked, you keep it."}</p>
              </div>
            ) : null}
            {cfg.problems.length ? (
              <ul className="mt-3 space-y-0.5 text-[12px] text-coral">
                {cfg.problems.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="h-28 animate-pulse rounded-3xl bg-cream/[0.06]" />
        )}

        <div>
          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted" htmlFor="pv-name">
            Name
          </label>
          <input id="pv-name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gaon Ke Sher" className="mt-1.5 h-12 w-full rounded-2xl bg-surface px-4 text-[15px] text-cream placeholder:text-cream/30 ring-1 ring-line focus:outline-none focus:ring-gold/50" />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted" htmlFor="pv-sign">
            Sign (2 to 4 letters)
          </label>
          <input id="pv-sign" value={sign} maxLength={4} onChange={(e) => setSign(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())} placeholder="GKS" className="mt-1.5 h-12 w-32 rounded-2xl bg-surface px-4 text-[15px] font-bold tracking-widest text-cream placeholder:text-cream/30 ring-1 ring-line focus:outline-none focus:ring-gold/50" />
          <p className="mt-1 text-[11px] text-muted">Shown beside your members&apos; names.</p>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted" htmlFor="pv-intro">
            Introduction (optional)
          </label>
          <textarea id="pv-intro" value={intro} maxLength={300} rows={2} onChange={(e) => setIntro(e.target.value)} className="mt-1.5 w-full resize-none rounded-2xl bg-surface px-4 py-3 text-[14px] text-cream ring-1 ring-line focus:outline-none focus:ring-gold/50" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Emblem and colour</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {EMBLEMS.map((e) => (
              <button key={e} type="button" onClick={() => setEmblem(e)} aria-pressed={emblem === e} className={`grid h-11 w-11 place-items-center rounded-xl text-[22px] ring-1 ${emblem === e ? "bg-gold/20 ring-gold" : "bg-surface ring-line"}`}>
                {e}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} aria-label={`Colour ${c}`} className={`h-8 w-8 rounded-full ring-2 ${color === c ? "ring-cream" : "ring-transparent"}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label="How people join">
          {(
            [
              ["OPEN", "Anyone can join"],
              ["APPROVAL", "Join by approval"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={joinMode === k} onClick={() => setJoinMode(k)} className={`flex-1 rounded-2xl py-3 text-[13px] font-bold ring-1 ${joinMode === k ? "bg-gold/15 text-gold ring-gold/50" : "bg-surface text-cream/70 ring-line"}`}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" disabled={!valid || !cfg?.canCreate || busy} onClick={() => setConfirm(true)} className="h-12 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c] disabled:opacity-45">
          Create Parivar
        </button>
      </div>

      <BottomSheet open={confirm} onClose={() => !busy && setConfirm(false)} title="Create this Parivar?">
        <div className="px-5 pb-6 text-center">
          <p className="text-[34px]" aria-hidden>
            {emblem}
          </p>
          <p className="font-display text-[19px] font-extrabold text-cream">
            {name.trim()} <span className="text-gold">[{sign.toUpperCase()}]</span>
          </p>
          <p className="mt-3 text-[13px] text-cream/80">
            {cfg?.requiredCoins === null ? "" : `${n(cfg?.requiredCoins ?? 0)} coins will be taken from your wallet.`}
            {cfg && cfg.requiredCharm > 0 ? ` ${cfg.consumeCharm ? `${n(cfg.requiredCharm)} Charm will be used up.` : ""}` : ""}
          </p>
          <button type="button" disabled={busy} onClick={() => void create()} className="mt-4 h-12 w-full rounded-full bg-gold font-display text-[15px] font-extrabold text-ink disabled:opacity-60">
            {busy ? "Creating…" : "Yes, create it"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

/* ---------------------------- Profile ---------------------------- */

type Tab = "profile" | "members" | "news" | "manage";

export function ParivarHome({ id }: { id: string }) {
  const { pop, push, toast, refreshCoins } = useApp();
  const [p, setP] = useState<ParivarProfile | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("profile");
  const [donate, setDonate] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setP(await parivarApi.profile(id));
      setError("");
    } catch (e) {
      setError(errText(e, "Couldn't load this Parivar."));
    }
  }, [id]);
  useEffect(() => {
    void load();
    const t = window.setInterval(() => document.visibilityState === "visible" && void load(), 30_000);
    return () => window.clearInterval(t);
  }, [load]);

  const run = async (f: () => Promise<unknown>, ok?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await f();
      if (ok) toast(ok, "gold");
      await load();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!p)
    return (
      <div className="h-full bg-ink">
        <ScreenHeader title="Parivar" onBack={pop} />
        {error ? (
          <button type="button" onClick={() => void load()} className="mx-6 mt-10 block w-[calc(100%-3rem)] rounded-2xl bg-coral/10 p-4 text-center text-[13px] text-coral">
            {error} Tap to retry.
          </button>
        ) : (
          <div className="mx-auto mt-24 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold" aria-label="Loading" />
        )}
      </div>
    );

  const isMember = Boolean(p.myRole);
  const can = (perm: string) => p.myPerms.includes(perm as never);
  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "members", label: `Members ${p.memberCount}` },
    { key: "news", label: "News" },
    ...(isMember ? [{ key: "manage" as Tab, label: p.pendingApplications ? `Manage (${p.pendingApplications})` : "Manage" }] : []),
  ];
  const nextPct = p.nextLevelExp ? Math.min(100, (p.exp / p.nextLevelExp) * 100) : 100;

  return (
    <div className="app-scroll h-full bg-gradient-to-b from-[#3a1420] via-[#1c1019] to-ink pb-10">
      <ScreenHeader title="Parivar" onBack={pop} />
      <div className="flex items-center gap-3.5 px-4">
        <Emblem p={p} size={76} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[21px] font-extrabold text-cream">{p.name}</p>
          <p className="text-[12px] text-muted">
            [{p.sign}] · ID {p.code}
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <LevelBadge level={p.level} />
            <span className="text-[11.5px] text-muted">
              {n(p.memberCount)}/{n(p.capacity)} members
            </span>
          </p>
        </div>
      </div>

      <div className="mx-4 mt-3">
        <div className="flex items-center justify-between text-[11.5px] text-muted">
          <span>{n(p.exp)} EXP</span>
          <span>{p.nextLevelExp ? `${n(p.nextLevelExp)} for Lv ${p.level + 1}` : "Top level"}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/35">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-coral to-gold" initial={{ width: 0 }} animate={{ width: `${nextPct}%` }} transition={{ duration: 0.7 }} />
        </div>
      </div>

      <div className="mx-4 mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat big={p.weekRank ? `#${p.weekRank}` : "—"} label="this week" />
        <Stat big={p.totalRank ? `#${p.totalRank}` : "—"} label="overall" />
        <Stat big={n(p.weekExp)} label="week activity" />
      </div>

      {!isMember ? (
        <div className="mx-4 mt-3">
          {p.myApplication === "PENDING" ? (
            <button type="button" disabled={busy} onClick={() => void run(() => parivarApi.withdraw(p.id), "Request withdrawn")} className="h-12 w-full rounded-full bg-cream/10 text-[14px] font-bold text-cream">
              Request sent · tap to withdraw
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || p.memberCount >= p.capacity}
              onClick={() =>
                void run(async () => {
                  const r = await parivarApi.join(p.id);
                  if (!r.myRole) toast("Request sent. The Mukhiya will answer it.", "gold");
                }, p.joinMode === "OPEN" ? `You joined ${p.name} 🪔` : undefined)
              }
              className="h-12 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c] disabled:opacity-50"
            >
              {p.memberCount >= p.capacity ? "Full" : p.joinMode === "OPEN" ? "Join this Parivar" : "Apply to join"}
            </button>
          )}
        </div>
      ) : null}

      <div className="no-scrollbar mx-4 mt-4 flex gap-1 overflow-x-auto rounded-full bg-black/30 p-1 ring-1 ring-white/10" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`shrink-0 flex-1 rounded-full px-3 py-2 text-[12.5px] font-bold ${tab === t.key ? "bg-gold text-ink" : "text-cream/70"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-3">
        {tab === "profile" ? (
          <div className="space-y-3">
            <Section title="Introduction">{p.intro || <span className="text-muted">No introduction yet.</span>}</Section>
            <Section title="Announcement">{p.announcement || <span className="text-muted">No announcement.</span>}</Section>
            <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold/15">
                <Coin className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Parivar funds</span>
                <span className="font-display text-[20px] font-extrabold text-gold">{n(p.funds)}</span>
              </span>
              {isMember ? (
                <button type="button" onClick={() => setDonate(true)} className="rounded-full bg-coral/15 px-4 py-2 text-[12.5px] font-bold text-pink">
                  Donate
                </button>
              ) : null}
            </div>
            {isMember ? (
              <Section title="Activity">
                {!p.activity?.length ? (
                  <span className="text-muted">Nothing yet. Gifts between members and donations show here.</span>
                ) : (
                  <ul className="space-y-2">
                    {p.activity.map((a) => (
                      <li key={a.id} className="flex items-center gap-2.5 text-[12.5px]">
                        <Avatar name={a.who ?? "?"} url={a.whoAvatar} size={28} />
                        <span className="min-w-0 flex-1 text-cream/90">
                          <b>{a.who ?? "Someone"}</b> {a.text}
                          {a.other ? <> to <b>{a.other}</b></> : null}
                        </span>
                        {a.exp > 0 ? <span className="shrink-0 text-[11px] font-bold text-gold">+{n(a.exp)}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            ) : null}
          </div>
        ) : null}

        {tab === "members" ? (
          <ul className="space-y-1.5">
            {p.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-line">
                <Avatar name={m.name} url={m.avatarUrl} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-cream">
                    <span className="truncate">{m.name}</span>
                    {m.role === "LEADER" ? <Crown className="h-3.5 w-3.5 text-gold" aria-hidden /> : m.role !== "MEMBER" ? <Shield className="h-3.5 w-3.5 text-[#7fe8dc]" aria-hidden /> : null}
                  </span>
                  <span className="text-[11px] text-muted">
                    {ROLE_LABEL[m.role]} · {n(m.contribution)} contribution
                  </span>
                </span>
                {isMember && can("REMOVE_MEMBERS") && m.role !== "LEADER" && p.myRole !== m.role ? (
                  <button type="button" disabled={busy} onClick={() => window.confirm(`Remove ${m.name}?`) && void run(() => parivarApi.removeMember(p.id, m.userId), `${m.name} was removed`)} className="rounded-full bg-coral/15 px-3 py-1 text-[11.5px] font-bold text-coral">
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "news" ? <NewsTab p={p} canEdit={can("EDIT_ANNOUNCEMENT")} onSave={(text) => run(() => parivarApi.update(p.id, { announcement: text }), "Announcement saved")} busy={busy} /> : null}

        {tab === "manage" && isMember ? <ManageTab p={p} can={can} run={run} busy={busy} push={() => push({ kind: "parivar-list" })} /> : null}
      </div>

      <BottomSheet open={donate} onClose={() => setDonate(false)} title="Donate to the Parivar">
        <DonateForm
          funds={p.funds}
          onDonate={async (amount) => {
            await parivarApi.donate(p.id, amount);
            void refreshCoins();
            toast(`You donated ${n(amount)} coins 🪔`, "gold");
            setDonate(false);
            await load();
          }}
        />
      </BottomSheet>
    </div>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-2xl bg-black/30 py-2.5 ring-1 ring-white/10">
      <p className="font-display text-[17px] font-extrabold text-cream">{big}</p>
      <p className="text-[10.5px] text-muted">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-3.5 ring-1 ring-line">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="mt-1.5 whitespace-pre-wrap text-[13px] leading-snug text-cream/90">{children}</div>
    </div>
  );
}

function NewsTab({ p, canEdit, onSave, busy }: { p: ParivarProfile; canEdit: boolean; onSave: (t: string) => void; busy: boolean }) {
  const [text, setText] = useState(p.announcement ?? "");
  return (
    <div className="space-y-3">
      <Section title="Announcement">{p.announcement || <span className="text-muted">Nothing announced yet.</span>}</Section>
      {canEdit ? (
        <div>
          <textarea value={text} maxLength={500} rows={4} onChange={(e) => setText(e.target.value)} placeholder="Write an announcement for the whole Parivar" className="w-full resize-none rounded-2xl bg-surface px-4 py-3 text-[14px] text-cream ring-1 ring-line focus:outline-none focus:ring-gold/50" aria-label="Announcement" />
          <button type="button" disabled={busy || text === (p.announcement ?? "")} onClick={() => onSave(text)} className="mt-2 h-11 w-full rounded-full bg-gold text-[14px] font-extrabold text-ink disabled:opacity-50">
            Publish
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ManageTab({ p, can, run, busy, push }: { p: ParivarProfile; can: (perm: string) => boolean; run: (f: () => Promise<unknown>, ok?: string) => Promise<void>; busy: boolean; push: () => void }) {
  const [apps, setApps] = useState<ParivarApplication[] | null>(null);
  const reload = useCallback(() => {
    if (!can("ACCEPT_APPLICATIONS")) return;
    parivarApi
      .applications(p.id)
      .then(setApps)
      .catch(() => setApps([]));
  }, [p.id, can]);
  useEffect(() => reload(), [reload, p.pendingApplications]);
  const mine = p.members.find((m) => m.role === p.myRole);
  void mine;
  const roles: ParivarRole[] = ["DEPUTY", "ADMIN", "MEMBER"];
  const iAmLeader = p.myRole === "LEADER";

  return (
    <div className="space-y-3">
      {can("ACCEPT_APPLICATIONS") ? (
        <Section title={`Requests to join${apps ? ` (${apps.length})` : ""}`}>
          {!apps?.length ? (
            <span className="text-muted">No requests right now.</span>
          ) : (
            <ul className="space-y-2">
              {apps.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5">
                  <Avatar name={a.name} url={a.avatarUrl} size={34} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{a.name}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await parivarApi.decide(p.id, a.id, true);
                        reload();
                      }, `${a.name} joined`)
                    }
                    className="grid h-8 w-8 place-items-center rounded-full bg-[#14301f] text-speak"
                    aria-label={`Accept ${a.name}`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await parivarApi.decide(p.id, a.id, false);
                        reload();
                      })
                    }
                    className="rounded-full bg-coral/15 px-3 py-1 text-[11.5px] font-bold text-coral"
                  >
                    Reject
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      {can("EDIT_PROFILE") ? (
        <Section title="How people join">
          <div className="flex gap-2">
            {(
              [
                ["OPEN", "Anyone"],
                ["APPROVAL", "By approval"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" disabled={busy} onClick={() => void run(() => parivarApi.update(p.id, { joinMode: k }), "Saved")} className={`flex-1 rounded-xl py-2 text-[12.5px] font-bold ring-1 ${p.joinMode === k ? "bg-gold/15 text-gold ring-gold/50" : "text-cream/70 ring-line"}`}>
                {label}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {(can("APPOINT_DEPUTY") || can("APPOINT_ADMIN") || iAmLeader) && p.members.length > 1 ? (
        <Section title="Roles">
          <ul className="space-y-2">
            {p.members
              .filter((m) => m.role !== "LEADER")
              .map((m) => (
                <li key={m.userId} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">{m.name}</span>
                  <select
                    value={m.role}
                    disabled={busy}
                    onChange={(e) => void run(() => parivarApi.setRole(p.id, m.userId, e.target.value as ParivarRole), "Role changed")}
                    className="h-9 rounded-lg bg-ink px-2 text-[12.5px] text-cream ring-1 ring-line"
                    aria-label={`Role of ${m.name}`}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                    {iAmLeader ? <option value="LEADER">Make Mukhiya</option> : null}
                  </select>
                </li>
              ))}
          </ul>
        </Section>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => window.confirm(p.myRole === "LEADER" ? "Leave and close this Parivar? (Only possible when you are the last member.)" : "Leave this Parivar?") && void run(async () => { await parivarApi.leave(); push(); }, "You left the Parivar")}
        className="h-11 w-full rounded-full bg-coral/15 text-[13.5px] font-bold text-coral"
      >
        Leave Parivar
      </button>
    </div>
  );
}

function DonateForm({ funds, onDonate }: { funds: number; onDonate: (amount: number) => Promise<void> }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const presets = useMemo(() => [100, 500, 1000, 5000], []);
  const v = Math.round(Number(amount));
  return (
    <div className="px-5 pb-6">
      <p className="text-[12.5px] text-muted">The treasury now has {n(funds)} coins. Your donation is taken from your own wallet and can&apos;t be taken back.</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {presets.map((x) => (
          <button key={x} type="button" onClick={() => setAmount(String(x))} className={`rounded-xl py-2.5 text-[13px] font-bold ring-1 ${v === x ? "bg-gold/15 text-gold ring-gold/50" : "bg-surface text-cream/80 ring-line"}`}>
            {n(x)}
          </button>
        ))}
      </div>
      <input value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Or type an amount" className="mt-3 h-12 w-full rounded-2xl bg-surface px-4 text-[15px] text-cream ring-1 ring-line focus:outline-none focus:ring-gold/50" aria-label="Donation amount" />
      {error ? <p className="mt-2 text-[12px] text-coral">{error}</p> : null}
      <button
        type="button"
        disabled={busy || !(v >= 1)}
        onClick={() => {
          setBusy(true);
          setError("");
          onDonate(v).catch((e) => {
            setError(errText(e));
            setBusy(false);
          });
        }}
        className="mt-3 h-12 w-full rounded-full bg-gold font-display text-[15px] font-extrabold text-ink disabled:opacity-50"
      >
        {busy ? "Donating…" : `Donate ${v >= 1 ? n(v) : ""} coins`}
      </button>
    </div>
  );
}
