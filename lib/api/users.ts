/**
 * The signed-in user's own profile and stats (/api/v1/users/me*).
 *
 * Field names follow the API notes for UserProfileResponse, UpdateProfileRequest
 * and UserStatsResponse. The Java DTOs weren't available here, so every
 * field is read defensively: anything missing stays undefined and isn't shown.
 * If the DTOs differ, change the types, readProfile and UPDATABLE_FIELDS below only.
 *
 * Images are never sent: the picture and banner are kept on the device
 * (lib/app/local-images.ts) until the backend has an upload endpoint.
 */
import { api } from "./client";

/** GET /users/me. Only fields the backend actually sends are used. */
export type UserProfileResponse = {
  id?: string | number;
  email?: string;
  fullName?: string;
  /** "Male" / "Female" */
  gender?: string;
  /** "YYYY-MM-DD" */
  dateOfBirth?: string;
  bio?: string;
  avatarUrl?: string;
  /** One of the app's font ids: default, pacifico, dancing, cinzel, yatra, righteous. */
  nameFont?: string;
  /** Up to 4 game ids. */
  favoriteGames?: string[];
  /** Cartoon avatar: hex colours and a hairstyle number (0–3). */
  avatarBackground?: string;
  avatarSkinTone?: string;
  avatarOutfit?: string;
  avatarHairStyle?: number;
  profileCompleted?: boolean;
};

/** PATCH /users/me. Every field is optional; send only what changed. No image fields. */
export type UpdateProfileRequest = {
  fullName?: string;
  gender?: "Male" | "Female";
  dateOfBirth?: string;
  bio?: string;
  nameFont?: string;
  favoriteGames?: string[];
  avatarBackground?: string;
  avatarSkinTone?: string;
  avatarOutfit?: string;
  avatarHairStyle?: number;
};
const UPDATABLE_FIELDS = ["fullName", "gender", "dateOfBirth", "bio", "nameFont", "favoriteGames", "avatarBackground", "avatarSkinTone", "avatarOutfit", "avatarHairStyle"] as const;
export const BIO_MAX = 120;
export const FAVORITE_GAMES_MAX = 4;

/** GET /users/me/stats. Server-controlled: the app only displays these. */
export type UserStats = { level: number; expPoints: number; charmPoints: number; vipPoints: number };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

function readProfile(r: unknown): UserProfileResponse {
  const d = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
  return {
    id: typeof d.id === "number" || typeof d.id === "string" ? d.id : undefined,
    email: str(d.email),
    fullName: str(d.fullName),
    gender: str(d.gender),
    dateOfBirth: str(d.dateOfBirth),
    // null means "no bio yet", not "keep the demo bio"
    bio: d.bio === null ? "" : str(d.bio),
    avatarUrl: str(d.avatarUrl),
    nameFont: str(d.nameFont),
    favoriteGames: Array.isArray(d.favoriteGames) ? d.favoriteGames.filter((g): g is string => typeof g === "string") : undefined,
    avatarBackground: str(d.avatarBackground),
    avatarSkinTone: str(d.avatarSkinTone),
    avatarOutfit: str(d.avatarOutfit),
    avatarHairStyle: typeof d.avatarHairStyle === "number" ? d.avatarHairStyle : undefined,
    profileCompleted: typeof d.profileCompleted === "boolean" ? d.profileCompleted : undefined,
  };
}

export async function getMyProfile(): Promise<UserProfileResponse> {
  return readProfile(await api<unknown>("/api/v1/users/me", { auth: true }));
}

export async function updateMyProfile(payload: UpdateProfileRequest): Promise<UserProfileResponse> {
  // Never send a field the backend doesn't accept
  const body: Record<string, unknown> = {};
  for (const k of UPDATABLE_FIELDS) if (payload[k] !== undefined) body[k] = payload[k];
  return readProfile(await api<unknown>("/api/v1/users/me", { method: "PATCH", auth: true, body }));
}

export async function getMyStats(): Promise<UserStats> {
  const d = ((await api<unknown>("/api/v1/users/me/stats", { auth: true })) ?? {}) as Record<string, unknown>;
  return { level: num(d.level), expPoints: num(d.expPoints), charmPoints: num(d.charmPoints), vipPoints: num(d.vipPoints) };
}

/** Backend "Male"/"Female" (any case) ↔ the app's "male"/"female". */
export const genderFromApi = (g?: string) => (g?.toLowerCase() === "male" ? "male" : g?.toLowerCase() === "female" ? "female" : undefined);
export const genderToApi = (g: "male" | "female") => (g === "male" ? "Male" : "Female");
