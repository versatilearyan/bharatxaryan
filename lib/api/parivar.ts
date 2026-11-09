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
  intro?: string;
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
  pendingApplications: number;
  weekRank: number | null;
  totalRank: number | null;
  activity?: ParivarFeedItem[];
};

export type RankRow = { rank: number; id: string; name: string; sign: string; emblem: string; color: string; logoUrl?: string; level: number; score: number; members: number };
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
  create: (body: { name: string; sign: string; emblem: string; color: string; intro: string; joinMode: "OPEN" | "APPROVAL" }, idem: string) =>
    api<ParivarProfile>(base, { ...opts, method: "POST", body, headers: { "Idempotency-Key": idem } }),
  newKey: key,
  join: (id: string) => api<ParivarProfile>(`${base}/${id}/join`, { ...opts, method: "POST" }),
  withdraw: (id: string) => api<ParivarProfile>(`${base}/${id}/withdraw`, { ...opts, method: "POST" }),
  leave: () => api<unknown>(`${base}/leave`, { ...opts, method: "POST" }),
  applications: (id: string) => api<ParivarApplication[]>(`${base}/${id}/applications`, opts),
  decide: (id: string, appId: string, accept: boolean) => api<unknown>(`${base}/${id}/applications/${appId}/${accept ? "accept" : "reject"}`, { ...opts, method: "POST" }),
  removeMember: (id: string, userId: string) => api<ParivarProfile>(`${base}/${id}/members/${userId}/remove`, { ...opts, method: "POST" }),
  setRole: (id: string, userId: string, role: ParivarRole) => api<ParivarProfile>(`${base}/${id}/members/${userId}/role`, { ...opts, method: "PUT", body: { role } }),
  update: (id: string, body: { intro?: string; announcement?: string; joinMode?: "OPEN" | "APPROVAL"; emblem?: string; color?: string }) => api<ParivarProfile>(`${base}/${id}`, { ...opts, method: "PUT", body }),
  donate: (id: string, amount: number) => api<ParivarProfile>(`${base}/${id}/donate`, { ...opts, method: "POST", body: { amount }, headers: { "Idempotency-Key": key() } }),
  tag: (userId: string) => api<{ id?: string; sign?: string; name?: string; emblem?: string; color?: string }>(`${base}/tag/${userId}`, opts),
};
