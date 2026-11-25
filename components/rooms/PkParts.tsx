"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Armchair, Power, Swords, Trophy, Users, Zap } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { usePeople } from "@/lib/app/people";
import { PK_MINUTES, usePkState, type Pk, type PkMode, type PkRule, type PkSide } from "./usePk";
import type { RoomSession } from "./useRoomSession";
import { lazySheet } from "@/components/ui/lazySheet";

export const SIDE = {
  red: { name: "Red", solid: "#ff4f7b", soft: "rgb(255 79 123 / 0.16)" },
  blue: { name: "Blue", solid: "#3d9bff", soft: "rgb(61 155 255 / 0.16)" },
} as const;

/** The owner or an admin picks the mode, the rule and how long the PK runs. */
function CreatePkSheetImpl({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pkState = usePkState();
  const [mode, setMode] = useState<PkMode>("1v1");
  const [rule, setRule] = useState<PkRule>("gifts");
  const [minutes, setMinutes] = useState<number>(3);
  const Option = ({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label: string }) => (
    <button type="button" role="radio" aria-checked={on} aria-label={label} onClick={onClick} className={`rounded-2xl ring-1 transition-colors ${on ? "bg-[#ff4f7b]/12 text-cream ring-[#ff4f7b]" : "bg-surface text-cream/70 ring-line"}`}>
      {children}
    </button>
  );
  return (
    <BottomSheet open={open} onClose={onClose} title="⚔️ Create PK" tall>
      <div className="px-4 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">PK mode</p>
        <div className="mt-2 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="PK mode">
          <Option on={mode === "1v1"} onClick={() => setMode("1v1")} label="1v1">
            <span className="flex flex-col items-center gap-1 py-3.5">
              <Swords className="h-7 w-7 text-[#ff4f7b]" aria-hidden />
              <span className="text-[13.5px] font-extrabold">1v1</span>
              <span className="text-[10.5px] text-muted">Host on top, two fighters on the PK seats</span>
            </span>
          </Option>
          <Option on={mode === "team"} onClick={() => setMode("team")} label="Multiplayer PK">
            <span className="flex flex-col items-center gap-1 py-3.5">
              <Users className="h-7 w-7 text-[#3d9bff]" aria-hidden />
              <span className="text-[13.5px] font-extrabold">Multiplayer PK</span>
              <span className="text-[10.5px] text-muted">Red half vs blue half</span>
            </span>
          </Option>
        </div>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">PK rules</p>
        <p className="mt-0.5 text-[11.5px] text-muted">{rule === "gifts" ? "Scoring based on charm from gifts: 1 charm = 1 score." : "PK support: everyone in the room gets one vote. Most votes wins."}</p>
        <div className="mt-2 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="PK rules">
          <Option on={rule === "gifts"} onClick={() => setRule("gifts")} label="Based on gifts">
            <span className="block py-3 text-[13px] font-bold">🎁 Based on gifts</span>
          </Option>
          <Option on={rule === "votes"} onClick={() => setRule("votes")} label="Based on votes">
            <span className="block py-3 text-[13px] font-bold">🙋 Based on votes</span>
          </Option>
        </div>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">PK duration</p>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="PK duration">
          {PK_MINUTES.map((m) => (
            <Option key={m} on={minutes === m} onClick={() => setMinutes(m)} label={`${m} minutes`}>
              <span className="block py-2.5 text-[13px] font-bold">{m} min</span>
            </Option>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            pkState?.setup(mode, rule, minutes);
            onClose();
          }}
          className="mt-6 h-12 w-full rounded-full bg-gradient-to-r from-[#ff4f7b] to-[#3d9bff] text-[15px] font-extrabold text-white"
        >
          Initiate PK
        </button>
      </div>
    </BottomSheet>
  );
}

function Backers({ pk, side }: { pk: Pk; side: PkSide }) {
  const person = usePeople();
  const top = Object.entries(pk.backers[side])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return (
    <span className={`flex gap-1 ${side === "blue" ? "flex-row-reverse" : ""}`} aria-label={`Top ${SIDE[side].name} supporters`}>
      {[0, 1, 2].map((i) =>
        top[i] ? (
          <span key={i} className="rounded-full p-[1.5px]" style={{ background: SIDE[side].solid }}>
            <PersonAvatar person={{ ...person(top[i][0]), frame: "none" }} size={20} />
          </span>
        ) : (
          <span key={i} className="grid h-[23px] w-[23px] place-items-center rounded-full text-[9px] font-extrabold text-white/80" style={{ background: SIDE[side].soft, boxShadow: `inset 0 0 0 1.5px ${SIDE[side].solid}` }}>
            <Armchair className="h-3 w-3 text-white/85" aria-hidden />
          </span>
        ),
      )}
    </span>
  );
}

/** The PK bar above the seats: scores, top supporters, the clock and the host's controls. */
export function PkPanel({ s }: { s: RoomSession }) {
  const pkState = usePkState();
  if (!pkState?.pk) return null;
  const { pk, now, start, close, dismiss, vote } = pkState;
  const total = pk.red + pk.blue;
  const share = total ? pk.red / total : 0.5;
  const left = Math.max(0, Math.ceil((pk.endsAt - now) / 1000));
  const clock = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  return (
    <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mx-3 mt-2" aria-label="PK">
      <PkStartSplash pk={pk} />
      {/* Score bar */}
      <div className="relative z-[1] flex h-7 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
        <motion.span className="flex items-center pl-2 text-[13px] font-extrabold text-white" style={{ background: `linear-gradient(90deg, #ff2d6a, ${SIDE.red.solid})` }} animate={{ width: `${Math.min(92, Math.max(8, share * 100))}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }}>
          {pk.red.toLocaleString("en-IN")}
        </motion.span>
        <span className="flex flex-1 items-center justify-end pr-2 text-[13px] font-extrabold text-white" style={{ background: `linear-gradient(90deg, ${SIDE.blue.solid}, #1f6fe0)` }}>
          {pk.blue.toLocaleString("en-IN")}
        </span>
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${Math.min(92, Math.max(8, share * 100))}%` }}>
          <Zap className="h-5 w-5 fill-[#ffd36e] text-[#ffd36e] drop-shadow" aria-hidden />
        </span>
      </div>
      {/* The grey panel under the bar: top supporters on each side, the Start / clock tab in the middle */}
      <div className="relative -mt-3.5 rounded-b-2xl bg-white/[0.13] px-3 pb-2.5 pt-5 ring-1 ring-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Backers pk={pk} side="red" />
          <Backers pk={pk} side="blue" />
        </div>
        <div className="absolute left-1/2 top-0 z-[2] -translate-x-1/2" style={{ marginTop: 12 }}>
          {pk.phase === "ready" ? (
            s.canModerate ? (
              <button type="button" onClick={start} className="h-8 min-w-[104px] px-6 text-[14px] font-extrabold text-white" style={{ clipPath: "polygon(0 0, 100% 0, 88% 100%, 12% 100%)", background: "linear-gradient(180deg, #3aa0c8, #1f6f96)" }}>
                Start
              </button>
            ) : (
              <span className="flex h-8 min-w-[104px] items-center justify-center px-4 text-[11px] font-bold text-white/80" style={{ clipPath: "polygon(0 0, 100% 0, 88% 100%, 12% 100%)", background: "#2a5a74" }}>
                Waiting…
              </span>
            )
          ) : pk.phase === "live" ? (
            <span className="flex h-8 min-w-[104px] items-center justify-center px-5 font-display text-[14px] font-extrabold tabular-nums text-white" style={{ clipPath: "polygon(0 0, 100% 0, 88% 100%, 12% 100%)", background: "linear-gradient(180deg, #3aa0c8, #1f6f96)" }} aria-label={`Time left ${clock}`}>
              {clock}
            </span>
          ) : (
            <button type="button" onClick={dismiss} className="flex h-8 min-w-[120px] items-center justify-center gap-1 px-5 text-[12px] font-extrabold text-ink" style={{ clipPath: "polygon(0 0, 100% 0, 88% 100%, 12% 100%)", background: "#e7bc72" }}>
              <Trophy className="h-3.5 w-3.5" aria-hidden /> {pk.winner === "draw" ? "Draw!" : `${SIDE[pk.winner ?? "red"].name} wins!`}
            </button>
          )}
        </div>
        {s.canModerate ? (
          <div className="mt-1.5 flex justify-center">
            <button type="button" onClick={close} aria-label="Close PK" className="grid h-6 w-8 place-items-center rounded-lg bg-white/10 text-cream/80">
              <Power className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
        {/* PK support: one vote each */}
        {pk.rule === "votes" && pk.phase === "live" ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["red", "blue"] as const).map((side) => (
              <button
                key={side}
                type="button"
                disabled={Boolean(pk.myVote)}
                onClick={() => vote(side)}
                className="h-8 rounded-full text-[12.5px] font-extrabold text-white disabled:opacity-60"
                style={{ background: SIDE[side].solid, boxShadow: pk.myVote === side ? "0 0 0 2px #fff inset" : undefined }}
              >
                {pk.myVote === side ? `\u2713 You support ${SIDE[side].name}` : `Support ${SIDE[side].name}`}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}

/** The little PK tag under a seat on a team. */
export function PkSeatTag({ side }: { side: PkSide }) {
  return (
    <span className="absolute -bottom-1 left-1/2 z-[3] -translate-x-1/2 rounded-full px-1.5 text-[9px] font-extrabold leading-[14px] text-white" style={{ background: SIDE[side].solid }}>
      PK
    </span>
  );
}
export const CreatePkSheet = lazySheet(CreatePkSheetImpl);

/**
 * The moment a PK starts: a full-screen "RED VS BLUE" splash. The two sides sweep in from the left and right, VS slams
 * down in the middle with a flash and lightning, then "PK START!" and it all clears (about 2.6 s). Shown to everyone
 * when the PK goes live, and also to someone who arrives in the first few seconds; never again mid-fight.
 */
export function PkStartSplash({ pk }: { pk: Pk }) {
  const [show, setShow] = useState(false);
  // Drawn inside the app frame (#main), like the bottom sheets, so on a computer it covers the app's phone screen only
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.getElementById("main")), []);
  const prev = useRef<Pk["phase"] | null>(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = pk.phase;
    if (pk.phase !== "live" || was === "live") return;
    // Arrived while already live: only if it began a moment ago
    const startedAt = pk.endsAt - pk.minutes * 60_000;
    if (was === null && Date.now() - startedAt > 3000) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 2700);
    return () => window.clearTimeout(t);
  }, [pk.phase, pk.endsAt, pk.minutes]);
  const sideText = "font-display text-[44px] font-black italic tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.35)]";
  const splash = (
    <AnimatePresence>
      {show ? (
        <motion.div key="pk-start" className={`pointer-events-none ${host ? "absolute" : "fixed"} inset-0 z-[80] overflow-hidden`} initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} aria-live="polite" aria-label="PK started: Red versus Blue">
          {/* dim the room */}
          <motion.div className="absolute inset-0 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} />
          {/* red sweeps in from the left, blue from the right, meeting on a diagonal */}
          <motion.div
            className="absolute inset-y-[30%] left-0 flex w-[62%] items-center justify-start pl-[8%]"
            style={{ background: `linear-gradient(90deg, #b0123f, ${SIDE.red.solid})`, clipPath: "polygon(0 0, 100% 0, 84% 100%, 0 100%)", boxShadow: "0 0 40px rgba(255,79,123,0.7)" }}
            initial={{ x: "-110%" }}
            animate={{ x: ["-110%", "0%", "-3%", "0%"] }}
            transition={{ duration: 0.55, times: [0, 0.7, 0.85, 1], ease: "easeOut" }}
          >
            <motion.span className={sideText} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
              RED
            </motion.span>
          </motion.div>
          <motion.div
            className="absolute inset-y-[30%] right-0 flex w-[62%] items-center justify-end pr-[8%]"
            style={{ background: `linear-gradient(90deg, ${SIDE.blue.solid}, #0d4fc4)`, clipPath: "polygon(16% 0, 100% 0, 100% 100%, 0 100%)", boxShadow: "0 0 40px rgba(61,155,255,0.7)" }}
            initial={{ x: "110%" }}
            animate={{ x: ["110%", "0%", "3%", "0%"] }}
            transition={{ duration: 0.55, times: [0, 0.7, 0.85, 1], ease: "easeOut" }}
          >
            <motion.span className={sideText} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
              BLUE
            </motion.span>
          </motion.div>
          {/* impact flash */}
          <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0] }} transition={{ delay: 0.5, duration: 0.35 }} />
          {/* shock ring */}
          <motion.span className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#ffd36e]" initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: [0, 1, 0], scale: [0.2, 2.4] }} transition={{ delay: 0.55, duration: 0.6, ease: "easeOut" }} />
          {/* VS slams down */}
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" initial={{ scale: 4, opacity: 0, rotate: -20 }} animate={{ scale: [4, 0.85, 1.1, 1], opacity: [0, 1, 1, 1], rotate: [-20, 6, -3, 0] }} transition={{ delay: 0.45, duration: 0.5, times: [0, 0.5, 0.75, 1] }}>
            <motion.div animate={{ scale: [1, 1.08, 1], rotate: [0, -2, 2, 0] }} transition={{ delay: 1, duration: 0.5, repeat: 2 }} className="relative grid place-items-center">
              <Zap className="absolute h-28 w-28 fill-[#ffd36e] text-[#ffb020] opacity-90 drop-shadow-[0_0_18px_#ffd36e]" aria-hidden />
              <span className="relative font-display text-[64px] font-black italic leading-none text-white [text-shadow:0_0_14px_rgba(255,211,110,0.95),0_5px_0_#8a5a1f]">VS</span>
            </motion.div>
          </motion.div>
          {/* sparks */}
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            return (
              <motion.span key={i} className="absolute top-1/2 left-1/2 h-1.5 w-6 rounded-full bg-[#ffe9a8]" style={{ rotate: `${(a * 180) / Math.PI}deg` }} initial={{ opacity: 0, x: 0, y: 0 }} animate={{ opacity: [0, 1, 0], x: Math.cos(a) * 170, y: Math.sin(a) * 170 }} transition={{ delay: 0.55, duration: 0.6, ease: "easeOut" }} />
            );
          })}
          {/* PK START! */}
          <motion.div className="absolute inset-x-0 top-[72%] text-center" initial={{ opacity: 0, y: 20, scale: 0.6 }} animate={{ opacity: [0, 1, 1], y: 0, scale: [0.6, 1.15, 1] }} transition={{ delay: 1.05, duration: 0.45 }}>
            <span className="inline-block rounded-full bg-gradient-to-b from-[#fff3c4] to-[#f0b43a] px-6 py-2 font-display text-[22px] font-black tracking-wide text-[#5a1a00] shadow-[0_6px_24px_rgba(255,190,60,0.6)]">PK START!</span>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
  return host ? createPortal(splash, host) : splash;
}
