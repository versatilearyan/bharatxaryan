/**
 * Songs the people in a room ask for. Anyone in the room adds; the owner and the admins put a song in the queue
 * (and play it) or take it off.
 *
 *   GET    /api/v1/voice-rooms/{id}/song-requests
 *   POST   /api/v1/voice-rooms/{id}/song-requests  { song }
 *   DELETE /api/v1/voice-rooms/{id}/song-requests/{requestId}
 * Live: /topic/voice-rooms/{id}/songs
 */
import { api } from "./client";
import type { Song } from "@/lib/app/music";

export type SongRequest = { id: string; userId: string; userName: string; song: Song; at: number };
export type SongRequests = { roomId: string; version: number; requests: SongRequest[] };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const text = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const opts = { auth: true, forbiddenIsAccess: true } as const;
const base = (roomId: string) => `/api/v1/voice-rooms/${encodeURIComponent(roomId)}/song-requests`;

export function readSongRequests(raw: unknown): SongRequests | null {
  const o = obj(raw);
  if (!o || !Array.isArray(o.requests)) return null;
  const requests: SongRequest[] = [];
  for (const r of o.requests) {
    const x = obj(r);
    const s = obj(x?.song);
    if (!x || !s || !text(s.id) || !text(s.title)) continue;
    requests.push({
      id: text(x.id),
      userId: text(x.userId),
      userName: text(x.userName) || "Someone",
      at: typeof x.at === "number" ? x.at : 0,
      song: {
        id: text(s.id),
        title: text(s.title),
        artist: text(s.artist),
        uploader: text(s.uploader),
        duration: typeof s.duration === "number" ? s.duration : 0,
        src: text(s.src) || undefined,
        source: (["built-in", "upload", "audius", "jamendo"] as const).find((k) => k === s.source),
        uploaderName: text(s.uploaderName) || undefined,
      },
    });
  }
  return { roomId: text(o.roomId), version: typeof o.version === "number" ? o.version : 0, requests };
}

export const songRequestsTopic = (roomId: string) => `/topic/voice-rooms/${encodeURIComponent(roomId)}/songs`;

export const songRequestApi = {
  list: async (roomId: string) => readSongRequests(await api<unknown>(base(roomId), opts)),
  add: async (roomId: string, song: Song) =>
    readSongRequests(
      await api<unknown>(base(roomId), {
        ...opts,
        method: "POST",
        body: { song: { id: song.id, title: song.title, artist: song.artist, uploader: song.uploader, uploaderName: song.uploaderName, duration: Math.round(song.duration || 0), src: song.src, source: song.source } },
      }),
    ),
  remove: async (roomId: string, id: string) => readSongRequests(await api<unknown>(`${base(roomId)}/${encodeURIComponent(id)}`, { ...opts, method: "DELETE" })),
};
