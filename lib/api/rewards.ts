/**
 * Spend rewards and the server's gift catalog.
 *
 *   GET    /api/v1/rewards/me          → your Bag (effects and gifts you won) and goals
 *   POST   /api/v1/rewards/{id}/wear   → wear an effect (replaces that slot)
 *   DELETE /api/v1/rewards/{id}/wear   → take it off
 *   GET    /api/v1/gifts               → gifts on sale (public)
 *   /user/queue/rewards                → what you just won (live)
 *
 * Files the admins upload live on our own server ("/uploads/media/…"); mediaSrc
 * turns those paths into links the app can load (through the /backend proxy).
 */
import { api, API_BASE_URL } from "./client";

export type RewardSlot = "FRAME" | "BUBBLE" | "ENTRY" | "PROFILE";

export type BagReward = {
  id: string;
  ruleName: string;
  ruleKind: "RANDOM" | "GUARANTEED";
  itemName: string;
  itemType: string;
  giftId: string | null;
  quantity: number;
  /** Gifts left to send from the Bag; null for effects. */
  remaining: number | null;
  slot: RewardSlot | null;
  equipped: boolean;
  mediaUrl: string | null;
  mediaFormat: string | null;
  soundUrl: string | null;
  grantedAt: string;
  expiresAt: string | null;
};

export type RewardGoal = { ruleId: string; name: string; kind: "RANDOM" | "GUARANTEED"; coinThreshold: number; spent: number; remaining: number };

/** One worn reward effect, as rooms and profiles send it. */
export type WornEffect = { url: string; format: string | null; soundUrl: string | null; name: string | null };
export type RewardEffects = Partial<Record<RewardSlot, WornEffect>>;

export type ServerGift = {
  id: string;
  name: string;
  price: number;
  category: string;
  sortOrder: number;
  imageUrl: string | null;
  animationUrl: string | null;
  animationFormat: "SVGA" | "MP4" | null;
  soundUrl: string | null;
};

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const SLOTS: RewardSlot[] = ["FRAME", "BUBBLE", "ENTRY", "PROFILE"];

/**
 * A link the app can load: https links as they are; our server's paths
 * ("/uploads/…") through the backend address; anything else is dropped.
 */
export function mediaSrc(url: unknown): string | null {
  const u = str(url);
  if (!u) return null;
  if (/^https:\/\//i.test(u)) return u;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(u)) return u;
  if (u.startsWith("/uploads/")) return `${API_BASE_URL}${u}`;
  return null;
}

export function readRewardEffects(raw: unknown): RewardEffects {
  const o = obj(raw);
  const out: RewardEffects = {};
  if (!o) return out;
  for (const slot of SLOTS) {
    const e = obj(o[slot]);
    const url = mediaSrc(e?.url);
    if (e && url) out[slot] = { url, format: str(e.format)?.toUpperCase() ?? null, soundUrl: mediaSrc(e.soundUrl), name: str(e.name) };
  }
  return out;
}

export function readBagReward(raw: unknown): BagReward | null {
  const o = obj(raw);
  const id = str(o?.id);
  if (!o || !id) return null;
  const slot = str(o.slot);
  return {
    id,
    ruleName: str(o.ruleName) ?? "",
    ruleKind: o.ruleKind === "GUARANTEED" ? "GUARANTEED" : "RANDOM",
    itemName: str(o.itemName) ?? "Reward",
    itemType: str(o.itemType) ?? "",
    giftId: str(o.giftId),
    quantity: num(o.quantity) ?? 1,
    remaining: num(o.remaining),
    slot: slot && (SLOTS as string[]).includes(slot) ? (slot as RewardSlot) : null,
    equipped: o.equipped === true,
    mediaUrl: mediaSrc(o.mediaUrl),
    mediaFormat: str(o.mediaFormat)?.toUpperCase() ?? null,
    soundUrl: mediaSrc(o.soundUrl),
    grantedAt: str(o.grantedAt) ?? "",
    expiresAt: str(o.expiresAt),
  };
}

const opts = { auth: true, forbiddenIsAccess: true } as const;

export async function getMyRewards(): Promise<{ rewards: BagReward[]; goals: RewardGoal[] }> {
  const d = obj(await api<unknown>("/api/v1/rewards/me", opts));
  const rewards = Array.isArray(d?.rewards) ? d.rewards.map(readBagReward).filter((x): x is BagReward => Boolean(x)) : [];
  const goals = Array.isArray(d?.goals)
    ? d.goals.flatMap((g) => {
        const o = obj(g);
        const ruleId = str(o?.ruleId);
        return o && ruleId
          ? [{ ruleId, name: str(o.name) ?? "", kind: o.kind === "GUARANTEED" ? ("GUARANTEED" as const) : ("RANDOM" as const), coinThreshold: num(o.coinThreshold) ?? 0, spent: num(o.spent) ?? 0, remaining: num(o.remaining) ?? 0 }]
          : [];
      })
    : [];
  return { rewards, goals };
}

export async function wearReward(id: string, on: boolean): Promise<BagReward | null> {
  return readBagReward(await api<unknown>(`/api/v1/rewards/${encodeURIComponent(id)}/wear`, { ...opts, method: on ? "POST" : "DELETE" }));
}

export async function getGiftCatalog(): Promise<ServerGift[]> {
  const d = await api<unknown>("/api/v1/gifts", { auth: false });
  if (!Array.isArray(d)) return [];
  return d.flatMap((x) => {
    const o = obj(x);
    const id = str(o?.id);
    const price = num(o?.price);
    if (!o || !id || price === null) return [];
    const fmt = str(o.animationFormat)?.toUpperCase();
    return [
      {
        id,
        name: str(o.name) ?? id,
        price,
        category: str(o.category) ?? "Popular",
        sortOrder: num(o.sortOrder) ?? 0,
        imageUrl: mediaSrc(o.imageUrl),
        animationUrl: mediaSrc(o.animationUrl),
        animationFormat: fmt === "SVGA" || fmt === "MP4" ? fmt : null,
        soundUrl: mediaSrc(o.soundUrl),
      },
    ];
  });
}

/** The live "you won" message: the rewards in it, or [] when it isn't one. */
export function readRewardPush(raw: unknown): BagReward[] {
  const o = obj(raw);
  return Array.isArray(o?.rewards) ? o.rewards.map(readBagReward).filter((x): x is BagReward => Boolean(x)) : [];
}
