/**
 * Wallet catalogue and the signed-in person's red packets (/api/v1/wallet/*).
 *
 * - GET /api/v1/wallet/coin-packs: active coin packs (CoinPack entity).
 * - GET /api/v1/wallet/red-packets: active red packet products (RedPacketProduct entity).
 * - GET /api/v1/wallet/me/red-packets/inventory: this person's packets
 *   (UserRedPacketInventoryResponse). Always sent with the person's own token;
 *   the server works out who they are from it, so no user id is ever sent.
 *
 * Read-only. There is no purchase endpoint yet, so nothing here adds coins or
 * packets. Fields are read defensively: a missing or oddly typed value is
 * dropped instead of breaking the wallet.
 */
import { api, ApiError, API_BASE_URL } from "./client";
import { readToken } from "@/lib/auth/token";

export type WalletCoinPack = {
  id: string;
  name: string;
  coins: number;
  priceInRupees: number;
  bonusCoins: number;
  bonusPercentage: number;
  badge?: string;
  sortOrder: number;
  imageUrl?: string;
};

export type WalletRedPacket = {
  id: string;
  name: string;
  coinValue: number;
  priceInRupees: number;
  imageUrl?: string;
  sortOrder: number;
};

/** Product id → how many the person owns. */
export type RedPacketInventory = Record<string, number>;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);

function list(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const d = obj(data);
  if (d) for (const k of ["data", "content", "items"]) if (Array.isArray(d[k])) return d[k] as unknown[];
  throw new ApiError("The server sent a reply the app couldn't read.", 200, "http");
}

/** Keeps the backend's sortOrder; ties keep the order the server sent. */
const bySortOrder = <T extends { sortOrder: number }>(rows: T[]) => rows.map((r, i) => [r, i] as const).sort((a, b) => a[0].sortOrder - b[0].sortOrder || a[1] - b[1]).map(([r]) => r);

function toCoinPack(raw: unknown): WalletCoinPack | null {
  const d = obj(raw);
  const id = str(d?.id);
  const coins = num(d?.coins);
  const price = num(d?.priceInRupees);
  if (!d || !id || coins === undefined || price === undefined) return null;
  // The backend only returns active packs; skip one that says otherwise
  if (d.active === false) return null;
  return {
    id,
    name: str(d.name) ?? "",
    coins,
    priceInRupees: price,
    bonusCoins: num(d.bonusCoins) ?? 0,
    bonusPercentage: num(d.bonusPercentage) ?? 0,
    badge: str(d.badge),
    sortOrder: num(d.sortOrder) ?? 0,
    imageUrl: str(d.imageUrl),
  };
}

function toRedPacket(raw: unknown): WalletRedPacket | null {
  const d = obj(raw);
  const id = str(d?.id);
  const coinValue = num(d?.coinValue);
  const price = num(d?.priceInRupees);
  if (!d || !id || coinValue === undefined || price === undefined) return null;
  if (d.active === false) return null;
  return { id, name: str(d.name) ?? "Red packet", coinValue, priceInRupees: price, imageUrl: str(d.imageUrl), sortOrder: num(d.sortOrder) ?? 0 };
}

/**
 * One inventory row → [productId, quantity].
 *
 * UserRedPacketInventoryResponse wasn't available to check, so this accepts the
 * likely names: the product id as productId / redPacketProductId / redPacketId /
 * product.id, and the count as quantity / count / ownedQuantity / availableQuantity.
 * A row with neither is skipped (never guessed). Once the DTO is confirmed, trim
 * this to its real field names.
 */
function toInventoryRow(raw: unknown): [string, number] | null {
  const d = obj(raw);
  if (!d) return null;
  const product = obj(d.product) ?? obj(d.redPacketProduct) ?? obj(d.redPacket);
  const id = str(d.productId) ?? str(d.redPacketProductId) ?? str(d.redPacketId) ?? str(product?.id);
  const qty = num(d.quantity) ?? num(d.count) ?? num(d.ownedQuantity) ?? num(d.availableQuantity);
  if (!id || qty === undefined) return null;
  return [id, Math.max(0, Math.floor(qty))];
}

/** Sends the person's token when they're signed in, without signing them out if these public lists say 401/403. */
const listOpts = () => ({ auth: Boolean(readToken()), forbiddenIsAccess: true });

export async function getWalletCoinPacks(): Promise<WalletCoinPack[]> {
  const rows = list(await api<unknown>("/api/v1/wallet/coin-packs", listOpts()));
  return bySortOrder(rows.map(toCoinPack).filter((p): p is WalletCoinPack => p !== null));
}

export async function getWalletRedPackets(): Promise<WalletRedPacket[]> {
  const rows = list(await api<unknown>("/api/v1/wallet/red-packets", listOpts()));
  return bySortOrder(rows.map(toRedPacket).filter((p): p is WalletRedPacket => p !== null));
}

/** The signed-in person's red packets. A 401 runs the app's normal sign-out. */
export async function getMyRedPacketInventory(): Promise<RedPacketInventory> {
  const rows = list(await api<unknown>("/api/v1/wallet/me/red-packets/inventory", { auth: true }));
  const out: RedPacketInventory = {};
  for (const r of rows) {
    const row = toInventoryRow(r);
    if (row) out[row[0]] = (out[row[0]] ?? 0) + row[1];
  }
  return out;
}

/** An image link the browser can load: absolute links (Cloudinary) as they are, server paths through the API base. */
export function walletImageSrc(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return url.startsWith("/") && API_BASE_URL ? `${API_BASE_URL}${url}` : undefined;
}
