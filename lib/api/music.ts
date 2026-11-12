/**
 * Room music for everyone: the songs people uploaded (live at once), and searching Audius / Jamendo.
 *   GET    /api/v1/music/songs
 *   POST   /api/v1/music/songs  (multipart: file, title, artist, duration, rights)
 *   DELETE /api/v1/music/songs/{id}
 *   GET    /api/v1/music/search?source=audius|jamendo&q=
 */
import { api } from "./client";
import { mediaSrc } from "./rewards";
import type { Song } from "@/lib/app/music";

const opts = { auth: true } as const;
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const text = (v: unknown, d = "") => (typeof v === "string" && v.trim() ? v.trim() : d);
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);

function readSong(x: unknown, source: Song["source"]): Song | null {
  const o = obj(x);
  const id = text(o?.id);
  const src = source === "upload" ? mediaSrc(o?.src) : text(o?.src);
  if (!o || !id || !src) return null;
  return {
    id,
    title: text(o.title, "Untitled"),
    artist: text(o.artist, "Unknown artist"),
    uploader: "server",
    uploaderName: text(o.uploaderName) || undefined,
    duration: int(o.duration),
    src,
    source,
    mine: o.mine === true,
  };
}

export const musicApi = {
  songs: async (): Promise<Song[]> => {
    const d = await api<unknown>("/api/v1/music/songs", opts);
    return Array.isArray(d) ? d.flatMap((x) => readSong(x, "upload") ?? []) : [];
  },
  upload: async (file: File, title: string, artist: string, duration: number): Promise<Song> => {
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("title", title);
    form.append("artist", artist);
    form.append("duration", String(duration));
    form.append("rights", "true");
    const s = readSong(await api<unknown>("/api/v1/music/songs", { ...opts, method: "POST", body: form, timeoutMs: 120_000 }), "upload");
    if (!s) throw new Error("The song was saved but the app couldn't read it. Reopen the music list.");
    return s;
  },
  remove: (id: string) => api<unknown>(`/api/v1/music/songs/${encodeURIComponent(id.replace(/^u-/, ""))}`, { ...opts, method: "DELETE" }),
  search: async (source: "audius" | "jamendo", q: string): Promise<{ results: Song[]; jamendo: boolean }> => {
    const d = obj(await api<unknown>(`/api/v1/music/search?source=${source}&q=${encodeURIComponent(q)}`, opts));
    const list = Array.isArray(d?.results) ? d.results : [];
    return { results: list.flatMap((x) => readSong(x, source) ?? []), jamendo: d?.jamendo === true };
  },
  sources: async (): Promise<{ audius: boolean; jamendo: boolean }> => {
    const d = obj(await api<unknown>("/api/v1/music/sources", opts));
    return { audius: d?.audius !== false, jamendo: d?.jamendo === true };
  },
};
