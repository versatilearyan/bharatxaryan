"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Sparkles } from "lucide-react";
import { GiftArt } from "@/components/art/GiftArt";
import { preloadSvga } from "@/components/effects/SvgaAnim";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin, formatCoins } from "@/components/ui/kit";
import { GIFTS, GIFTS_LIVE, GIFTS_SOON_TEXT, GIFT_CATEGORIES, giftById } from "@/lib/app/data";
import { ComingSoonBadge, SoonTag } from "@/components/ui/ComingSoonBadge";
import { GIFT_MESSAGE_MAX, useGiftNews } from "@/lib/app/gift-news-store";
import { useMarket } from "@/lib/app/market-store";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import type { GiftCategory, GiftId } from "@/lib/app/types";
import type { RoomSession } from "@/components/rooms/useRoomSession";

const QTY = [1, 5, 10, 99];

/** Gift store bottom sheet. All coins and costs are demo values. While GIFTS_LIVE is off, gifts can be browsed but not sent. */
export function GiftPanel({ open, onClose, s, initialTo }: { open: boolean; onClose: () => void; s: RoomSession; initialTo?: string }) {
  const { coins, setSheet, toast } = useApp();
  const { pkg, takePackage } = useMarket();
  const person = usePeople();
  const recipients = useMemo(() => {
    const seated = s.seatedIds.filter((id) => id !== ME_ID);
    return initialTo && initialTo !== ME_ID && !seated.includes(initialTo) ? [initialTo, ...seated] : seated;
  }, [s.seatedIds, initialTo]);
  const [to, setTo] = useState<string>(initialTo ?? recipients[0] ?? s.room.hostId);

  useEffect(() => {
    if (open && initialTo) setTo(initialTo);
  }, [open, initialTo]);
  const [cat, setCat] = useState<GiftCategory | "Package">(GIFT_CATEGORIES[0] ?? "Package");
  const [gift, setGift] = useState<GiftId>(GIFTS[0].id);
  const [qty, setQty] = useState(1);
  /** Big animated gifts are announced to all of Panchayat with this message. */
  const [message, setMessage] = useState("");
  const { announce } = useGiftNews();

  useEffect(() => {
    if (open && to !== ME_ID && !recipients.includes(to) && recipients[0]) setTo(recipients[0]);
  }, [open, recipients, to]);

  const isPkg = cat === "Package";
  const owned = (Object.keys(pkg) as GiftId[]).filter((id) => (pkg[id] ?? 0) > 0);
  const list = isPkg ? owned.map(giftById) : GIFTS.filter((g) => !g.packageOnly && g.categories.includes(cat)).sort((a, b) => a.cost - b.cost);
  const selected = giftById(gift);
  // Big SVGA gifts start downloading as soon as they're picked, so they play straight away when sent
  const svgaSrc = selected.svga?.src;
  useEffect(() => {
    if (open && svgaSrc) preloadSvga(svgaSrc).catch(() => undefined);
  }, [open, svgaSrc]);
  const total = selected.cost * qty;
  const have = pkg[gift] ?? 0;
  const canAfford = isPkg ? have >= qty : total <= coins;

  // Only Sunset Romance, Crystal Palace and Storm Guardian get a server notification
  const big = Boolean(selected.news);
  const sent = () => {
    if (big) announce({ fromId: ME_ID, toId: to, giftId: gift, count: qty, roomId: s.room.id, message });
    setMessage("");
    onClose();
  };
  const send = () => {
    if (!GIFTS_LIVE) return toast(GIFTS_SOON_TEXT);
    if (isPkg) {
      // Package gifts are free: they come out of your Bag
      if (!takePackage(gift, qty)) return toast(`You only have ${have} ${selected.name} in your package`, "error");
      s.sendGift(gift, to, qty, true);
      return sent();
    }
    if (s.sendGift(gift, to, qty)) sent();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Send a gift" className="!bg-[#17141b]" tall>
      {/* Recipients */}
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-3 pt-1" role="radiogroup" aria-label="Send to">
        {[ME_ID, ...(recipients.length ? recipients : s.room.hostId === ME_ID ? [] : [s.room.hostId])].map((id) => {
          const p = person(id);
          const on = to === id;
          return (
            <button key={id} type="button" role="radio" aria-checked={on} onClick={() => setTo(id)} className="flex w-14 shrink-0 flex-col items-center gap-1">
              <span className={`rounded-full p-0.5 ${on ? "bg-gradient-to-b from-gold to-coral" : ""}`}>
                <PersonAvatar person={{ ...p, frame: "none" }} size={44} />
              </span>
              <span className={`max-w-full truncate text-[10.5px] ${on ? "font-bold text-cream" : "text-muted"}`}>{id === ME_ID ? "Me" : p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Categories */}
      <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-line px-5" role="tablist" aria-label="Gift categories">
        {[...GIFT_CATEGORIES, "Package" as const].map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => {
              setCat(c);
              const first = c === "Package" ? owned[0] : GIFTS.find((g) => !g.packageOnly && g.categories.includes(c))?.id;
              if (first) setGift(first);
              setQty(1);
            }} className={`relative shrink-0 pb-2.5 text-[13px] font-semibold ${cat === c ? "text-cream" : "text-muted"}`}>
            {c}
            {cat === c ? <motion.span layoutId="gift-cat" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gold" /> : null}
          </button>
        ))}
      </div>

      {/* Grid */}
      <ul className="grid grid-cols-4 gap-2 px-4 py-3">
        {list.map((g) => {
          const on = g.id === gift;
          return (
            <li key={g.id}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setGift(g.id)}
                aria-pressed={on}
                className={`relative flex w-full flex-col items-center rounded-2xl px-1 pb-2 pt-2.5 ring-1 transition-colors ${on ? "bg-gold/10 ring-gold/60" : "ring-transparent hover:bg-cream/[0.04]"}`}
              >
                {!GIFTS_LIVE ? <SoonTag className="absolute left-1 top-1" /> : null}
                {g.tier === "legendary" ? (
                  <span className="absolute right-1.5 top-1.5 text-gold" title="Legendary">
                    <Sparkles className="h-3 w-3" aria-label="Legendary" />
                  </span>
                ) : null}
                <motion.span className="h-11 w-11" animate={on ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={{ duration: 0.8, repeat: on ? Infinity : 0 }}>
                  <GiftArt id={g.id} />
                </motion.span>
                <span className="mt-1.5 line-clamp-1 text-center text-[11px] font-semibold text-cream">{g.name}</span>
                {isPkg ? (
                  <span className="mt-0.5 text-[10.5px] font-bold text-[#7fe8dc]">Free · ×{pkg[g.id] ?? 0}</span>
                ) : (
                  <span className="mt-0.5 flex items-center gap-0.5 text-[10.5px] font-bold text-gold">
                    <Coin className="h-3 w-3" />
                    {g.cost.toLocaleString("en-IN")}
                  </span>
                )}
              </motion.button>
            </li>
          );
        })}
        {isPkg && list.length === 0 ? <li className="col-span-4 py-6 text-center text-[12.5px] text-muted">Your package is empty. Package gifts you get land here.</li> : null}
      </ul>

      {/* Footer */}
      <div className="sticky bottom-0 border-t border-line bg-[#17141b] px-4 py-3">
        {big && GIFTS_LIVE ? (
          <label className="mb-2.5 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b1fa8]/35 to-[#c2408f]/25 px-3 py-2 ring-1 ring-[#f6d899]/40">
            <Megaphone className="h-4 w-4 shrink-0 text-[#ffd98a]" aria-hidden />
            <span className="sr-only">Message for the server notification</span>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, GIFT_MESSAGE_MAX))}
              maxLength={GIFT_MESSAGE_MAX}
              placeholder="Write a message for everyone to see…"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-cream outline-none placeholder:text-cream/45"
            />
            <span className="shrink-0 text-[10.5px] tabular-nums text-muted">
              {message.length}/{GIFT_MESSAGE_MAX}
            </span>
          </label>
        ) : null}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSheet({ kind: "coins" })} className="flex items-center gap-1 rounded-full bg-cream/[0.06] px-2.5 py-1.5 text-[12px] font-bold text-cream" aria-label="Wallet">
            <Coin className="h-4 w-4" />
            {formatCoins(coins)}
          </button>
          <div className="ml-auto flex rounded-full bg-cream/[0.06] p-0.5" role="radiogroup" aria-label="Quantity">
            {QTY.map((q) => (
              <button key={q} type="button" role="radio" aria-checked={qty === q} onClick={() => setQty(q)} className={`h-7 min-w-8 rounded-full px-2 text-[11.5px] font-bold ${qty === q ? "bg-cream text-ink" : "text-cream/70"}`}>
                ×{q}
              </button>
            ))}
          </div>
        </div>
        {!GIFTS_LIVE ? (
          <div className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-cream/[0.06] ring-1 ring-line" role="status">
            <ComingSoonBadge className="border-0 bg-transparent">{GIFTS_SOON_TEXT}</ComingSoonBadge>
          </div>
        ) : (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={send}
          className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold ${
            canAfford ? (selected.tier === "legendary" ? "bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] text-[#2a1a0c]" : "bg-coral text-white") : "bg-cream/10 text-muted"
          }`}
        >
          Send {selected.name}
          {qty > 1 ? ` ×${qty}` : ""} to {to === ME_ID ? "myself" : person(to).name}
          {isPkg ? (
            <span className="rounded-full bg-black/15 px-2 py-0.5 text-[12px]">Free</span>
          ) : (
            <span className="flex items-center gap-0.5 rounded-full bg-black/15 px-2 py-0.5 text-[12px]">
              <Coin className="h-3.5 w-3.5" />
              {total.toLocaleString("en-IN")}
            </span>
          )}
        </motion.button>
        )}
        <p className="mt-2 text-center text-[10.5px] text-muted">{GIFTS_LIVE ? (big ? "Everyone in Panchayat sees a server notification for this gift." : "Tap Combo after sending to send it again.") : "You can look around now. Sending gifts opens soon."}</p>
      </div>
    </BottomSheet>
  );
}
