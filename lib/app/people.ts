"use client";

import { useCallback } from "react";
import { personById } from "./data";
import { useMe } from "./me-store";
import { SERVER_USER_PREFIX, useServerPeople } from "./server-rooms";
import { ME_ID, useApp } from "./store";
import { activeVipLevel } from "./vip-cosmetics";
import { publicUserId } from "./public-ids";
import { myUserIdFromToken } from "@/lib/auth/token";
import type { Person } from "./types";

/** Resolves a person id to a Person, including "me" (built from the editable demo profile). */
export function usePeople() {
  const { profile, vip } = useApp();
  // Your level comes from the backend (GET /users/me/stats) once it has loaded, so it matches your profile everywhere
  const me = useMe();
  const serverLevel = me.stats.data?.level;
  // Your VIP comes from GET /users/me once it says (vipActive); until then the app's own
  const myVip = me.profile.data?.vipActive !== undefined ? activeVipLevel(me.profile.data) : vip.level || undefined;
  // Names and pictures of people in backend rooms (from the participants API or LiveKit)
  const serverPeople = useServerPeople();
  return useCallback(
    (id: string): Person => {
      if (id === ME_ID) {
        return {
          id: ME_ID,
          // Your 7-digit public ID from your backend account (the sample one only without the backend)
          uid: myUserIdFromToken() ? publicUserId(myUserIdFromToken()) : profile.userId,
          name: profile.name,
          photo: profile.photo,
          vip: myVip,
          handle: profile.handle,
          look: profile.look,
          frame: profile.frame,
          nameFont: profile.nameFont,
          level: serverLevel ?? profile.level,
          gender: profile.gender,
          bio: profile.bio,
          online: true,
          city: "",
          followers: 0,
          tags: [],
        };
      }
      if (id.startsWith(SERVER_USER_PREFIX)) {
        const userId = id.slice(SERVER_USER_PREFIX.length);
        const sp = serverPeople[id];
        return {
          id,
          uid: publicUserId(userId),
          // The backend's display name; "User 42" only when no name was sent
          name: sp?.name || (userId === "unknown" ? "Room owner" : `User ${userId}`),
          photo: sp?.avatarUrl,
          banner: sp?.bannerUrl,
          handle: "",
          look: { bg: "#3a3a44", skin: "#b07a5e", hair: "#16100e", hairStyle: 0, outfit: "#aaa6b0", ...sp?.look },
          frame: "none",
          // Their VIP level from their public profile, only while it's active
          vip: activeVipLevel(sp?.vip),
          level: 1,
          gender: sp?.gender,
          nameFont: sp?.nameFont,
          bio: sp?.bio ?? "",
          online: true,
          city: "",
          followers: 0,
          tags: [],
        };
      }
      return (
        personById(id) ?? {
          id,
          uid: "000000",
          name: "Guest",
          handle: "@guest",
          look: { bg: "#3a3a44", skin: "#b07a5e", hair: "#16100e", hairStyle: 0, outfit: "#aaa6b0" },
          frame: "none",
          level: 1,
          bio: "",
          online: true,
          city: "",
          followers: 0,
          tags: [],
        }
      );
    },
    [profile, myVip, serverLevel, serverPeople],
  );
}
