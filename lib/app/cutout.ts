/**
 * Removes a flat backdrop from product photos uploaded without transparency:
 * a solid black background, or a white / "fake transparent" checkerboard baked
 * into a JPG. It reads the backdrop's exact colours from the picture's edges,
 * then clears only connected pixels of those colours, starting from the edges.
 * The item's own pixels are never changed.
 *
 * Runs in the browser on a canvas. Needs the image host to allow CORS
 * (Cloudinary does); if it doesn't, or the edges aren't a flat backdrop, the
 * original URL is used unchanged.
 */

const MAX_SIDE = 512;
const cache = new Map<string, Promise<string>>();

type Rgb = [number, number, number];
type Near = (r: number, g: number, b: number) => boolean;

/** Each pixel on the picture's outer edge, in order. */
function eachBorderPixel(w: number, h: number, fn: (i: number) => void) {
  for (let x = 0; x < w; x++) {
    fn(x * 4);
    if (h > 1) fn(((h - 1) * w + x) * 4);
  }
  for (let y = 1; y < h - 1; y++) {
    fn(y * w * 4);
    if (w > 1) fn((y * w + w - 1) * 4);
  }
}

/**
 * The backdrop's colours (up to three grey tones: one for a solid fill, two or
 * three for a checkerboard), read from the edge pixels, and a test for "this
 * pixel is one of them". Null when the edge isn't a flat grey backdrop.
 */
function backdrop(px: Uint8ClampedArray, w: number, h: number): Near | null {
  const counts = new Map<number, number>();
  let total = 0;
  eachBorderPixel(w, h, (i) => {
    total++;
    const key = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const palette: Rgb[] = [];
  let covered = 0;
  for (const [key, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    if (palette.length >= 3 || covered / total >= 0.9) break;
    const c: Rgb = [((key >> 10) & 31) * 8 + 4, ((key >> 5) & 31) * 8 + 4, (key & 31) * 8 + 4];
    if (Math.max(...c) - Math.min(...c) > 24) break; // coloured: not a backdrop
    palette.push(c);
    covered += n;
  }
  if (!palette.length) return null;
  const T = 16;
  const near: Near = (r, g, b) => palette.some((c) => Math.abs(r - c[0]) <= T && Math.abs(g - c[1]) <= T && Math.abs(b - c[2]) <= T);
  let hits = 0;
  eachBorderPixel(w, h, (i) => {
    if (near(px[i], px[i + 1], px[i + 2])) hits++;
  });
  return hits / total >= 0.85 ? near : null;
}

function cutout(img: HTMLImageElement): string | null {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h); // throws if the host blocks CORS
  const px = data.data;
  const near = backdrop(px, w, h);
  if (!near) return null;

  // Flood fill from the border through backdrop-looking pixels
  const removed = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (p: number) => {
    if (removed[p]) return;
    const i = p * 4;
    if (!near(px[i], px[i + 1], px[i + 2])) return;
    removed[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * (h - 1)) push(p + w);
  }

  // Only backdrop pixels change; every pixel of the item is left exactly as uploaded
  for (let p = 0; p < w * h; p++) if (removed[p]) px[p * 4 + 3] = 0;
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL("image/png");
}

/** A data URL of the picture with its flat backdrop removed, or the original URL when that can't be done. */
export function cutoutSrc(url: string): Promise<string> {
  let job = cache.get(url);
  if (!job) {
    job = new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        try {
          resolve(cutout(img) ?? url);
        } catch {
          resolve(url);
        }
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
    cache.set(url, job);
  }
  return job;
}
