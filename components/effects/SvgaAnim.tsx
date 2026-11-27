"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { isLite } from "@/lib/app/graphics";

type Video = Awaited<ReturnType<import("svga").Parser["load"]>>;

// One parser for the app, and each file is downloaded and parsed only once.
// The parser can't handle two files at the same time (the second one never
// resolves), so loads wait their turn.
let parser: import("svga").Parser | null = null;
const cache = new Map<string, Promise<Video>>();
let queue: Promise<unknown> = Promise.resolve();

/** Download and parse a file ahead of time, so it can play the moment it's shown. */
export function preloadSvga(src: string) {
  // Videos and pictures are fetched by the browser itself; only SVGA needs parsing ahead
  const path = src.split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".mp4") || /\.(png|jpe?g|webp|gif|avif)$/.test(path)) return Promise.resolve(undefined);
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
/** In Smooth graphics: about a 720p screen at 1.5×. */
const LITE_CANVAS_PIXELS = 1_100_000;

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
  // Smooth graphics (battery saver / weaker phones): fewer pixels per frame, so big gifts never stutter or heat the phone
  const lite = isLite();
  let k = Math.min(lite ? 1.5 : 3, (window.devicePixelRatio || 1) * shown, Math.sqrt((lite ? LITE_CANVAS_PIXELS : MAX_CANVAS_PIXELS) / (size.width * size.height)));
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
/** What kind of file a link is, from its extension (admin uploads can be SVGA, MP4 or a picture). */
export function mediaKind(src: string): "svga" | "mp4" | "image" {
  const path = src.split(/[?#]/)[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(path)) return "mp4";
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(path)) return "image";
  return "svga";
}

/**
 * A person's picture and name put into an animation's own slots (entry banners made with an avatar placeholder).
 * slot: the image key for the picture; "" finds it by its name (avatar, head, photo …). The name goes into a key
 * named like "name" or "nick" when the file has one.
 */
export type SvgaFill = { photo?: string; name?: string; slot?: string; onMissing?: () => void };

const AVATAR_KEY = /(avatar|head|photo|portrait|touxiang|tou_?xiang|user_?(img|pic|icon|head)|^img_?avatar|^pic_?user)/i;
const NAME_KEY = /(nick|user_?name|^name|_name$|^text_?name)/i;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** A round picture (or the first letter of the name when there's no picture), drawn square for the slot. */
async function avatarCanvas(photo: string | undefined, name: string | undefined): Promise<HTMLCanvasElement> {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  const img = photo ? await loadImage(photo) : null;
  if (img) {
    const k = Math.max(size / img.width, size / img.height);
    const w = img.width * k;
    const h = img.height * k;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#5b3a8a";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 120px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((name ?? "?").trim().slice(0, 1).toUpperCase() || "?", size / 2, size / 2 + 6);
  }
  ctx.restore();
  return c;
}

/** The name, white with a dark outline, shrunk to fit the slot. */
function nameCanvas(name: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 96;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  let px = 64;
  ctx.font = `800 ${px}px system-ui, sans-serif`;
  while (px > 24 && ctx.measureText(name).width > c.width - 16) {
    px -= 4;
    ctx.font = `800 ${px}px system-ui, sans-serif`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(4, px / 8);
  ctx.strokeStyle = "rgba(40,12,0,0.9)";
  ctx.strokeText(name, c.width / 2, c.height / 2);
  ctx.fillStyle = "#fff";
  ctx.fillText(name, c.width / 2, c.height / 2);
  return c;
}

/** The parsed file with the person's picture and name in its slots (a copy: the cached file stays as it is). */
async function filled(video: Video, fill: SvgaFill): Promise<Video> {
  const keys = Object.keys(video.images ?? {});
  const avatarKey = fill.slot ? (keys.includes(fill.slot) ? fill.slot : null) : (keys.find((k) => AVATAR_KEY.test(k)) ?? null);
  const nameKey = fill.name ? (keys.find((k) => k !== avatarKey && NAME_KEY.test(k)) ?? null) : null;
  if (!avatarKey) fill.onMissing?.();
  if (!avatarKey && !nameKey) return video;
  const replace: Record<string, HTMLCanvasElement> = {};
  if (avatarKey) replace[avatarKey] = await avatarCanvas(fill.photo, fill.name);
  if (nameKey && fill.name) replace[nameKey] = nameCanvas(fill.name);
  return { ...video, replaceElements: { ...video.replaceElements, ...replace } } as Video;
}

export function SvgaAnim(props: { src: string; loop?: number; className?: string; style?: CSSProperties; onEnd?: () => void; onReady?: () => void; onError?: () => void; observe?: boolean; fill?: SvgaFill }) {
  const kind = mediaKind(props.src);
  if (kind === "mp4") return <Mp4Anim {...props} />;
  if (kind === "image") return <ImageAnim {...props} />;
  return <SvgaCanvas {...props} />;
}

/** An MP4 effect: muted (sound plays separately), inline, looping when `loop` is 0. */
function Mp4Anim({ src, loop = 0, className = "", style, onEnd, onReady, onError }: { src: string; loop?: number; className?: string; style?: CSSProperties; onEnd?: () => void; onReady?: () => void; onError?: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <video
      src={src}
      className={`object-contain ${className}`}
      style={style}
      autoPlay
      muted
      playsInline
      loop={loop === 0}
      preload="auto"
      aria-hidden
      onPlaying={onReady}
      onEnded={onEnd}
      onError={() => {
        warnSvga(src, new Error("the video couldn't be played"));
        setFailed(true);
        onError?.();
      }}
    />
  );
}

/** A still picture effect. A one-shot (`loop` > 0) ends after a short show. */
function ImageAnim({ src, loop = 0, className = "", style, onEnd, onReady, onError }: { src: string; loop?: number; className?: string; style?: CSSProperties; onEnd?: () => void; onReady?: () => void; onError?: () => void }) {
  const [failed, setFailed] = useState(false);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => {
    if (loop === 0) return;
    const t = window.setTimeout(() => endRef.current?.(), 3000);
    return () => window.clearTimeout(t);
  }, [src, loop]);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`object-contain ${className}`}
      style={style}
      aria-hidden
      onLoad={onReady}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}

function SvgaCanvas({ src, loop = 0, className = "", style, onEnd, onReady, onError, observe = true, fill }: { src: string; loop?: number; className?: string; style?: CSSProperties; onEnd?: () => void; onReady?: () => void; onError?: () => void; observe?: boolean; fill?: SvgaFill }) {
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
    let stopWatch = () => {};
    (async () => {
      try {
        const [{ Player }, parsed] = await Promise.all([import("svga"), load(src)]);
        const video = fill ? await filled(parsed, fill) : parsed;
        if (cancelled || !ref.current) return;
        player = new Player({ container: ref.current, loop, isUseIntersectionObserver: observe });
        player.onEnd = () => endRef.current?.();
        await player.mount(video);
        if (cancelled) return;
        const el = ref.current;
        const p = player;
        if (el.clientWidth > 0) sharpen(p, el, video.size);
        else {
          // Not laid out yet (hidden, or still sliding in): sharpen as soon as it has a size, or it stays blurry
          const ro = new ResizeObserver(() => {
            if (el.clientWidth > 0) {
              ro.disconnect();
              sharpen(p, el, video.size);
            }
          });
          ro.observe(el);
          stopWatch = () => ro.disconnect();
        }
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
      stopWatch();
      player?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, loop, observe, fill?.photo, fill?.name, fill?.slot]);

  if (failed) return null;
  return <canvas ref={ref} className={className} style={style} aria-hidden />;
}
