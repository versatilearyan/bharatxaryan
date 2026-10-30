/** YouTube helpers. Videos play through YouTube's official embed player only. */

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extracts a video ID from the URL shapes YouTube shares:
 * watch?v=, youtu.be/, /shorts/, /embed/, /live/, m. and music. hosts.
 * Returns null for anything else (playlists without a video, channels, other sites).
 */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1] ?? "";
    return ID.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;

  const v = url.searchParams.get("v");
  if (v && ID.test(v)) return v;

  const [, kind, id] = url.pathname.split("/");
  if (["shorts", "embed", "live", "v"].includes(kind ?? "") && id && ID.test(id)) return id;
  return null;
}

export const thumbnailUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export type VideoMeta = { title: string; author: string } | null;

/**
 * Best-effort title lookup through YouTube's public oEmbed endpoint.
 * Returns "blocked" when YouTube says the video is private or not embeddable,
 * and null when the lookup simply could not be made (offline, CORS, timeout).
 */
export async function fetchVideoMeta(id: string): Promise<VideoMeta | "blocked" | "missing"> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(id))}`, { signal: ctrl.signal });
    if (res.status === 401 || res.status === 403) return "blocked";
    if (res.status === 404 || res.status === 400) return "missing";
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    return { title: data.title ?? "YouTube video", author: data.author_name ?? "" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Human message for IFrame Player API error codes. */
export function playerErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return "That link doesn't point to a valid video.";
    case 5:
      return "This video can't be played in the embedded player.";
    case 100:
      return "This video was removed or is private.";
    case 101:
    case 150:
    case 153:
      return "The owner doesn't allow this video to play outside YouTube, or it's age-restricted.";
    default:
      return "This video couldn't be played here.";
  }
}
