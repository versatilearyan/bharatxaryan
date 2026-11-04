"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, DoorOpen, Gamepad2, Gift, Heart, MessageCircle, RefreshCw, UserPlus } from "lucide-react";
import { friendsApi, type FriendActivity, type FriendCard, type FriendList } from "@/lib/api/social";
import { getRoomById } from "@/lib/api/voice-rooms";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { giftById } from "@/lib/app/data";
import { subscribe } from "@/lib/realtime/stomp";

type Tab = "friends" | "following" | "followers" | "activity";

const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

function Avatar({ src, name, size = 46, online }: { src?: string; name: string; size?: number; online?: boolean }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full rounded-full object-cover ring-1 ring-white/10" />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-[#ff7fa8] font-display font-extrabold text-white" style={{ fontSize: size * 0.4 }}>
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {online ? <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-speak ring-2 ring-ink-2" aria-label="Online" /> : null}
    </span>
  );
}

/**
 * Friends, following, followers and friends' activity, from the server.
 * Friends show online status, the room they're in and the game there, with
 * a Join button. Updates live as people come online or go offline.
 */
export function FriendsPanel({ onClose }: { onClose: () => void }) {
  const { openRoom, openProfile, openConversation, setSheet, toast } = useApp();
  const { addCreated } = useServerRooms();
  const [tab, setTab] = useState<Tab>("friends");
  const [lists, setLists] = useState<Partial<Record<Tab, FriendList>>>({});
  const [activity, setActivity] = useState<FriendActivity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (t: Tab) => {
      setLoading(true);
      setError("");
      try {
        if (t === "activity") setActivity(await friendsApi.activity());
        else {
          const l = await friendsApi.list(t);
          setLists((all) => ({ ...all, [t]: l }));
        }
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "Couldn't load. Pull to try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  // Online / offline as it happens
  useEffect(
    () =>
      subscribe("/topic/presence", (body) => {
        const b = body && typeof body === "object" ? (body as { userId?: unknown; online?: unknown }) : null;
        if (!b || typeof b.userId !== "string") return;
        const on = b.online === true;
        setLists((all) => {
          const next = { ...all };
          (Object.keys(next) as Tab[]).forEach((k) => {
            const l = next[k];
            if (!l) return;
            if (!l.people.some((p) => p.userId === b.userId)) return;
            const people = l.people.map((p) => (p.userId === b.userId ? { ...p, online: on, room: on ? p.room : undefined, lastSeenAt: on ? p.lastSeenAt : Date.now() } : p));
            next[k] = { ...l, people, onlineCount: people.filter((p) => p.online).length };
          });
          return next;
        });
      }),
    [],
  );

  const joinRoom = async (p: FriendCard) => {
    if (!p.room) return;
    try {
      const v = await getRoomById(p.room.roomId);
      addCreated(v);
      onClose();
      openRoom(serverRoomAppId(v.id));
    } catch {
      toast("That room isn't open any more.", "error");
    }
  };
  const person = (uid: string) => `srv-user:${uid}`;
  const counts = lists.friends ?? lists.following ?? lists.followers;
  const list = tab === "activity" ? null : lists[tab];

  return (
    <div className="flex h-full flex-col">
      {/* Counts */}
      <div className="grid grid-cols-3 gap-2 px-5">
        {(
          [
            ["friends", "Friends", counts?.friendsCount],
            ["following", "Following", counts?.followingCount],
            ["followers", "Followers", counts?.followers],
          ] as const
        ).map(([k, label, n]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-2xl px-2 py-2.5 text-center ring-1 transition ${tab === k ? "bg-gradient-to-br from-coral/25 to-gold/15 ring-coral/50" : "bg-surface ring-line"}`}>
            <span className="block font-display text-[19px] font-extrabold text-cream">{n ?? "–"}</span>
            <span className="block text-[11px] font-semibold text-muted">{label}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 px-5">
        <button type="button" onClick={() => setTab("activity")} className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold ring-1 ${tab === "activity" ? "bg-gold/20 text-gold ring-gold/50" : "bg-surface text-cream/80 ring-line"}`}>
          <Heart className="h-3.5 w-3.5" /> Activity
        </button>
        {tab === "friends" && lists.friends ? <span className="text-[12px] text-muted">{lists.friends.onlineCount} online</span> : null}
        <span className="flex-1" />
        <button type="button" onClick={() => void load(tab)} aria-label="Refresh" className="grid h-9 w-9 place-items-center rounded-full bg-surface text-cream/70 ring-1 ring-line">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-2 flex-1 pb-6">
        {error ? <p className="mx-5 mt-3 rounded-2xl bg-coral/10 p-3 text-center text-[13px] text-coral">{error}</p> : null}
        <AnimatePresence mode="wait">
          {tab === "activity" ? (
            <motion.ul key="activity" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1 px-3 pt-1">
              {activity && activity.length === 0 ? <li className="px-2 py-8 text-center text-[13px] text-muted">Nothing new from your friends yet.</li> : null}
              {(activity ?? []).map((a, i) => (
                <li key={`${a.type}-${a.ref}-${i}`}>
                  <button type="button" onClick={() => (onClose(), openProfile(person(a.user.userId)))} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-cream/[0.04]">
                    <Avatar src={a.user.avatarUrl} name={a.user.name} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] text-cream">
                        <b>{a.user.name}</b> {activityText(a)}
                      </span>
                      <span className="text-[11px] text-muted">{ago(a.at)}</span>
                    </span>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-cream/[0.06] text-cream/70">{activityIcon(a.type)}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          ) : (
            <motion.ul key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-1">
              {list && list.people.length === 0 ? (
                <li className="px-5 pb-8 pt-6 text-center">
                  <p className="text-[13px] text-muted">{tab === "friends" ? "No friends yet. When you and someone follow each other, you're friends." : tab === "following" ? "You aren't following anyone yet." : "No followers yet."}</p>
                  <button type="button" onClick={() => setSheet({ kind: "find-user" })} className="mx-auto mt-4 flex h-10 items-center gap-1.5 rounded-full bg-coral px-4 text-[13px] font-bold text-white">
                    <UserPlus className="h-4 w-4" /> Find people by ID
                  </button>
                </li>
              ) : null}
              {(list?.people ?? []).map((p) => (
                <li key={p.userId} className="flex items-center gap-3 px-5 py-2.5">
                  <button type="button" onClick={() => (onClose(), openProfile(person(p.userId)))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar src={p.avatarUrl} name={p.name} online={p.online} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-cream">{p.name}</span>
                      {p.room ? (
                        <span className="flex items-center gap-1 truncate text-[11.5px] text-speak">
                          {p.room.game ? <Gamepad2 className="h-3.5 w-3.5 shrink-0" /> : <DoorOpen className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate">{p.room.game ? `Playing ${p.room.game} in ${p.room.name}` : `In ${p.room.name}`}</span>
                        </span>
                      ) : (
                        <span className="block truncate text-[11.5px] text-muted">{p.online ? "Online" : p.lastSeenAt ? `Last seen ${ago(p.lastSeenAt)}` : "Offline"}</span>
                      )}
                    </span>
                  </button>
                  {p.room ? (
                    <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={() => void joinRoom(p)} className="h-8 shrink-0 rounded-full bg-gradient-to-r from-coral to-[#ff9a6b] px-3.5 text-[12px] font-bold text-white shadow-[0_4px_14px_-4px_rgba(255,107,107,0.6)]">
                      Join
                    </motion.button>
                  ) : null}
                  <button type="button" onClick={() => (onClose(), openConversation(person(p.userId)))} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream/[0.08] text-cream" aria-label={`Message ${p.name}`}>
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {!list && loading ? (
                <li className="space-y-3 px-5 pt-2">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="flex items-center gap-3">
                      <span className="h-[46px] w-[46px] animate-pulse rounded-full bg-cream/[0.07]" />
                      <span className="h-4 flex-1 animate-pulse rounded bg-cream/[0.07]" />
                    </span>
                  ))}
                </li>
              ) : null}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function activityText(a: FriendActivity) {
  switch (a.type) {
    case "MOMENT":
      return a.detail ? `posted a Moment: “${a.detail}”` : "posted a new Moment";
    case "CP":
      return a.detail ? `became a CP with ${a.detail} 💍` : "found a CP 💍";
    case "GIFT": {
      const [to, count] = (a.detail ?? "").split("|");
      const g = a.ref ? giftById(a.ref as never) : undefined;
      return `sent ${count && count !== "1" ? `${count}× ` : ""}${g?.name ?? "a gift"}${to ? ` to ${to}` : ""} 🎁`;
    }
    case "ROOM":
      return a.detail ? `is in ${a.detail}` : "joined a room";
  }
}

function activityIcon(t: FriendActivity["type"]) {
  switch (t) {
    case "MOMENT":
      return <Camera className="h-4 w-4" />;
    case "CP":
      return <Heart className="h-4 w-4" />;
    case "GIFT":
      return <Gift className="h-4 w-4" />;
    case "ROOM":
      return <DoorOpen className="h-4 w-4" />;
  }
}
