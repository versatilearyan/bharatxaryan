/**
 * Animations kept on the phone (SVGA, MP4, WebP/GIF/PNG effects), so they play instantly, even the first time in a
 * room and after the app was closed.
 *
 * - Stored in the browser's Cache Storage (survives restarts), keyed by the file's PATH: our media links are signed
 *   and change every day (?md5=…&expires=…), but the file behind a path never changes (new uploads get new names),
 *   so one download is good for ever.
 * - cachedUrl(src): a local blob: link for a cached file (downloaded and stored first if needed).
 * - peek(src): the local link only if the file is already on the phone (never downloads).
 * - warm(src): download into the cache in the background (no decoding).
 * - preloadAll(srcs): warms many files slowly (2 at a time), only on a good connection, and stops when storage runs low.
 * Anything that fails falls back to the normal network link, so nothing ever stops playing because of the cache.
 */

const CACHE = "panchayat-anim-v1";
/** Never fill more than this with preloaded animations (files played normally are still kept). */
const PRELOAD_BUDGET_BYTES = 400 * 1024 * 1024;
/** Most blob: links kept open at once (each holds its file in memory while open). */
const MAX_OPEN = 40;

const supported = () => typeof window !== "undefined" && "caches" in window && typeof fetch === "function";

/** The cache key: origin + path, no query (signed links change daily, the file doesn't). */
export function keyOf(src: string): string {
  try {
    const u = new URL(src, window.location.href);
    return u.origin + u.pathname;
  } catch {
    return src.split(/[?#]/)[0];
  }
}

const local = (src: string) => /^(blob:|data:)/i.test(src) || src.startsWith("/") && !src.startsWith("//");

let cachePromise: Promise<Cache> | null = null;
const openCache = () => (cachePromise ??= caches.open(CACHE));

/** Open blob: links by key, oldest first (Map keeps insertion order). */
const open = new Map<string, Promise<string>>();
const inFlight = new Map<string, Promise<Response | null>>();

function remember(key: string, p: Promise<string>) {
  open.set(key, p);
  while (open.size > MAX_OPEN) {
    const [oldKey, oldP] = open.entries().next().value as [string, Promise<string>];
    open.delete(oldKey);
    oldP.then((u) => u.startsWith("blob:") && setTimeout(() => URL.revokeObjectURL(u), 60_000)).catch(() => undefined);
  }
}

/** Downloads the file into the cache once (shared by every caller at the same time). */
function download(src: string, key: string): Promise<Response | null> {
  let p = inFlight.get(key);
  if (!p) {
    p = (async () => {
      const res = await fetch(src, { mode: "cors", credentials: "omit" });
      if (!res.ok) return null;
      const c = await openCache();
      await c.put(key, res.clone()).catch(() => undefined);
      return res;
    })()
      .catch(() => null)
      .finally(() => inFlight.delete(key));
    inFlight.set(key, p);
  }
  return p;
}

/** A local link if the file is already on the phone, else null (never downloads). */
export async function peek(src: string): Promise<string | null> {
  if (!supported() || local(src)) return null;
  const key = keyOf(src);
  const ready = open.get(key);
  if (ready) return ready;
  try {
    const hit = await (await openCache()).match(key);
    if (!hit) return null;
    const p = hit.blob().then((b) => URL.createObjectURL(b));
    remember(key, p);
    return await p;
  } catch {
    return null;
  }
}

/** A local link for the file: from the cache, or downloaded and stored first. Falls back to src on any problem. */
export async function cachedUrl(src: string): Promise<string> {
  if (!supported() || local(src)) return src;
  const key = keyOf(src);
  const ready = open.get(key);
  if (ready) return ready.catch(() => src);
  const p = (async () => {
    const c = await openCache();
    const res = (await c.match(key)) ?? (await download(src, key));
    if (!res) return src;
    return URL.createObjectURL(await res.blob());
  })().catch(() => src);
  remember(key, p);
  return p;
}

/** Download into the cache in the background, without decoding. */
export async function warm(src: string): Promise<void> {
  if (!supported() || local(src)) return;
  const key = keyOf(src);
  try {
    if (await (await openCache()).match(key)) return;
  } catch {
    return;
  }
  await download(src, key);
}

function goodConnection(): boolean {
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!c) return true;
  if (c.saveData) return false;
  return !/(^|-)2g$|slow-2g/.test(c.effectiveType ?? "");
}

async function roomLeft(): Promise<boolean> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est || !est.quota) return true;
    return (est.usage ?? 0) < Math.min(PRELOAD_BUDGET_BYTES, est.quota * 0.5);
  } catch {
    return true;
  }
}

let preloading = false;
const done = new Set<string>();

/**
 * Warms many animations in the background: 2 at a time, after the page is idle, only on a good connection, stopping when
 * the phone's storage for the app is half full (or 400 MB). Already-cached files are skipped quickly.
 */
export function preloadAll(srcs: (string | undefined | null)[]) {
  if (!supported()) return;
  const list = [...new Set(srcs.filter((s): s is string => Boolean(s) && !local(s as string)).filter((s) => !done.has(keyOf(s))))];
  if (!list.length || preloading) return;
  preloading = true;
  const start = () => {
    void (async () => {
      try {
        let i = 0;
        const worker = async () => {
          while (i < list.length) {
            const s = list[i++];
            if (!goodConnection() || !(await roomLeft())) return;
            await warm(s).catch(() => undefined);
            done.add(keyOf(s));
            // a short pause between files keeps the network free for what the person is doing
            await new Promise((r) => setTimeout(r, 300));
          }
        };
        await Promise.all([worker(), worker()]);
      } finally {
        preloading = false;
      }
    })();
  };
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  // Wait until the app has settled after opening
  setTimeout(() => (idle ? idle(start, { timeout: 5000 }) : start()), 6000);
}
