/**
 * VIP cosmetics catalogue: GET /api/v1/vip/cosmetics[?level=&type=&format=].
 *
 * The admin panel uploads each VIP level's frame, chat bubble, entry animation and
 * badge to Cloudinary; this lists them. It says what exists for each level only, not
 * what a person owns or wears (that stays with the Bag and the VIP status).
 *
 * The reply is a JSON array. Rows are read defensively: one without an id, a level
 * from 1 to 7, a known type and format, or an https link is left out, never guessed.
 */
import { api, ApiError } from "./client";
import { readToken } from "@/lib/auth/token";

export const COSMETIC_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;
export const COSMETIC_TYPES = ["FRAME", "BUBBLE", "ENTRY", "BADGE"] as const;
export const COSMETIC_FORMATS = ["SVGA", "PNG"] as const;
export type CosmeticType = (typeof COSMETIC_TYPES)[number];
export type CosmeticFormat = (typeof COSMETIC_FORMATS)[number];

export type VipCosmetic = {
  id: string;
  vipLevel: number;
  cosmeticType: CosmeticType;
  format: CosmeticFormat;
  /** Cloudinary https link. */
  url: string;
  originalFilename?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CosmeticFilter = { level?: number; type?: CosmeticType; format?: CosmeticFormat };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const isLevel = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 7;

export function toVipCosmetic(raw: unknown): VipCosmetic | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  const id = str(d.id);
  const level = typeof d.vipLevel === "string" ? Number(d.vipLevel) : d.vipLevel;
  const type = str(d.cosmeticType)?.toUpperCase();
  const format = str(d.format)?.toUpperCase();
  // The public list calls the link `url`; the admin list calls it `secureUrl`
  const url = str(d.url) ?? str(d.secureUrl);
  if (!id || !isLevel(level) || !COSMETIC_TYPES.includes(type as CosmeticType) || !COSMETIC_FORMATS.includes(format as CosmeticFormat)) return null;
  if (!url || !/^https:\/\//i.test(url)) return null;
  return {
    id,
    vipLevel: level,
    cosmeticType: type as CosmeticType,
    format: format as CosmeticFormat,
    url,
    originalFilename: str(d.originalFilename),
    createdAt: str(d.createdAt),
    updatedAt: str(d.updatedAt),
  };
}

/** The query string for a filter, after checking it. Throws before any request for a bad level. */
export function cosmeticsQuery({ level, type, format }: CosmeticFilter = {}): string {
  if (level !== undefined && !isLevel(level)) throw new ApiError("VIP cosmetics exist for VIP 1 to 7 only.", 0, "http");
  const q = new URLSearchParams();
  if (level !== undefined) q.set("level", String(level));
  if (type) q.set("type", type);
  if (format) q.set("format", format);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Cosmetics matching every filter given (none = all of them). */
export async function getCosmetics(filter: CosmeticFilter = {}): Promise<VipCosmetic[]> {
  const body = await api<unknown>(`/api/v1/vip/cosmetics${cosmeticsQuery(filter)}`, {
    // Sends the person's token when signed in; a 403 here doesn't sign them out
    auth: Boolean(readToken()),
    forbiddenIsAccess: true,
  });
  if (!Array.isArray(body)) throw new ApiError("The server sent VIP cosmetics in a shape the app couldn't read.", 200, "http");
  return body.map(toVipCosmetic).filter((c): c is VipCosmetic => c !== null);
}

export const getAllCosmetics = () => getCosmetics();
export const getCosmeticsByLevel = (level: number) => getCosmetics({ level });
export const getCosmeticsByType = (type: CosmeticType) => getCosmetics({ type });
export const getCosmeticsByFormat = (format: CosmeticFormat) => getCosmetics({ format });
