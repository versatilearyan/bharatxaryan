/**
 * The shop catalogue (/api/v1/shop/*). Read-only: there is no purchase
 * endpoint yet, so nothing here spends coins.
 *
 * Fields follow the shop API notes. Every field is read defensively, so a
 * missing or oddly typed value stays undefined instead of breaking the page.
 * Lists may come back as a plain array or wrapped in { data } or { content }.
 */
import { api } from "./client";

export type ShopAssetType = "IMAGE" | "SVG" | "SVGA";

export type ShopCategory = {
  id: string;
  name: string;
  displayOrder?: number;
  active?: boolean;
};

export type ShopProduct = {
  id: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  price?: number;
  rarity?: string;
  assetUrl?: string;
  assetType?: ShopAssetType;
  displayOrder?: number;
  active?: boolean;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

function list(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const k of ["data", "content", "items"]) {
      const v = d[k];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object" && Array.isArray((v as Record<string, unknown>).content)) return (v as Record<string, unknown>).content as unknown[];
    }
  }
  return [];
}

/** A single object, unwrapped from { data } if the backend wraps it. */
function one(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (d.id === undefined && d.data && typeof d.data === "object" && !Array.isArray(d.data)) return d.data as Record<string, unknown>;
  return d;
}

export function readAssetType(v: unknown): ShopAssetType | undefined {
  const t = typeof v === "string" ? v.trim().toUpperCase() : "";
  return t === "IMAGE" || t === "SVG" || t === "SVGA" ? t : undefined;
}

function readCategory(raw: unknown): ShopCategory | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  if (!id) return null;
  return { id, name: str(r.name) ?? "Untitled", displayOrder: num(r.displayOrder), active: bool(r.active) };
}

function readProduct(raw: unknown): ShopProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  if (!id) return null;
  return {
    id,
    categoryId: str(r.categoryId),
    categoryName: str(r.categoryName),
    name: str(r.name) ?? "Untitled",
    description: str(r.description),
    price: num(r.price),
    rarity: str(r.rarity),
    assetUrl: str(r.assetUrl),
    assetType: readAssetType(r.assetType),
    displayOrder: num(r.displayOrder),
    active: bool(r.active),
  };
}

/** Lowest displayOrder first; items without one go last, in the order the server sent them. */
function byDisplayOrder<T extends { displayOrder?: number }>(items: T[]) {
  return items
    .map((x, i) => [x, i] as const)
    .sort(([a, i], [b, j]) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) || i - j)
    .map(([x]) => x);
}

// Inactive items are hidden; a missing `active` counts as active.
const visible = <T extends { active?: boolean }>(x: T | null): x is T => !!x && x.active !== false;

/** GET /shop/categories */
export async function getShopCategories() {
  const data = await api<unknown>("/api/v1/shop/categories", { auth: true });
  return byDisplayOrder(list(data).map(readCategory).filter(visible));
}

/** GET /shop/products, or GET /shop/products?categoryId= for one category. */
export async function getShopProducts(categoryId?: string) {
  const q = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
  const data = await api<unknown>(`/api/v1/shop/products${q}`, { auth: true });
  return byDisplayOrder(list(data).map(readProduct).filter(visible));
}

/** GET /shop/products/{id}. Null when the answer isn't a product. */
export async function getShopProduct(id: string) {
  const data = await api<unknown>(`/api/v1/shop/products/${encodeURIComponent(id)}`, { auth: true });
  return readProduct(one(data));
}
