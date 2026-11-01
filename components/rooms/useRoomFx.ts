"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EffectSet } from "@/lib/app/effects";
import { useMarket, type Effects } from "@/lib/app/market-store";
import { serverEffects } from "@/lib/app/vip-cosmetics";
import type { RoomMember } from "./useRoomParticipants";
import type { RoomSession } from "./useRoomSession";

/**
 * VIP cosmetics in backend rooms come from each person's own participants
 * record (vipLevel, frameUrl, badgeUrl, bubbleUrl, entryAnimationUrl), so
 * everyone in the room sees the same thing for that person, whatever the
 * viewer's own VIP is. In a backend room that record is the only source, you
 * included: a null or empty link means no cosmetic, and before someone's
 * record has loaded they show none (never your on-device Bag picks or a set
 * guessed from a VIP level, which used to show for a moment and then vanish
 * when the record said "none"). Rooms that aren't on the backend keep the
 * existing on-device effects.
 *
 * The files are drawn by the existing VIP components, which need to know how
 * each file is laid out (where the avatar sits in a frame, the text box in a
 * bubble). Those measurements come from the bundled set for the person's VIP
 * level (VIP 8 and up use the VIP 7 ones). Only the links come from the server.
 */
export type ServerVip = NonNullable<RoomMember["vip"]>;

const NONE: Effects = {};

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
  const backend = Boolean(s.participants);
  const fxFor = useCallback((personId: string, vip?: number): Effects => (backend ? (server.get(personId) ?? NONE) : effectsFor(personId, vip)), [backend, server, effectsFor]);
  /** Only what the server sent for this person: nothing before their record loads; undefined outside backend rooms. */
  const serverFx = useCallback((personId: string): Effects | undefined => (backend ? (server.get(personId) ?? NONE) : undefined), [backend, server]);
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
