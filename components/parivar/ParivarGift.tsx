"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { GiftArt } from "@/components/art/GiftArt";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin } from "@/components/ui/kit";
import { sendDirectGift } from "@/lib/api/gifts";
import { parivarApi, type ParivarProfile } from "@/lib/api/parivar";
import { giftsOnSale } from "@/lib/app/data";
import { WELCOME_GIFT_ID } from "@/lib/app/newbie";
import { useGiftsVersion } from "@/lib/app/rewards-store";
import { useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";

const n = (v: number) => v.toLocaleString("en-IN");
const COUNTS = [1, 5, 10];

/**
 * Send a gift to someone in your Parivar. It is a real gift: the coins come from your wallet, the receiver gets their
 * share and Charm, and the gift adds activity to the Parivar and shows in the family chat. The server only allows it
 * between members of the same Parivar.
 */
export function ParivarGiftSheet({ p, open, onClose, toId, onSent }: { p: ParivarProfile; open: boolean; onClose: () => void; toId?: string; onSent?: () => void }) {
  const { coins, toast, playGift, refreshCoins } = useApp();
  const { myId } = useServerRooms();
  const giftsV = useGiftsVersion();
  const gifts = useMemo(() => giftsOnSale().filter((g) => (g.id as string) !== WELCOME_GIFT_ID), [giftsV]); // eslint-disable-line react-hooks/exhaustive-deps
  // Everyone in the Parivar can be picked, you included (a gift to yourself); "Everyone" means the others
  const others = useMemo(() => p.members.filter((m) => m.userId !== myId), [p.members, myId]);
  const members = useMemo(() => [...p.members.filter((m) => m.userId === myId), ...others], [p.members, myId, others]);
  // "all" = every other member, else one member
  const [to, setTo] = useState<string | undefined>(toId);
  const [giftId, setGiftId] = useState<string | undefined>();
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setTo(toId ?? members[0]?.userId);
      setCount(1);
    }
  }, [open, toId, members]);
  const gift = gifts.find((g) => g.id === giftId) ?? gifts[0];
  const everyone = to === "all";
  const total = gift ? gift.cost * count * (everyone ? others.length : 1) : 0;
  const receiver = members.find((m) => m.userId === to);
  const enough = coins >= total;

  const send = async () => {
    if (!gift || (!receiver && !everyone) || busy) return;
    setBusy(true);
    try {
      if (everyone) {
        const r = await parivarApi.giftAll(gift.id, count);
        playGift({ giftId: gift.id, fromName: "You", toName: `${r.sent} members`, count, combo: 1, charm: 0, earned: 0 });
        toast(`You sent ${gift.name}${count > 1 ? ` ×${count}` : ""} to ${r.sent} members`, "gold");
        void refreshCoins();
        onSent?.();
        onClose();
        return;
      }
      const r = await sendDirectGift(receiver!.userId, gift.id, count, "PARIVAR");
      playGift({ giftId: gift.id, fromName: "You", toName: receiver!.name, count, combo: 1, charm: r.charm, earned: 0 });
      toast(`You sent ${receiver!.name} ${gift.name}${count > 1 ? ` ×${count}` : ""}${r.charm ? ` · +${n(r.charm)} charm for them` : ""}`, "gold");
      void refreshCoins();
      onSent?.();
      onClose();
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't send the gift.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Send a gift to your Parivar" tall>
      <div className="px-4 pb-4">
        {!members.length ? (
          <p className="py-10 text-center text-[13px] text-muted">No one else is in your Parivar yet. Invite people first.</p>
        ) : (
          <>
            <p className="mb-2 text-[11px] font-bold tracking-wide text-cream/50 uppercase">To</p>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              <button type="button" onClick={() => setTo("all")} className="flex w-16 shrink-0 flex-col items-center gap-1" aria-pressed={everyone}>
                <span className={`grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#f6d899] to-[#d9a84f] text-[22px] ring-2 ${everyone ? "ring-white" : "ring-white/10"}`} aria-hidden>
                  {everyone ? "✓" : "👥"}
                </span>
                <span className="w-full truncate text-center text-[11px] font-bold text-gold">Everyone</span>
              </button>
              {members.map((m) => (
                <button key={m.userId} type="button" onClick={() => setTo(m.userId)} className="flex w-16 shrink-0 flex-col items-center gap-1" aria-pressed={to === m.userId}>
                  <span className={`relative grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[#2a1520] text-[18px] font-bold text-gold ring-2 ${to === m.userId ? "ring-gold" : "ring-white/10"}`}>
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      m.name.slice(0, 1).toUpperCase()
                    )}
                    {to === m.userId ? (
                      <span className="absolute inset-0 grid place-items-center bg-black/35">
                        <Check className="h-5 w-5 text-gold" aria-hidden />
                      </span>
                    ) : null}
                  </span>
                  <span className="w-full truncate text-center text-[11px] text-cream/80">{m.userId === myId ? "You" : m.name}</span>
                </button>
              ))}
            </div>

            <p className="mt-4 mb-2 text-[11px] font-bold tracking-wide text-cream/50 uppercase">Gift</p>
            {!gifts.length ? (
              <p className="py-6 text-center text-[13px] text-muted">No gifts are on sale right now.</p>
            ) : (
              <div className="grid max-h-[34vh] grid-cols-4 gap-2 overflow-y-auto pr-0.5">
                {gifts.map((g) => (
                  <button key={g.id} type="button" onClick={() => setGiftId(g.id)} aria-pressed={gift?.id === g.id} className={`flex flex-col items-center gap-1 rounded-2xl p-2 ring-1 ${gift?.id === g.id ? "bg-gold/15 ring-gold/60" : "bg-white/[0.05] ring-white/10"}`}>
                    <span className="h-12 w-12">
                      <GiftArt id={g.id} />
                    </span>
                    <span className="w-full truncate text-center text-[10.5px] font-semibold text-cream/85">{g.name}</span>
                    <span className="flex items-center gap-0.5 text-[10.5px] font-bold text-gold">
                      <Coin className="h-3 w-3" /> {n(g.cost)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex gap-1.5" role="group" aria-label="How many">
                {COUNTS.map((c) => (
                  <button key={c} type="button" onClick={() => setCount(c)} aria-pressed={count === c} className={`h-9 min-w-10 rounded-full px-3 text-[13px] font-bold ring-1 ${count === c ? "bg-gold text-ink ring-gold" : "text-cream/75 ring-white/15"}`}>
                    ×{c}
                  </button>
                ))}
              </div>
              <span className="flex items-center gap-1 text-[12px] text-cream/60">
                Balance <Coin className="h-3.5 w-3.5" /> <b className="text-cream">{n(coins)}</b>
              </span>
            </div>
            <button type="button" disabled={!gift || (!receiver && !everyone) || busy || !enough} onClick={() => void send()} className="mt-3 h-12 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c] disabled:opacity-50">
              {busy ? "Sending…" : !enough ? "Not enough coins" : everyone && gift ? `Send to all ${others.length} members · ${n(total)} coins` : receiver && gift ? `Send to ${receiver.name} · ${n(total)} coins` : "Pick a gift"}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
