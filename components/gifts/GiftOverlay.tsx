"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GiftArt } from "@/components/art/GiftArt";
import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { giftById } from "@/lib/app/data";
import { useApp, type GiftFx } from "@/lib/app/store";

/**
 * Plays the gift animation above everything in the app.
 * Ordinary gifts pop and float with sparkles; legendary gifts take over the
 * screen with golden rays, a burst of particles and a royal banner.
 */
export function GiftOverlay() {
  const { giftFx, clearGiftFx } = useApp();

  useEffect(() => {
    if (!giftFx) return;
    const g = giftById(giftFx.giftId);
    // Video and SVGA gifts close when they end; this is only a safety net (an SVGA may still be downloading)
    const t = window.setTimeout(clearGiftFx, g.svga ? 30000 : g.video ? 16000 : g.tier === "legendary" ? 3800 : 2400);
    return () => window.clearTimeout(t);
  }, [giftFx, clearGiftFx]);

  return (
    <AnimatePresence>
      {giftFx ? (
        giftById(giftFx.giftId).svga ? (
          <SvgaGift key={giftFx.id} fx={giftFx} onDone={clearGiftFx} />
        ) : giftById(giftFx.giftId).video ? (
          <VideoGift key={giftFx.id} fx={giftFx} onDone={clearGiftFx} />
        ) : giftById(giftFx.giftId).tier === "legendary" ? (
          <Legendary key={giftFx.id} fx={giftFx} />
        ) : (
          <Ordinary key={giftFx.id} fx={giftFx} />
        )
      ) : null}
    </AnimatePresence>
  );
}

function Banner({ fx, legendary }: { fx: GiftFx; legendary?: boolean }) {
  const g = giftById(fx.giftId);
  return (
    <motion.div
      className={`absolute left-3 right-3 top-[calc(env(safe-area-inset-top)+64px)] flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 shadow-xl ${
        legendary ? "bg-gradient-to-r from-[#5a1a28] via-[#3a1622] to-[#1a0b11] ring-1 ring-gold/60" : "bg-gradient-to-r from-coral/95 to-pink/80"
      }`}
      initial={{ x: "-110%" }}
      animate={{ x: 0 }}
      exit={{ x: "110%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      role="status"
    >
      <span className={`grid h-9 w-9 place-items-center rounded-full ${legendary ? "bg-gold/20" : "bg-white/20"}`}>
        <GiftArt id={fx.giftId} className="h-7 w-7" />
      </span>
      <p className="min-w-0 text-[12.5px] leading-tight text-white">
        {legendary ? <span className="mr-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold">Legendary</span> : null}
        <span className="font-bold">{fx.fromName}</span> sent <span className="font-bold">{fx.toName}</span>
        <br />
        <span className={legendary ? "text-foil font-bold" : "font-semibold text-white/90"}>
          {g.name}
          {fx.count > 1 ? ` ×${fx.count}` : ""}
        </span>
      </p>
    </motion.div>
  );
}

function Ordinary({ fx }: { fx: GiftFx }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-[60]" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} aria-hidden={false}>
      <Banner fx={fx} />
      <div className="absolute inset-0 grid place-items-center">
        <motion.div
          className="relative h-36 w-36"
          initial={{ scale: 0.2, opacity: 0, y: 40 }}
          animate={reduce ? { scale: 1, opacity: 1, y: 0 } : { scale: [0.2, 1.2, 1], opacity: 1, y: [40, 0, -20] }}
          exit={{ opacity: 0, y: -80, scale: 0.8 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        >
          <div className="absolute inset-0 rounded-full bg-pink/30 blur-2xl" />
          <GiftArt id={fx.giftId} className="relative h-full w-full drop-shadow-[0_10px_30px_rgb(255_104_124/0.6)]" />
          {!reduce
            ? Array.from({ length: 10 }).map((_, i) => {
                const a = (i / 10) * Math.PI * 2;
                return (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                    style={{ background: i % 2 ? "#e7bc72" : "#ff687c" }}
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{ x: Math.cos(a) * 110, y: Math.sin(a) * 110, opacity: 0, scale: 0.4 }}
                    transition={{ duration: 1, delay: 0.25, ease: "easeOut" }}
                  />
                );
              })
            : null}
        </motion.div>
      </div>
      {fx.count > 1 ? (
        <motion.p className="absolute inset-x-0 top-[62%] text-center font-display text-4xl font-extrabold italic text-gold drop-shadow" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}>
          ×{fx.count}
        </motion.p>
      ) : null}
    </motion.div>
  );
}

function Legendary({ fx }: { fx: GiftFx }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgb(90_26_40/0.85),rgb(10_6_8/0.92)_70%)]" />
      {/* Rotating rays */}
      <motion.div
        className="absolute left-1/2 top-[45%] h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 opacity-60"
        style={{ background: "repeating-conic-gradient(from 0deg, rgb(231 188 114 / 0.35) 0deg 6deg, transparent 6deg 18deg)", maskImage: "radial-gradient(circle, black 10%, transparent 60%)" }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 14, ease: "linear", repeat: Infinity }}
      />
      <Banner fx={fx} legendary />
      <div className="absolute inset-x-0 top-[45%] flex -translate-y-1/2 flex-col items-center">
        <motion.div
          className="relative h-52 w-52"
          initial={{ scale: 0.2, opacity: 0, rotate: -12 }}
          animate={reduce ? { scale: 1, opacity: 1, rotate: 0 } : { scale: [0.2, 1.25, 1], opacity: 1, rotate: [-12, 6, 0] }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <div className="absolute inset-4 rounded-full bg-gold/40 blur-3xl" />
          <GiftArt id={fx.giftId} className="relative h-full w-full drop-shadow-[0_0_40px_rgb(231_188_114/0.9)]" />
        </motion.div>
        <motion.p
          className="mt-4 font-display text-[28px] font-extrabold text-foil"
          initial={{ opacity: 0, y: 14, letterSpacing: "0.3em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.02em" }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          {giftById(fx.giftId).name}
        </motion.p>
        <motion.p className="mt-1 text-[13px] text-cream/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
          {fx.fromName} → {fx.toName}
          {fx.count > 1 ? ` ×${fx.count}` : ""}
        </motion.p>
      </div>
      {/* Gold particles */}
      {!reduce
        ? Array.from({ length: 26 }).map((_, i) => {
            const x = (i * 37) % 100;
            return (
              <motion.span
                key={i}
                className="absolute top-0 h-1.5 w-1.5 rounded-full"
                style={{ left: `${x}%`, background: i % 3 ? "#e7bc72" : "#fff1d5", boxShadow: "0 0 8px rgb(231 188 114 / 0.9)" }}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 900, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.6 + (i % 5) * 0.3, delay: (i % 7) * 0.18, ease: "easeIn" }}
              />
            );
          })
        : null}
    </motion.div>
  );
}

/**
 * Video gifts (Princess Flower) play their own full-screen animation inside the app
 * frame. Sound is on when the browser allows it (sending is a tap, so it usually
 * does); otherwise the video plays muted. Tap Skip to close early.
 */
function VideoGift({ fx, onDone }: { fx: GiftFx; onDone: () => void }) {
  const g = giftById(fx.giftId);
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (reduce) {
      // Reduced motion: show a still for a moment instead of the animation
      const t = window.setTimeout(onDone, 2500);
      return () => window.clearTimeout(t);
    }
    v.play().catch(() => {
      setMuted(true);
      v.muted = true;
      v.play().catch(onDone);
    });
  }, [reduce, onDone]);

  const { framed, floating, ratio } = g.video!;
  // Framed gifts play in a centred window with soft, blurred edges; the room stays visible around it.
  // Floating gifts fill the width at their own shape, fading out at the top and bottom into the room.
  const mask = framed
    ? "radial-gradient(ellipse 50% 50% at 50% 50%, black 55%, transparent 100%)"
    : floating
      ? "linear-gradient(to bottom, transparent 0, black 14%, black 86%, transparent 100%)"
      : "linear-gradient(to bottom, transparent 0, black 6%, black 92%, transparent 100%)";
  return (
    <motion.div className={`absolute inset-0 z-[60] overflow-hidden ${framed ? "bg-black/35" : floating ? "" : "bg-black"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <motion.div
        className={framed ? "absolute left-[12%] top-1/2 aspect-[3/4] w-[76%] -translate-y-1/2" : floating ? "absolute inset-x-0 top-1/2 w-full -translate-y-1/2" : "absolute inset-0"}
        style={floating ? { aspectRatio: ratio ?? "9 / 16" } : undefined}
        initial={framed ? { scale: 0.7, opacity: 0 } : floating ? { scale: 0.92, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
      >
        <video
          ref={ref}
          src={g.video!.src}
          poster={g.video!.poster}
          playsInline
          preload="auto"
          muted={muted}
          onEnded={onDone}
          className="h-full w-full object-cover"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
          aria-label={`${g.name} gift animation`}
        />
      </motion.div>
      {/* No banner here: the gift news ribbon (GiftBanner) announces big gifts */}
      <button type="button" onClick={onDone} className="absolute right-3 top-[calc(env(safe-area-inset-top)+16px)] rounded-full bg-black/45 px-3 py-1 text-[12px] font-bold text-white backdrop-blur">
        Skip
      </button>
    </motion.div>
  );
}

/**
 * SVGA gifts (Storm Guardian) play once across the whole app frame. The file is
 * phone-shaped (510×1104), so it's drawn to cover the screen and only the
 * edges are trimmed on wider screens. Its sound is a separate file that starts
 * with the first frame; if the browser blocks sound, the animation plays
 * silently. With reduced motion, or if the file can't load, the gift's picture
 * shows for a moment instead.
 */
function SvgaGift({ fx, onDone }: { fx: GiftFx; onDone: () => void }) {
  const g = giftById(fx.giftId);
  const svga = g.svga!;
  const reduce = useReducedMotion();
  const [state, setState] = useState<"loading" | "playing" | "failed">("loading");
  const sound = useRef<HTMLAudioElement | null>(null);
  const still = reduce || state === "failed";

  useEffect(() => {
    if (!still) return;
    const t = window.setTimeout(onDone, 2500);
    return () => window.clearTimeout(t);
  }, [still, onDone]);
  // Stop the sound when the gift closes early (Skip) or ends
  useEffect(
    () => () => {
      sound.current?.pause();
      sound.current = null;
    },
    [],
  );
  const started = () => {
    setState("playing");
    if (!svga.sound) return;
    const a = new Audio(svga.sound);
    sound.current = a;
    a.play().catch(() => undefined);
  };

  return (
    <motion.div className="absolute inset-0 z-[60] overflow-hidden bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      {still ? (
        <motion.div className="absolute inset-0 grid place-items-center" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svga.still ?? svga.icon} alt={`${g.name} gift`} className="w-[72%] max-w-[340px] object-contain drop-shadow-[0_0_40px_rgb(110_160_255/0.7)]" />
        </motion.div>
      ) : (
        <>
          <SvgaAnim src={svga.src} loop={1} observe={false} onReady={started} onEnd={onDone} onError={() => setState("failed")} className="absolute inset-0 h-full w-full object-cover" />
          {state === "loading" ? <span className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/15 border-t-gold" aria-label="Loading gift" /> : null}
        </>
      )}
      {/* No banner here: the gift news ribbon (GiftBanner) announces big gifts */}
      <button type="button" onClick={onDone} className="absolute right-3 top-[calc(env(safe-area-inset-top)+16px)] rounded-full bg-black/45 px-3 py-1 text-[12px] font-bold text-white backdrop-blur">
        Skip
      </button>
    </motion.div>
  );
}
