/**
 * The 7-digit IDs people see, share and search by (like 6372289), never the
 * database's 1, 2, 3. Same formulas as the backend (PublicIds.java and the
 * users.public_id / voice_rooms.room_code columns): change all of them together.
 */
const SPAN = 9_000_000;
const mod = (n: number) => ((n % SPAN) + SPAN) % SPAN;

/** A person's public ID from their backend user id ("12" → "6372289"). */
export function publicUserId(userId: string | number | undefined | null): string {
  const n = Number(userId);
  if (!Number.isSafeInteger(n) || n <= 0) return String(userId ?? "");
  return String(1_000_000 + mod(n * 7_654_321 + 3_141_592));
}

/** A room's public ID from its backend room id. */
export function publicRoomId(roomId: string | number | undefined | null): string {
  const n = Number(roomId);
  if (!Number.isSafeInteger(n) || n <= 0) return String(roomId ?? "");
  return String(1_000_000 + mod(n * 4_782_961 + 7_777_777));
}
