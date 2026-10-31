"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VIP_SETS, type EffectSet, type VipSet } from "@/lib/app/effects";
import { useMarket, type Effects } from "@/lib/app/market-store";
import type { RoomMember } from "./useRoomParticipants";
import type { RoomSession } from "./useRoomSession";

/**
 * VIP cosmetics in backend rooms come from each person's own participants
 * record (vipLevel, frameUrl, badgeUrl, bubbleUrl, entryAnimationUrl), so
 * everyone in the room sees the same thing for that person, whatever the
 * viewer's own VIP is. Once someone's record has loaded it is the only source
 * for them, you included: a null link means no cosmetic. Before that, and in
 * rooms that aren't on the backend, the existing effects are used.
 *
 * The files are drawn by the existing VIP components, which need to know how
 * each file is laid out (where the avatar sits in a frame, the text box in a
 * bubble). Those measurements come from the bundled set for the person's VIP
 * level (VIP 8 and up use the VIP 7 ones). Only the links come from the server.
 */
export type ServerVip = NonNullable<RoomMember["vip"]>;

/**
 * Whether a link is an SVGA animation or an ordinary picture. Cloudinary keeps
 * SVGA files as "raw" uploads, often with no extension, so anything that isn't
 * clearly a picture is treated as SVGA and handed to the SVGA player. If the
 * player can't read it, the cosmetic is left out (see onError in VipFx).
 */
export function assetKind(url: string): "svga" | "image" {
  const path = url.split(/[?#]/)[0].toLowerCase();
  if (/\.svga$/.test(path) || /[_.-]svga$/.test(path)) return "svga";
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(path) || /\/image\/upload\//.test(path)) return "image";
  return "svga";
}

const layoutFor = (level: number | null): VipSet => {
  const l = Math.min(Math.max(level ?? 1, 1), 7);
  return VIP_SETS.find((s) => s.level === l) ?? VIP_SETS[0];
};

/** The Effects for one person from their participants record. Pictures are only used where a picture works (the badge). */
export function serverEffects(v: ServerVip): Effects {
  const base = layoutFor(v.vipLevel);
  const svga = (url: string | null) => (url && assetKind(url) === "svga" ? url : null);
  const as = (patch: Partial<EffectSet>): EffectSet => ({ ...base, frame: "", bubble: "", entry: "", ...patch });
  const fx: Effects = {};
  // The frame needs both a VIP level and a frame
  const frame = v.vipLevel ? svga(v.frameUrl) : null;
  if (frame) fx.frame = as({ frame });
  const bubble = svga(v.bubbleUrl);
  if (bubble) fx.bubble = as({ bubble });
  const entry = svga(v.entryAnimationUrl);
  if (entry) fx.entry = as({ entry });
  if (v.badgeUrl) {
    // An SVGA badge plays; a picture badge shows as an <img>. `level` is the person's real VIP level (0 when the server sent none), for the label.
    const level = v.vipLevel ?? 0;
    fx.badge = assetKind(v.badgeUrl) === "svga" ? { ...base, level, badge: v.badgeUrl, badgeStill: "" } : { ...base, level, badge: "", badgeStill: v.badgeUrl };
  }
  return fx;
}

/**
 * fxFor(personId, vip) gives the effects to draw for someone in this room:
 * from their participants record when it has loaded, otherwise the existing ones.
 */
export function useRoomFx(s: RoomSession) {
  const { effectsFor } = useMarket();
  const members = s.participants?.members;
  // Rebuilt only when someone's links change, not on every speaking or mic update
  const key = members?.map((m) => (m.vip ? [m.personId, m.vip.vipLevel, m.vip.frameUrl, m.vip.badgeUrl, m.vip.bubbleUrl, m.vip.entryAnimationUrl].join("|") : "")).join("\n") ?? "";
  const server = useMemo(() => {
    const map = new Map<string, Effects>();
    for (const m of members ?? []) if (m.vip) map.set(m.personId, serverEffects(m.vip));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const fxFor = useCallback((personId: string, vip?: number): Effects => server.get(personId) ?? effectsFor(personId, vip), [server, effectsFor]);
  /** Only what the server sent for this person (undefined before their record loads, or outside backend rooms). */
  const serverFx = useCallback((personId: string): Effects | undefined => server.get(personId), [server]);
  return { fxFor, serverFx };
}

export type EntryItem = { key: string; personId: string; set: EffectSet };

/**
 * Entry banners for a backend room, each played once per join:
 * - yours, once your own participants record has loaded (if it has an entry animation);
 * - someone else's when they join after you. People already in the room when
 *   you arrive are not announced, and reloads, re-renders or speaking changes
 *   never replay one. Someone who leaves and comes back is announced again.
 * A newcomer LiveKit reports before their record has loaded waits up to 15 s for it.
 * Returns the banners waiting to play (oldest first) and `done` to drop the first.
 */
export function useEntryQueue(s: RoomSession, myId: string) {
  const p = s.participants;
  const { serverFx } = useRoomFx(s);
  const [queue, setQueue] = useState<EntryItem[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const waiting = useRef(new Map<string, number>());
  const n = useRef(0);
  const presentKey = p?.status === "ready" ? p.members.map((m) => `${m.personId}:${m.vip ? 1 : 0}`).join("|") : "";

  useEffect(() => {
    if (!p || p.status !== "ready") return;
    const now = Date.now();
    const present = new Set(p.members.map((m) => m.personId));
    const add: EntryItem[] = [];
    const play = (personId: string) => {
      const set = serverFx(personId)?.entry;
      if (set) add.push({ key: `${personId}#${++n.current}`, personId, set });
    };
    if (!seen.current) {
      // First list after you join: everyone here already arrived; only you are announced
      seen.current = new Set(present);
      if (p.members.find((m) => m.personId === myId)?.vip) play(myId);
      else waiting.current.set(myId, now + 15000);
    } else {
      for (const id of present) {
        if (seen.current.has(id)) continue;
        seen.current.add(id);
        waiting.current.set(id, now + 15000);
      }
      // People who left can be announced again when they come back
      for (const id of [...seen.current]) if (!present.has(id) && id !== myId) seen.current.delete(id);
    }
    for (const [id, until] of [...waiting.current]) {
      const m = p.members.find((x) => x.personId === id);
      if (m?.vip) {
        waiting.current.delete(id);
        play(id);
      } else if (!m || until < now) waiting.current.delete(id);
    }
    if (add.length) setQueue((q) => [...q, ...add]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentKey]);

  const done = useCallback(() => setQueue((q) => q.slice(1)), []);
  return { queue, done };
}
