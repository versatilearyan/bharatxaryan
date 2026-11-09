"use client";

import { cpApi, type CpCouple } from "@/lib/api/cp";
import { ProposeFromBagSheet } from "./ServerCp";
import { readToken } from "@/lib/auth/token";
import { useState, type ReactNode } from "react";
import { Clock, Loader2, RotateCcw, ShoppingBag } from "lucide-react";
import { GiftArt } from "@/components/art/GiftArt";
import { RingArt } from "@/components/art/RingArt";
import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { VipBubbleArt, VipEntryBanner, VipFrame } from "@/components/effects/VipFx";
import { FindCpSheet } from "@/components/profile/UserProfile";
import { RedPacketArt } from "@/components/redpacket/RedPacket";
import { useBagServer, type BagEntry, type SectionStatus } from "./BagVip";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { ScreenHeader } from "@/components/ui/kit";
import { GIFTS_LIVE, GIFTS_SOON_TEXT, giftById } from "@/lib/app/data";
import { giftSetById, isGiftSetId, type EffectSet, type GiftSet } from "@/lib/app/effects";
import { bubbleById, timeLeft, type BubbleId, type Ring } from "@/lib/app/market";
import { useMarket } from "@/lib/app/market-store";
import { usePeople } from "@/lib/app/people";
import { RED_PACKETS, type RedPacketId } from "@/lib/app/redpacket";
import { useRedPackets } from "@/lib/app/redpacket-store";
import { ME_ID, useApp } from "@/lib/app/store";
import { useMe } from "@/lib/app/me-store";
import { useRewards } from "@/lib/app/rewards-store";
import { getMyShopItems, type OwnedShopItem } from "@/lib/api/shop";
import { ShopProductAsset } from "./ShopProductAsset";
import { useEffect as useEffectBag } from "react";
import { rewardTypeText } from "./RewardWon";
import { Gift as GiftIcon, Music } from "lucide-react";
import type { GiftId } from "@/lib/app/types";

/** One thing in the Bag, ready to draw as a tile and act on from its detail sheet. */
type Entry = BagEntry;

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
  // Signed in: your CP (null = none) decides whether a shop ring offers "Add to CP" or "Propose"
  const [serverCp, setServerCp] = useState<CpCouple | null>(null);
  const [ringBusy, setRingBusy] = useState<string | null>(null);
  const [proposeRing, setProposeRing] = useState<{ id: string; name: string } | null>(null);

  const [open, setOpen] = useState<string | null>(null);
  const person = usePeople();
  const me = person(ME_ID);
  // Signed in to the backend: VIP decorations and red packets come from the server
  const srv = useBagServer(true, me, now);
  // Spend rewards you won (server): effects to wear, gifts to send for free
  const rw = useRewards();
  // Shop items you bought with coins (GET /shop/me/items)
  const [bought, setBought] = useState<OwnedShopItem[]>([]);
  useEffectBag(() => {
    if (!readToken()) return;
    cpApi.mine().then(setServerCp).catch(() => setServerCp(null));
  }, [bought]);
  useEffectBag(() => {
    let live = true;
    getMyShopItems()
      .then((list) => live && setBought(list))
      .catch(() => {
        /* the rest of the Bag still shows */
      });
    return () => {
      live = false;
    };
  }, []);
  const meStore = useMe();
  const rewardBadge = (expiresAt: string | null) => (expiresAt ? short(Date.parse(expiresAt), now) : "Permanent");
  const wearServer = (id: string, on: boolean, name: string) =>
    rw
      .wear(id, on)
      .then(() => {
        // Your profile and rooms read what you wear from the server
        meStore.refresh(true);
        toast(on ? `${name} is on. Everyone sees it in rooms and on your profile.` : `${name} taken off`, on ? "gold" : undefined);
      })
      .catch((e) => toast(e instanceof Error && e.message ? e.message : "That didn't work. Try again.", "error"));
  const rewardArt = (url: string | null, format: string | null) =>
    !url ? (
      <GiftIcon className="h-8 w-8 text-gold" aria-hidden />
    ) : format === "MP3" ? (
      <Music className="h-8 w-8 text-gold" aria-hidden />
    ) : (
      <span className="relative block h-[78px] w-[78px] overflow-hidden rounded-lg">
        <SvgaAnim src={url} className="absolute inset-0 h-full w-full" />
      </span>
    );
  const SLOT_NOTE: Record<string, string> = {
    FRAME: "Shows around your picture on your profile and on your seat in rooms.",
    BUBBLE: "Your chat messages in rooms use this bubble.",
    ENTRY: "Plays with your name when you enter a room. Everyone in the room sees it.",
    PROFILE: "Plays across the top of your profile for everyone who visits.",
  };
  const rewardEffects: Entry[] = rw.rewards
    .filter((r) => r.itemType !== "GIFT")
    .map((r) => ({
      key: `reward-${r.id}`,
      name: r.itemName,
      kind: rewardTypeText(r.itemType),
      art: rewardArt(r.mediaUrl, r.mediaFormat),
      badge: rewardBadge(r.expiresAt),
      count: r.quantity > 1 ? r.quantity : undefined,
      inUse: r.equipped,
      source: `${r.ruleName} (spend reward)`,
      tint: "from-[#4a2a6b] to-[#1d1430]",
      note: r.slot ? SLOT_NOTE[r.slot] : "Kept in your Bag.",
      action: r.slot ? (r.equipped ? { label: "Take off", run: () => void wearServer(r.id, false, r.itemName), off: true } : { label: "Wear", run: () => void wearServer(r.id, true, r.itemName) }) : undefined,
    }));
  const rewardGifts: Entry[] = Object.values(
    rw.rewards
      .filter((r) => r.itemType === "GIFT" && r.giftId && (r.remaining ?? 0) > 0)
      .reduce<Record<string, { giftId: string; count: number; expiresAt: string | null; from: string }>>((acc, r) => {
        const a = (acc[r.giftId!] ??= { giftId: r.giftId!, count: 0, expiresAt: r.expiresAt, from: r.ruleName });
        a.count += r.remaining ?? 0;
        // The soonest expiry shows
        if (r.expiresAt && (!a.expiresAt || Date.parse(r.expiresAt) < Date.parse(a.expiresAt))) a.expiresAt = r.expiresAt;
        return acc;
      }, {}),
  ).map((g) => ({
    key: `reward-gift-${g.giftId}`,
    name: giftById(g.giftId).name,
    kind: "Reward gift",
    art: (
      <span className="h-12 w-12">
        <GiftArt id={g.giftId as GiftId} />
      </span>
    ),
    badge: rewardBadge(g.expiresAt),
    count: g.count,
    source: `${g.from} (spend reward)`,
    tint: GIFT_TINT,
    note: "Free to send: in a room, open Gifts and pick the Package tab.",
  }));

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

  const decorations: Entry[] = [
    ...rewardEffects,
    ...srv.decorations,
    ...giftSets.filter(isGiftSetId).map(giftSetById).flatMap(giftSetEntries),
    // On-device VIP sets only when not signed in; signed in, the server's slots replace them
    ...(srv.signedIn ? [] : vipSets.flatMap((s) => setEntries(s, `VIP ${s.level}`, `VIP ${s.level} reward`))),
  ];
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

  const isRing = (b: OwnedShopItem) => /ring/i.test(b.categoryName ?? "");
  const ringAct = (b: OwnedShopItem): Entry["action"] =>
    !srv.signedIn || !isRing(b)
      ? undefined
      : serverCp
        ? {
            label: ringBusy === b.id ? "Adding…" : "💍 Add to CP",
            disabled: ringBusy !== null,
            run: () => {
              setRingBusy(b.id);
              cpApi
                .addRing(`shop-${b.id}`, "BAG")
                .then(() => {
                  toast(`${b.name} added to your CP 💞`, "gold");
                  setBought((list) => list.map((x) => (x.id === b.id ? { ...x, quantity: x.quantity - 1 } : x)).filter((x) => x.quantity > 0));
                  setOpen(null);
                })
                .catch((e) => toast(e instanceof Error && e.message ? e.message : "Couldn't add the ring.", "error"))
                .finally(() => setRingBusy(null));
            },
          }
        : { label: "💍 Propose", run: () => (setOpen(null), setProposeRing({ id: `shop-${b.id}`, name: b.name })) };
  const boughtItems: Entry[] = bought.map((b) => ({
    key: `shop-${b.id}`,
    name: b.name,
    kind: isRing(b) ? "CP ring" : (b.categoryName ?? "Shop item"),
    action: ringAct(b),
    art: (
      <span className="block h-[70px] w-[70px] overflow-hidden rounded-lg">
        <ShopProductAsset url={b.assetUrl} type={b.assetType} name={b.name} className="h-full w-full" />
      </span>
    ),
    badge: "Permanent",
    count: b.quantity > 1 ? b.quantity : undefined,
    source: "Bought in the Shop",
    tint: ITEM_TINT,
    note: isRing(b) ? (serverCp ? "Add it to your CP's ring box. It only adds Charm when partners send each other gifts." : "Propose to someone with this ring.") : b.description,
  }));
  const items: Entry[] = [
    ...boughtItems,
    ...rewardGifts,
    ...srv.items,
    // Signed in, your red packets are the server's inventory
    ...RED_PACKETS.filter((p) => !srv.signedIn && (owned[p.id] ?? 0) > 0).map<Entry>((p) => ({
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
      note: `Add it to your CP ring box.`,
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

      {srv.actionError ? (
        <p className="mx-4 mt-3 rounded-xl bg-coral/10 px-3 py-2 text-[12.5px] font-semibold text-coral ring-1 ring-coral/30" role="alert">
          {srv.actionError}
        </p>
      ) : null}
      {rw.goals.length ? (
        <section className="mt-4 px-4" aria-label="Spend rewards">
          <h2 className="font-display text-[19px] font-extrabold text-cream">Spend rewards</h2>
          <ul className="mt-2 space-y-2">
            {rw.goals.map((g) => (
              <li key={g.ruleId} className="rounded-2xl bg-surface px-3.5 py-2.5 ring-1 ring-line">
                <p className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="font-bold text-cream">{g.name}</span>
                  <span className="text-muted">{g.kind === "RANDOM" ? "Random prize" : "Guaranteed"}</span>
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream/10" role="progressbar" aria-valuemin={0} aria-valuemax={g.coinThreshold} aria-valuenow={g.spent} aria-label={g.name}>
                  <div className="h-full rounded-full bg-gradient-to-r from-[#f6d899] to-[#c9954a]" style={{ width: `${Math.min(100, (g.spent / Math.max(1, g.coinThreshold)) * 100)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted">Spend {g.remaining.toLocaleString("en-IN")} more coins on gifts to win</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Section title="Decorations" status={srv.decorStatus} entries={decorations} onOpen={setOpen} empty="No decorations yet. Get VIP for the animated frame, or send a Storm Guardian gift for its frame, bubble, entry and profile effect." onShop={() => push({ kind: "shop", tab: "bubbles" })} />
      <Section title="Items" status={srv.itemStatus} entries={items} onOpen={setOpen} empty="No items yet. Red packets and rings you buy land here." onShop={() => push({ kind: "shop", tab: "packets" })} />

      <BottomSheet open={Boolean(current)} onClose={() => setOpen(null)} title={current?.name}>
        {current ? (
          <div className="px-5 pb-6">
            <div className={`grid h-[150px] place-items-center rounded-3xl bg-gradient-to-b ${current.tint}`}>
              <span className="scale-[1.5]">{current.art}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-muted">{current.kind}</span>
              {current.badge || current.count ? (
                <span className="flex items-center gap-1 rounded-full bg-cream/10 px-2 py-0.5 text-[11.5px] font-bold text-cream">
                  {current.badge ? (
                    <>
                      <Clock className="h-3 w-3" aria-hidden /> {current.badge}
                    </>
                  ) : null}
                  {current.count ? `${current.badge ? " · " : ""}×${current.count}` : ""}
                </span>
              ) : null}
              {current.inUse ? <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-[#3ddc84] ring-1 ring-[#3ddc84]">In Use</span> : null}
            </div>
            {current.source ? <p className="mt-1.5 text-[12px] text-muted">From: {current.source}</p> : null}
            {current.note ? <p className="mt-1.5 text-[12.5px] text-cream/75">{current.note}</p> : null}
            {current.action ? (
              <button
                type="button"
                disabled={current.action.disabled}
                onClick={() => {
                  if (current.action?.disabled) return;
                  current.action?.run();
                  setOpen(null);
                }}
                className={`mt-4 h-11 w-full rounded-full text-[14px] font-bold disabled:opacity-50 ${current.action.off ? "bg-cream/10 text-cream" : "bg-gold text-ink"}`}
              >
                {current.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>
      <FindCpSheet open={finding} onClose={() => setFinding(false)} />
      {proposeRing ? <ProposeFromBagSheet open onClose={() => setProposeRing(null)} ringId={proposeRing.id} ringName={proposeRing.name} /> : null}
    </div>
  );
}

function Section({ title, entries, onOpen, empty, onShop, status }: { title: string; entries: Entry[]; onOpen: (key: string) => void; empty: string; onShop: () => void; status?: SectionStatus }) {
  return (
    <section className="mt-4 px-4" aria-label={title}>
      <h2 className="font-display text-[19px] font-extrabold text-cream">{title}</h2>
      {status?.error ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface p-3 text-[12.5px] text-cream/80 ring-1 ring-coral/30" role="alert">
          <span className="min-w-0 flex-1">{status.error}</span>
          {status.retry ? (
            <button type="button" onClick={status.retry} className="flex shrink-0 items-center gap-1 rounded-full bg-gold/15 px-3 py-1.5 text-[12px] font-bold text-gold">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {status?.loading && entries.length ? (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" aria-hidden /> Loading {title.toLowerCase()}…
        </p>
      ) : null}
      {status?.loading && !entries.length ? (
        <div className="mt-3 grid place-items-center rounded-2xl bg-surface py-8 ring-1 ring-line" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-gold" aria-label={`Loading ${title.toLowerCase()}`} />
        </div>
      ) : entries.length ? (
        <ul className="mt-3 grid grid-cols-3 gap-x-2.5 gap-y-4">
          {entries.map((e) => (
            <li key={e.key}>
              <button type="button" onClick={() => onOpen(e.key)} className="block w-full text-left" aria-label={`${e.name}${e.inUse ? ", in use" : ""}`}>
                <span className={`relative grid aspect-square w-full place-items-center overflow-hidden rounded-2xl bg-gradient-to-b ${e.tint} ring-1 ring-white/10`}>
                  {e.art}
                  <span className="absolute inset-x-1.5 bottom-1.5 flex justify-center">
                    {e.badge || e.count ? (
                      <span className="flex max-w-full items-center gap-1 truncate rounded-full bg-black/45 px-2 py-0.5 text-[10.5px] font-bold text-cream backdrop-blur">
                        {e.badge ? (
                          <>
                            <Clock className="h-3 w-3 shrink-0" aria-hidden /> {e.badge}
                          </>
                        ) : null}
                        {e.count ? <span className="text-[#7fe8dc]">×{e.count}</span> : null}
                      </span>
                    ) : null}
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
