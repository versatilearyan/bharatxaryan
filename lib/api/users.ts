/**
 * Profiles (/api/v1/users/...): your own profile and stats, and other people's
 * public profiles.
 *
 * Field names and rules follow the API contract for UserProfileResponse,
 * PublicUserProfileResponse, UpdateProfileRequest and UserStatsResponse. The
 * Java source wasn't available here, so every field is read defensively:
 * anything missing stays undefined and isn't shown. If the DTOs differ, change
 * the types, the read* functions and UPDATABLE_FIELDS below only.
 *
 * Images are never sent with PATCH /users/me. They have their own endpoints:
 * POST/DELETE /users/me/avatar and /users/me/banner (multipart field "file").
 * The backend uploads to Cloudinary and returns the URL; the browser never
 * talks to Cloudinary.
 */
import { readRewardEffects, type RewardEffects } from "./rewards";
import { api } from "./client";
import type { GameId } from "@/lib/app/types";

/* ---------- Enums ---------- */

export const API_GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;
export type ApiGender = (typeof API_GENDERS)[number];
export const GENDER_LABELS: Record<ApiGender, string> = { MALE: "Male", FEMALE: "Female", OTHER: "Other", PREFER_NOT_TO_SAY: "Prefer not to say" };

/** The app's game ids ↔ the backend's favoriteGames values. */
export const GAME_TO_API: Record<GameId, string> = {
  chess: "CHESS",
  ludo: "LUDO",
  micgrab: "MIC_GRAB",
  carrom: "CARROM",
  pool: "POOL",
  draw: "DRAW_AND_GUESS",
  antakshari: "ANTAKSHARI",
  cards: "CARD_NIGHT",
};
const API_TO_GAME = Object.fromEntries(Object.entries(GAME_TO_API).map(([k, v]) => [v, k as GameId])) as Record<string, GameId>;
export const API_GAMES = Object.values(GAME_TO_API);

/* ---------- Types ---------- */

/**
 * VIP status and cosmetics, sent with both GET /users/me and GET /users/{id}/profile.
 * The server decides who is VIP: the app never works it out itself. `vipActive`
 * is undefined only when the response had no vipActive field at all.
 * Links are https or null; null means that cosmetic isn't available.
 */
export type VipProfileFields = {
  vipActive?: boolean;
  vipLevel: number | null;
  /** ISO date-time, or null (no end date given). Never an invalid date. */
  vipExpiresAt: string | null;
  badgeUrl: string | null;
  frameUrl: string | null;
  bubbleUrl: string | null;
  entryAnimationUrl: string | null;
  /** Spend rewards this person wears (frame, bubble, entry, profile). Shown whether or not they're VIP. */
  rewardEffects?: RewardEffects;
  /** Gift-set pieces they wear (e.g. the Storm Guardian frame and profile page effect): piece → set id. */
  giftSetWear?: Partial<Record<"frame" | "bubble" | "entry" | "page", string>>;
};

/** GET /users/me and the answer to PATCH /users/me. */
export type UserProfileResponse = Partial<VipProfileFields> & {
  id?: string | number;
  email?: string;
  fullName?: string;
  gender?: ApiGender;
  /** "YYYY-MM-DD" */
  dateOfBirth?: string;
  bio?: string;
  /** One of the app's font ids: default, pacifico, dancing, cinzel, yatra, righteous. */
  nameFont?: string;
  /** App game ids (converted from CHESS, LUDO, ...). */
  favoriteGames?: GameId[];
  /** https URLs only; anything else is dropped. */
  avatarUrl?: string;
  bannerUrl?: string;
  /** Cartoon avatar: colours as hex, hair as "0"–"3". */
  avatarBackground?: string;
  avatarSkinTone?: string;
  avatarOutfit?: string;
  avatarHair?: string;
  profileCompleted?: boolean;
  updatedAt?: string;
};

/** GET /users/{id}/profile. Only what the backend sends; never assumed to have private fields. */
export type PublicUserProfile = Partial<VipProfileFields> & {
  id?: string | number;
  fullName?: string;
  bio?: string;
  gender?: ApiGender;
  nameFont?: string;
  favoriteGames?: GameId[];
  avatarUrl?: string;
  bannerUrl?: string;
  avatarBackground?: string;
  avatarSkinTone?: string;
  avatarOutfit?: string;
  avatarHair?: string;
  /** Charm points and Active Level, exactly as the server has them. */
  charmPoints?: number;
  level?: number;
  /** The 7-digit ID people see and search by. */
  publicId?: string;
};

/** PATCH /users/me. Every field is optional; send only what changed. No image fields. */
export type UpdateProfileRequest = {
  fullName?: string;
  gender?: ApiGender;
  dateOfBirth?: string;
  bio?: string;
  nameFont?: string;
  /** App game ids; converted to CHESS, LUDO, ... when sent. */
  favoriteGames?: GameId[];
  avatarBackground?: string;
  avatarSkinTone?: string;
  avatarOutfit?: string;
  avatarHair?: string;
};
const UPDATABLE_FIELDS = ["fullName", "gender", "dateOfBirth", "bio", "nameFont", "favoriteGames", "avatarBackground", "avatarSkinTone", "avatarOutfit", "avatarHair"] as const;

export const FULL_NAME_MAX = 100;
export const BIO_MAX = 120;
export const SHORT_FIELD_MAX = 30;
export const FAVORITE_GAMES_MAX = 4;
export const MIN_AGE_YEARS = 18;

/** GET /users/me/stats. Server-controlled: the app only displays these. */
export type UserStats = { level: number; expPoints: number; charmPoints: number; vipPoints: number; expInLevel: number; expToNext: number };

/* ---------- Reading ---------- */

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const httpsUrl = (v: unknown) => (typeof v === "string" && /^https:\/\//i.test(v.trim()) ? v.trim() : undefined);
const id = (v: unknown) => (typeof v === "number" || typeof v === "string" ? v : undefined);

/** "MALE" (any case; older "Male" too) → ApiGender. */
export function readGender(v: unknown): ApiGender | undefined {
  if (typeof v !== "string") return undefined;
  const g = v.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return (API_GENDERS as readonly string[]).includes(g) ? (g as ApiGender) : undefined;
}

/** CHESS/LUDO/... (older app ids too) → app game ids, unknown ones dropped, no repeats. */
function readGames(v: unknown): GameId[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: GameId[] = [];
  for (const g of v) {
    if (typeof g !== "string") continue;
    const gid = API_TO_GAME[g.toUpperCase()] ?? (g in GAME_TO_API ? (g as GameId) : undefined);
    if (gid && !out.includes(gid)) out.push(gid);
  }
  return out;
}

/** avatarHair "0"–"3" (or a number) → the app's hair style. */
export function readHair(v: unknown): 0 | 1 | 2 | 3 | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d$/.test(v.trim()) ? Number(v.trim()) : NaN;
  return n === 0 || n === 1 || n === 2 || n === 3 ? n : undefined;
}

const obj = (r: unknown) => (r && typeof r === "object" ? r : {}) as Record<string, unknown>;

function readLook(d: Record<string, unknown>) {
  return {
    avatarBackground: str(d.avatarBackground),
    avatarSkinTone: str(d.avatarSkinTone),
    avatarOutfit: str(d.avatarOutfit),
    // avatarHairStyle was the field's earlier name
    avatarHair: d.avatarHair != null ? String(d.avatarHair) : d.avatarHairStyle != null ? String(d.avatarHairStyle) : undefined,
  };
}

/** The VIP fields, read defensively. */
export function readVip(d: Record<string, unknown>): VipProfileFields {
  const lvl = typeof d.vipLevel === "number" ? d.vipLevel : typeof d.vipLevel === "string" && /^\d+$/.test(d.vipLevel.trim()) ? Number(d.vipLevel) : NaN;
  const exp = typeof d.vipExpiresAt === "string" && !Number.isNaN(Date.parse(d.vipExpiresAt)) ? d.vipExpiresAt : null;
  const link = (v: unknown) => httpsUrl(v) ?? null;
  return {
    vipActive: typeof d.vipActive === "boolean" ? d.vipActive : d.vipActive === "true" ? true : d.vipActive === "false" ? false : undefined,
    vipLevel: Number.isInteger(lvl) && lvl >= 1 ? lvl : null,
    vipExpiresAt: exp,
    badgeUrl: link(d.badgeUrl),
    frameUrl: link(d.frameUrl),
    bubbleUrl: link(d.bubbleUrl),
    entryAnimationUrl: link(d.entryAnimationUrl),
    rewardEffects: readRewardEffects(d.rewardEffects),
    giftSetWear: readGiftSetWear(d.giftSetWear),
  };
}

function readGiftSetWear(v: unknown): VipProfileFields["giftSetWear"] {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const out: NonNullable<VipProfileFields["giftSetWear"]> = {};
  for (const k of ["frame", "bubble", "entry", "page"] as const) if (typeof o[k] === "string" && o[k]) out[k] = o[k] as string;
  return Object.keys(out).length ? out : undefined;
}

function readProfile(r: unknown): UserProfileResponse {
  const d = obj(r);
  return {
    id: id(d.id),
    email: str(d.email),
    fullName: str(d.fullName),
    gender: readGender(d.gender),
    dateOfBirth: str(d.dateOfBirth),
    // null means "no bio yet", not "keep the demo bio"
    bio: d.bio === null ? "" : str(d.bio),
    nameFont: str(d.nameFont),
    favoriteGames: readGames(d.favoriteGames),
    avatarUrl: httpsUrl(d.avatarUrl),
    bannerUrl: httpsUrl(d.bannerUrl),
    ...readLook(d),
    profileCompleted: typeof d.profileCompleted === "boolean" ? d.profileCompleted : undefined,
    updatedAt: str(d.updatedAt),
    ...readVip(d),
  };
}

function readPublicProfile(r: unknown): PublicUserProfile {
  const d = obj(r);
  return {
    id: id(d.id ?? d.userId),
    fullName: str(d.fullName) ?? str(d.name),
    bio: d.bio === null ? "" : str(d.bio),
    gender: readGender(d.gender),
    nameFont: str(d.nameFont),
    favoriteGames: readGames(d.favoriteGames),
    avatarUrl: httpsUrl(d.avatarUrl),
    bannerUrl: httpsUrl(d.bannerUrl),
    charmPoints: typeof d.charmPoints === "number" && Number.isFinite(d.charmPoints) ? d.charmPoints : undefined,
    level: typeof d.level === "number" && Number.isFinite(d.level) ? d.level : undefined,
    publicId: d.publicId == null ? undefined : String(d.publicId),
    ...readLook(d),
    ...readVip(d),
  };
}

/* ---------- Validation (same rules as UpdateProfileRequest) ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Age in whole years on `today` for a YYYY-MM-DD birthday, NaN if it isn't a real date. */
export function ageInYears(dob: string, today = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return NaN;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return NaN;
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
  return age;
}

/** Field → message for anything the backend would reject. Empty when the request is fine. */
export function validateProfileUpdate(p: UpdateProfileRequest, today = new Date()): Record<string, string> {
  const e: Record<string, string> = {};
  if (p.fullName !== undefined) {
    if (!p.fullName.trim()) e.fullName = "Enter your name";
    else if (p.fullName.length > FULL_NAME_MAX) e.fullName = `Use at most ${FULL_NAME_MAX} characters`;
  }
  if (p.gender !== undefined && !(API_GENDERS as readonly string[]).includes(p.gender)) e.gender = "Pick a gender from the list";
  if (p.dateOfBirth !== undefined) {
    const age = ageInYears(p.dateOfBirth, today);
    if (Number.isNaN(age)) e.dateOfBirth = "Check the date";
    else if (p.dateOfBirth >= isoDay(today)) e.dateOfBirth = "The date must be in the past";
    else if (age < MIN_AGE_YEARS) e.dateOfBirth = `You need to be ${MIN_AGE_YEARS} or older`;
  }
  if (p.bio !== undefined && p.bio.length > BIO_MAX) e.bio = `Use at most ${BIO_MAX} characters`;
  if (p.nameFont !== undefined && p.nameFont.length > SHORT_FIELD_MAX) e.nameFont = `Use at most ${SHORT_FIELD_MAX} characters`;
  if (p.favoriteGames !== undefined) {
    const g = p.favoriteGames;
    if (g.length > FAVORITE_GAMES_MAX) e.favoriteGames = `Pick at most ${FAVORITE_GAMES_MAX} games`;
    else if (new Set(g).size !== g.length) e.favoriteGames = "Each game can be picked once";
    else if (g.some((x) => !GAME_TO_API[x])) e.favoriteGames = "That game isn't supported";
  }
  for (const k of ["avatarBackground", "avatarSkinTone", "avatarOutfit", "avatarHair"] as const) {
    const v = p[k];
    if (v !== undefined && (!v.trim() || v.length > SHORT_FIELD_MAX)) e[k] = `Use 1–${SHORT_FIELD_MAX} characters`;
  }
  return e;
}

/* ---------- Calls ---------- */

export async function getMyProfile(): Promise<UserProfileResponse> {
  return readProfile(await api<unknown>("/api/v1/users/me", { auth: true }));
}

/** GET /users/{id}/profile. 403 means "not allowed", not a dead session. */
export async function getPublicProfile(userId: string | number): Promise<PublicUserProfile> {
  const safe = encodeURIComponent(String(userId));
  return readPublicProfile(await api<unknown>(`/api/v1/users/${safe}/profile`, { auth: true, forbiddenIsAccess: true }));
}

export async function updateMyProfile(payload: UpdateProfileRequest): Promise<UserProfileResponse> {
  // Never send a field the backend doesn't accept (and never images)
  const body: Record<string, unknown> = {};
  for (const k of UPDATABLE_FIELDS) if (payload[k] !== undefined) body[k] = payload[k];
  if (payload.favoriteGames) body.favoriteGames = payload.favoriteGames.map((g) => GAME_TO_API[g]);
  return readProfile(await api<unknown>("/api/v1/users/me", { method: "PATCH", auth: true, body }));
}

export async function getMyStats(): Promise<UserStats> {
  const d = ((await api<unknown>("/api/v1/users/me/stats", { auth: true })) ?? {}) as Record<string, unknown>;
  return { level: num(d.level), expPoints: num(d.expPoints), charmPoints: num(d.charmPoints), vipPoints: num(d.vipPoints), expInLevel: num(d.expInLevel), expToNext: num(d.expToNext) };
}

/** Backend gender → the app's ♂/♀ icon (none for Other / Prefer not to say). */
export const genderFromApi = (g?: ApiGender) => (g === "MALE" ? "male" : g === "FEMALE" ? "female" : undefined);

/* ---------- Avatar and banner (Cloudinary, through the backend) ---------- */

export type MediaKind = "avatar" | "banner";
export const MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MEDIA_MAX_MB: Record<MediaKind, number> = { avatar: 5, banner: 8 };
/** Uploads can be slow on mobile data. */
const UPLOAD_TIMEOUT_MS = 60_000;

/** "" if the file can be uploaded, otherwise a message to show. */
export function mediaFileError(file: File, kind: MediaKind) {
  if (!MEDIA_TYPES.includes(file.type)) return "Choose a JPG, PNG or WebP image.";
  const max = MEDIA_MAX_MB[kind];
  if (file.size > max * 1024 * 1024) return `That image is over ${max} MB. Choose a smaller one.`;
  return "";
}

/**
 * The image URL from an upload answer. Accepts { avatarUrl } / { bannerUrl },
 * the same nested in { data } (or a full profile), or { url } / { secureUrl }.
 * Public IDs are never used as URLs. undefined if there is no https URL.
 */
export function readMediaUrl(r: unknown, kind: MediaKind): string | undefined {
  const d = obj(r);
  const inner = obj(d.data);
  const key = kind === "avatar" ? "avatarUrl" : "bannerUrl";
  for (const v of [d[key], inner[key], d.url, d.secureUrl, d.secure_url, inner.url, inner.secureUrl, inner.secure_url]) {
    const u = httpsUrl(v);
    if (u) return u;
  }
  return typeof r === "string" ? httpsUrl(r) : undefined;
}

/** POST /users/me/{avatar|banner} with the file. Resolves with the saved https URL (undefined if the answer had none). */
export async function uploadProfileImage(kind: MediaKind, file: Blob, name = "image"): Promise<string | undefined> {
  const form = new FormData();
  form.append("file", file, file instanceof File ? file.name : name);
  const r = await api<unknown>(`/api/v1/users/me/${kind}`, { method: "POST", auth: true, body: form, forbiddenIsAccess: true, timeoutMs: UPLOAD_TIMEOUT_MS });
  const d = obj(r);
  if (d.success === false) throw new Error(str(d.message) || "The upload didn't go through. Try again.");
  return readMediaUrl(r, kind);
}

/** DELETE /users/me/{avatar|banner}. */
export async function deleteProfileImage(kind: MediaKind): Promise<void> {
  const r = await api<unknown>(`/api/v1/users/me/${kind}`, { method: "DELETE", auth: true, forbiddenIsAccess: true });
  if (obj(r).success === false) throw new Error(str(obj(r).message) || "Couldn't remove it. Try again.");
}
