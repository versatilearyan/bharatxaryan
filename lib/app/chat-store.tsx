"use client";

/**
 * Private chat state for someone signed in to the backend: the inbox, each
 * conversation's messages, sending, read state and the unread count.
 *
 * - One send path for text: REST (POST …/messages). Incoming messages arrive
 *   over STOMP on /user/queue/chat. The backend also echoes your own messages
 *   there; both copies carry the same message id, so they're merged by id and
 *   never shown twice. /app/chat.send isn't used.
 * - Images go through the REST upload and are shown through the protected
 *   image endpoint (see ChatImage).
 * - Read: a conversation is marked read when you open it and when a message
 *   arrives while it's open. The unread count comes only from
 *   GET /chat/unread-count, reloaded after those events (never guessed).
 * - Stale answers (you switched chats, or signed out) are dropped.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  chatErrorText,
  createConversation,
  getConversations,
  getMessages,
  getPresence,
  getUnreadCount,
  markConversationRead,
  mergeMessages,
  readMessage,
  sendImageMessage,
  sendTextMessage,
  type ChatConversation,
  type ChatMessage,
  type Presence,
} from "@/lib/api/chat";
import { readToken } from "@/lib/auth/token";
import { publish, subscribe } from "@/lib/realtime/stomp";
import { useServerRooms } from "./server-rooms";
import { useApp } from "./store";

export type Thread = {
  messages: ChatMessage[];
  /** Next older page to load, or null when there are no more. */
  nextPage: number | null;
  loading: boolean;
  loadingOlder: boolean;
  error: string;
};

export type Outgoing = { tempId: string; conversationId: string; kind: "text" | "image"; text?: string; previewUrl?: string; status: "sending" | "failed"; error?: string; file?: File };

type Load<T> = { data: T | null; loading: boolean; error: string };

type ChatCtx = {
  enabled: boolean;
  myId: string | null;
  inbox: Load<ChatConversation[]>;
  unread: number | null;
  threads: Record<string, Thread>;
  outgoing: Outgoing[];
  loadInbox: (force?: boolean) => void;
  /** The conversation id with a user (created on the server if needed). */
  conversationWith: (userId: string) => Promise<string>;
  openThread: (conversationId: string) => void;
  closeThread: (conversationId: string) => void;
  loadOlder: (conversationId: string) => Promise<void>;
  sendText: (conversationId: string, text: string) => Promise<boolean>;
  sendImage: (conversationId: string, file: File) => Promise<boolean>;
  retry: (tempId: string) => void;
  discard: (tempId: string) => void;
  /** Who is online (by backend user id), kept live from /topic/presence. */
  presence: Record<string, Presence>;
  /** Ask the server who of these people is online (chat headers, group members). */
  watchPresence: (userIds: string[]) => void;
  /** Who is typing in each conversation right now: conversationId -> userId -> name. */
  typing: Record<string, Record<string, string>>;
  /** Tell the others you're typing (or stopped). Sent at most every 2 s while typing. */
  setTyping: (conversationId: string, on: boolean) => void;
  /** Goes up when a group's members, admins or name change, so open screens reload it. */
  groupVersion: number;
};

const Ctx = createContext<ChatCtx | null>(null);
const EMPTY_THREAD: Thread = { messages: [], nextPage: 0, loading: false, loadingOlder: false, error: "" };
let tmp = 0;

export function ChatProvider({ children }: { children: ReactNode }) {
  const { session } = useApp();
  const { myId } = useServerRooms();
  const enabled = Boolean(session) && Boolean(readToken()) && Boolean(myId);
  const [inbox, setInbox] = useState<Load<ChatConversation[]>>({ data: null, loading: false, error: "" });
  const [unread, setUnread] = useState<number | null>(null);
  const [threads, setThreads] = useState<Record<string, Thread>>({});
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  /** conversationId -> userId -> { name, until } */
  const [typingRaw, setTypingRaw] = useState<Record<string, Record<string, { name: string; until: number }>>>({});
  const [groupVersion, setGroupVersion] = useState(0);
  const typingSent = useRef<Record<string, number>>({});
  const convByUser = useRef<Record<string, Promise<string>>>({});
  const open = useRef<Set<string>>(new Set());
  const epoch = useRef(0);
  const inboxBusy = useRef(false);
  const readBusy = useRef<Set<string>>(new Set());
  const unreadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const me = myId ?? undefined;
  const inboxRef = useRef(inbox);
  inboxRef.current = inbox;

  // Signed out (or another account): forget everything
  useEffect(() => {
    epoch.current += 1;
    convByUser.current = {};
    setInbox({ data: null, loading: false, error: "" });
    setUnread(null);
    setThreads({});
    setPresence({});
    setTypingRaw({});
    setOutgoing((o) => {
      o.forEach((x) => x.previewUrl && URL.revokeObjectURL(x.previewUrl));
      return [];
    });
  }, [enabled, myId]);

  const patchThread = useCallback((id: string, f: (t: Thread) => Thread) => setThreads((all) => ({ ...all, [id]: f(all[id] ?? EMPTY_THREAD) })), []);

  const refreshUnread = useCallback(() => {
    if (!enabled) return;
    // Several events close together make one request
    if (unreadTimer.current) clearTimeout(unreadTimer.current);
    const e = epoch.current;
    unreadTimer.current = setTimeout(() => {
      unreadTimer.current = null;
      getUnreadCount()
        .then((n) => e === epoch.current && setUnread(n))
        .catch(() => {});
    }, 300);
  }, [enabled]);

  const loadInbox = useCallback(
    (force = false) => {
      if (!enabled || inboxBusy.current) return;
      if (!force && inbox.data) return;
      inboxBusy.current = true;
      const e = epoch.current;
      setInbox((s) => ({ ...s, loading: true, error: "" }));
      getConversations(me)
        .then((data) => {
          if (e !== epoch.current) return;
          setInbox({ data, loading: false, error: "" });
          // Direct chats say whether the other person is online
          setPresence((p) => {
            const next = { ...p };
            for (const c of data) if (c.kind === "DIRECT" && c.otherUserId) next[c.otherUserId] = { ...next[c.otherUserId], online: Boolean(c.otherOnline) };
            return next;
          });
        })
        // A failed refresh keeps the list you already had
        .catch((err) => e === epoch.current && setInbox((s) => ({ ...s, loading: false, error: chatErrorText(err, "load") })))
        .finally(() => {
          inboxBusy.current = false;
        });
    },
    [enabled, inbox.data, me],
  );

  useEffect(() => {
    if (!enabled) return;
    refreshUnread();
  }, [enabled, refreshUnread]);

  const conversationWith = useCallback(
    (userId: string) => {
      const known = inbox.data?.find((c) => c.otherUserId === userId);
      if (known) return Promise.resolve(known.id);
      convByUser.current[userId] ??= createConversation(userId, me)
        .then((c) => {
          setInbox((s) => (s.data && !s.data.some((x) => x.id === c.id) ? { ...s, data: [c, ...s.data] } : s));
          return c.id;
        })
        .catch((err) => {
          delete convByUser.current[userId];
          throw new Error(chatErrorText(err, "open"));
        });
      return convByUser.current[userId];
    },
    [inbox.data, me],
  );

  const markRead = useCallback(
    (id: string) => {
      if (readBusy.current.has(id)) return;
      readBusy.current.add(id);
      const e = epoch.current;
      markConversationRead(id)
        .then(() => {
          if (e !== epoch.current) return;
          setInbox((s) => (s.data ? { ...s, data: s.data.map((c) => (c.id === id && c.unreadCount ? { ...c, unreadCount: 0 } : c)) } : s));
          refreshUnread();
        })
        .catch(() => {})
        .finally(() => readBusy.current.delete(id));
    },
    [refreshUnread],
  );

  const loadPage = useCallback(
    async (id: string, page: number) => {
      const e = epoch.current;
      const older = page > 0;
      patchThread(id, (t) => ({ ...t, [older ? "loadingOlder" : "loading"]: true, error: "" }));
      try {
        const r = await getMessages(id, page);
        if (e !== epoch.current) return;
        patchThread(id, (t) => ({
          ...t,
          messages: mergeMessages(t.messages, r.messages),
          nextPage: older || t.nextPage === 0 || t.nextPage === null ? (r.last ? null : r.page + 1) : t.nextPage,
          loading: false,
          loadingOlder: false,
        }));
      } catch (err) {
        if (e !== epoch.current) return;
        // Messages already on screen stay
        patchThread(id, (t) => ({ ...t, loading: false, loadingOlder: false, error: chatErrorText(err, "load") }));
      }
    },
    [patchThread],
  );

  const openThread = useCallback(
    (id: string) => {
      open.current.add(id);
      void loadPage(id, 0);
      markRead(id);
    },
    [loadPage, markRead],
  );
  const closeThread = useCallback((id: string) => {
    open.current.delete(id);
  }, []);

  const loadOlder = useCallback(
    async (id: string) => {
      const t = threads[id];
      if (!t || t.loadingOlder || t.nextPage === null || t.nextPage === 0) return;
      await loadPage(id, t.nextPage);
    },
    [threads, loadPage],
  );

  /** A message we now know about (sent, or arrived live): into its thread and the inbox preview. */
  const take = useCallback(
    (m: ChatMessage) => {
      setThreads((all) => (all[m.conversationId] ? { ...all, [m.conversationId]: { ...all[m.conversationId], messages: mergeMessages(all[m.conversationId].messages, [m]) } } : all));
      // Not loaded yet counts as known: the list will load with it
      const known = !inboxRef.current.data || inboxRef.current.data.some((x) => x.id === m.conversationId);
      setInbox((s) => {
        if (!s.data) return s;
        const c = s.data.find((x) => x.id === m.conversationId);
        if (!c) return s;
        const updated: ChatConversation = { ...c, lastMessage: m.type === "IMAGE" ? "📷 Photo" : (m.text ?? c.lastMessage), lastMessageType: m.type, lastAt: m.createdAt ?? c.lastAt };
        return { ...s, data: [updated, ...s.data.filter((x) => x.id !== m.conversationId)] };
      });
      return known;
    },
    [],
  );

  const send = useCallback(
    async (o: Outgoing): Promise<boolean> => {
      const e = epoch.current;
      setOutgoing((list) => [...list.filter((x) => x.tempId !== o.tempId), { ...o, status: "sending", error: undefined }]);
      try {
        const m = o.kind === "text" ? await sendTextMessage(o.conversationId, o.text ?? "") : await sendImageMessage(o.conversationId, o.file!, me);
        if (e !== epoch.current) return false;
        if (m) take({ ...m, senderId: m.senderId ?? me });
        else void loadPage(o.conversationId, 0);
        setOutgoing((list) => {
          const x = list.find((y) => y.tempId === o.tempId);
          if (x?.previewUrl) URL.revokeObjectURL(x.previewUrl);
          return list.filter((y) => y.tempId !== o.tempId);
        });
        return true;
      } catch (err) {
        if (e !== epoch.current) return false;
        setOutgoing((list) => list.map((x) => (x.tempId === o.tempId ? { ...x, status: "failed", error: chatErrorText(err, o.kind === "text" ? "send" : "image") } : x)));
        return false;
      }
    },
    [take, loadPage, me],
  );

  const sendText = useCallback((conversationId: string, text: string) => (typingSent.current[conversationId] = 0, send({ tempId: `tmp-${++tmp}`, conversationId, kind: "text", text, status: "sending" })), [send]);
  const sendImage = useCallback(
    (conversationId: string, file: File) => send({ tempId: `tmp-${++tmp}`, conversationId, kind: "image", file, previewUrl: URL.createObjectURL(file), status: "sending" }),
    [send],
  );
  const retry = useCallback(
    (tempId: string) => {
      const o = outgoing.find((x) => x.tempId === tempId);
      if (o && o.status === "failed") void send(o);
    },
    [outgoing, send],
  );
  const discard = useCallback((tempId: string) => {
    setOutgoing((list) => {
      const x = list.find((y) => y.tempId === tempId);
      if (x?.previewUrl) URL.revokeObjectURL(x.previewUrl);
      return list.filter((y) => y.tempId !== tempId);
    });
  }, []);

  // Live messages for you (and the echo of yours)
  const takeRef = useRef(take);
  takeRef.current = take;
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;
  const loadInboxRef = useRef(loadInbox);
  loadInboxRef.current = loadInbox;
  useEffect(() => {
    if (!enabled) return;
    return subscribe("/user/queue/chat", (body) => {
      const m = readMessage(body);
      if (!m) return;
      if (m.senderId)
        setTypingRaw((all) => {
          const here = all[m.conversationId];
          if (!here || !here[m.senderId!]) return all;
          const rest = { ...here };
          delete rest[m.senderId!];
          return { ...all, [m.conversationId]: rest };
        });
      const known = takeRef.current(m);
      // A chat that isn't in the list yet (someone new wrote): reload the list once
      if (!known) loadInboxRef.current(true);
      if (m.senderId !== me) {
        if (open.current.has(m.conversationId)) markReadRef.current(m.conversationId);
        else refreshUnread();
      }
    });
  }, [enabled, me, refreshUnread]);

  // Online / offline as people open and close the app
  useEffect(() => {
    if (!enabled) return;
    return subscribe("/topic/presence", (body) => {
      const b = body as { userId?: unknown; online?: unknown; lastSeenAt?: unknown } | null;
      if (!b || typeof b.userId !== "string") return;
      const id = b.userId;
      setPresence((p) => ({ ...p, [id]: { online: b.online === true, lastSeenAt: typeof b.lastSeenAt === "string" ? b.lastSeenAt : p[id]?.lastSeenAt } }));
    });
  }, [enabled]);

  const watchPresence = useCallback(
    (userIds: string[]) => {
      if (!enabled || !userIds.length) return;
      const e = epoch.current;
      getPresence(userIds)
        .then((p) => e === epoch.current && setPresence((old) => ({ ...old, ...p })))
        .catch(() => {});
    },
    [enabled],
  );

  // "X is typing": shown for 6 s after their last signal, gone at once when they stop or their message arrives
  useEffect(() => {
    if (!enabled) return;
    return subscribe("/user/queue/chat.typing", (body) => {
      const b = body as { conversationId?: unknown; userId?: unknown; name?: unknown; typing?: unknown } | null;
      if (!b || typeof b.conversationId !== "string" || typeof b.userId !== "string") return;
      const conv = b.conversationId;
      const uid = b.userId;
      setTypingRaw((all) => {
        const here = { ...(all[conv] ?? {}) };
        if (b.typing === false) delete here[uid];
        else here[uid] = { name: typeof b.name === "string" && b.name ? b.name : "Someone", until: Date.now() + 6000 };
        return { ...all, [conv]: here };
      });
    });
  }, [enabled]);
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now();
      setTypingRaw((all) => {
        let changed = false;
        const next: typeof all = {};
        for (const [c, people] of Object.entries(all)) {
          const keep = Object.fromEntries(Object.entries(people).filter(([, v]) => v.until > now));
          if (Object.keys(keep).length !== Object.keys(people).length) changed = true;
          if (Object.keys(keep).length) next[c] = keep;
        }
        return changed ? next : all;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, []);
  const typing = useMemo(() => {
    const out: Record<string, Record<string, string>> = {};
    for (const [c, people] of Object.entries(typingRaw)) out[c] = Object.fromEntries(Object.entries(people).map(([u, v]) => [u, v.name]));
    return out;
  }, [typingRaw]);
  const setTyping = useCallback(
    (conversationId: string, on: boolean) => {
      if (!enabled) return;
      const now = Date.now();
      const last = typingSent.current[conversationId] ?? 0;
      if (on && now - last < 2000) return;
      if (!on && !last) return;
      typingSent.current[conversationId] = on ? now : 0;
      try {
        publish("/app/chat.typing", { conversationId: /^\d+$/.test(conversationId) ? Number(conversationId) : conversationId, typing: on });
      } catch {
        /* not connected: typing is only a nicety */
      }
    },
    [enabled],
  );

  // Groups changed (made, people added or removed, admins, renamed), or someone blocked you: reload the list
  useEffect(() => {
    if (!enabled) return;
    return subscribe("/user/queue/chat.events", () => {
      loadInboxRef.current(true);
      setGroupVersion((v) => v + 1);
    });
  }, [enabled]);

  const value = useMemo<ChatCtx>(
    () => ({ enabled, myId: myId ?? null, inbox, unread, threads, outgoing, loadInbox, conversationWith, openThread, closeThread, loadOlder, sendText, sendImage, retry, discard, presence, watchPresence, typing, setTyping, groupVersion }),
    [enabled, myId, inbox, unread, threads, outgoing, loadInbox, conversationWith, openThread, closeThread, loadOlder, sendText, sendImage, retry, discard, presence, watchPresence, typing, setTyping, groupVersion],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChat() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChat must be used inside ChatProvider");
  return v;
}

/** The unread count for the nav badge when signed in (null otherwise). */
export function useServerUnread(): number | null {
  const v = useContext(Ctx);
  return v?.enabled ? v.unread : null;
}
