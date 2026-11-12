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

type Backdrop = { palette: Rgb[]; match: (i: number) => number; cell: number };

/**
 * The backdrop's colours (up to three grey tones: one for a solid fill, two or
 * three for a checkerboard), read from the edge pixels; a test giving which of
 * them a pixel is (-1 for none); and the checkerboard's square size. Null when
 * the edge isn't a flat grey backdrop.
 */
function backdrop(px: Uint8ClampedArray, w: number, h: number): Backdrop | null {
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
    if (palette.some((q) => Math.abs(q[0] - c[0]) <= 8)) continue; // same tone as one we have
    palette.push(c);
    covered += n;
  }
  if (!palette.length) return null;
  const T = 16;
  const match = (i: number) => {
    let best = -1;
    let bestD = T + 1;
    palette.forEach((c, k) => {
      const d = Math.max(Math.abs(px[i] - c[0]), Math.abs(px[i + 1] - c[1]), Math.abs(px[i + 2] - c[2]));
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    return best;
  };
  let hits = 0;
  eachBorderPixel(w, h, (i) => {
    if (match(i) >= 0) hits++;
  });
  if (hits / total < 0.85) return null;

  // Checkerboard square size: the typical run of one tone along the top row
  let cell = 0;
  if (palette.length > 1) {
    const runs: number[] = [];
    let run = 1;
    for (let x = 1; x < w; x++) {
      if (match(x * 4) === match((x - 1) * 4)) run++;
      else {
        runs.push(run);
        run = 1;
      }
    }
    runs.sort((a, b) => a - b);
    cell = runs.length >= 4 ? runs[runs.length >> 1] : 0;
  }
  return { palette, match, cell };
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
  const bg = backdrop(px, w, h);
  if (!bg) return null;
  const tone = new Int8Array(w * h);
  for (let p = 0; p < w * h; p++) tone[p] = bg.match(p * 4);

  /** Every pixel of backdrop tone connected to the start pixels. */
  const seen = new Uint8Array(w * h);
  const region = (starts: number[]) => {
    const out: number[] = [];
    const stack: number[] = [];
    for (const p of starts) {
      if (seen[p] || tone[p] < 0) continue;
      seen[p] = 1;
      stack.push(p);
    }
    while (stack.length) {
      const p = stack.pop()!;
      out.push(p);
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p < w * (h - 1) ? p + w : -1]) {
        if (q < 0 || seen[q] || tone[q] < 0) continue;
        seen[q] = 1;
        stack.push(q);
      }
    }
    return out;
  };

  // 1. The backdrop around the item: everything reachable from the edges
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  const removed = region(border);

  // 2. Backdrop showing through holes in the item (inside a ring band). A
  // checkerboard hole must look like the checkerboard: a pixel and the one a
  // square further along differ in tone. That keeps white stones and pearls,
  // which are one smooth tone. A solid backdrop hole must be a sizeable patch.
  const minSize = Math.max(16, Math.round(w * h * (bg.cell ? 0.0015 : 0.004)));
  for (let p = 0; p < w * h; p++) {
    if (seen[p] || tone[p] < 0) continue;
    const part = region([p]);
    if (part.length < minSize) continue;
    if (bg.cell) {
      let checked = 0;
      let alternating = 0;
      for (const q of part) {
        const x = q % w;
        if (x + bg.cell >= w || tone[q + bg.cell] < 0) continue;
        checked++;
        if (tone[q + bg.cell] !== tone[q]) alternating++;
      }
      if (checked < minSize / 4 || alternating / checked < 0.5) continue;
    }
    for (const q of part) removed.push(q);
  }

  // Only backdrop pixels change; every pixel of the item is left exactly as uploaded
  for (const p of removed) px[p * 4 + 3] = 0;
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
