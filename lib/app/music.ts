/**
 * Room music. Built-in songs are short original instrumentals made by
 * scripts/compose-songs.py and scripts/compose-music.py (no rights issues).
 * People can contribute their own songs: each one is reviewed and goes live in
 * the app's library 2 to 3 days later.
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
};

export const LIBRARY: Song[] = [
  { id: "panchayat-raag", title: "Panchayat Raag", artist: "Bansuri & tabla · Raag Bhupali", uploader: "Panchayat", duration: 72, src: "/audio/panchayat-raag.mp3" },
  { id: "chai-ki-chuski", title: "Chai Ki Chuski", artist: "Bansuri · Raag Yaman", uploader: "riya", duration: 73, src: "/audio/songs/chai-ki-chuski.mp3" },
  { id: "gaon-ki-shaam", title: "Gaon Ki Shaam", artist: "Santoor · Raag Des", uploader: "meher", duration: 71, src: "/audio/songs/gaon-ki-shaam.mp3" },
  { id: "mela-masti", title: "Mela Masti", artist: "Shehnai · Raag Khamaj", uploader: "kabir", duration: 61, src: "/audio/songs/mela-masti.mp3" },
  { id: "barish-ki-boondein", title: "Barish Ki Boondein", artist: "Sitar · Raag Megh", uploader: "tara", duration: 77, src: "/audio/songs/barish-ki-boondein.mp3" },
];

/** A song you contributed. It's playable for everyone once `liveAt` has passed. */
export type Contribution = { id: string; title: string; artist: string; duration: number; at: number; liveAt: number };

export const REVIEW_MIN_DAYS = 2;
export const REVIEW_MAX_DAYS = 3;
/** Biggest file you can contribute. */
export const MAX_SONG_MB = 15;

/** "3:05" */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
