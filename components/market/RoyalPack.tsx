"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { VipFrame, frameFit } from "@/components/effects/VipFx";
import { TitlePill } from "@/components/profile/ProfileTitles";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin } from "@/components/ui/kit";
import { PLATE_MAX, plateLength, type RoyalFrame, type RoyalInfo, type RoyalTitle } from "@/lib/api/manual-topup";
import { VIP_SETS, type EffectSet } from "@/lib/app/effects";
import { NAME_FONTS, nameFace } from "@/lib/app/fonts";
import { usePeople } from "@/lib/app/people";
import { formatInr } from "@/lib/app/redpacket";
import { ME_ID, useApp } from "@/lib/app/store";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { customizeFrame, type BagReward } from "@/lib/api/rewards";

/*
 * The Royal Pack, sold only through Munshi ji: the Royal frame with a name the buyer writes (up to 14 letters),
 * the pack's coins, the Royal Nawab title, and Panchayat King or Panchayat Queen. The previews here draw the frame
 * with the same VipFrame a room seat uses, so what people see here is exactly how it looks when they sit.
 */

/** 10,00,00,000 -> "10 Cr", 5,00,000 -> "5 L". */
export function shortCoins(n: number) {
  if (n >= 1e7) return `${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${+(n / 1e5).toFixed(2)} L`;
  return n.toLocaleString("en-IN");
}

const daysText = (d: number) => (d <= 0 ? "for ever" : `${d} days`);
const pill = (t: RoyalTitle) => ({ ...t, rarity: "ULTRA_RARE" });

/** The Royal frame as a seat frame (the same fit a worn name frame gets), with `name` on its plate. */
export function royalFrameSet(f: RoyalFrame, name: string, font?: string): EffectSet {
  return {
    ...VIP_SETS[0],
    frame: f.imageUrl,
    bubble: "",
    entry: "",
    frameScale: f.scale,
    frameY: f.y,
    frameSize: f.size,
    plate: { name, font, x: f.plateX, y: f.plateY, w: f.plateW, h: f.plateH, color: f.color, stroke: f.stroke },
  };
}

/** My avatar in the Royal frame, `box` px like a seat or profile picture. */
export function RoyalAvatar({ frame, name, box, font }: { frame: RoyalFrame; name: string; box: number; font?: string }) {
  const person = usePeople();
  const me = person(ME_ID);
  const set = useMemo(() => royalFrameSet(frame, name, font), [frame, name, font]);
  const fit = frameFit(set, box);
  return (
    <span className="relative grid place-items-center" style={{ width: box, height: box, marginBottom: fit.drop }}>
      <VipFrame set={set} size={fit.avatar}>
        <PersonAvatar person={{ ...me, frame: "none" }} size={fit.avatar} />
      </VipFrame>
    </span>
  );
}

/** A slice of a room: you on a seat between two empty ones, the way everyone in the room will see you. */
export function RoyalSeatPreview({ frame, name, font }: { frame: RoyalFrame; name: string; font?: string }) {
  const person = usePeople();
  const me = person(ME_ID);
  const seat = 58;
  const empty = (
    <span className="grid place-items-center rounded-full border border-dashed border-[#b9a3ff]/60 bg-white/[0.07] text-[18px] text-[#d8cfff]" style={{ width: seat, height: seat }} aria-hidden>
      +
    </span>
  );
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[radial-gradient(120%_90%_at_50%_0%,#3a1d6e_0%,#1b0f33_55%,#0f0a1c_100%)] px-3 pb-3 pt-6 ring-1 ring-[#b9a3ff]/25" style={{ paddingTop: 44 }}>
      <p className="absolute left-3 top-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#cbb8ff]/70">On a seat in a room</p>
      <div className="flex items-start justify-around">
        <div className="flex flex-col items-center gap-1 pt-1">
          {empty}
          <span className="text-[10px] text-cream/40">Seat 1</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <RoyalAvatar frame={frame} name={name} box={seat} font={font} />
          <span className="max-w-[90px] truncate text-[11px] font-semibold text-cream">{me.name}</span>
        </div>
        <div className="flex flex-col items-center gap-1 pt-1">
          {empty}
          <span className="text-[10px] text-cream/40">Seat 3</span>
        </div>
      </div>
    </div>
  );
}

/** What the pack gives, one line each. */
function Contents({ info, which }: { info: RoyalInfo; which: "KING" | "QUEEN" | null }) {
  const royal = which === "QUEEN" ? info.queen : which === "KING" ? info.king : undefined;
  return (
    <ul className="space-y-1.5 text-[12.5px] text-cream/90">
      <li className="flex items-center gap-2">
        <Crown className="h-4 w-4 shrink-0 text-gold" aria-hidden />
        <span>
          {info.frame?.name ?? "Royal frame"} with <b>your own name</b> <span className="text-cream/60">· {daysText(info.frameDays)}</span>
        </span>
      </li>
      {info.coins > 0 ? (
        <li className="flex items-center gap-2">
          <Coin className="h-4 w-4 shrink-0" />
          <span>
            <b>{shortCoins(info.coins)} coins</b> in your wallet
          </span>
        </li>
      ) : null}
      {info.nawab ? (
        <li className="flex flex-wrap items-center gap-2">
          <TitlePill t={pill(info.nawab)} size="sm" /> <span className="text-cream/60">· {daysText(info.titleDays)}</span>
        </li>
      ) : null}
      {royal ? (
        <li className="flex flex-wrap items-center gap-2">
          <TitlePill t={pill(royal)} size="sm" /> <span className="text-cream/60">· {daysText(info.titleDays)}</span>
        </li>
      ) : info.king || info.queen ? (
        <li className="flex flex-wrap items-center gap-2">
          {info.king ? <TitlePill t={pill(info.king)} size="sm" /> : null}
          <span className="text-[11px] text-cream/50">or</span>
          {info.queen ? <TitlePill t={pill(info.queen)} size="sm" /> : null}
          <span className="text-cream/60">· {daysText(info.titleDays)}</span>
        </li>
      ) : null}
    </ul>
  );
}

/** The highlighted Royal Pack card at the top of the wallet's coin box. */
export function RoyalPackCard({ info, munshiName, onOpen }: { info: RoyalInfo; munshiName: string; onOpen: () => void }) {
  const person = usePeople();
  const me = person(ME_ID);
  if (!info.enabled || !info.frame) return null;
  const sample = Array.from(me.name || "Your name").slice(0, PLATE_MAX).join("");
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      aria-label={`${info.name}: ${formatInr(info.priceInr)}, only with ${munshiName}`}
      className="relative mt-2 block w-full overflow-hidden rounded-3xl p-[1.5px] text-left shadow-[0_10px_34px_-10px_rgba(176,107,255,0.75)]"
    >
      {/* A gold-and-violet border that slowly turns, so this card stands out from the coin packs */}
      <span className="absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,#f6d27a,#b06bff,#ff7ac6,#f6d27a,#7b3fe4,#f6d27a)]" aria-hidden />
      <span className="relative block overflow-hidden rounded-[22px] bg-[radial-gradient(130%_100%_at_15%_0%,#4b1f86_0%,#26113f_45%,#140a22_100%)] px-4 pb-4 pt-3">
        <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <span className="relative flex items-center justify-between gap-2">
          <span className="rounded-full bg-gradient-to-r from-[#f6d27a] to-[#ffb84d] px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#2a1600] shadow-[0_0_14px_rgba(246,210,122,0.6)]">
            {info.badge || "Royal offer"}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200 ring-1 ring-emerald-400/30">
            <ShieldCheck className="h-3 w-3" aria-hidden /> Only with {munshiName}
          </span>
        </span>
        <span className="relative mt-2 flex items-center gap-3">
          <span className="grid w-[112px] shrink-0 place-items-center pt-3">
            <RoyalAvatar frame={info.frame} name={sample} box={64} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block bg-gradient-to-r from-[#fff3c4] via-[#f6d27a] to-[#ffb0e0] bg-clip-text font-display text-[20px] font-black leading-tight text-transparent">{info.name}</span>
            <span className="mt-0.5 block text-[11.5px] text-cream/70">Your name on a royal frame, shown on every seat you sit on</span>
            <span className="mt-2 block">
              <Contents info={info} which={info.myTitle} />
            </span>
          </span>
        </span>
        <span className="relative mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f6d27a] via-[#ffcf6b] to-[#f0a030] text-[15px] font-extrabold text-[#2a1600] shadow-[0_6px_22px_-6px_rgba(246,190,90,0.8)]">
          <Sparkles className="h-4 w-4" aria-hidden /> Get it for {formatInr(info.priceInr)}
        </span>
      </span>
    </motion.button>
  );
}

/**
 * The Royal Pack step in Munshi ji's sheet: write the frame name (live preview, as it looks on a seat),
 * pick King / Queen only when the profile has no gender, then go on to pay.
 */
export function RoyalPackStep({ info, munshiName, busy, initialName, initialFont, onContinue, onBack }: { info: RoyalInfo; munshiName: string; busy: boolean; initialName?: string; initialFont?: string; onContinue: (plate: string, title: "KING" | "QUEEN", font: string) => void; onBack: () => void }) {
  const person = usePeople();
  const me = person(ME_ID);
  const [name, setName] = useState(() => initialName ?? Array.from(me.name || "").slice(0, PLATE_MAX).join(""));
  const [pick, setPick] = useState<"KING" | "QUEEN" | null>(info.myTitle);
  const [font, setFont] = useState<string>(initialFont ?? "default");
  const len = plateLength(name.trim());
  const ok = len >= 1 && len <= PLATE_MAX && pick !== null;
  if (!info.frame) return null;
  const shown = name.trim() || "Your name";
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(120%_90%_at_50%_0%,#4b1f86_0%,#26113f_50%,#140a22_100%)] px-4 pb-4 pt-3 ring-1 ring-gold/40">
        <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-25" aria-hidden />
        <div className="relative grid place-items-center pb-1 pt-9" aria-label="Preview of your frame">
          <RoyalAvatar frame={info.frame} name={shown} box={118} font={font} />
        </div>
      </div>

      <RoyalSeatPreview frame={info.frame} name={shown} font={font} />

      <label className="block">
        <span className="mb-1 flex items-center justify-between text-[12px] font-semibold text-cream/70">
          <span>Name on your frame</span>
          <span className={len > PLATE_MAX ? "text-coral" : "text-cream/45"}>
            {len}/{PLATE_MAX}
          </span>
        </span>
        <input
          value={name}
          onChange={(e) => setName(Array.from(e.target.value.replace(/[\r\n\t]/g, "")).slice(0, PLATE_MAX).join(""))}
          placeholder="Up to 14 letters"
          aria-label="Name on your frame"
          autoComplete="off"
          className="h-12 w-full rounded-2xl border border-gold/40 bg-surface px-4 text-center font-display text-[17px] font-extrabold tracking-wide text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none"
        />
        <span className="mt-1 block text-[11px] text-cream/45">Everyone sees this name on your frame, in rooms and on your profile.</span>
      </label>

      <PlateFontPicker value={font} onChange={setFont} sample={shown} />

      {info.myTitle === null && (info.king || info.queen) ? (
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-cream/70">Your royal title</p>
          <div className="grid grid-cols-2 gap-2">
            {(["KING", "QUEEN"] as const).map((k) => {
              const t = k === "KING" ? info.king : info.queen;
              if (!t) return null;
              return (
                <button key={k} type="button" onClick={() => setPick(k)} aria-pressed={pick === k} className={`grid place-items-center rounded-2xl px-2 py-3 ring-1 ${pick === k ? "bg-gold/15 ring-gold" : "bg-surface ring-line"}`}>
                  <TitlePill t={pill(t)} size="sm" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">You get</p>
        <Contents info={info} which={pick} />
      </div>

      <button type="button" disabled={!ok || busy} onClick={() => onContinue(name.trim(), pick ?? "KING", font)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f6d27a] via-[#ffcf6b] to-[#f0a030] text-[15px] font-extrabold text-[#2a1600] disabled:opacity-40">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Crown className="h-4 w-4" aria-hidden />} Continue · pay {formatInr(info.priceInr)}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-cream/45">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /> {munshiName} gives you everything as soon as the payment is verified.
      </p>
      <button type="button" onClick={onBack} className="h-10 w-full rounded-full text-[13px] font-semibold text-cream/60">
        Back
      </button>
    </div>
  );
}

/** The frame name's font: the same choices as the profile's "Name font", each shown in its own lettering. */
export function PlateFontPicker({ value, onChange, sample }: { value: string; onChange: (font: string) => void; sample: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold text-cream/70">Font for your name</p>
      <div className="grid grid-cols-2 gap-2">
        {NAME_FONTS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-pressed={value === f.id}
            className={`rounded-2xl px-2 py-2.5 text-center ring-1 ${value === f.id ? "bg-gold/15 ring-gold" : "bg-surface ring-line"}`}
          >
            <span className="block truncate text-[16px] font-bold text-cream" style={nameFace(f.id)}>
              {sample}
            </span>
            <span className="block text-[11px] text-muted">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Your own name frame from the Bag (the Royal frame): change the name on it and its font, with a live preview.
 * The change shows everywhere at once (seats, profile) because rooms read the name and font from the server.
 */
export function FrameCustomizeSheet({ reward, onClose, onSaved }: { reward: BagReward | null; onClose: () => void; onSaved: () => void }) {
  return (
    <BottomSheet open={reward !== null} onClose={onClose} title="Customize your frame" tall>
      {reward ? <FrameCustomizeForm key={reward.id} reward={reward} onClose={onClose} onSaved={onSaved} /> : null}
    </BottomSheet>
  );
}

function FrameCustomizeForm({ reward, onClose, onSaved }: { reward: BagReward; onClose: () => void; onSaved: () => void }) {
  const { toast } = useApp();
  const [name, setName] = useState(reward.plateName ?? "");
  const [font, setFont] = useState(reward.plateFont ?? "default");
  const [busy, setBusy] = useState(false);
  const len = plateLength(name.trim());
  const fit = reward.frameFit;
  if (!fit || !reward.mediaUrl) return <p className="px-5 pb-6 text-[13px] text-muted">This frame can't be previewed.</p>;
  const frame: RoyalFrame = { id: reward.id, name: reward.itemName, imageUrl: reward.mediaUrl, ...fit };
  const shown = name.trim() || "Your name";
  const save = async () => {
    setBusy(true);
    try {
      await customizeFrame(reward.id, name.trim(), font);
      toast("Your frame is updated", "gold");
      onSaved();
      onClose();
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4 px-5 pb-6">
      <div className="grid place-items-center rounded-3xl bg-[radial-gradient(120%_90%_at_50%_0%,#4b1f86_0%,#26113f_50%,#140a22_100%)] pb-3 pt-9 ring-1 ring-gold/40">
        <RoyalAvatar frame={frame} name={shown} box={118} font={font} />
      </div>
      <RoyalSeatPreview frame={frame} name={shown} font={font} />
      <label className="block">
        <span className="mb-1 flex items-center justify-between text-[12px] font-semibold text-cream/70">
          <span>Name on your frame</span>
          <span className="text-cream/45">
            {len}/{PLATE_MAX}
          </span>
        </span>
        <input
          value={name}
          onChange={(e) => setName(Array.from(e.target.value.replace(/[\r\n\t]/g, "")).slice(0, PLATE_MAX).join(""))}
          aria-label="Name on your frame"
          className="h-12 w-full rounded-2xl border border-gold/40 bg-surface px-4 text-center font-display text-[17px] font-extrabold text-cream focus:border-gold focus:outline-none"
        />
      </label>
      <PlateFontPicker value={font} onChange={setFont} sample={shown} />
      <button type="button" disabled={busy || len < 1} onClick={() => void save()} className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#f6d27a] via-[#ffcf6b] to-[#f0a030] text-[15px] font-extrabold text-[#2a1600] disabled:opacity-40">
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
