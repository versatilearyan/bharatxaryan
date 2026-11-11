/**
 * Removes a flat backdrop from product photos uploaded without transparency:
 * a solid black background, or a white / "fake transparent" checkerboard baked
 * into a JPG. Starting from the picture's edges, it clears every connected
 * pixel that looks like that backdrop, so the item itself (even its white or
 * dark parts, when they aren't touching the edge through backdrop) stays.
 *
 * Runs in the browser on a canvas. Needs the image host to allow CORS
 * (Cloudinary does); if it doesn't, or the edges aren't a flat backdrop, the
 * original URL is used unchanged.
 */

const MAX_SIDE = 512;
const cache = new Map<string, Promise<string>>();

type Tone = "dark" | "light";

const isBackdrop = (tone: Tone, r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 26) return false; // has colour: part of the item
  return tone === "dark" ? max <= 44 : min >= 188;
};

/** Which flat backdrop the picture's border is, or null when it isn't one. */
function borderTone(px: Uint8ClampedArray, w: number, h: number): Tone | null {
  let dark = 0;
  let light = 0;
  let total = 0;
  const look = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    total++;
    if (px[i + 3] < 128) return; // already transparent
    if (isBackdrop("dark", px[i], px[i + 1], px[i + 2])) dark++;
    else if (isBackdrop("light", px[i], px[i + 1], px[i + 2])) light++;
  };
  for (let x = 0; x < w; x++) {
    look(x, 0);
    look(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    look(0, y);
    look(w - 1, y);
  }
  if (dark / total >= 0.7) return "dark";
  if (light / total >= 0.7) return "light";
  return null;
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
  const tone = borderTone(px, w, h);
  if (!tone) return null;

  // Flood fill from the border through backdrop-looking pixels
  const removed = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (p: number) => {
    if (removed[p]) return;
    const i = p * 4;
    if (!isBackdrop(tone, px[i], px[i + 1], px[i + 2])) return;
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

  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (removed[p]) {
      px[i + 3] = 0;
      continue;
    }
    // Soften the outline: a pixel touching the cleared area fades by how close it is to the backdrop
    const x = p % w;
    const edge = (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) || (p >= w && removed[p - w]) || (p < w * (h - 1) && removed[p + w]);
    if (edge) {
      const v = tone === "dark" ? Math.max(px[i], px[i + 1], px[i + 2]) : 255 - Math.min(px[i], px[i + 1], px[i + 2]);
      px[i + 3] = Math.round(px[i + 3] * Math.min(1, 0.35 + v / 160));
    }
  }
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
