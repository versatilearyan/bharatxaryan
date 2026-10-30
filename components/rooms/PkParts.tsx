"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Power, Swords, Trophy, Users, Zap } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { usePeople } from "@/lib/app/people";
import { PK_MINUTES, usePkState, type Pk, type PkMode, type PkRule, type PkSide } from "./usePk";
import type { RoomSession } from "./useRoomSession";

export const SIDE = {
  red: { name: "Red", solid: "#ff4f7b", soft: "rgb(255 79 123 / 0.16)" },
  blue: { name: "Blue", solid: "#3d9bff", soft: "rgb(61 155 255 / 0.16)" },
} as const;

/** The owner or an admin picks the mode, the rule and how long the PK runs. */
export function CreatePkSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
              <span className="text-[10.5px] text-muted">Top two seats face off</span>
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
            {i + 1}
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
    <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mx-3 mt-2 rounded-2xl bg-black/45 p-2 ring-1 ring-white/10 backdrop-blur" aria-label="PK">
      <div className="flex items-center gap-2">
        <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-cream/70">
          {pk.mode === "1v1" ? "1v1 PK" : "Multiplayer PK"} · {pk.rule === "gifts" ? "Gifts" : "Votes"}
        </span>
        {s.canModerate ? (
          <button type="button" onClick={close} aria-label="Close PK" className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-white/10 text-cream/80">
            <Power className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {/* Score bar */}
      <div className="relative mt-1.5 flex h-6 overflow-hidden rounded-full bg-white/10">
        <motion.span className="flex items-center pl-2 text-[12px] font-extrabold text-white" style={{ background: `linear-gradient(90deg, #ff2d6a, ${SIDE.red.solid})` }} animate={{ width: `${Math.min(92, Math.max(8, share * 100))}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }}>
          {pk.red.toLocaleString("en-IN")}
        </motion.span>
        <span className="flex flex-1 items-center justify-end pr-2 text-[12px] font-extrabold text-white" style={{ background: `linear-gradient(90deg, ${SIDE.blue.solid}, #1f6fe0)` }}>
          {pk.blue.toLocaleString("en-IN")}
        </span>
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${Math.min(92, Math.max(8, share * 100))}%` }}>
          <Zap className="h-5 w-5 fill-[#ffd36e] text-[#ffd36e] drop-shadow" aria-hidden />
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <Backers pk={pk} side="red" />
        {pk.phase === "ready" ? (
          s.canModerate ? (
            <button type="button" onClick={start} className="h-7 rounded-full bg-gradient-to-r from-[#ff4f7b] to-[#3d9bff] px-5 text-[12.5px] font-extrabold text-white">
              Start
            </button>
          ) : (
            <span className="text-[11.5px] font-bold text-cream/70">Waiting for the host…</span>
          )
        ) : pk.phase === "live" ? (
          <span className="rounded-full bg-black/40 px-3 py-0.5 font-display text-[14px] font-extrabold tabular-nums text-gold" aria-label={`Time left ${clock}`}>
            {clock}
          </span>
        ) : (
          <button type="button" onClick={dismiss} className="flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-[12px] font-extrabold text-ink">
            <Trophy className="h-3.5 w-3.5" aria-hidden /> {pk.winner === "draw" ? "Draw!" : `${SIDE[pk.winner ?? "red"].name} wins!`}
          </button>
        )}
        <Backers pk={pk} side="blue" />
      </div>
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
              {pk.myVote === side ? `✓ You support ${SIDE[side].name}` : `Support ${SIDE[side].name}`}
            </button>
          ))}
        </div>
      ) : null}
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
