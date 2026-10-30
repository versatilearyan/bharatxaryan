"use client";

import { useState, type ReactNode } from "react";
import { Clock, ShoppingBag } from "lucide-react";
import { GiftArt } from "@/components/art/GiftArt";
import { RingArt } from "@/components/art/RingArt";
import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { VipBubbleArt, VipEntryBanner, VipFrame } from "@/components/effects/VipFx";
import { FindCpSheet } from "@/components/profile/UserProfile";
import { RedPacketArt } from "@/components/redpacket/RedPacket";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { ScreenHeader } from "@/components/ui/kit";
import { GIFTS_LIVE, GIFTS_SOON_TEXT, giftById } from "@/lib/app/data";
import { giftSetById, type EffectSet, type GiftSet } from "@/lib/app/effects";
import { bubbleById, timeLeft, type BubbleId, type Ring } from "@/lib/app/market";
import { useMarket } from "@/lib/app/market-store";
import { usePeople } from "@/lib/app/people";
import { RED_PACKETS, type RedPacketId } from "@/lib/app/redpacket";
import { useRedPackets } from "@/lib/app/redpacket-store";
import { ME_ID, useApp } from "@/lib/app/store";
import type { GiftId } from "@/lib/app/types";

/** One thing in the Bag, ready to draw as a tile and act on from its detail sheet. */
type Entry = {
  key: string;
  name: string;
  kind: string;
  art: ReactNode;
  /** Time-left text, or "Permanent". */
  badge: string;
  count?: number;
  inUse?: boolean;
  source?: string;
  tint: string;
  /** Wear / take off for decorations; a use action for items. */
  action?: { label: string; run: () => void; off?: boolean };
  note?: string;
};

const short = (expiresAt: number, now: number) => timeLeft(expiresAt, now).replace(" left", "");
const DECOR_TINT = "from-[#3a2d6b] to-[#211a3d]";
const ITEM_TINT = "from-[#12475a] to-[#0f2630]";
const GIFT_TINT = "from-[#5a3a12] to-[#2a1c0c]";

/** Everything you own: decorations to wear or take off, and items to use. */
export function BagScreen() {
  const { pop, push, activeRoomId, expandRoom, setTab, toast } = useApp();
  const m = useMarket();
  const { bag, now, wearAnimFrame, wearBubble, wearEntry, wearPage, equip, worn, vipSets, giftSets, ringsInBag, myCouple, giveRing, pkg } = m;
  const { owned, openSend } = useRedPackets();
  const [finding, setFinding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const person = usePeople();
  const me = person(ME_ID);

  /* ---- Decorations ---- */
  const bubbleEntry = (id: BubbleId, expiresAt: number, source: string): Entry => {
    const b = bubbleById(id);
    const on = !worn.bubble && equip.bubble === id;
    return {
      key: `bubble-${id}`,
      name: b.name,
      kind: "Chat bubble",
      art: <span className={`rounded-2xl px-2.5 py-1 text-[11px] font-semibold ${b.className}`}>Namaste!</span>,
      badge: short(expiresAt, now),
      inUse: on,
      source,
      tint: DECOR_TINT,
      action: on ? { label: "Take off", run: () => wearBubble(null), off: true } : { label: "Wear", run: () => wearBubble(id) },
    };
  };

  /**
   * A set's pieces you can wear or take off: frame, chat bubble and entry.
   * The VIP badge isn't here: it's always on while you're VIP.
   */
  const setEntries = (set: EffectSet, tag: string, source: string): Entry[] => {
    const tint = set.tint;
    const frameOn = worn.frame?.id === set.id;
    const bubbleOn = worn.bubble?.id === set.id;
    const entryOn = worn.entry?.id === set.id;
    const list: Entry[] = [
      {
        key: `${set.id}-frame`,
        name: `${tag} Frame`,
        kind: "Animated frame",
        art: (
          <VipFrame set={set} size={42} className="my-4">
            <PersonAvatar person={{ ...me, frame: "none" }} size={42} />
          </VipFrame>
        ),
        badge: "Permanent",
        inUse: frameOn,
        source,
        tint,
        action: frameOn ? { label: "Take off", run: () => wearAnimFrame(null), off: true } : { label: "Wear", run: () => wearAnimFrame(set.id) },
      },
      {
        key: `${set.id}-bubble`,
        name: `${tag} Bubble`,
        kind: "Chat bubble",
        art: (
          <span className="relative flex h-[30px] w-[86px] items-center justify-center text-[11px] font-semibold text-white">
            <VipBubbleArt set={set} />
            <span className="relative">Namaste!</span>
          </span>
        ),
        badge: "Permanent",
        inUse: bubbleOn,
        source,
        tint,
        action: bubbleOn ? { label: "Take off", run: () => wearBubble(null), off: true } : { label: "Wear", run: () => wearBubble(set.id) },
      },
      {
        key: `${set.id}-entry`,
        name: `${tag} Entry`,
        kind: "Entry effect",
        art: <VipEntryBanner set={set} className="w-[96px]" />,
        badge: "Permanent",
        inUse: entryOn,
        source,
        tint,
        note: "Plays with your name when you enter a room.",
        action: entryOn ? { label: "Take off", run: () => wearEntry(null), off: true } : { label: "Wear", run: () => wearEntry(set.id) },
      },
    ];
    return list;
  };

  /** A gift set has the three pieces plus a profile page effect. */
  const giftSetEntries = (set: GiftSet): Entry[] => {
    const source = `Sending ${set.name}`;
    const pageOn = worn.page?.id === set.id;
    return [
      ...setEntries(set, set.name, source),
      {
        key: `${set.id}-page`,
        name: `${set.name} Profile Effect`,
        kind: "Profile effect",
        art: (
          <span className="relative block h-[70px] w-[64px] overflow-hidden rounded-lg bg-black/30">
            <SvgaAnim src={set.page} className="absolute inset-x-0 top-0 w-full" style={{ aspectRatio: set.pageRatio }} />
          </span>
        ),
        badge: "Permanent",
        inUse: pageOn,
        source,
        tint: set.tint,
        note: "Plays across the top of your profile.",
        action: pageOn ? { label: "Take off", run: () => wearPage(null), off: true } : { label: "Wear", run: () => wearPage(set.id) },
      },
    ];
  };

  const decorations: Entry[] = [...giftSets.map(giftSetById).flatMap(giftSetEntries), ...vipSets.flatMap((s) => setEntries(s, `VIP ${s.level}`, `VIP ${s.level} reward`))];
  bag.forEach((b) => b.kind === "bubble" && b.expiresAt > now && decorations.push(bubbleEntry(b.bubble, b.expiresAt, b.source)));
  // Things you're using first, like a wardrobe
  decorations.sort((a, b) => Number(Boolean(b.inUse)) - Number(Boolean(a.inUse)));

  /* ---- Items ---- */
  const sendPacket = (id: RedPacketId) => {
    setOpen(null);
    if (!activeRoomId) {
      toast("Join a room first, then send your red packet there");
      pop();
      setTab("rooms");
      return;
    }
    expandRoom();
    openSend(id);
  };
  const ringAction = (ring: Ring) =>
    myCouple
      ? { label: `Give to ${person(myCouple.a === ME_ID ? myCouple.b : myCouple.a).name}`, run: () => giveRing(ring.id) }
      : { label: "💍 Propose", run: () => (setOpen(null), setFinding(true)) };

  const items: Entry[] = [
    ...RED_PACKETS.filter((p) => (owned[p.id] ?? 0) > 0).map<Entry>((p) => ({
      key: `packet-${p.id}`,
      name: `${p.label} ${p.name}`,
      kind: "Red packet",
      art: <RedPacketArt id={p.id} size={46} />,
      badge: "Permanent",
      count: owned[p.id],
      tint: "from-[#6b1a1a] to-[#2a0c0c]",
      note: `${p.amount.toLocaleString("en-IN")} coins for the room to loot. Pick a cover and when the rain starts when you send it.`,
      action: { label: "Send in a room", run: () => sendPacket(p.id) },
    })),
    ...ringsInBag.map<Entry>(({ ring, count }) => ({
      key: `ring-${ring.id}`,
      name: ring.name,
      kind: "Wedding ring",
      art: <RingArt id={ring.id} size={58} />,
      badge: "Permanent",
      count,
      tint: ITEM_TINT,
      note: `Adds ${ring.price.toLocaleString("en-IN")} love when given.`,
      action: ringAction(ring),
    })),
    ...(Object.keys(pkg) as GiftId[])
      .filter((id) => (pkg[id] ?? 0) > 0)
      .map<Entry>((id) => ({
        key: `gift-${id}`,
        name: giftById(id).name,
        kind: "Package gift",
        art: (
          <span className="h-12 w-12">
            <GiftArt id={id} />
          </span>
        ),
        badge: "Permanent",
        count: pkg[id],
        tint: GIFT_TINT,
        note: GIFTS_LIVE ? "Free to send: in a room, open Gifts and pick the Package tab. The receiver still gets the full charm and coins." : `Kept in your Bag. ${GIFTS_SOON_TEXT}.`,
      })),
  ];

  const all = [...decorations, ...items];
  const current = open ? all.find((e) => e.key === open) : undefined;

  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader
        title="Bag"
        onBack={pop}
        right={
          <button type="button" onClick={() => push({ kind: "shop" })} className="flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-[12.5px] font-bold text-cream ring-1 ring-line">
            <ShoppingBag className="h-4 w-4" aria-hidden /> Shop
          </button>
        }
      />

      <Section title="Decorations" entries={decorations} onOpen={setOpen} empty="No decorations yet. Get VIP for the animated frame, or send a Storm Guardian gift for its frame, bubble, entry and profile effect." onShop={() => push({ kind: "shop", tab: "bubbles" })} />
      <Section title="Items" entries={items} onOpen={setOpen} empty="No items yet. Red packets and rings you buy land here." onShop={() => push({ kind: "shop", tab: "packets" })} />

      <BottomSheet open={Boolean(current)} onClose={() => setOpen(null)} title={current?.name}>
        {current ? (
          <div className="px-5 pb-6">
            <div className={`grid h-[150px] place-items-center rounded-3xl bg-gradient-to-b ${current.tint}`}>
              <span className="scale-[1.5]">{current.art}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-muted">{current.kind}</span>
              <span className="flex items-center gap-1 rounded-full bg-cream/10 px-2 py-0.5 text-[11.5px] font-bold text-cream">
                <Clock className="h-3 w-3" aria-hidden /> {current.badge}
                {current.count ? ` · ×${current.count}` : ""}
              </span>
              {current.inUse ? <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-[#3ddc84] ring-1 ring-[#3ddc84]">In Use</span> : null}
            </div>
            {current.source ? <p className="mt-1.5 text-[12px] text-muted">From: {current.source}</p> : null}
            {current.note ? <p className="mt-1.5 text-[12.5px] text-cream/75">{current.note}</p> : null}
            {current.action ? (
              <button
                type="button"
                onClick={() => {
                  current.action?.run();
                  setOpen(null);
                }}
                className={`mt-4 h-11 w-full rounded-full text-[14px] font-bold ${current.action.off ? "bg-cream/10 text-cream" : "bg-gold text-ink"}`}
              >
                {current.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>
      <FindCpSheet open={finding} onClose={() => setFinding(false)} />
    </div>
  );
}

function Section({ title, entries, onOpen, empty, onShop }: { title: string; entries: Entry[]; onOpen: (key: string) => void; empty: string; onShop: () => void }) {
  return (
    <section className="mt-4 px-4" aria-label={title}>
      <h2 className="font-display text-[19px] font-extrabold text-cream">{title}</h2>
      {entries.length ? (
        <ul className="mt-3 grid grid-cols-3 gap-x-2.5 gap-y-4">
          {entries.map((e) => (
            <li key={e.key}>
              <button type="button" onClick={() => onOpen(e.key)} className="block w-full text-left" aria-label={`${e.name}${e.inUse ? ", in use" : ""}`}>
                <span className={`relative grid aspect-square w-full place-items-center overflow-hidden rounded-2xl bg-gradient-to-b ${e.tint} ring-1 ring-white/10`}>
                  {e.art}
                  <span className="absolute inset-x-1.5 bottom-1.5 flex justify-center">
                    <span className="flex max-w-full items-center gap-1 truncate rounded-full bg-black/45 px-2 py-0.5 text-[10.5px] font-bold text-cream backdrop-blur">
                      <Clock className="h-3 w-3 shrink-0" aria-hidden /> {e.badge}
                      {e.count ? <span className="text-[#7fe8dc]">×{e.count}</span> : null}
                    </span>
                  </span>
                </span>
                <span className="mt-1.5 flex items-start gap-1">
                  <span className="line-clamp-2 min-w-0 flex-1 text-[12.5px] font-bold leading-tight text-cream">{e.name}</span>
                  {e.inUse ? <span className="shrink-0 rounded px-1 text-[9.5px] font-bold leading-[15px] text-[#3ddc84] ring-1 ring-[#3ddc84]">In Use</span> : null}
                </span>
                <span className="text-[11px] font-semibold text-muted">{e.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-2xl bg-surface px-4 py-6 text-center ring-1 ring-line">
          <p className="text-[13px] text-muted">{empty}</p>
          <button type="button" onClick={onShop} className="mt-3 h-9 rounded-full bg-coral px-5 text-[13px] font-bold text-white">
            Go to Shop
          </button>
        </div>
      )}
    </section>
  );
}
