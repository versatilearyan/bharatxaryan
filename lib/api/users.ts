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
 * Images are never sent with PATCH /users/me. There are no image upload or
 * delete endpoints yet, so a picture you pick stays on this device
 * (lib/app/local-images.ts); avatarUrl/bannerUrl from the backend are shown
 * when the device has none.
 */
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

/** GET /users/me and the answer to PATCH /users/me. */
export type UserProfileResponse = {
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
export type PublicUserProfile = {
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
export type UserStats = { level: number; expPoints: number; charmPoints: number; vipPoints: number };

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
    ...readLook(d),
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
  return { level: num(d.level), expPoints: num(d.expPoints), charmPoints: num(d.charmPoints), vipPoints: num(d.vipPoints) };
}

/** Backend gender → the app's ♂/♀ icon (none for Other / Prefer not to say). */
export const genderFromApi = (g?: ApiGender) => (g === "MALE" ? "male" : g === "FEMALE" ? "female" : undefined);
