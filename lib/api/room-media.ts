/**
 * A backend room's mode (Normal, YouTube, Kharidari) and its shared YouTube
 * video. The server keeps one copy; every phone in the room follows it.
 *
 * The video's position is "seconds in, as of updatedAt (server clock)", so
 * each app works out the same current position: position + elapsed while
 * playing. serverTime in each answer lines the app's clock up with the server.
 */
import { api } from "./client";

export type ServerMode = "VOICE" | "WATCH" | "KHARIDARI";

export type MediaVideo = { id: string; title: string; playing: boolean; position: number; updatedAt: number; byUserId?: string };

export type RoomMedia = {
  roomId: string;
  version: number;
  mode: ServerMode;
  video: MediaVideo | null;
  serverTime: number;
  event?: { type: string; actorId?: string };
};

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : undefined);

export function readRoomMedia(raw: unknown): RoomMedia | null {
  const d = obj(raw);
  const roomId = str(d?.roomId);
  const mode = str(d?.mode);
  if (!d || !roomId || (mode !== "VOICE" && mode !== "WATCH" && mode !== "KHARIDARI")) return null;
  const v = obj(d.video);
  const id = str(v?.id);
  const ev = obj(d.event);
  return {
    roomId,
    version: num(d.version) ?? 0,
    mode,
    video:
      v && id
        ? { id, title: str(v.title) ?? "YouTube video", playing: v.playing === true, position: num(v.position) ?? 0, updatedAt: num(v.updatedAt) ?? Date.now(), byUserId: str(v.byUserId) }
        : null,
    serverTime: num(d.serverTime) ?? Date.now(),
    event: ev && typeof ev.type === "string" ? { type: ev.type, actorId: str(ev.actorId) || undefined } : undefined,
  };
}

export const roomMediaTopic = (roomId: string) => `/topic/voice-rooms/${encodeURIComponent(roomId)}/media`;

const base = (roomId: string) => `/api/v1/voice-rooms/${encodeURIComponent(roomId)}`;
const opts = { auth: true, forbiddenIsAccess: true } as const;

async function call(roomId: string, path: string, method: "GET" | "PUT" | "POST" | "DELETE", body?: unknown): Promise<RoomMedia> {
  const m = readRoomMedia(await api<unknown>(`${base(roomId)}${path}`, { ...opts, method, body }));
  if (!m) throw new Error("The room's answer couldn't be read.");
  return m;
}

export const roomMediaApi = {
  get: (roomId: string) => call(roomId, "/media", "GET"),
  setMode: (roomId: string, mode: ServerMode) => call(roomId, "/mode", "PUT", { mode }),
  setVideo: (roomId: string, videoId: string, title: string) => call(roomId, "/video", "PUT", { videoId, title }),
  removeVideo: (roomId: string) => call(roomId, "/video", "DELETE"),
  control: (roomId: string, action: "play" | "pause" | "seek", position: number) => call(roomId, "/video/control", "POST", { action, position }),
};
