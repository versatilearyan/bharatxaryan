"use client";

/**
 * Your own profile and stats from the backend (GET/PATCH /users/me, GET /users/me/stats),
 * and your picture and banner (POST/DELETE /users/me/avatar|banner, stored on Cloudinary by the backend).
 *
 * The backend is the source of truth for the fields it returns: when the
 * profile loads they are copied over the demo profile in lib/app/store.tsx, so
 * saved demo data never wins. The picture and banner are the backend's
 * avatarUrl/bannerUrl (none: the cartoon avatar and default banner). Stats
 * are display-only.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deleteProfileImage, getMyProfile, getMyStats, genderFromApi, readHair, updateMyProfile, uploadProfileImage, type MediaKind, type UpdateProfileRequest, type UserProfileResponse, type UserStats } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { NAME_FONTS } from "./fonts";
import { useApp } from "./store";
import { emitSync, onSync } from "./sync";
import type { NameFont, Profile } from "./types";

type Load<T> = { data: T | null; loading: boolean; error: string };
/** Open the Profile tab again within this time and nothing is re-fetched. */
const FRESH_MS = 30_000;


type MeValue = {
  profile: Load<UserProfileResponse>;
  stats: Load<UserStats>;
  /** Fetch both if they're missing or older than FRESH_MS (force: always). */
  refresh: (force?: boolean) => void;
  /** PATCH /users/me, then apply what the backend sent back. Throws ApiError. */
  save: (patch: UpdateProfileRequest) => Promise<UserProfileResponse>;
  /** POST /users/me/{avatar|banner}; the profile shows the returned URL. Throws ApiError/Error. */
  uploadImage: (kind: MediaKind, file: Blob) => Promise<string | undefined>;
  /** DELETE /users/me/{avatar|banner}; the profile falls back to the cartoon avatar / default banner. */
  removeImage: (kind: MediaKind) => Promise<void>;
};

const MeContext = createContext<MeValue | null>(null);

const HEX = /^#[0-9a-f]{3,8}$/i;
const FONT_IDS = new Set<string>(NAME_FONTS.map((f) => f.id));

/** The backend's fields, as demo-profile fields. Images are deliberately not touched. */
function toLocal(r: UserProfileResponse, current: Profile): Partial<Profile> {
  const patch: Partial<Profile> = {};
  if (r.fullName) patch.name = r.fullName.slice(0, 24);
  if (r.bio !== undefined) patch.bio = r.bio ?? "";
  // Other / Prefer not to say: no ♂/♀ icon
  if (r.gender) patch.gender = genderFromApi(r.gender);
  if (r.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(r.dateOfBirth)) patch.dob = r.dateOfBirth;
  if (r.nameFont && FONT_IDS.has(r.nameFont)) patch.nameFont = r.nameFont as NameFont;
  if (r.favoriteGames) patch.favoriteGames = r.favoriteGames.slice(0, 4);
  const look = { ...current.look };
  let lookChanged = false;
  if (r.avatarBackground && HEX.test(r.avatarBackground)) (look.bg = r.avatarBackground), (lookChanged = true);
  if (r.avatarSkinTone && HEX.test(r.avatarSkinTone)) (look.skin = r.avatarSkinTone), (lookChanged = true);
  if (r.avatarOutfit && HEX.test(r.avatarOutfit)) (look.outfit = r.avatarOutfit), (lookChanged = true);
  const hair = readHair(r.avatarHair);
  if (hair !== undefined) (look.hairStyle = hair), (lookChanged = true);
  if (lookChanged) patch.look = look;
  return patch;
}

const vipOf = (p: UserProfileResponse) => ({ vipActive: p.vipActive, vipLevel: p.vipLevel, vipExpiresAt: p.vipExpiresAt, badgeUrl: p.badgeUrl, frameUrl: p.frameUrl, bubbleUrl: p.bubbleUrl, entryAnimationUrl: p.entryAnimationUrl });

const message = (e: unknown, fallback: string) => (e instanceof ApiError || e instanceof Error ? e.message || fallback : fallback);

export function MeProvider({ children }: { children: ReactNode }) {
  const { session, profile: localProfile, updateProfile } = useApp();
  const [profile, setProfile] = useState<Load<UserProfileResponse>>({ data: null, loading: false, error: "" });
  const [stats, setStats] = useState<Load<UserStats>>({ data: null, loading: false, error: "" });
  const fetchedAt = useRef({ profile: 0, stats: 0 });
  const inFlight = useRef({ profile: false, stats: false });
  const signedIn = Boolean(session?.profileCompleted);
  const localRef = useRef(localProfile);
  localRef.current = localProfile;
  const profileRef = useRef<UserProfileResponse | null>(null);
  profileRef.current = profile.data;

  /**
   * Only the newest profile answer is used: a forced load (after a change)
   * starts a new request instead of waiting on an older one, and a save or
   * picture change also makes any older request's answer be ignored.
   */
  const profileSeq = useRef(0);
  const loadProfile = useCallback(
    async (force = false) => {
      if (inFlight.current.profile && !force) return;
      const mine = ++profileSeq.current;
      inFlight.current.profile = true;
      setProfile((s) => ({ ...s, loading: true, error: "" }));
      try {
        const r = await getMyProfile();
        if (mine !== profileSeq.current) return;
        fetchedAt.current.profile = Date.now();
        setProfile({ data: r, loading: false, error: "" });
        updateProfile(toLocal(r, localRef.current));
      } catch (e) {
        if (mine !== profileSeq.current) return;
        setProfile((s) => ({ ...s, loading: false, error: message(e, "Couldn't load your profile.") }));
      } finally {
        if (mine === profileSeq.current) inFlight.current.profile = false;
      }
    },
    [updateProfile],
  );

  const loadStats = useCallback(async () => {
    if (inFlight.current.stats) return;
    inFlight.current.stats = true;
    setStats((s) => ({ ...s, loading: true, error: "" }));
    try {
      const r = await getMyStats();
      fetchedAt.current.stats = Date.now();
      setStats({ data: r, loading: false, error: "" });
    } catch (e) {
      setStats((s) => ({ ...s, loading: false, error: message(e, "Couldn't load your stats.") }));
    }
    inFlight.current.stats = false;
  }, []);

  const refresh = useCallback(
    (force = false) => {
      if (!signedIn) return;
      const now = Date.now();
      if (force || now - fetchedAt.current.profile > FRESH_MS) void loadProfile(force);
      if (force || now - fetchedAt.current.stats > FRESH_MS) void loadStats();
    },
    [signedIn, loadProfile, loadStats],
  );

  // Load once on sign-in; forget everything on sign-out
  useEffect(() => {
    if (signedIn) {
      refresh(true);
      return;
    }
    fetchedAt.current = { profile: 0, stats: 0 };
    setProfile({ data: null, loading: false, error: "" });
    setStats({ data: null, loading: false, error: "" });
  }, [signedIn, session?.email, refresh]);

  // After you wear or take off a cosmetic, GET /users/me again (its badge/frame/bubble/entry links changed)
  useEffect(() => (signedIn ? onSync(["my-cosmetics"], () => void loadProfile(true)) : undefined), [signedIn, loadProfile]);

  /** A local write of the backend's answer: any older GET still in flight must not overwrite it. */
  const supersede = useCallback(() => {
    profileSeq.current++;
    inFlight.current.profile = false;
    fetchedAt.current.profile = Date.now();
  }, []);

  /* ---------- Picture and banner (Cloudinary URLs from the backend) ---------- */

  // The profile shows exactly what the backend has saved; nothing local overrides it
  const serverAvatar = profile.data?.avatarUrl;
  const serverBanner = profile.data?.bannerUrl;
  useEffect(() => {
    if (session === undefined) return; // still reading the session
    updateProfile({ photo: serverAvatar, banner: serverBanner });
  }, [serverAvatar, serverBanner, session, updateProfile]);

  /** Put a new URL (or none) into the loaded profile, so every screen picks it up. */
  const setImageUrl = useCallback((kind: MediaKind, url: string | undefined) => {
    const key = kind === "avatar" ? "avatarUrl" : "bannerUrl";
    supersede();
    setProfile((s) => ({ ...s, loading: false, data: { ...(s.data ?? {}), [key]: url } }));
  }, [supersede]);

  const uploadImage = useCallback(
    async (kind: MediaKind, file: Blob) => {
      const url = await uploadProfileImage(kind, file);
      if (url) {
        setImageUrl(kind, url);
        emitSync("my-profile");
        return url;
      }
      // The upload worked but the answer had no URL: read the saved profile instead
      const fresh = await getMyProfile();
      supersede();
      setProfile({ data: fresh, loading: false, error: "" });
      emitSync("my-profile");
      return kind === "avatar" ? fresh.avatarUrl : fresh.bannerUrl;
    },
    [setImageUrl, supersede],
  );

  const removeImage = useCallback(
    async (kind: MediaKind) => {
      await deleteProfileImage(kind);
      setImageUrl(kind, undefined);
      emitSync("my-profile");
    },
    [setImageUrl],
  );

  const save = useCallback(
    async (patch: UpdateProfileRequest) => {
      const r = await updateMyProfile(patch);
      // Some backends answer a PATCH with an empty body: then load it again to show what was saved
      const answer = r.fullName !== undefined || r.bio !== undefined || r.email !== undefined ? r : await getMyProfile();
      // A PATCH answer without the VIP fields doesn't change your VIP: keep what GET /users/me said
      const prev = profileRef.current;
      const fresh = answer.vipActive === undefined && prev?.vipActive !== undefined ? { ...answer, ...vipOf(prev) } : answer;
      supersede();
      setProfile({ data: fresh, loading: false, error: "" });
      updateProfile(toLocal(fresh, localRef.current));
      emitSync("my-profile");
      return fresh;
    },
    [updateProfile, supersede],
  );

  const value = useMemo(() => ({ profile, stats, refresh, save, uploadImage, removeImage }), [profile, stats, refresh, save, uploadImage, removeImage]);
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe() {
  const v = useContext(MeContext);
  if (!v) throw new Error("useMe must be used inside MeProvider");
  return v;
}
