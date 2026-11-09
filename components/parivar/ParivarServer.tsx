"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check, Crown, Dices, Flame, Gift, MessageCircle, Pencil, Plus, Search, Shield, UsersRound } from "lucide-react";
import { Glyph } from "./ParivarUi";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin, ScreenHeader } from "@/components/ui/kit";
import { parivarApi, parivarExtra, type ParivarApplication, type ParivarCard, type ParivarConfig, type ParivarProfile, type ParivarRole, type RankRow, type TasksInfo, type KavachInfo, type ChestsInfo } from "@/lib/api/parivar";
import { useApp } from "@/lib/app/store";
import { FRAME_ORDER, FramedPicture, SignBadge, frameName } from "./ParivarFrames";
import { ChatSheet, CheerSheet, ChestsSheet, ChoriSheet, FeatureTiles, GachaSheet, KavachSheet, NewsTab as NewsPanel, ShopSheet, TasksTab, type SheetName } from "./ParivarExtras";

const n = (v: number) => v.toLocaleString("en-IN");
const errText = (e: unknown, fallback = "That didn't work. Try again.") => (e instanceof Error && e.message ? e.message : fallback);
const EMBLEMS = ["🪔", "🦚", "👑", "🐘", "🌺", "🏏", "🎵", "🌙", "🔥", "🪷"];
const COLORS = ["#e7bc72", "#f4515b", "#19c3b2", "#8f6bff", "#ff8a3d", "#3fa7ff", "#ff5c8a", "#6fe0a6"];
const ROLE_LABEL: Record<ParivarRole, string> = { LEADER: "Mukhiya", DEPUTY: "Up-Mukhiya", ADMIN: "Sahayak", MEMBER: "Sadasya" };

export function Emblem({ p, size = 48 }: { p: Pick<ParivarCard, "emblem" | "color" | "logoUrl"> & { frame?: string }; size?: number }) {
  const inner = p.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.logoUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <span className="grid h-full w-full place-items-center" style={{ fontSize: size * 0.52, background: `radial-gradient(circle at 30% 25%, ${p.color}aa, ${p.color}33 70%), #1c1b22` }} aria-hidden>
      {p.emblem}
    </span>
  );
  return (
    <FramedPicture frame={p.frame} size={size}>
      {inner}
    </FramedPicture>
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
        toast(`You joined ${c.name}`, "gold");
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
          <Glyph icon={UsersRound} size={72} className="mx-auto" />
          <p className="mt-2 font-display text-[22px] font-extrabold text-cream">Parivar is coming soon</p>
          <p className="mt-1 text-[13px] text-muted">Get your people ready!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader title="Parivar" onBack={pop} />
      <section className="relative mx-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-wine via-wine-2 to-ink p-4 ring-1 ring-gold/25" style={{ backgroundImage: "radial-gradient(circle at 100% 0%, rgb(231 188 114 / 0.22), transparent 55%), radial-gradient(circle at 0% 120%, rgb(244 81 91 / 0.18), transparent 50%)" }}>
        <span aria-hidden className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-40" style={{ background: "repeating-radial-gradient(circle, transparent 0 9px, rgba(240,205,130,0.22) 9px 10px)" }} />
        <p className="text-[11px] font-bold tracking-[0.18em] text-gold uppercase">परिवार · Parivar</p>
        <p className="mt-1 font-display text-[22px] leading-tight font-extrabold text-cream">Apna gaon, apne log</p>
        <p className="mt-0.5 text-[12.5px] text-cream/65">Chaupal sajao, mil kar jeeto, Gaon ka naam roshan karo.</p>
        {me?.parivarId ? (
          <button type="button" onClick={() => push({ kind: "parivar", id: me.parivarId! })} className="mt-3 flex h-11 w-full items-center justify-between rounded-full bg-cream/10 px-4 text-left ring-1 ring-gold/40">
            <span className="flex items-center gap-2 text-[13.5px] font-bold text-cream">
              <UsersRound className="h-4 w-4 text-gold" aria-hidden /> Mera Parivar
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10.5px] font-bold text-gold">{me.role ? ROLE_LABEL[me.role] : ""}</span>
            </span>
            <span className="text-[12px] font-bold text-gold">Open ›</span>
          </button>
        ) : (
          <button type="button" onClick={() => push({ kind: "parivar-create" })} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[14px] font-extrabold text-[#2a1a0c] shadow-[0_6px_18px_-6px_rgb(231_188_114/0.6)]">
            <Plus className="h-4 w-4" aria-hidden /> Create your Parivar
          </button>
        )}
      </section>

      <div className="mx-4 mt-4 flex rounded-full bg-surface p-1 ring-1 ring-line" role="tablist">
        {(
          [
            ["discover", "Discover", "khojo"],
            ["weekly", "Weekly", "is hafte"],
            ["total", "Total", "sabse bade"],
          ] as const
        ).map(([k, label, sub]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-full py-1.5 leading-tight font-bold transition ${tab === k ? "bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] text-[#2a1a0c]" : "text-cream/70"}`}>
            <span className="block text-[13px]">{label}</span>
            <span className={`block text-[9.5px] font-semibold ${tab === k ? "text-[#2a1a0c]/60" : "text-cream/35"}`}>{sub}</span>
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
              <li key={c.id} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface to-ink-2 p-3 ring-1 ring-line-strong" style={{ boxShadow: `inset 3px 0 0 ${c.color || "#e7bc72"}` }}>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => push({ kind: "parivar", id: c.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Emblem p={c} size={56} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-display text-[15.5px] font-extrabold text-cream">{c.name}</span>
                        <LevelBadge level={c.level} />
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-gold/80">
                        [{c.sign}] · ID {c.code}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-cream/10">
                          <span className="block h-full rounded-full bg-gradient-to-r from-gold to-coral" style={{ width: `${Math.min(100, Math.round((c.members / Math.max(1, c.capacity)) * 100))}%` }} />
                        </span>
                        <span className="text-[11px] text-cream/60">
                          {n(c.members)}/{n(c.capacity)} sadasya
                        </span>
                      </span>
                    </span>
                  </button>
                  {me?.parivarId ? null : c.myApplication === "PENDING" ? (
                    <span className="shrink-0 rounded-full bg-cream/10 px-3 py-1.5 text-[11.5px] font-bold text-cream/70">Requested</span>
                  ) : (
                    <button type="button" disabled={busy === c.id || c.members >= c.capacity} onClick={() => void join(c)} className="shrink-0 rounded-full bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] px-4 py-2 text-[12px] font-extrabold text-[#2a1a0c] disabled:opacity-50">
                      {c.members >= c.capacity ? "Full" : c.joinMode === "OPEN" ? "Join" : "Apply"}
                    </button>
                  )}
                </div>
                {c.intro ? <p className="mt-2 line-clamp-2 border-t border-line pt-2 text-[12px] text-cream/60">“{c.intro}”</p> : null}
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

/** Centre-crops a picture to a square JPEG so logos stay small and look the same everywhere. */
async function squareCrop(file: File, side: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = side;
  c.height = side;
  const g = c.getContext("2d");
  if (!g) throw new Error("This browser can't prepare the picture.");
  g.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, side, side);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("The picture couldn't be read."))), "image/jpeg", 0.88));
}

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
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const idem = useRef(parivarApi.newKey());

  const pickLogo = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) return toast("Use a PNG or JPG picture.", "error");
    setLogoBusy(true);
    try {
      const blob = await squareCrop(file, 512);
      const up = await parivarApi.uploadLogo(blob);
      setLogoPath(up.path);
      setLogoUrl(URL.createObjectURL(blob));
    } catch (e) {
      toast(errText(e, "The picture didn't upload. Try again."), "error");
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  useEffect(() => {
    parivarApi
      .config()
      .then(setCfg)
      .catch(() => undefined);
  }, []);

  const valid = name.trim().length >= 3 && /^[A-Za-z0-9]{2,8}$/.test(sign.trim()) && !logoBusy;
  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const p = await parivarApi.create({ name: name.trim(), sign: sign.trim().toUpperCase(), emblem, color, intro: intro.trim(), joinMode, logo: logoPath || undefined }, idem.current);
      void refreshCoins();
      toast(`${p.name} is ready`, "gold");
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
      <ScreenHeader title="Create New Parivar" onBack={pop} />
      <div className="space-y-4 px-4">
        <div className="flex items-center gap-4 rounded-3xl p-4 ring-1 ring-gold/25" style={{ backgroundImage: "radial-gradient(circle at 100% 0%, rgb(231 188 114 / 0.18), transparent 55%), linear-gradient(135deg, #3a1622, #1c1019 75%)" }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={logoBusy} className="relative grid h-[92px] w-[92px] shrink-0 place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-gold/45 bg-black/25 text-gold/80 active:scale-95" aria-label="Choose a Parivar picture">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-[10.5px] font-semibold">
                <Camera className="h-6 w-6" aria-hidden /> Add logo
              </span>
            )}
            {logoBusy ? <span className="absolute inset-0 grid place-items-center bg-black/55"><span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-gold" /></span> : null}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => void pickLogo(e.target.files?.[0])} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[19px] font-extrabold text-cream">{name.trim() || "Your Parivar"}</p>
            <div className="mt-1.5">
              <SignBadge sign={sign || "SIGN"} frame="wood" size="lg" />
            </div>
            <p className="mt-2 text-[11.5px] leading-snug text-cream/60">Members wear this sign after their name</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Frames grow as your Parivar levels up</p>
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
            {FRAME_ORDER.map((fr, i) => (
              <span key={fr} className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-surface px-2.5 py-2 ring-1 ring-line">
                <SignBadge sign={sign || "SIGN"} frame={fr} size="sm" />
                <span className="text-[10px] font-semibold text-cream/55">{frameName(fr)}</span>
                <span className="text-[9.5px] text-cream/35">Lv {i + 1}+</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[13px] font-bold text-cream" htmlFor="pv-name">
            Name
          </label>
          <input id="pv-name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gaon Ke Sher" className="mt-1.5 h-12 w-full rounded-2xl bg-surface px-4 text-[15px] text-cream ring-1 ring-line placeholder:text-cream/30 focus:ring-gold/50 focus:outline-none" />
        </div>
        <div>
          <label className="text-[13px] font-bold text-cream" htmlFor="pv-sign">
            Sign <span className="font-medium text-muted">2 to 8 letters or numbers</span>
          </label>
          <input id="pv-sign" value={sign} maxLength={8} onChange={(e) => setSign(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())} placeholder="e.g. GKSHER" className="mt-1.5 h-12 w-full rounded-2xl bg-surface px-4 text-[15px] font-bold tracking-widest text-cream ring-1 ring-line placeholder:text-cream/30 focus:ring-gold/50 focus:outline-none" />
        </div>
        <div>
          <label className="text-[13px] font-bold text-cream" htmlFor="pv-intro">
            Introduction
          </label>
          <textarea id="pv-intro" value={intro} maxLength={300} rows={3} onChange={(e) => setIntro(e.target.value)} placeholder="What is your Parivar about?" className="mt-1.5 w-full resize-none rounded-2xl bg-surface px-4 py-3 text-[14px] text-cream ring-1 ring-line placeholder:text-cream/30 focus:ring-gold/50 focus:outline-none" />
        </div>
        {!logoUrl ? (
          <div>
            <span className="text-[13px] font-bold text-cream">
              No logo yet? <span className="font-medium text-muted">Pick an emblem</span>
            </span>
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
        ) : null}
        <div>
          <p className="text-[13px] font-bold text-cream">Who can join</p>
          <div className="mt-1.5 flex rounded-2xl bg-surface p-1 ring-1 ring-line" role="radiogroup" aria-label="How people join">
            {(
              [
                ["OPEN", "Anyone"],
                ["APPROVAL", "By approval"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={joinMode === k} onClick={() => setJoinMode(k)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-bold ${joinMode === k ? "bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] text-[#2a1a0c]" : "text-cream/70"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" disabled={!valid || !cfg?.canCreate || busy} onClick={() => setConfirm(true)} className="h-12 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c] disabled:opacity-45">
          {cfg?.requiredCoins ? `Create · ${n(cfg.requiredCoins)} coins` : "Create Parivar"}
        </button>
        {cfg ? (
          <div className="text-center text-[12px] text-muted">
            You have {n(cfg.myCoins)} coins{cfg.requiredCoins ? <> — a Parivar costs {n(cfg.requiredCoins)}.</> : "."}
            {cfg.requiredCharm > 0 ? (
              <p className="mt-1">
                Charm needed: {n(Math.min(cfg.myCharm, cfg.requiredCharm))} / {n(cfg.requiredCharm)} {cfg.consumeCharm ? "(used up when you create)" : "(only checked, you keep it)"}
              </p>
            ) : null}
            {cfg.problems.length ? (
              <ul className="mt-2 space-y-0.5 text-[12px] text-coral">
                {cfg.problems.map((pr) => (
                  <li key={pr}>• {pr}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <BottomSheet open={confirm} onClose={() => !busy && setConfirm(false)} title="Create this Parivar?">
        <div className="px-5 pb-6 text-center">
          <div className="flex justify-center">
            <Emblem p={{ emblem, color, logoUrl: logoUrl || undefined, frame: "wood" }} size={64} />
          </div>
          <p className="mt-2 font-display text-[19px] font-extrabold text-cream">{name.trim()}</p>
          <div className="mt-1.5">
            <SignBadge sign={sign.toUpperCase()} frame="wood" />
          </div>
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

type Tab = "profile" | "tasks" | "members" | "news" | "manage";

export function ParivarHome({ id }: { id: string }) {
  const { pop, push, toast, refreshCoins } = useApp();
  const [p, setP] = useState<ParivarProfile | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("profile");
  const [donate, setDonate] = useState(false);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const prof = await parivarApi.profile(id);
      setP(prof);
      setError("");
      if (prof.myRole) parivarExtra.unread(id).then((u) => setUnread(u.unread)).catch(() => undefined);
    } catch (e) {
      setError(errText(e, "Couldn't load this Parivar."));
    }
  }, [id]);
  useEffect(() => {
    void load();
    const t = window.setInterval(() => document.visibilityState === "visible" && void load(), 30_000);
    return () => window.clearInterval(t);
  }, [load]);

  const [wk, setWk] = useState<TasksInfo | null>(null);
  const [kv, setKv] = useState<KavachInfo | null>(null);
  const [ch, setCh] = useState<ChestsInfo | null>(null);
  const [more, setMore] = useState(false);
  const [editAnn, setEditAnn] = useState(false);
  const member = Boolean(p?.myRole);
  const loadExtras = useCallback(() => {
    if (!member) return;
    parivarExtra.tasks(id).then(setWk).catch(() => undefined);
    parivarExtra.kavach(id).then(setKv).catch(() => undefined);
    parivarExtra.chests(id).then(setCh).catch(() => undefined);
  }, [id, member]);
  useEffect(() => {
    loadExtras();
  }, [loadExtras, p?.funds, p?.exp]);

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
    ...(isMember ? [{ key: "tasks" as Tab, label: "Tasks" }] : []),
    { key: "members", label: `Members ${p.memberCount}` },
    { key: "news", label: unread ? `News (${unread})` : "News" },
    ...(isMember ? [{ key: "manage" as Tab, label: p.pendingApplications ? `Manage (${p.pendingApplications})` : "Manage" }] : []),
  ];
  const nextPct = p.nextLevelExp ? Math.min(100, (p.exp / p.nextLevelExp) * 100) : 100;

  return (
    <div className="app-scroll h-full bg-gradient-to-b from-[#3a1420] via-[#1c1019] to-ink pb-10">
      <ScreenHeader title="Parivar" onBack={pop} />
      <section className="relative mx-4 overflow-hidden rounded-[28px] p-4 ring-1 ring-gold/25" style={{ backgroundImage: "radial-gradient(circle at 100% 0%, rgb(231 188 114 / 0.22), transparent 55%), linear-gradient(135deg, #3a1622, #1c1019 70%)" }}>
        <span aria-hidden className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full opacity-40" style={{ background: "repeating-radial-gradient(circle, transparent 0 9px, rgba(240,205,130,0.2) 9px 10px)" }} />
        <div className="flex items-center gap-4">
          <Emblem p={p} size={80} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[22px] leading-tight font-extrabold text-cream">{p.name}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2d6f9e] to-[#3fa7ff] px-2 py-0.5 text-[11px] font-extrabold text-white">
                <Shield className="h-3 w-3" aria-hidden /> {p.level}
              </span>
              <SignBadge sign={p.sign} frame={p.frame} />
            </p>
            <p className="mt-1 text-[10.5px] font-semibold text-gold/80">{frameName(p.frame)} frame</p>
            <p className="mt-1.5 text-[11.5px] text-cream/60">ID: {p.code}</p>
            <p className="mt-1 flex items-center gap-2 text-[11.5px] text-cream/70">
              <span className="inline-flex items-center gap-1">
                <UsersRound className="h-3.5 w-3.5" aria-hidden /> {n(p.memberCount)}/{n(p.capacity)}
              </span>
              <span className="rounded-full bg-gradient-to-r from-[#f6d899] to-[#e7bc72] px-2.5 py-0.5 text-[11px] font-extrabold text-[#2a1a0c]">Weekly Rank {p.weekRank ? p.weekRank : "—"}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="mx-4 mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-[16px] font-extrabold text-cream">
            <span className="h-4 w-1 rounded-full bg-gold" aria-hidden /> Activeness
          </p>
          <span className="text-[12.5px] font-bold text-gold">
            <Flame className="mr-0.5 -mt-0.5 inline h-3.5 w-3.5" aria-hidden /> {n(p.exp)}
            {p.nextLevelExp ? `/${n(p.nextLevelExp)}` : ""}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/5">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-coral to-gold" initial={{ width: 0 }} animate={{ width: `${nextPct}%` }} transition={{ duration: 0.7 }} />
        </div>
        <p className="mt-1.5 text-[11.5px] text-cream/55">{p.nextLevelExp ? `Next level Lv.${p.level + 1}: ${n(p.nextLevelExp)} activeness` : "Your Parivar is at the top level 🏆"}</p>
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
                }, p.joinMode === "OPEN" ? `You joined ${p.name}` : undefined)
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
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`shrink-0 flex-1 whitespace-nowrap rounded-full px-3 py-2 text-[12.5px] font-bold ${tab === t.key ? "bg-gold text-ink" : "text-cream/70"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-3">
        {tab === "profile" ? (
          <div className="space-y-4">
            {isMember ? <WeeklyActiveness p={p} info={wk} onChanged={() => { loadExtras(); void load(); }} /> : null}

            <div>
              <SectionTitle>Treasury</SectionTitle>
              <div className="mt-2 flex items-center gap-2 rounded-3xl bg-gradient-to-br from-surface to-ink-2 p-3 ring-1 ring-line-strong">
                <button type="button" onClick={() => isMember && setSheet("chests")} className="relative grid h-[76px] w-[76px] shrink-0 place-items-center rounded-2xl bg-gold/10 ring-1 ring-gold/30" aria-label="Chests">
                  <Gift className="h-9 w-9 text-gold" strokeWidth={1.5} aria-hidden />
                  {ch && ch.sent.filter((c) => c.status === "OPEN").length ? <span className="absolute -top-1.5 -right-1.5 rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-extrabold text-white">×{ch.sent.filter((c) => c.status === "OPEN").length}</span> : null}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[12px] font-bold text-cream/80">
                    <Shield className={`h-3.5 w-3.5 ${kv?.active ? "text-speak" : "text-muted"}`} aria-hidden />
                    Kavach: {kv?.active ? `${kv.active.name} · ${kv.active.strength}` : "0"}
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 font-display text-[22px] font-extrabold text-gold">
                    <Coin className="h-5 w-5" /> {n(p.funds)}
                  </p>
                  <p className="text-[11px] text-cream/50">{ch && ch.sent.some((c) => c.status === "OPEN") ? "Open chests are waiting, tap the box" : "Chests handed out for now"}</p>
                </div>
                {isMember ? (
                  <button type="button" onClick={() => setDonate(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] text-[#2a1a0c]" aria-label="Donate">
                    <Plus className="h-5 w-5" aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <SectionTitle>Announcement</SectionTitle>
                {isMember && can("EDIT_ANNOUNCEMENT") ? (
                  <button type="button" onClick={() => setEditAnn((v) => !v)} className="grid h-8 w-8 place-items-center rounded-full text-gold" aria-label="Edit announcement">
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}
              </div>
              {editAnn ? (
                <AnnouncementEditor p={p} busy={busy} onSave={(text) => run(() => parivarApi.update(p.id, { announcement: text }), "Announcement saved").then(() => setEditAnn(false))} />
              ) : (
                <p className="mt-2 text-[13px] leading-snug whitespace-pre-wrap text-cream/75">{p.announcement || (can("EDIT_ANNOUNCEMENT") ? "Write something for your members." : "No announcement yet.")}</p>
              )}
            </div>

            <div>
              <SectionTitle>Introduction</SectionTitle>
              <p className="mt-2 text-[13px] leading-snug whitespace-pre-wrap text-cream/75">{p.intro || "No introduction yet."}</p>
            </div>

            {isMember ? (
              <div>
                <SectionTitle>Activity</SectionTitle>
                <div className="mt-2">
                  {!p.activity?.length ? (
                    <span className="text-[12.5px] text-muted">Nothing yet. Gifts between members and donations show here.</span>
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
                </div>
              </div>
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

        {tab === "news" ? isMember ? <NewsPanel p={p} onChanged={() => void load()} /> : <Section title="Announcement">{p.announcement || <span className="text-muted">No announcement.</span>}</Section> : null}
        {tab === "tasks" && isMember ? <TasksTab p={p} onChanged={() => void load()} /> : null}

        {tab === "manage" && isMember ? <ManageTab p={p} can={can} run={run} busy={busy} push={() => push({ kind: "parivar-list" })} /> : null}
      </div>

      {isMember ? (
        <div className="sticky bottom-0 z-10 mt-6 flex items-end justify-between bg-gradient-to-t from-ink via-ink/95 to-transparent px-6 pt-6 pb-3">
          <button type="button" onClick={() => setSheet("chat")} className="relative grid h-11 w-11 place-items-center rounded-full bg-surface ring-1 ring-line-strong" aria-label="Family chat">
            <MessageCircle className="h-5 w-5 text-cream" aria-hidden />
            {unread ? <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-coral" /> : null}
          </button>
          <button type="button" onClick={() => setSheet("gacha")} className="-mb-1 flex flex-col items-center" aria-label="Gacha">
            <span className="grid h-[62px] w-[62px] place-items-center rounded-full bg-gradient-to-b from-[#f6d899] to-[#b9803a] text-[#2a1a0c] shadow-[0_10px_26px_-6px_rgb(231_188_114/0.7)] ring-4 ring-ink"><Dices className="h-7 w-7" strokeWidth={1.8} /></span>
            <span className="-mt-2 rounded-full bg-coral px-2.5 py-0.5 text-[10.5px] font-extrabold text-white">Gacha</span>
          </button>
          <button type="button" onClick={() => setMore(true)} className="grid h-11 w-11 place-items-center rounded-full bg-surface ring-1 ring-line-strong" aria-label="More">
            <Plus className="h-5 w-5 text-cream" aria-hidden />
          </button>
        </div>
      ) : null}

      {isMember ? (
        <>
          <CheerSheet p={p} open={sheet === "cheer"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <GachaSheet p={p} open={sheet === "gacha"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <ChestsSheet p={p} open={sheet === "chests"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <ShopSheet p={p} open={sheet === "shop"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <KavachSheet p={p} open={sheet === "kavach"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <ChoriSheet p={p} open={sheet === "chori"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <ChatSheet p={p} open={sheet === "chat"} onClose={() => setSheet(null)} />
        </>
      ) : null}

      <BottomSheet open={more} onClose={() => setMore(false)} title="Parivar">
        <div className="px-5 pb-6" onClick={() => setMore(false)}>
          <FeatureTiles p={p} onOpen={(k) => setSheet(k)} />
        </div>
      </BottomSheet>

      <BottomSheet open={donate} onClose={() => setDonate(false)} title="Donate to the Parivar">
        <DonateForm
          funds={p.funds}
          onDonate={async (amount) => {
            await parivarApi.donate(p.id, amount);
            void refreshCoins();
            toast(`You donated ${n(amount)} coins`, "gold");
            setDonate(false);
            await load();
          }}
        />
      </BottomSheet>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-display text-[16px] font-extrabold text-cream">
      <span className="h-4 w-1 rounded-full bg-gold" aria-hidden /> {children}
    </p>
  );
}

function WeeklyActiveness({ p, info, onChanged }: { p: ParivarProfile; info: TasksInfo | null; onChanged: () => void }) {
  const { toast } = useApp();
  const steps = (info?.tasks ?? []).filter((t) => t.period === "WEEKLY").sort((a, b) => a.target - b.target);
  const short = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}K` : String(v));
  return (
    <div className="flex items-stretch gap-2 rounded-3xl bg-gradient-to-br from-surface to-ink-2 p-3 ring-1 ring-line-strong">
      <div className="flex w-[104px] shrink-0 flex-col justify-center rounded-2xl bg-black/30 px-2.5 py-2">
        <p className="text-[11px] font-bold text-cream/70">Weekly Activeness</p>
        <p className="font-display text-[24px] leading-tight font-extrabold text-gold">{short(info?.weekExp ?? p.weekExp)}</p>
        <p className="text-[9.5px] text-cream/45">Refresh on Mon 00:00</p>
      </div>
      <div className="flex min-w-0 flex-1 items-start justify-around">
        {steps.length ? (
          steps.slice(0, 4).map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!t.claimable}
              onClick={() =>
                parivarExtra
                  .claimTask(p.id, t.id)
                  .then(() => {
                    toast("Reward collected", "gold");
                    onChanged();
                  })
                  .catch((e) => toast(errText(e), "error"))
              }
              className="relative flex flex-col items-center gap-1"
              aria-label={t.title}
            >
              <Glyph icon={Gift} size={44} tone={t.claimable ? "light" : "gold"} className={t.claimable ? "animate-pulse" : t.claimed ? "" : "opacity-50"} />
              {t.claimed ? (
                <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-speak text-ink">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              ) : null}
              <span className={`text-[11px] font-extrabold ${t.claimed || t.claimable ? "text-gold" : "text-cream/45"}`}>{short(t.target)}</span>
            </button>
          ))
        ) : (
          <p className="self-center px-2 text-[11.5px] text-cream/50">Weekly rewards appear here when the admin adds them.</p>
        )}
      </div>
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

      {can("EDIT_ANNOUNCEMENT") ? <AnnouncementEditor p={p} busy={busy} onSave={(text) => run(() => parivarApi.update(p.id, { announcement: text }), "Announcement saved")} /> : null}

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

function AnnouncementEditor({ p, busy, onSave }: { p: ParivarProfile; busy: boolean; onSave: (t: string) => void }) {
  const [text, setText] = useState(p.announcement ?? "");
  return (
    <Section title="Announcement (shown on the profile)">
      <textarea value={text} maxLength={500} rows={3} onChange={(e) => setText(e.target.value)} className="w-full resize-none rounded-xl bg-ink px-3 py-2 text-[14px] text-cream ring-1 ring-line focus:outline-none" aria-label="Announcement" />
      <button type="button" disabled={busy || text === (p.announcement ?? "")} onClick={() => onSave(text)} className="mt-2 h-10 w-full rounded-full bg-gold text-[13.5px] font-extrabold text-ink disabled:opacity-50">
        Save
      </button>
    </Section>
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
