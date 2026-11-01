"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Video = Awaited<ReturnType<import("svga").Parser["load"]>>;

// One parser for the app, and each file is downloaded and parsed only once.
// The parser can't handle two files at the same time (the second one never
// resolves), so loads wait their turn.
let parser: import("svga").Parser | null = null;
const cache = new Map<string, Promise<Video>>();
let queue: Promise<unknown> = Promise.resolve();

/** Download and parse a file ahead of time, so it can play the moment it's shown. */
export function preloadSvga(src: string) {
  return load(src);
}

async function load(src: string) {
  let p = cache.get(src);
  if (!p) {
    p = queue.then(() =>
      import("svga").then(({ Parser }) => {
        parser ??= new Parser();
        return parser.load(src);
      }),
    );
    queue = p.catch(() => undefined);
    p.catch(() => cache.delete(src));
    cache.set(src, p);
  }
  return p;
}

/**
 * In development only: say which file couldn't be played and the likely cause,
 * so a missing VIP cosmetic isn't a silent mystery. Only the file's address
 * (without any query string) is logged, never tokens or response bodies.
 */
const warned = new Set<string>();
export function warnSvga(src: string, e: unknown) {
  if (process.env.NODE_ENV === "production" || warned.has(src)) return;
  warned.add(src);
  const where = src.split("?")[0];
  let crossOrigin = false;
  try {
    crossOrigin = new URL(src, window.location.href).origin !== window.location.origin;
  } catch {
    /* not a URL */
  }
  const why = e instanceof Error && e.message ? e.message : String(e ?? "unknown error");
  console.warn(
    `[SVGA] Couldn't play ${where}: ${why}.` +
      (crossOrigin ? " The file is on another site: check it downloads (status 200) and that the response allows this site (Access-Control-Allow-Origin)." : "") +
      " Check it is an SVGA file. The normal UI is shown instead.",
  );
}

/** Never draw an animation bigger than this many canvas pixels (about 1080×2340 at 3×), to keep phones smooth. */
const MAX_CANVAS_PIXELS = 3_200_000;

/**
 * The player draws every frame at the file's own size (setSize in svga 2.1.1),
 * so on a phone a 510 px wide file shown 390 px wide on a 3× screen is
 * stretched about 2.3 times by the browser and looks soft. This draws it at the
 * size it's shown at instead: the canvas gets that many pixels, and the
 * player's drawing surface is scaled to match, with high-quality smoothing.
 * It relies on the player's internal `ofsCanvas` (svga 2.1.1) and skips itself
 * if that isn't there. Firefox is skipped: there the player draws each frame on
 * a fresh canvas that can't be scaled.
 */
function sharpen(player: import("svga").Player, canvas: HTMLCanvasElement, size: { width: number; height: number }) {
  if (/firefox/i.test(navigator.userAgent) || !size.width || !size.height) return;
  const ofs = (player as unknown as { ofsCanvas?: HTMLCanvasElement | OffscreenCanvas }).ofsCanvas;
  if (!ofs || typeof ofs.getContext !== "function") return;
  const shown = Math.max(canvas.clientWidth / size.width, canvas.clientHeight / size.height);
  let k = Math.min(3, (window.devicePixelRatio || 1) * shown, Math.sqrt(MAX_CANVAS_PIXELS / (size.width * size.height)));
  if (!Number.isFinite(k) || k <= 1.05) return;
  k = Math.round(k * 100) / 100;
  canvas.width = Math.round(size.width * k);
  canvas.height = Math.round(size.height * k);
  // The player sizes the drawing surface from the canvas each frame, then asks it for a context to draw the sprites on
  const get = ofs.getContext.bind(ofs) as (type: "2d") => CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  (ofs as unknown as { getContext: typeof get }).getContext = (type: "2d") => {
    const ctx = get(type);
    if (ctx && "setTransform" in ctx) {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.imageSmoothingQuality = "high";
    }
    return ctx;
  };
}

/**
 * Plays an SVGA animation on a canvas. `loop` 0 loops forever. The canvas is
 * sized with CSS (className or style), and drawn at the size it's shown at
 * (see sharpen). Renders nothing visible if the file can't be played. onReady
 * fires once the first frame is playing, onError when the file can't be
 * downloaded or parsed.
 */
export function SvgaAnim({ src, loop = 0, className = "", style, onEnd, onReady, onError, observe = true }: { src: string; loop?: number; className?: string; style?: CSSProperties; onEnd?: () => void; onReady?: () => void; onError?: () => void; observe?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    let player: import("svga").Player | null = null;
    let cancelled = false;
    (async () => {
      try {
        const [{ Player }, video] = await Promise.all([import("svga"), load(src)]);
        if (cancelled || !ref.current) return;
        player = new Player({ container: ref.current, loop, isUseIntersectionObserver: observe });
        player.onEnd = () => endRef.current?.();
        await player.mount(video);
        if (cancelled) return;
        sharpen(player, ref.current, video.size);
        player.start();
        readyRef.current?.();
      } catch (e) {
        if (!cancelled) {
          warnSvga(src, e);
          setFailed(true);
          errorRef.current?.();
        }
      }
    })();
    return () => {
      cancelled = true;
      player?.destroy();
    };
  }, [src, loop, observe]);

  if (failed) return null;
  return <canvas ref={ref} className={className} style={style} aria-hidden />;
}
