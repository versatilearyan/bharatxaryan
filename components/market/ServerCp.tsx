"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, HeartCrack, ImagePlus, Trash2, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CpRing } from "./CpRing";
import { badgeOf } from "@/lib/app/cp-badges";
import { forgetRoomCp } from "@/components/rooms/RoomSocial";
import { CoupleRoomBadge, CoupleRoomButton } from "@/components/rooms/CoupleRoom";
import { BadgeImg, CpBadgeCollection, CpCharmCard, CpCharmHistory, CpLevelUp } from "./CpCharm";
import { Coin } from "@/components/ui/kit";
import { CP_QUEUE, cpApi, daysOf, nextMilestone, type CpBlessing, type CpCouple, type CpPerson, type CpProposal, type CpRingInfo } from "@/lib/api/cp";
import { PROPOSAL_LINES } from "@/lib/app/market";
import { notify } from "@/lib/app/notify";
import { useApp } from "@/lib/app/store";
import { myUserIdFromToken } from "@/lib/auth/token";
import { subscribe } from "@/lib/realtime/stomp";
import { friendsApi } from "@/lib/api/social";

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/** CP events for you on /user/queue/cp. The CP screens reload when one arrives. */
export function useCpEvents(on: (type: string, body: Record<string, unknown>) => void) {
  useEffect(
    () =>
      subscribe(CP_QUEUE, (body) => {
        const b = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        if (b && typeof b.type === "string") on(b.type, b);
      }),
    [on],
  );
}

/** The couple's heartbeat line (like the one between two seats in a room), beating between a face and the ring. */
function HeartLine() {
  return (
    <svg viewBox="0 0 48 20" className="h-5 w-11 shrink-0 text-pink" style={{ filter: "drop-shadow(0 0 4px rgb(255 104 124 / 0.9))" }} aria-hidden>
      <motion.path
        d="M0 10 H13 L16 6 L19.5 17 L23.5 2 L27 15 L30 9 L33 12 H48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: [0.15, 1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function Face({ p, size = 64 }: { p?: CpPerson; size?: number }) {
  const name = p?.name ?? "?";
  return (
    <span className="relative inline-block rounded-full p-[3px]" style={{ background: "linear-gradient(135deg,#ffd98a,#ff7fa8)" }}>
      {p?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.avatarUrl} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
      ) : (
        <span className="grid place-items-center rounded-full bg-[#2a1520] font-display font-extrabold text-white" style={{ width: size, height: size, fontSize: size * 0.4 }}>
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/** A ring's picture (built-in art, or the picture of a ring added in the admin panel). */
function Ring({ id, size = 48 }: { id: string; catalogue?: CpRingInfo[]; size?: number }) {
  return <CpRing id={id} size={size} />;
}

/**
 * The CP space from the server: the couple and their ring, wallpaper, days
 * together and the next day mark, love level, blessings ("Recent gifts"),
 * the ring box, and ending (both must agree). Without a CP: proposals.
 */
export function ServerLoveHome({ personId }: { personId: string }) {
  const { pop, push, toast, refreshCoins } = useApp();
  const myId = myUserIdFromToken();
  const uid = personId === "me" ? myId : personId.startsWith("srv-user:") ? personId.slice(9) : null;
  const self = uid != null && uid === myId;
  const [c, setC] = useState<CpCouple | null | undefined>(undefined);
  const [props, setProps] = useState<{ sent: CpProposal | null; received: CpProposal[] } | null>(null);
  const [catalogue, setCatalogue] = useState<CpRingInfo[]>([]);
  const [blessings, setBlessings] = useState<CpBlessing[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"rings" | "gifts">("rings");
  const [adding, setAdding] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const lastLevel = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [force, setForce] = useState<{ enabled: boolean; price: number } | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const couple = self ? await cpApi.mine() : uid ? await cpApi.of(uid) : null;
      setC(couple);
      if (self && !couple) setProps(await cpApi.proposals());
      if (couple) cpApi.blessings(couple.id).then((b) => setBlessings(b.items)).catch(() => setBlessings([]));
    } catch (e) {
      setError(errText(e, "Couldn't load the CP space."));
    }
  }, [self, uid]);
  useEffect(() => {
    void load();
    cpApi.rings().then(setCatalogue).catch(() => undefined);
    if (self) cpApi.forceEndInfo().then(setForce).catch(() => setForce(null));
  }, [load, self]);
  useCpEvents(
    useCallback(
      (type: string) => {
        if (type === "BLESSED" || type === "LEVEL_UP" || type === "RING_ADDED") notify("message");
        if (type === "LEVEL_UP") toast("Your CP levelled up 💞", "gold");
        void load();
      },
      [load, toast],
    ),
  );

  // A new level (not the first time the couple loads): the full-screen celebration, once per level
  useEffect(() => {
    if (!c) return;
    const prev = lastLevel.current;
    lastLevel.current = c.level;
    if (prev !== null && c.level > prev && myId && (c.a === myId || c.b === myId)) setLevelUp(c.level);
  }, [c, myId]);

  const run = async (f: () => Promise<unknown>, ok?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await f();
      if (ok) toast(ok, "gold");
      await load();
    } catch (e) {
      toast(errText(e, "That didn't work. Try again."), "error");
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream backdrop-blur">
      <ChevronLeft className="h-6 w-6" />
    </button>
  );

  if (c === undefined)
    return (
      <div className="h-full bg-ink">
        <div className="pt-safe p-3">{back}</div>
        {error ? (
          <button type="button" onClick={() => void load()} className="mx-6 mt-10 block w-[calc(100%-3rem)] rounded-2xl bg-coral/10 p-4 text-center text-[13px] text-coral">
            {error} Tap to retry.
          </button>
        ) : (
          <div className="mx-auto mt-24 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-pink" aria-label="Loading" />
        )}
      </div>
    );

  if (!c)
    return (
      <div className="app-scroll h-full bg-gradient-to-b from-[#3a1226] via-[#1a0d14] to-ink">
        <div className="pt-safe p-3">{back}</div>
        <div className="px-6 pt-6 text-center">
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="text-[54px]" aria-hidden>
            💞
          </motion.div>
          <p className="mt-2 font-display text-[22px] font-extrabold text-cream">No CP yet</p>
          <p className="mt-1 text-[13px] text-muted">{self ? "Open someone's profile, choose a ring and propose." : "They don't have a CP yet."}</p>
        </div>
        {self && props ? (
          <div className="mt-6 space-y-3 px-4">
            {props.received.map((p) => (
              <ProposalCard key={p.id} p={p} incoming busy={busy} onAccept={() => run(() => cpApi.accept(p.id), "You're a CP now 💞")} onDecline={() => run(() => cpApi.decline(p.id), "Proposal declined. The ring went back to them.")} />
            ))}
            {props.sent ? <ProposalCard p={props.sent} busy={busy} onCancel={() => run(() => cpApi.cancel(props.sent!.id), "Proposal cancelled. The ring is back in your bag.")} /> : null}
          </div>
        ) : null}
      </div>
    );

  const iAmIn = Boolean(myId && (c.a === myId || c.b === myId));
  const A = c.people[c.a];
  const B = c.people[c.b];
  const days = daysOf(c.since);
  const mark = nextMilestone(days);
  const partner = myId === c.a ? c.b : c.a;
  const counts = c.rings.reduce<Record<string, number>>((m, r) => ((m[r] = (m[r] ?? 0) + 1), m), {});

  return (
    <div className="app-scroll relative h-full bg-gradient-to-b from-[#4a1430] via-[#1d0c16] to-ink pb-10">
      {/* Wallpaper behind the couple */}
      {c.wallpaperUrl ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] overflow-hidden" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.wallpaperUrl} alt="" className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-[#1d0c16]/40 to-[#1d0c16]" />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] overflow-hidden" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <motion.span key={i} className="absolute text-[14px]" style={{ left: `${(i * 37) % 100}%`, bottom: -20 }} animate={{ y: [0, -340], opacity: [0, 0.9, 0] }} transition={{ duration: 6 + (i % 4), delay: i * 0.7, repeat: Infinity, ease: "easeOut" }}>
              {i % 3 ? "💗" : "✨"}
            </motion.span>
          ))}
        </div>
      )}
      <div className="pt-safe relative flex items-center gap-2 p-3">
        {back}
        <span className="flex-1" />
        {iAmIn ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (f.size > 8 * 1024 * 1024) return toast("Wallpapers can be up to 8 MB", "error");
                setUpload(0);
                cpApi
                  .setWallpaper(f, setUpload)
                  .then(() => (toast("Wallpaper set 💞", "gold"), load()))
                  .catch((er) => toast(errText(er, "Couldn't set the wallpaper."), "error"))
                  .finally(() => setUpload(null));
              }}
            />
            <button type="button" disabled={upload !== null} onClick={() => fileRef.current?.click()} aria-label="Change wallpaper" className="flex h-10 items-center gap-1.5 rounded-full bg-black/40 px-3 text-[12px] font-bold text-cream backdrop-blur">
              <ImagePlus className="h-4 w-4" /> {upload !== null ? `${Math.round(upload * 100)}%` : "Wallpaper"}
            </button>
            {c.wallpaperUrl ? (
              <button type="button" disabled={busy} onClick={() => run(() => cpApi.removeWallpaper(), "Wallpaper removed")} aria-label="Remove wallpaper" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream backdrop-blur">
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {/* The couple */}
      <div className="relative flex items-center justify-center gap-1 px-4">
        <button type="button" onClick={() => push({ kind: "user-profile", personId: c.a === myId ? "me" : `srv-user:${c.a}` })}>
          <Face p={A} size={78} />
        </button>
        <HeartLine />
        <motion.div animate={{ y: [0, -5, 0], rotate: [0, -6, 6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
          <Ring id={c.ring} catalogue={catalogue} size={58} />
        </motion.div>
        <HeartLine />
        <button type="button" onClick={() => push({ kind: "user-profile", personId: c.b === myId ? "me" : `srv-user:${c.b}` })}>
          <Face p={B} size={78} />
        </button>
      </div>
      <p className="relative mt-3 text-center font-display text-[19px] font-extrabold text-cream">
        {A?.name ?? "…"} <span className="text-pink">♥</span> {B?.name ?? "…"}
      </p>
      <p className="relative mt-1 flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#f6d899]">
        <BadgeImg level={c.level} size={26} /> {badgeOf(c.level).name}
      </p>
      <p className="relative mt-1 text-center text-[12px] font-semibold text-cream/70">
        💞 Together since {new Date(c.since).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      {c.message ? <p className="relative mx-8 mt-1 text-center text-[13px] italic text-cream/75">“{c.message}”</p> : null}

      <div className="relative mx-4 mt-4 grid grid-cols-3 gap-2">
        <Stat big={days.toLocaleString("en-IN")} label="days together" />
        <Stat big={mark ? String(mark.left) : "∞"} label={mark ? `days to Day ${mark.day}` : "all milestones"} accent />
        <Stat big={c.rings.length.toLocaleString("en-IN")} label="rings" />
      </div>

      {/* The couple's private room */}
      {iAmIn ? <CoupleRoomButton coupleId={c.id} a={c.a} b={c.b} names={[A?.name ?? "You", B?.name ?? "Partner"]} /> : <CoupleRoomBadge coupleId={c.id} names={[A?.name ?? "…", B?.name ?? "…"]} />}

      {/* CP level, badge and Charm */}
      <CpCharmCard c={c} onBadges={() => setBadgesOpen(true)} onHistory={() => setHistoryOpen(true)} />
      <CpBadgeCollection open={badgesOpen} onClose={() => setBadgesOpen(false)} c={c} />
      <CpCharmHistory open={historyOpen} onClose={() => setHistoryOpen(false)} c={c} myId={myId ?? undefined} />
      <CpLevelUp level={levelUp} charm={c.charm} onClose={() => setLevelUp(null)} />

      {/* Blessings */}
      <div className="relative mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-white/10">
        <span className="text-[26px]" aria-hidden>
          🙏
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold text-cream">{c.blessings.toLocaleString("en-IN")} blessings</span>
          <span className="text-[11.5px] text-cream/55">A kind wish for the couple</span>
        </span>
        {!iAmIn ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await cpApi.bless(c.id);
                navigator.vibrate?.(30);
              }, "🙏 Blessed!")
            }
            className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-pink to-gold px-3.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            Bless <Coin className="h-3.5 w-3.5" /> 99
          </motion.button>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="relative mx-4 mt-4 flex rounded-full bg-black/30 p-1 ring-1 ring-white/10">
        {(
          [
            ["rings", "Ring box"],
            ["gifts", "Recent gifts"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`relative flex-1 rounded-full py-2 text-[12.5px] font-bold ${tab === k ? "text-ink" : "text-cream/70"}`}>
            {tab === k ? <motion.span layoutId="cp-tab" className="absolute inset-0 rounded-full bg-gradient-to-r from-[#ffd1dd] to-gold" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="relative mx-4 mt-3">
          {tab === "rings" ? (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(counts).map(([id, n]) => {
                  const info = catalogue.find((r) => r.id === id);
                  const first = id === c.ring;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={!iAmIn || busy || first}
                      onClick={() =>
                        run(async () => {
                          await cpApi.setMainRing(id);
                          forgetRoomCp();
                        }, `${info?.name ?? "Ring"} is now your main ring 💍`)
                      }
                      aria-label={first ? `${info?.name ?? "Ring"}, your main ring` : `Make ${info?.name ?? "this ring"} your main ring`}
                      aria-pressed={first}
                      className={`relative flex flex-col items-center rounded-2xl px-1 pb-2 pt-3 ring-1 transition active:scale-[0.97] ${first ? "bg-gradient-to-b from-pink/25 to-gold/10 ring-gold" : "bg-white/[0.05] ring-white/10"}`}
                    >
                      {first ? <span className="absolute left-1.5 top-1.5 rounded-full bg-gold px-1.5 text-[9px] font-extrabold text-ink">MAIN</span> : null}
                      <span className="absolute right-1.5 top-1.5 text-[11px] font-bold text-cream/70">×{n}</span>
                      <Ring id={id} catalogue={catalogue} size={54} />
                      <span className="mt-1 line-clamp-1 px-1 text-center text-[11.5px] font-semibold text-cream">{info?.name ?? id}</span>
                      {info ? (
                        <span className="flex items-center gap-0.5 text-[10.5px] text-gold">
                          <Coin className="h-3 w-3" /> {info.price.toLocaleString("en-IN")}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {iAmIn ? <p className="mt-2 text-center text-[11.5px] text-cream/55">Tap a ring to make it your main ring. It shows on the CP page and your profiles.</p> : null}
              {iAmIn ? (
                <button type="button" onClick={() => setAdding(true)} className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-pink to-[#ff9ab8] text-[14px] font-bold text-white">
                  💍 Add a ring
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {blessings === null ? <li className="py-6 text-center text-[13px] text-muted">Loading…</li> : null}
              {blessings && blessings.length === 0 ? <li className="py-6 text-center text-[13px] text-muted">No blessings yet.</li> : null}
              {(blessings ?? []).map((b) => (
                <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-3 py-2 ring-1 ring-white/10">
                  <Face p={b.by} size={30} />
                  <span className="min-w-0 flex-1 text-[12.5px] text-cream">
                    <b>{b.by.name}</b> sent a blessing 🙏
                    <span className="block text-[11px] text-muted">{ago(b.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Ending: both must agree */}
      {iAmIn ? (
        <div className="relative mx-4 mt-6">
          {c.endRequest && c.endRequest.by !== myId ? (
            <div className="rounded-2xl bg-coral/10 p-3 ring-1 ring-coral/30">
              <p className="text-[13px] text-cream">Your partner asked to end the CP.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => run(() => cpApi.declineEnd(), "You kept your CP 💞")} className="h-10 rounded-full bg-pink text-[13px] font-bold text-white">
                  Keep it
                </button>
                <button type="button" disabled={busy} onClick={() => run(() => cpApi.acceptEnd(), "CP ended")} className="h-10 rounded-full bg-white/10 text-[13px] font-bold text-cream">
                  End it
                </button>
              </div>
            </div>
          ) : c.endRequest ? (
            <div className="rounded-2xl bg-white/[0.05] p-3 text-center ring-1 ring-white/10">
              <p className="text-[12.5px] text-cream/80">You asked to end the CP. It ends only if your partner agrees.</p>
              <button type="button" disabled={busy} onClick={() => run(() => cpApi.cancelEnd(), "Request taken back")} className="mt-2 h-9 w-full rounded-full bg-pink text-[12.5px] font-bold text-white">
                Take it back
              </button>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => run(() => cpApi.endRequest(), "Asked your partner to end the CP")} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-[12.5px] font-bold text-cream/55">
              <HeartCrack className="h-4 w-4" /> End CP
            </button>
          )}
          {/* Not waiting for the partner: pay coins and end it now */}
          {force?.enabled && !(c.endRequest && c.endRequest.by !== myId) ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(`End this CP right now for ${force.price.toLocaleString("en-IN")} coins? Your partner can't refuse, and your ring collection is removed. This can't be undone.`)) return;
                void run(async () => {
                  await cpApi.forceEnd();
                  refreshCoins();
                }, "CP ended");
              }}
              className="mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-coral/10 text-[12.5px] font-bold text-coral ring-1 ring-coral/30"
            >
              <HeartCrack className="h-4 w-4" /> End CP now · <Coin className="h-3.5 w-3.5" /> {force.price.toLocaleString("en-IN")}
            </button>
          ) : null}
        </div>
      ) : null}

      {iAmIn ? <AddRingSheet open={adding} onClose={() => setAdding(false)} catalogue={catalogue} partnerName={c.people[partner]?.name ?? "your partner"} onDone={() => (setAdding(false), void load())} /> : null}
    </div>
  );
}

function Stat({ big, label, accent }: { big: string; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-3 text-center ring-1 ${accent ? "bg-gradient-to-b from-gold/20 to-transparent ring-gold/40" : "bg-black/30 ring-white/10"}`}>
      <span className={`block font-display text-[22px] font-extrabold ${accent ? "text-gold" : "text-cream"}`}>{big}</span>
      <span className="text-[10.5px] font-semibold text-cream/60">{label}</span>
    </div>
  );
}

function ProposalCard({ p, incoming, busy, onAccept, onDecline, onCancel }: { p: CpProposal; incoming?: boolean; busy: boolean; onAccept?: () => void; onDecline?: () => void; onCancel?: () => void }) {
  const left = Math.max(0, Math.ceil((p.createdAt + 7 * 86_400_000 - Date.now()) / 86_400_000));
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#5a1a36] to-[#24101a] p-4 ring-1 ring-pink/40">
      <div className="flex items-center gap-3">
        <CpRing id={p.ringId} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-cream">{incoming ? `${p.from.name} proposed to you!` : `Waiting for ${p.to.name}…`}</p>
          <p className="text-[11.5px] text-cream/60">{left > 0 ? `${left} day${left === 1 ? "" : "s"} left` : "expiring"}</p>
        </div>
      </div>
      {p.message ? <p className="mt-2 rounded-xl bg-black/25 px-3 py-2 text-[12.5px] italic text-cream/85">“{p.message}”</p> : null}
      {incoming ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={onDecline} className="flex h-10 items-center justify-center gap-1 rounded-full bg-white/10 text-[13px] font-bold text-cream">
            <X className="h-4 w-4" /> Decline
          </button>
          <button type="button" disabled={busy} onClick={onAccept} className="flex h-10 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-pink to-gold text-[13px] font-bold text-white">
            <Check className="h-4 w-4" /> Say yes
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={onCancel} className="mt-3 h-9 w-full rounded-full bg-white/10 text-[12.5px] font-bold text-cream">
          Cancel proposal
        </button>
      )}
    </motion.div>
  );
}

/** Rings from the catalogue with how many you own; pick one. Shared by the propose and ring box sheets. */
function RingPicker({ catalogue, bag, chosen, onChoose }: { catalogue: CpRingInfo[]; bag: Record<string, number>; chosen: string | null; onChoose: (id: string) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {catalogue.filter((r) => r.onSale || (bag[r.id] ?? 0) > 0).map((r) => (
        <button key={r.id} type="button" aria-pressed={chosen === r.id} onClick={() => onChoose(r.id)} className={`flex w-[92px] shrink-0 flex-col items-center rounded-2xl py-2 ring-1 transition ${chosen === r.id ? "scale-[1.03] bg-pink/15 ring-pink" : "bg-surface ring-line"}`}>
          <Ring id={r.id} catalogue={catalogue} size={46} />
          <span className="line-clamp-1 px-1 text-[11px] font-semibold text-cream">{r.name}</span>
          <span className="text-[10px] text-muted">{bag[r.id] ? `You have ${bag[r.id]}` : r.rarity}</span>
          <span className="flex items-center gap-0.5 text-[10.5px] font-bold text-gold">
            <Coin className="h-3 w-3" /> {r.price.toLocaleString("en-IN")}
          </span>
        </button>
      ))}
    </div>
  );
}

function AddRingSheet({ open, onClose, catalogue, partnerName, onDone }: { open: boolean; onClose: () => void; catalogue: CpRingInfo[]; partnerName: string; onDone: () => void }) {
  const { toast, coins } = useApp();
  const [bag, setBag] = useState<Record<string, number>>({});
  const [ring, setRing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    cpApi
      .bag()
      .then((b) => {
        setBag(b);
        setRing(Object.keys(b)[0] ?? catalogue[0]?.id ?? null);
      })
      .catch(() => setBag({}));
  }, [open, catalogue]);
  const info = catalogue.find((r) => r.id === ring);
  const owned = ring ? (bag[ring] ?? 0) : 0;
  const go = () => {
    if (!ring) return;
    setBusy(true);
    cpApi
      .addRing(ring, owned > 0 ? "BAG" : "BUY")
      .then(() => {
        toast(`${info?.name ?? "Ring"} added to your ring box 💍`, "gold");
        onDone();
      })
      .catch((e) => toast(errText(e, "Couldn't add the ring."), "error"))
      .finally(() => setBusy(false));
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Add a ring">
      <div className="px-4 pb-6">
        <p className="mb-2 text-[12.5px] text-muted">For you and {partnerName}.</p>
        <RingPicker catalogue={catalogue} bag={bag} chosen={ring} onChoose={setRing} />
        <button type="button" disabled={!ring || busy} onClick={go} className="mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-pink to-gold text-[15px] font-bold text-white disabled:opacity-50">
          {busy ? "Adding…" : owned > 0 ? "💍 Add from my bag" : (
            <>
              Buy & add · <Coin className="h-4 w-4" /> {(info?.price ?? 0).toLocaleString("en-IN")}
            </>
          )}
        </button>
        {owned === 0 && info ? <p className="mt-2 text-center text-[11px] text-muted">Your balance: {coins.toLocaleString("en-IN")} coins</p> : null}
      </div>
    </BottomSheet>
  );
}

/** Propose to a backend user with a ring from your bag (or buy one first). */
export function ServerProposeSheet({ open, onClose, toUserId, toName, initialRing }: { open: boolean; onClose: () => void; toUserId: string; toName: string; initialRing?: string }) {
  const { toast, coins } = useApp();
  const [catalogue, setCatalogue] = useState<CpRingInfo[]>([]);
  const [bag, setBag] = useState<Record<string, number>>({});
  const [ring, setRing] = useState<string | null>(null);
  const [message, setMessage] = useState<string>(PROPOSAL_LINES[0]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    Promise.all([cpApi.rings(), cpApi.bag()])
      .then(([cat, b]) => {
        setCatalogue(cat);
        setBag(b);
        setRing(initialRing && (b[initialRing] ?? 0) > 0 ? initialRing : (Object.keys(b)[0] ?? cat[0]?.id ?? null));
      })
      .catch((e) => toast(errText(e, "Couldn't load rings."), "error"));
  }, [open, toast, initialRing]);
  const info = catalogue.find((r) => r.id === ring);
  const owned = ring ? (bag[ring] ?? 0) : 0;
  const send = async () => {
    if (!ring) return;
    setBusy(true);
    try {
      if (owned === 0) setBag((await cpApi.buy(ring)).bag);
      await cpApi.propose(toUserId, ring, message.trim());
      toast(`Proposal sent to ${toName} 💍`, "gold");
      onClose();
    } catch (e) {
      toast(errText(e, "Couldn't send the proposal."), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={`Propose to ${toName}`}>
      <div className="px-4 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Choose a ring</p>
        <div className="mt-2">
          <RingPicker catalogue={catalogue} bag={bag} chosen={ring} onChoose={setRing} />
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Your message</p>
        <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 120))} rows={2} className="mt-2 w-full resize-none rounded-2xl bg-surface px-3 py-2 text-[13.5px] text-cream ring-1 ring-line focus:outline-none focus:ring-pink" aria-label="Proposal message" />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PROPOSAL_LINES.map((l) => (
            <button key={l} type="button" onClick={() => setMessage(l)} className="rounded-full bg-cream/[0.06] px-2.5 py-1 text-left text-[11px] text-cream/75">
              {l}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">The ring leaves your bag now. It comes back if they decline or don&apos;t answer in 7 days.</p>
        <button type="button" disabled={!ring || busy} onClick={() => void send()} className="mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-pink to-gold text-[15px] font-bold text-white disabled:opacity-40">
          {busy ? "Sending…" : owned > 0 ? "💍 Send proposal" : (
            <>
              Buy ring & propose · <Coin className="h-4 w-4" /> {(info?.price ?? 0).toLocaleString("en-IN")}
            </>
          )}
        </button>
        {owned === 0 && info ? <p className="mt-2 text-center text-[11px] text-muted">Your balance: {coins.toLocaleString("en-IN")} coins</p> : null}
      </div>
    </BottomSheet>
  );
}

/**
 * CP news while you use the app: a full-screen card for a new proposal (Say
 * yes / Decline), and short notes for the rest. Mounted once in the app shell.
 */
export function CpProposalPrompt() {
  const { session, push, toast } = useApp();
  const [p, setP] = useState<CpProposal | null>(null);
  const [busy, setBusy] = useState(false);
  /** The celebration after a yes: shown to the one who said yes, and to the one who proposed when the news comes. */
  const [yay, setYay] = useState<{ ringId?: string; name: string } | null>(null);
  useCpEvents(
    useCallback(
      (type: string, body: Record<string, unknown>) => {
        const pid = typeof body.proposalId === "string" ? body.proposalId : undefined;
        switch (type) {
          case "PROPOSAL_RECEIVED":
            notify("invite");
            cpApi
              .proposals()
              .then((x) => setP(x.received.find((r) => r.id === pid) ?? x.received[0] ?? null))
              .catch(() => undefined);
            break;
          case "PROPOSAL_ACCEPTED":
            notify("invite");
            setYay({ ringId: typeof body.ringId === "string" ? body.ringId : undefined, name: typeof body.name === "string" ? body.name : typeof body.byName === "string" ? body.byName : "Your partner" });
            break;
          case "PROPOSAL_DECLINED":
            toast("Your proposal was declined. The ring is back in your bag.");
            break;
          case "PROPOSAL_CANCELLED":
            setP((cur) => (cur && cur.id === pid ? null : cur));
            break;
          case "END_REQUESTED":
            notify("alert");
            toast("Your partner asked to end your CP. Open the CP space to answer.");
            break;
          case "END_REQUEST_DECLINED":
            toast("Your partner wants to keep your CP 💞", "gold");
            break;
          case "CP_ENDED":
            toast("Your CP has ended.");
            break;
        }
      },
      [toast],
    ),
  );
  if (!session || (!p && !yay)) return null;
  const answer = (yes: boolean) => {
    if (!p) return;
    setBusy(true);
    (yes ? cpApi.accept(p.id) : cpApi.decline(p.id))
      .then(() => {
        if (yes) setYay({ ringId: p.ringId, name: p.from.name });
        setP(null);
      })
      .catch((e) => {
        toast(errText(e, "That proposal is no longer open."), "error");
        setP(null);
      })
      .finally(() => setBusy(false));
  };
  return (
    <AnimatePresence>
      {yay ? (
        <CpYay key="yay" ringId={yay.ringId} name={yay.name} onDone={() => { setYay(null); push({ kind: "love-home", personId: "me" }); }} />
      ) : p ? (
        <motion.div key="ask" className="fixed inset-0 z-[96] grid place-items-center bg-black/75 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="CP proposal">
          <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="relative w-full max-w-[340px] overflow-hidden rounded-[30px] bg-[radial-gradient(120%_70%_at_50%_0%,#8a2346_0%,#4a1226_50%,#1d0c16_100%)] px-5 pb-5 pt-9 text-center ring-1 ring-gold/50 shadow-[0_30px_80px_-10px_rgba(255,92,138,0.45)]">
            <Toran />
            <p className="font-display text-[13px] font-bold uppercase tracking-[0.2em] text-gold/80">Ek khaas paigaam</p>
            <RingBox ringId={p.ringId} />
            <p className="mt-1 font-display text-[21px] font-extrabold text-cream">{p.from.name} ne tumhe propose kiya!</p>
            <p className="text-[12px] text-cream/60">Kya tum unke CP banoge? 💞</p>
            {p.message ? <p className="mt-3 rounded-2xl bg-black/30 px-3 py-2 text-[13px] italic text-cream/90 ring-1 ring-gold/20">“{p.message}”</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button type="button" disabled={busy} onClick={() => answer(false)} className="h-11 rounded-full bg-white/10 text-[14px] font-bold text-cream active:scale-95">
                Decline
              </button>
              <motion.button type="button" disabled={busy} onClick={() => answer(true)} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="h-11 rounded-full bg-gradient-to-r from-pink via-[#ff7a8a] to-gold text-[14px] font-extrabold text-white shadow-[0_8px_24px_-6px_rgba(255,92,138,0.7)]">
                💞 Haan, Say yes
              </motion.button>
            </div>
            <button type="button" onClick={() => setP(null)} className="mt-2 text-[11.5px] text-cream/50">
              Decide later
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** A marigold toran across the top of the card (Panchayat's festive touch). */
function Toran() {
  return (
    <svg viewBox="0 0 340 40" className="pointer-events-none absolute inset-x-0 top-0 h-9 w-full" aria-hidden>
      <path d="M0 6 Q85 30 170 6 T340 6" stroke="#2f6b2a" strokeWidth="2" fill="none" />
      {Array.from({ length: 13 }).map((_, i) => {
        const x = 13 + i * 26;
        const y = 6 + 18 * Math.sin((i / 12) * Math.PI) * (i % 2 ? 1 : 0.9);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="6" fill={i % 2 ? "#ffb02e" : "#ff7a1a"} />
            <circle cx={x} cy={y} r="2.4" fill="#ffd36e" />
            <path d={`M${x} ${y + 6} l-4 9 l4 -2 l4 2 z`} fill="#3f8a34" />
          </g>
        );
      })}
    </svg>
  );
}

/** A velvet ring box that opens and lifts the ring out with sparkles. */
function RingBox({ ringId }: { ringId: string }) {
  return (
    <div className="relative mx-auto mt-3 h-[150px] w-[170px]" aria-hidden>
      {/* glow */}
      <motion.div className="absolute left-1/2 top-6 h-28 w-28 -translate-x-1/2 rounded-full bg-gold/30 blur-2xl" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.7] }} transition={{ delay: 0.7, duration: 1.2 }} />
      {/* box base */}
      <div className="absolute bottom-2 left-1/2 h-[58px] w-[118px] -translate-x-1/2 rounded-b-[18px] rounded-t-[8px] bg-gradient-to-b from-[#b0123f] to-[#5c0a22] shadow-[inset_0_-6px_0_rgba(0,0,0,0.25),0_10px_24px_-8px_rgba(0,0,0,0.7)] ring-1 ring-gold/60">
        <div className="absolute inset-x-3 top-2 h-7 rounded-[10px] bg-[#2a0612] shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]" />
        <div className="absolute inset-x-0 bottom-3 h-[3px] bg-gold/70" />
      </div>
      {/* the ring rises */}
      <motion.div className="absolute left-1/2 -translate-x-1/2" initial={{ bottom: 34, scale: 0.5, opacity: 0 }} animate={{ bottom: 64, scale: 1, opacity: 1 }} transition={{ delay: 0.75, type: "spring", stiffness: 140, damping: 11 }}>
        <motion.div animate={{ rotate: [0, -6, 6, 0], y: [0, -4, 0] }} transition={{ delay: 1.6, duration: 2.2, repeat: Infinity }}>
          <CpRing id={ringId} size={78} />
        </motion.div>
      </motion.div>
      {/* lid flips open */}
      <motion.div className="absolute bottom-[58px] left-1/2 h-[34px] w-[122px] -translate-x-1/2 origin-bottom rounded-t-[20px] rounded-b-[6px] bg-gradient-to-b from-[#d01a4d] to-[#7a0e2c] ring-1 ring-gold/60 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]" initial={{ rotateX: 0 }} animate={{ rotateX: -112 }} transition={{ delay: 0.35, duration: 0.55, ease: [0.3, 1.4, 0.5, 1] }} style={{ transformPerspective: 400 }}>
        <div className="absolute inset-x-0 top-2 mx-auto h-[3px] w-[70%] rounded bg-gold/70" />
      </motion.div>
      {/* sparkles */}
      {[[-62, -8], [58, -14], [-44, 34], [50, 30], [0, -30]].map(([x, y], i) => (
        <motion.span key={i} className="absolute left-1/2 top-1/2 text-[16px] text-gold" initial={{ opacity: 0, x: 0, y: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], x, y, scale: [0, 1.2, 0.6] }} transition={{ delay: 1 + i * 0.12, duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}>
          ✦
        </motion.span>
      ))}
    </div>
  );
}

/** "You're a CP now": rings and petals fall, diyas glow, then the couple's Love Home opens. */
function CpYay({ ringId, name, onDone }: { ringId?: string; name: string; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 5200);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div className="fixed inset-0 z-[96] grid place-items-center overflow-hidden bg-[radial-gradient(80%_60%_at_50%_45%,#6b1f3d_0%,#2a0c1a_60%,#0d0508_100%)] px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onDone} role="dialog" aria-label="You're a CP now">
      {/* petals and hearts falling */}
      {Array.from({ length: 26 }).map((_, i) => (
        <motion.span key={i} className="pointer-events-none absolute top-[-40px] text-[20px]" style={{ left: `${(i * 37) % 100}%` }} initial={{ y: -40, rotate: 0, opacity: 0 }} animate={{ y: "110vh", rotate: 360 * (i % 2 ? 1 : -1), opacity: [0, 1, 1, 0] }} transition={{ delay: (i % 9) * 0.25, duration: 3.6 + (i % 5) * 0.4, repeat: Infinity }}>
          {["🌸", "💖", "🌼", "✨", "💞"][i % 5]}
        </motion.span>
      ))}
      <motion.div className="relative text-center" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 12 }}>
        <motion.div className="absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 rounded-full bg-pink/30 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} aria-hidden />
        <div className="relative mx-auto flex w-fit items-center gap-3">
          <motion.span animate={{ x: [-30, 0] }} transition={{ duration: 0.8 }} className="text-[44px]">💍</motion.span>
          {ringId ? <CpRing id={ringId} size={96} /> : <span className="text-[80px]">💞</span>}
          <motion.span animate={{ x: [30, 0] }} transition={{ duration: 0.8 }} className="text-[44px]">🪔</motion.span>
        </div>
        <p className="relative mt-4 bg-gradient-to-r from-[#ffd6e4] via-gold to-[#ffd6e4] bg-clip-text font-display text-[30px] font-black text-transparent">Badhai ho! 🎉</p>
        <p className="relative mt-1 font-display text-[18px] font-extrabold text-cream">Tum aur {name} ab CP ho 💞</p>
        <p className="relative mt-2 text-[12px] text-cream/60">Tap to open your Love Home</p>
      </motion.div>
    </motion.div>
  );
}

/**
 * Propose with a ring from your Bag: pick a friend (or someone you follow),
 * then the proposal opens with that ring chosen.
 */
export function ProposeFromBagSheet({ open, onClose, ringId, ringName }: { open: boolean; onClose: () => void; ringId: string; ringName: string }) {
  const { toast } = useApp();
  const [people, setPeople] = useState<{ userId: string; name: string; avatarUrl?: string }[] | null>(null);
  const [to, setTo] = useState<{ userId: string; name: string } | null>(null);
  useEffect(() => {
    if (!open) return;
    setTo(null);
    Promise.all([friendsApi.list("friends"), friendsApi.list("following")])
      .then(([f, g]) => {
        const seen = new Set<string>();
        setPeople([...f.people, ...g.people].filter((p) => p.userId && !seen.has(p.userId) && (seen.add(p.userId), true)));
      })
      .catch((e) => toast(errText(e, "Couldn't load your friends."), "error"));
  }, [open, toast]);
  return (
    <>
      <BottomSheet open={open && !to} onClose={onClose} title={`Propose with ${ringName}`}>
        <div className="px-5 pb-5">
          <p className="text-[12.5px] text-muted">Pick who you want as your CP. They get your proposal with this ring.</p>
          {people === null ? <p className="py-6 text-center text-[13px] text-muted">Loading…</p> : null}
          {people?.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">Make friends or follow someone first, then propose from here.</p> : null}
          <ul className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">
            {(people ?? []).map((p) => (
              <li key={p.userId}>
                <button type="button" onClick={() => setTo({ userId: p.userId, name: p.name })} className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#2c1622]/95 to-[#1b1622]/95 p-2.5 text-left ring-1 ring-gold/15">
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-coral font-bold text-white">{p.name.slice(0, 1)}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-cream">{p.name}</span>
                  <span className="rounded-full bg-gradient-to-r from-pink to-coral px-3 py-1 text-[12px] font-bold text-white">💍 Propose</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </BottomSheet>
      {to ? <ServerProposeSheet open onClose={() => (setTo(null), onClose())} toUserId={to.userId} toName={to.name} initialRing={ringId} /> : null}
    </>
  );
}
