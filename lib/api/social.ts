/**
 * Server social features: CP (couples), friends and Moments.
 *
 *   CP       /api/v1/couples/…        (see CoupleController on the server)
 *   Friends  /api/v1/friends/…
 *   Moments  /api/v1/moments/…
 *
 * Every field is read defensively; ids are strings.
 */
import { api, API_BASE_URL } from "./client";
import { authHeader, readToken } from "@/lib/auth/token";
import type { VipProfileFields } from "./users";
import { readRewardEffects } from "./rewards";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const time = (v: unknown) => (typeof v === "string" ? Date.parse(v) || Date.now() : typeof v === "number" ? v : Date.now());
const arr = (v: unknown) => (Array.isArray(v) ? v : []);
const opts = { auth: true, forbiddenIsAccess: true } as const;

/* ================= Friends ================= */

export type FriendRoom = { roomId: string; roomCode?: number; name: string; type?: string; coverUrl?: string; game?: string };
export type FriendCard = { userId: string; publicId?: string; name: string; avatarUrl?: string; online: boolean; lastSeenAt?: number; room?: FriendRoom };
export type FriendList = { kind: string; friendsCount: number; followers: number; followingCount: number; onlineCount: number; people: FriendCard[] };
export type FollowStatus = { following: boolean; followsYou: boolean; friends: boolean; followers: number; followingCount: number; friendsCount: number };
export type FriendActivity = { type: "MOMENT" | "CP" | "GIFT" | "ROOM"; user: { userId: string; name: string; avatarUrl?: string }; ref?: string; detail?: string; at: number };

const card = (v: unknown): FriendCard => {
  const o = obj(v) ?? {};
  const r = obj(o.room);
  return {
    userId: str(o.userId) ?? "",
    publicId: str(o.publicId),
    name: str(o.name) ?? "Someone",
    avatarUrl: str(o.avatarUrl),
    online: o.online === true,
    lastSeenAt: o.lastSeenAt ? time(o.lastSeenAt) : undefined,
    room: r ? { roomId: str(r.roomId) ?? "", roomCode: r.roomCode == null ? undefined : num(r.roomCode), name: str(r.name) ?? "A room", type: str(r.type), coverUrl: str(r.coverUrl), game: str(r.game) } : undefined,
  };
};
const status = (v: unknown): FollowStatus => {
  const o = obj(v) ?? {};
  return { following: o.following === true, followsYou: o.followsYou === true, friends: o.friends === true, followers: num(o.followers), followingCount: num(o.followingCount), friendsCount: num(o.friendsCount) };
};

export const friendsApi = {
  async list(kind: "friends" | "following" | "followers" = "friends"): Promise<FriendList> {
    const d = obj(await api<unknown>(`/api/v1/friends?kind=${kind}`, opts)) ?? {};
    return { kind, friendsCount: num(d.friendsCount), followers: num(d.followers), followingCount: num(d.followingCount), onlineCount: num(d.onlineCount), people: arr(d.people).map(card) };
  },
  status: async (userId: string) => status(await api<unknown>(`/api/v1/friends/${encodeURIComponent(userId)}/status`, opts)),
  follow: async (userId: string) => status(await api<unknown>(`/api/v1/friends/${encodeURIComponent(userId)}/follow`, { ...opts, method: "POST" })),
  unfollow: async (userId: string) => status(await api<unknown>(`/api/v1/friends/${encodeURIComponent(userId)}/unfollow`, { ...opts, method: "POST" })),
  async activity(limit = 40): Promise<FriendActivity[]> {
    return arr(await api<unknown>(`/api/v1/friends/activity?limit=${limit}`, opts)).flatMap((x) => {
      const o = obj(x);
      if (!o) return [];
      const t = o.type === "MOMENT" || o.type === "CP" || o.type === "GIFT" || o.type === "ROOM" ? o.type : null;
      if (!t) return [];
      const u = obj(o.user) ?? {};
      return [{ type: t, user: { userId: str(u.userId) ?? "", name: str(u.name) ?? "Someone", avatarUrl: str(u.avatarUrl) }, ref: str(o.ref), detail: str(o.detail), at: time(o.at) }];
    });
  },
};

/* ================= Moments ================= */

export type MomentMedia = { url: string; type: "IMAGE" | "VIDEO" };
export type Moment = {
  id: string;
  author: {
    userId: string;
    publicId?: string;
    name: string;
    avatarUrl?: string;
    /** What they wear (VIP status, frame, badge, rewards), as on their profile. */
    vip?: Partial<VipProfileFields>;
    nameFont?: string;
    level?: number;
    charmPoints?: number;
  };
  body?: string;
  media: MomentMedia[];
  visibility: "PUBLIC" | "FRIENDS";
  likeCount: number;
  commentCount: number;
  liked: boolean;
  mine: boolean;
  at: number;
};
export type MomentComment = { id: string; userId: string; name: string; avatarUrl?: string; replyTo?: string; replyToName?: string; body: string; at: number };

export function readMoment(v: unknown): Moment | null {
  const o = obj(v);
  const id = str(o?.id);
  if (!o || !id) return null;
  const a = obj(o.author) ?? {};
  return {
    id,
    author: {
      userId: str(a.userId) ?? "",
      publicId: str(a.publicId),
      name: str(a.name) ?? "Someone",
      avatarUrl: str(a.avatarUrl),
      vip:
        typeof a.vipActive === "boolean"
          ? {
              vipActive: a.vipActive,
              vipLevel: typeof a.vipLevel === "number" ? a.vipLevel : null,
              badgeUrl: str(a.badgeUrl) ?? null,
              frameUrl: str(a.frameUrl) ?? null,
              bubbleUrl: null,
              entryAnimationUrl: null,
              rewardEffects: readRewardEffects(a.rewardEffects),
            }
          : undefined,
      nameFont: str(a.nameFont),
      level: typeof a.level === "number" ? a.level : undefined,
      charmPoints: typeof a.charmPoints === "number" ? a.charmPoints : undefined,
    },
    body: str(o.body),
    media: arr(o.media).flatMap((m) => {
      const x = obj(m);
      const url = str(x?.url);
      return url ? [{ url, type: x?.type === "VIDEO" ? ("VIDEO" as const) : ("IMAGE" as const) }] : [];
    }),
    visibility: o.visibility === "FRIENDS" ? "FRIENDS" : "PUBLIC",
    likeCount: num(o.likeCount),
    commentCount: num(o.commentCount),
    liked: o.liked === true,
    mine: o.mine === true,
    at: time(o.at),
  };
}

const comment = (v: unknown): MomentComment | null => {
  const o = obj(v);
  const id = str(o?.id);
  if (!o || !id) return null;
  return { id, userId: str(o.userId) ?? "", name: str(o.name) ?? "Someone", avatarUrl: str(o.avatarUrl), replyTo: str(o.replyTo), replyToName: str(o.replyToName), body: str(o.body) ?? "", at: time(o.at) };
};

/** Sends a multipart form with the sign-in token, reporting upload progress (0–1). */
export function uploadForm<T = unknown>(path: string, form: FormData, onProgress?: (p: number) => void, method: "POST" | "PUT" = "POST"): Promise<T> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open(method, `${API_BASE_URL}${path}`);
    const t = readToken();
    if (t) Object.entries(authHeader(t)).forEach(([k, v]) => x.setRequestHeader(k, v));
    x.setRequestHeader("ngrok-skip-browser-warning", "true");
    x.timeout = 10 * 60 * 1000;
    if (onProgress) x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      let body: unknown = null;
      try {
        body = x.responseText ? JSON.parse(x.responseText) : null;
      } catch {
        /* not JSON */
      }
      if (x.status >= 200 && x.status < 300) resolve(body as T);
      else reject(new Error(str(obj(body)?.message) ?? (x.status === 413 ? "That file is too big." : x.status === 429 ? "Too many uploads. Wait a moment." : "Upload failed. Try again.")));
    };
    x.onerror = () => reject(new Error("No connection. Check your internet and try again."));
    x.ontimeout = () => reject(new Error("The upload took too long. Try a smaller file."));
    x.send(form);
  });
}

export const momentsApi = {
  async feed(scope: "all" | "friends" | "user" = "all", opts2: { userId?: string; before?: string; limit?: number } = {}) {
    const q = new URLSearchParams({ scope, limit: String(opts2.limit ?? 15) });
    if (opts2.userId) q.set("userId", opts2.userId);
    if (opts2.before) q.set("before", opts2.before);
    const d = obj(await api<unknown>(`/api/v1/moments?${q}`, opts)) ?? {};
    return { items: arr(d.items).flatMap((m) => readMoment(m) ?? []), next: str(d.next) };
  },
  async post(body: string, files: File[], visibility: "PUBLIC" | "FRIENDS", onProgress?: (p: number) => void) {
    const f = new FormData();
    if (body.trim()) f.append("body", body.trim());
    f.append("visibility", visibility);
    files.forEach((file) => f.append("files", file, file.name));
    const m = readMoment(await uploadForm("/api/v1/moments", f, onProgress));
    if (!m) throw new Error("Posted, but the answer couldn't be read. Pull to refresh.");
    return m;
  },
  remove: (id: string) => api<unknown>(`/api/v1/moments/${encodeURIComponent(id)}`, { ...opts, method: "DELETE" }),
  async like(id: string, on: boolean) {
    const d = obj(await api<unknown>(`/api/v1/moments/${encodeURIComponent(id)}/like`, { ...opts, method: "POST", body: { on } })) ?? {};
    return { liked: d.liked === true, likeCount: num(d.likeCount) };
  },
  async comments(id: string) {
    return arr(await api<unknown>(`/api/v1/moments/${encodeURIComponent(id)}/comments?limit=100`, opts)).flatMap((c) => comment(c) ?? []);
  },
  async comment(id: string, body: string, replyTo?: string) {
    const c = comment(await api<unknown>(`/api/v1/moments/${encodeURIComponent(id)}/comments`, { ...opts, method: "POST", body: { body, replyTo: replyTo ? Number(replyTo) : undefined } }));
    if (!c) throw new Error("Couldn't post the comment.");
    return c;
  },
  removeComment: (id: string, commentId: string) => api<unknown>(`/api/v1/moments/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`, { ...opts, method: "DELETE" }),
};

/** A photo in the voice room chat. The message arrives for everyone on the room's chat topic. */
export function sendRoomChatImage(roomId: string, file: File, onProgress?: (p: number) => void) {
  const f = new FormData();
  f.append("file", file, file.name);
  return uploadForm(`/api/voice-rooms/${encodeURIComponent(roomId)}/chat/image`, f, onProgress);
}
