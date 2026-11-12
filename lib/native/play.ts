/**
 * Buying coins, VIP and red packets in the Android app with Google Play Billing (Google's rule for digital items).
 * The app (React Native) opens Google's purchase sheet and gives back a purchase token; the server asks Google if it is
 * really paid and credits it once. Only after that is the purchase "finished" (consumed) so it can be bought again.
 */
import { api } from "@/lib/api/client";
import { nativeCall } from "./bridge";
import type { PaymentPurpose } from "@/lib/api/payments";

type PlayProduct = { purpose: PaymentPurpose; productId: number; playProductId: string };
type Purchase = { productId: string; purchaseToken: string };

const opts = { auth: true } as const;
let cache: { at: number; list: PlayProduct[] } | null = null;

export async function playProducts(force = false): Promise<PlayProduct[]> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.list;
  const raw = await api<unknown>("/api/v1/payments/google-play/products", opts);
  const list = Array.isArray(raw)
    ? raw.flatMap((x) => {
        const o = x && typeof x === "object" ? (x as Record<string, unknown>) : null;
        const purpose = o?.purpose;
        return o && (purpose === "COIN_PACK" || purpose === "VIP" || purpose === "RED_PACKET") && typeof o.productId === "number" && typeof o.playProductId === "string" ? [{ purpose, productId: o.productId, playProductId: o.playProductId } as PlayProduct] : [];
      })
    : [];
  cache = { at: Date.now(), list };
  return list;
}

/** Whether this item is on sale in Google Play (the admin sets the Play product id for each item). */
export async function playProductFor(purpose: PaymentPurpose, productId: number): Promise<string | null> {
  const list = await playProducts();
  return list.find((p) => p.purpose === purpose && p.productId === productId)?.playProductId ?? null;
}

async function verify(purpose: PaymentPurpose, productId: number, playProductId: string, purchaseToken: string) {
  return api<{ credited?: boolean; already?: boolean }>("/api/v1/payments/google-play/verify", { ...opts, method: "POST", body: { purpose, productId, playProductId, purchaseToken } });
}

/** Buy one item. Resolves when the server has credited it. Rejects if the person cancels or Google or the server refuses. */
export async function buyWithGooglePlay(purpose: PaymentPurpose, productId: number): Promise<void> {
  const playProductId = await playProductFor(purpose, productId);
  if (!playProductId) throw new Error("This item isn't on sale in Google Play yet.");
  const bought = await nativeCall<Purchase>("buy", { productId: playProductId });
  await verify(purpose, productId, playProductId, bought.purchaseToken);
  await nativeCall("finishPurchase", { purchaseToken: bought.purchaseToken, productId: playProductId }).catch(() => undefined);
}

/** Purchases Google took payment for but that were never credited (the app closed right after paying): credit them now. Returns how many were credited. */
export async function recoverPurchases(): Promise<number> {
  const pending = await nativeCall<Purchase[]>("pendingPurchases", undefined, 30_000).catch(() => [] as Purchase[]);
  if (!Array.isArray(pending) || !pending.length) return 0;
  const list = await playProducts(true);
  let credited = 0;
  for (const p of pending) {
    const item = list.find((x) => x.playProductId === p.productId);
    if (!item) continue;
    try {
      const r = await verify(item.purpose, item.productId, item.playProductId, p.purchaseToken);
      if (r.credited) credited++;
      await nativeCall("finishPurchase", { purchaseToken: p.purchaseToken, productId: p.productId }).catch(() => undefined);
    } catch {
      /* try again next time the app opens */
    }
  }
  return credited;
}
