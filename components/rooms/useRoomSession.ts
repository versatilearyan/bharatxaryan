"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PEOPLE, ROOM_CHATTER, giftById, GIFTS_LIVE, GIFTS_SOON_TEXT } from "@/lib/app/data";
import { ME_ID, settingsOf, useApp } from "@/lib/app/store";
import { usePeople } from "@/lib/app/people";
import { useMusic } from "@/lib/app/music-store";
import { relationshipById, tagLevel } from "@/lib/app/tags";
import { charmFromCoins, giftEarnings, voiceExpForMinute } from "@/lib/app/progress";
import { useServerRooms } from "@/lib/app/server-rooms";
import { muteParticipant, roomErrorText } from "@/lib/api/voice-rooms";
import { useRoomParticipants } from "./useRoomParticipants";
import { useLiveVoice } from "./useLiveVoice";
import { SERVER_CHAT_PREFIX, useServerRoomChat } from "./useRoomChat";
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
  const { profile, vip, spend, playGift, armCombo, clearCombo, toast, addRoomGift, addIntimacy, tagsOf, addCharm, trackReceived, addExp, roleIn, adminsOf, setRoomAdmin, updateMyRoom, membershipOf } = useApp();
  const person = usePeople();
  /** Backend rooms have real voice over LiveKit, and no simulated crowd. */
  const live = Boolean(room.server);
  const voice = useLiveVoice(room.server?.id ?? null);
  const { myId: myServerId } = useServerRooms();
  /** Backend rooms: who is in the room (participants API) merged with who is connected (LiveKit). */
  const participants = useRoomParticipants(room.server?.id ?? null, voice, myServerId);

  const [localSeats, setSeats] = useState<(string | null)[]>(() => {
    const others = room.seated.filter((id) => id !== room.hostId);
    return Array.from({ length: room.seats }, (_, i) => (i === 0 ? room.hostId : (others[i - 1] ?? null)));
  });
  /**
   * Backend rooms have no seat API, so the seats show the real people in the
   * room: the owner on seat 0 (only while they're in the room), then everyone
   * else in the order they joined. You are always shown.
   */
  const liveSeats = useMemo(() => {
    if (!participants) return null;
    const ids = participants.members.map((m) => m.personId);
    if (!ids.includes(ME_ID)) ids.push(ME_ID);
    const others = ids.filter((id) => id !== room.hostId);
    const length = Math.max(room.seats, others.length + 1);
    return Array.from({ length }, (_, i) => (i === 0 ? (ids.includes(room.hostId) ? room.hostId : null) : (others[i - 1] ?? null)));
  }, [participants, room.hostId, room.seats]);
  const seats = liveSeats ?? localSeats;
  const [mode, setModeState] = useState<RoomMode>(() => modeFor(room));
  const [closedSeats, setClosedSeats] = useState<number[]>([]);
  /** People an owner or admin muted. */
  const [forceMuted, setForceMuted] = useState<string[]>([]);
  /** Seats an owner or admin muted: whoever sits there can't talk. */
  const [mutedSeats, setMutedSeats] = useState<number[]>([]);
  /** Mic order: when on, people ask the owner or an admin before taking a seat. */
  // Demo: about half the sample rooms other people own start with mic order on
  const [micOrder, setMicOrderState] = useState(() => !room.server && room.hostId !== ME_ID && room.seated.length % 2 === 0);
  /** People waiting for the owner or an admin to let them on the mic, oldest first. */
  const [micRequests, setMicRequests] = useState<{ id: string; seat: number }[]>([]);
  /** The "Waiting" (mic queue) sheet is open. */
  const [queueOpen, setQueueOpen] = useState(false);
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
        ? { id: mid(), kind: "system", text: "Voice and chat in this room are live. Gifts and seats are still only on your device." }
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

  /** Backend rooms: text chat from the server (history over REST, live over STOMP) once your join has gone through. */
  const inRoom = Boolean(voice && (voice.status === "connected" || voice.status === "reconnecting"));
  const deliverServerChat = useCallback(
    (lines: RoomMessage[], history: boolean) =>
      setMessages((list) => {
        if (!history) return [...list, ...lines].slice(-120);
        // Earlier chat goes before any live lines already showing
        const at = list.findIndex((m) => m.id.startsWith(SERVER_CHAT_PREFIX));
        return at < 0 ? [...list, ...lines] : [...list.slice(0, at), ...lines, ...list.slice(at)];
      }),
    [],
  );
  const roomChat = useServerRoomChat(room.server?.id ?? null, inRoom, myServerId, deliverServerChat);
  useEffect(() => {
    if (roomChat.historyError) addSystem(roomChat.historyError);
  }, [roomChat.historyError, addSystem]);

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
  const listenersRef = useRef<string[]>([]);
  listenersRef.current = listenerIds;
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
  const mutedSeatsRef = useRef(mutedSeats);
  mutedSeatsRef.current = mutedSeats;
  const kickedRef = useRef(kicked);
  kickedRef.current = kicked;
  useEffect(() => {
    if (live) return;
    const t = window.setInterval(() => {
      const others = seatsRef.current.filter((s, i): s is string => s !== null && s !== ME_ID && !mutedRef.current.includes(s) && !mutedSeatsRef.current.includes(i));
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
      if (live) {
        toast("In a live room everyone has a seat. Tap the mic to talk.");
        return;
      }
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
      if (micOrder && !canModerate) {
        requestSeat(index);
        return;
      }
      setSeats((s) => s.map((x, i) => (x === ME_ID ? null : i === index ? ME_ID : x)));
      setMuted(true);
      setHandRaised(false);
      toast(`You took seat ${index + 1}. Tap the mic to unmute.`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seats, toast, isOwner, closedSeats, room, vip.level, live, micOrder, canModerate],
  );

  /* ---- Mic order: ask before taking a seat ---- */

  const requestsRef = useRef(micRequests);
  requestsRef.current = micRequests;
  /** First open, empty seat (not the owner's), or -1. */
  const freeSeat = useCallback(
    (prefer?: number) => {
      const ok = (i: number) => i > 0 && seatsRef.current[i] === null && !closedRef.current.includes(i);
      if (prefer !== undefined && ok(prefer)) return prefer;
      return seatsRef.current.findIndex((_, i) => ok(i));
    },
    [],
  );
  const requestSeat = useCallback(
    (index: number) => {
      if (requestsRef.current.some((r) => r.id === ME_ID)) {
        toast("Your mic request is waiting for the owner or an admin");
        return;
      }
      setMicRequests((q) => [...q, { id: ME_ID, seat: index }]);
      toast("Mic order is on. Your request went to the owner and admins.");
      // Demo: the owner answers after a moment (a real room would wait for them)
      window.setTimeout(() => {
        const req = requestsRef.current.find((r) => r.id === ME_ID);
        if (!req) return;
        setMicRequests((q) => q.filter((r) => r.id !== ME_ID));
        const at = freeSeat(req.seat);
        if (at < 0) {
          toast("The owner approved, but every seat is taken now. Ask again when one opens.", "error");
          return;
        }
        setSeats((s) => s.map((x, i) => (x === ME_ID ? null : i === at ? ME_ID : x)));
        setMuted(true);
        setHandRaised(false);
        addSystem(`${person(room.hostId).name} approved ${profile.name}'s mic request`);
        toast(`Approved! You're on seat ${at + 1}. Tap the mic to unmute.`, "gold");
      }, 3500);
    },
    [toast, freeSeat, addSystem, person, room.hostId, profile.name],
  );
  const cancelMicRequest = useCallback(() => {
    setMicRequests((q) => q.filter((r) => r.id !== ME_ID));
    toast("Mic request cancelled");
  }, [toast]);
  const approveMicRequest = useCallback(
    (id: string) => {
      if (!canModerate) return;
      const req = requestsRef.current.find((r) => r.id === id);
      if (!req) return;
      const at = freeSeat(req.seat);
      if (at < 0) {
        toast("No open seat. Open or free a seat first.");
        return;
      }
      setMicRequests((q) => q.filter((r) => r.id !== id));
      setSeats((s) => s.map((x, i) => (x === id ? null : i === at ? id : x)));
      addSystem(`${actor} approved ${person(id).name}'s mic request · seat No.${at + 1}`);
    },
    [canModerate, freeSeat, toast, addSystem, actor, person],
  );
  const declineMicRequest = useCallback(
    (id: string) => {
      if (!canModerate) return;
      setMicRequests((q) => q.filter((r) => r.id !== id));
      toast(`Declined ${person(id).name}'s mic request`);
    },
    [canModerate, toast, person],
  );
  const setMicOrder = useCallback(
    (on: boolean) => {
      if (!canModerate) {
        toast("Only the owner or an admin can change the mic order");
        return;
      }
      setMicOrderState(on);
      if (!on) setMicRequests([]);
      addSystem(on ? `${actor} turned on mic order: ask the owner or an admin to take a seat` : `${actor} turned off mic order: anyone can take an empty seat`);
    },
    [canModerate, toast, addSystem, actor],
  );
  // Demo: with mic order on in your room, listeners ask to come on the mic now and then
  useEffect(() => {
    if (!micOrder || !canModerate || live) return;
    const ask = () => {
      const waiting = requestsRef.current.map((r) => r.id);
      const who = listenersRef.current.filter((id) => !waiting.includes(id) && !seatsRef.current.includes(id));
      if (!who.length || waiting.length >= 4) return;
      const id = who[Math.floor(Math.random() * who.length)];
      setMicRequests((q) => [...q, { id, seat: -1 }]);
    };
    const first = window.setTimeout(ask, 2500);
    const t = window.setInterval(ask, 14000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [micOrder, canModerate, live]);

  const leaveSeat = useCallback(() => {
    if (live) {
      if (voice?.micOn) void voice.setMic(false);
      toast("Your mic is off. Leave the room to leave the call.");
      return;
    }
    if (isOwner) {
      toast("The owner's seat is fixed. Mute your mic instead.");
      return;
    }
    setSeats((s) => s.map((x) => (x === ME_ID ? null : x)));
    setMuted(true);
    // Live rooms: stop sending your voice too
    if (voice?.micOn) void voice.setMic(false);
    toast("You left the mic. You're still in the room, listening.");
  }, [toast, isOwner, voice, live]);

  /** Muted by the owner or an admin: you, or the seat you're on. */
  const adminMutedMe = forceMuted.includes(ME_ID) || (mySeat >= 0 && mutedSeats.includes(mySeat));
  const toggleMute = useCallback(() => {
    if (!seated && !live) {
      toast("Take an empty seat to use the mic");
      return;
    }
    if (adminMutedMe && muted) {
      toast("The owner or an admin muted your seat", "error");
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
  }, [seated, toast, voice, live, adminMutedMe, muted]);
  // Being muted by the owner or an admin turns your mic off
  useEffect(() => {
    if (adminMutedMe) setMuted(true);
  }, [adminMutedMe]);

  /*
   * Music in the room goes out through the mic of whoever started it. If the
   * owner or an admin mutes that person, the song keeps playing only for them.
   * Songs are played from this device, so the starter is always you.
   */
  const music = useMusic();
  const musicOnlyMe = Boolean(music.playing && music.current) && adminMutedMe;
  const wasOnlyMe = useRef(false);
  useEffect(() => {
    if (musicOnlyMe && !wasOnlyMe.current) {
      addSystem(`🎵 ${profile.name} was muted, so their song now plays only for them`);
      toast("You were muted. Your song keeps playing, but only you can hear it.", "error");
    } else if (!musicOnlyMe && wasOnlyMe.current && music.playing) {
      addSystem(`🎵 ${profile.name} was unmuted, so everyone hears their song again`);
    }
    wasOnlyMe.current = musicOnlyMe;
  }, [musicOnlyMe, music.playing, addSystem, toast, profile.name]);

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

  const setSeatMuted = useCallback(
    (index: number, on: boolean) => {
      if (!canModerate || index === 0) return;
      const id = seats[index];
      if (id && id !== ME_ID && !canManage(id)) {
        toast("Admins can't mute the owner or another admin");
        return;
      }
      setMutedSeats((m) => (on ? [...new Set([...m, index])] : m.filter((x) => x !== index)));
      addSystem(`${actor} ${on ? "muted" : "unmuted"} seat No.${index + 1}${id ? ` (${person(id).name})` : ""}`);
    },
    [canModerate, seats, canManage, toast, addSystem, actor, person],
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
      if (participants && room.server) {
        // Live rooms: the backend mutes their published mic track (it checks you're allowed to)
        const m = participants.members.find((x) => x.personId === id);
        if (!m?.connected || !m.micSid) {
          toast(`${person(id).name} has no mic turned on to mute`);
          return;
        }
        const muted = m.micOn;
        void muteParticipant(room.server.id, { userId: /^\d+$/.test(m.userId) ? Number(m.userId) : m.userId, trackSid: m.micSid, muted })
          .then(() => {
            addSystem(`${actor} ${muted ? "muted" : "unmuted"} ${person(id).name}`);
            participants.refresh();
          })
          .catch((e) => toast(roomErrorText(e, "mute"), "error"));
        return;
      }
      const on = !forceMuted.includes(id);
      setForceMuted((m) => (on ? [...m, id] : m.filter((x) => x !== id)));
      addSystem(`${actor} ${on ? "muted" : "unmuted"} ${person(id).name}`);
    },
    [canManage, forceMuted, actor, addSystem, person, participants, room.server, toast],
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
        return false;
      }
      if (live) {
        // Backend room: to the server only; your line shows when the server broadcasts it
        const err = roomChat.send(t);
        if (err) toast(err);
        return !err;
      }
      add({ id: mid(), kind: "text", authorId: ME_ID, text: t });
      return true;
    },
    [add, chatBlocked, toast, live, roomChat],
  );

  const react = useCallback((emoji: string) => {
    const r = { id: mid(), personId: ME_ID, emoji };
    setReactions((list) => [...list, r]);
    window.setTimeout(() => setReactions((list) => list.filter((x) => x.id !== r.id)), 1800);
  }, []);

  /** Send a gift; package gifts (free) come out of your Bag instead of your coins. */
  /**
   * Send a gift. combo: which send this is in a row from the Combo button
   * (1 for a normal send). Coin sends offer the Combo button afterwards.
   */
  const sendGift = useCallback(
    (giftId: GiftId, toId: string, count: number, free = false, combo = 1): boolean => {
      if (!GIFTS_LIVE) {
        toast(GIFTS_SOON_TEXT);
        return false;
      }
      const gift = giftById(giftId);
      if (!free && !spend(gift.cost * count)) {
        toast("Not enough coins. Tap your coin balance to recharge.", "error");
        clearCombo();
        return false;
      }
      const value = gift.cost * count;
      const charm = Math.floor(charmFromCoins(value));
      const earned = giftEarnings(value);
      add({ id: mid(), kind: "gift", fromId: ME_ID, toId, giftId, count, charm, earned });
      addRoomGift(room, value);
      // Gifts to someone you're tagged with raise your tag's intimacy
      addIntimacy(ME_ID, toId, value);
      // The receiver earns charm: 1 point per 5 coins
      addCharm(toId, value);
      trackReceived(toId, giftId, count);
      setGiftCounts((g) => ({ ...g, [toId]: (g[toId] ?? 0) + value }));
      playGift({ giftId, fromName: profile.name, toName: person(toId).name, count, combo, charm, earned });
      giftListener.current?.(ME_ID, toId, value);
      pkListener.current?.(ME_ID, toId, value);
      if (!free) armCombo({ giftId, n: combo, send: () => sendGiftRef.current(giftId, toId, count, false, combo + 1) });
      return true;
    },
    [spend, toast, add, playGift, profile.name, person, addRoomGift, addIntimacy, addCharm, trackReceived, room, armCombo, clearCombo],
  );
  const sendGiftRef = useRef(sendGift);
  sendGiftRef.current = sendGift;
  // Leaving the room ends any combo
  useEffect(() => clearCombo, [clearCombo]);

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
  const liveSpeaking = useMemo(() => (participants ? participants.members.filter((m) => m.speaking).map((m) => m.personId) : null), [participants]);
  // Live rooms: a seat shows a muted mic when that person's LiveKit mic is off
  const liveMuted = useMemo(() => (participants ? participants.members.filter((m) => m.personId !== ME_ID && !m.micOn).map((m) => m.personId) : null), [participants]);
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
    mutedSeats,
    setSeatMuted,
    adminMutedMe,
    micOrder,
    setMicOrder,
    micRequests,
    requestSeat,
    queueOpen,
    setQueueOpen,
    cancelMicRequest,
    approveMicRequest,
    declineMicRequest,
    musicOnlyMe,
    setSeatClosed,
    forceMuted: liveMuted ?? forceMuted,
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
    participants,
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
