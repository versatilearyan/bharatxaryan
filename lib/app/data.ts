/**
 * Local sample data for the Panchayat web app.
 * Every person, room, number and message here is fictional.
 */
import type { Conversation, Game, Gift, GiftCategory, GiftId, Notice, Person, Profile, Room } from "./types";
import type { ServerGift } from "@/lib/api/rewards";

const UIDS: Record<string, string> = {"riya": "208114", "kabir": "311520", "meher": "402773", "arjun": "518806", "zoya": "627415", "dev": "100777", "tara": "733092", "ishaan": "845261", "naina": "956130", "vikram": "167048", "anaya": "278359", "rohan": "389460", "saanvi": "490571", "aditya": "501682"};

const p = (
  id: string,
  name: string,
  look: Person["look"],
  extra: Partial<Person> & Pick<Person, "bio" | "city" | "tags">,
): Person => ({
  id,
  uid: UIDS[id] ?? "100000",
  name,
  handle: `@${id}`,
  look,
  frame: "none",
  level: 12,
  online: true,
  followers: 1200,
  ...extra,
});

/** No sample people: everyone shown comes from the server. */
export const PEOPLE: Person[] = [];

export const personById = (id: string) => PEOPLE.find((x) => x.id === id);

export const CATEGORIES = ["Chai Adda", "Music", "Gaming", "Bollywood", "Cricket", "Poetry", "Study", "Devotional", "Movies", "Comedy"] as const;

/** No sample rooms: the room lists are the server's live rooms. */
export const ROOMS: Room[] = [];

export const GAMES: Game[] = [
  { id: "chess", name: "Chess", players: "2 players", online: 4210, blurb: "Classic chess with voice. Challenge a friend or someone in your room." },
  { id: "ludo", name: "Ludo", players: "2–4 players", online: 18930, tag: "HOT", blurb: "Roll, race and cut your friends' pieces while you chat." },
  { id: "micgrab", soon: true, name: "Mic Grab", players: "Whole room", online: 2780, tag: "NEW", blurb: "A song starts. First to grab the mic and sing the next line wins." },
  { id: "carrom", soon: true, name: "Carrom", players: "2–4 players", online: 6420, tag: "NEW", blurb: "Flick the striker, pocket the queen, cover it like a pro." },
  { id: "pool", soon: true, name: "Pool", players: "2 players", online: 3390, blurb: "8-ball with a clean cue and friendly trash talk." },
  { id: "draw", soon: true, name: "Draw & Guess", players: "3–8 players", online: 5120, blurb: "One draws, everyone guesses. Terrible art encouraged." },
  { id: "antakshari", soon: true, name: "Antakshari", players: "Whole room", online: 7650, blurb: "Sing a song that starts with the last letter. Teams welcome." },
  { id: "cards", soon: true, name: "Card Night", players: "2–6 players", online: 4870, blurb: "Rummy-style rounds with demo chips only." },
];

export const gameById = (id: string) => GAMES.find((g) => g.id === id);

const ALL_GIFT_CATEGORIES: GiftCategory[] = ["Popular", "Cute", "Romantic", "Celebration", "Royal", "Legendary"];

/** Gifting is on. Set to false to show every gift as "Coming soon" and stop sending everywhere in the app. */
export const GIFTS_LIVE = true;
export const GIFTS_SOON_TEXT = "Gifts are coming soon";

/** The gifts on sale. */
export const GIFTS: Gift[] = [
  {
    id: "cupid-heart",
    name: "Cupid Heart",
    cost: 18_888,
    categories: ["Popular", "Cute", "Romantic", "Legendary"],
    tier: "legendary",
    blurb: "Cupid's arrow, straight to the heart.",
    video: { src: "/gifts/cupid-heart.mp4", poster: "/gifts/cupid-heart-poster.jpg", icon: "/gifts/cupid-heart-icon.png" },
  },
  {
    id: "sunset-romance",
    name: "Sunset Romance",
    cost: 52_013,
    news: true,
    categories: ["Popular", "Romantic", "Legendary"],
    tier: "legendary",
    blurb: "A drive to the beach at sunset, and a kiss as the sun goes down.",
    video: { src: "/gifts/sunset-romance.mp4", poster: "/gifts/sunset-romance-poster.jpg", icon: "/gifts/sunset-romance-icon.png", floating: true, ratio: "510 / 704" },
  },
  {
    id: "dragon",
    name: "Dragon",
    cost: 19_999,
    categories: ["Popular", "Royal", "Legendary"],
    tier: "legendary",
    blurb: "Saddle up: a fire-winged dragon carries you over the hills.",
    video: { src: "/gifts/dragon.mp4", poster: "/gifts/dragon-poster.jpg", icon: "/gifts/dragon-icon.png", framed: true },
  },
  {
    id: "princess-flower",
    name: "Princess Flower",
    cost: 39_999,
    categories: ["Popular", "Romantic", "Legendary"],
    tier: "legendary",
    blurb: "A garden of flowers, only for a princess.",
    video: { src: "/gifts/princess-flower.mp4", poster: "/gifts/princess-flower-poster.jpg", icon: "/gifts/princess-flower-icon.png" },
  },
  {
    id: "love-fireworks",
    name: "Love Fireworks",
    cost: 13_140,
    categories: ["Popular", "Romantic", "Celebration", "Legendary"],
    tier: "legendary",
    blurb: "Fireworks light up the sky over a couple holding hands on the bridge.",
    video: { src: "/gifts/love-fireworks.mp4", poster: "/gifts/love-fireworks-poster.jpg", icon: "/gifts/love-fireworks-icon.png", floating: true, ratio: "506 / 756" },
  },
  {
    id: "god-of-wealth",
    name: "God of Wealth",
    cost: 18_888,
    categories: ["Popular", "Celebration", "Royal", "Legendary"],
    tier: "legendary",
    blurb: "The God of Wealth arrives with a bowl of gold. Fortune for everyone here!",
    video: { src: "/gifts/god-of-wealth.mp4", poster: "/gifts/god-of-wealth-poster.jpg", icon: "/gifts/god-of-wealth-icon.png" },
  },
  {
    id: "city-fireworks",
    name: "City Fireworks",
    cost: 2_000,
    categories: ["Popular", "Celebration", "Legendary"],
    tier: "legendary",
    blurb: "Rockets fly over the city at sunset and the whole sky bursts into fireworks.",
    video: { src: "/gifts/city-fireworks.mp4", poster: "/gifts/city-fireworks-poster.jpg", icon: "/gifts/city-fireworks-icon.png", floating: true, ratio: "510 / 756" },
  },
  {
    id: "neon-racer",
    name: "Neon Racer",
    cost: 9_999,
    categories: ["Popular", "Royal", "Legendary"],
    tier: "legendary",
    blurb: "A neon supercar races through the city, skids to a stop, then blasts past.",
    video: { src: "/gifts/neon-racer.mp4?v=2", poster: "/gifts/neon-racer-poster.jpg?v=2", icon: "/gifts/neon-racer-icon.png", floating: true, ratio: "494 / 438" },
  },
  {
    id: "star-prince",
    name: "Star Prince",
    cost: 19_999,
    categories: ["Popular", "Royal", "Legendary"],
    tier: "legendary",
    blurb: "A golden scepter descends through a magic circle and the Star Prince appears in a flash of light.",
    video: { src: "/gifts/star-prince.mp4?v=2", poster: "/gifts/star-prince-poster.jpg?v=2", icon: "/gifts/star-prince-icon.png", floating: true, ratio: "510 / 604" },
  },
  {
    id: "savanna-king",
    name: "Savanna King",
    cost: 39_999,
    categories: ["Popular", "Royal", "Legendary"],
    tier: "legendary",
    blurb: "The king of the savanna races across the plains and lets out a mighty roar.",
    video: { src: "/gifts/savanna-king.mp4?v=2", poster: "/gifts/savanna-king-poster.jpg", icon: "/gifts/savanna-king-icon.png", floating: true, ratio: "510 / 534" },
  },
  {
    id: "crystal-palace",
    name: "Crystal Palace",
    cost: 131_420,
    news: true,
    categories: ["Popular", "Royal", "Legendary"],
    tier: "legendary",
    blurb: "A phoenix flies through the clouds to a palace of ice and crystal.",
    video: { src: "/gifts/crystal-palace.mp4", poster: "/gifts/crystal-palace-poster.jpg", icon: "/gifts/crystal-palace-icon.png", floating: true, ratio: "510 / 798" },
  },
  {
    id: "storm-guardian",
    name: "Storm Guardian",
    cost: 131_420,
    news: true,
    categories: ["Popular", "Legendary"],
    tier: "legendary",
    blurb: "The Storm Guardian lands in a flash of blue lightning.",
    svga: { src: "/gifts/storm-guardian/gift.svga?v=3", sound: "/gifts/storm-guardian/gift.mp3", icon: "/gifts/storm-guardian/icon-small.png", still: "/gifts/storm-guardian/icon.png" },
    reward: "storm-guardian",
  },
];

/** Gift tabs that have something in them. */
export const GIFT_CATEGORIES = ALL_GIFT_CATEGORIES.filter((c) => GIFTS.some((g) => !g.packageOnly && g.categories.includes(c)));

/**
 * Gifts that are no longer sold or handed out. They're kept only so old chat
 * lines, received-gift counts and saves that mention them still show a name.
 */
const RETIRED_GIFTS: Gift[] = [
  { id: "rose", name: "Rose", cost: 10, categories: [], tier: "ordinary" },
  { id: "heart", name: "Heart Pop", cost: 30, categories: [], tier: "ordinary" },
  { id: "bear", name: "Love Bear", cost: 99, categories: [], tier: "ordinary" },
  { id: "packet", name: "Lucky Red Packet", cost: 188, categories: [], tier: "ordinary" },
  { id: "fireworks", name: "Fireworks", cost: 520, categories: [], tier: "ordinary" },
  { id: "crown", name: "Golden Crown", cost: 999, categories: [], tier: "ordinary" },
  { id: "rocket", name: "Magic Rocket", cost: 2999, categories: [], tier: "legendary" },
  { id: "car", name: "Royal Car", cost: 5200, categories: [], tier: "legendary" },
  { id: "royal-entry", name: "Panchayat Royal Entry", cost: 13140, categories: [], tier: "legendary" },
  { id: "hamper", name: "Panchayat Hamper", cost: 666, categories: [], tier: "ordinary", packageOnly: true },
];

/*
 * The server's gift catalog (GET /api/v1/gifts), managed from the admin panel.
 * Once loaded it is the list on sale: prices, names and categories come from
 * the server; an admin-uploaded picture or animation (SVGA or MP4, with an MP3
 * sound) replaces the bundled art, and gifts the admins added appear too.
 * Until it loads (or without the backend) the bundled list is used.
 */
let serverGifts: Map<string, Gift> | null = null;
const giftListeners = new Set<() => void>();

export function setServerGifts(list: ServerGift[]) {
  const map = new Map<string, Gift>();
  for (const sg of [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.price - b.price)) {
    const local = GIFTS.find((g) => g.id === sg.id) ?? RETIRED_GIFTS.find((g) => g.id === sg.id);
    const category = (ALL_GIFT_CATEGORIES as string[]).includes(sg.category) ? (sg.category as GiftCategory) : "Popular";
    const icon = sg.imageUrl ?? local?.svga?.icon ?? local?.video?.icon ?? "";
    const g: Gift = {
      ...(local ?? { tier: sg.price >= 10_000 ? "legendary" : "ordinary" }),
      id: sg.id as GiftId,
      name: sg.name,
      cost: sg.price,
      categories: local?.categories.length ? Array.from(new Set([category, ...local.categories])) : [category],
      image: sg.imageUrl ?? undefined,
    } as Gift;
    if (sg.animationUrl && sg.animationFormat === "SVGA") {
      g.svga = { src: sg.animationUrl, sound: sg.soundUrl ?? undefined, icon, still: sg.imageUrl ?? undefined };
      delete g.video;
    } else if (sg.animationUrl && sg.animationFormat === "MP4") {
      g.video = { src: sg.animationUrl, poster: sg.imageUrl ?? icon, icon };
      delete g.svga;
    }
    map.set(sg.id, g);
  }
  serverGifts = map;
  giftListeners.forEach((f) => f());
}

export function subscribeGifts(f: () => void) {
  giftListeners.add(f);
  return () => {
    giftListeners.delete(f);
  };
}

/** Gifts on sale now: the server's when loaded, otherwise the bundled ones. */
export const giftsOnSale = (): Gift[] => (serverGifts ? [...serverGifts.values()] : GIFTS);
export const giftCategories = (): GiftCategory[] => ALL_GIFT_CATEGORIES.filter((c) => giftsOnSale().some((g) => !g.packageOnly && g.categories.includes(c)));

export const isGiftOnSale = (id: string) => (serverGifts ? serverGifts.has(id) : GIFTS.some((g) => g.id === id));
export const giftById = (id: string): Gift =>
  serverGifts?.get(id) ?? GIFTS.find((g) => g.id === id) ?? RETIRED_GIFTS.find((g) => g.id === id) ?? { id: id as GiftId, name: "Gift", cost: 0, categories: [], tier: "ordinary" };

/** Sample YouTube videos (Blender Foundation open movies) offered in the Add Video modal. */
export const SAMPLE_VIDEOS = [
  { id: "aqz-KE-bpKQ", title: "Big Buck Bunny" },
  { id: "eRsGyueVLvQ", title: "Sintel" },
  { id: "R6MlUcmOul8", title: "Tears of Steel" },
];

/** No made-up chat lines in rooms. */
export const ROOM_CHATTER: string[] = [];

export const EMOJIS = [
  "😂", "😍", "🥰", "😎", "🤩", "😭", "🙏", "👏", "🔥", "❤️", "💯", "✨",
  "🎉", "🥳", "☕", "🎶", "🎤", "👑", "🌹", "💐", "😅", "🤔", "😴", "🤝",
  "👋", "💃", "🕺", "🪔", "🏏", "🎲", "♟️", "🍿", "😇", "😜", "🙌", "💖",
];

export const REACTIONS = ["👏", "😂", "🔥", "❤️", "🎉", "🙏"];

/** Blank until the server's profile (GET /users/me) fills it in: no sample name, ID or bio. */
export const INITIAL_PROFILE: Profile = {
  name: "",
  handle: "",
  userId: "",
  bio: "",
  look: { bg: "#3a2f55", skin: "#b07a5e", hair: "#16100e", hairStyle: 0, outfit: "#f4515b" },
  frame: "none",
  // Everyone starts at Lv.1
  level: 1,
  xp: 0,
  xpNext: 212,
  favoriteGames: [],
  following: [],
};

/** Your real balance loads from the server (GET /wallet/balance); nothing made up before it does. */
export const INITIAL_COINS = 0;

const now = Date.now();
const mins = (m: number) => now - m * 60_000;

/** No sample chats: conversations come from the server. */
export const CONVERSATIONS: Conversation[] = [];

/** No sample notifications. */
export const NOTICES: Notice[] = [];

export const TASKS = [
  { id: "t1", title: "Check in today", reward: 50, goal: 1, progress: 1 },
  { id: "t2", title: "Spend 10 minutes in a voice room", reward: 100, goal: 10, progress: 6 },
  { id: "t3", title: "Send a gift", reward: 150, goal: 1, progress: 0 },
  { id: "t4", title: "Play one game of Ludo", reward: 120, goal: 1, progress: 1 },
  { id: "t5", title: "Invite a friend to a room", reward: 180, goal: 1, progress: 0 },
];

export const EVENTS = [
  { id: "e1", title: "Diwali Mehfil Week", when: "Starts in 3 days", body: "Themed rooms, diya decorations and a festive gift wall.", cover: { theme: "gold", motif: "lanterns" } as const },
  { id: "e2", title: "Ludo Premier League", when: "Live now", body: "Team up with your room. Top rooms get a gold badge.", cover: { theme: "ember", motif: "kites" } as const },
  { id: "e3", title: "Open Mic Saturdays", when: "Every Saturday, 9 PM", body: "Five-minute sets in voice rooms. Be kind, clap loud.", cover: { theme: "night", motif: "river" } as const },
];

/** VIP perks per level. Thresholds live in lib/app/levels.ts. */
export const VIP_TIERS = [
  { tier: 1, name: "VIP 1", perks: ["VIP 1 animated frame", "VIP 1 chat bubble", "VIP 1 entry effect", "VIP 1 badge (always on)", "Shining name"] },
  { tier: 2, name: "VIP 2", perks: ["VIP 2 animated frame", "VIP 2 chat bubble", "VIP 2 entry effect", "VIP 2 badge (always on)"] },
  { tier: 3, name: "VIP 3", perks: ["VIP 3 animated frame", "VIP 3 chat bubble", "VIP 3 entry effect", "VIP 3 badge (always on)", "Sit in VIP 3+ seats"] },
  { tier: 4, name: "VIP 4", perks: ["VIP 4 animated frame", "VIP 4 chat bubble", "VIP 4 entry effect", "VIP 4 badge (always on)", "2 extra seats in your room"] },
  { tier: 5, name: "VIP 5", perks: ["VIP 5 animated frame", "VIP 5 chat bubble", "VIP 5 entry effect", "VIP 5 badge (always on)", "Royal room themes"] },
  { tier: 6, name: "VIP 6", perks: ["VIP 6 animated frame", "VIP 6 chat bubble", "VIP 6 entry effect", "VIP 6 badge (always on)", "Gold name", "Priority seat on mic"] },
  { tier: 7, name: "VIP 7", perks: ["VIP 7 animated frame", "VIP 7 chat bubble", "VIP 7 entry effect", "VIP 7 badge (always on)", "Custom room cover"] },
  { tier: 8, name: "VIP 8", perks: ["Legendary gift discounts"] },
  { tier: 9, name: "VIP 9", perks: ["Invite-only Darbar rooms"] },
  { tier: 10, name: "VIP 10", perks: ["Crown next to your name"] },
  { tier: 11, name: "VIP 11", perks: ["Top of the VIP ranking"] },
];

/** Room level perks (levels 1–10). */
export const ROOM_LEVEL_PERKS: Record<number, string> = {
  1: "Room opens with 8 seats",
  2: "Room announcement banner",
  3: "Custom room cover",
  4: "+1 mic seat",
  5: "Bronze room badge",
  6: "+1 mic seat",
  7: "Silver room badge",
  8: "Room entry effect",
  9: "Gold room badge",
  10: "Crowned room frame and top of Discover",
};
