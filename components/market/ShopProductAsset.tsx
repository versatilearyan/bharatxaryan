"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { readAssetType, type ShopAssetType } from "@/lib/api/shop";
import { cutoutSrc } from "@/lib/app/cutout";

/** The asset type the backend gave, or else the one the URL's file extension implies (query string and hash ignored). */
export function assetTypeOf(url: string | undefined, given?: string): ShopAssetType | undefined {
  const t = readAssetType(given);
  if (t) return t;
  if (!url) return undefined;
  const path = url.split(/[?#]/)[0].toLowerCase();
  const ext = path.slice(path.lastIndexOf(".") + 1);
  if (ext === "svga") return "SVGA";
  if (ext === "svg") return "SVG";
  return "IMAGE";
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** True while the element is on screen or close to it. */
function useNearViewport<T extends Element>(margin = "200px") {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, near] as const;
}

/**
 * Shows a shop product's picture: an image or SVG as an <img>, and an SVGA as
 * a playing animation. SVGA files are only downloaded and played while the
 * card is near the screen, and the player is destroyed when it scrolls away
 * or the card goes. With reduced motion turned on, an SVGA plays once instead
 * of looping. Anything that can't load shows a quiet placeholder. Give it a
 * key of the URL so a new asset starts fresh.
 */
export function ShopProductAsset({ url, type, name, className = "" }: { url?: string; type?: string; name: string; className?: string }) {
  const kind = assetTypeOf(url, type);
  const reduced = useReducedMotion();
  const [box, near] = useNearViewport<HTMLDivElement>();
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  // Photos uploaded with a black or white/checkered backdrop: show them with it removed
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!url || kind !== "IMAGE" || !near || imgSrc) return;
    let live = true;
    cutoutSrc(url).then((s) => live && setImgSrc(s));
    return () => {
      live = false;
    };
  }, [url, kind, near, imgSrc]);
  const src = kind === "IMAGE" ? imgSrc : url;

  const fallback = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted" role="img" aria-label={`${name}: picture unavailable`}>
      <ImageOff className="h-6 w-6" aria-hidden />
      <span className="text-[10px] font-semibold">No preview</span>
    </div>
  );

  return (
    <div ref={box} className={`relative flex aspect-square w-full items-center justify-center overflow-hidden ${className}`} data-asset-type={kind ?? "none"} data-asset-state={!url ? "failed" : state}>
      {!url || state === "failed" ? (
        fallback
      ) : kind === "SVGA" ? (
        <>
          {near && (
            <SvgaAnim
              key={`${url}|${reduced}`}
              src={url}
              loop={reduced ? 1 : 0}
              className="h-full w-full object-contain"
              onReady={() => setState("ready")}
              onError={() => setState("failed")}
            />
          )}
          {state === "loading" && <span className="absolute h-7 w-7 animate-spin rounded-full border-2 border-cream/15 border-t-gold" aria-label={`Loading ${name}`} />}
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote product art from any host, sized by the box */}
          {src && (
          <img
            src={src}
            alt={name}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setState("ready")}
            onError={() => setState("failed")}
            className={`h-full w-full object-contain transition-opacity ${state === "ready" ? "opacity-100" : "opacity-0"}`}
          />
          )}
          {state === "loading" && <span className="absolute inset-3 animate-pulse rounded-2xl bg-cream/5" aria-hidden />}
        </>
      )}
    </div>
  );
}
