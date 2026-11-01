"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { genderFromApi, getPublicProfile, readHair } from "@/lib/api/users";
import { NAME_FONTS } from "@/lib/app/fonts";
import { SERVER_USER_PREFIX, useServerRooms, type ServerPerson } from "@/lib/app/server-rooms";
import { onSync } from "@/lib/app/sync";
import type { NameFont } from "@/lib/app/types";

export type PublicProfileStatus = "idle" | "loading" | "ready" | "not-found" | "error";

const HEX = /^#[0-9a-f]{3,8}$/i;
const FONT_IDS = new Set<string>(NAME_FONTS.map((f) => f.id));

/**
 * GET /users/{id}/profile for a backend user's profile page (person ids
 * "srv-user:<id>"). Fetched once each time the page opens. What comes back is
 * remembered for usePeople(), so the hero shows the backend's name, picture,
 * banner and bio. Demo people (no backend id) are left alone.
 * If it's your own public profile, it loads again after you change your
 * cosmetics or profile. `loadedFor` is the person id whose answer arrived
 * during this open (never an answer kept from an earlier one).
 */
export function usePublicProfile(personId: string) {
  // (personId "" = nobody: does nothing)
  const { rememberPeople, myId } = useServerRooms();
  const userId = personId.startsWith(SERVER_USER_PREFIX) ? personId.slice(SERVER_USER_PREFIX.length) : null;
  const usable = userId !== null && /^\d+$/.test(userId);
  const [status, setStatus] = useState<PublicProfileStatus>(usable ? "loading" : "idle");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [loadedFor, setLoadedFor] = useState("");
  const remember = useRef(rememberPeople);
  remember.current = rememberPeople;

  useEffect(() => {
    if (!usable || !userId) return;
    let live = true;
    setLoadedFor("");
    setStatus("loading");
    setError("");
    getPublicProfile(userId)
      .then((r) => {
        if (!live) return;
        const look: ServerPerson["look"] = {};
        if (r.avatarBackground && HEX.test(r.avatarBackground)) look.bg = r.avatarBackground;
        if (r.avatarSkinTone && HEX.test(r.avatarSkinTone)) look.skin = r.avatarSkinTone;
        if (r.avatarOutfit && HEX.test(r.avatarOutfit)) look.outfit = r.avatarOutfit;
        const hair = readHair(r.avatarHair);
        if (hair !== undefined) look.hairStyle = hair;
        remember.current({
          [personId]: {
            name: r.fullName || undefined,
            avatarUrl: r.avatarUrl,
            bannerUrl: r.bannerUrl,
            bio: r.bio,
            nameFont: r.nameFont && FONT_IDS.has(r.nameFont) ? (r.nameFont as NameFont) : undefined,
            gender: genderFromApi(r.gender),
            look: Object.keys(look).length ? look : undefined,
            // This person's own VIP status and links, always replaced (never kept from an older load)
            vip: { vipActive: r.vipActive, vipLevel: r.vipLevel ?? null, vipExpiresAt: r.vipExpiresAt ?? null, badgeUrl: r.badgeUrl ?? null, frameUrl: r.frameUrl ?? null, bubbleUrl: r.bubbleUrl ?? null, entryAnimationUrl: r.entryAnimationUrl ?? null },
          },
        });
        setLoadedFor(personId);
        setStatus("ready");
      })
      .catch((e) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 404) {
          setStatus("not-found");
          return;
        }
        setStatus("error");
        setError(e instanceof Error && e.message ? e.message : "Couldn't load this profile.");
      });
    return () => {
      live = false;
    };
  }, [personId, userId, usable, tick]);

  const own = usable && myId !== undefined && userId === myId;
  useEffect(() => (own ? onSync(["my-cosmetics", "my-profile"], () => setTick((n) => n + 1)) : undefined), [own]);

  const retry = useCallback(() => setTick((n) => n + 1), []);
  return { isBackendUser: userId !== null, loadedFor: usable ? loadedFor : "", status: userId !== null && !usable ? ("not-found" as const) : status, error, retry };
}
