"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check, ChevronLeft, Coins, Crown, Dices, Ellipsis, Flame, Gift, MessageCircle, Pencil, Plus, Quote, RefreshCw, Search, Shield, Sparkles, Trophy, UsersRound } from "lucide-react";
import { Glyph } from "./ParivarUi";
import { ParivarGiftSheet } from "./ParivarGift";
import { useServerRooms } from "@/lib/app/server-rooms";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin, ScreenHeader } from "@/components/ui/kit";
import { parivarApi, parivarExtra, type ParivarApplication, type ParivarCard, type ParivarConfig, type ParivarProfile, type ParivarRole, type RankRow, type TasksInfo, type KavachInfo, type ChestsInfo } from "@/lib/api/parivar";
import { useApp } from "@/lib/app/store";
import { FRAME_ORDER, FramedPicture, SignBadge, frameName } from "./ParivarFrames";
import { ChatSheet, CheerSheet, ChestsSheet, ChoriSheet, FeatureTiles, GachaSheet, KavachSheet, NewsTab as NewsPanel, ShopSheet, TasksTab, type SheetName } from "./ParivarExtras";

const n = (v: number) => v.toLocaleString("en-IN");
const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
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
    <img src={url} alt="" className="shrink-0 rounded-full object-cover ring-1 ring-gold/35" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5a2a3a] to-[#2a1520] font-bold text-gold ring-1 ring-gold/35" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ---------------------------- Discover and ranking ---------------------------- */

export function ParivarListScreen() {
  const { pop, push, toast } = useApp();
  const [view, setView] = useState<"list" | "weekly" | "total">("list");
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<ParivarCard[] | null>(null);
  const [me, setMe] = useState<{ parivarId: string | null; role: ParivarRole | null; appliedTo: string | null; enabled: boolean } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    parivarApi
      .mine()
      .then(setMe)
      .catch(() => undefined);
  }, [tick]);
  useEffect(() => {
    if (view !== "list") return;
    let live = true;
    const t = window.setTimeout(() => {
      parivarApi
        .list(q.trim(), "popular")
        .then((r) => live && setCards(r.content))
        .catch(() => live && setCards([]));
    }, q ? 250 : 0);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [view, q, tick]);

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

  const mine = me?.parivarId ?? null;
  const actions: { key: string; label: string; icon: typeof Trophy; on: boolean; run: () => void }[] = [
    { key: "rank", label: "Rankings", icon: Trophy, on: view !== "list", run: () => setView((v) => (v === "list" ? "weekly" : "list")) },
    { key: "search", label: "Search", icon: Search, on: searching, run: () => { setView("list"); setSearching((v) => !v); } },
    { key: "create", label: "Create", icon: Plus, on: false, run: () => (mine ? toast("You are already in a Parivar.", "error") : push({ kind: "parivar-create" })) },
    { key: "mine", label: "My Parivar", icon: UsersRound, on: false, run: () => (mine ? push({ kind: "parivar-chat", id: mine }) : toast("Join a Parivar first.", "error")) },
  ];

  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader title="Parivar" onBack={pop} />
      <div className="mx-4 grid grid-cols-4 gap-2.5 pb-4">
        {actions.map((a) => (
          <button key={a.key} type="button" onClick={a.run} className="flex flex-col items-center gap-2 transition active:scale-95">
            <span className={`relative grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-[20px] ring-1 ${a.on ? "bg-gradient-to-br from-[#f6d899] to-[#d9a84f] text-[#2a1a0c] shadow-[0_10px_24px_-8px_rgb(231_188_114/0.75)] ring-gold/60" : "bg-gradient-to-b from-white/[0.11] to-white/[0.03] text-gold ring-white/12"}`}>
              <span aria-hidden className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              <a.icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-[11.5px] font-bold tracking-wide text-cream/85">{a.label}</span>
          </button>
        ))}
      </div>
      {searching && view === "list" ? (
        <div className="mx-4 mb-2 flex h-11 items-center gap-2 rounded-full bg-white/[0.08] px-4">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, sign or Parivar ID" className="min-w-0 flex-1 bg-transparent text-[14px] text-cream placeholder:text-cream/35 focus:outline-none" aria-label="Search Parivars" />
        </div>
      ) : null}

      {view !== "list" ? (
        <>
          <div className="mx-4 mb-1 flex rounded-full bg-white/[0.07] p-1" role="tablist">
            {(["weekly", "total"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`flex-1 rounded-full py-1.5 text-[13px] font-bold ${view === k ? "bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] text-[#2a1a0c]" : "text-cream/70"}`}>
                {k === "weekly" ? "This week" : "All time"}
              </button>
            ))}
          </div>
          <RankingView period={view} />
        </>
      ) : (
        <>
          <div className="mx-4 mb-2 flex items-end justify-between">
            <p className="font-display text-[17px] font-extrabold text-cream">{q ? "Results" : "Popular Parivars"}</p>
            {cards ? <p className="text-[11.5px] font-semibold text-cream/45">{n(cards.length)} found</p> : null}
          </div>
          <ul className="space-y-2.5 px-4">
            {cards === null ? [0, 1, 2].map((i) => <li key={i} className="h-[104px] animate-pulse rounded-[24px] bg-white/[0.05]" />) : null}
            {cards && !cards.length ? <li className="py-12 text-center text-[13px] text-muted">{q ? "No Parivar matches." : "No Parivars yet. Be the first to start one."}</li> : null}
            {(cards ?? []).map((c, i) => {
              const mineCard = c.id === mine;
              const pct = Math.min(100, Math.round((c.members / Math.max(1, c.capacity)) * 100));
              return (
                <motion.li key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04, type: "spring", stiffness: 260, damping: 26 }}>
                  <button type="button" onClick={() => push(mineCard ? { kind: "parivar-chat", id: c.id } : { kind: "parivar", id: c.id })} className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[24px] bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-3 pr-3.5 text-left ring-1 transition active:scale-[0.985] ${mineCard ? "ring-gold/55" : "ring-white/10"}`}>
                    <span aria-hidden className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-25 blur-2xl" style={{ background: c.color || "#e7bc72" }} />
                    <span className="relative shrink-0">
                      <Emblem p={c} size={60} />
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-display text-[17px] font-extrabold text-cream">{c.name}</span>
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-gradient-to-r from-[#2d6f9e] to-[#3fa7ff] px-1.5 py-0.5 text-[10.5px] font-extrabold text-white">
                          <Shield className="h-3 w-3" aria-hidden /> {c.level}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <SignBadge sign={c.sign} frame={c.frame} size="sm" />
                        {c.leader ? (
                          <span className="flex min-w-0 items-center gap-1 text-[12px] text-cream/60">
                            <Crown className="h-3 w-3 shrink-0 text-gold" aria-hidden />
                            <span className="truncate">{c.leader}</span>
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block truncate text-[12px] text-cream/40">{c.intro || "No introduction yet."}</span>
                    </span>
                    <span className="relative flex shrink-0 flex-col items-end gap-1.5 self-stretch justify-between py-0.5">
                      {mineCard ? <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-gold">MINE</span> : <span />}
                      <span className="flex flex-col items-end">
                        <span className="flex items-center gap-1 text-[12.5px] font-bold text-cream/80">
                          <UsersRound className="h-3.5 w-3.5 text-gold" aria-hidden /> {n(c.members)}/{n(c.capacity)}
                        </span>
                        <span className="mt-1 h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full bg-gradient-to-r from-gold to-coral" style={{ width: `${pct}%` }} />
                        </span>
                      </span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
          {!mine && cards ? (
            <div className="mx-4 mt-4 flex items-center gap-3 rounded-[24px] bg-gradient-to-r from-[#3a1622] to-[#1c1019] p-4 ring-1 ring-gold/25">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30">
                <Plus className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15px] font-extrabold text-cream">Start your own Parivar</span>
                <span className="text-[12px] text-cream/55">Pick a name, logo and sign. Your people join you.</span>
              </span>
              <button type="button" onClick={() => push({ kind: "parivar-create" })} className="shrink-0 rounded-full bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] px-4 py-2 text-[12.5px] font-extrabold text-[#2a1a0c]">
                Create
              </button>
            </div>
          ) : null}
          <button type="button" onClick={() => { setCards(null); setTick((t) => t + 1); }} className="mx-auto mt-5 flex items-center gap-2 rounded-full px-5 py-2 text-[14px] font-bold text-gold active:bg-white/10">
            <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
          </button>
        </>
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
  const [menu, setMenu] = useState(false);
  const [giftTo, setGiftTo] = useState<string | undefined>();
  const [giftOver, setGiftOver] = useState(false);
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
  if (!isMember) return <ParivarPreview p={p} busy={busy} run={run} toast={toast} onBack={pop} />;
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
      <header className="pt-safe relative z-20 flex h-14 items-center px-2">
        <button type="button" onClick={pop} className="grid h-10 w-10 place-items-center rounded-full text-cream active:bg-white/10" aria-label="Back">
          <ChevronLeft className="h-6 w-6" aria-hidden />
        </button>
        <h1 className="flex-1 text-center font-display text-[18px] font-extrabold text-cream">Parivar</h1>
        <button type="button" onClick={() => push({ kind: "parivar-list" })} className="grid h-10 w-10 place-items-center rounded-full text-cream active:bg-white/10" aria-label="Rankings">
          <Trophy className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" onClick={() => setMenu((v) => !v)} className="grid h-10 w-10 place-items-center rounded-full text-cream active:bg-white/10" aria-label="More" aria-expanded={menu}>
          <Ellipsis className="h-5 w-5" aria-hidden />
        </button>
        {menu ? (
          <div className="absolute top-[calc(env(safe-area-inset-top)+52px)] right-3 z-30 w-52 overflow-hidden rounded-2xl bg-[#241018] py-1 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] ring-1 ring-gold/25">
            <button type="button" onClick={() => { setMenu(false); push({ kind: "parivar-chat", id: p.id }); }} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13.5px] font-semibold text-cream active:bg-white/10">
              <MessageCircle className="h-4 w-4 text-gold" aria-hidden /> Parivar chat
            </button>
            <button type="button" onClick={() => { setMenu(false); push({ kind: "parivar-list" }); }} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13.5px] font-semibold text-cream active:bg-white/10">
              <Trophy className="h-4 w-4 text-gold" aria-hidden /> Rankings
            </button>
            {p.myRole !== "LEADER" ? (
              <button type="button" onClick={() => { setMenu(false); if (window.confirm(`Leave ${p.name}?`)) void run(async () => { await parivarApi.leave(); pop(); }, "You left the Parivar"); }} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13.5px] font-semibold text-coral active:bg-white/10">
                Leave Parivar
              </button>
            ) : null}
          </div>
        ) : null}
      </header>
      <section className="mx-4 flex items-center gap-4 pt-1 pb-1">
        <Emblem p={p} size={78} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="truncate font-display text-[22px] leading-tight font-extrabold text-cream">{p.name}</span>
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-gradient-to-r from-[#2d6f9e] to-[#3fa7ff] px-1.5 py-0.5 text-[11px] font-extrabold text-white">
              <Shield className="h-3 w-3" aria-hidden /> {p.level}
            </span>
          </p>
          <p className="mt-1">
            <SignBadge sign={p.sign} frame={p.frame} />
          </p>
          <p className="mt-1.5 flex items-center gap-3 text-[12px] text-cream/60">
            <span>ID: {p.code}</span>
            <span className="inline-flex items-center gap-1">
              <UsersRound className="h-3.5 w-3.5" aria-hidden /> {n(p.memberCount)}/{n(p.capacity)}
            </span>
            {p.weekRank ? <span className="rounded-full bg-gradient-to-r from-[#f6d899] to-[#e7bc72] px-2 py-0.5 text-[10.5px] font-extrabold text-[#2a1a0c]">Weekly Rank {p.weekRank}</span> : null}
          </p>
        </div>
      </section>

      <div className="mx-4 mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-[16px] font-extrabold text-cream">
            <span className="h-4 w-1 rounded-full bg-gold" aria-hidden /> Activeness
          </p>
          <span className="flex items-center gap-2">
            <span className="text-[12.5px] font-bold text-gold">
              <Flame className="mr-0.5 -mt-0.5 inline h-3.5 w-3.5" aria-hidden /> {n(p.exp)}
              {p.nextLevelExp ? `/${n(p.nextLevelExp)}` : ""}
            </span>
            <button type="button" onClick={() => setSheet("cheer")} className="rounded-full bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] px-3.5 py-1 text-[12px] font-extrabold text-[#2a1a0c]">
              Cheer
            </button>
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

      <div className="no-scrollbar mx-2 mt-4 flex overflow-x-auto border-b border-white/10 px-2" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`relative shrink-0 flex-1 whitespace-nowrap px-3 pt-2 pb-3 text-[14px] font-bold ${tab === t.key ? "text-cream" : "text-cream/50"}`}>
            {t.label}
            {tab === t.key ? <motion.span layoutId="pv-tab" className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-gold" /> : null}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mx-4 mt-3">
        {tab === "profile" ? (
          <div className="space-y-4">
            {isMember ? <WeeklyActiveness p={p} info={wk} onChanged={() => { loadExtras(); void load(); }} /> : null}

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-2 font-display text-[16px] font-extrabold text-cream">
                  <span className="h-4 w-1 shrink-0 rounded-full bg-gold" aria-hidden /> Treasury
                  <span className="flex min-w-0 items-center gap-1 truncate text-[12px] font-semibold text-cream/55">
                    <Shield className={`h-4 w-4 shrink-0 ${kv?.active ? "text-speak" : "text-cream/40"}`} aria-hidden />
                    Kavach: {kv?.active ? `${kv.active.name} · ${kv.active.strength}` : "0"}
                  </span>
                </p>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] py-1 pr-1 pl-3 ring-1 ring-white/10">
                  <Coin className="h-4 w-4" />
                  <span className="text-[13.5px] font-extrabold text-gold">{n(p.funds)}</span>
                  {isMember ? (
                    <button type="button" onClick={() => setDonate(true)} className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-b from-[#f2cf8c] to-[#d9a84f] text-[#2a1a0c]" aria-label="Donate">
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </span>
              </div>
              <div className="mt-3 flex items-stretch gap-3 rounded-3xl bg-white/[0.05] p-3 ring-1 ring-white/10">
                <button type="button" onClick={() => isMember && setSheet("chests")} className="relative flex w-[84px] shrink-0 flex-col items-center gap-1" aria-label="Chests">
                  <span className="grid h-[58px] w-[58px] place-items-center rounded-2xl bg-gold/10 ring-1 ring-gold/30">
                    <Gift className="h-8 w-8 text-gold" strokeWidth={1.5} aria-hidden />
                  </span>
                  <span className="text-[12px] text-cream/55">{ch && ch.sent.some((c) => c.status === "OPEN") ? "Open" : "To Unlock"}</span>
                  {ch && ch.sent.filter((c) => c.status === "OPEN").length ? <span className="absolute top-0 right-1 rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-extrabold text-white">×{ch.sent.filter((c) => c.status === "OPEN").length}</span> : null}
                </button>
                <span aria-hidden className="w-px bg-white/10" />
                <p className="grid flex-1 place-items-center text-center text-[14px] text-cream/50">{ch && ch.sent.some((c) => c.status === "OPEN") ? "Open chests are waiting. Tap the box." : "No chest"}</p>
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
              <div className="relative mt-2.5 overflow-hidden rounded-3xl bg-white/[0.045] p-4 ring-1 ring-white/10 backdrop-blur-sm">
                <Quote className="absolute top-3 right-3 h-8 w-8 text-gold/15" aria-hidden />
                <p className="relative text-[13.5px] leading-relaxed whitespace-pre-wrap text-cream/85">{p.intro || "This Parivar hasn't written an introduction yet."}</p>
                <div className="relative mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-[11.5px] text-cream/50">
                  {(() => {
                    const lead = p.members.find((m) => m.role === "LEADER");
                    return lead ? (
                      <>
                        <Avatar name={lead.name} url={lead.avatarUrl} size={22} />
                        <span>
                          Led by <b className="text-cream/80">{lead.name}</b>
                        </span>
                      </>
                    ) : null;
                  })()}
                  <span className="ml-auto">Since {new Date(p.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </div>

            {isMember ? (
              <div>
                <SectionTitle>Activity</SectionTitle>
                <div className="mt-2.5 overflow-hidden rounded-3xl bg-white/[0.045] ring-1 ring-white/10 backdrop-blur-sm">
                  {!p.activity?.length ? (
                    <p className="px-4 py-6 text-center text-[12.5px] text-cream/50">Nothing yet. Gifts between members and donations show here.</p>
                  ) : (
                    <ul className="divide-y divide-white/[0.06]">
                      {p.activity.map((a, i) => {
                        const kind = `${a.kind} ${a.text}`.toLowerCase();
                        const Icon = kind.includes("gacha") ? Dices : kind.includes("donat") ? Coins : kind.includes("creat") ? Crown : kind.includes("kavach") || kind.includes("shield") ? Shield : kind.includes("gift") ? Gift : Sparkles;
                        return (
                          <motion.li key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="flex items-center gap-3 px-3.5 py-3">
                            <span className="relative shrink-0">
                              <Avatar name={a.who ?? "?"} url={a.whoAvatar} size={40} />
                              <span className="absolute -right-1 -bottom-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-gradient-to-b from-[#f2d595] to-[#b9803a] text-[#2a1a0c] ring-2 ring-[#1a1018]">
                                <Icon className="h-2.5 w-2.5" strokeWidth={2.4} aria-hidden />
                              </span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] leading-snug text-cream/90">
                                <b className="font-bold text-cream">{a.who ?? "Someone"}</b> {a.text}
                                {a.other ? (
                                  <>
                                    {" "}
                                    to <b className="font-bold text-cream">{a.other}</b>
                                  </>
                                ) : null}
                              </span>
                              <span className="text-[11px] text-cream/40">{ago(a.at)}</span>
                            </span>
                            {a.exp > 0 ? <span className="shrink-0 rounded-full bg-gold/12 px-2.5 py-1 text-[11px] font-extrabold text-gold ring-1 ring-gold/25">+{n(a.exp)}</span> : null}
                          </motion.li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "members" ? <MembersPanel p={p} can={can} busy={busy} run={run} onGift={(uid) => { setGiftTo(uid); setSheet("gift"); }} /> : null}

        {tab === "news" ? isMember ? <NewsPanel p={p} onChanged={() => void load()} /> : <Section title="Announcement">{p.announcement || <span className="text-muted">No announcement.</span>}</Section> : null}
        {tab === "tasks" && isMember ? <TasksTab p={p} onChanged={() => void load()} onGo={(m) => (m === "CHEERS" ? setSheet("cheer") : m === "GIFT_EXP" ? (setGiftTo(undefined), setSheet("gift")) : m === "DONATED_COINS" ? setDonate(true) : undefined)} /> : null}

        {tab === "manage" && isMember ? <ManageTab p={p} can={can} run={run} busy={busy} push={() => push({ kind: "parivar-list" })} /> : null}
      </motion.div>

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
          <ParivarGiftSheet p={p} open={sheet === "gift" || giftOver} onClose={() => { setSheet((s) => (s === "gift" ? null : s)); setGiftOver(false); }} toId={giftTo} onSent={() => void load()} />
          <CheerSheet p={p} open={sheet === "cheer"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <GachaSheet p={p} open={sheet === "gacha"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <ChestsSheet p={p} open={sheet === "chests"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <ShopSheet p={p} open={sheet === "shop"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <KavachSheet p={p} open={sheet === "kavach"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <ChoriSheet p={p} open={sheet === "chori"} onClose={() => setSheet(null)} onChanged={() => void load()} />
          <ChatSheet p={p} open={sheet === "chat"} onClose={() => setSheet(null)} onGift={(to) => { setGiftTo(to); setGiftOver(true); }} />
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


/* ---------------------- Members, preview and chat screens ---------------------- */

const ROLE_PILL: Record<ParivarRole, string> = {
  LEADER: "from-[#ff6b8a] to-[#ff8fa8]",
  DEPUTY: "from-[#3a8dff] to-[#5fb7ff]",
  ADMIN: "from-[#2fbf86] to-[#58d6a2]",
  MEMBER: "",
};
const ROW_TINT = ["bg-[#f6d899]/[0.13]", "bg-[#5fb7ff]/[0.10]", "bg-[#ff8fa8]/[0.10]"];

function RolePill({ role }: { role: ParivarRole }) {
  if (role === "MEMBER") return null;
  return <span className={`mt-1 inline-block rounded-md bg-gradient-to-r px-2.5 py-0.5 text-[11px] font-bold text-white ${ROLE_PILL[role]}`}>{ROLE_LABEL[role]}</span>;
}

function MembersPanel({ p, can, busy, run, onGift }: { p: ParivarProfile; can: (perm: string) => boolean; busy: boolean; run: (f: () => Promise<unknown>, ok?: string) => Promise<void>; onGift: (userId: string) => void }) {
  const [q, setQ] = useState("");
  const { myId } = useServerRooms();
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...p.members].filter((m) => !needle || m.name.toLowerCase().includes(needle)).sort((a, b) => b.contribution - a.contribution);
  }, [p.members, q]);
  return (
    <div className="-mx-4">
      <div className="mx-4 flex items-center gap-3">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/[0.08] px-4">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] text-cream placeholder:text-cream/35 focus:outline-none" aria-label="Search members" />
        </div>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-gold">
          <UsersRound className="h-5 w-5" aria-hidden /> {n(p.memberCount)}/{n(p.capacity)}
        </span>
      </div>
      <p className="mx-4 mt-3 flex justify-between text-[12px] font-semibold text-cream/45">
        <span>Gold donation</span>
        <span>Total</span>
      </p>
      <ul className="mt-1">
        {rows.map((m, i) => (
          <li key={m.userId} className={`flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 ${q ? "" : (ROW_TINT[i] ?? "")}`}>
            <Avatar name={m.name} url={m.avatarUrl} size={46} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[15px] font-bold text-cream">
                <span className="truncate">{m.name}</span>
                {m.role === "LEADER" ? <Crown className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden /> : null}
              </span>
              <RolePill role={m.role} />
            </span>
            <span className="text-[14px] font-semibold text-cream/70">{n(m.contribution)}</span>
            {m.userId !== myId ? (
              <button type="button" onClick={() => onGift(m.userId)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/30" aria-label={`Send ${m.name} a gift`}>
                <Gift className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            {can("REMOVE_MEMBERS") && m.role !== "LEADER" && p.myRole !== m.role ? (
              <button type="button" disabled={busy} onClick={() => window.confirm(`Remove ${m.name}?`) && void run(() => parivarApi.removeMember(p.id, m.userId), `${m.name} was removed`)} className="rounded-full bg-coral/15 px-3 py-1 text-[11.5px] font-bold text-coral">
                Remove
              </button>
            ) : null}
          </li>
        ))}
        {!rows.length ? <li className="py-10 text-center text-[13px] text-muted">No member matches.</li> : null}
      </ul>
    </div>
  );
}

/** What anyone sees before joining: banner, major members, introduction, requirements and Apply. */
function ParivarPreview({ p, busy, run, toast, onBack }: { p: ParivarProfile; busy: boolean; run: (f: () => Promise<unknown>, ok?: string) => Promise<void>; toast: ReturnType<typeof useApp>["toast"]; onBack: () => void }) {
  const order: ParivarRole[] = ["LEADER", "DEPUTY", "ADMIN"];
  const majors = p.members.filter((m) => m.role !== "MEMBER").sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role)).slice(0, 4);
  const full = p.memberCount >= p.capacity;
  return (
    <div className="relative h-full bg-ink">
      <div className="app-scroll h-full pb-32">
        <div className="relative h-[190px] overflow-hidden" style={{ background: `linear-gradient(160deg, ${p.color || "#5a2a3a"}, #14090f)` }}>
          {p.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.logoUrl} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-55 blur-xl" />
          ) : (
            <span aria-hidden className="absolute inset-0 grid place-items-center text-[120px] opacity-20">
              {p.emblem}
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-ink" />
          <button type="button" onClick={onBack} className="pt-safe absolute top-2 left-2 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-cream backdrop-blur" aria-label="Back">
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
        </div>
        <div className="-mt-12 flex items-end gap-3 px-4">
          <Emblem p={p} size={84} />
          <div className="min-w-0 flex-1 pb-1">
            <p className="flex items-center gap-2">
              <span className="truncate font-display text-[20px] leading-tight font-extrabold text-cream">{p.name}</span>
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-gradient-to-r from-[#2d6f9e] to-[#3fa7ff] px-1.5 py-0.5 text-[11px] font-extrabold text-white">
                <Shield className="h-3 w-3" aria-hidden /> {p.level}
              </span>
              <SignBadge sign={p.sign} frame={p.frame} size="sm" />
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 px-4">
          <div>
            <p className="text-[13px] text-cream/55">ID: {p.code}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] text-cream/70">
              <Flame className="h-4 w-4 text-gold" aria-hidden /> Activeness: {n(p.exp)}
            </p>
          </div>
          {p.weekRank ? <span className="rounded-full bg-gradient-to-r from-[#f6d899] to-[#e7bc72] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#2a1a0c]">Weekly Rank: {p.weekRank}</span> : null}
        </div>

        <div className="mt-5 px-4">
          <div className="flex items-center justify-between">
            <SectionTitle>Major Members</SectionTitle>
            <span className="text-[13px] text-cream/50">
              {n(p.memberCount)}/{n(p.capacity)}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {majors.map((m) => (
              <div key={m.userId} className="flex flex-col items-center text-center">
                <Avatar name={m.name} url={m.avatarUrl} size={62} />
                <span className="mt-1.5 w-full truncate text-[12px] font-semibold text-cream">{m.name}</span>
                <RolePill role={m.role} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-white/[0.07] px-4 pt-5">
          <SectionTitle>Introduction</SectionTitle>
          <p className="mt-3 text-[14px] leading-relaxed whitespace-pre-line text-cream/75">{p.intro || "This Parivar has not written an introduction yet."}</p>
        </div>

        <div className="mt-6 border-t border-white/[0.07] px-4 pt-5">
          <div className="flex items-center justify-between">
            <SectionTitle>Prerequisites</SectionTitle>
            <span className="text-[13px] text-cream/50">{p.joinMode === "OPEN" ? "Free to join" : "Leader approval"}</span>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/95 to-transparent px-4 pt-8 pb-[calc(16px+env(safe-area-inset-bottom))]">
        {p.myApplication === "PENDING" ? (
          <button type="button" disabled={busy} onClick={() => void run(() => parivarApi.withdraw(p.id), "Request withdrawn")} className="h-13 w-full rounded-full bg-white/10 text-[15px] font-bold text-cream">
            Request sent · tap to withdraw
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || full}
            onClick={() =>
              void run(async () => {
                const r = await parivarApi.join(p.id);
                if (!r.myRole) toast("Request sent. The Mukhiya will answer it.", "gold");
              }, p.joinMode === "OPEN" ? `You joined ${p.name}` : undefined)
            }
            className="h-13 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[16px] font-extrabold text-[#2a1a0c] shadow-[0_8px_24px_-8px_rgb(231_188_114/0.6)] disabled:opacity-50"
          >
            {full ? "Full" : p.joinMode === "OPEN" ? "Join" : "Apply"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Opening your Parivar lands in its chat; Home (top right) opens the Parivar itself. */
export function ParivarChatScreen({ id }: { id: string }) {
  const { pop, push } = useApp();
  const [p, setP] = useState<ParivarProfile | null>(null);
  const [error, setError] = useState("");
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftTo, setGiftTo] = useState<string | undefined>();
  useEffect(() => {
    parivarApi
      .profile(id)
      .then(setP)
      .catch((e) => setError(errText(e, "Couldn't open the Parivar chat.")));
  }, [id]);
  if (!p)
    return (
      <div className="h-full bg-ink">
        <ScreenHeader title="Parivar" onBack={pop} />
        {error ? <p className="mx-6 mt-10 rounded-2xl bg-coral/10 p-4 text-center text-[13px] text-coral">{error}</p> : <div className="mx-auto mt-24 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold" aria-label="Loading" />}
      </div>
    );
  if (!p.myRole) {
    // Not a member any more: show the Parivar itself
    return <ParivarHome id={id} />;
  }
  return (
    <div className="relative h-full overflow-hidden bg-ink">
      <ChatSheet p={p} open onClose={pop} onHome={() => push({ kind: "parivar", id })} onGift={(to) => { setGiftTo(to); setGiftOpen(true); }} />
      <ParivarGiftSheet p={p} open={giftOpen} onClose={() => setGiftOpen(false)} toId={giftTo} />
    </div>
  );
}
