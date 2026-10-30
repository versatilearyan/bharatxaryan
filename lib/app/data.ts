/**
 * Local sample data for the Panchayat web app.
 * Every person, room, number and message here is fictional.
 */
import type { Conversation, Game, Gift, GiftCategory, Notice, Person, Profile, Room } from "./types";

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

export const PEOPLE: Person[] = [
  p("riya", "Riya", { bg: "#7a2f45", skin: "#c98b6b", hair: "#1d1216", hairStyle: 1, outfit: "#f4515b" }, { nameFont: "dancing", frame: "none", level: 48, vip: 4, followers: 48200, city: "Jaipur", bio: "Host of Sunday chai adda. Ludo shark, ghazal lover.", tags: ["Chai Adda", "Music"] }),
  p("kabir", "Kabir", { bg: "#2f4a63", skin: "#a8715a", hair: "#181214", hairStyle: 0, outfit: "#e7bc72" }, { frame: "none", level: 36, followers: 22100, city: "Pune", bio: "Cricket stats nerd. Carrom on weekends.", tags: ["Cricket", "Gaming"] }),
  p("meher", "Meher", { bg: "#7a5a2a", skin: "#e0a98a", hair: "#3b2318", hairStyle: 2, outfit: "#ff687c" }, { frame: "none", level: 41, vip: 2, followers: 31800, city: "Lucknow", bio: "Shayari at midnight, Antakshari at dawn.", tags: ["Poetry", "Music"] }),
  p("arjun", "Arjun", { bg: "#4a3a6e", skin: "#8d5a44", hair: "#141012", hairStyle: 3, outfit: "#8fa8ff" }, { level: 22, followers: 5400, city: "Bengaluru", bio: "Chess 1800. Will explain the Sicilian to anyone.", tags: ["Gaming", "Study"] }),
  p("zoya", "Zoya", { bg: "#6e2f3f", skin: "#d39a7c", hair: "#2a1a14", hairStyle: 2, outfit: "#e7bc72" }, { nameFont: "pacifico", level: 29, followers: 12900, city: "Hyderabad", bio: "Bollywood quizmaster. Ask me anything from 1975.", tags: ["Bollywood"] }),
  p("dev", "Dev", { bg: "#2f5a49", skin: "#b07a5e", hair: "#1a1412", hairStyle: 0, outfit: "#ff8a6e" }, { frame: "none", level: 53, vip: 5, followers: 67300, city: "Mumbai", bio: "Running the late-night movie club.", tags: ["Movies", "Chai Adda"] }),
  p("tara", "Tara", { bg: "#6a3a5a", skin: "#e8b597", hair: "#5a2e1e", hairStyle: 1, outfit: "#fff1d5" }, { nameFont: "yatra", level: 18, followers: 3100, city: "Kochi", bio: "Lo-fi playlists and long study rooms.", tags: ["Study", "Music"] }),
  p("ishaan", "Ishaan", { bg: "#3d4470", skin: "#9c6a52", hair: "#120e10", hairStyle: 3, outfit: "#f4515b" }, { frame: "none", level: 33, followers: 9800, city: "Delhi", bio: "Pool, puns and the occasional open mic.", tags: ["Gaming", "Comedy"] }),
  p("naina", "Naina", { bg: "#5a2f63", skin: "#c48a6a", hair: "#24161a", hairStyle: 1, outfit: "#c9a0ff" }, { level: 27, followers: 8700, city: "Indore", bio: "Bhajan mornings, karaoke nights.", tags: ["Devotional", "Music"], online: false }),
  p("vikram", "Vikram", { bg: "#634a2f", skin: "#a06a4e", hair: "#16100e", hairStyle: 0, outfit: "#6fe0a6" }, { level: 39, vip: 3, followers: 18400, city: "Chandigarh", bio: "Kabaddi commentator in another life.", tags: ["Cricket", "Comedy"] }),
  p("anaya", "Anaya", { bg: "#2f5563", skin: "#e2ad8f", hair: "#4a2a1a", hairStyle: 2, outfit: "#ffb199" }, { frame: "none", level: 24, followers: 6200, city: "Goa", bio: "Sunsets, ukulele, and Draw & Guess.", tags: ["Music", "Gaming"] }),
  p("rohan", "Rohan", { bg: "#3a2f63", skin: "#b88466", hair: "#1c1416", hairStyle: 3, outfit: "#e7bc72" }, { level: 15, followers: 2200, city: "Kolkata", bio: "Adda is a way of life.", tags: ["Chai Adda", "Poetry"], online: false }),
  p("saanvi", "Saanvi", { bg: "#63302f", skin: "#d8a284", hair: "#2a1814", hairStyle: 1, outfit: "#ff687c" }, { level: 31, vip: 1, followers: 11200, city: "Ahmedabad", bio: "Garba season all year.", tags: ["Music", "Devotional"] }),
  p("aditya", "Aditya", { bg: "#2f6352", skin: "#9a6448", hair: "#141012", hairStyle: 0, outfit: "#8fa8ff" }, { level: 20, followers: 4100, city: "Nagpur", bio: "UPSC aspirant, chess for breaks.", tags: ["Study", "Gaming"] }),
];

export const personById = (id: string) => PEOPLE.find((x) => x.id === id);

export const CATEGORIES = ["Chai Adda", "Music", "Gaming", "Bollywood", "Cricket", "Poetry", "Study", "Devotional", "Movies", "Comedy"] as const;

export const ROOMS: Room[] = [
  { id: "r-chai", code: "208114", name: "Sunday chai adda", topic: "Ludo finals + gossip", hostId: "riya", type: "voice", category: "Chai Adda", cover: { theme: "dusk", motif: "banyan" }, members: 128, seats: 10, vip: false, live: true, isPrivate: false, permanent: true, basePoints: 1_850_000, seated: ["riya", "kabir", "meher", "arjun", "tara"], admins: ["kabir", "me"], announcement: "Join and follow 🫶 Ludo finals at 9!", fans: 269 },
  { id: "r-antakshari", code: "311907", name: "Late night Antakshari", topic: "Old Hindi songs only", hostId: "meher", type: "voice", category: "Music", cover: { theme: "night", motif: "lanterns" }, members: 342, seats: 10, vip: false, live: true, isPrivate: false, permanent: true, basePoints: 3_400_000, seated: ["meher", "saanvi", "anaya", "rohan"] },
  { id: "r-royal", code: "100001", name: "The Royal Darbar", topic: "Invite-only ghazal evening", hostId: "dev", type: "voice", category: "Music", cover: { theme: "gold", motif: "temple" }, members: 86, seats: 10, vip: true, live: true, isPrivate: false, permanent: true, basePoints: 12_600_000, seated: ["dev", "riya", "vikram", "meher"] },
  { id: "r-movie", code: "450220", name: "Movie night: dusk club", topic: "Watch together, talk after", hostId: "dev", type: "watch", category: "Movies", cover: { theme: "ember", motif: "river" }, members: 214, seats: 10, vip: false, live: true, isPrivate: false, permanent: true, basePoints: 2_100_000, seated: ["dev", "zoya", "ishaan"] },
  { id: "r-cricket", code: "520118", name: "Cricket highlights watch-along", topic: "Replays and hot takes", hostId: "kabir", type: "watch", category: "Cricket", cover: { theme: "monsoon", motif: "kites" }, members: 97, seats: 10, vip: false, live: true, isPrivate: false, permanent: true, basePoints: 640_000, seated: ["kabir", "vikram"] },
  { id: "r-quiz", code: "612480", name: "Bollywood quiz hour", topic: "Guess the film from one dialogue", hostId: "zoya", type: "voice", category: "Bollywood", cover: { theme: "rose", motif: "lanterns" }, members: 176, seats: 10, vip: false, live: true, isPrivate: false, permanent: true, basePoints: 980_000, seated: ["zoya", "ishaan", "naina", "aditya", "anaya", "kabir"] },
  { id: "r-study", code: "733051", name: "Silent study café", topic: "Lo-fi study videos, mics off, 50/10", hostId: "tara", type: "watch", category: "Study", cover: { theme: "monsoon", motif: "huts" }, members: 64, seats: 6, vip: false, live: true, isPrivate: false, permanent: true, basePoints: 120_000, seated: ["tara", "aditya", "arjun"] },
  { id: "r-garba", code: "804411", name: "Garba practice circle", topic: "Garba tutorials, then we practise", hostId: "saanvi", type: "watch", category: "Devotional", cover: { theme: "rose", motif: "temple" }, members: 58, seats: 6, vip: false, live: true, isPrivate: false, permanent: true, basePoints: 260_000, seated: ["saanvi", "naina"] },
  { id: "r-carrom", code: "915002", name: "Carrom champions", topic: "Queen cover practice", hostId: "kabir", type: "voice", category: "Gaming", cover: { theme: "gold", motif: "huts" }, members: 41, seats: 10, vip: false, live: false, isPrivate: false, permanent: true, basePoints: 45_000, seated: ["kabir", "rohan"], password: "2580" },
  { id: "r-shayari", code: "102233", name: "Mehfil-e-shayari", topic: "Read one sher, earn applause", hostId: "meher", type: "voice", category: "Poetry", cover: { theme: "night", motif: "river" }, members: 120, seats: 10, vip: true, live: true, isPrivate: false, permanent: true, basePoints: 5_400_000, seated: ["meher", "rohan", "riya"] },
  { id: "r-standup", code: "117760", name: "Open mic: desi stand-up", topic: "Watch classic sets, then try yours", hostId: "ishaan", type: "watch", category: "Comedy", cover: { theme: "ember", motif: "lanterns" }, members: 233, seats: 6, vip: false, live: true, isPrivate: false, permanent: true, basePoints: 1_200_000, seated: ["ishaan", "vikram", "zoya"] },
  { id: "r-lofi", code: "121905", name: "Lo-fi & rain sounds", topic: "Music videos on loop", hostId: "tara", type: "watch", category: "Music", cover: { theme: "night", motif: "huts" }, members: 89, seats: 10, vip: false, live: true, isPrivate: false, permanent: true, basePoints: 420_000, seated: ["tara", "anaya"] },
  { id: "r-kharidari", code: "777001", name: "Kharidari Bazaar", topic: "Bid gifts for Besties, Bro or Sibling", hostId: "vikram", type: "kharidari", category: "Chai Adda", cover: { theme: "night", motif: "lanterns" }, members: 311, seats: 9, vip: false, live: true, isPrivate: false, permanent: true, basePoints: 4_300_000, seated: ["vikram", "zoya", "kabir", "naina", "rohan"], announcement: "Kharidari every night. Biggest gift volume wins the tag, no refunds 😄", fans: 1840 },
  { id: "r-vipmovie", code: "100777", name: "Velvet screening room", topic: "VIP premiere watch party", hostId: "riya", type: "watch", category: "Movies", cover: { theme: "gold", motif: "lanterns" }, members: 44, seats: 10, vip: true, live: true, isPrivate: false, permanent: true, basePoints: 7_900_000, seated: ["riya", "dev"] },
];

export const GAMES: Game[] = [
  { id: "chess", name: "Chess", players: "2 players", online: 4210, blurb: "Classic chess with voice. Challenge a friend or someone in your room." },
  { id: "ludo", name: "Ludo", players: "2–4 players", online: 18930, tag: "HOT", blurb: "Roll, race and cut your friends' pieces while you chat." },
  { id: "micgrab", name: "Mic Grab", players: "Whole room", online: 2780, tag: "NEW", blurb: "A song starts. First to grab the mic and sing the next line wins." },
  { id: "carrom", name: "Carrom", players: "2–4 players", online: 6420, tag: "NEW", blurb: "Flick the striker, pocket the queen, cover it like a pro." },
  { id: "pool", name: "Pool", players: "2 players", online: 3390, blurb: "8-ball with a clean cue and friendly trash talk." },
  { id: "draw", name: "Draw & Guess", players: "3–8 players", online: 5120, blurb: "One draws, everyone guesses. Terrible art encouraged." },
  { id: "antakshari", name: "Antakshari", players: "Whole room", online: 7650, blurb: "Sing a song that starts with the last letter. Teams welcome." },
  { id: "cards", name: "Card Night", players: "2–6 players", online: 4870, blurb: "Rummy-style rounds with demo chips only." },
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
    cost: 1314,
    categories: ["Popular", "Cute", "Romantic", "Legendary"],
    tier: "legendary",
    blurb: "Cupid's arrow, straight to the heart.",
    video: { src: "/gifts/cupid-heart.mp4", poster: "/gifts/cupid-heart-poster.jpg", icon: "/gifts/cupid-heart-icon.png" },
  },
  {
    id: "sunset-romance",
    name: "Sunset Romance",
    cost: 5200,
    categories: ["Popular", "Romantic", "Legendary"],
    tier: "legendary",
    blurb: "A drive to the beach at sunset, and a kiss as the sun goes down.",
    video: { src: "/gifts/sunset-romance.mp4", poster: "/gifts/sunset-romance-poster.jpg", icon: "/gifts/sunset-romance-icon.png", floating: true, ratio: "510 / 704" },
  },
  {
    id: "dragon",
    name: "Dragon",
    cost: 8888,
    categories: ["Popular", "Royal", "Legendary"],
    tier: "legendary",
    blurb: "Saddle up: a fire-winged dragon carries you over the hills.",
    video: { src: "/gifts/dragon.mp4", poster: "/gifts/dragon-poster.jpg", icon: "/gifts/dragon-icon.png", framed: true },
  },
  {
    id: "princess-flower",
    name: "Princess Flower",
    cost: 9999,
    categories: ["Popular", "Romantic", "Legendary"],
    tier: "legendary",
    blurb: "A garden of flowers, only for a princess.",
    video: { src: "/gifts/princess-flower.mp4", poster: "/gifts/princess-flower-poster.jpg", icon: "/gifts/princess-flower-icon.png" },
  },
  {
    id: "god-of-wealth",
    name: "God of Wealth",
    cost: 18888,
    categories: ["Popular", "Celebration", "Royal", "Legendary"],
    tier: "legendary",
    blurb: "The God of Wealth arrives with a bowl of gold. Fortune for everyone here!",
    video: { src: "/gifts/god-of-wealth.mp4", poster: "/gifts/god-of-wealth-poster.jpg", icon: "/gifts/god-of-wealth-icon.png" },
  },
  {
    id: "crystal-palace",
    name: "Crystal Palace",
    cost: 100_000,
    categories: ["Popular", "Royal", "Legendary"],
    tier: "legendary",
    blurb: "A phoenix flies through the clouds to a palace of ice and crystal.",
    video: { src: "/gifts/crystal-palace.mp4", poster: "/gifts/crystal-palace-poster.jpg", icon: "/gifts/crystal-palace-icon.png", floating: true, ratio: "510 / 798" },
  },
  {
    id: "storm-guardian",
    name: "Storm Guardian",
    cost: 132_900,
    categories: ["Popular", "Legendary"],
    tier: "legendary",
    blurb: "The Storm Guardian lands in a flash of blue lightning.",
    svga: { src: "/gifts/storm-guardian/gift.svga", sound: "/gifts/storm-guardian/gift.mp3", icon: "/gifts/storm-guardian/icon-small.png", still: "/gifts/storm-guardian/icon.png" },
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

export const isGiftOnSale = (id: string) => GIFTS.some((g) => g.id === id);
export const giftById = (id: string) => GIFTS.find((g) => g.id === id) ?? RETIRED_GIFTS.find((g) => g.id === id) ?? GIFTS[0];

/** Sample YouTube videos (Blender Foundation open movies) offered in the Add Video modal. */
export const SAMPLE_VIDEOS = [
  { id: "aqz-KE-bpKQ", title: "Big Buck Bunny" },
  { id: "eRsGyueVLvQ", title: "Sintel" },
  { id: "R6MlUcmOul8", title: "Tears of Steel" },
];

export const ROOM_CHATTER = [
  "Haha this is the best room tonight 😂",
  "Who's up for Ludo after this?",
  "Chai ready ☕ what did I miss?",
  "Hello everyone 👋",
  "That was such a good line!",
  "Next round I'm definitely winning 🏆",
  "Can someone share the song name?",
  "Good vibes only ✨",
  "Mic is so clear today",
  "Wah wah! 👏",
];

export const EMOJIS = [
  "😂", "😍", "🥰", "😎", "🤩", "😭", "🙏", "👏", "🔥", "❤️", "💯", "✨",
  "🎉", "🥳", "☕", "🎶", "🎤", "👑", "🌹", "💐", "😅", "🤔", "😴", "🤝",
  "👋", "💃", "🕺", "🪔", "🏏", "🎲", "♟️", "🍿", "😇", "😜", "🙌", "💖",
];

export const REACTIONS = ["👏", "😂", "🔥", "❤️", "🎉", "🙏"];

export const INITIAL_PROFILE: Profile = {
  name: "Aryan",
  handle: "@aryan",
  userId: "759072",
  bio: "Here for Ludo, late-night chai and good music.",
  look: { bg: "#3a2f55", skin: "#b07a5e", hair: "#16100e", hairStyle: 0, outfit: "#f4515b" },
  frame: "none",
  // Everyone starts at Lv.1
  level: 1,
  xp: 0,
  xpNext: 212,
  favoriteGames: ["ludo", "chess", "carrom"],
  following: ["riya", "dev"],
};

export const INITIAL_COINS = 43900;

const now = Date.now();
const mins = (m: number) => now - m * 60_000;

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c-riya",
    personId: "riya",
    unread: 2,
    messages: [
      { id: "1", from: "them", text: "Ludo finals in my room at 9 tonight!", at: mins(48) },
      { id: "2", from: "me", text: "I'm in. Saving my lucky dice 🎲", at: mins(45) },
      { id: "3", from: "them", text: "Bring Kabir too, we need a fourth", at: mins(6) },
      { id: "4", from: "them", text: "And chai ☕", at: mins(5) },
    ],
  },
  {
    id: "c-dev",
    personId: "dev",
    unread: 1,
    messages: [
      { id: "1", from: "them", text: "Movie night pick: something classic or something new?", at: mins(90) },
      { id: "2", from: "them", text: "Vote in the room, I've added a poll", at: mins(32) },
    ],
  },
  {
    id: "c-meher",
    personId: "meher",
    unread: 0,
    messages: [
      { id: "1", from: "me", text: "Your sher yesterday was beautiful", at: mins(300) },
      { id: "2", from: "them", text: "Shukriya 🙏 come to the mehfil tonight", at: mins(280) },
    ],
  },
  {
    id: "c-kabir",
    personId: "kabir",
    unread: 0,
    messages: [{ id: "1", from: "them", text: "Carrom rematch? I owe you one", at: mins(1440) }],
  },
  {
    id: "c-tara",
    personId: "tara",
    unread: 0,
    messages: [
      { id: "1", from: "them", text: "Study room is open if you need focus time", at: mins(2900) },
      { id: "2", from: "me", text: "Joining after lunch", at: mins(2880) },
    ],
  },
];

export const NOTICES: Notice[] = [
  { id: "n1", kind: "gift", title: "Riya sent you a Rose", body: "In Sunday chai adda", at: "2m", read: false },
  { id: "n2", kind: "room", title: "Dev started Movie night: dusk club", body: "214 people are watching together", at: "18m", read: false },
  { id: "n3", kind: "friend", title: "Anaya followed you", body: "Say hi in Chat", at: "1h", read: false },
  { id: "n4", kind: "system", title: "Daily tasks refreshed", body: "Claim up to 600 demo coins today", at: "6h", read: true },
];

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
