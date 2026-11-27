"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, DoorOpen, Gamepad2, Gift, Heart, MessageCircle, RefreshCw, Search, UserPlus, X } from "lucide-react";
import { friendsApi, type FriendActivity, type FriendCard, type FriendList, type FriendRequests } from "@/lib/api/social";
import { searchServer, type FoundUser } from "@/lib/api/search";
import { FriendButton } from "@/components/social/FriendButton";
import { refreshActivity } from "@/lib/app/activity-store";
import { getRoomById } from "@/lib/api/voice-rooms";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { giftById } from "@/lib/app/data";
import { subscribe } from "@/lib/realtime/stomp";

type Tab = "friends" | "following" | "followers" | "activity" | "requests" | "find";

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
export function FriendsPanel({ onClose, initialTab }: { onClose: () => void; initialTab?: "friends" | "requests" | "find" | "following" | "followers" }) {
  const { openRoom, openProfile, openConversation, setSheet, toast } = useApp();
  const { addCreated } = useServerRooms();
  // Follow is gone from the app: friends are made by request (Add friend / Accept)
  const [tab, setTab] = useState<Tab>(initialTab === "requests" || initialTab === "find" ? initialTab : "friends");
  const [reqs, setReqs] = useState<FriendRequests | null>(null);
  const loadReqs = useCallback(() => {
    friendsApi
      .requests()
      .then(setReqs)
      .catch(() => setReqs((r) => r ?? { incoming: [], sent: [], accepted: [], incomingCount: 0 }));
  }, []);
  useEffect(loadReqs, [loadReqs]);
  const [lists, setLists] = useState<Partial<Record<Tab, FriendList>>>({});
  const [activity, setActivity] = useState<FriendActivity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (t: Tab) => {
      setLoading(true);
      setError("");
      try {
        if (t === "requests" || t === "find") return;
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
  const list = tab === "activity" || tab === "requests" || tab === "find" ? null : lists[tab];
  const requestCount = reqs?.incomingCount ?? 0;
  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "friends", label: "Friends" },
    { key: "requests", label: "Requests", badge: requestCount },
    { key: "find", label: "Find People" },
  ];
  const onTab = (t: Tab) => (t === "friends" || t === "activity" ? tab === "friends" || tab === "activity" : t === tab);

  return (
    <div className="flex h-full flex-col">
      {/* Friends · Requests · Find People */}
      <div role="tablist" aria-label="Friends" className="flex gap-5 border-b border-gold/15 px-5">
        {TABS.map((t) => {
          const on = onTab(t.key);
          return (
            <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => (setTab(t.key), t.key === "requests" && loadReqs())} className={`relative flex items-center gap-1.5 pb-2.5 font-display text-[16px] font-extrabold ${on ? "text-cream" : "text-cream/45"}`}>
              {t.label}
              {t.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[11px] font-black text-white">{t.badge > 99 ? "99+" : t.badge}</span> : null}
              {on ? <motion.span layoutId="friends-tab" className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-gradient-to-r from-[#f6d899] to-coral" /> : null}
            </button>
          );
        })}
      </div>
      {tab === "requests" ? (
        <RequestsTab reqs={reqs} reload={loadReqs} openProfile={(uid) => (onClose(), openProfile(person(uid)))} />
      ) : tab === "find" ? (
        <FindPeopleTab openProfile={(uid) => (onClose(), openProfile(person(uid)))} />
      ) : (
      <>
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
                  <p className="text-[13px] text-muted">Abhi koi friend nahi. Kisi ko friend request bhejo; woh accept kare toh aap friends.</p>
                  <button type="button" onClick={() => setTab("find")} className="mx-auto mt-4 flex h-10 items-center gap-1.5 rounded-full bg-gradient-to-b from-[#f6d899] to-[#d9a84f] text-[#2a1a0c] px-4 text-[13px] font-extrabold">
                    <UserPlus className="h-4 w-4" /> Find people
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
      </>
      )}
    </div>
  );
}

function PersonRow({ p, sub, onOpen, children }: { p: FriendCard; sub: string; onOpen: () => void; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#2c1622]/95 to-[#1b1622]/95 p-3 ring-1 ring-gold/15">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar src={p.avatarUrl} name={p.name} size={52} online={p.online} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-extrabold text-cream">{p.name}</span>
          <span className="block truncate text-[12px] text-muted">{sub}</span>
        </span>
      </button>
      {children}
    </li>
  );
}

/** Requests: who asked you (Accept / ×) and who you asked (Cancel). */
function RequestsTab({ reqs, reload, openProfile }: { reqs: FriendRequests | null; reload: () => void; openProfile: (uid: string) => void }) {
  const { toast } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (uid: string, f: () => Promise<unknown>, ok: string) => {
    setBusy(uid);
    try {
      await f();
      toast(ok);
      reload();
      refreshActivity(true);
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "That didn't work.", "error");
    } finally {
      setBusy(null);
    }
  };
  if (!reqs)
    return (
      <div className="space-y-2 px-5 pt-4" aria-busy>
        {[0, 1, 2].map((k) => (
          <div key={k} className="h-[78px] animate-pulse rounded-2xl bg-white/[0.05]" />
        ))}
      </div>
    );
  return (
    <div className="flex-1 px-5 pb-8 pt-4">
      <h3 className="font-display text-[17px] font-extrabold text-cream">
        Requests <span className="text-[13px] text-muted">({reqs.incoming.length})</span>
      </h3>
      {reqs.incoming.length === 0 ? <p className="py-4 text-[13px] text-muted">Abhi koi nayi request nahi.</p> : null}
      <ul className="mt-2 space-y-2">
        {reqs.incoming.map((p) => (
          <PersonRow key={p.userId} p={p} sub={`wants to be friends · ${ago(p.at)}`} onOpen={() => openProfile(p.userId)}>
            <button type="button" disabled={busy === p.userId} onClick={() => void act(p.userId, () => friendsApi.follow(p.userId), "You're friends now 🤝")} className="flex h-10 items-center gap-1 rounded-xl bg-gradient-to-b from-[#f6d899] to-[#d9a84f] text-[#2a1a0c] px-4 text-[13px] font-extrabold disabled:opacity-60">
              <Check className="h-4 w-4" /> Accept
            </button>
            <button type="button" disabled={busy === p.userId} onClick={() => void act(p.userId, () => friendsApi.decline(p.userId), "Request removed")} aria-label={`Reject ${p.name}`} className="grid h-10 w-9 place-items-center text-cream/60">
              <X className="h-5 w-5" />
            </button>
          </PersonRow>
        ))}
      </ul>
      {reqs.sent.length ? (
        <>
          <h3 className="mt-6 font-display text-[17px] font-extrabold text-cream">Sent</h3>
          <ul className="mt-2 space-y-2">
            {reqs.sent.map((p) => (
              <PersonRow key={p.userId} p={p} sub="waiting for an answer" onOpen={() => openProfile(p.userId)}>
                <button type="button" disabled={busy === p.userId} onClick={() => void act(p.userId, () => friendsApi.unfollow(p.userId), "Request cancelled")} className="h-10 rounded-xl bg-black/30 px-4 text-[13px] font-bold text-cream ring-1 ring-gold/25 disabled:opacity-60">
                  Cancel
                </button>
              </PersonRow>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** Find People: search by name or ID, with Add friend right there. */
function FindPeopleTab({ openProfile }: { openProfile: (uid: string) => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<FoundUser[] | null>(null);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setFound(null);
      return;
    }
    let live = true;
    const h = window.setTimeout(() => {
      searchServer(t)
        .then((r) => live && setFound(r.users))
        .catch(() => live && setFound([]));
    }, 300);
    return () => {
      live = false;
      window.clearTimeout(h);
    };
  }, [q]);
  return (
    <div className="flex-1 px-5 pb-8 pt-4">
      <label className="flex h-12 items-center gap-2 rounded-2xl bg-white/[0.06] px-4 ring-1 ring-white/10 focus-within:ring-gold/60">
        <Search className="h-4.5 w-4.5 text-muted" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name ya ID likho" aria-label="Search people" className="min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none placeholder:text-muted" />
      </label>
      {found === null ? <p className="py-6 text-center text-[13px] text-muted">Naam ya ID se dhoondho aur friend request bhejo.</p> : null}
      {found && found.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">Koi nahi mila.</p> : null}
      <ul className="mt-3 space-y-2">
        {(found ?? []).map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.07]">
            <button type="button" onClick={() => openProfile(u.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <Avatar src={u.avatarUrl} name={u.name} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-extrabold text-cream">{u.name}</span>
                <span className="block truncate text-[12px] text-muted">ID {u.publicId}</span>
              </span>
            </button>
            <FriendButton userId={u.id} className="!h-10 px-3.5" />
          </li>
        ))}
      </ul>
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
