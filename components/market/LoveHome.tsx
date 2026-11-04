"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Gift, Heart, HeartCrack, ImagePlus, Plus } from "lucide-react";
import { useCpWallpaper } from "@/components/market/CpParts";
import { IMAGE_TYPES, imageFileError } from "@/lib/app/local-images";
import { RingArt } from "@/components/art/RingArt";
import { SunsetScene } from "@/components/art/SunsetScene";
import { FindCpSheet, ProfileGiftSheet } from "@/components/profile/UserProfile";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin } from "@/components/ui/kit";
import { BLESSING_COST, RINGS, daysTogether, loveLevel, partnerIn, ringById, type Couple } from "@/lib/app/market";
import { useMarket } from "@/lib/app/market-store";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";

/** A couple's shared page: both partners, days together, love level, ring box. */
export function LoveHome({ personId }: { personId: string }) {
  const { pop, push, toast } = useApp();
  const { coupleOf, pending, blessingsOf, bless } = useMarket();
  const person = usePeople();
  const c = coupleOf(personId);
  const [gift, setGift] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [finding, setFinding] = useState(false);
  const [adding, setAdding] = useState(false);
  const wall = useCpWallpaper(c);
  const [tab, setTab] = useState<"rings" | "gifts">("rings");

  const back = (
    <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream backdrop-blur">
      <ChevronLeft className="h-6 w-6" />
    </button>
  );

  if (!c) {
    return (
      <div className="app-scroll h-full bg-ink">
        <div className="pt-safe p-3">{back}</div>
        <div className="px-6 pt-10 text-center">
          <Heart className="mx-auto h-12 w-12 text-pink" aria-hidden />
          <p className="mt-3 font-display text-[20px] font-bold text-cream">{pending ? `Waiting for ${person(pending.toId).name}…` : "No CP yet"}</p>
          <p className="mt-1 text-[13px] text-muted">Pick someone special, choose a ring and propose.</p>
          {pending ? null : (
            <button type="button" onClick={() => setFinding(true)} className="mt-5 h-11 rounded-full bg-pink px-6 text-[14px] font-bold text-white">
              💍 Find a CP
            </button>
          )}
          <button type="button" onClick={() => push({ kind: "shop", tab: "rings" })} className="mt-3 block w-full text-[13px] font-semibold text-gold">
            Shop rings
          </button>
        </div>
        <FindCpSheet open={finding} onClose={() => setFinding(false)} />
      </div>
    );
  }

  const a = person(c.a);
  const b = person(c.b);
  const mine = c.a === ME_ID || c.b === ME_ID;
  const partner = person(partnerIn(c, ME_ID));
  const lv = loveLevel(c.love);
  const days = daysTogether(c.since);

  return (
    <div className="relative flex h-full flex-col" style={{ background: "#111114" }}>
      <div className="app-scroll min-h-0 flex-1">
        {/* Header: the couple's wallpaper, the two of them with their ring, days together, love and blessings */}
        <div className="relative h-[320px] overflow-hidden">
          {wall.url ? <img src={wall.url} alt="Your couple wallpaper" className="absolute inset-0 h-full w-full object-cover" /> : <SunsetScene theme="rose" motif="lanterns" />}
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-ink" />
          <div className="pt-safe absolute inset-x-0 top-0 flex items-center justify-between p-3">
            {back}
            <span className="font-display text-[17px] font-bold text-cream drop-shadow">Love Home</span>
            {mine ? (
              <label className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-black/40 text-cream backdrop-blur" aria-label="Change wallpaper" title="Change wallpaper">
                <ImagePlus className="h-5 w-5" aria-hidden />
                <input
                  type="file"
                  accept={IMAGE_TYPES.join(",")}
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const err = imageFileError(file);
                    if (err) return toast(err, "error");
                    wall
                      .set(file)
                      .then(() => toast("Wallpaper updated"))
                      .catch(() => toast("Couldn't save that wallpaper. Try another image.", "error"));
                  }}
                />
              </label>
            ) : (
              <span className="w-10" />
            )}
          </div>
          <div className="absolute inset-x-0 bottom-4 flex items-end justify-between gap-2 px-3">
            <div className="min-w-0">
              <div className="flex w-fit items-center rounded-full bg-black/35 p-1 backdrop-blur">
                <PersonAvatar person={{ ...a, frame: "none" }} size={52} className="rounded-full ring-2 ring-white/70" />
                <motion.span className="z-10 -mx-2.5" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
                  <RingArt id={c.ring} size={40} />
                </motion.span>
                <PersonAvatar person={{ ...b, frame: "none" }} size={52} className="rounded-full ring-2 ring-white/70" />
              </div>
              <p className="mt-1.5 truncate text-[14px] font-bold text-cream drop-shadow">
                {a.id === ME_ID ? "You" : a.name} & {b.id === ME_ID ? "you" : b.name}
              </p>
              <p className="text-[13px] font-semibold text-cream drop-shadow">
                Together for <b className="text-gold">{days}</b> {days === 1 ? "day" : "days"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <span className="flex items-center gap-2 rounded-full bg-black/45 py-1 pl-1 pr-3.5 backdrop-blur">
                <span className="relative grid h-8 w-8 place-items-center rounded-full bg-white">
                  <Heart className="h-5 w-5 fill-pink text-pink" aria-hidden />
                  <span className="absolute -bottom-1 rounded-full bg-pink px-1 text-[8.5px] font-extrabold text-white">Lv{lv.level}</span>
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold text-white/80">Love</span>
                  <span className="text-[12.5px] font-extrabold text-white">{c.love.toLocaleString("en-IN")}</span>
                </span>
              </span>
              <span className="flex items-center gap-2 rounded-full bg-black/45 py-1 pl-1 pr-3.5 backdrop-blur">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white">
                  <Gift className="h-5 w-5 text-[#f4515b]" aria-hidden />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold text-white/80">Blessing</span>
                  <span className="text-[12.5px] font-extrabold text-white">{blessingsOf(c).count.toLocaleString("en-IN")}</span>
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Panchayat sheet: love progress, then Ring Box / Recent Gifts tabs */}
        <div className="relative -mt-3 min-h-[calc(100%-320px)] overflow-hidden rounded-t-[28px] pb-6" style={{ background: "radial-gradient(120% 55% at 50% 0%, #3a2a26 0%, #1c1b22 55%, #111114 100%)" }}>
          <Sparkles />
          <div className="relative px-5 pt-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1 font-bold text-cream">
                <Heart className="h-3.5 w-3.5 fill-pink text-pink" aria-hidden /> Couple Lv {lv.level}
              </span>
              <span className="font-semibold text-muted">
                {c.love.toLocaleString("en-IN")}
                {lv.next ? ` / ${lv.next.toLocaleString("en-IN")}` : ""} love
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-pink to-gold" initial={{ width: 0 }} animate={{ width: `${lv.progress * 100}%` }} />
            </div>
            {c.message ? <p className="mt-2 text-center text-[12px] italic text-muted">“{c.message}”</p> : null}
          </div>

          <div className="relative mt-4 grid grid-cols-2" role="tablist" aria-label="Love Home">
            {(["rings", "gifts"] as const).map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex flex-col items-center pb-2 font-display text-[17px] font-extrabold ${tab === id ? "text-cream" : "text-muted"}`}>
                {id === "rings" ? "Ring Box" : "Recent Gifts"}
                <span className={`mt-1 h-[3px] w-6 rounded-full ${tab === id ? "bg-gold" : "bg-transparent"}`} />
              </button>
            ))}
          </div>

          {tab === "rings" ? (
            <div className="relative px-4 pt-2">
              <p className="px-1 text-[13px] font-bold text-muted">Rings Owned: {c.rings.length}</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {c.rings.map((r, i) => (
                  <span key={i} className="flex flex-col items-center gap-1 py-1" title={ringById(r).name}>
                    <RingArt id={r} size={56} />
                    <span className="line-clamp-1 px-1 text-[10.5px] font-semibold text-muted">{ringById(r).name}</span>
                  </span>
                ))}
                {mine ? (
                  <button type="button" onClick={() => setAdding(true)} aria-label="Add a ring" className="flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-gold/50 text-gold hover:text-gold">
                    <Plus className="h-5 w-5" aria-hidden />
                    <span className="text-[10.5px] font-bold">Add ring</span>
                  </button>
                ) : null}
              </div>
              {mine ? <p className="mt-3 px-1 text-[11.5px] text-muted">Each ring you add counts its full price as love.</p> : null}
            </div>
          ) : (
            <RecentGifts c={c} />
          )}

          {mine ? null : (
            <div className="relative mt-5 px-4">
              <button type="button" onClick={() => bless(c.id)} className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-pink to-gold text-[14px] font-bold text-white shadow-[0_6px_20px_-6px_rgb(255_120_160/0.7)]">
                🙏 Bless this couple · <Coin className="h-3.5 w-3.5" /> {BLESSING_COST}
              </button>
              <p className="mt-1.5 text-center text-[11px] text-muted">Each blessing adds {BLESSING_COST} love to their couple.</p>
            </div>
          )}

        {mine ? (
          <section className="relative mx-4 mt-5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setGift(true)} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-gold text-[13.5px] font-bold text-ink">
                <Gift className="h-4 w-4" aria-hidden /> Send a gift
              </button>
              <button type="button" onClick={() => setAdding(true)} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-surface text-[13.5px] font-bold text-cream ring-1 ring-line">
                💍 Add a ring
              </button>
            </div>
            {c.endRequest ? (
              <EndRequestCard c={c} partnerId={partner.id} />
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] font-semibold text-cream/55 hover:text-cream">
                <HeartCrack className="h-4 w-4" aria-hidden /> End relationship
              </button>
            )}
          </section>
        ) : null}
          {mine && wall.url ? (
            <button type="button" onClick={() => void wall.clear().then(() => toast("Wallpaper removed"))} className="relative mx-auto mt-1 block text-[12px] font-semibold text-muted hover:text-cream">
              Remove wallpaper
            </button>
          ) : null}
        </div>
      </div>
      {mine ? <ProfileGiftSheet open={gift} onClose={() => setGift(false)} toId={partner.id} /> : null}
      {mine ? <EndCpSheet open={confirm} onClose={() => setConfirm(false)} c={c} partnerId={partner.id} /> : null}
      {mine ? <AddRingSheet open={adding} onClose={() => setAdding(false)} partnerName={partner.name} /> : null}
    </div>
  );
}

/** Twinkles on the Love Home sheet. */
function Sparkles() {
  const dots = [
    [3, 22, 6],
    [95, 19, 9],
    [50, 21, 4],
    [96, 48, 6],
    [4, 64, 5],
    [94, 82, 7],
  ];
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
      {dots.map(([x, y, s], i) => (
        <motion.span key={i} className="absolute text-gold/70" style={{ left: `${x}%`, top: `${y}%`, fontSize: s * 1.6 }} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 2.2 + i * 0.4, repeat: Infinity }}>
          ✦
        </motion.span>
      ))}
    </span>
  );
}

const timeAgo = (at: number) => {
  const m = Math.floor((Date.now() - at) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/** Recent Gifts: the blessings people sent this couple, newest first. */
function RecentGifts({ c }: { c: Couple }) {
  const { blessingsOf } = useMarket();
  const person = usePeople();
  const { count, list } = blessingsOf(c);
  // Blessings from before this device (sample couples) have no time: listed after, once per person
  const dated = new Set(list.map((b) => b.by));
  const earlier = (c.blessedBy ?? []).filter((id) => !dated.has(id));
  const rows = [...list.map((b) => ({ key: b.id, by: b.by, when: timeAgo(b.at) })), ...earlier.map((by) => ({ key: `old-${by}`, by, when: "Earlier" }))];
  return (
    <div className="relative px-4 pt-2">
      <p className="px-1 text-[13px] font-bold text-muted">Blessings: {count.toLocaleString("en-IN")}</p>
      {rows.length ? (
        <ul className="mt-2 space-y-2">
          {rows.slice(0, 50).map((r) => {
            const p = person(r.by);
            return (
              <li key={r.key} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-line">
                <PersonAvatar person={{ ...p, frame: "none" }} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-cream">{p.id === ME_ID ? "You" : p.name}</p>
                  <p className="text-[12px] text-muted">sent a blessing 🙏 · {r.when}</p>
                </div>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-pink/15 ring-1 ring-pink/30">
                    <Gift className="h-5 w-5 text-pink" aria-hidden />
                  </span>
                  <span className="mt-0.5 text-[10.5px] font-bold text-pink">+{BLESSING_COST} love</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-center text-[13px] text-muted">No blessings yet. Friends can bless this couple for {BLESSING_COST} coins.</p>
      )}
      {count > rows.length ? <p className="mt-2 text-center text-[11.5px] text-muted">and {(count - rows.length).toLocaleString("en-IN")} more blessings</p> : null}
    </div>
  );
}

/** Add another ring to your ring box, from the Bag or straight from the shop. */
function AddRingSheet({ open, onClose, partnerName }: { open: boolean; onClose: () => void; partnerName: string }) {
  const { coins } = useApp();
  const { ringsInBag, giveRing, buyRingForCouple } = useMarket();
  return (
    <BottomSheet open={open} onClose={onClose} title="Add a ring" tall>
      <div className="px-4 pb-5">
        <p className="text-[12.5px] text-muted">Give {partnerName} another ring. It joins your ring box forever.</p>
        {ringsInBag.length ? (
          <>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">In your Bag</p>
            <ul className="mt-2 space-y-2">
              {ringsInBag.map(({ ring, count }) => (
                <li key={ring.id} className="flex items-center gap-3 rounded-2xl bg-surface p-2.5 ring-1 ring-line">
                  <RingArt id={ring.id} size={44} />
                  <span className="min-w-0 flex-1 text-[13.5px] font-bold text-cream">
                    {ring.name} <span className="text-[11px] font-semibold text-muted">×{count}</span>
                  </span>
                  <button type="button" onClick={() => giveRing(ring.id)} className="h-9 rounded-full bg-pink px-4 text-[12.5px] font-bold text-white">
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
          Ring shop
          <span className="flex items-center gap-1 normal-case tracking-normal text-gold">
            <Coin className="h-3.5 w-3.5" /> {coins.toLocaleString("en-IN")}
          </span>
        </p>
        <ul className="mt-2 space-y-2">
          {RINGS.map((ring) => (
            <li key={ring.id} className="flex items-center gap-3 rounded-2xl bg-surface p-2.5 ring-1 ring-line">
              <RingArt id={ring.id} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold text-cream">{ring.name}</span>
                <span className="text-[11px] text-muted">{ring.rarity}</span>
              </span>
              <button type="button" onClick={() => buyRingForCouple(ring.id)} disabled={coins < ring.price} aria-label={`Buy and add ${ring.name}`} className="flex h-9 items-center gap-1 rounded-full bg-gold px-3 text-[12.5px] font-bold text-ink disabled:bg-cream/10 disabled:text-muted">
                <Coin className="h-3.5 w-3.5" /> {ring.price.toLocaleString("en-IN")}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </BottomSheet>
  );
}

/** Ask your CP to end the relationship. Nothing ends until they accept. */
function EndCpSheet({ open, onClose, c, partnerId }: { open: boolean; onClose: () => void; c: Couple; partnerId: string }) {
  const { requestEnd } = useMarket();
  const person = usePeople();
  const me = person(ME_ID);
  const partner = person(partnerId);
  const lv = loveLevel(c.love);
  return (
    <BottomSheet open={open} onClose={onClose} title="End relationship">
      <div className="px-5 pb-6 text-center">
        <div className="relative mx-auto mt-1 flex w-fit items-center">
          <PersonAvatar person={{ ...me, frame: "none" }} size={64} className="rounded-full ring-2 ring-white/70" />
          <span className="z-10 -mx-3 grid h-11 w-11 place-items-center rounded-full bg-surface-2 ring-2 ring-pink/60">
            <HeartCrack className="h-5 w-5 text-pink" aria-hidden />
          </span>
          <PersonAvatar person={{ ...partner, frame: "none" }} size={64} className="rounded-full ring-2 ring-white/70" />
        </div>
        <p className="mt-3 font-display text-[18px] font-bold text-cream">Send {partner.name} a request to end your CP?</p>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-muted">
          Your CP only ends when {partner.name} accepts. Until then everything stays as it is, and you can take the request back.
        </p>
        <div className="mx-auto mt-4 grid max-w-[320px] grid-cols-3 gap-2 rounded-2xl bg-cream/[0.05] p-3 ring-1 ring-line">
          {[
            [`Lv ${lv.level}`, "Couple level"],
            [c.love.toLocaleString("en-IN"), "Love"],
            [String(c.rings.length), c.rings.length === 1 ? "Ring" : "Rings"],
          ].map(([v, l]) => (
            <span key={l} className="flex flex-col">
              <span className="font-display text-[15px] font-extrabold text-cream">{v}</span>
              <span className="text-[10.5px] text-muted">{l}</span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-pink/80">If it ends, your love level and ring box are lost.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-full bg-gradient-to-r from-pink to-gold text-[14px] font-bold text-white">
            Keep our CP 💞
          </button>
          <button
            type="button"
            onClick={() => {
              requestEnd();
              onClose();
            }}
            className="h-11 rounded-full bg-cream/[0.08] text-[14px] font-bold text-cream ring-1 ring-line"
          >
            Send request
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

/** A request to end the CP that's waiting: yours (take it back) or theirs (accept or keep). */
function EndRequestCard({ c, partnerId }: { c: Couple; partnerId: string }) {
  const { cancelEnd, endCouple } = useMarket();
  const person = usePeople();
  const partner = person(partnerId);
  const mineAsked = c.endRequest?.by === ME_ID;
  return (
    <div className="rounded-2xl bg-surface p-3.5 ring-1 ring-pink/30">
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          <PersonAvatar person={{ ...partner, frame: "none" }} size={44} />
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-surface-2 ring-2 ring-ink-2">
            <HeartCrack className="h-3 w-3 text-pink" aria-hidden />
          </span>
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[13.5px] font-bold text-cream">{mineAsked ? `Waiting for ${partner.name}` : `${partner.name} wants to end your CP`}</p>
          <p className="text-[11.5px] text-muted">{mineAsked ? "Your CP ends when they accept your request." : "It only ends if you accept."}</p>
        </div>
        {mineAsked ? (
          <motion.span className="h-2.5 w-2.5 shrink-0 rounded-full bg-pink" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }} aria-hidden />
        ) : null}
      </div>
      {mineAsked ? (
        <button type="button" onClick={cancelEnd} className="mt-3 h-10 w-full rounded-full bg-surface-2 text-[13px] font-bold text-cream ring-1 ring-line">
          Take back request
        </button>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={cancelEnd} className="h-10 rounded-full bg-gradient-to-r from-pink to-gold text-[13px] font-bold text-white">
            Keep our CP
          </button>
          <button type="button" onClick={endCouple} className="h-10 rounded-full bg-surface-2 text-[13px] font-bold text-cream ring-1 ring-line">
            Accept and end
          </button>
        </div>
      )}
    </div>
  );
}
