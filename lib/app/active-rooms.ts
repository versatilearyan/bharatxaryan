import type { Room } from "./types";
import { isGameTable, onMicIn } from "./live-counts";

/** People in a backend room right now (0 for rooms the live counts don't list, and for the app's sample rooms). */
export function onlineIn(room: Room, live: Record<string, number> | null | undefined): number {
  return room.server && live ? (live[room.server.id] ?? 0) : 0;
}

/** Most people online first; then more on mic, more members, and the newer room. */
export function byOnline(live: Record<string, number> | null | undefined) {
  return (a: Room, b: Room) => {
    const d = onlineIn(b, live) - onlineIn(a, live);
    if (d) return d;
    const mic = (b.server ? onMicIn(b.server.id) : 0) - (a.server ? onMicIn(a.server.id) : 0);
    if (mic) return mic;
    return b.members - a.members;
  };
}

/**
 * The rooms with people in them right now, busiest first. Only real (backend) rooms: the sample rooms
 * have made-up numbers. Game tables ("…'s Ludo table") are games, not rooms to hang out in, unless asked for.
 */
export function activeRooms(rooms: Room[], live: Record<string, number> | null | undefined, opts: { gameTables?: boolean } = {}): Room[] {
  if (!live) return [];
  return rooms
    .filter((r) => r.server && onlineIn(r, live) > 0 && (opts.gameTables || !isGameTable(r.name)))
    .sort(byOnline(live));
}
