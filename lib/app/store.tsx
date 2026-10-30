"use client";

/**
 * App-wide state for the Panchayat web app.
 *
 * Plain React context + reducer-style setters. Only harmless demo values are
 * saved to localStorage (profile edits, demo coins, rooms you created, claimed
 * tasks). The sign-in session (who you are and whether the profile is done) is
 * kept here too; the backend JWT itself lives in lib/auth/token.ts.
 */
import { signOutLocally, type AuthUser } from "@/lib/auth/auth";
import { setUnauthorizedHandler } from "@/lib/api/client";
import { msUntilExpiry, readToken } from "@/lib/auth/token";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CONVERSATIONS, INITIAL_COINS, INITIAL_PROFILE, NOTICES, PEOPLE, ROOMS } from "./data";
import { GOLD_NAME_VIP, POINTS_PER_COIN, VIP_THRESHOLDS, roomLevel, vipLevel } from "./levels";
import { EXP_SOURCES, FRIEND_EXP, TASK_EXP, charmFromCoins, charmInfo, giftEarnings, dayKey, expToNext, sampleCharm, type ExpSource } from "./progress";
import { GUARD_PER_DAY, MY_SAMPLE_RECEIVED, sampleGuardians, sampleReceived } from "./social";
import { SAMPLE_TAGS, TAG_SLOTS, pairKey, relationshipById, tagLevel, tokenFor, type RelationshipId, type Tag } from "./tags";
import type { RedPacketId } from "./redpacket";
import type { Conversation, Cover, GameId, GiftId, Notice, Profile, Room, RoomRole, RoomSettings, RoomType } from "./types";

export type Tab = "home" | "rooms" | "chat" | "discover" | "profile";

/** Where a link into the Shop wants to land: "packets", or a category whose name mentions rings or bubbles. */
export type ShopTab = "bubbles" | "rings" | "packets";

export type Screen =
  | { kind: "vip-entry"; roomId: string }
  | { kind: "vip-benefits" }
  | { kind: "create-room" }
  | { kind: "conversation"; personId: string }
  | { kind: "intimate-space"; personId: string }
  | { kind: "user-profile"; personId: string }
  | { kind: "guard"; personId: string }
  | { kind: "user-rooms"; personId: string }
  | { kind: "gift-wall"; personId: string }
  | { kind: "stats"; personId: string }
  | { kind: "ranking" }
  /** pay: open checkout for this red packet straight away. */
  | { kind: "shop"; tab?: ShopTab; pay?: RedPacketId }
  | { kind: "bag" }
  | { kind: "love-home"; personId: string }
  | { kind: "visitors" }
  | { kind: "parivar-list" }
  | { kind: "parivar-create" }
  | { kind: "parivar"; id: string };

export type Sheet =
  | { kind: "person"; personId: string }
  | { kind: "notifications" }
  | { kind: "tasks" }
  | { kind: "friends" }
  | { kind: "coins" }
  | { kind: "game"; gameId: GameId }
  | { kind: "edit-profile" }
  | { kind: "find-user" }
  | { kind: "join-room" }
  | { kind: "room-password"; roomId: string }
  | null;

export type Toast = { id: number; text: string; tone: "default" | "gold" | "error" };

export type GiftFx = { id: number; giftId: GiftId; fromName: string; toName: string; count: number };

export type NewRoom = {
  name: string;
  type: RoomType;
  cover: Cover;
  isPrivate: boolean;
  seats: number;
  category: string;
  permanent: boolean;
};

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  background: "cover",
  partnerSeat: "all",
  highQuality: true,
  banText: false,
  noImages: false,
  banRedPacket: false,
  event: false,
};
export const settingsOf = (room: Room): RoomSettings => ({ ...DEFAULT_ROOM_SETTINGS, ...room.settings });

/** Price of a permanent room in demo coins. Temporary rooms are free. */
export const PERMANENT_ROOM_COST = 1000;

const STORAGE_KEY = "panchayat-demo-v2";
/** v3: sessions from the real backend. Older mock sessions have no token and are dropped. */
const SESSION_KEY = "panchayat-session-v3";

type Saved = {
  profile: Profile;
  coins: number;
  myRooms: Room[];
  claimed: string[];
  giftsSent: number;
  vipPoints: number;
  /** Which VIP reset the saved vipPoints come from (see VIP_RESET). */
  vipReset?: number;
  /** When the VIP subscription ends (ms), or 0 when you're not subscribed. */
  vipUntil?: number;
  /** Room points earned from gifts on this device, per room. */
  roomPoints: Record<string, number>;
  /** Coins you gifted per room (for the Contribution board). */
  myContrib: Record<string, number>;
  roomMeta: RoomMeta;
  tags: Tag[];
  charm: Record<string, number>;
  exp: ExpLog;
  received: Record<string, Partial<Record<GiftId, number>>>;
  guards: Record<string, Record<string, number>>;
  lastProtect: Record<string, string>;
};

/** EXP earned per source: today (for daily caps) and in total. */
type ExpLog = { day: string; today: Partial<Record<ExpSource, number>>; total: Partial<Record<ExpSource, number>> };
const EMPTY_EXP: ExpLog = { day: "", today: {}, total: {} };
/** Charm you'd already received before this demo (Star 2). */
const MY_BASE_CHARM = 0;
/**
 * Everyone starts as a non-VIP and buys VIP 1 from VIP Benefits. Bump this to
 * reset VIP on devices that saved a higher level (the test account was VIP 10).
 */
const VIP_RESET = 1;
/** VIP is a subscription: each purchase lasts this many days. */
export const VIP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Your relationship with rooms, plus changes owners made on this device. */
type RoomMeta = {
  /** Admin lists edited by the owner, per room. */
  admins: Record<string, string[]>;
  announcements: Record<string, string>;
  /** Rooms you joined as a member. */
  joined: string[];
  /** Rooms you follow (you're a fan). */
  followed: string[];
  /** Changes admins made to sample rooms (title, cover, settings, password). */
  overrides: Record<string, Partial<Room>>;
};
// You start as an admin of "Sunday chai adda", so you've joined and followed it
const EMPTY_META: RoomMeta = { admins: {}, announcements: {}, joined: ["r-chai"], followed: ["r-chai"], overrides: {} };

/** Stable 0–1 number from a string, used for sample people's room membership. */
function hash01(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

function load(): Partial<Saved> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Saved>) : {};
  } catch {
    return {};
  }
}

const CANNED_REPLIES = ["Haha, sure! 😄", "See you in the room 🎉", "Sounds good 👍", "Arre wah! Let's do it", "Give me 5 minutes ☕", "😂😂"];

let seq = 1;
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

function useAppState() {
  const [tab, setTabState] = useState<Tab>("home");
  const [stack, setStack] = useState<Screen[]>([]);
  const [sheet, setSheetState] = useState<Sheet>(null);
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [coins, setCoins] = useState(INITIAL_COINS);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS);
  const [typing, setTyping] = useState<string | null>(null);
  const [notices, setNotices] = useState<Notice[]>(NOTICES);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [giftsSent, setGiftsSent] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [giftFx, setGiftFx] = useState<GiftFx | null>(null);
  const [vipPoints, setVipPoints] = useState(0);
  const [vipUntil, setVipUntil] = useState(0);
  const [roomPoints, setRoomPoints] = useState<Record<string, number>>({});
  const [myContrib, setMyContrib] = useState<Record<string, number>>({});
  const [roomMeta, setRoomMeta] = useState<RoomMeta>(EMPTY_META);
  const [tags, setTags] = useState<Tag[]>(SAMPLE_TAGS);
  /** Charm points received on this device, per person (on top of their sample charm). */
  const [charm, setCharm] = useState<Record<string, number>>({});
  const [exp, setExp] = useState<ExpLog>(EMPTY_EXP);
  /** Gifts received on this device, per person and gift. */
  const [received, setReceived] = useState<Record<string, Partial<Record<GiftId, number>>>>({});
  /** Guard value added on this device: target → guardian → value. */
  const [guards, setGuards] = useState<Record<string, Record<string, number>>>({});
  /** The day you last protected each person. */
  const [lastProtect, setLastProtect] = useState<Record<string, string>>({});
  /** The room you're in. It keeps running while minimised. */
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);
  /** True once saved data has been read. State, not a ref, so React running effects twice in development can't save the defaults over your data first. */
  const [hydrated, setHydrated] = useState(false);
  /**
   * The signed-in session: how you signed in, with which email, and whether the
   * backend says the profile is complete. undefined until we've read it, so the
   * login page doesn't flash. It only counts while a valid backend JWT is stored.
   */
  const [session, setSession] = useState<AuthUser | null | undefined>(undefined);
  /** Bumped by Reset demo data so other stores (shop, bag, couples) can reset too. */
  const [resetCount, setResetCount] = useState(0);
  /** Called for every gift between two people (couple love listens here). */
  const giftHook = useRef<((from: string, to: string, coins: number) => void) | null>(null);
  /** Parivar listens to gifts too (the sender's Parivar earns EXP). */
  const parivarHook = useRef<((from: string, coins: number) => void) | null>(null);

  // Restore demo data saved on this device
  useEffect(() => {
    const s = load();
    if (s.profile) {
      const saved = s.profile;
      // Everyone starts at Lv.1 (older saves started at 0)
      setProfile({ ...INITIAL_PROFILE, ...saved, ...(saved.level < 1 ? { level: 1, xpNext: expToNext(1) } : {}) });
    }
    if (typeof s.coins === "number") setCoins(s.coins);
    if (Array.isArray(s.myRooms)) setMyRooms(s.myRooms);
    if (Array.isArray(s.claimed)) setClaimed(s.claimed);
    if (typeof s.giftsSent === "number") setGiftsSent(s.giftsSent);
    if (typeof s.vipPoints === "number" && s.vipReset === VIP_RESET) {
      setVipPoints(s.vipPoints);
      // Saves from before subscriptions: a VIP keeps it for a fresh VIP_DAYS
      setVipUntil(typeof s.vipUntil === "number" ? s.vipUntil : s.vipPoints > 0 ? Date.now() + VIP_DAYS * DAY_MS : 0);
    }
    if (s.roomPoints) setRoomPoints(s.roomPoints);
    if (s.myContrib) setMyContrib(s.myContrib);
    if (s.roomMeta) setRoomMeta({ ...EMPTY_META, ...s.roomMeta });
    if (Array.isArray(s.tags)) setTags(s.tags);
    if (s.charm) setCharm(s.charm);
    if (s.exp) setExp({ ...EMPTY_EXP, ...s.exp });
    if (s.received) setReceived(s.received);
    if (s.guards) setGuards(s.guards);
    if (s.lastProtect) setLastProtect(s.lastProtect);
    try {
      const raw = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null") as AuthUser | null;
      const ok = raw && typeof raw.email === "string" && ["google", "apple", "email"].includes(raw.method) && readToken();
      if (ok) setSession({ ...raw, profileCompleted: raw.profileCompleted === true });
      else {
        setSession(null);
        window.localStorage.removeItem(SESSION_KEY);
        signOutLocally();
      }
    } catch {
      setSession(null);
    }
    setHydrated(true);
  }, []);

  /** Called by the login screens once the backend accepted Google or the email code (the JWT is already stored). */
  const signIn = useCallback((user: AuthUser) => {
    setSession(user);
    // A different account on this device starts clean: no gender, birthday or pictures from the last one
    setProfile((p) => (p.email === user.email ? p : { ...p, email: user.email, ...(user.name ? { name: user.name.slice(0, 24) } : {}), gender: undefined, dob: undefined, photo: undefined, banner: undefined }));
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      /* storage unavailable: signed in for this visit only */
    }
  }, []);
  /** The last sign-up step, after the backend saved name, gender and date of birth. */
  const completeProfile = useCallback((details: Required<Pick<Profile, "name" | "gender" | "dob">>) => {
    setProfile((p) => ({ ...p, ...details, name: details.name.trim() }));
    setSession((s) => {
      if (!s) return s;
      const next = { ...s, name: details.name.trim(), profileCompleted: true };
      try {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const signOut = useCallback(() => {
    setActiveRoomId(null);
    setRoomOpen(false);
    setSession(null);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    signOutLocally();
  }, []);
  /** Signed in, and the backend says the profile is done for this account. */
  const signedIn = session === undefined ? null : Boolean(session && session.profileCompleted);

  useEffect(() => {
    if (!hydrated) return;
    try {
      // Temporary rooms end with the session, so only permanent rooms are saved
      const data: Saved = { profile, coins, myRooms: myRooms.filter((r) => r.permanent), claimed, giftsSent, vipPoints, vipReset: VIP_RESET, vipUntil, roomPoints, myContrib, roomMeta, tags, charm, exp, received, guards, lastProtect };
      // The picture and banner live in IndexedDB per user (lib/app/local-images.ts), never in localStorage
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, profile: { ...profile, photo: undefined, banner: undefined } }));
    } catch {
      /* storage full or unavailable (private mode): the demo still works for this session */
    }
  }, [hydrated, profile, coins, myRooms, claimed, giftsSent, vipPoints, vipUntil, roomPoints, myContrib, roomMeta, tags, charm, exp, received, guards, lastProtect]);

  /**
   * VIP only counts while the subscription runs. When it ends, the level and
   * growth go back to 0, so the badge, frame, bubble, entry and name shine all
   * disappear (they all follow vip.level).
   */
  const vipActive = vipUntil > 0;
  const vip = useMemo(() => vipLevel(vipActive ? vipPoints : 0), [vipActive, vipPoints]);
  const roomPointsOf = useCallback((room: Room) => room.basePoints + (roomPoints[room.id] ?? 0), [roomPoints]);
  const roomLevelOf = useCallback((room: Room) => roomLevel(roomPointsOf(room)), [roomPointsOf]);

  // From VIP 6 your own rooms become VIP rooms
  /** Rooms from the backend (/api/v1/voice-rooms), set by ServerRoomsProvider. */
  const [serverRooms, setServerRooms] = useState<Room[]>([]);
  const withOverride = useCallback((r: Room) => (roomMeta.overrides[r.id] ? { ...r, ...roomMeta.overrides[r.id] } : r), [roomMeta.overrides]);
  const rooms = useMemo(
    () => [...serverRooms.map(withOverride), ...myRooms.map((r) => (vip.level >= GOLD_NAME_VIP ? { ...r, vip: true } : r)), ...ROOMS.map(withOverride)],
    [serverRooms, myRooms, withOverride, vip.level],
  );
  /** Rooms you own: backend rooms you created and the local ones. */
  const ownedRooms = useMemo(() => [...serverRooms.filter((r) => r.createdByMe).map(withOverride), ...myRooms], [serverRooms, myRooms, withOverride]);
  const roomById = useCallback((id: string) => rooms.find((r) => r.id === id), [rooms]);
  /** Owner edits to a room you created (title, cover, settings, password). */
  /** Owner or admin edits to a room: saved on the room if you created it, otherwise as an override. */
  const updateMyRoom = useCallback(
    (id: string, patch: Partial<Room>) => {
      if (myRooms.some((r) => r.id === id)) setMyRooms((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      else setRoomMeta((m) => ({ ...m, overrides: { ...m.overrides, [id]: { ...m.overrides[id], ...patch } } }));
    },
    [myRooms],
  );
  /** Password rooms you unlocked this session. */
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const unlockRoom = useCallback((id: string) => setUnlocked((u) => [...new Set([...u, id])]), []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "default") => {
    const id = seq++;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  // The backend rejected the JWT (401/403) or it expired: back to the sign-in screen, once
  const sessionRef = useRef(session);
  sessionRef.current = session;
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!sessionRef.current) return;
      signOut();
      toast("Your session ended. Please sign in again.");
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut, toast]);
  // No refresh token: sign out when the JWT runs out, even if nothing calls the API
  useEffect(() => {
    if (!session) return;
    const left = msUntilExpiry();
    if (left === null) return;
    const t = window.setTimeout(() => {
      signOut();
      toast("Your session ended. Please sign in again.");
    }, Math.max(0, Math.min(left, 2 ** 31 - 1)));
    return () => window.clearTimeout(t);
  }, [session, signOut, toast]);

  /* ---- Active Level: EXP with a daily cap per source ---- */
  const expRef = useRef(exp);
  expRef.current = exp;
  const addExp = useCallback(
    (amount: number, source: ExpSource) => {
      const today = dayKey();
      const log = expRef.current.day === today ? expRef.current : { ...expRef.current, day: today, today: {} };
      const used = log.today[source] ?? 0;
      const gained = Math.max(0, Math.min(amount, EXP_SOURCES[source].cap - used));
      if (gained <= 0) return 0;
      const next: ExpLog = { day: today, today: { ...log.today, [source]: used + gained }, total: { ...log.total, [source]: (log.total[source] ?? 0) + gained } };
      expRef.current = next;
      setExp(next);
      setProfile((p) => {
        let level = p.level;
        let xp = p.xp + gained;
        while (xp >= expToNext(level)) {
          xp -= expToNext(level);
          level += 1;
        }
        if (level > p.level) window.setTimeout(() => toast(`Level up! You're now Lv.${level}`, "gold"), 400);
        return { ...p, level, xp, xpNext: expToNext(level) };
      });
      return gained;
    },
    [toast],
  );
  const expToday = useCallback((source: ExpSource) => (exp.day === dayKey() ? (exp.today[source] ?? 0) : 0), [exp]);

  /* ---- Charm: received gifts only, coins ÷ 5 ---- */
  const charmOf = useCallback(
    (personId: string) => {
      const base = personId === "me" ? MY_BASE_CHARM : sampleCharm(PEOPLE.find((x) => x.id === personId) ?? { followers: 0 });
      return charmInfo(base + (charm[personId] ?? 0));
    },
    [charm],
  );
  const charmRef = useRef(charm);
  charmRef.current = charm;
  const addCharm = useCallback(
    (toId: string, coins: number) => {
      const pts = charmFromCoins(coins);
      if (toId === "me") {
        const before = charmInfo(MY_BASE_CHARM + (charmRef.current.me ?? 0)).tier?.name;
        const after = charmInfo(MY_BASE_CHARM + (charmRef.current.me ?? 0) + pts).tier;
        if (after && after.name !== before) window.setTimeout(() => toast(`Your charm reached ${after.name}!`, "gold"), 1200);
      }
      setCharm((c) => ({ ...c, [toId]: (c[toId] ?? 0) + pts }));
      // Every gift you receive also pays you back a share of its value in coins
      if (toId === "me") setCoins((c) => c + giftEarnings(coins));
    },
    [toast],
  );

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    setStack([]);
    setSheetState(null);
    setRoomOpen(false);
  }, []);

  const push = useCallback((s: Screen) => {
    setSheetState(null);
    setRoomOpen(false);
    setStack((st) => [...st, s]);
  }, []);
  /** Profiles open as a full page (WePlay style); your own is the Profile tab. */
  const setSheet = useCallback(
    (s: Sheet) => {
      if (s?.kind === "person") {
        if (s.personId === "me") {
          setTabState("profile");
          setStack([]);
          setSheetState(null);
          setRoomOpen(false);
        } else push({ kind: "user-profile", personId: s.personId });
        return;
      }
      setSheetState(s);
    },
    [push],
  );
  const openProfile = useCallback((personId: string) => setSheet({ kind: "person", personId }), [setSheet]);
  const pop = useCallback(() => setStack((st) => st.slice(0, -1)), []);
  const replaceTop = useCallback((s: Screen) => setStack((st) => [...st.slice(0, -1), s]), []);

  /** Enter a room. Any other room you were in is left first. */
  const enterRoom = useCallback(
    (roomId: string) => {
      setActiveRoomId((prev) => {
        if (prev && prev !== roomId) {
          // Leaving a temporary room you created closes it
          setMyRooms((list) => list.filter((r) => r.id !== prev || r.permanent));
        }
        return roomId;
      });
      setSheet(null);
      setStack((st) => st.filter((x) => x.kind !== "vip-entry"));
      setRoomOpen(true);
    },
    [],
  );

  const openRoom = useCallback(
    (roomId: string) => {
      const room = roomById(roomId);
      if (!room) return;
      if (roomId === activeRoomId) {
        setSheet(null);
        setRoomOpen(true);
        return;
      }
      const iAmAdmin = (roomMeta.admins[room.id] ?? room.admins ?? []).includes("me");
      if (room.password && room.hostId !== "me" && !iAmAdmin && !unlocked.includes(roomId)) setSheet({ kind: "room-password", roomId });
      else if (room.vip && vip.level < 1) push({ kind: "vip-entry", roomId });
      else enterRoom(roomId);
    },
    [roomById, push, enterRoom, activeRoomId, vip.level, unlocked, roomMeta.admins],
  );

  const minimizeRoom = useCallback(() => setRoomOpen(false), []);
  const expandRoom = useCallback(() => setRoomOpen(true), []);

  const leaveRoom = useCallback(() => {
    const room = activeRoomId ? roomById(activeRoomId) : undefined;
    setRoomOpen(false);
    setActiveRoomId(null);
    if (room?.createdByMe && !room.permanent && !room.server) {
      setMyRooms((list) => list.filter((r) => r.id !== room.id));
      toast("Temporary room closed");
    } else if (room && !room.server) toast(`You left ${room.name}`);
    // Backend rooms: ServerRoomsProvider tells the backend and shows the result
  }, [activeRoomId, roomById, toast]);

  const myPermanentRoom = ownedRooms.find((r) => r.permanent);

  /** Pay for a permanent room (local demo coins). False when you can't. */
  const payForPermanentRoom = useCallback((): boolean => {
    if (myPermanentRoom) {
      toast("You already own a permanent room", "error");
      return false;
    }
    if (coins < PERMANENT_ROOM_COST) {
      toast(`A permanent room costs ${PERMANENT_ROOM_COST.toLocaleString("en-IN")} coins`, "error");
      return false;
    }
    setCoins((c) => c - PERMANENT_ROOM_COST);
    if (vipActive) setVipPoints((p) => p + PERMANENT_ROOM_COST * POINTS_PER_COIN);
    return true;
  }, [myPermanentRoom, coins, toast, vipActive]);

  const createRoom = useCallback(
    (input: NewRoom): boolean => {
      if (input.permanent) {
        if (myPermanentRoom) {
          toast("You already own a permanent room", "error");
          return false;
        }
        if (coins < PERMANENT_ROOM_COST) {
          toast(`A permanent room costs ${PERMANENT_ROOM_COST.toLocaleString("en-IN")} coins`, "error");
          return false;
        }
        setCoins((c) => c - PERMANENT_ROOM_COST);
        if (vipActive) setVipPoints((p) => p + PERMANENT_ROOM_COST * POINTS_PER_COIN);
      }
      const id = `my-${uid()}`;
      const room: Room = {
        id,
        code: String(Math.floor(100000 + Math.random() * 899999)),
        name: input.name.trim(),
        topic: input.isPrivate ? "Private room · invite only" : "Just created · say hi!",
        hostId: "me",
        type: input.type,
        category: input.category,
        cover: input.cover,
        members: 1,
        seats: input.seats,
        vip: false,
        live: true,
        isPrivate: input.isPrivate,
        permanent: input.permanent,
        basePoints: 0,
        settings: { background: "brief" },
        seated: ["me"],
        createdByMe: true,
      };
      setMyRooms((r) => [room, ...r]);
      setStack((st) => st.filter((x) => x.kind !== "create-room"));
      enterRoom(id);
      toast(input.permanent ? `Permanent room created · −${PERMANENT_ROOM_COST} coins` : "Temporary room created");
      return true;
    },
    [toast, coins, myPermanentRoom, enterRoom, vipActive],
  );

  const deleteMyRoom = useCallback((id: string) => setMyRooms((r) => r.filter((x) => x.id !== id)), []);

  /** Spend demo coins. While you're VIP, every coin spent adds VIP growth points. */
  const spend = useCallback(
    (amount: number) => {
      if (amount > coins) return false;
      setCoins((c) => c - amount);
      if (!vipActive) return true;
      const before = vipLevel(vipPoints).level;
      const after = vipLevel(vipPoints + amount * POINTS_PER_COIN).level;
      setVipPoints((p) => p + amount * POINTS_PER_COIN);
      if (after > before) window.setTimeout(() => toast(`You reached VIP ${after}!`, "gold"), 2600);
      return true;
    },
    [coins, vipPoints, vipActive, toast],
  );

  /**
   * Buy VIP 1, or the next level while you're VIP: pay the coins that level
   * needs and the subscription runs for VIP_DAYS from now. Returns the new
   * level, or 0 if you don't have the coins.
   */
  const buyNextVip = useCallback(() => {
    const base = vipActive ? vipPoints : 0;
    const level = vipLevel(base).level + 1;
    const goal = VIP_THRESHOLDS[level - 1];
    if (goal === undefined) return 0;
    const cost = Math.ceil((goal - base) / POINTS_PER_COIN);
    if (cost > coins) return 0;
    setCoins((c) => c - cost);
    setVipPoints(base + cost * POINTS_PER_COIN);
    setVipUntil(Date.now() + VIP_DAYS * DAY_MS);
    return level;
  }, [vipActive, vipPoints, coins]);
  /** Demo only: end the subscription now, to see the VIP rewards removed. */
  const endVip = useCallback(() => setVipUntil(Date.now()), []);
  // When the subscription runs out, VIP ends and everything it gave goes away
  useEffect(() => {
    if (!vipUntil) return;
    const end = () => {
      setVipUntil(0);
      setVipPoints(0);
      toast("Your VIP subscription ended. The badge, frame, chat bubble and entry were removed.", "error");
    };
    const left = vipUntil - Date.now();
    if (left <= 0) return end();
    // setTimeout can't wait longer than ~24.8 days; after that the effect runs again on the next load
    const t = window.setTimeout(end, Math.min(left, 2 ** 31 - 1));
    return () => window.clearTimeout(t);
  }, [vipUntil, toast]);

  /** Coins gifted inside a room raise its level (permanent rooms) and your contribution. */
  const addRoomGift = useCallback(
    (room: Room, coinsGifted: number) => {
      setMyContrib((m) => ({ ...m, [room.id]: (m[room.id] ?? 0) + coinsGifted }));
      if (!room.permanent) return;
      const before = roomLevel(roomPointsOf(room)).level;
      const after = roomLevel(roomPointsOf(room) + coinsGifted * POINTS_PER_COIN).level;
      setRoomPoints((r) => ({ ...r, [room.id]: (r[room.id] ?? 0) + coinsGifted * POINTS_PER_COIN }));
      if (after > before) window.setTimeout(() => toast(`${room.name} reached room level ${after}!`, "gold"), 3000);
    },
    [roomPointsOf, toast],
  );
  const addCoins = useCallback((amount: number) => setCoins((c) => c + amount), []);

  const updateProfile = useCallback((patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })), []);

  const toggleFollow = useCallback(
    (personId: string) => {
      setProfile((p) => {
        const on = p.following.includes(personId);
        const name = PEOPLE.find((x) => x.id === personId)?.name ?? "them";
        toast(on ? `Unfollowed ${name}` : `Following ${name}`);
        // Adding a friend earns a little EXP (capped per day)
        if (!on) window.setTimeout(() => addExp(FRIEND_EXP, "friend"), 0);
        return { ...p, following: on ? p.following.filter((x) => x !== personId) : [...p.following, personId] };
      });
    },
    [toast, addExp],
  );

  const openConversation = useCallback(
    (personId: string) => {
      setConversations((cs) =>
        cs.some((c) => c.personId === personId)
          ? cs.map((c) => (c.personId === personId ? { ...c, unread: 0 } : c))
          : [{ id: `c-${personId}`, personId, messages: [], unread: 0 }, ...cs],
      );
      push({ kind: "conversation", personId });
    },
    [push],
  );

  const sendMessage = useCallback((personId: string, text: string) => {
    const msg = { id: uid(), from: "me" as const, text, at: Date.now() };
    setConversations((cs) => {
      const rest = cs.filter((c) => c.personId !== personId);
      const conv = cs.find((c) => c.personId === personId) ?? { id: `c-${personId}`, personId, messages: [], unread: 0 };
      return [{ ...conv, messages: [...conv.messages, msg] }, ...rest];
    });
    // Simulated reply so the demo feels alive. Nothing is sent anywhere.
    window.setTimeout(() => setTyping(personId), 700);
    window.setTimeout(() => {
      setTyping((t) => (t === personId ? null : t));
      const reply = { id: uid(), from: "them" as const, text: CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)], at: Date.now() };
      setConversations((cs) => cs.map((c) => (c.personId === personId ? { ...c, messages: [...c.messages, reply] } : c)));
    }, 2200);
  }, []);

  const markNoticesRead = useCallback(() => setNotices((n) => n.map((x) => ({ ...x, read: true }))), []);

  const claimTask = useCallback(
    (taskId: string, reward: number) => {
      if (claimed.includes(taskId)) return;
      setClaimed((c) => [...c, taskId]);
      setCoins((c) => c + reward);
      const xp = addExp(TASK_EXP, "task");
      toast(`+${reward} demo coins${xp ? ` · +${xp} EXP` : ""}`, "gold");
    },
    [claimed, toast, addExp],
  );

  const playGift = useCallback((fx: Omit<GiftFx, "id">) => {
    setGiftsSent((n) => n + fx.count);
    setGiftFx({ ...fx, id: seq++ });
  }, []);
  const clearGiftFx = useCallback(() => setGiftFx(null), []);

  const resetDemo = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setProfile(INITIAL_PROFILE);
    setCoins(INITIAL_COINS);
    setMyRooms([]);
    setClaimed([]);
    setGiftsSent(0);
    setVipPoints(0);
    setVipUntil(0);
    setRoomPoints({});
    setMyContrib({});
    setRoomMeta(EMPTY_META);
    setTags(SAMPLE_TAGS);
    setCharm({});
    setExp(EMPTY_EXP);
    setReceived({});
    setGuards({});
    setLastProtect({});
    setActiveRoomId(null);
    setRoomOpen(false);
    setConversations(CONVERSATIONS);
    setNotices(NOTICES);
    setResetCount((n) => n + 1);
    toast("Demo data reset");
  }, [toast]);

  /* ---- Room roles, membership and follows ---- */
  const adminsOf = useCallback(
    (room: Room) => roomMeta.admins[room.id] ?? room.admins ?? room.seated.filter((id) => id !== room.hostId).slice(0, 1),
    [roomMeta.admins],
  );
  const roleIn = useCallback(
    (room: Room, personId: string = "me"): RoomRole =>
      room.hostId === personId ? "owner" : adminsOf(room).includes(personId) ? "admin" : personId === "me" && !roomMeta.joined.includes(room.id) ? "guest" : "member",
    [adminsOf, roomMeta.joined],
  );
  const setRoomAdmin = useCallback(
    (room: Room, personId: string, on: boolean) => {
      const current = adminsOf(room);
      const next = on ? [...new Set([...current, personId])] : current.filter((id) => id !== personId);
      setRoomMeta((m) => ({ ...m, admins: { ...m.admins, [room.id]: next } }));
    },
    [adminsOf],
  );
  const isJoined = useCallback((roomId: string) => roomMeta.joined.includes(roomId), [roomMeta.joined]);
  const isFollowingRoom = useCallback((roomId: string) => roomMeta.followed.includes(roomId), [roomMeta.followed]);
  /** Admins must have joined and followed the room. Leaving either one removes your admin role. */
  const dropMyAdmin = useCallback(
    (room: Room) => {
      if (!adminsOf(room).includes("me")) return;
      setRoomMeta((m) => ({ ...m, admins: { ...m.admins, [room.id]: adminsOf(room).filter((x) => x !== "me") } }));
      toast("You're no longer an admin here. Admins must join and follow the room.");
    },
    [adminsOf, toast],
  );
  const toggleJoinRoom = useCallback(
    (room: Room) => {
      const on = !roomMeta.joined.includes(room.id);
      setRoomMeta((m) => ({ ...m, joined: on ? [...m.joined, room.id] : m.joined.filter((x) => x !== room.id) }));
      toast(on ? `You're now a member of ${room.name}` : `You left ${room.name} membership`);
      if (!on) dropMyAdmin(room);
    },
    [roomMeta.joined, toast, dropMyAdmin],
  );
  const toggleFollowRoom = useCallback(
    (room: Room) => {
      const on = !roomMeta.followed.includes(room.id);
      setRoomMeta((m) => ({ ...m, followed: on ? [...m.followed, room.id] : m.followed.filter((x) => x !== room.id) }));
      toast(on ? `Following ${room.name}` : `Unfollowed ${room.name}`);
      if (!on) dropMyAdmin(room);
    },
    [roomMeta.followed, toast, dropMyAdmin],
  );
  /** Has this person joined and followed the room? Sample people get a stable made-up answer. */
  const membershipOf = useCallback(
    (room: Room, personId: string) => {
      if (personId === "me") return { joined: roomMeta.joined.includes(room.id), followed: roomMeta.followed.includes(room.id) };
      if (personId === room.hostId || adminsOf(room).includes(personId)) return { joined: true, followed: true };
      return { joined: hash01(`${room.id}:join:${personId}`) < 0.7, followed: hash01(`${room.id}:fan:${personId}`) < 0.55 };
    },
    [roomMeta.joined, roomMeta.followed, adminsOf],
  );
  const announcementOf = useCallback((room: Room) => roomMeta.announcements[room.id] ?? room.announcement ?? "", [roomMeta.announcements]);
  const setAnnouncement = useCallback((room: Room, text: string) => setRoomMeta((m) => ({ ...m, announcements: { ...m.announcements, [room.id]: text } })), []);

  /* ---- Gift wall, wealth and guard ---- */
  const trackReceived = useCallback((toId: string, giftId: GiftId, count: number) => {
    setReceived((r) => ({ ...r, [toId]: { ...r[toId], [giftId]: (r[toId]?.[giftId] ?? 0) + count } }));
  }, []);
  const receivedOf = useCallback(
    (personId: string) => {
      const base = personId === "me" ? MY_SAMPLE_RECEIVED : sampleReceived(personId);
      const mine = received[personId] ?? {};
      const out: Partial<Record<GiftId, number>> = { ...base };
      (Object.keys(mine) as GiftId[]).forEach((k) => (out[k] = (out[k] ?? 0) + (mine[k] ?? 0)));
      return out;
    },
    [received],
  );
  const guardiansOf = useCallback(
    (personId: string) => {
      // A new account has no guardians until friends protect it
      const all: Record<string, number> = personId === "me" ? {} : { ...sampleGuardians(personId) };
      Object.entries(guards[personId] ?? {}).forEach(([g, v]) => (all[g] = (all[g] ?? 0) + v));
      return Object.entries(all)
        .map(([id, value]) => ({ id, value }))
        .sort((a, b) => b.value - a.value);
    },
    [guards],
  );
  const protectedToday = useCallback((personId: string) => lastProtect[personId] === dayKey(), [lastProtect]);
  /** Protect someone: +30 guard value, free, once per person per day. It never adds charm. */
  const protect = useCallback(
    (personId: string) => {
      if (personId === "me") return;
      if (lastProtect[personId] === dayKey()) {
        toast("You already protected them today. Come back tomorrow!");
        return;
      }
      setGuards((g) => ({ ...g, [personId]: { ...g[personId], me: (g[personId]?.me ?? 0) + GUARD_PER_DAY } }));
      setLastProtect((l) => ({ ...l, [personId]: dayKey() }));
      toast(`You protected ${PEOPLE.find((x) => x.id === personId)?.name ?? "them"} · +${GUARD_PER_DAY} guard`, "gold");
    },
    [lastProtect, toast],
  );

  /* ---- Tags and intimacy ---- */
  const tagsOf = useCallback((personId: string) => tags.filter((t) => t.a === personId || t.b === personId), [tags]);
  const tagBetween = useCallback((x: string, y: string) => tags.find((t) => pairKey(t.a, t.b) === pairKey(x, y)) ?? null, [tags]);
  const nameOf = (id: string) => (id === "me" ? "You" : PEOPLE.find((x) => x.id === id)?.name ?? "Someone");
  /** Gifts between a tagged pair add intimacy (1 point per coin). */
  const addIntimacy = useCallback(
    (x: string, y: string, amount: number) => {
      giftHook.current?.(x, y, amount);
      parivarHook.current?.(x, amount);
      const tag = tagBetween(x, y);
      if (!tag || amount <= 0) return;
      const before = tagLevel(tag.intimacy).level;
      const after = tagLevel(tag.intimacy + amount).level;
      setTags((list) => list.map((t) => (t.id === tag.id ? { ...t, intimacy: t.intimacy + amount } : t)));
      if (after > before && (x === "me" || y === "me")) window.setTimeout(() => toast(`Your ${relationshipById(tag.relation).label} tag with ${nameOf(x === "me" ? y : x)} reached Lv ${after}!`, "gold"), 2600);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tagBetween, toast],
  );
  /**
   * A BFF Kharidari win. The winner and the person on the auction seat become a tag.
   * If they're already tagged, nothing new is formed: the gifts already counted as intimacy.
   */
  const formTag = useCallback(
    (winner: string, item: string, relation: RelationshipId, giftVolume: number, roomName: string, declaration?: string): "new" | "existing" | "full" => {
      const existing = tagBetween(winner, item);
      if (existing) return "existing";
      if (tagsOf(winner).length >= TAG_SLOTS || tagsOf(item).length >= TAG_SLOTS) return "full";
      const tag: Tag = { id: `t-${uid()}`, a: winner, b: item, relation, token: tokenFor(giftVolume), intimacy: giftVolume, createdAt: Date.now(), roomName, declaration };
      setTags((list) => [tag, ...list]);
      return "new";
    },
    [tagBetween, tagsOf],
  );
  const breakTag = useCallback(
    (id: string) => {
      setTags((list) => list.filter((t) => t.id !== id));
      toast("Tag removed from your intimate space");
    },
    [toast],
  );
  const openIntimateSpace = useCallback((personId: string = "me") => push({ kind: "intimate-space", personId }), [push]);

  return {
    charmOf, addCharm, addExp, expToday, exp,
    openProfile, trackReceived, receivedOf, guardiansOf, protect, protectedToday,
    tags, tagsOf, tagBetween, addIntimacy, formTag, breakTag, openIntimateSpace,
    adminsOf, roleIn, setRoomAdmin, membershipOf, isJoined, isFollowingRoom, toggleJoinRoom, toggleFollowRoom, announcementOf, setAnnouncement,
    tab, setTab, stack, push, pop, replaceTop, sheet, setSheet,
    profile, updateProfile, toggleFollow,
    coins, spend, addCoins,
    rooms, myRooms: ownedRooms, serverRooms, setServerRooms, payForPermanentRoom, roomById, updateMyRoom, unlockRoom, openRoom, enterRoom, createRoom, deleteMyRoom, myPermanentRoom,
    activeRoomId, roomOpen, minimizeRoom, expandRoom, leaveRoom,
    vipPoints, vip, vipUntil, buyNextVip, endVip, roomPointsOf, roomLevelOf, addRoomGift, myContrib,
    conversations, openConversation, sendMessage, typing,
    notices, markNoticesRead,
    claimed, claimTask,
    giftsSent, giftFx, playGift, clearGiftFx,
    toasts, toast,
    resetDemo, resetCount, giftHook, parivarHook, session, signedIn, signIn, completeProfile, signOut,
  };
}

export type AppState = ReturnType<typeof useAppState>;

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

/** The signed-in demo user rendered as a Person, so it can sit in rooms. */
export const ME_ID = "me";
