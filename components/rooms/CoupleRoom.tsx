"use client";

/**
 * Couple Room: a private room for a CP couple to spend time together.
 *
 * It is an ordinary private voice room on the backend (2 people, created from the Love Home), marked with
 * settings.cpRoom = true (and a 💞 at the start of its name, so it's still recognised if the server keeps only the
 * name). Inside, the room looks different:
 * - one of five animated romantic scenes as the background (settings.background "cp-…", chosen by the owner),
 * - just two big seats side by side, joined by a glowing heartbeat bond with a beating heart,
 * - the couple's CP level and days together,
 * - and the gift panel opens on the CP gifts tab.
 * No backend changes: it uses the existing create-room, room settings, seats, invite and gift calls.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Lock, Palette, UserPlus } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { cpApi, daysOf, type CpCouple } from "@/lib/api/cp";
import { createRoom, getRoomById, roomErrorText, updateRoomSettings, type VoiceRoom } from "@/lib/api/voice-rooms";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { useLiveCounts } from "@/lib/app/live-counts";
import type { RoomBackground } from "@/lib/app/types";
import { Seat } from "./RoomParts";
import type { RoomSession } from "./useRoomSession";

import { COUPLE_MARK, coupleOfRoom } from "@/lib/app/couple-room";
export { COUPLE_MARK };

export type CoupleScene = "cp-moonlit" | "cp-roses" | "cp-stars" | "cp-sakura" | "cp-candle";
export const COUPLE_SCENES: { id: CoupleScene; label: string; hint: string }[] = [
  { id: "cp-moonlit", label: "Moonlit Lake", hint: "A full moon over still water, fireflies" },
  { id: "cp-roses", label: "Rose Garden", hint: "Falling rose petals and soft lights" },
  { id: "cp-stars", label: "Starry Night", hint: "Shooting stars and a pink aurora" },
  { id: "cp-sakura", label: "Sakura Dusk", hint: "Cherry blossoms drifting at sunset" },
  { id: "cp-candle", label: "Candlelight", hint: "Warm candles and floating hearts" },
];

/** A Couple Room, from its settings (or the 💞 in its name). */
export function isCoupleRoom(s: Pick<RoomSession, "room" | "settings">) {
  return coupleOfRoom({ name: s.room.name, settings: { ...s.room.settings, ...s.settings } }) !== null;
}

export const coupleSceneOf = (s: Pick<RoomSession, "settings">): CoupleScene => {
  const bg = (s.settings as unknown as Record<string, unknown>)?.background;
  return COUPLE_SCENES.some((x) => x.id === bg) ? (bg as CoupleScene) : "cp-moonlit";
};

/* ------------------------------------------------------------------ animated scenes */

/** A small, deterministic spread so the scene looks the same for both partners. */
const rnd = (i: number, k = 1) => ((Math.sin(i * 12.9898 * k + 78.233) * 43758.5453) % 1 + 1) % 1;
const seq = <T,>(n: number, f: (i: number) => T) => Array.from({ length: n }, (_, i) => f(i));

function Fireflies({ n = 14, color = "#fff3a8" }: { n?: number; color?: string }) {
  return (
    <>
      {seq(n, (i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ left: `${rnd(i) * 100}%`, top: `${35 + rnd(i, 2) * 55}%`, width: 4, height: 4, background: color, boxShadow: `0 0 8px 2px ${color}` }}
          animate={{ opacity: [0, 1, 0.3, 1, 0], x: [0, 14 - rnd(i, 3) * 28, -10 + rnd(i, 4) * 20], y: [0, -18 - rnd(i, 5) * 20, -6] }}
          transition={{ duration: 5 + rnd(i, 6) * 4, repeat: Infinity, delay: rnd(i, 7) * 5, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

/** Falling petals: plain CSS animations with negative delays, so the scene is already full the moment it opens. */
function Falling({ n, kind }: { n: number; kind: "rose" | "sakura" }) {
  return (
    <>
      {seq(n, (i) => {
        const dur = 9 + rnd(i, 12) * 6;
        return (
          <span
            key={i}
            className="cp-fall absolute"
            style={
              {
                left: `${rnd(i, 8) * 100}%`,
                top: 0,
                width: kind === "rose" ? 13 : 10,
                height: kind === "rose" ? 16 : 10,
                borderRadius: kind === "rose" ? "80% 0 80% 0" : "70% 10% 70% 10%",
                background: kind === "rose" ? "linear-gradient(135deg,#ff5c7c,#b0123f)" : "linear-gradient(135deg,#ffe3ee,#ff9ec2)",
                boxShadow: kind === "rose" ? "0 0 6px rgba(255,60,100,0.5)" : "0 0 4px rgba(255,180,210,0.6)",
                animationDuration: `${dur}s`,
                animationDelay: `${-rnd(i, 13) * dur}s`,
                "--sx": `${30 - rnd(i, 9) * 60}px`,
                "--ex": `${20 - rnd(i, 10) * 40}px`,
                "--rot": `${rnd(i, 11) > 0.5 ? 360 : -360}deg`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </>
  );
}

function Twinkles({ n = 40 }: { n?: number }) {
  return (
    <>
      {seq(n, (i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${rnd(i, 14) * 100}%`, top: `${rnd(i, 15) * 60}%`, width: 1.5 + rnd(i, 16) * 2, height: 1.5 + rnd(i, 16) * 2 }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2 + rnd(i, 17) * 3, repeat: Infinity, delay: rnd(i, 18) * 3 }}
        />
      ))}
    </>
  );
}

/** Hearts rising slowly from the bottom (CSS, negative delays: already on screen when the room opens). */
function FloatingHearts({ n = 8, color = "#ff8fb0" }: { n?: number; color?: string }) {
  return (
    <>
      {seq(n, (i) => {
        const dur = 8 + rnd(i, 23) * 5;
        return (
          <span
            key={i}
            className="cp-rise absolute"
            style={{ left: `${8 + rnd(i, 19) * 84}%`, bottom: -30, animationDuration: `${dur}s`, animationDelay: `${-rnd(i, 24) * dur}s`, "--sx": `${20 - rnd(i, 21) * 40}px` } as React.CSSProperties}
          >
            <Heart className="fill-current" style={{ width: 14 + rnd(i, 25) * 12, height: 14 + rnd(i, 25) * 12, color, filter: `drop-shadow(0 0 6px ${color})` }} />
          </span>
        );
      })}
    </>
  );
}

const KEYFRAMES = `
@keyframes cp-fall { 0% { transform: translate3d(0,-6vh,0) rotate(0deg); opacity: 0 } 6% { opacity: 1 } 50% { transform: translate3d(var(--sx),50vh,0) rotate(calc(var(--rot) / 2)) } 94% { opacity: 1 } 100% { transform: translate3d(var(--ex),108vh,0) rotate(var(--rot)); opacity: 0 } }
@keyframes cp-rise { 0% { transform: translate3d(0,0,0) scale(0.6); opacity: 0 } 12% { opacity: 0.85 } 60% { transform: translate3d(var(--sx),-55vh,0) scale(1) } 100% { transform: translate3d(0,-85vh,0) scale(0.8); opacity: 0 } }
.cp-fall, .cp-rise { animation-name: cp-fall; animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform, opacity }
.cp-rise { animation-name: cp-rise; animation-timing-function: ease-out }
@media (prefers-reduced-motion: reduce) { .cp-fall, .cp-rise { animation: none; opacity: 0 } }
`;

/** One of the five scenes, filling its parent. `mini` draws fewer moving parts (for the picker). */
export function CoupleBackdrop({ scene, mini = false }: { scene: CoupleScene; mini?: boolean }) {
  const k = mini ? 0.4 : 1;
  const n = (x: number) => Math.max(2, Math.round(x * k));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <style>{KEYFRAMES}</style>
      {scene === "cp-moonlit" ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b1030_0%,#1d1850_42%,#3a2160_60%,#120c26_100%)]" />
          <Twinkles n={n(36)} />
          <motion.div className="absolute left-[74%] top-[7%] h-20 w-20 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_40%_40%,#fffdf0,#ffe9b8_55%,#e9c98a)]" style={{ boxShadow: "0 0 60px 20px rgba(255,236,180,0.35), 0 0 140px 60px rgba(180,160,255,0.18)" }} animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 6, repeat: Infinity }} />
          {/* the lake, with the moon's reflection shimmering */}
          <div className="absolute inset-x-0 bottom-0 h-[48%] bg-[linear-gradient(180deg,transparent,#1a1846_14%,#0a0a22)]" />
          {seq(n(7), (i) => (
            <motion.span key={i} className="absolute left-[74%] h-[3px] rounded-full bg-[#fff1c9]" style={{ bottom: `${40 - i * 4.5}%`, width: 70 - i * 6, marginLeft: -(70 - i * 6) / 2, opacity: 0.55 - i * 0.06 }} animate={{ scaleX: [1, 1.35, 0.85, 1], opacity: [0.5 - i * 0.05, 0.2, 0.5 - i * 0.05] }} transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" }} />
          ))}
          <Fireflies n={n(16)} />
        </>
      ) : scene === "cp-roses" ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,#7a0f2e_0%,#3a0718_55%,#14040a_100%)]" />
          {seq(n(10), (i) => (
            <motion.span key={i} className="absolute rounded-full" style={{ left: `${rnd(i, 26) * 100}%`, top: `${rnd(i, 27) * 90}%`, width: 30 + rnd(i, 28) * 50, height: 30 + rnd(i, 28) * 50, background: "radial-gradient(circle, rgba(255,120,150,0.35), transparent 70%)" }} animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.9, 1.1, 0.9] }} transition={{ duration: 4 + rnd(i, 29) * 3, repeat: Infinity, delay: rnd(i, 30) * 3 }} />
          ))}
          <Falling n={n(18)} kind="rose" />
          <FloatingHearts n={n(6)} color="#ff6b8f" />
        </>
      ) : scene === "cp-stars" ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#06061a_0%,#140a33_50%,#2a0e3d_100%)]" />
          <motion.div className="absolute inset-x-[-20%] top-[18%] h-40 rounded-[50%] bg-[linear-gradient(90deg,transparent,rgba(255,105,180,0.35),rgba(160,120,255,0.35),transparent)] blur-2xl" animate={{ x: ["-6%", "6%", "-6%"], opacity: [0.6, 1, 0.6] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
          <Twinkles n={n(60)} />
          {seq(n(3), (i) => (
            <motion.span key={i} className="absolute h-[2px] w-28 rounded-full bg-[linear-gradient(90deg,transparent,#fff)]" style={{ top: `${8 + i * 12}%`, left: "100%", rotate: "-25deg", boxShadow: "0 0 8px #fff" }} animate={{ x: [0, -700], y: [0, 300], opacity: [0, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 4 + i * 2.5, delay: i * 1.7, ease: "easeIn" }} />
          ))}
          <FloatingHearts n={n(5)} color="#c9a0ff" />
        </>
      ) : scene === "cp-sakura" ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#3a1a4a_0%,#a2486f_45%,#f39a8e_75%,#3b1530_100%)]" />
          <motion.div className="absolute left-1/2 top-[44%] h-36 w-36 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#ffe6c4,#ffb38a_60%,transparent_72%)]" animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 5, repeat: Infinity }} />
          {/* a branch in the corner */}
          <svg className="absolute -left-4 top-0 h-48 w-56 opacity-80" viewBox="0 0 220 180">
            <path d="M0 20 C60 30 90 50 130 90 S190 140 220 150" stroke="#3a1424" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M70 40 C90 20 110 15 130 18" stroke="#3a1424" strokeWidth="4" fill="none" strokeLinecap="round" />
            {seq(16, (i) => (
              <circle key={i} cx={20 + rnd(i, 31) * 190} cy={15 + rnd(i, 32) * 130} r={6 + rnd(i, 33) * 6} fill={rnd(i, 34) > 0.5 ? "#ffc3d6" : "#ff9ec2"} opacity="0.9" />
            ))}
          </svg>
          <Falling n={n(22)} kind="sakura" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(110%_70%_at_50%_100%,#5a2a0a_0%,#2a1208_50%,#0c0504_100%)]" />
          {seq(n(14), (i) => (
            <motion.span key={i} className="absolute rounded-full" style={{ left: `${rnd(i, 35) * 100}%`, top: `${rnd(i, 36) * 70}%`, width: 16 + rnd(i, 37) * 40, height: 16 + rnd(i, 37) * 40, background: "radial-gradient(circle, rgba(255,190,100,0.45), transparent 70%)" }} animate={{ opacity: [0.15, 0.6, 0.15] }} transition={{ duration: 3 + rnd(i, 38) * 3, repeat: Infinity, delay: rnd(i, 39) * 3 }} />
          ))}
          {/* two candles */}
          {[12, 78].map((x, i) => (
            <div key={i} className="absolute bottom-[6%]" style={{ left: `${x}%` }}>
              <motion.div className="mx-auto h-7 w-4 rounded-[50%_50%_40%_40%] bg-[radial-gradient(circle_at_50%_70%,#fff6c8,#ffb54a_55%,#ff6a1a)]" style={{ transformOrigin: "50% 100%", boxShadow: "0 0 30px 12px rgba(255,170,60,0.45)" }} animate={{ scaleY: [1, 1.18, 0.92, 1.1, 1], scaleX: [1, 0.9, 1.05, 0.95, 1], rotate: [-2, 2, -1, 1, -2] }} transition={{ duration: 1.2 + i * 0.2, repeat: Infinity }} />
              <div className="mx-auto h-16 w-7 rounded-sm bg-[linear-gradient(90deg,#f3e6c8,#fffaf0,#e6d3a8)]" />
            </div>
          ))}
          <FloatingHearts n={n(8)} color="#ffb070" />
        </>
      )}
      {/* keep the chat readable at the bottom */}
      {mini ? null : <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-b from-transparent to-black/55" />}
    </div>
  );
}

/* ------------------------------------------------------------------ the two seats */

/** The glowing heartbeat line with a beating heart, between the two seats. */
function HeartBond({ width }: { width: number }) {
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width, height: 60 }} aria-hidden>
      <svg viewBox="0 0 120 40" className="absolute inset-x-0 top-1/2 h-10 w-full -translate-y-1/2 overflow-visible" preserveAspectRatio="none">
        <path d="M0 20 H38 L44 10 L50 30 L56 4 L62 34 L68 20 H120" fill="none" stroke="#ff7aa2" strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <motion.path d="M0 20 H38 L44 10 L50 30 L56 4 L62 34 L68 20 H120" fill="none" stroke="#ffd1df" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 4px #ff6b9a)" }} initial={{ pathLength: 0.2 }} animate={{ pathLength: [0.15, 1, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
      </svg>
      <motion.div className="relative" animate={{ scale: [1, 1.22, 1, 1.12, 1] }} transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.15, 0.3, 0.45, 1] }}>
        <Heart className="h-9 w-9 fill-[#ff4f7b] text-[#ff8fb0]" style={{ filter: "drop-shadow(0 0 10px #ff4f7b)" }} />
      </motion.div>
    </div>
  );
}

/** The couple's stage: two big seats (owner and partner), the bond between them, and their CP level and days. */
export function CoupleStage({ s, scale = 1, onScene, onInvite }: { s: RoomSession; scale?: number; onScene: () => void; onInvite: () => void }) {
  const [couple, setCouple] = useState<CpCouple | null>(null);
  useEffect(() => {
    cpApi.mine().then(setCouple).catch(() => setCouple(null));
  }, []);
  const size = Math.round(96 * scale);
  const partnerHere = s.seatedIds.length > 1 || s.onlineIds.length > 1;
  return (
    <div className="relative px-4 pt-2">
      <div className="flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1 text-[11.5px] font-extrabold text-[#ffd1df] ring-1 ring-[#ff8fb0]/40 backdrop-blur-sm">
          <Heart className="h-3.5 w-3.5 fill-[#ff5c8a] text-[#ff8fb0]" aria-hidden /> Couple Room
          {couple ? <span className="text-cream/80">· Lv{couple.level} · {daysOf(couple.since)} days</span> : null}
        </span>
      </div>
      <div className="mt-5 flex items-start justify-center">
        <div className="relative z-10">
          <Seat s={s} index={0} size={size} gold />
        </div>
        <div style={{ marginTop: size / 2 - 30 }}>
          <HeartBond width={Math.round(70 * scale)} />
        </div>
        <div className="relative z-10">
          <Seat s={s} index={1} size={size} gold />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        {s.canModerate ? (
          <button type="button" onClick={onScene} className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-[12px] font-bold text-cream ring-1 ring-white/15 backdrop-blur-sm">
            <Palette className="h-3.5 w-3.5" aria-hidden /> Scene
          </button>
        ) : null}
        {s.isOwner && !partnerHere ? (
          <button type="button" onClick={onInvite} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff5c8a] to-[#ff8a5c] px-3 py-1.5 text-[12px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(255,92,138,0.8)]">
            <UserPlus className="h-3.5 w-3.5" aria-hidden /> Invite your partner
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** The owner picks the couple's scene (saved in the room settings, so both see it). */
export function CoupleSceneSheet({ s, open, onClose }: { s: RoomSession; open: boolean; onClose: () => void }) {
  const current = coupleSceneOf(s);
  return (
    <BottomSheet open={open} onClose={onClose} title="Choose your scene">
      <div className="grid grid-cols-2 gap-3 px-5 pb-6">
        {COUPLE_SCENES.map((sc) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => {
              s.updateSettings({ background: sc.id as unknown as RoomBackground });
              onClose();
            }}
            className={`relative h-32 overflow-hidden rounded-2xl text-left ring-2 ${current === sc.id ? "ring-[#ff8fb0]" : "ring-white/10"}`}
          >
            {open ? <CoupleBackdrop scene={sc.id} mini /> : null}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <span className="block text-[13px] font-extrabold text-white">{sc.label}</span>
              <span className="block truncate text-[10.5px] text-white/70">{sc.hint}</span>
            </span>
            {current === sc.id ? <span className="absolute right-2 top-2 rounded-full bg-[#ff5c8a] px-2 py-0.5 text-[10px] font-black text-white">ON</span> : null}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}


/** The Couple Room mark in the app's theme: a gold-rimmed maroon medallion with a lock (or heart) and a small glowing heart. */
export function CoupleIcon({ kind = "lock", size = 48 }: { kind?: "lock" | "heart"; size?: number }) {
  const g = Math.round(size * 0.46);
  return (
    <span className="relative grid shrink-0 place-items-center rounded-2xl p-[2px]" style={{ width: size, height: size, background: "linear-gradient(135deg,#fff1c9,#e7bc72 45%,#9a6a26)", boxShadow: "0 6px 16px -6px rgba(255,92,138,0.7)" }} aria-hidden>
      <span className="grid h-full w-full place-items-center rounded-[14px]" style={{ background: "radial-gradient(circle at 50% 30%, #8a1f45, #3a0f24 65%, #1a0816)" }}>
        {kind === "lock" ? <Lock className="text-[#f6d899]" style={{ width: g, height: g }} strokeWidth={2.4} /> : <Heart className="fill-[#ff5c8a] text-[#ffb3c8]" style={{ width: g, height: g, filter: "drop-shadow(0 0 6px #ff5c8a)" }} strokeWidth={1.8} />}
      </span>
      {kind === "lock" ? (
        <span className="absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-[#1a0816] p-[3px] ring-1 ring-[#e7bc72]/70">
          <Heart className="fill-[#ff5c8a] text-[#ff5c8a]" style={{ width: size * 0.22, height: size * 0.22 }} />
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ the way in, from the Love Home */

const roomKey = (coupleId: string) => `panchayat-couple-room-${coupleId}`;
const CLOSED = ["CLOSED", "ENDED", "INACTIVE", "DELETED"];

/** The couple's room among the rooms the app knows (it's listed publicly, so both partners and everyone else find it). */
export function useCoupleRoomOf(coupleId: string) {
  const { rooms } = useApp();
  return rooms.find((r) => r.server && coupleOfRoom(r)?.coupleId === coupleId) ?? null;
}

/**
 * For the couple: "Enter our Couple Room". Opens the couple's room, or makes it the first time: a voice room for two,
 * listed for everyone to see (marked 💞 Couple Room) but only the two partners can go in. Whichever partner taps first
 * makes it; the other finds the same room. Uses only the existing create-room and room settings calls.
 */
export function CoupleRoomButton({ coupleId, a, b, names }: { coupleId: string; a: string; b: string; names: [string, string] }) {
  const { enterRoom, pop, toast } = useApp();
  const live = useServerRooms();
  const listed = useCoupleRoomOf(coupleId);
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let room: VoiceRoom | null = null;
      // 1. The couple's room in the room list (made by either partner)
      if (listed?.server) room = await getRoomById(listed.server.id).catch(() => null);
      // 2. The one this phone made before
      if (!room) {
        const saved = (() => {
          try {
            return window.localStorage.getItem(roomKey(coupleId));
          } catch {
            return null;
          }
        })();
        if (saved) room = await getRoomById(saved).catch(() => null);
      }
      if (room && room.status && CLOSED.includes(room.status)) room = null;
      // 3. None yet: make it
      if (!room) {
        const name = `${COUPLE_MARK} ${names[0]} & ${names[1]}`.slice(0, 60);
        room = await createRoom({ name, roomType: "VOICE", isPrivate: false, maxParticipants: 2, description: "Couple Room · only for the two of us" });
        const made = room;
        room = await updateRoomSettings(made.id, { settings: { cpRoom: true, cpCoupleId: coupleId, cpA: a, cpB: b, background: "cp-moonlit" } }).catch(() => made);
      }
      try {
        window.localStorage.setItem(roomKey(coupleId), room.id);
      } catch {
        /* storage blocked */
      }
      live.addCreated(room);
      pop();
      enterRoom(serverRoomAppId(room.id));
    } catch (e) {
      toast(roomErrorText(e, "create"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void open()}
      disabled={busy}
      className="relative mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-3 overflow-hidden rounded-2xl p-3 text-left ring-1 ring-[#ff8fb0]/40 disabled:opacity-70"
      style={{ background: "linear-gradient(135deg,#5a1236,#2a0b22)" }}
    >
      <span className="absolute inset-0 opacity-70" aria-hidden>
        <CoupleBackdrop scene="cp-stars" mini />
      </span>
      <span className="relative">
        <CoupleIcon kind="heart" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-display text-[16px] font-extrabold text-white">{busy ? "Opening…" : "Enter our Couple Room"}</span>
        <span className="block text-[11.5px] text-white/75">{listed ? "Your room is open · only you two can go in" : "A room just for you two: romantic scenes, CP gifts and quality time"}</span>
      </span>
    </button>
  );
}

/**
 * For everyone else on a couple's Love Home: "Aryan & Siddhi have a Couple Room", and whether they're in it now.
 * It can't be entered: tapping it just says it's only for the couple.
 */
export function CoupleRoomBadge({ coupleId, names }: { coupleId: string; names: [string, string] }) {
  const { toast } = useApp();
  const room = useCoupleRoomOf(coupleId);
  const counts = useLiveCounts();
  if (!room) return null;
  const inside = room.server && counts ? (counts[room.server.id] ?? 0) : 0;
  return (
    <button
      type="button"
      onClick={() => toast(`💞 Only ${names[0]} and ${names[1]} can enter their Couple Room`)}
      className="relative mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-3 overflow-hidden rounded-2xl p-3 text-left ring-1 ring-[#ff8fb0]/30"
      style={{ background: "linear-gradient(135deg,#3d0f28,#1a0816)" }}
    >
      <span className="absolute inset-0 opacity-60" aria-hidden>
        <CoupleBackdrop scene="cp-roses" mini />
      </span>
      <span className="relative">
        <CoupleIcon kind="lock" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-display text-[15px] font-extrabold text-white">
          {names[0]} & {names[1]} have a Couple Room
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-white/75">
          {inside > 0 ? <Heart className="h-3 w-3 fill-[#ff5c8a] text-[#ff5c8a]" aria-hidden /> : <Lock className="h-3 w-3 text-[#f6d899]" aria-hidden />}
          {inside > 0 ? "Spending time together now" : "Only the couple can enter"}
        </span>
      </span>
    </button>
  );
}
