"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin } from "@/components/ui/kit";
import { ChestArt } from "@/components/parivar/FamilyTreasure";
import { roomTreasureApi, type RoomTreasure, type TreasureBox } from "@/lib/api/room-treasure";
import { useApp } from "@/lib/app/store";
import type { RoomSession } from "./useRoomSession";

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

/**
 * "Daily Task" in a voice room: boxes open as you spend time in voice rooms today. Following a room, sending a gift and sending a
 * message each take a few minutes off the wait. VIP-only boxes need VIP. Everything (times, coins, which boxes) comes from the server.
 * A floating chest button opens it; a dot shows when a box is ready.
 */
export function RoomTreasureButton({ s }: { s: RoomSession }) {
  const { toast, refreshCoins, isFollowingRoom, toggleFollowRoom } = useApp();
  const server = Boolean(s.room.server);
  const [data, setData] = useState<RoomTreasure | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (!server || loading.current) return;
    loading.current = true;
    try {
      setData(await roomTreasureApi.me());
    } catch {
      /* the button just stays as it was */
    } finally {
      loading.current = false;
    }
  }, [server]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // One tick a second while there is something counting down
  const counting = Boolean(data?.enabled && data.boxes.some((b) => b.state === "COUNTDOWN"));
  useEffect(() => {
    if (!counting) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [counting]);

  const left = useCallback((b: TreasureBox) => (b.state === "COUNTDOWN" && data ? b.secondsLeft - (now - data.at) / 1000 : 0), [data, now]);
  // A countdown reached zero: ask the server (it decides when a box is ready)
  const expired = Boolean(data?.boxes.some((b) => b.state === "COUNTDOWN" && left(b) <= 0));
  useEffect(() => {
    if (expired) {
      const t = window.setTimeout(() => void load(), 1500);
      return () => window.clearTimeout(t);
    }
  }, [expired, load]);
  // Staying in a room also moves the server's minute counter: look again once a minute
  useEffect(() => {
    if (!data?.enabled) return;
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [data?.enabled, load]);

  if (!server || !data?.enabled) return null;
  const ready = data.boxes.some((b) => b.state === "CLAIMABLE" && !b.locked);

  const claim = async (b: TreasureBox) => {
    if (busy) return;
    setBusy(b.id);
    try {
      const r = await roomTreasureApi.claim(b.id);
      setData(r);
      if (r.got) {
        toast(`+${r.got.toLocaleString("en-IN")} coins`, "gold");
        refreshCoins();
      } else toast("Box opened");
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't open the box. Try again.", "error");
      void load();
    } finally {
      setBusy(null);
    }
  };

  const go = (kind: string) => {
    if (kind === "FOLLOW_ROOM") {
      if (!isFollowingRoom(s.room.id)) toggleFollowRoom(s.room);
      window.setTimeout(() => void load(), 1200);
      return;
    }
    setOpen(false);
    if (kind === "SEND_GIFT") toast("Tap the gift button to send a gift 🎁", "gold");
    else {
      toast("Type a message in the room chat", "gold");
      window.setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="Message the room"]')?.focus(), 400);
    }
  };

  const normal = data.boxes.filter((b) => !b.vipOnly);
  const vip = data.boxes.filter((b) => b.vipOnly);

  const cell = (b: TreasureBox) => {
    const t = left(b);
    return (
      <div key={b.id} className="flex flex-col items-center gap-1.5 text-center">
        <ChestArt tier={b.vipOnly ? "SUPER" : "NORMAL"} size={64} open={b.state === "CLAIMED"} />
        <span className="flex items-center gap-1 text-[11px] font-semibold text-cream/80">
          <Coin className="h-3 w-3" /> {b.coins.toLocaleString("en-IN")}
        </span>
        {b.state === "CLAIMABLE" && !b.locked ? (
          <button type="button" disabled={busy !== null} onClick={() => void claim(b)} className="h-7 min-w-[64px] rounded-full bg-[#ff8a1f] px-3 text-[12.5px] font-bold text-white disabled:opacity-60">
            {busy === b.id ? "…" : "Claim"}
          </button>
        ) : b.state === "CLAIMABLE" && b.locked ? (
          <span className="text-[12px] font-semibold text-gold/90">VIP Only</span>
        ) : b.state === "CLAIMED" ? (
          <span className="text-[12px] font-semibold text-cream/45">Opened</span>
        ) : b.state === "COUNTDOWN" ? (
          <span className="font-mono text-[13px] font-semibold text-cream">{clock(t)}</span>
        ) : (
          <span className="text-[12px] text-cream/45">Preparing</span>
        )}
        {b.vipOnly && b.locked && b.state !== "CLAIMABLE" ? <span className="-mt-0.5 text-[11px] font-semibold text-gold/90">VIP Only</span> : null}
      </div>
    );
  };

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        aria-label="Daily Task"
        title="Daily Task"
        className="absolute bottom-[calc(var(--sab)+126px)] right-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/35 ring-1 ring-gold/40 backdrop-blur"
      >
        <ChestArt tier="NORMAL" size={34} />
        {ready ? <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-coral ring-2 ring-ink" aria-label="A box is ready" /> : null}
      </motion.button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Daily Task" tall>
        <div className="px-5 pb-6">
          <p className="-mt-1 mb-4 text-[12.5px] leading-snug text-cream/70">Stay in a voice room for some time to open the treasure boxes. Open each box once a day.</p>
          <div className="grid grid-cols-[1.5fr_1fr] gap-3">
            <div className="grid grid-cols-2 gap-y-4 rounded-2xl p-1">{normal.map(cell)}</div>
            {vip.length ? <div className="grid grid-cols-1 gap-y-4 rounded-2xl bg-white/[0.05] p-2.5 ring-1 ring-white/10">{vip.map(cell)}</div> : null}
          </div>
          {data.tasks.length ? (
            <>
              <p className="mt-6 text-[12.5px] leading-snug text-cream/70">Every task you complete takes minutes off the wait for the boxes.</p>
              <ul className="mt-2 divide-y divide-white/5">
                {data.tasks.map((t) => (
                  <li key={t.kind} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold text-cream">{t.title}</span>
                      <span className="block text-[11.5px] text-cream/55">-{t.minutes} min on the wait</span>
                    </span>
                    {t.done ? (
                      <span className="grid h-9 min-w-[72px] place-items-center rounded-full border border-white/15 text-[13px] font-semibold text-cream/45">Done</span>
                    ) : (
                      <button type="button" onClick={() => go(t.kind)} className="h-9 min-w-[72px] rounded-full border border-sky-400/70 text-[13px] font-semibold text-sky-300">
                        Go
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
