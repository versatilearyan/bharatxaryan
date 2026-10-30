"use client";

/**
 * Your own profile and stats from the backend (GET/PATCH /users/me, GET /users/me/stats),
 * plus your picture and banner from this device (lib/app/local-images.ts).
 *
 * The backend is the source of truth for the fields it returns: when the
 * profile loads they are copied over the demo profile in lib/app/store.tsx, so
 * saved demo data never wins. Images are kept apart: they come only from
 * IndexedDB for the signed-in user, and nothing the backend returns (an empty
 * avatarUrl included) replaces them. Stats are display-only.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getMyProfile, getMyStats, genderFromApi, updateMyProfile, type UpdateProfileRequest, type UserProfileResponse, type UserStats } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { dataUrlToBlob, imageOwner, loadImages, moveImages, saveImages, type LocalImages } from "./local-images";
import { GAMES } from "./data";
import { NAME_FONTS } from "./fonts";
import { useApp } from "./store";
import type { GameId, NameFont, Profile } from "./types";

type Load<T> = { data: T | null; loading: boolean; error: string };
/** Open the Profile tab again within this time and nothing is re-fetched. */
const FRESH_MS = 30_000;

/** For saveLocalImages: a Blob to keep, null to remove, undefined to leave as is. */
export type ImageChange = { photo?: Blob | null; banner?: Blob | null };

type MeValue = {
  profile: Load<UserProfileResponse>;
  stats: Load<UserStats>;
  /** Fetch both if they're missing or older than FRESH_MS (force: always). */
  refresh: (force?: boolean) => void;
  /** PATCH /users/me, then apply what the backend sent back. Throws ApiError. */
  save: (patch: UpdateProfileRequest) => Promise<UserProfileResponse>;
  /** Store the picture and banner on this device for the signed-in user. Throws if storage fails. */
  saveLocalImages: (change: ImageChange) => Promise<void>;
};

const MeContext = createContext<MeValue | null>(null);

const HEX = /^#[0-9a-f]{3,8}$/i;
const FONT_IDS = new Set<string>(NAME_FONTS.map((f) => f.id));
const GAME_IDS = new Set<string>(GAMES.map((g) => g.id));

/** The backend's fields, as demo-profile fields. Images are deliberately not touched. */
function toLocal(r: UserProfileResponse, current: Profile): Partial<Profile> {
  const patch: Partial<Profile> = {};
  if (r.fullName) patch.name = r.fullName.slice(0, 24);
  if (r.bio !== undefined) patch.bio = r.bio ?? "";
  const g = genderFromApi(r.gender);
  if (g) patch.gender = g;
  if (r.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(r.dateOfBirth)) patch.dob = r.dateOfBirth;
  if (r.nameFont && FONT_IDS.has(r.nameFont)) patch.nameFont = r.nameFont as NameFont;
  if (r.favoriteGames) patch.favoriteGames = r.favoriteGames.filter((id) => GAME_IDS.has(id)).slice(0, 4) as GameId[];
  const look = { ...current.look };
  let lookChanged = false;
  if (r.avatarBackground && HEX.test(r.avatarBackground)) (look.bg = r.avatarBackground), (lookChanged = true);
  if (r.avatarSkinTone && HEX.test(r.avatarSkinTone)) (look.skin = r.avatarSkinTone), (lookChanged = true);
  if (r.avatarOutfit && HEX.test(r.avatarOutfit)) (look.outfit = r.avatarOutfit), (lookChanged = true);
  if (typeof r.avatarHairStyle === "number" && [0, 1, 2, 3].includes(r.avatarHairStyle)) (look.hairStyle = r.avatarHairStyle as Profile["look"]["hairStyle"]), (lookChanged = true);
  if (lookChanged) patch.look = look;
  return patch;
}

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

  const loadProfile = useCallback(async () => {
    if (inFlight.current.profile) return;
    inFlight.current.profile = true;
    setProfile((s) => ({ ...s, loading: true, error: "" }));
    try {
      const r = await getMyProfile();
      fetchedAt.current.profile = Date.now();
      setProfile({ data: r, loading: false, error: "" });
      updateProfile(toLocal(r, localRef.current));
    } catch (e) {
      setProfile((s) => ({ ...s, loading: false, error: message(e, "Couldn't load your profile.") }));
    }
    inFlight.current.profile = false;
  }, [updateProfile]);

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
      if (force || now - fetchedAt.current.profile > FRESH_MS) void loadProfile();
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

  /* ---------- Picture and banner on this device ---------- */

  const email = session?.email ?? "";
  const userId = profile.data?.id;
  const owner = session ? imageOwner({ id: userId, email }) : "";
  const blobs = useRef<LocalImages>({});
  const urls = useRef<{ photo?: string; banner?: string }>({});

  /** Show these blobs (or nothing) as the profile's photo and banner. */
  const show = useCallback(
    (images: LocalImages) => {
      blobs.current = images;
      for (const u of Object.values(urls.current)) if (u) URL.revokeObjectURL(u);
      urls.current = {
        photo: images.photo ? URL.createObjectURL(images.photo) : undefined,
        banner: images.banner ? URL.createObjectURL(images.banner) : undefined,
      };
      updateProfile({ photo: urls.current.photo, banner: urls.current.banner });
    },
    [updateProfile],
  );

  useEffect(() => {
    let live = true;
    if (!owner) {
      // Signed out: drop the last user's images from the screen (they stay saved for them).
      // undefined means the session is still being read, so wait.
      if (session === null) show({});
      return;
    }
    (async () => {
      try {
        // Images saved before the user ID was known move to the ID
        if (userId !== undefined) await moveImages(imageOwner({ email }), owner);
        let images = (await loadImages(owner)) ?? {};
        // One-time move of pictures older versions kept as data: URLs in localStorage
        const p = localRef.current;
        if (!images.photo && !images.banner && p.email === email && (p.photo?.startsWith("data:") || p.banner?.startsWith("data:"))) {
          images = {
            photo: p.photo?.startsWith("data:") ? await dataUrlToBlob(p.photo) : undefined,
            banner: p.banner?.startsWith("data:") ? await dataUrlToBlob(p.banner) : undefined,
          };
          await saveImages(owner, images);
        }
        if (live) show(images);
      } catch {
        // IndexedDB blocked (private mode) or broken: no saved images this visit
        if (live) show({});
      }
    })();
    return () => {
      live = false;
    };
  }, [owner, userId, email, show, session]);

  // Free the object URLs when the app closes
  useEffect(
    () => () => {
      for (const u of Object.values(urls.current)) if (u) URL.revokeObjectURL(u);
    },
    [],
  );

  const saveLocalImages = useCallback(
    async (change: ImageChange) => {
      if (!owner) throw new Error("Sign in to save pictures.");
      const next: LocalImages = { ...blobs.current };
      if (change.photo !== undefined) next.photo = change.photo ?? undefined;
      if (change.banner !== undefined) next.banner = change.banner ?? undefined;
      try {
        await saveImages(owner, next);
      } catch {
        throw new Error("Couldn't save your pictures on this device. Storage may be full or blocked.");
      }
      show(next);
    },
    [owner, show],
  );

  const save = useCallback(
    async (patch: UpdateProfileRequest) => {
      const r = await updateMyProfile(patch);
      // Some backends answer a PATCH with an empty body: then load it again to show what was saved
      const fresh = r.fullName !== undefined || r.bio !== undefined || r.email !== undefined ? r : await getMyProfile();
      fetchedAt.current.profile = Date.now();
      setProfile({ data: fresh, loading: false, error: "" });
      updateProfile(toLocal(fresh, localRef.current));
      return fresh;
    },
    [updateProfile],
  );

  const value = useMemo(() => ({ profile, stats, refresh, save, saveLocalImages }), [profile, stats, refresh, save, saveLocalImages]);
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe() {
  const v = useContext(MeContext);
  if (!v) throw new Error("useMe must be used inside MeProvider");
  return v;
}
