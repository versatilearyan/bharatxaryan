/**
 * Local mock data for the product previews.
 * Every person, room and number here is fictional and exists only to
 * illustrate the planned interface. Nothing is fetched from an API.
 */

export type Frame = "none" | "gold" | "coral" | "bloom";

export type Member = {
  id: string;
  name: string;
  bg: string;     // avatar background
  skin: string;
  hair: string;
  hairStyle: 0 | 1 | 2 | 3;
  outfit: string;  // clothing colour
  frame: Frame;
  speaking?: boolean;
  muted?: boolean;
  host?: boolean;
};

export const ROOM = {
  title: "Sunday chai adda",
  topic: "Ludo finals + gossip",
};

export const MEMBERS: Member[] = [
  { id: "riya", name: "Riya", bg: "#7a2f45", skin: "#c98b6b", hair: "#1d1216", hairStyle: 1, frame: "none", outfit: "#f4515b", speaking: true, host: true },
  { id: "kabir", name: "Kabir", bg: "#2f4a63", skin: "#a8715a", hair: "#181214", hairStyle: 0, frame: "none", outfit: "#e7bc72", speaking: true },
  { id: "meher", name: "Meher", bg: "#7a5a2a", skin: "#e0a98a", hair: "#3b2318", hairStyle: 2, frame: "none", outfit: "#ff647c" },
  { id: "arjun", name: "Arjun", bg: "#4a3a6e", skin: "#8d5a44", hair: "#141012", hairStyle: 3, frame: "none", outfit: "#8fa8ff", muted: true },
  { id: "zoya", name: "Zoya", bg: "#6e2f3f", skin: "#d39a7c", hair: "#2a1a14", hairStyle: 2, frame: "none", outfit: "#e7bc72" },
  { id: "dev", name: "Dev", bg: "#2f5a49", skin: "#b07a5e", hair: "#1a1412", hairStyle: 0, frame: "none", outfit: "#ff8a6e" },
  { id: "tara", name: "Tara", bg: "#6a3a5a", skin: "#e8b597", hair: "#5a2e1e", hairStyle: 1, frame: "none", outfit: "#fff1d5", speaking: true },
  { id: "ishaan", name: "Ishaan", bg: "#3d4470", skin: "#9c6a52", hair: "#120e10", hairStyle: 3, frame: "none", outfit: "#f4515b" },
];

export type Game = { id: string; name: string; players: string; hue: string; glyph: "dice" | "carrom" | "draw" | "music" | "cards" | "spin" };

export const GAMES: Game[] = [
  { id: "ludo", name: "Ludo", players: "2–4 players", hue: "#f4515b", glyph: "dice" },
  { id: "carrom", name: "Carrom", players: "2–4 players", hue: "#e7bc72", glyph: "carrom" },
  { id: "draw", name: "Draw & Guess", players: "3–8 players", hue: "#ff647c", glyph: "draw" },
  { id: "antakshari", name: "Antakshari", players: "Whole room", hue: "#f7a072", glyph: "music" },
  { id: "teen", name: "Card Night", players: "2–6 players", hue: "#c9a0ff", glyph: "cards" },
  { id: "spin", name: "Spin the Bottle", players: "Whole room", hue: "#6fe0a6", glyph: "spin" },
];

export const ROOMS_LIST = [
  { name: "Sunday chai adda", count: 8, live: true },
  { name: "Late night Antakshari", count: 14, live: true },
  { name: "Carrom champions", count: 4, live: false },
  { name: "Bollywood quiz hour", count: 11, live: true },
];
