/**
 * Types for the Panchayat web app.
 * Everything is local demo data: no API, no accounts, no payments.
 */
import type { AvatarLook } from "@/components/mock/Avatar";

/** Built-in frames were removed; the only avatar frames now are the animated VIP ones (lib/app/effects.ts). */
export type Frame = "none";

export type NameFont = "default" | "pacifico" | "dancing" | "cinzel" | "yatra" | "righteous";

export type Person = {
  id: string;
  /** Public numeric user ID people can search for. */
  uid: string;
  name: string;
  /** Uploaded profile picture (data URL). Falls back to the illustrated avatar. */
  photo?: string;
  /** Profile banner (https URL from the backend). Falls back to an illustration. */
  banner?: string;
  handle: string;
  look: AvatarLook;
  frame: Frame;
  level: number;
  vip?: number;
  /** Shown as a ♂/♀ icon next to the level when known (from sign-up). */
  gender?: Gender;
  /** Personal font for the name. */
  nameFont?: NameFont;
  bio: string;
  online: boolean;
  city: string;
  followers: number;
  tags: string[];
};

/**
 * "watch" is the YouTube Watch Together room (there are no video-call rooms).
 * "kharidari" is the auction room: people bid gifts for a tag (relationship) with whoever sits on the auction seat.
 */
export type RoomType = "voice" | "watch" | "kharidari";

/** What you are in a room. The owner is the main authority; admins are appointed by the owner. */
export type RoomRole = "owner" | "admin" | "member" | "guest";

export type CoverTheme = "dusk" | "rose" | "gold" | "night" | "monsoon" | "ember";
export type CoverMotif = "banyan" | "temple" | "huts" | "river" | "kites" | "lanterns";
export type Cover = { theme: CoverTheme; motif: CoverMotif };

export type RoomBackground = "cover" | "brief" | "velvet" | "starry" | "darbar" | "sheesh-mahal" | "aurora";

/** Settings the owner controls from the room Settings screen. */
export type RoomSettings = {
  background: RoomBackground;
  /** Heartbeat links between paired seats: every pair, only the owner's pair, or none. */
  partnerSeat: "all" | "owner" | "off";
  highQuality: boolean;
  banText: boolean;
  noImages: boolean;
  banRedPacket: boolean;
  event: boolean;
  /** VIP rooms: the VIP level needed to take a seat (default VIP 1). */
  vipSeatLevel?: number;
  /** Personal font for the room name. */
  nameFont?: NameFont;
};

export type Room = {
  id: string;
  /** Short numeric room ID shown in the room header. */
  code: string;
  name: string;
  topic: string;
  hostId: string;
  type: RoomType;
  category: string;
  cover: Cover;
  members: number;
  seats: number;
  vip: boolean;
  live: boolean;
  isPrivate: boolean;
  /** Permanent rooms stay and level up from gifts. Temporary rooms close when the creator leaves. */
  permanent: boolean;
  /** Room level points earned before this session (sample data). */
  basePoints: number;
  /** People seated when the room opens (host first). */
  seated: string[];
  /** Admins appointed by the owner. Defaults to the first seated person after the owner. */
  admins?: string[];
  /** Pinned announcement shown at the top of the room chat. */
  announcement?: string;
  /** Room fans (followers), sample count. */
  fans?: number;
  /** Uploaded cover picture (data URL). Falls back to the illustrated cover. */
  coverImage?: string;
  /** 4-digit room password. Everyone except the owner must enter it. */
  password?: string;
  settings?: Partial<RoomSettings>;
  createdByMe?: boolean;
  /** Pre-loaded video for Watch Together rooms. */
  videoId?: string;
  /**
   * Set for rooms that live on the backend (/api/v1/voice-rooms). These have
   * real voice over LiveKit; everything else in a room is still local.
   */
  server?: ServerRoomInfo;
};

export type ServerRoomInfo = {
  /** The backend's room id. */
  id: string;
  ownerId?: string;
  /** True when the signed-in user owns the room (from ownerId). */
  mine: boolean;
  status?: string;
  description?: string;
  maxParticipants?: number;
};

export type GameId = "chess" | "ludo" | "micgrab" | "carrom" | "pool" | "draw" | "antakshari" | "cards";

export type Game = {
  id: GameId;
  name: string;
  players: string;
  online: number;
  tag?: "NEW" | "HOT";
  blurb: string;
};

export type GiftCategory = "Popular" | "Cute" | "Romantic" | "Celebration" | "Royal" | "Legendary";

export type GiftId =
  | "love-fireworks"
  | "city-fireworks"
  | "savanna-king"
  | "star-prince"
  | "neon-racer"
  | "rose"
  | "heart"
  | "bear"
  | "crown"
  | "rocket"
  | "car"
  | "dragon"
  | "fireworks"
  | "packet"
  | "royal-entry"
  | "princess-flower"
  | "cupid-heart"
  | "god-of-wealth"
  | "sunset-romance"
  | "crystal-palace"
  | "hamper"
  | "storm-guardian";

/** A set of wearable effects (frame, chat bubble, entry, profile page effect) that sending a gift unlocks. */
export type GiftSetId = "storm-guardian";

export type Gift = {
  id: GiftId;
  name: string;
  cost: number;
  categories: GiftCategory[];
  tier: "ordinary" | "legendary";
  /** Only comes in packages (rewards in your Bag), never sold in the gift store. */
  packageOnly?: boolean;
  /** One line shown on the gift card in room chat. */
  blurb?: string;
  /** Full-screen video animation played when the gift is sent. */
  /**
   * framed: plays as a smaller centred window with feathered edges instead of full screen.
   * floating: plays full width at its own shape with soft top and bottom edges, straight over the room (no dark backdrop).
   * ratio: the video's width / height for floating gifts, like "510 / 798".
   */
  video?: { src: string; poster: string; icon: string; framed?: boolean; floating?: boolean; ratio?: string };
  /**
   * Full-screen SVGA animation played when the gift is sent, drawn to cover the
   * screen (the file is phone-shaped). `sound` is the animation's audio, kept as
   * a separate file because the svga web player can't play sound.
   */
  svga?: { src: string; sound?: string; icon: string; still?: string };
  /** Effects the sender unlocks by sending this gift. */
  reward?: GiftSetId;
};

export type RoomMessage =
  | { id: string; kind: "system"; text: string }
  | { id: string; kind: "text"; authorId: string; text: string }
  | { id: string; kind: "gift"; fromId: string; toId: string; giftId: GiftId; count: number; charm?: number; earned?: number }
  | { id: string; kind: "video"; authorId: string; title: string }
  | { id: string; kind: "join"; authorId: string };

export type DirectMessage = { id: string; from: "me" | "them"; text: string; at: number };

export type Conversation = {
  id: string;
  personId: string;
  messages: DirectMessage[];
  unread: number;
};

export type Notice = { id: string; title: string; body: string; at: string; read: boolean; kind: "gift" | "room" | "friend" | "system" };

export type Gender = "male" | "female";

export type Profile = {
  name: string;
  handle: string;
  userId: string;
  bio: string;
  look: AvatarLook;
  /** Uploaded profile picture and banner, stored as small JPEG data URLs on this device. */
  photo?: string;
  banner?: string;
  frame: Frame;
  nameFont?: NameFont;
  level: number;
  xp: number;
  xpNext: number;
  favoriteGames: GameId[];
  /** From sign-up. Demo only: the email isn't verified or sent anywhere. */
  email?: string;
  gender?: Gender;
  /** Date of birth, "YYYY-MM-DD". */
  dob?: string;
  following: string[];
};
