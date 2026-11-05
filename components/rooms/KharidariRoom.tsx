"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Gavel, Mic, MicOff, Plus, Timer, Volume2, VolumeX } from "lucide-react";
import { GiftArt } from "@/components/art/GiftArt";
import { GiftPanel } from "@/components/gifts/GiftPanel";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin, IconButton } from "@/components/ui/kit";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import { GIFTS, GIFTS_LIVE, GIFTS_SOON_TEXT, giftById } from "@/lib/app/data";
import { DECLARATIONS, DECLARATION_MAX, ORDINARY_OFFERS, RELATIONSHIPS, TOKENS, relationshipById, tagLevel, type RelationshipId } from "@/lib/app/tags";
import { RelationIcon } from "@/components/art/RelationIcon";
import type { GiftId } from "@/lib/app/types";
import { ChatInput, EmojiButton, EmojiSheet, GiftButton, InviteSheet, Pair, RoomChat, RoomMenuSheet, RoomTopBar, Seat } from "./RoomParts";
import { TagPairArt, useTagTitle } from "./TagParts";
import { START_GIFTS, type Auction, type AuctionMode } from "./useAuction";
import type { RoomSession } from "./useRoomSession";

/**
 * Kharidari (auction) mode. Someone sits on the auction seat in the middle of the
 * stage and declares the tag they want; the owner or an admin picks Ordinary bidding
 * or BFF and a starting price gift, and the room bids with gifts. In BFF the winner
 * gets a tag.
 */
export function KharidariRoom({ s, a }: { s: RoomSession; a: Auction }) {
  const { leaveRoom, coins, tagBetween } = useApp();
  const person = usePeople();
  const tagTitle = useTagTitle();
  const [sheet, setSheet] = useState<null | "gift" | "bid-gift" | "emoji" | "menu" | "invite" | "seat-item" | "setup" | "declare">(null);
  const [draft, setDraft] = useState("");
  const close = () => setSheet(null);
  const item = a.itemId ? person(a.itemId) : null;
  const owner = person(s.room.hostId);
  const bidding = a.phase === "bidding";
  const iAmItem = a.itemId === ME_ID;
  const rel = relationshipById(a.relation);
  const startGift = a.startGift ? giftById(a.startGift) : null;
  const wonTag = a.phase === "sold" && a.winner && a.itemId && a.tagResult && a.tagResult.kind !== "full" && a.tagResult.kind !== "taken" ? tagBetween(a.winner.id, a.itemId) : null;
  const toLead = Math.max(a.startPrice, (a.top && a.top.id !== ME_ID ? a.top.total + 1 : 0)) - a.myTotal;
  // The starting gift and the next two up, plus a big one to jump ahead
  const affordableUp = GIFTS.filter((g) => g.cost >= Math.min(a.startPrice, 999));
  const quickGifts = [...affordableUp.slice(0, 3), affordableUp.find((g) => g.cost >= 999 && !affordableUp.slice(0, 3).includes(g)) ?? affordableUp[3]].filter(Boolean);
  // Eight numbered seats in pairs (a ninth only shows if someone is sitting on it)
  const seatIdx = s.seats.map((_, i) => i).filter((i) => i > 0 && (i <= 8 || s.seats[i]));

  const onAuctionSeat = () => {
    if (iAmItem) {
      if (bidding) s.openCard(ME_ID);
      else setSheet("declare");
      return;
    }
    if (a.itemId) {
      s.openCard(a.itemId);
      return;
    }
    if (a.phase !== "idle") return;
    if (s.canModerate) setSheet("seat-item");
    else a.sitOnAuction(ME_ID);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={{ background: "radial-gradient(120% 60% at 50% 0%, #4b2a8f 0%, #2a1752 45%, #160d2c 100%)" }}>
      {/* Stage lights */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-60" aria-hidden style={{ background: "conic-gradient(from 200deg at 50% -10%, transparent 0deg, #a98bff33 20deg, transparent 40deg, #a98bff22 60deg, transparent 80deg)" }} />

      <RoomTopBar s={s} onMenu={() => setSheet("menu")} onLeave={leaveRoom} />

      {/* Owner + mode + timer */}
      <div className="relative z-10 flex items-center gap-2 px-3">
        <Seat s={s} index={0} size={38} />
        <div className="min-w-0 flex-1 self-start pt-0.5">
          <p className="flex items-center gap-1.5 font-display text-[15px] font-extrabold text-cream">
            <Gavel className="h-4 w-4 text-gold" aria-hidden /> Kharidari
          </p>
          <div className="mt-0.5 flex gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bidding ? "bg-[#7b5cff] text-white" : "bg-white/10 text-cream/70"}`}>{bidding ? "Bidding" : a.phase === "sold" ? "Sold" : "Waiting"}</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-cream/70">{a.mode === "bff" ? "BFF" : "Ordinary bidding"}</span>
          </div>
        </div>
        {bidding ? (
          <span className="flex items-center gap-1 self-start rounded-full bg-black/35 px-2.5 py-1 text-[12px] font-extrabold text-cream" role="timer">
            <Timer className="h-3.5 w-3.5 text-gold" aria-hidden /> {a.secondsLeft}s
          </span>
        ) : null}
        <span className="sr-only">Owner {owner.name}</span>
      </div>

      {/* Stage */}
      <div className="relative z-10 mx-3 mt-1.5 rounded-3xl bg-black/25 px-2.5 pb-2 pt-2.5 ring-1 ring-[#a98bff]/25">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Tag declaration, set by the person on the auction seat */}
          <button
            type="button"
            onClick={() => (iAmItem && !bidding ? setSheet("declare") : undefined)}
            className={`flex h-[78px] flex-col items-center justify-center rounded-2xl bg-white/[0.06] px-1.5 text-center ring-1 ring-white/10 ${iAmItem && !bidding ? "ring-gold/60" : ""}`}
            aria-label={a.mode === "bff" ? `Tag: ${rel.label}${a.declaration ? `. ${a.declaration}` : ""}${iAmItem && !bidding ? ". Edit your declaration" : ""}` : `On offer: ${a.offer}`}
          >
            {a.mode === "bff" ? (
              <>
                <span className="flex items-center gap-1 font-display text-[13px] font-extrabold text-cream">
                  <RelationIcon id={a.relation} size={20} /> {rel.label}
                </span>
                <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-cream/65">{a.declaration ? `“${a.declaration}”` : iAmItem ? "Tap to write your declaration" : "No declaration yet"}</span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-semibold text-cream/60">On offer</span>
                <span className="font-display text-[13px] font-extrabold leading-tight text-cream">{a.offer}</span>
              </>
            )}
          </button>
          <div className="flex flex-col items-center">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onAuctionSeat}
              aria-label={item ? `${item.id === ME_ID ? "You are" : `${item.name} is`} on the auction seat` : "Empty auction seat"}
              className="relative grid h-[68px] w-[68px] place-items-center rounded-full border-2 border-gold/60 bg-black/30 shadow-[0_0_26px_-4px_rgb(169_139_255/0.7)]"
            >
              {item ? <PersonAvatar person={item} size={60} speaking={s.speakingIds.includes(item.id)} /> : <Plus className="h-6 w-6 text-cream/70" />}
            </motion.button>
            <span className="mt-1 max-w-[90px] truncate text-[11.5px] font-bold text-cream">{item ? (item.id === ME_ID ? "You" : item.name) : s.canModerate ? "Seat someone" : "Tap to sit"}</span>
          </div>
          {bidding || a.phase === "sold" ? (
            <StageCard label="Top gift volume" value={(a.top?.total ?? 0).toLocaleString("en-IN")} coin />
          ) : (
            <StageCard label="Starting price" value={startGift ? `${startGift.cost.toLocaleString("en-IN")}` : "Not set"} gift={startGift?.id} />
          )}
        </div>

        {/* Status */}
        <div className="mt-2 rounded-2xl bg-black/30 px-3 py-1.5">
          {bidding ? (
            <>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="font-bold text-cream">{a.top ? (a.top.id === ME_ID ? "You lead 👑" : `${person(a.top.id).name} leads`) : "No bids yet"}</span>
                <span className="text-cream/60">Biggest gift volume wins</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-[#a98bff] to-gold" animate={{ width: `${Math.min(100, (a.secondsLeft * 1000 * 100) / a.roundMs)}%` }} transition={{ duration: 0.5 }} />
              </div>
            </>
          ) : a.phase === "sold" && a.winner ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
              {wonTag ? (
                <div className="flex items-center gap-2">
                  <TagPairArt tag={wonTag} size={30} />
                  <p className="min-w-0 flex-1 text-left text-[12px] font-extrabold leading-tight text-gold">
                    {a.tagResult?.kind === "new" ? "New tag! " : "Tag renewed! "}
                    {a.itemId === ME_ID ? "You are" : `${person(a.itemId!).name} is`} now {tagTitle(wonTag, a.winner.id)}
                    <span className="block text-[10.5px] font-semibold text-cream/65">
                      {a.winner.total.toLocaleString("en-IN")} of gifts · Lv{tagLevel(wonTag.intimacy).level}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-[12px] font-bold text-gold">
                  🎉 {a.winner.id === ME_ID ? "You" : person(a.winner.id).name} won {a.mode === "bff" ? (item ? (item.id === ME_ID ? "you" : item.name) : "") : `“${a.offer}”`} with {a.winner.total.toLocaleString("en-IN")} of gifts
                  {a.tagResult?.kind === "full" ? <span className="block text-[10.5px] font-semibold text-cream/70">An intimate space is full, so no tag was formed.</span> : null}
                  {a.tagResult?.kind === "taken" ? <span className="block text-[10.5px] font-semibold text-cream/70">One of them already has this tag type, so no tag was formed.</span> : null}
                </p>
              )}
            </motion.div>
          ) : (
            <p className="text-center text-[11.5px] text-cream/75">
              {!item
                ? "Waiting for someone to sit on the auction seat"
                : iAmItem
                  ? a.declaration
                    ? "Declared! Waiting for the owner to start the bidding."
                    : "You're up! Tap your tag card to set your declaration."
                  : s.canModerate
                    ? startGift
                      ? "All set. Start when the room is ready."
                      : "Open Settings to pick the mode and starting price gift."
                    : "The owner will start the bidding soon"}
            </p>
          )}
        </div>

        {/* Top bidders */}
        <div className="mt-1.5 flex items-center gap-1.5" aria-label="Top bidders">
          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-r from-[#f6d899] to-[#c9954a] px-1.5 py-0.5 text-[9.5px] font-extrabold text-[#2a1a0c]">
            <Crown className="h-3 w-3" aria-hidden /> TOP
          </span>
          {[0, 1, 2].map((i) => {
            const b = a.bids[i];
            return (
              <span key={i} className="flex min-w-0 flex-1 items-center gap-1 rounded-full bg-white/[0.06] py-0.5 pl-0.5 pr-2">
                {b ? <PersonAvatar person={{ ...person(b.id), frame: "none" }} size={20} /> : <span className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-cream/25 text-[9px] font-bold text-cream/40">{i + 1}</span>}
                <span className="min-w-0 truncate text-[10.5px] font-bold text-gold">{b ? b.total.toLocaleString("en-IN") : "—"}</span>
              </span>
            );
          })}
        </div>

        {/* Owner and admin controls */}
        {s.canModerate ? (
          <div className="mt-1.5 flex gap-2">
            {bidding ? (
              <button type="button" onClick={a.endNow} className="h-8 flex-1 rounded-full bg-white/10 text-[12px] font-bold text-cream">
                End bidding now
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setSheet("setup")} disabled={a.phase === "sold"} className="h-8 flex-1 rounded-full bg-white/10 text-[12px] font-bold text-cream disabled:opacity-40">
                  Settings
                </button>
                <button type="button" onClick={() => a.start()} disabled={!item || a.phase === "sold"} className="h-8 flex-1 rounded-full bg-gradient-to-r from-[#f6d899] to-[#c9954a] text-[12px] font-extrabold text-[#2a1a0c] disabled:opacity-40">
                  Start Kharidari
                </button>
              </>
            )}
          </div>
        ) : null}
        {iAmItem && !bidding && a.phase !== "sold" ? (
          <div className="mt-1.5 flex gap-2">
            <button type="button" onClick={() => setSheet("declare")} className="h-8 flex-1 rounded-full bg-gradient-to-r from-[#7b5cff] to-[#a98bff] text-[12px] font-extrabold text-white">
              Tag declaration
            </button>
            <button type="button" onClick={a.leaveAuction} className="h-8 rounded-full bg-white/10 px-3 text-[12px] font-bold text-cream">
              Leave seat
            </button>
          </div>
        ) : null}
      </div>

      {/* Numbered seats in pairs: tagged people sitting side by side show their tag */}
      <div className="relative z-10 mt-2 grid grid-cols-2 justify-items-center gap-y-1.5 px-2">
        {seatIdx
          .filter((_, k) => k % 2 === 0)
          .map((i, k) => (
            <Pair key={i} s={s} a={i} b={seatIdx[k * 2 + 1]} size={40} gap={24} gold={false} linked={false} numbered />
          ))}
      </div>

      <RoomChat s={s} className="relative z-10 min-h-[64px] flex-1 pb-1.5" />

      {/* Bid bar: bids are gifts sent to the auction seat */}
      <AnimatePresence>
        {bidding && a.itemId && !iAmItem ? (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative z-10 border-t border-white/10 bg-[#1d1140]/95 px-2.5 pb-1.5 pt-1">
            <div className="flex items-center justify-between text-[10.5px] text-cream/70">
              <span>
                Your gifts <b className="text-cream">{a.myTotal.toLocaleString("en-IN")}</b>
              </span>
              <span>{a.top?.id === ME_ID ? <b className="text-gold">You lead 👑</b> : <>To lead <b className="text-cream">+{toLead.toLocaleString("en-IN")}</b></>}</span>
              <span className="flex items-center gap-1">
                <Coin className="h-3 w-3" /> {coins.toLocaleString("en-IN")}
              </span>
            </div>
            {!GIFTS_LIVE ? <p className="mt-1 text-center text-[11px] font-bold text-gold">{GIFTS_SOON_TEXT}: bidding with gifts opens soon</p> : null}
            <div className={`mt-1 flex gap-1.5 ${GIFTS_LIVE ? "" : "opacity-50"}`}>
              {quickGifts.map((g) => (
                <motion.button
                  key={g.id}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => a.bid(g.id)}
                  className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-to-b from-[#7b5cff] to-[#5a3fd0] px-1 text-[11px] font-extrabold text-white"
                  aria-label={`Bid with ${g.name}, ${g.cost} coins`}
                >
                  <span className="h-5 w-5">
                    <GiftArt id={g.id} />
                  </span>
                  {g.cost.toLocaleString("en-IN")}
                </motion.button>
              ))}
              <button type="button" onClick={() => setSheet("bid-gift")} className="h-9 rounded-xl bg-white/10 px-2.5 text-[11px] font-bold text-cream">
                More
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Controls */}
      <div className="pb-safe relative z-10 shrink-0 border-t border-white/10 bg-[#140b29]/95 backdrop-blur">
        <div className="flex items-center gap-1.5 px-2.5 py-2">
          <IconButton label={s.speakerOn ? "Turn speaker off" : "Turn speaker on"} onClick={s.toggleSpeaker}>
            {s.speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-muted" />}
          </IconButton>
          <IconButton label={s.muted ? "Unmute microphone" : "Mute microphone"} onClick={s.toggleMute} active={s.seated && !s.muted}>
            {s.seated && !s.muted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-muted" />}
          </IconButton>
          <ChatInput s={s} value={draft} setValue={setDraft} />
          <EmojiButton onClick={() => setSheet("emoji")} />
          <GiftButton onClick={() => setSheet("gift")} />
        </div>
      </div>

      <GiftPanel open={sheet === "gift"} onClose={close} s={s} />
      <GiftPanel open={sheet === "bid-gift"} onClose={close} s={s} initialTo={a.itemId ?? undefined} />
      <EmojiSheet open={sheet === "emoji"} onClose={close} s={s} onInsert={(e) => setDraft((d) => d + e)} />
      <InviteSheet open={sheet === "invite"} onClose={close} roomName={s.room.name} roomId={s.room.server?.id} roomCode={s.room.code} />
      <RoomMenuSheet open={sheet === "menu"} onClose={close} s={s} onInvite={() => setSheet("invite")} />

      {/* Owner: pick who sits on the auction seat */}
      <BottomSheet open={sheet === "seat-item"} onClose={close} title="Auction seat">
        <ul className="px-5 pb-5">
          {/* The owner's seat is fixed, so the owner is never offered for the auction seat */}
          {[...(s.isOwner ? [] : [ME_ID]), ...s.seatedIds.filter((id) => id !== ME_ID && id !== s.room.hostId), ...s.listenerIds].map((id) => {
            const p = person(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    a.sitOnAuction(id);
                    close();
                  }}
                  className="flex w-full items-center gap-3 py-2 text-left"
                >
                  <PersonAvatar person={p} size={40} />
                  <span className="flex-1 text-[14px] font-semibold text-cream">{id === ME_ID ? "Me" : p.name}</span>
                  <span className="rounded-full bg-[#7b5cff] px-3 py-1 text-[12px] font-bold text-white">Seat</span>
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      {/* Owner and admins: Kharidari settings */}
      <KharidariSettings open={sheet === "setup"} onClose={close} a={a} />
      {/* The person on the auction seat: tag declaration */}
      <DeclarationSheet open={sheet === "declare"} onClose={close} a={a} />
    </div>
  );
}

/** The person on the auction seat picks the tag they want and writes a short declaration. */
function DeclarationSheet({ open, onClose, a }: { open: boolean; onClose: () => void; a: Auction }) {
  const [relation, setRelation] = useState<RelationshipId>(a.relation);
  const [text, setText] = useState(a.declaration);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRelation(a.relation);
      setText(a.declaration);
    }
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="Tag declaration">
      <div className="px-5 pb-6">
        {a.mode === "bff" ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">The tag you want</p>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tag">
              {RELATIONSHIPS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={relation === r.id}
                  onClick={() => setRelation(r.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] font-extrabold ${relation === r.id ? "bg-white/[0.12] text-cream" : "bg-white/[0.04] text-cream/70"}`}
                  style={relation === r.id ? { boxShadow: `inset 0 0 0 1.5px ${r.tint}` } : undefined}
                >
                  <RelationIcon id={r.id} size={34} />
                  {r.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[12px] text-muted">This round is Ordinary bidding, so no tag is formed. Your declaration still shows to bidders.</p>
        )}
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Your declaration</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, DECLARATION_MAX))}
          rows={2}
          aria-label="Your declaration"
          placeholder="Tell bidders why they should win you…"
          className="mt-2 w-full resize-none rounded-2xl bg-white/[0.06] px-3.5 py-2.5 text-[14px] text-cream placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#a98bff]"
        />
        <p className="text-right text-[10.5px] text-muted">
          {text.length}/{DECLARATION_MAX}
        </p>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {DECLARATIONS.map((d) => (
            <button key={d} type="button" onClick={() => setText(d)} className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1.5 text-[11.5px] text-cream/80">
              {d}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            a.declare(relation, text);
            onClose();
          }}
          className="mt-5 h-12 w-full rounded-full bg-gradient-to-r from-[#7b5cff] to-[#a98bff] text-[16px] font-extrabold text-white"
        >
          Confirm
        </button>
      </div>
    </BottomSheet>
  );
}

function StageCard({ label, value, coin, gift }: { label: string; value: string; coin?: boolean; gift?: GiftId }) {
  return (
    <div className="flex h-[78px] flex-col items-center justify-center rounded-2xl bg-white/[0.06] px-1 text-center ring-1 ring-white/10">
      <span className="text-[10.5px] font-semibold text-cream/60">{label}</span>
      {gift ? (
        <span className="h-7 w-7">
          <GiftArt id={gift} />
        </span>
      ) : null}
      <span className="mt-0.5 flex items-center gap-1 font-display text-[14px] font-extrabold leading-tight text-cream">
        {coin || gift ? <Coin className="h-3.5 w-3.5" /> : null}
        {value}
      </span>
    </div>
  );
}

/**
 * Kharidari settings, as in WePlay: Ordinary bidding or BFF, what's on offer
 * (Ordinary), and a starting price gift. The tag itself is declared by the person
 * on the auction seat.
 */
function KharidariSettings({ open, onClose, a }: { open: boolean; onClose: () => void; a: Auction }) {
  const [mode, setMode] = useState<AuctionMode>(a.mode);
  const [offer, setOffer] = useState(a.offer);
  const [startGift, setStartGift] = useState<GiftId | null>(a.startGift);
  const [picking, setPicking] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  // Reload the current settings each time the sheet opens
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMode(a.mode);
      setOffer(a.offer);
      setStartGift(a.startGift);
      setPicking(false);
    }
  }
  const g = startGift ? giftById(startGift) : null;
  const confirm = () => {
    a.configure({ mode, offer, startGift });
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Settings">
      <div className="px-5 pb-6">
        <div className="grid grid-cols-2 rounded-full bg-black/40 p-1" role="radiogroup" aria-label="Bidding mode">
          {(["ordinary", "bff"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`h-10 rounded-full text-[14px] font-extrabold ${mode === m ? "bg-white/20 text-white" : "text-cream/55"}`}>
              {m === "bff" ? "BFF" : "Ordinary bidding"}
            </button>
          ))}
        </div>

        {mode === "bff" ? (
          <p className="mt-3 rounded-2xl bg-white/[0.05] px-3 py-2.5 text-[12px] text-cream/75">
            The person on the auction seat picks the tag (Bro and sis, Besties, Bro, Confidant, Apprentice or Sibling) and writes a declaration. The winner and that person become a tag.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="On offer">
              {ORDINARY_OFFERS.map((o) => (
                <button key={o} type="button" role="radio" aria-checked={offer === o} onClick={() => setOffer(o)} className={`h-10 rounded-full px-3.5 text-[13px] font-bold ${offer === o ? "bg-white text-[#1c1b22]" : "bg-white/[0.08] text-cream/80"}`}>
                  {o}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] text-muted">Ordinary bidding doesn&apos;t form a tag. The winner gets what&apos;s on offer.</p>
          </>
        )}

        <p className="mt-5 flex items-center gap-1.5 font-display text-[16px] font-extrabold text-cream">
          Starting Price
          <span className="text-[11px] font-semibold text-muted">· bids must reach this gift&apos;s value</span>
        </p>
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            aria-label={g ? `Starting price: ${g.name}, ${g.cost} coins. Change` : "Pick a starting price gift"}
            className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-white/15"
          >
            {g ? (
              <span className="flex flex-col items-center">
                <span className="h-10 w-10">
                  <GiftArt id={g.id} />
                </span>
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-gold">
                  <Coin className="h-3 w-3" /> {g.cost}
                </span>
              </span>
            ) : (
              <Plus className="h-7 w-7 text-cream/70" />
            )}
          </button>
          {mode === "bff" ? (
            <div className="flex-1 text-center">
              <div className="flex justify-around text-[26px]" aria-hidden>
                {TOKENS.map((t) => (
                  <span key={t.id} title={t.label}>
                    {t.emoji}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[11.5px] font-semibold text-cream/75">You can unlock any token if the bidding succeeds.</p>
              <p className="text-[10.5px] text-muted">{TOKENS.map((t) => `${t.label} ${t.min ? `${t.min.toLocaleString("en-IN")}+` : "any"}`).join(" · ")}</p>
            </div>
          ) : null}
        </div>
        {picking ? (
          <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Starting price gift">
            {START_GIFTS.map((id) => {
              const x = giftById(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={startGift === id}
                  onClick={() => {
                    setStartGift(id);
                    setPicking(false);
                  }}
                  className={`flex flex-col items-center rounded-xl py-2 ${startGift === id ? "bg-gold/20 ring-1 ring-gold" : "bg-white/[0.05]"}`}
                >
                  <span className="h-9 w-9">
                    <GiftArt id={id} />
                  </span>
                  <span className="text-[11px] font-semibold text-cream">{x.name}</span>
                  <span className="flex items-center gap-0.5 text-[10.5px] font-bold text-gold">
                    <Coin className="h-3 w-3" /> {x.cost}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <button type="button" onClick={confirm} disabled={!startGift} className="mt-5 h-12 w-full rounded-full bg-gradient-to-r from-[#7b5cff] to-[#a98bff] text-[16px] font-extrabold text-white disabled:opacity-40">
          Confirm
        </button>
        <p className="mt-3 text-[11.5px] text-muted">
          Bids are gifts sent to the person on the auction seat. Each gift adds to your gift volume and isn&apos;t refunded. The biggest gift volume when the 45 second timer ends wins.
        </p>
      </div>
    </BottomSheet>
  );
}
