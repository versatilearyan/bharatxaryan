/**
 * Couple Rooms (see components/rooms/CoupleRoom.tsx): which couple a room belongs to, and who may go in.
 *
 * A Couple Room is a normal voice room whose settings carry the couple: cpRoom, cpCoupleId and the two partners'
 * backend user ids (cpA, cpB). Everyone can see the room (it's listed like any room, marked 💞 Couple Room), but the
 * app only lets the two partners in; anyone else is shown whose Couple Room it is.
 */
import type { Room } from "./types";

export const COUPLE_MARK = "💞";

export type RoomCouple = { coupleId?: string; a?: string; b?: string };

/** The couple a room belongs to, or null when it isn't a Couple Room. */
export function coupleOfRoom(room: Pick<Room, "name" | "settings">): RoomCouple | null {
  const st = (room.settings ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : undefined);
  if (st.cpRoom === true) return { coupleId: str(st.cpCoupleId), a: str(st.cpA), b: str(st.cpB) };
  return room.name.startsWith(COUPLE_MARK) ? {} : null;
}

/** May this backend user go into the room? Anyone may enter a normal room; a Couple Room only its two partners. */
export function mayEnterCoupleRoom(room: Pick<Room, "name" | "settings" | "hostId">, myUserId: string | null): boolean {
  const c = coupleOfRoom(room);
  if (!c) return true;
  // Rooms made before the partners were saved in the settings: the owner, and whoever the owner invites
  if (!c.a || !c.b) return true;
  return Boolean(myUserId && (myUserId === c.a || myUserId === c.b));
}

/** "Aryan & Siddhi" from a Couple Room's name ("💞 Aryan & Siddhi"). */
export const coupleNames = (room: Pick<Room, "name">) => room.name.replace(COUPLE_MARK, "").trim();
