"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin } from "@/components/ui/kit";
import { usePeople } from "@/lib/app/people";
import { COVERS, RAIN_TIMERS, RED_PACKETS, formatInr, packetById, type CoverId, type Drop, type RedPacketId } from "@/lib/app/redpacket";
import { useRedPackets } from "@/lib/app/redpacket-store";
import { ME_ID, useApp } from "@/lib/app/store";
import type { Room } from "@/lib/app/types";
import type { RoomSession } from "@/components/rooms/useRoomSession";
import { walletImageSrc, type RedPacketInventory, type WalletRedPacket } from "@/lib/api/wallet";
import type { Loaded } from "@/lib/app/use-wallet";

const TONES = {
  red: { body: ["#ff5a4e", "#d81f2a"], flap: "#b3121f", trim: "#f6d899" },
  royal: { body: ["#ff4766", "#b5102e"], flap: "#8e0a22", trim: "#ffd36e" },
  maharaja: { body: ["#a3172e", "#5c0717"], flap: "#45040f", trim: "#ffcf5a" },
  genda: { body: ["#ffb03a", "#f0641a"], flap: "#d8401a", trim: "#fff1c9" },
  mor: { body: ["#1a8aa8", "#0a3d52"], flap: "#08303f", trim: "#ffd36e" },
} as const;

/** A red envelope with a gold marigold seal. The cover picks the colours; the amount is printed on it. */
export function RedPacketArt({ id, cover, size = 56, label = true }: { id: RedPacketId; cover?: CoverId; size?: number; label?: boolean }) {
  const p = packetById(id);
  const tone = cover ?? p.tone;
  const t = TONES[tone];
  const g = `rp-${tone}`;
  return (
    <svg width={size} height={size * 1.24} viewBox="0 0 100 124" aria-hidden className="drop-shadow-[0_6px_10px_rgb(0_0_0/0.35)]">
      <defs>
        <linearGradient id={`${g}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.body[0]} />
          <stop offset="1" stopColor={t.body[1]} />
        </linearGradient>
        <radialGradient id={`${g}-s`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.55" stopColor={t.trim} />
          <stop offset="1" stopColor="#b9822f" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="92" height="116" rx="12" fill={`url(#${g}-b)`} />
      {tone !== "red" ? <rect x="9" y="9" width="82" height="106" rx="8" fill="none" stroke={t.trim} strokeOpacity="0.7" strokeWidth="2" strokeDasharray={tone === "maharaja" ? "1 4" : undefined} strokeLinecap="round" /> : null}
      <path d="M4 16 Q4 4 16 4 H84 Q96 4 96 16 V40 Q50 66 4 40 Z" fill={t.flap} />
      <path d="M4 40 Q50 66 96 40" fill="none" stroke={t.trim} strokeOpacity="0.55" strokeWidth="1.6" />
      {/* Marigold seal */}
      <g transform="translate(50 54)">
        {Array.from({ length: 12 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-12" rx="4.2" ry="7" fill={t.trim} transform={`rotate(${i * 30})`} />
        ))}
        <circle r="11" fill={`url(#${g}-s)`} stroke="#9a6a22" strokeWidth="1" />
        <circle r="5" fill="none" stroke="#9a6a22" strokeWidth="1.4" />
      </g>
      {tone === "maharaja" ? <path d="M38 22 l4 -9 l8 6 l8 -6 l4 9 Z" fill={t.trim} /> : null}
      {label ? (
        <text x="50" y="104" textAnchor="middle" fontSize="20" fontWeight="800" fill={t.trim} fontFamily="system-ui, sans-serif">
          {p.label}
        </text>
      ) : null}
    </svg>
  );
}

export const roomKind = (r: Room) => (r.type === "watch" ? "Watch Room" : r.type === "kharidari" ? "Bazaar" : "Voice Room");

/**
 * The server-wide notification: a slim red and gold ribbon slides across the top of the
 * app whenever anyone drops a red packet. Tap Join to hop into that room, unless
 * the room is locked with a password.
 */
export function RedPacketBanner() {
  const { banners, dismissBanner, dropById } = useRedPackets();
  const { roomById, openRoom, activeRoomId } = useApp();
  const person = usePeople();
  const id = banners[0];
  const d = id ? dropById(id) : undefined;
  useEffect(() => {
    if (!id) return;
    const t = window.setTimeout(() => dismissBanner(id), 7_000);
    return () => window.clearTimeout(t);
  }, [id, dismissBanner]);
  useEffect(() => {
    if (id && !d) dismissBanner(id);
  }, [id, d, dismissBanner]);
  const room = d ? roomById(d.roomId) : undefined;
  const p = d ? packetById(d.packet) : undefined;
  const here = d?.roomId === activeRoomId;
  const locked = Boolean(room?.password) && room?.hostId !== ME_ID;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+50px)] z-[66] h-[48px] overflow-hidden">
      <AnimatePresence>
        {d && room && p ? (
          <motion.div
            key={d.id}
            role="status"
            aria-label="Red packet notification"
            initial={{ x: "105%" }}
            animate={{ x: 0 }}
            exit={{ x: "-105%" }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
            className="pointer-events-auto absolute inset-x-3 top-1.5 flex h-[38px] items-center"
          >
            <motion.span
              className="relative z-10 -mr-4 flex shrink-0 drop-shadow-[0_3px_8px_rgb(0_0_0/0.5)]"
              animate={{ rotate: [-8, 6, -8], y: [0, -2, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <RedPacketArt id={d.packet} cover={d.cover} size={32} label={false} />
            </motion.span>
            <div className="relative flex h-[34px] min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-full bg-[linear-gradient(90deg,rgb(150_14_30/0.97),rgb(206_32_38/0.94)_55%,rgb(240_96_32/0.92))] pl-5 pr-1 shadow-[0_4px_16px_-4px_rgb(230_50_30/0.75)] ring-1 ring-[#ffd98a]/60 backdrop-blur-sm">
              {/* A thin gold line along the top edge and a soft sheen */}
              <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#ffe3a3]/90 to-transparent" aria-hidden />
              <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-25" aria-hidden />
              <PersonAvatar person={{ ...person(d.fromId), frame: "none" }} size={20} />
              <span className="relative flex shrink-0 items-center gap-0.5 rounded-full bg-black/25 py-[2px] pl-[2px] pr-1.5 text-[10.5px] font-extrabold leading-none text-[#ffe08a] ring-1 ring-[#ffd98a]/40">
                <Coin className="h-3.5 w-3.5" />
                {p.label}
              </span>
              <span className="relative flex min-w-0 flex-1 flex-col overflow-hidden leading-none">
                <Marquee className="text-[11.5px] font-bold text-white drop-shadow-[0_1px_1px_rgb(90_0_10/0.6)]">
                  {d.fromId === ME_ID ? "You" : person(d.fromId).name} dropped a <span className="font-extrabold text-[#ffe08a]">{p.name}</span> in {roomKind(room)} {room.code}
                  <span className="font-semibold text-[#ffe9bf]"> · Grab the coins!</span>
                </Marquee>
              </span>
              {here ? (
                <span className="relative shrink-0 rounded-full bg-[#7d0d1c] px-2 py-[3px] text-[10.5px] font-bold text-white ring-1 ring-white/25">Here</span>
              ) : locked ? (
                <span className="relative flex shrink-0 items-center gap-1 rounded-full bg-black/25 px-2 py-[3px] text-[10.5px] font-bold text-white/85">
                  <Lock className="h-2.5 w-2.5" aria-hidden /> Locked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    dismissBanner(d.id);
                    openRoom(d.roomId);
                  }}
                  className="relative shrink-0 rounded-full bg-gradient-to-b from-[#fff3c4] to-[#f0c66a] px-2.5 py-[3px] text-[11px] font-extrabold text-[#a3101f] shadow-[0_1px_4px_rgb(0_0_0/0.25)]"
                >
                  Join
                </button>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Text that scrolls sideways when it's too long for the ribbon. */
export function Marquee({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const o = outer.current?.clientWidth ?? 0;
    const i = inner.current?.scrollWidth ?? 0;
    setShift(Math.max(0, i - o + 8));
  }, [children]);
  return (
    <span ref={outer} className={`relative overflow-hidden whitespace-nowrap ${className}`}>
      <motion.span ref={inner} className="inline-block" animate={{ x: shift ? [0, 0, -shift, -shift] : 0 }} transition={{ duration: 1 + shift / 40, times: [0, 0.15, 0.85, 1], delay: 0.4 }}>
        {children}
      </motion.span>
    </span>
  );
}

/** Red packets in the wallet. They're paid in rupees, so buying opens checkout in the Shop. */
/** An image from the server that falls back (or shows nothing) if it's missing or fails to load. */
export function WalletImage({ src, alt, className = "", fallback }: { src?: string; alt: string; className?: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

/**
 * The red packets in the wallet: products from GET /api/v1/wallet/red-packets, and
 * "You have N" from the signed-in person's inventory (GET /api/v1/wallet/me/red-packets/inventory),
 * matched by product id. Nothing here is sample data.
 */
export function RedPacketShop({
  products,
  inventory,
  signedIn,
  onBuy,
}: {
  products: Loaded<WalletRedPacket[]>;
  inventory: Loaded<RedPacketInventory>;
  signedIn: boolean;
  onBuy: (product: WalletRedPacket) => void;
}) {
  const list = products.data ?? [];
  const owned = (id: string) => (!signedIn ? null : inventory.loading ? "…" : inventory.error ? "?" : String(inventory.data?.[id] ?? 0));
  return (
    <div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">🧧 Red packets</p>
      <p className="mt-1 text-[11.5px] text-muted">Red packets you buy wait in your Bag. Send one from the red packet button in any room: everyone in Panchayat sees it, and the room taps the rain to loot the coins.</p>
      {products.error ? (
        <RetryNote message={products.error} onRetry={products.retry} />
      ) : products.loading ? (
        <div className="mt-2 grid grid-cols-3 gap-2" aria-busy="true" aria-label="Loading red packets">
          {[0, 1, 2].map((k) => (
            <span key={k} className="h-[152px] animate-pulse rounded-2xl bg-surface ring-1 ring-line" />
          ))}
        </div>
      ) : !list.length ? (
        <p className="mt-2 rounded-2xl bg-surface px-4 py-6 text-center text-[12.5px] text-muted ring-1 ring-line">No red packets are on sale right now.</p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {list.map((p) => {
            const have = owned(p.id);
            return (
              <div key={p.id} className="flex flex-col items-center rounded-2xl bg-surface px-1.5 pb-2 pt-2.5 ring-1 ring-line">
                <span className="grid h-[55px] place-items-center">
                  <WalletImage src={walletImageSrc(p.imageUrl)} alt="" className="h-[55px] w-[55px] object-contain" fallback={<RedPacketArt id="rp-10k" cover="red" size={44} label={false} />} />
                </span>
                <span className="mt-1 text-center text-[11px] font-bold leading-tight text-cream">{p.name}</span>
                <span className="flex items-center gap-0.5 text-[10.5px] font-semibold text-gold">
                  <Coin className="h-3 w-3" /> {p.coinValue.toLocaleString("en-IN")}
                </span>
                {have !== null ? <span className="text-[10.5px] text-muted">You have {have}</span> : null}
                <button
                  type="button"
                  onClick={() => onBuy(p)}
                  aria-label={`${p.name}, ${p.coinValue.toLocaleString("en-IN")} coins, ${formatInr(p.priceInRupees)}`}
                  className="mt-1.5 flex h-8 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ff7a1a] to-[#e2242f] text-[11.5px] font-bold text-white"
                >
                  {formatInr(p.priceInRupees)}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {signedIn && inventory.error && !products.error ? <RetryNote message={`Couldn't load your red packets. ${inventory.error}`} onRetry={inventory.retry} /> : null}
      {!signedIn && list.length ? <p className="mt-2 text-[11px] text-muted">Sign in to see how many you have.</p> : null}
    </div>
  );
}

function RetryNote({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mt-2 flex items-center gap-3 rounded-2xl bg-[#3a1418] px-3.5 py-3 text-[12.5px] text-[#ffb0b4] ring-1 ring-coral/25">
      <span className="min-w-0 flex-1">{message}</span>
      <button type="button" onClick={onRetry} className="shrink-0 rounded-full bg-coral/20 px-3 py-1.5 text-[12px] font-bold text-[#ffd0d3]">
        Retry
      </button>
    </div>
  );
}

/** Send a red packet: pick the amount, use one from your Bag or buy it, pick a cover and when the rain starts. */
export function SendRedPacketSheet({ open, onClose, s, initial }: { open: boolean; onClose: () => void; s: RoomSession; initial?: RedPacketId | null }) {
  const { owned, send } = useRedPackets();
  const { coins } = useApp();
  const [packet, setPacket] = useState<RedPacketId>(initial ?? "rp-10k");
  const [cover, setCover] = useState<CoverId>("red");
  const [delay, setDelay] = useState<number>(RAIN_TIMERS[0].ms);
  useEffect(() => {
    if (open && initial) setPacket(initial);
  }, [open, initial]);
  const p = packetById(packet);
  const have = owned[packet] ?? 0;
  const short = !have && coins < p.amount;
  return (
    <BottomSheet open={open} onClose={onClose} title="🧧 Send a red packet" tall>
      <div className="px-4 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Select amount</p>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Amount">
          {RED_PACKETS.map((x) => {
            const on = x.id === packet;
            return (
              <button key={x.id} type="button" role="radio" aria-checked={on} onClick={() => setPacket(x.id)} className={`relative flex h-12 flex-col items-center justify-center rounded-2xl text-[14px] font-extrabold ring-1 ${on ? "bg-[#ff7a1a]/15 text-[#ff9a4a] ring-[#ff7a1a]" : "bg-surface text-cream/70 ring-line"}`}>
                <span className="flex items-center gap-1">
                  <Coin className="h-3.5 w-3.5" /> {x.amount.toLocaleString("en-IN")}
                </span>
                {owned[x.id] ? <span className="absolute -right-1 -top-1.5 rounded-full bg-[#19c3b2] px-1.5 text-[9.5px] font-extrabold text-ink">×{owned[x.id]}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface px-3.5 py-3 ring-1 ring-line">
          <span className="text-[14px] font-bold text-cream">Bag</span>
          <span className={`text-right text-[12px] font-semibold ${have ? "text-[#7fe8dc]" : "text-muted"}`}>{have ? `Using 1 of your ${have} · free` : "No red packet of this amount in your Bag"}</span>
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Cover</p>
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Cover">
          {COVERS.map((c) => {
            const on = c.id === cover;
            return (
              <button key={c.id} type="button" role="radio" aria-checked={on} aria-label={`${c.name} cover`} onClick={() => setCover(c.id)} className={`flex w-[74px] shrink-0 flex-col items-center gap-1 rounded-2xl py-2 ring-1 ${on ? "bg-[#ff7a1a]/15 ring-[#ff7a1a]" : "bg-surface ring-line"}`}>
                <RedPacketArt id={packet} cover={c.id} size={34} />
                <span className={`text-[10.5px] font-bold ${on ? "text-[#ff9a4a]" : "text-cream/70"}`}>{c.name}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Rain starts in</p>
        <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Rain starts in">
          {RAIN_TIMERS.map((t) => {
            const on = t.ms === delay;
            return (
              <button key={t.ms} type="button" role="radio" aria-checked={on} onClick={() => setDelay(t.ms)} className={`h-10 rounded-full text-[12.5px] font-bold ring-1 ${on ? "bg-[#ff7a1a]/15 text-[#ff9a4a] ring-[#ff7a1a]" : "bg-surface text-cream/70 ring-line"}`}>
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11.5px] text-muted">Everyone in Panchayat gets a banner and can join before the rain. You can&apos;t loot your own packet.</p>

        <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
          <span className="text-[12px] text-muted">
            Balance <Coin className="inline h-3 w-3" /> {coins.toLocaleString("en-IN")}
          </span>
          {have ? (
            <span className="font-display text-[22px] font-extrabold text-[#7fe8dc]">Free</span>
          ) : (
            <span className="flex items-center gap-1.5 font-display text-[26px] font-extrabold text-cream">
              <Coin className="h-6 w-6" /> {p.amount.toLocaleString("en-IN")}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={short}
          onClick={() => {
            if (send(packet, s.room.id, cover, delay)) onClose();
          }}
          className="mt-3 h-12 w-full rounded-full bg-gradient-to-r from-[#ff7a1a] to-[#e2242f] text-[15px] font-extrabold text-white disabled:from-cream/10 disabled:to-cream/10 disabled:text-muted"
        >
          {short ? "Not enough coins" : "Send red packet"}
        </button>
      </div>
    </BottomSheet>
  );
}

/** The floating red packet button in a room, plus the countdown, rain and result for this room. */
export function RoomRedPacket({ s }: { s: RoomSession }) {
  const { dropIn, now, sendFor, openSend } = useRedPackets();
  const [open, setOpen] = useState(false);
  // The Bag can ask to open this sheet with an amount picked
  useEffect(() => {
    if (sendFor) setOpen(true);
  }, [sendFor]);
  const close = () => {
    setOpen(false);
    openSend(null);
  };
  const d = dropIn(s.room.id);
  const announced = useRef(new Set<string>());
  const person = usePeople();

  // Post the drop in the room chat once
  useEffect(() => {
    if (!d || announced.current.has(d.id)) return;
    announced.current.add(d.id);
    const p = packetById(d.packet);
    const wait = Math.round((d.rainAt - Date.now()) / 1000);
    s.addSystem(`🧧 ${d.fromId === ME_ID ? "You" : person(d.fromId).name} dropped a ${p.label} ${p.name}! It rains in ${wait >= 60 ? `${Math.round(wait / 60)} min` : `${wait} sec`}, tap fast to loot.`);
  }, [d, s, person]);

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        aria-label="Send a red packet"
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] right-3 z-20"
        animate={{ rotate: [0, -6, 6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 4 }}
      >
        <RedPacketArt id="rp-10k" size={34} label={false} />
      </motion.button>
      <SendRedPacketSheet open={open} onClose={close} s={s} initial={sendFor} />
      {d ? <RainLayer key={d.id} d={d} now={now} /> : null}
    </>
  );
}

type Falling = { key: number; x: number; dur: number; size: number; rot: number; tier: RedPacketId };
type Pop = { key: number; x: number; y: number; n: number };

function RainLayer({ d, now }: { d: Drop; now: number }) {
  const { grab } = useRedPackets();
  const person = usePeople();
  const p = packetById(d.packet);
  const mineToSend = d.fromId === ME_ID;
  const raining = now >= d.rainAt && now < d.endAt && d.left > 0;
  const counting = now < d.rainAt;
  const over = !counting && !raining;
  const [falling, setFalling] = useState<Falling[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [closed, setClosed] = useState(false);
  const seq = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!raining) return;
    const t = window.setInterval(() => {
      const key = ++seq.current;
      setFalling((f) => [...f.slice(-28), { key, x: 4 + Math.random() * 78, dur: 2.2 + Math.random() * 1.4, size: 40 + Math.random() * 18, rot: -25 + Math.random() * 50, tier: d.packet }]);
    }, 160);
    return () => window.clearInterval(t);
  }, [raining, d.packet]);

  const tap = (f: Falling, e: React.PointerEvent) => {
    if (mineToSend) return;
    const got = grab(d.id);
    setFalling((list) => list.filter((x) => x.key !== f.key));
    if (!got) return;
    const r = box.current?.getBoundingClientRect();
    setPops((list) => [...list.slice(-8), { key: f.key, x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0), n: got }]);
  };

  if (over && closed) return null;
  const sender = d.fromId === ME_ID ? "Your" : `${person(d.fromId).name}'s`;
  const secs = Math.max(1, Math.ceil((d.rainAt - now) / 1000));
  const clock = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : `${secs}`;

  return (
    <div ref={box} className={`absolute inset-0 z-[30] overflow-hidden ${counting ? "pointer-events-none" : ""}`}>
      {/* Countdown: the packet shakes over the room, which stays usable underneath */}
      {/* A long wait shows as a small timer; the last 10 seconds take the stage */}
      {counting && secs > 10 ? (
        <div className="pt-safe absolute right-3 top-[108px] flex items-center gap-1.5 rounded-full bg-black/60 py-1 pl-1 pr-3 backdrop-blur" aria-live="off">
          <RedPacketArt id={d.packet} cover={d.cover} size={20} label={false} />
          <span className="text-[12px] font-bold text-cream">
            {p.label} · rain in <span className="text-gold">{clock}</span>
          </span>
        </div>
      ) : null}
      {counting && secs <= 10 ? (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-x-0 top-[34%] flex flex-col items-center">
          <motion.span animate={{ rotate: [0, -8, 8, -8, 0] }} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.3 }}>
            <RedPacketArt id={d.packet} cover={d.cover} size={86} />
          </motion.span>
          <p className="mt-2 rounded-full bg-black/55 px-3 py-1 text-[12.5px] font-bold text-cream backdrop-blur">
            {sender} {p.label} {p.name}
          </p>
          <p className="mt-1.5 font-display text-[30px] font-extrabold text-gold drop-shadow-[0_2px_6px_rgb(0_0_0/0.8)]" aria-live="polite">
            Rain in {secs}
          </p>
        </motion.div>
      ) : null}

      {/* Rain */}
      {raining ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(255_90_40/0.25),transparent_65%)]" />
          <div className="pt-safe pointer-events-none absolute inset-x-0 top-0 flex justify-center">
            <p className="mt-[108px] rounded-full bg-black/60 px-4 py-1.5 text-center text-[12.5px] font-bold text-cream backdrop-blur" aria-live="polite">
              {mineToSend ? (
                "Your red packet is raining. The room is looting it!"
              ) : (
                <>
                  Tap the red packets! You: <span className="text-gold">{d.mine.toLocaleString("en-IN")}</span> · Left {d.left.toLocaleString("en-IN")}
                </>
              )}
            </p>
          </div>
          {falling.map((f) => (
            <motion.button
              key={f.key}
              type="button"
              aria-label="Grab red packet"
              className="absolute"
              style={{ left: `${f.x}%` }}
              initial={{ top: "-14%", rotate: f.rot }}
              animate={{ top: "108%", rotate: -f.rot }}
              transition={{ duration: f.dur, ease: "linear" }}
              onAnimationComplete={() => setFalling((list) => list.filter((x) => x.key !== f.key))}
              onPointerDown={(e) => tap(f, e)}
            >
              <RedPacketArt id={f.tier} cover={d.cover} size={f.size} label={false} />
            </motion.button>
          ))}
          <AnimatePresence>
            {pops.map((q) => (
              <motion.span
                key={q.key}
                className="pointer-events-none absolute flex items-center gap-1 font-display text-[18px] font-extrabold text-gold drop-shadow-[0_2px_4px_rgb(0_0_0/0.8)]"
                style={{ left: q.x - 20, top: q.y - 20 }}
                initial={{ opacity: 1, y: 0, scale: 0.7 }}
                animate={{ opacity: 0, y: -60, scale: 1.15 }}
                transition={{ duration: 0.9 }}
                onAnimationComplete={() => setPops((list) => list.filter((x) => x.key !== q.key))}
              >
                <Coin className="h-4 w-4" /> +{q.n.toLocaleString("en-IN")}
              </motion.span>
            ))}
          </AnimatePresence>
        </>
      ) : null}

      {/* Result */}
      {over ? (
        <div className="absolute inset-0 grid place-items-center bg-black/55 px-8 backdrop-blur-[2px]" onClick={() => setClosed(true)}>
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative w-full max-w-[280px] overflow-hidden rounded-[28px] bg-gradient-to-b from-[#e8352f] to-[#9e0f1d] p-5 text-center ring-2 ring-[#f6d899]/70"
            role="dialog"
            aria-label="Red packet result"
          >
            <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-30" aria-hidden />
            <div className="relative mx-auto w-fit">
              <RedPacketArt id={d.packet} cover={d.cover} size={58} label={false} />
            </div>
            <p className="relative mt-2 text-[12.5px] font-semibold text-[#ffe2b8]">
              {sender} {p.label} {p.name}
            </p>
            {mineToSend ? (
              <p className="relative mt-2 font-display text-[20px] font-extrabold text-white">
                {d.left ? `The room looted ${(p.amount - d.left).toLocaleString("en-IN")} coins 🎉` : "The room looted it all 🎉"}
              </p>
            ) : d.mine ? (
              <>
                <p className="relative mt-1 text-[12px] text-white/80">You looted</p>
                <p className="relative flex items-center justify-center gap-1.5 font-display text-[32px] font-extrabold text-[#ffd36e]">
                  <Coin className="h-7 w-7" /> {d.mine.toLocaleString("en-IN")}
                </p>
                <p className="relative text-[11.5px] text-white/75">
                  from {d.grabs} {d.grabs === 1 ? "packet" : "packets"} · added to your wallet
                </p>
              </>
            ) : (
              <p className="relative mt-2 font-display text-[19px] font-extrabold text-white">Too slow this time! Tap faster next rain.</p>
            )}
            <button type="button" onClick={() => setClosed(true)} className="relative mt-4 h-10 w-full rounded-full bg-[#ffd36e] text-[13.5px] font-extrabold text-[#7a1010]">
              OK
            </button>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
