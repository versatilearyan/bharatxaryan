"use client";

/**
 * Crop before upload: drag the picture (up / down / sideways) and zoom with the slider, inside a frame that has the
 * same shape it is shown in (a circle for the profile picture, the profile banner's strip for a banner).
 * "Done" cuts exactly what is inside the frame on a canvas and hands back a JPEG file.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Check, Move, X, ZoomIn } from "lucide-react";
import { useBackClose } from "@/lib/app/back";
import { MotionOn } from "@/components/ui/MotionOn";

type Props = {
  file: File | null;
  /** width / height of the frame: 1 for the profile picture */
  aspect: number;
  round?: boolean;
  /** longest side of the cut picture, in pixels */
  maxOut: number;
  title: string;
  onCancel: () => void;
  onDone: (file: File) => void;
};

function ImageCropperInner({ file, aspect, round = false, maxOut, title, onCancel, onDone }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState({ w: 320, h: 320 / aspect });
  const [busy, setBusy] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  useBackClose(Boolean(file), onCancel);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    setNat(null);
    setZoom(1);
    setOff({ x: 0, y: 0 });
    const img = new Image();
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const fit = () => {
      const w = Math.min(window.innerWidth - 32, 440);
      setBox({ w, h: w / aspect });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [file, aspect]);

  if (!file || typeof document === "undefined") return null;

  // At zoom 1 the picture just covers the frame
  const base = nat ? Math.max(box.w / nat.w, box.h / nat.h) : 1;
  const scale = base * zoom;
  const dw = nat ? nat.w * scale : box.w;
  const dh = nat ? nat.h * scale : box.h;
  const maxX = Math.max(0, (dw - box.w) / 2);
  const maxY = Math.max(0, (dh - box.h) / 2);
  const clamp = (o: { x: number; y: number }) => ({ x: Math.max(-maxX, Math.min(maxX, o.x)), y: Math.max(-maxY, Math.min(maxY, o.y)) });
  const o = clamp(off);

  const down = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: o.x, oy: o.y };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setOff(clamp({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }));
  };
  const up = () => {
    drag.current = null;
  };

  const done = async () => {
    if (!nat || !url || busy) return;
    setBusy(true);
    try {
      // The frame's rectangle in the picture's own pixels
      const sw = box.w / scale;
      const sh = box.h / scale;
      const sx = (dw / 2 - box.w / 2 - o.x) / scale;
      const sy = (dh / 2 - box.h / 2 - o.y) / scale;
      const k = Math.min(1, maxOut / Math.max(sw, sh));
      const cw = Math.max(1, Math.round(sw * k));
      const ch = Math.max(1, Math.round(sh * k));
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9));
      if (!blob) throw new Error("no blob");
      onDone(new File([blob], file.name.replace(/\.\w+$/, "") + "-crop.jpg", { type: "image/jpeg" }));
    } catch {
      onDone(file);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[320] flex flex-col bg-[radial-gradient(120%_60%_at_50%_0%,#4a1626_0%,#1c1018_55%,#0b080d_100%)]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative z-10 flex items-center gap-2 px-3 pb-2 pt-[calc(var(--st,0px)+10px)]">
        <button type="button" onClick={onCancel} aria-label="Cancel" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-cream">
          <X className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-center bg-gradient-to-r from-[#fff1c9] via-gold to-[#ffb37a] bg-clip-text font-display text-[18px] font-extrabold text-transparent">{title}</h2>
        <button type="button" onClick={() => void done()} disabled={!nat || busy} className="flex h-10 items-center gap-1 rounded-full bg-gradient-to-b from-[#f6d899] to-[#d9a84f] px-4 text-[13px] font-extrabold text-[#2a1a0c] disabled:opacity-50">
          <Check className="h-4 w-4" /> Done
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div
          ref={frame}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="relative touch-none select-none overflow-hidden bg-black/40"
          style={{ width: box.w, height: box.h, borderRadius: round ? "9999px" : 18, cursor: "grab", boxShadow: "0 0 0 2px rgb(231 188 114 / 0.85), 0 0 0 9999px rgb(0 0 0 / 0.55)" }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none" style={{ width: dw, height: dh, transform: `translate(calc(-50% + ${o.x}px), calc(-50% + ${o.y}px))` }} />
          ) : null}
          {/* rule-of-thirds guide */}
          <span className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, transparent 33%, rgb(255 255 255 / 0.18) 33%, rgb(255 255 255 / 0.18) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgb(255 255 255 / 0.18) 66%, rgb(255 255 255 / 0.18) calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(to bottom, transparent 33%, rgb(255 255 255 / 0.18) 33%, rgb(255 255 255 / 0.18) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgb(255 255 255 / 0.18) 66%, rgb(255 255 255 / 0.18) calc(66% + 1px), transparent calc(66% + 1px))" }} aria-hidden />
        </div>
        <p className="relative z-10 mt-4 flex items-center gap-1.5 text-[12.5px] font-semibold text-cream/70">
          <Move className="h-4 w-4 text-gold" aria-hidden /> Ungli se upar-neeche ya side me khiskao
        </p>
      </div>

      <div className="relative z-10 px-6 pb-[calc(var(--sb,0px)+28px)]">
        <label className="flex items-center gap-3">
          <ZoomIn className="h-5 w-5 shrink-0 text-gold" aria-hidden />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-[#e7bc72]"
          />
        </label>
      </div>
    </motion.div>,
    document.body,
  );
}

/** Stays animated in Smooth graphics too (see MotionOn). */
export function ImageCropper(props: Parameters<typeof ImageCropperInner>[0]) {
  return (
    <MotionOn>
      <ImageCropperInner {...props} />
    </MotionOn>
  );
}
