/**
 * Parivar (family), run by the server (/api/v1/parivar). The server checks every rule and price; the app only shows
 * what it answers. Creating costs coins from your own wallet and needs the Charm the admin has set.
 */
import { api } from "./client";

export type ParivarRole = "LEADER" | "DEPUTY" | "ADMIN" | "MEMBER";
export type ParivarPerm = "EDIT_PROFILE" | "EDIT_ANNOUNCEMENT" | "ACCEPT_APPLICATIONS" | "REMOVE_MEMBERS" | "APPOINT_DEPUTY" | "APPOINT_ADMIN" | "MANAGE_TREASURY" | "MANAGE_SETTINGS";

export type ParivarConfig = {
  enabled: boolean;
  creationOpen: boolean;
  requiredCoins: number | null;
  requiredCharm: number;
  consumeCharm: boolean;
  myCoins: number;
  myCharm: number;
  myParivarId: string | null;
  minDonation: number;
  canCreate: boolean;
  problems: string[];
};

export type ParivarCard = {
  id: string;
  code: number;
  name: string;
  sign: string;
  emblem: string;
  color: string;
  logoUrl?: string;
  frame?: string;
  intro?: string;
  leader?: string;
  level: number;
  exp: number;
  weekExp: number;
  joinMode: "OPEN" | "APPROVAL";
  members: number;
  capacity: number;
  myApplication?: string | null;
};

export type ParivarMemberInfo = { userId: string; name: string; avatarUrl?: string; publicId: number; role: ParivarRole; contribution: number; joinedAt: string };
export type ParivarFeedItem = { id: string; kind: string; exp: number; coins: number; text: string; who?: string; whoAvatar?: string; other?: string; at: string };

export type ParivarProfile = ParivarCard & {
  announcement?: string;
  nextLevelExp: number | null;
  funds: number;
  createdAt: string;
  memberCount: number;
  members: ParivarMemberInfo[];
  myRole: ParivarRole | null;
  myPerms: ParivarPerm[];
  /** What the Mukhiya pays (coins) to change the name, title or logo (set in the admin panel). */
  identityPrices?: { name: number; sign: number; logo: number };
  /** What the next level asks for (activity and family fund) and whether the Parivar has it; null at the top level. */
  levelUp?: { level: number; expNeeded: number; fundNeeded: number; expOk: boolean; fundOk: boolean; ready: boolean } | null;
  pendingApplications: number;
  weekRank: number | null;
  totalRank: number | null;
  activity?: ParivarFeedItem[];
};

export type RankRow = { rank: number; id: string; name: string; sign: string; emblem: string; color: string; logoUrl?: string; frame?: string; level: number; score: number; members: number };
export type ParivarApplication = { id: string; userId: string; name: string; avatarUrl?: string; publicId: number; at: string };

const opts = { auth: true, forbiddenIsAccess: true } as const;
const key = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
const base = "/api/v1/parivar";

export const parivarApi = {
  config: () => api<ParivarConfig>(`${base}/config`, opts),
  mine: () => api<{ parivarId: string | null; role: ParivarRole | null; appliedTo: string | null; enabled: boolean }>(`${base}/me`, opts),
  list: (q: string, sort: string, page = 0) => api<{ content: ParivarCard[]; totalElements: number }>(`${base}?q=${encodeURIComponent(q)}&sort=${sort}&page=${page}&size=20`, opts),
  ranking: (period: "weekly" | "total") => api<{ rows: RankRow[]; mine: RankRow | null }>(`${base}/ranking?period=${period}`, opts),
  profile: (id: string) => api<ParivarProfile>(`${base}/${id}`, opts),
  /** The same gift to every other member of your Parivar (the server checks the whole cost first). */
  giftAll: (giftId: string, count: number) => api<{ sent: number; coins: number; charm: number; earned: number; senderBalance: number }>(`${base}/gift-all`, { ...opts, method: "POST", body: { giftId, count, requestId: key() } }),
  uploadLogo: (file: Blob) => {
    const form = new FormData();
    form.append("file", file, "logo.jpg");
    return api<{ path: string; url: string }>(`${base}/logo`, { ...opts, method: "POST", body: form, timeoutMs: 60_000 });
  },
  create: (body: { name: string; sign: string; emblem: string; color: string; intro: string; joinMode: "OPEN" | "APPROVAL"; logo?: string }, idem: string) =>
    api<ParivarProfile>(base, { ...opts, method: "POST", body, headers: { "Idempotency-Key": idem } }),
  newKey: key,
  join: (id: string) => api<ParivarProfile>(`${base}/${id}/join`, { ...opts, method: "POST" }),
  withdraw: (id: string) => api<ParivarProfile>(`${base}/${id}/withdraw`, { ...opts, method: "POST" }),
  leave: () => api<unknown>(`${base}/leave`, { ...opts, method: "POST" }),
  applications: (id: string) => api<ParivarApplication[]>(`${base}/${id}/applications`, opts),
  decide: (id: string, appId: string, accept: boolean) => api<unknown>(`${base}/${id}/applications/${appId}/${accept ? "accept" : "reject"}`, { ...opts, method: "POST" }),
  removeMember: (id: string, userId: string) => api<ParivarProfile>(`${base}/${id}/members/${userId}/remove`, { ...opts, method: "POST" }),
  setRole: (id: string, userId: string, role: ParivarRole) => api<ParivarProfile>(`${base}/${id}/members/${userId}/role`, { ...opts, method: "PUT", body: { role } }),
  levelUp: (id: string) => api<ParivarProfile>(`${base}/${id}/level-up`, { ...opts, method: "POST" }),
  changeIdentity: (id: string, body: { name?: string; sign?: string; logo?: string; key: string }) => api<ParivarProfile>(`${base}/${id}/identity`, { ...opts, method: "PUT", body }),
  update: (id: string, body: { intro?: string; announcement?: string; joinMode?: "OPEN" | "APPROVAL"; emblem?: string; color?: string; logo?: string }) => api<ParivarProfile>(`${base}/${id}`, { ...opts, method: "PUT", body }),
  donate: (id: string, amount: number) => api<ParivarProfile>(`${base}/${id}/donate`, { ...opts, method: "POST", body: { amount }, headers: { "Idempotency-Key": key() } }),
  tag: (userId: string) => api<{ id?: string; sign?: string; name?: string; emblem?: string; color?: string; frame?: string }>(`${base}/tag/${userId}`, opts),
};

/* ---------- the rest: tasks, shop, Gacha, chests, Kavach, Chori, chat, news, voice ---------- */

export type TaskRow = { id: string; title: string; period: "DAILY" | "WEEKLY"; metric: string; target: number; progress: number; rewardKind: string; rewardAmount: number; claimed: boolean; claimable: boolean };
export type TasksInfo = { tasks: TaskRow[]; todayExp: number; weekExp: number; checkedIn: boolean; checkinExp: number; dayResetsAt: string; weekResetsAt: string };
export type ShopItem = { id: string; name: string; imageUrl?: string; kind: string; qty: number; priceFunds: number; priceCoins: number; dailyLimit: number; boughtToday: number };
export type CheerTier = { id: string; name: string; times: number; coinsCost: number; expGain: number; dailyLimit: number };
export type GachaReward = { giftId?: string; kind: string; amount: number; rarity: string; label: string; imageUrl?: string; chance: number };
export type GachaMachine = { freeFundCost: number; rollPriceCoins: number; id: string; name: string; tier: string; imageUrl?: string; animationUrl?: string; priceFunds: number; serviceFeeCoins: number; freePerDay: number; freeLeft: number; minLevel: number; locked: boolean; cards: number; rewards: GachaReward[] };
export type GachaInfo = { machines: GachaMachine[]; funds: number; canRoll: boolean; tickets: number; ticketPrice: number };
export type GachaResult = { kind: string; amount: number; label: string; rarity: string; paidWith: string };
export type ChestType = { id: string; name: string; imageUrl?: string; priceFunds: number; pieces: number; owned: number };
export type ChestSent = { id: string; name: string; pieces: number; claimed: number; status: string; expiresAt: string; sentBy?: string; claimedByMe: boolean };
export type ChestsInfo = { types: ChestType[]; sent: ChestSent[]; canSend: boolean; funds: number };
export type KavachType = { id: string; name: string; imageUrl?: string; strength: number; durationMinutes: number; priceFunds: number; cooldownMinutes: number; dailyLimit: number; minLevel: number; locked: boolean; owned: number; usedToday: number; cooldownLeftSeconds: number };
export type KavachInfo = { active: { name: string; strength: number; expiresAt: string } | null; types: KavachType[]; history: { name: string; strength: number; by?: string; startsAt: string; expiresAt: string }[]; canManage: boolean; funds: number };
export type ChoriTarget = { id: string; name: string; sign: string; emblem: string; color: string; level: number; funds: number; kavach: boolean };
export type ChoriInfo = {
  enabled: boolean;
  membersAllowed: boolean;
  canToggle: boolean;
  blockedReason: string | null;
  attemptsLeft: number;
  dailyAttempts: number;
  cooldownLeftSeconds: number;
  successPercent: number;
  takePercent: number;
  maxTake: number;
  failPenalty: number;
  myKavach: { name: string; strength: number; expiresAt: string } | null;
  targets: ChoriTarget[];
  history: { id: string; direction: "IN" | "OUT"; result: string; amount: number; who?: string; other: string; at: string }[];
};
export type NewsPost = { id: string; kind: "NOTICE" | "RULE" | "EVENT"; title: string; body: string; pinned: boolean; author?: string; at: string; unread: boolean };
export type ChatMsg = { id: number; userId: string | null; kind: "TEXT" | "SYSTEM"; text: string; name?: string; avatarUrl?: string; at: string };
export type ChatPrefs = { muted: boolean; foldGifts: boolean; giftSound: boolean; background: string };
export type VoiceInfo = { enabled: boolean; minLevel: number; unlocked: boolean; roomId: string | null; canStart: boolean };
export type WorldNewsItem = { id: string; kind: "LEVEL_UP" | "CHEST" | "ATTACK"; text: string; amount: number; at: string; parivar: { id: string; name: string; sign: string; emblem: string }; logoUrl?: string; other?: { id: string; name: string; sign: string } };
export type InventoryRow = { kind: string; ref: number; qty: number; name?: string };

const keyed = (extra?: Record<string, string>) => ({ ...opts, method: "POST" as const, headers: { "Idempotency-Key": key(), ...(extra ?? {}) } });

export const parivarExtra = {
  tasks: (id: string) => api<TasksInfo>(`${base}/${id}/tasks`, opts),
  claimTask: (id: string, taskId: string) => api<{ rewardKind: string; rewardAmount: number }>(`${base}/${id}/tasks/${taskId}/claim`, { ...opts, method: "POST" }),
  checkin: (id: string) => api<{ exp: number }>(`${base}/${id}/checkin`, { ...opts, method: "POST" }),
  shop: (id: string) => api<ShopItem[]>(`${base}/${id}/shop`, opts),
  buy: (id: string, itemId: string, payWith: "FUNDS" | "COINS") => api<unknown>(`${base}/${id}/shop/${itemId}/buy?payWith=${payWith}`, keyed()),
  inventory: (id: string) => api<InventoryRow[]>(`${base}/${id}/inventory`, opts),
  cheerTiers: (id: string) => api<CheerTier[]>(`${base}/${id}/cheer`, opts),
  cheer: (id: string, tierId: string) => api<{ times: number; exp: number }>(`${base}/${id}/cheer/${tierId}`, keyed()),
  gacha: (id: string) => api<GachaInfo>(`${base}/${id}/gacha`, opts),
  buyTickets: (id: string, qty: number) => api<{ tickets: number; spent: number }>(`${base}/${id}/gacha/tickets`, { ...opts, method: "POST", body: { qty } }),
  roll: (id: string, machineId: string, times: 1 | 10) => api<{ results: GachaResult[]; funds: number }>(`${base}/${id}/gacha/${machineId}/roll`, { ...opts, method: "POST", body: { times }, headers: { "Idempotency-Key": key() } }),
  chests: (id: string) => api<ChestsInfo>(`${base}/${id}/chests`, opts),
  sendChest: (id: string, typeId: string) => api<unknown>(`${base}/${id}/chests/send/${typeId}`, keyed()),
  claimChest: (id: string, chestId: string) => api<{ kind: string; amount: number; label: string }>(`${base}/${id}/chests/${chestId}/claim`, { ...opts, method: "POST" }),
  kavach: (id: string) => api<KavachInfo>(`${base}/${id}/kavach`, opts),
  activateKavach: (id: string, typeId: string) => api<KavachInfo>(`${base}/${id}/kavach/${typeId}/activate`, keyed()),
  chori: (id: string) => api<ChoriInfo>(`${base}/${id}/chori`, opts),
  setChoriMembers: (id: string, on: boolean) => api<ChoriInfo>(`${base}/${id}/chori/members`, { ...opts, method: "PUT", body: { on } }),
  attempt: (id: string, targetId: string) => api<{ result: "SUCCESS" | "FAILED" | "BLOCKED"; amount: number }>(`${base}/${id}/chori/${targetId}`, keyed()),
  worldNews: () => api<WorldNewsItem[]>(`${base}/world-news?limit=50`, opts),
  news: (id: string) => api<NewsPost[]>(`${base}/${id}/news`, opts),
  unread: (id: string) => api<{ unread: number }>(`${base}/${id}/news/unread`, opts),
  markRead: (id: string) => api<unknown>(`${base}/${id}/news/read`, { ...opts, method: "POST" }),
  postNews: (id: string, body: { kind: string; title: string; body: string; pinned: boolean; expiresInDays?: number }) => api<unknown>(`${base}/${id}/news`, { ...opts, method: "POST", body }),
  pinNews: (id: string, newsId: string, on: boolean) => api<unknown>(`${base}/${id}/news/${newsId}/pin`, { ...opts, method: "PUT", body: { on } }),
  deleteNews: (id: string, newsId: string) => api<unknown>(`${base}/${id}/news/${newsId}`, { ...opts, method: "DELETE" }),
  chat: (id: string, after: number) => api<{ messages: ChatMsg[]; prefs: ChatPrefs; me?: string }>(`${base}/${id}/chat?after=${after}`, opts),
  send: (id: string, text: string) => api<unknown>(`${base}/${id}/chat`, { ...opts, method: "POST", body: { text } }),
  setPrefs: (id: string, body: Partial<ChatPrefs>) => api<ChatPrefs>(`${base}/${id}/chat/prefs`, { ...opts, method: "PUT", body }),
  voice: (id: string) => api<VoiceInfo>(`${base}/${id}/voice`, opts),
  startVoice: (id: string) => api<VoiceInfo>(`${base}/${id}/voice`, { ...opts, method: "POST" }),
};

/** Gift cards in the family chat come as a system line: a gift emoji and a small JSON. */
export function parseGiftCard(text: string): { giftId: string; count: number; from: string; to: string; people: number; everyone: boolean; self: boolean; earned: number; charm: number } | null {
  if (!text.startsWith("🎁{")) return null;
  try {
    const o = JSON.parse(text.slice(2)) as Record<string, unknown>;
    if (typeof o.g !== "string") return null;
    const people = Number(o.n) || 1;
    return { giftId: o.g, count: Number(o.c) || 1, from: String(o.f ?? "Someone"), to: String(o.t ?? ""), people, everyone: !o.t, self: o.s === true, earned: Number(o.e) || 0, charm: Number(o.h) || 0 };
  } catch {
    return null;
  }
}

/* ---------- Family Treasure ---------- */

export type TreasureRarity = "COMMON" | "PREMIUM" | "EPIC" | "LEGENDARY" | "ULTRA_RARE";
export type TreasureItem = { kind: "GIFT" | "ITEM" | "VIP_CARD" | "TITLE" | "BADGE"; label: string; rarity: TreasureRarity; amount: number; imageUrl?: string };
export type TreasureTier = {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  target: number;
  unlockMinutes: number;
  poolCoins: number;
  poolDiamonds: number;
  imageUrl?: string;
  earnedThisWeek: boolean;
  rewards: { kind: string; rarity: TreasureRarity; label: string; imageUrl?: string }[];
};
export type TreasureChest = {
  id: string;
  tier: string;
  name: string;
  status: "AVAILABLE" | "TREASURE";
  poolCoins: number;
  poolDiamonds: number;
  earnedAt: string;
  claimedBy?: string;
  unlockAt?: string;
  secondsLeft: number;
  ready: boolean;
};
export type TreasureMember = { userId: string; name: string; role: string; avatarUrl?: string };
export type TreasureHistory = { id: string; name: string; tier: string; mode: "ALL" | "TARGET" | "TAKE_ALL"; at: string; members: number; coins: number; diamonds: number; sentBy?: string; top?: string };
export type TreasureInfo = {
  canSend: boolean;
  weekActivity: number;
  tiers: TreasureTier[];
  chests: TreasureChest[];
  history: TreasureHistory[];
  diamonds: number;
  members: TreasureMember[];
  pendingReveal: string | null;
};
export type TreasureOpening = {
  id: string;
  name: string;
  tier: string;
  mode: "ALL" | "TARGET" | "TAKE_ALL";
  sentBy?: string;
  at: string;
  totalCoins: number;
  totalDiamonds: number;
  topUserId: string | null;
  payouts: { userId: string; name: string; avatarUrl?: string; coins: number; diamonds: number; items: TreasureItem[]; score: number }[];
};
export type TreasureMine = {
  diamonds: number;
  wins: { chest: string; tier: string; mode: string; coins: number; diamonds: number; items: TreasureItem[]; at: string }[];
  collection: { kind: "TITLE" | "BADGE"; label: string; source: string; at: string }[];
};

export const treasureApi = {
  state: (id: string) => api<TreasureInfo>(`${base}/${id}/treasure`, opts),
  mine: (id: string) => api<TreasureMine>(`${base}/${id}/treasure/me`, opts),
  claim: (id: string, chestId: string) => api<{ unlockAt: string }>(`${base}/${id}/treasure/chests/${chestId}/claim`, { ...opts, method: "POST" }),
  send: (id: string, chestId: string, mode: "ALL" | "TARGET" | "TAKE_ALL", targetUserId?: string) =>
    api<{ distributionId: string }>(`${base}/${id}/treasure/chests/${chestId}/send`, { ...opts, method: "POST", body: { mode, targetUserId: targetUserId ? Number(targetUserId) : undefined } }),
  opening: (id: string, did: string) => api<TreasureOpening>(`${base}/${id}/treasure/openings/${did}`, opts),
  seen: (id: string, did: string) => api<unknown>(`${base}/${id}/treasure/openings/${did}/seen`, { ...opts, method: "POST" }),
};
