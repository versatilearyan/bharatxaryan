"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Gift, Heart, HeartCrack, Plus } from "lucide-react";
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
  const { pop, push } = useApp();
  const { coupleOf, endCouple, pending } = useMarket();
  const person = usePeople();
  const c = coupleOf(personId);
  const [gift, setGift] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [finding, setFinding] = useState(false);
  const [adding, setAdding] = useState(false);

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
    <div className="relative flex h-full flex-col bg-ink">
      <div className="app-scroll min-h-0 flex-1 pb-8">
        {/* Header: the two of them with the ring between */}
        <div className="relative h-[260px] overflow-hidden">
          <SunsetScene theme="rose" motif="lanterns" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-ink" />
          <div className="pt-safe absolute inset-x-0 top-0 flex items-center justify-between p-3">
            {back}
            <span className="font-display text-[17px] font-bold text-cream drop-shadow">Love Home</span>
            <span className="w-10" />
          </div>
          <div className="absolute inset-x-0 bottom-5 flex flex-col items-center">
            <div className="flex items-center">
              <PersonAvatar person={a} size={76} />
              <motion.span className="z-10 -mx-3" animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
                <RingArt id={c.ring} size={58} />
              </motion.span>
              <PersonAvatar person={b} size={76} />
            </div>
            <p className="mt-2 font-display text-[16px] font-bold text-cream">
              {a.id === ME_ID ? "You" : a.name} & {b.id === ME_ID ? "you" : b.name}
            </p>
            <p className="text-[13px] text-cream/80">
              Together for <b className="text-gold">{days}</b> {days === 1 ? "day" : "days"}
            </p>
          </div>
        </div>

        {/* Love level */}
        <section className="mx-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-display text-[16px] font-bold text-cream">
              <Heart className="h-4.5 w-4.5 fill-pink text-pink" aria-hidden /> Couple Lv {lv.level}
            </span>
            <span className="text-[12.5px] text-muted">
              {c.love.toLocaleString("en-IN")}
              {lv.next ? ` / ${lv.next.toLocaleString("en-IN")}` : ""} love
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream/10">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-pink to-gold" initial={{ width: 0 }} animate={{ width: `${lv.progress * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[11.5px] text-muted">Every coin of gifts between you adds 1 love. Rings add their full price.</p>
          {c.message ? <p className="mt-2 rounded-xl bg-black/25 px-3 py-2 text-[12.5px] italic text-cream/80">“{c.message}”</p> : null}
        </section>

        <BlessingsCard c={c} mine={mine} />

        {/* Ring box */}
        <section className="mx-4 mt-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <h2 className="font-display text-[16px] font-bold text-cream">
            Ring box <span className="text-[12px] font-semibold text-muted">· {c.rings.length}</span>
          </h2>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {c.rings.map((r, i) => (
              <span key={i} className="flex flex-col items-center rounded-xl bg-black/20 py-2" title={ringById(r).name}>
                <RingArt id={r} size={42} />
                <span className="line-clamp-1 px-1 text-[10px] font-semibold text-cream/70">{ringById(r).name}</span>
              </span>
            ))}
            {mine ? (
              <button type="button" onClick={() => setAdding(true)} aria-label="Add a ring" className="flex min-h-[74px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold/50 text-gold">
                <Plus className="h-5 w-5" aria-hidden />
                <span className="text-[10px] font-bold">Add ring</span>
              </button>
            ) : null}
          </div>
          {mine ? <p className="mt-2 text-[11.5px] text-muted">Keep adding rings to your box. Each one adds its full price as love.</p> : null}
        </section>

        {mine ? (
          <section className="mx-4 mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setGift(true)} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-gold text-[13.5px] font-bold text-ink">
                <Gift className="h-4 w-4" aria-hidden /> Send a gift
              </button>
              <button type="button" onClick={() => setAdding(true)} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-surface text-[13.5px] font-bold text-cream ring-1 ring-line">
                💍 Add a ring
              </button>
            </div>
            {confirm ? (
              <div className="rounded-2xl bg-[#3a1418] p-3 text-center">
                <p className="text-[13px] text-cream">End your CP with {partner.name}? Your love level and ring box will be lost.</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setConfirm(false)} className="h-10 flex-1 rounded-full bg-white/10 text-[13px] font-bold text-cream">
                    Keep
                  </button>
                  <button type="button" onClick={() => (endCouple(), pop())} className="h-10 flex-1 rounded-full bg-[#f4515b] text-[13px] font-bold text-white">
                    End CP
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] font-semibold text-cream/55 hover:text-cream">
                <HeartCrack className="h-4 w-4" aria-hidden /> End relationship
              </button>
            )}
          </section>
        ) : null}
      </div>
      {mine ? <ProfileGiftSheet open={gift} onClose={() => setGift(false)} toId={partner.id} /> : null}
      {mine ? <AddRingSheet open={adding} onClose={() => setAdding(false)} partnerName={partner.name} /> : null}
    </div>
  );
}

/** Blessings from friends: a count, who sent them, and a way for others to bless. */
function BlessingsCard({ c, mine }: { c: Couple; mine: boolean }) {
  const { bless, blessingsOf } = useMarket();
  const person = usePeople();
  const { count, people } = blessingsOf(c);
  const named = people.slice(0, 3);
  return (
    <section className="mx-4 mt-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px] font-bold text-cream">
          🙏 Blessings <span className="text-[12px] font-semibold text-muted">· {count.toLocaleString("en-IN")}</span>
        </h2>
        {people.length ? (
          <span className="flex">
            {people.slice(0, 5).map((id, i) => (
              <span key={id} className={i ? "-ml-2" : ""}>
                <PersonAvatar person={{ ...person(id), frame: "none" }} size={26} />
              </span>
            ))}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[11.5px] text-muted">
        {named.length
          ? `${named.map((id) => (id === ME_ID ? "You" : person(id).name)).join(", ")}${count > named.length ? ` and ${(count - named.length).toLocaleString("en-IN")} more` : ""} blessed this couple.`
          : "No blessings yet."}
        {` Each blessing adds ${BLESSING_COST} love.`}
      </p>
      {mine ? null : (
        <button type="button" onClick={() => bless(c.id)} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-pink to-gold text-[13.5px] font-bold text-white">
          🙏 Bless this couple · <Coin className="h-3.5 w-3.5" /> {BLESSING_COST}
        </button>
      )}
    </section>
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
