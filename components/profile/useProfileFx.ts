"use client";

import { useMemo } from "react";
import { useMarket, type Effects } from "@/lib/app/market-store";
import { useMe } from "@/lib/app/me-store";
import { SERVER_USER_PREFIX, useServerPeople } from "@/lib/app/server-rooms";
import { ME_ID } from "@/lib/app/store";
import { profileEffects } from "@/lib/app/vip-cosmetics";

/**
 * The VIP cosmetics to draw on someone's profile, from their own profile response:
 * - you: GET /users/me (vipActive false: none). The profile page effect from
 *   your Bag (a gift set, not VIP) still shows.
 * (`fresh` false: a backend user's profile is still loading; nothing is drawn.)
 * - a backend user: GET /users/{id}/profile, never the viewer's VIP. Nothing
 *   until it has loaded.
 * - sample people, and you before /users/me says whether you're VIP: as before.
 */
export function useProfileFx(personId: string, vip?: number, fresh = true): Effects {
  const { effectsFor } = useMarket();
  const mine = useMe().profile.data;
  const people = useServerPeople();
  const theirs = personId.startsWith(SERVER_USER_PREFIX) ? people[personId]?.vip : undefined;
  const local = effectsFor(personId, vip);
  const server = useMemo(() => profileEffects(personId === ME_ID ? mine : theirs), [personId, mine, theirs]);
  if (personId === ME_ID) return server ? { ...server, page: local.page } : local;
  // fresh false: their profile hasn't answered during this open yet, so a kept answer isn't trusted
  if (personId.startsWith(SERVER_USER_PREFIX)) return fresh ? (server ?? {}) : {};
  return local;
}
