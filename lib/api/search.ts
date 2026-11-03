/**
 * Find people and rooms on the server: GET /api/v1/search?q=
 * A 7-digit number finds the person with that ID and the room with that ID;
 * text finds people and live public rooms by name.
 */
import { api } from "./client";
import { mediaSrc } from "./rewards";
import { readVoiceRoom, type VoiceRoom } from "./voice-rooms";

export type FoundUser = { id: string; publicId: string; name: string; avatarUrl?: string; vipLevel: number | null };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);

export async function searchServer(q: string): Promise<{ users: FoundUser[]; rooms: VoiceRoom[] }> {
  const d = obj(await api<unknown>(`/api/v1/search?q=${encodeURIComponent(q.trim())}`, { auth: true, forbiddenIsAccess: true }));
  const users = Array.isArray(d?.users)
    ? d.users.flatMap((u) => {
        const o = obj(u);
        const id = str(o?.id);
        const publicId = str(o?.publicId);
        return o && id && publicId
          ? [{ id, publicId, name: str(o.fullName) ?? `User ${publicId}`, avatarUrl: mediaSrc(o.avatarUrl) ?? undefined, vipLevel: typeof o.vipLevel === "number" ? o.vipLevel : null }]
          : [];
      })
    : [];
  const rooms = Array.isArray(d?.rooms) ? d.rooms.map(readVoiceRoom).filter((r): r is VoiceRoom => Boolean(r)) : [];
  return { users, rooms };
}
