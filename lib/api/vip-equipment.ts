/**
 * Your equipped VIP cosmetics (VipCosmeticEquipmentController):
 *
 *   GET    /api/v1/vip/cosmetics/equipped          → what you're wearing
 *   POST   /api/v1/vip/cosmetics/{cosmeticId}/wear → put one on
 *   DELETE /api/v1/vip/cosmetics/{cosmeticId}/wear → take it off (204, no body)
 *
 * The backend knows who you are from your token, so no user id is ever sent;
 * nobody can change someone else's. The cosmetic ids come from the catalogue
 * (GET /api/v1/vip/cosmetics). Whether you may wear one is the server's call:
 * a refusal is shown, never worked around.
 *
 * The DTO (EquippedCosmeticResponse) wasn't available here, so rows are read
 * defensively: cosmeticId, vipLevel, type, format, url (and id / cosmeticType /
 * secureUrl as other spellings). A row without an id or a known type is left out.
 */
import { api, ApiError } from "./client";
import { COSMETIC_TYPES, type CosmeticType } from "./vip-cosmetics";

export type EquippedCosmetic = {
  cosmeticId: string;
  cosmeticType: CosmeticType;
  vipLevel: number | null;
  /** As the server sent it, upper-cased (e.g. SVGA, PNG, ANIMATED), or null. */
  format: string | null;
  /** https link, or null. */
  url: string | null;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);

export function readEquipped(raw: unknown): EquippedCosmetic | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  const id = str(d.cosmeticId) ?? str(d.id);
  const type = (str(d.type) ?? str(d.cosmeticType))?.toUpperCase();
  if (!id || !COSMETIC_TYPES.includes(type as CosmeticType)) return null;
  const lvl = typeof d.vipLevel === "number" && Number.isInteger(d.vipLevel) ? d.vipLevel : null;
  const url = str(d.url) ?? str(d.secureUrl);
  return { cosmeticId: id, cosmeticType: type as CosmeticType, vipLevel: lvl, format: str(d.format)?.toUpperCase() ?? null, url: url && /^https:\/\//i.test(url) ? url : null };
}

/** What you're wearing now. An empty list is fine (nothing equipped). */
export async function getEquippedCosmetics(): Promise<EquippedCosmetic[]> {
  const body = await api<unknown>("/api/v1/vip/cosmetics/equipped", { auth: true, forbiddenIsAccess: true });
  if (body === null || body === undefined) return [];
  const list = Array.isArray(body) ? body : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).data) ? ((body as Record<string, unknown>).data as unknown[]) : null;
  if (!list) throw new ApiError("The server sent your equipped cosmetics in a shape the app couldn't read.", 200, "http");
  return list.map(readEquipped).filter((c): c is EquippedCosmetic => c !== null);
}

const wearPath = (cosmeticId: string) => {
  if (!/^\d+$/.test(cosmeticId) && !/^[\w-]{1,64}$/.test(cosmeticId)) throw new ApiError("That cosmetic can't be worn.", 0, "http");
  return `/api/v1/vip/cosmetics/${encodeURIComponent(cosmeticId)}/wear`;
};

/** Put a cosmetic on. Resolves only when the server accepted it. */
export async function wearCosmetic(cosmeticId: string): Promise<void> {
  await api<unknown>(wearPath(cosmeticId), { method: "POST", auth: true, forbiddenIsAccess: true });
}

/** Take a cosmetic off. A 204 (no body) is success. */
export async function takeOffCosmetic(cosmeticId: string): Promise<void> {
  await api<unknown>(wearPath(cosmeticId), { method: "DELETE", auth: true, forbiddenIsAccess: true });
}

/** A short message for a refused wear / take-off. The server's own message is used when it sent one. */
export function equipErrorText(e: unknown, action: "wear" | "remove"): string {
  if (e instanceof ApiError) {
    if (e.code === "network" || e.code === "timeout" || e.code === "unauthorized" || e.code === "config" || e.code === "ngrok_interstitial") return e.message;
    if (e.status === 403) return e.message && !/^forbidden$/i.test(e.message) ? e.message : action === "wear" ? "Your VIP doesn't include this cosmetic." : "You can't change this cosmetic.";
    if (e.status === 404) return "That cosmetic doesn't exist any more.";
    if (e.message) return e.message;
  }
  return action === "wear" ? "Couldn't put it on. Try again." : "Couldn't take it off. Try again.";
}
