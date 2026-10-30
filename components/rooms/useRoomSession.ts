"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PEOPLE, ROOM_CHATTER, giftById, GIFTS_LIVE, GIFTS_SOON_TEXT } from "@/lib/app/data";
import { ME_ID, settingsOf, useApp } from "@/lib/app/store";
import { usePeople } from "@/lib/app/people";
import { relationshipById, tagLevel } from "@/lib/app/tags";
import { charmFromCoins, giftEarnings, voiceExpForMinute } from "@/lib/app/progress";
import { ownerPersonId } from "@/lib/app/server-rooms";
import { useLiveVoice } from "./useLiveVoice";
import type { GiftId, Room, RoomMessage, RoomRole, RoomSettings } from "@/lib/app/types";

/** VIP level needed to sit in a room: 0 for normal rooms, the owner's choice (default 1) for VIP rooms. */
export const vipSeatNeed = (room: Room) => (room.vip ? (settingsOf(room).vipSeatLevel ?? 1) : 0);

let n = 0;
const mid = () => `m${Date.now().toString(36)}${(n++).toString(36)}`;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export type FloatingReaction = { id: string; personId: string; emoji: string };
export type VideoState = { id: string; title: string } | null;
/** The room's mode is set by the owner: a voice room, YouTube Watch Together, or a Kharidari auction. */
export type RoomMode = "voice" | "youtube" | "kharidari";
/** Room-wide panels opened from the top bar or the info sheet. */
export type RoomPanel = null | "info" | "settings" | "online" | "members" | "contribution";
export const MODE_LABEL: Record<RoomMode, string> = { voice: "Normal", youtube: "YouTube", kharidari: "Kharidari" };

const HQ_TEXT = "This room applies high quality mode. The tone quality will be improved and more traffic will be consumed.";

const SETTING_MESSAGES: Partial<Record<keyof RoomSettings, [string, string]>> = {
  highQuality: [HQ_TEXT, "Owner turned off high quality mode"],
  banText: ["Owner turned off text chatting for members", "Owner turned text chatting back on"],
  noImages: ["Owner turned off images in chat", "Owner allowed images in chat"],
  banRedPacket: ["Owner turned off red packets", "Owner allowed red packets"],
  event: ["Owner started a room event 🎉", "Owner ended the room event"],
};

const modeFor = (room: Room): RoomMode => (room.type === "watch" ? "youtube" : room.type === "kharidari" ? "kharidari" : "voice");

/**
 * Local, simulated state for one room visit: seats, roles, moderation, mic/speaker,
 * chat, reactions and gifts. Other people's activity is generated on a timer so the
 * room feels alive; none of it is sent or received over a network.
 *
 * Seat 0 is always the owner's seat and never moves.
 */
export function useRoomSession(room: Room) {
  const { profile, vip, spend, playGift, toast, addRoomGift, addIntimacy, tagsOf, addCharm, trackReceived, addExp, roleIn, adminsOf, setRoomAdmin, updateMyRoom, membershipOf } = useApp();
  const person = usePeople();
  /** Backend rooms have real voice over LiveKit, and no simulated crowd. */
  const live = Boolean(room.server);
  const voice = useLiveVoice(room.server?.id ?? null);

  const [seats, setSeats] = useState<(string | null)[]>(() => {
    const others = room.seated.filter((id) => id !== room.hostId);
    return Array.from({ length: room.seats }, (_, i) => (i === 0 ? room.hostId : (others[i - 1] ?? null)));
  });
  const [mode, setModeState] = useState<RoomMode>(() => modeFor(room));
  const [closedSeats, setClosedSeats] = useState<number[]>([]);
  /** People an owner or admin muted. */
  const [forceMuted, setForceMuted] = useState<string[]>([]);
  /** People removed from the room this session. */
  const [kicked, setKicked] = useState<string[]>([]);
  const [muted, setMuted] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [speaking, setSpeaking] = useState<string[]>(() => (room.server ? [] : room.seated.filter((id) => id !== ME_ID).slice(0, 1)));
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [giftCounts, setGiftCounts] = useState<Record<string, number>>({});
  const [video, setVideoState] = useState<VideoState>(null);
  /** In-room UI: the profile card and the seat action menu. */
  const [cardId, setCardId] = useState<string | null>(null);
  const [seatMenu, setSeatMenu] = useState<number | null>(null);
  const [panel, setPanel] = useState<RoomPanel>(null);
  const [messages, setMessages] = useState<RoomMessage[]>(() => {
    const others = room.seated.filter((id) => id !== ME_ID);
    const list: RoomMessage[] = [
      { id: mid(), kind: "system", text: `Welcome to ${room.name}! Be kind, keep it respectful, and have fun.` },
      room.server
        ? { id: mid(), kind: "system", text: "Voice in this room is live. Chat, gifts and seats are still only on your device." }
        : { id: mid(), kind: "system", text: "Web preview: voice, YouTube and chat here are local demos and aren't sent to anyone." },
    ];
    if (room.server) {
      list.push({ id: mid(), kind: "join", authorId: ME_ID });
      return list;
    }
    if (room.hostId !== ME_ID) list.push({ id: mid(), kind: "system", text: "Owner enabled Owner's Intimacy Seat" });
    if (settingsOf(room).highQuality) list.push({ id: mid(), kind: "system", text: HQ_TEXT });
    if (others[1]) list.push({ id: mid(), kind: "text", authorId: others[1], text: pick(ROOM_CHATTER) });
    if (others[2]) list.push({ id: mid(), kind: "text", authorId: others[2], text: pick(ROOM_CHATTER) });
    list.push({ id: mid(), kind: "join", authorId: ME_ID });
    // Tag Lv 7 perk: the room announces you when your tag is already on mic
    for (const t of tagsOf(ME_ID)) {
      const partner = t.a === ME_ID ? t.b : t.a;
      const rel = relationshipById(t.relation);
      if (tagLevel(t.intimacy).level >= 7 && others.includes(partner))
        list.push({ id: mid(), kind: "system", text: `✨ ${PEOPLE.find((x) => x.id === partner)?.name}'s ${rel.one} ${profile.name} has arrived!` });
    }
    return list;
  });

  /** Kharidari listens to gifts: gifts to the person on the auction seat are bids. */
  const giftListener = useRef<((fromId: string, toId: string, value: number) => void) | null>(null);
  /** PK battles listen to gifts too, alongside the auction. */
  const pkListener = useRef<((fromId: string, toId: string, value: number) => void) | null>(null);
  const add = useCallback((m: RoomMessage) => setMessages((list) => [...list.slice(-80), m]), []);
  const addSystem = useCallback((text: string) => add({ id: mid(), kind: "system", text }), [add]);

  const role: RoomRole = roleIn(room);
  const isOwner = role === "owner";
  const canModerate = role === "owner" || role === "admin";
  /** "Owner" or "Admin", for system messages about your actions. */
  const actor = isOwner ? "Owner" : "Admin";
  const admins = adminsOf(room);

  const seatedIds = useMemo(() => seats.filter((s): s is string => Boolean(s)), [seats]);
  const mySeat = seats.indexOf(ME_ID);
  const seated = mySeat >= 0;
  const listenerIds = useMemo(
    () =>
      live
        ? []
        : PEOPLE.filter((p) => p.online && !seatedIds.includes(p.id) && !kicked.includes(p.id) && p.id !== room.hostId).slice(0, 5).map((p) => p.id),
    [live, seatedIds, kicked, room.hostId],
  );
  const onlineIds = useMemo(() => [...seatedIds, ...(seated ? [] : [ME_ID]), ...listenerIds], [seatedIds, seated, listenerIds]);

  /** Can you moderate this person? The owner can act on anyone; admins only on members and guests. */
  const canManage = useCallback(
    (id: string) => {
      if (id === ME_ID || !canModerate) return false;
      if (isOwner) return true;
      return id !== room.hostId && !admins.includes(id);
    },
    [canModerate, isOwner, room.hostId, admins],
  );

  // Rotate who is speaking among seated people
  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  const closedRef = useRef(closedSeats);
  closedRef.current = closedSeats;
  const mutedRef = useRef(forceMuted);
  mutedRef.current = forceMuted;
  const kickedRef = useRef(kicked);
  kickedRef.current = kicked;
  useEffect(() => {
    if (live) return;
    const t = window.setInterval(() => {
      const others = seatsRef.current.filter((s): s is string => s !== null && s !== ME_ID && !mutedRef.current.includes(s));
      const count = Math.min(others.length, 1 + Math.floor(Math.random() * 2));
      setSpeaking([...others].sort(() => Math.random() - 0.5).slice(0, count));
    }, 2600);
    return () => window.clearInterval(t);
  }, [live]);

  // Occasional chat from people in the room, and the odd newcomer taking a seat
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  useEffect(() => {
    if (live) return;
    let joins = 0;
    const t = window.setInterval(() => {
      const current = seatsRef.current;
      const others = current.filter((s): s is string => Boolean(s) && s !== ME_ID);
      if (Math.random() < 0.25 && joins < 2) {
        const empty = current.findIndex((x, i) => i > 1 && x === null && !closedRef.current.includes(i));
        const need = vipSeatNeed(roomRef.current);
        const newcomer = PEOPLE.find((p) => p.online && !current.includes(p.id) && !kickedRef.current.includes(p.id) && p.id !== room.hostId && (p.vip ?? 0) >= need);
        if (empty > 1 && newcomer && current.filter((s) => s === null).length > 1) {
          joins++;
          setSeats((s) => s.map((x, i) => (i === empty ? newcomer.id : x)));
          add({ id: mid(), kind: "join", authorId: newcomer.id });
          return;
        }
      }
      if (others.length) add({ id: mid(), kind: "text", authorId: pick(others), text: pick(ROOM_CHATTER) });
    }, 6500);
    return () => window.clearInterval(t);
  }, [live, add, room.hostId]);

  /* ---- Your seat ---- */

  const takeSeat = useCallback(
    (index: number) => {
      if (isOwner) {
        toast("Your owner seat is fixed at the top");
        return;
      }
      if (index === 0) {
        toast("This seat belongs to the room owner");
        return;
      }
      if (closedSeats.includes(index)) {
        toast("This seat is closed");
        return;
      }
      if (seats[index]) return;
      // VIP rooms: only VIP members (at the owner's chosen level) can sit
      const need = vipSeatNeed(room);
      if (need && vip.level < need) {
        toast(`Only VIP ${need}+ members can take a seat in this VIP room`, "error");
        return;
      }
      setSeats((s) => s.map((x, i) => (x === ME_ID ? null : i === index ? ME_ID : x)));
      setMuted(true);
      setHandRaised(false);
      toast(`You took seat ${index + 1}. Tap the mic to unmute.`);
    },
    [seats, toast, isOwner, closedSeats, room, vip.level],
  );

  const leaveSeat = useCallback(() => {
    if (isOwner) {
      toast("The owner's seat is fixed. Mute your mic instead.");
      return;
    }
    setSeats((s) => s.map((x) => (x === ME_ID ? null : x)));
    setMuted(true);
    // Live rooms: stop sending your voice too
    if (voice?.micOn) void voice.setMic(false);
    toast("You left the mic. You're still in the room, listening.");
  }, [toast, isOwner, voice]);

  const toggleMute = useCallback(() => {
    if (!seated) {
      toast("Take an empty seat to use the mic");
      return;
    }
    if (voice) {
      // The real microphone: asks for permission the first time
      if (voice.micBusy) return;
      void voice.setMic(!voice.micOn).then((ok) => {
        if (!ok) toast("Couldn't change your microphone. See the voice bar for details.", "error");
      });
      return;
    }
    setMuted((m) => !m);
  }, [seated, toast, voice]);

  const toggleHand = useCallback(() => {
    setHandRaised((h) => {
      toast(h ? "Hand lowered" : "Hand raised. The owner or an admin can invite you to a seat");
      return !h;
    });
  }, [toast]);

  /* ---- Owner and admin tools ---- */

  const setSeatClosed = useCallback(
    (index: number, closed: boolean) => {
      if (!canModerate || index === 0) return;
      setClosedSeats((c) => (closed ? [...new Set([...c, index])] : c.filter((x) => x !== index)));
      addSystem(`${actor} ${closed ? "closed" : "opened"} seat No.${index + 1}`);
    },
    [canModerate, actor, addSystem],
  );

  const removeFromMic = useCallback(
    (id: string) => {
      if (!canManage(id) || id === room.hostId) return;
      setSeats((s) => s.map((x) => (x === id ? null : x)));
      addSystem(`${actor} removed ${person(id).name} from the mic`);
    },
    [canManage, room.hostId, actor, addSystem, person],
  );

  const toggleForceMute = useCallback(
    (id: string) => {
      if (!canManage(id)) return;
      const on = !forceMuted.includes(id);
      setForceMuted((m) => (on ? [...m, id] : m.filter((x) => x !== id)));
      addSystem(`${actor} ${on ? "muted" : "unmuted"} ${person(id).name}`);
    },
    [canManage, forceMuted, actor, addSystem, person],
  );

  const inviteToSeat = useCallback(
    (id: string, index?: number) => {
      if (!canModerate) return;
      const target = index ?? seats.findIndex((x, i) => i > 0 && x === null && !closedSeats.includes(i));
      if (target <= 0 || seats[target]) {
        toast("No open seat. Open or free a seat first.");
        return;
      }
      const need = vipSeatNeed(room);
      if ((person(id).vip ?? 0) < need) {
        toast(`${person(id).name} isn't VIP ${need}+, so they can't sit in this VIP room`, "error");
        return;
      }
      setClosedSeats((c) => c.filter((x) => x !== target));
      setSeats((s) => s.map((x, i) => (x === id ? null : i === target ? id : x)));
      addSystem(`${actor} invited ${person(id).name} to seat No.${target + 1}`);
    },
    [canModerate, seats, closedSeats, toast, actor, addSystem, person, room],
  );

  const kick = useCallback(
    (id: string) => {
      if (!canManage(id)) return;
      setSeats((s) => s.map((x) => (x === id ? null : x)));
      setKicked((k) => [...k, id]);
      if (admins.includes(id)) setRoomAdmin(room, id, false);
      addSystem(`${actor} removed ${person(id).name} from the room`);
      toast(`${person(id).name} was removed from the room`);
      setCardId(null);
    },
    [canManage, admins, setRoomAdmin, room, actor, addSystem, person, toast],
  );

  const setAdmin = useCallback(
    (id: string, on: boolean) => {
      if (!isOwner || id === ME_ID) return;
      if (on) {
        const m = membershipOf(room, id);
        if (!m.joined || !m.followed) {
          toast(`${person(id).name} has to join and follow the room before becoming an admin`, "error");
          return;
        }
      }
      setRoomAdmin(room, id, on);
      addSystem(on ? `Owner made ${person(id).name} an admin` : `Owner removed ${person(id).name} as admin`);
    },
    [isOwner, setRoomAdmin, room, addSystem, person, membershipOf, toast],
  );

  const setMode = useCallback(
    (m: RoomMode) => {
      if (!canModerate) {
        toast("Only the owner or an admin can change the mode");
        return;
      }
      if (m === mode) return;
      setModeState(m);
      addSystem(`${actor} changed the mode to ${MODE_LABEL[m]}`);
    },
    [canModerate, mode, toast, addSystem, actor],
  );

  /* ---- Owner settings ---- */

  const settings = settingsOf(room);
  /** Members can't type when the owner bans text chat; the owner and admins still can. */
  const chatBlocked = settings.banText && !canModerate;

  const updateRoom = useCallback(
    (patch: Partial<Room>, message?: string) => {
      if (!canModerate) {
        toast("Only the owner or an admin can change settings");
        return;
      }
      updateMyRoom(room.id, patch);
      // Messages are written as "Owner …"; say "Admin …" when an admin made the change
      if (message) addSystem(message.replace(/^Owner /, `${actor} `));
    },
    [canModerate, toast, updateMyRoom, room.id, addSystem, actor],
  );

  const updateSettings = useCallback(
    (patch: Partial<RoomSettings>) => {
      const next = { ...settings, ...patch };
      const key = Object.keys(patch)[0] as keyof RoomSettings;
      const msgs = SETTING_MESSAGES[key];
      const msg = msgs ? (patch[key] ? msgs[0] : msgs[1]) : key === "background" ? "Owner changed the background" : key === "partnerSeat" ? "Owner changed the partner seats" : undefined;
      updateRoom({ settings: next }, msg);
    },
    [settings, updateRoom],
  );

  /* ---- Chat, reactions, gifts, video ---- */

  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      if (chatBlocked) {
        toast("The owner turned off text chatting in this room");
        return;
      }
      add({ id: mid(), kind: "text", authorId: ME_ID, text: t });
    },
    [add, chatBlocked, toast],
  );

  const react = useCallback((emoji: string) => {
    const r = { id: mid(), personId: ME_ID, emoji };
    setReactions((list) => [...list, r]);
    window.setTimeout(() => setReactions((list) => list.filter((x) => x.id !== r.id)), 1800);
  }, []);

  /** Send a gift; package gifts (free) come out of your Bag instead of your coins. */
  const sendGift = useCallback(
    (giftId: GiftId, toId: string, count: number, free = false) => {
      if (!GIFTS_LIVE) {
        toast(GIFTS_SOON_TEXT);
        return false;
      }
      const gift = giftById(giftId);
      if (!free && !spend(gift.cost * count)) {
        toast("Not enough demo coins. Tap your coin balance to add more.", "error");
        return false;
      }
      add({ id: mid(), kind: "gift", fromId: ME_ID, toId, giftId, count, charm: Math.floor(charmFromCoins(gift.cost * count)), earned: giftEarnings(gift.cost * count) });
      addRoomGift(room, gift.cost * count);
      // Gifts to someone you're tagged with raise your tag's intimacy
      addIntimacy(ME_ID, toId, gift.cost * count);
      // The receiver earns charm: 1 point per 5 coins
      addCharm(toId, gift.cost * count);
      trackReceived(toId, giftId, count);
      setGiftCounts((g) => ({ ...g, [toId]: (g[toId] ?? 0) + gift.cost * count }));
      playGift({ giftId, fromName: profile.name, toName: person(toId).name, count });
      giftListener.current?.(ME_ID, toId, gift.cost * count);
      pkListener.current?.(ME_ID, toId, gift.cost * count);
      return true;
    },
    [spend, toast, add, playGift, profile.name, person, addRoomGift, addIntimacy, addCharm, trackReceived, room],
  );

  /** A simulated gift from someone else in the room (no coins of yours are used). */
  const simGift = useCallback(
    (fromId: string, giftId: GiftId, toId: string, count: number) => {
      const value = giftById(giftId).cost * count;
      add({ id: mid(), kind: "gift", fromId, toId, giftId, count, charm: Math.floor(charmFromCoins(value)), earned: giftEarnings(value) });
      addIntimacy(fromId, toId, value);
      addCharm(toId, value);
      trackReceived(toId, giftId, count);
      setGiftCounts((g) => ({ ...g, [toId]: (g[toId] ?? 0) + value }));
      giftListener.current?.(fromId, toId, value);
      pkListener.current?.(fromId, toId, value);
      if (toId === ME_ID) toast(`${person(fromId).name} sent you ${giftById(giftId).name}${count > 1 ? ` ×${count}` : ""} · +${Math.floor(charmFromCoins(value))} charm · +${giftEarnings(value).toLocaleString("en-IN")} coins`, "gold");
    },
    [add, addIntimacy, addCharm, trackReceived, toast, person],
  );

  /* ---- Active Level: EXP for time in the room, decaying the longer you stay ---- */
  const seatedRef = useRef(seated);
  seatedRef.current = seated;
  const micMutedRef = useRef(muted);
  micMutedRef.current = muted;
  const carry = useRef(0);
  useEffect(() => {
    let minute = 0;
    const t = window.setInterval(() => {
      const xp = voiceExpForMinute(minute, seatedRef.current && !micMutedRef.current);
      minute += 1;
      // Fractions build up until they make a whole point
      carry.current += xp;
      const whole = Math.floor(carry.current);
      if (whole > 0) {
        carry.current -= whole;
        addExp(whole, "voice");
      }
    }, 60_000);
    return () => window.clearInterval(t);
  }, [addExp]);

  // The demo crowd used to send small gifts (roses, hearts, bears). Those gifts
  // are gone and the only gift left costs 132,900 coins, so they don't send any.

  const setVideo = useCallback(
    (v: VideoState) => {
      setVideoState(v);
      if (v) add({ id: mid(), kind: "video", authorId: ME_ID, title: v.title });
      else add({ id: mid(), kind: "system", text: `${profile.name} removed the video.` });
    },
    [add, profile.name],
  );

  // Live rooms: speaking comes from LiveKit's active speakers. You are "me"; the owner's seat lights up when the owner speaks.
  const liveSpeaking = useMemo(() => {
    if (!voice) return null;
    const ownerId = room.server?.ownerId;
    return voice.people.filter((p) => p.speaking).map((p) => (p.isLocal ? ME_ID : ownerId && p.identity === ownerId ? ownerPersonId(ownerId) : p.identity));
  }, [voice, room.server?.ownerId]);
  const mySpeaking = seated && !muted;
  const speakingIds = liveSpeaking ?? (mySpeaking ? [...speaking, ME_ID] : speaking);
  // Live rooms: the mic state shown is the SDK's
  const micMuted = voice ? !voice.micOn : muted;

  /** Put someone on (or take them off) a seat without a system message. Used by Kharidari. */
  const vacate = useCallback((id: string) => setSeats((s) => s.map((x) => (x === id ? null : x))), []);

  return {
    room,
    role,
    isOwner,
    canModerate,
    actor,
    canManage,
    admins,
    mode,
    setMode,
    seats,
    seatedIds,
    seated,
    mySeat,
    takeSeat,
    leaveSeat,
    closedSeats,
    setSeatClosed,
    forceMuted,
    toggleForceMute,
    removeFromMic,
    inviteToSeat,
    kick,
    kicked,
    setAdmin,
    listenerIds,
    onlineIds,
    muted: micMuted,
    toggleMute,
    speakerOn,
    toggleSpeaker: () =>
      setSpeakerOn((s) => {
        voice?.setSpeaker(!s);
        return !s;
      }),
    voice,
    handRaised,
    toggleHand,
    speakingIds,
    messages,
    send,
    reactions,
    react,
    giftCounts,
    sendGift,
    simGift,
    giftListener,
    pkListener,
    video,
    setVideo,
    addSystem,
    vacate,
    cardId,
    openCard: setCardId,
    seatMenu,
    setSeatMenu,
    panel,
    setPanel,
    settings,
    chatBlocked,
    updateRoom,
    updateSettings,
  };
}

export type RoomSession = ReturnType<typeof useRoomSession>;
