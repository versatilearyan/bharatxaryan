/**
 * Make a picked photo small before it's uploaded, so uploads are quick even on
 * mobile data. Phone photos are often 3–8 MB at 4000 px; the app never shows
 * them bigger than a few hundred pixels.
 *
 * - avatar: centre-cropped square, at most 512×512 (it's always shown round)
 * - banner: scaled to fit 1600×1600, shape kept
 *
 * Encoded as WebP at 0.85 (JPEG where the browser can't make WebP). If that
 * wouldn't be smaller than the original, the original is sent unchanged.
 */
export type ShrinkKind = "avatar" | "banner";

const LIMITS: Record<ShrinkKind, number> = { avatar: 512, banner: 1600 };
const QUALITY = 0.85;

function load(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

const encode = (canvas: HTMLCanvasElement, type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

export async function shrinkForUpload(file: File, kind: ShrinkKind): Promise<File> {
  const img = await load(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const max = LIMITS[kind];
  // Source rectangle (centre square for avatars) and output size
  let sx = 0, sy = 0, sw = w, sh = h;
  if (kind === "avatar") {
    const side = Math.min(w, h);
    sx = (w - side) / 2;
    sy = (h - side) / 2;
    sw = sh = side;
  }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const ow = Math.max(1, Math.round(sw * scale));
  const oh = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = ow;
  canvas.height = oh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);

  let blob = await encode(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg");
  if (!blob) return file;
  // Already small and the right shape: keep the original
  const unchanged = scale === 1 && sw === w && sh === h;
  if (unchanged && blob.size >= file.size) return file;
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || kind;
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}
