/**
 * Your profile picture and banner, kept on this device only (TEMPORARY).
 *
 * Images are stored as Blobs in IndexedDB ("panchayat-profile-images"), one
 * record per signed-in user, so another account on the same browser never sees
 * them. They are never sent to the backend: a blob: URL isn't a public address.
 * They don't sync across devices or browsers, and clearing site data removes
 * them. Replace with real uploads (e.g. Cloudinary) when the backend has them.
 */

export type ImageKind = "photo" | "banner";
export type LocalImages = { photo?: Blob; banner?: Blob };

const DB = "panchayat-profile-images";
const STORE = "images";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
/** Largest file accepted before cropping. The saved image is cropped and compressed, so it's much smaller. */
export const MAX_IMAGE_MB = 8;

/** "" if the file is fine to use, otherwise a message to show. */
export function imageFileError(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return "Choose a JPG, PNG, WebP or GIF image.";
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `That image is over ${MAX_IMAGE_MB} MB. Choose a smaller one.`;
  return "";
}

/** The record key for one user: the backend user ID when known, else the sign-in email. */
export function imageOwner(user: { id?: string | number; email?: string }) {
  if (user.id !== undefined && user.id !== "") return `id:${user.id}`;
  return user.email ? `email:${user.email.toLowerCase()}` : "";
}

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadImages(owner: string): Promise<LocalImages | undefined> {
  if (!owner) return undefined;
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction(STORE).objectStore(STORE).get(owner);
    req.onsuccess = () => resolve(req.result as LocalImages | undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Replaces this user's images. A missing kind is removed. */
export async function saveImages(owner: string, images: LocalImages) {
  if (!owner) throw new Error("Not signed in");
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, "readwrite");
    const clean: LocalImages = {};
    if (images.photo) clean.photo = images.photo;
    if (images.banner) clean.banner = images.banner;
    if (clean.photo || clean.banner) tx.objectStore(STORE).put(clean, owner);
    else tx.objectStore(STORE).delete(owner);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Couldn't save images"));
    tx.onabort = () => reject(tx.error ?? new Error("Couldn't save images (storage may be full)"));
  });
}

/** Moves images saved under an older key (email) to the user's ID key, once. */
export async function moveImages(from: string, to: string) {
  if (!from || !to || from === to) return;
  const [old, current] = await Promise.all([loadImages(from), loadImages(to)]);
  if (!old || current) return;
  await saveImages(to, old);
  await saveImages(from, {});
}

/** data: URL (from older saves in localStorage) → Blob. */
export async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}
