/**
 * Room music. Built-in songs are short original instrumentals made by
 * scripts/compose-songs.py and scripts/compose-music.py (no rights issues).
 * People can upload their own songs (MP3): they are live for everyone at once.
 * Free songs from Audius (and Jamendo when its key is set) can be ordered too.
 */
export type Song = {
  id: string;
  title: string;
  artist: string;
  /** Who uploaded it to Panchayat. */
  uploader: string;
  /** Seconds. */
  duration: number;
  src?: string;
  /** Where it comes from: our library, a song someone uploaded, or an open catalogue. */
  source?: "built-in" | "upload" | "audius" | "jamendo";
  uploaderName?: string;
  /** Uploaded by you. */
  mine?: boolean;
};

/** Songs from another site: they play with a CORS request so they can go into the call too. */
export const isExternalSong = (s?: Song) => s?.source === "audius" || s?.source === "jamendo";

/** "Paste a Spotify link" -> the track id, or null. */
export function spotifyTrackId(input: string): string | null {
  const t = input.trim();
  const m = t.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{10,30})/) ?? t.match(/^spotify:track:([A-Za-z0-9]{10,30})$/);
  return m ? m[1] : null;
}

export const LIBRARY: Song[] = [
  { id: "panchayat-raag", title: "Panchayat Raag", artist: "Bansuri & tabla · Raag Bhupali", uploader: "Panchayat", duration: 72, src: "/audio/panchayat-raag.mp3" },
  { id: "chai-ki-chuski", title: "Chai Ki Chuski", artist: "Bansuri · Raag Yaman", uploader: "riya", duration: 73, src: "/audio/songs/chai-ki-chuski.mp3" },
  { id: "gaon-ki-shaam", title: "Gaon Ki Shaam", artist: "Santoor · Raag Des", uploader: "meher", duration: 71, src: "/audio/songs/gaon-ki-shaam.mp3" },
  { id: "mela-masti", title: "Mela Masti", artist: "Shehnai · Raag Khamaj", uploader: "kabir", duration: 61, src: "/audio/songs/mela-masti.mp3" },
  { id: "barish-ki-boondein", title: "Barish Ki Boondein", artist: "Sitar · Raag Megh", uploader: "tara", duration: 77, src: "/audio/songs/barish-ki-boondein.mp3" },
];

/** Biggest file you can contribute. */
export const MAX_SONG_MB = 15;

/** "3:05" */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
