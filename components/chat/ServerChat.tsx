"use client";

/**
 * Private chat with backend users (signed in): the inbox list and the
 * conversation view, in the same look as the demo chat screens. Data and
 * actions come from lib/app/chat-store.tsx.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getRoomById } from "@/lib/api/voice-rooms";
import { invitePreview, parseInvite } from "@/lib/api/invites";
import { InviteCard } from "@/components/social/Invites";
import { OfficialTick, SystemBubble } from "@/components/sarpanch/Sarpanch";
import { AlertCircle, BellOff, ChevronLeft, ImagePlus, Loader2, MoreVertical, RotateCcw, Send, Users, X } from "lucide-react";
import { ChatMenuSheet, GroupInfoSheet, useGroupInfo } from "./ChatGroups";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { IconButton } from "@/components/ui/kit";
import { usePublicProfile } from "@/components/profile/usePublicProfile";
import { acceptChatRequest, checkChatImage, declineChatRequest, getActiveNow, loadChatPhoto, presenceText, type ActivePerson, CHAT_TEXT_MAX, type ChatConversation, type ChatMessage } from "@/lib/api/chat";
import { useChat, type Outgoing } from "@/lib/app/chat-store";
import { usePeople } from "@/lib/app/people";
import { SERVER_USER_PREFIX, serverRoomAppId, useServerPeople, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { useStompStatus } from "@/lib/realtime/stomp";

/** A conversation opened by id when the other person isn't known: "srv-conv:<id>". */
export const SERVER_CONV_PREFIX = "srv-conv:";
export const isServerChatTarget = (personId: string) => personId.startsWith(SERVER_USER_PREFIX) || personId.startsWith(SERVER_CONV_PREFIX);

const fmt = (at: number) => (Number.isFinite(at) ? new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");
function ago(iso?: string) {
  const at = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(at)) return "";
  const m = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}

/* ------------------------------------------------------------------ */
/* Protected images                                                    */
/* ------------------------------------------------------------------ */

function ChatImage({ conversationId, messageId }: { conversationId: string; messageId: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [shown, setShown] = useState(false);
  const [zoom, setZoom] = useState(false);
  // Only download when it's about to be seen
  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setNear(true), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  useEffect(() => {
    if (!near) return;
    let live = true;
    let made: string | null = null;
    setError("");
    loadChatPhoto(conversationId, messageId)
      .then((b) => {
        if (!live) return;
        setShown(false);
        made = URL.createObjectURL(b);
        setUrl(made);
      })
      .catch((e) => live && setError(e instanceof Error && e.message ? e.message : "Couldn't load the image."));
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [near, conversationId, messageId, tick]);
  return (
    <span ref={box} className="relative grid min-h-[120px] w-[200px] max-w-full place-items-center overflow-hidden rounded-2xl bg-black/20">
      {url ? (
        <button type="button" onClick={() => setZoom(true)} className="block w-full" aria-label="Open photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Photo" onLoad={() => setShown(true)} className={`block max-h-[280px] w-full object-cover transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`} />
        </button>
      ) : error ? (
        <button type="button" onClick={() => setTick((n) => n + 1)} className="flex flex-col items-center gap-1 p-3 text-[11.5px] text-cream/80">
          <AlertCircle className="h-5 w-5" aria-hidden />
          {error}
          <span className="font-bold underline">Try again</span>
        </button>
      ) : (
        <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.06] via-white/[0.12] to-white/[0.04]" aria-label="Loading image" />
      )}
      <AnimatePresence>
        {zoom && url ? (
          <motion.span className="fixed inset-0 z-[95] grid place-items-center bg-black/90 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(false)} role="dialog" aria-label="Photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img src={url} alt="Photo" className="max-h-full max-w-full rounded-xl object-contain" initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }} />
            <span className="absolute right-4 top-[calc(env(safe-area-inset-top)+14px)] grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white" aria-hidden>
              <X className="h-5 w-5" />
            </span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Inbox                                                               */
/* ------------------------------------------------------------------ */

/** "Riya is typing…", "Riya and Dev are typing…", "3 people are typing…" */
export function typingLine(names: string[]) {
  if (!names.length) return "";
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names.length} people are typing…`;
}

function InboxRow({ c, onOpen }: { c: ChatConversation; onOpen: (personId: string) => void }) {
  const person = usePeople();
  const known = useServerPeople();
  const chat = useChat();
  const group = c.kind === "GROUP";
  const personId = !group && c.otherUserId ? `${SERVER_USER_PREFIX}${c.otherUserId}` : "";
  // The response may not name the person: their public profile does (fetched once)
  usePublicProfile(personId && !c.otherName && !known[personId]?.name ? personId : "");
  const p = personId ? person(personId) : null;
  const name = c.otherName ?? (personId && known[personId]?.name) ?? (c.otherUserId ? `User ${c.otherUserId}` : "Chat");
  const unread = c.unreadCount ?? 0;
  const online = !group && c.otherUserId ? (chat.presence[c.otherUserId]?.online ?? c.otherOnline) : false;
  const typers = Object.values(chat.typing[c.id] ?? {});
  const lastFrom = group && c.lastSenderId ? (c.lastSenderId === chat.myId ? "You: " : `${(known[`${SERVER_USER_PREFIX}${c.lastSenderId}`]?.name ?? "").split(" ")[0] || "Someone"}: `) : c.lastSenderId && c.lastSenderId === chat.myId ? "You: " : "";
  return (
    <li>
      <motion.button type="button" whileTap={{ scale: 0.985 }} onClick={() => onOpen(personId || `${SERVER_CONV_PREFIX}${c.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cream/[0.03]" aria-label={`${group ? "Group" : "Chat with"} ${name}${unread ? `, ${unread} unread` : ""}`}>
        <span className="relative shrink-0">
          {group ? (
            <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-[#f4515b] text-white">
              <Users className="h-6 w-6" aria-hidden />
            </span>
          ) : p ? (
            <PersonAvatar person={p} size={52} />
          ) : (
            <span className="block h-[52px] w-[52px] rounded-full bg-surface" />
          )}
          {online ? <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-speak ring-2 ring-ink" aria-label="Online" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={`truncate text-[15px] ${unread ? "font-bold text-cream" : "font-semibold text-cream/90"}`}>{name}</span>
            {c.official ? <OfficialTick className="h-4 w-4" /> : null}
            {c.pinned ? <span className="shrink-0 rounded-full bg-gold/15 px-1.5 py-px text-[9.5px] font-bold text-gold">PINNED</span> : null}
            {c.muted ? <BellOff className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Muted" /> : null}
            <span className="ml-auto shrink-0 text-[11px] text-muted">{ago(c.lastAt)}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className={`truncate text-[13px] ${typers.length ? "text-speak" : unread ? "text-cream/85" : "text-muted"}`}>
              {typers.length ? (group ? typingLine(typers) : "typing…") : c.blockedByMe ? "Blocked" : c.lastMessage ? `${lastFrom}${invitePreview(c.lastMessage)}` : group ? `${c.memberCount ?? ""} members` : ""}
            </span>
            {!typers.length && online && c.otherRoom ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-speak/15 px-2 py-0.5 text-[10.5px] font-bold text-speak">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-speak opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-speak" />
                </span>
                <span className="max-w-[90px] truncate">{c.otherRoom.game ? `🎮 ${c.otherRoom.game}` : `🎙 ${c.otherRoom.name}`}</span>
              </span>
            ) : null}
            {unread ? <span className={`ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10.5px] font-bold text-white ${c.muted ? "bg-muted/60" : "bg-coral"}`}>{unread}</span> : null}
          </span>
        </span>
      </motion.button>
    </li>
  );
}

/**
 * "Active now": people you chat with or follow who are online, in a row you
 * scroll sideways. Tap: open the chat. People in a room show the room and can
 * be joined straight from here.
 */
function ActiveNow() {
  const { openConversation, openRoom, setSheet } = useApp();
  const { addCreated } = useServerRooms();
  const chat = useChat();
  const [people, setPeople] = useState<ActivePerson[] | null>(null);
  const load = useCallback(() => {
    getActiveNow()
      .then(setPeople)
      .catch(() => setPeople((p) => p ?? []));
  }, []);
  useEffect(() => {
    load();
    const t = window.setInterval(load, 45_000);
    return () => window.clearInterval(t);
  }, [load]);
  // Someone going offline leaves the row at once; someone coming online reloads it
  const presence = chat.presence;
  useEffect(() => {
    if (!people) return;
    const gone = people.some((p) => presence[p.userId] && presence[p.userId].online === false);
    if (gone) setPeople((list) => (list ?? []).filter((p) => presence[p.userId]?.online !== false));
  }, [presence, people]);
  if (!people || people.length === 0) return null;
  const join = async (p: ActivePerson) => {
    if (!p.room) return;
    try {
      const v = await getRoomById(p.room.roomId);
      addCreated(v);
      openRoom(serverRoomAppId(v.id));
    } catch {
      openConversation(`${SERVER_USER_PREFIX}${p.userId}`);
    }
  };
  return (
    <section aria-label="Active now" className="pb-2">
      <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Active now</p>
      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-4 pb-1">
        {people.map((p, i) => (
          <motion.div key={p.userId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="flex w-[64px] shrink-0 flex-col items-center gap-1">
            <button type="button" onClick={() => setSheet({ kind: "person", personId: `${SERVER_USER_PREFIX}${p.userId}` })} className="relative" aria-label={`${p.name}'s profile${p.room ? `, in ${p.room.name}` : ""}`}>
              <span className={`block rounded-full p-[2.5px] ${p.room ? "bg-gradient-to-tr from-speak via-[#4fd6a5] to-gold" : "bg-transparent"}`}>
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatarUrl} alt="" className="h-[54px] w-[54px] rounded-full object-cover ring-2 ring-ink" />
                ) : (
                  <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-[#ff7fa8] font-display text-[20px] font-extrabold text-white ring-2 ring-ink">{p.name.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-speak ring-2 ring-ink" />
            </button>
            <span className="max-w-full truncate text-[11px] text-cream/85">{p.name.split(" ")[0]}</span>
            {p.room ? (
              <button type="button" onClick={() => void join(p)} className="-mt-0.5 max-w-full truncate rounded-full bg-speak/15 px-1.5 py-0.5 text-[9.5px] font-bold text-speak" aria-label={`Join ${p.room.name}`}>
                {p.room.game ? `🎮 ${p.room.game}` : `🎙 ${p.room.name}`}
              </button>
            ) : null}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/** Your conversations from GET /api/v1/chat/conversations. */
export function ServerInbox({ query }: { query: string }) {
  const { inbox, loadInbox } = useChat();
  const { openConversation } = useApp();
  const { rememberPeople } = useServerRooms();
  const known = useServerPeople();
  const person = usePeople();
  // Each time the Chats tab opens
  useEffect(() => {
    loadInbox(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Names and pictures the list sent, for the conversation header and avatars
  useEffect(() => {
    const add: Record<string, { name?: string; avatarUrl?: string }> = {};
    for (const c of inbox.data ?? []) {
      const id = c.otherUserId ? `${SERVER_USER_PREFIX}${c.otherUserId}` : "";
      if (id && (c.otherName || c.otherAvatarUrl) && !known[id]?.name) add[id] = { name: c.otherName, avatarUrl: c.otherAvatarUrl };
    }
    if (Object.keys(add).length) rememberPeople(add);
  }, [inbox.data, known, rememberPeople]);

  const needle = query.trim().toLowerCase();
  const [showRequests, setShowRequests] = useState(false);
  const matches = useMemo(
    () => (inbox.data ?? []).filter((c) => !needle || (c.otherName ?? (c.otherUserId ? person(`${SERVER_USER_PREFIX}${c.otherUserId}`).name : "")).toLowerCase().includes(needle)),
    [inbox.data, needle, person],
  );
  // Message requests from people who aren't your friends live in their own folder
  const requests = matches.filter((c) => c.requestState === "PENDING");
  const list = showRequests ? requests : matches.filter((c) => c.requestState !== "PENDING");
  const requestUnread = requests.reduce((n, c) => n + (c.unreadCount ?? 0), 0);

  return (
    <section aria-label="Your chats">
      {inbox.error ? (
        <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl bg-surface p-3 text-[12.5px] text-cream/80 ring-1 ring-coral/30" role="alert">
          <span className="min-w-0 flex-1">{inbox.error}</span>
          <button type="button" onClick={() => loadInbox(true)} className="flex shrink-0 items-center gap-1 rounded-full bg-gold/15 px-3 py-1.5 text-[12px] font-bold text-gold">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Retry
          </button>
        </div>
      ) : null}
      {inbox.loading && !inbox.data ? (
        <div className="grid place-items-center py-10" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-gold" aria-label="Loading chats" />
        </div>
      ) : null}
      {!showRequests && !needle ? <ActiveNow /> : null}
      {showRequests ? (
        <div className="flex items-center gap-2 px-4 pb-2">
          <button type="button" onClick={() => setShowRequests(false)} className="rounded-full bg-surface px-3 py-1.5 text-[12px] font-bold text-cream ring-1 ring-line">
            ← Chats
          </button>
          <span className="text-[12px] text-muted">People who aren&apos;t your friends. Reply or accept to move them to your chats.</span>
        </div>
      ) : requests.length ? (
        <button type="button" onClick={() => setShowRequests(true)} className="mx-4 mb-1 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-gradient-to-r from-[#7b5cff]/20 to-coral/10 px-4 py-3 text-left ring-1 ring-[#7b5cff]/30">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#7b5cff]/30 text-[18px]" aria-hidden>
            ✉️
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-cream">Message requests</span>
            <span className="block text-[12px] text-muted">{requests.length} waiting for your answer</span>
          </span>
          {requestUnread ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1.5 text-[10.5px] font-bold text-white">{requestUnread}</span> : null}
        </button>
      ) : null}
      <ul>
        {list.map((c) => (
          <InboxRow key={c.id} c={c} onOpen={openConversation} />
        ))}
      </ul>
      {showRequests && requests.length === 0 ? <p className="px-6 pt-8 text-center text-sm text-muted">No message requests.</p> : null}
      {inbox.data && inbox.data.length === 0 ? <p className="px-6 pt-10 text-center text-sm text-muted">No chats yet. Open someone&apos;s profile and tap Chat to start one.</p> : null}
      {inbox.data && inbox.data.length > 0 && list.length === 0 ? <p className="px-4 pt-10 text-center text-sm text-muted">No chats match “{query}”.</p> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Conversation                                                        */
/* ------------------------------------------------------------------ */

function Bubble({ m, mine, from }: { m: ChatMessage; mine: boolean; from?: string }) {
  const image = m.type === "IMAGE";
  const invite = image ? null : parseInvite(m.text);
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`} data-message-id={m.id}>
      <div className={`max-w-[78%] rounded-3xl ${image || invite ? "p-1.5" : "px-3.5 py-2"} text-[14px] leading-snug ${mine ? "rounded-br-lg bg-coral text-white" : "rounded-bl-lg bg-surface text-cream"}`}>
        {from ? <span className={`block text-[11.5px] font-bold text-gold ${image ? "px-2 pt-1" : ""}`}>{from}</span> : null}
        {image ? (
          <ChatImage conversationId={m.conversationId} messageId={m.id} />
        ) : invite ? (
          <InviteCard inv={invite} mine={mine} />
        ) : (
          <span className="whitespace-pre-wrap break-words">{m.text ?? ""}</span>
        )}
        <span className={`ml-2 inline-block translate-y-0.5 text-[10px] ${mine ? "text-white/70" : "text-muted"} ${image ? "px-2" : ""}`}>{fmt(m.at)}</span>
      </div>
    </div>
  );
}

function PendingImage({ o, onRetry, onDiscard }: { o: Outgoing; onRetry: () => void; onDiscard: () => void }) {
  return (
    <div className="flex justify-end">
      <div className="relative max-w-[78%] rounded-3xl rounded-br-lg bg-coral/60 p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {o.previewUrl ? <img src={o.previewUrl} alt="Photo being sent" className="block max-h-[280px] w-[200px] rounded-2xl object-cover opacity-70" /> : null}
        <span className="mt-1 flex items-center justify-end gap-2 px-2 text-[11px] text-white">
          {o.status === "sending" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Sending…
            </>
          ) : (
            <>
              <span role="alert">{o.error ?? "Not sent"}</span>
              <button type="button" onClick={onRetry} className="font-bold underline">
                Retry
              </button>
              <button type="button" onClick={onDiscard} aria-label="Remove">
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

/** A conversation with a backend user (or by conversation id). */
export function ServerConversationView({ personId }: { personId: string }) {
  const { pop, setSheet, push } = useApp();
  const chat = useChat();
  const person = usePeople();
  const status = useStompStatus();
  const userId = personId.startsWith(SERVER_USER_PREFIX) ? personId.slice(SERVER_USER_PREFIX.length) : null;
  const [convId, setConvId] = useState<string | null>(personId.startsWith(SERVER_CONV_PREFIX) ? personId.slice(SERVER_CONV_PREFIX.length) : null);
  const [openError, setOpenError] = useState("");
  const [attempt, setAttempt] = useState(0);
  usePublicProfile(userId ? personId : "");
  const p = userId ? person(personId) : null;
  const name = p?.name ?? "Chat";

  // Find or create the conversation with this person
  useEffect(() => {
    if (!userId) return;
    let live = true;
    setOpenError("");
    chat
      .conversationWith(userId)
      .then((id) => live && setConvId(id))
      .catch((e) => live && setOpenError(e instanceof Error ? e.message : "Couldn't open this chat."));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, attempt]);

  const { openThread, closeThread } = chat;
  useEffect(() => {
    if (!convId) return;
    openThread(convId);
    return () => closeThread(convId);
  }, [convId, openThread, closeThread]);

  // The chat as the list knows it: group or direct, muted, blocked, who's online
  const conv = convId ? chat.inbox.data?.find((c) => c.id === convId) : undefined;
  const group = conv?.kind === "GROUP";
  const official = Boolean(conv?.systemConversation || conv?.official);
  const { info: groupInfo, setInfo: setGroupInfo } = useGroupInfo(convId, Boolean(group));
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const otherId = userId ?? conv?.otherUserId ?? null;
  const { watchPresence, loadInbox } = chat;
  useEffect(() => {
    if (!chat.inbox.data) loadInbox();
  }, [chat.inbox.data, loadInbox]);
  useEffect(() => {
    if (otherId && !group) watchPresence([otherId]);
  }, [otherId, group, watchPresence]);
  const typers = convId ? Object.values(chat.typing[convId] ?? {}) : [];
  const memberName = (id?: string) => (id ? (groupInfo?.members.find((m) => m.userId === id)?.name ?? person(`${SERVER_USER_PREFIX}${id}`).name) : "");
  const blocked = conv?.blockedByMe ? "byMe" : conv?.blockedMe ? "me" : null;

  const thread = convId ? chat.threads[convId] : undefined;
  const messages = thread?.messages ?? [];
  const pending = chat.outgoing.filter((o) => o.conversationId === convId);
  const pendingImages = pending.filter((o) => o.kind === "image");
  const failedText = pending.find((o) => o.kind === "text" && o.status === "failed");

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickError, setPickError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const keepFrom = useRef<{ height: number; top: number } | null>(null);
  const lastId = messages[messages.length - 1]?.id;

  // Older page loaded: keep what you were looking at in place
  useLayoutEffect(() => {
    const el = scroller.current;
    const k = keepFrom.current;
    if (el && k) {
      el.scrollTop = el.scrollHeight - k.height + k.top;
      keepFrom.current = null;
    }
  }, [messages.length]);
  // New newest message (or first load): to the bottom
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, pendingImages.length]);

  const loadOlder = () => {
    const el = scroller.current;
    if (!convId || !el) return;
    keepFrom.current = { height: el.scrollHeight, top: el.scrollTop };
    void chat.loadOlder(convId);
  };

  const send = async () => {
    const t = draft.trim();
    if (!t || !convId || busy) return;
    if (failedText) chat.discard(failedText.tempId);
    setPickError("");
    setBusy(true);
    const ok = await chat.sendText(convId, t);
    setBusy(false);
    // The text stays in the box until the server has it
    if (ok) setDraft("");
  };

  const pick = (f: File | undefined) => {
    if (!f || !convId) return;
    const err = checkChatImage(f);
    setPickError(err);
    if (!err) void chat.sendImage(convId, f);
  };

  const live = status === "connected" ? "" : status === "connecting" || status === "reconnecting" ? "Connecting…" : status === "auth-failed" ? "Live updates off. Sign in again." : "";

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="pt-safe border-b border-line bg-ink/95">
        <div className="flex h-14 items-center gap-2 px-2">
          <IconButton label="Back" onClick={pop} className="!bg-transparent">
            <ChevronLeft className="h-6 w-6" />
          </IconButton>
          <button type="button" disabled={!userId && !group} onClick={() => (official ? push({ kind: "sarpanch" }) : group ? setInfoOpen(true) : setSheet({ kind: "person", personId }))} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            {group ? (
              <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-[#f4515b] text-white">
                <Users className="h-5 w-5" aria-hidden />
              </span>
            ) : p ? (
              <span className="relative shrink-0">
                <PersonAvatar person={p} size={38} />
                {otherId && chat.presence[otherId]?.online ? <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-speak ring-2 ring-ink" /> : null}
              </span>
            ) : null}
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold text-cream">{group ? (groupInfo?.name ?? conv?.otherName ?? "Group") : name}</span>
              <span className={`block truncate text-[11px] ${typers.length ? "text-speak" : "text-muted"}`} role="status">
                {live ||
                  (typers.length
                    ? group
                      ? typingLine(typers)
                      : "typing…"
                    : group
                      ? `${groupInfo?.members.length ?? conv?.memberCount ?? ""} members${groupInfo ? ` · ${groupInfo.members.filter((m) => (chat.presence[m.userId] ?? m).online).length} online` : ""}`
                      : presenceText(otherId ? chat.presence[otherId] : undefined))}
              </span>
            </span>
          </button>
          {conv ? (
            <IconButton label={group ? "Group info" : "Chat options"} onClick={() => (group ? setInfoOpen(true) : setMenuOpen(true))} className="!bg-transparent">
              <MoreVertical className="h-5 w-5" />
            </IconButton>
          ) : null}
        </div>
      </header>

      <div ref={scroller} className="app-scroll min-h-0 flex-1 space-y-2 px-3 py-4" aria-live="polite">
        {openError ? (
          <div className="mx-auto flex max-w-[300px] flex-col items-center gap-2 pt-10 text-center text-[13px] text-cream/80" role="alert">
            {openError}
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="rounded-full bg-gold/15 px-4 py-1.5 text-[12px] font-bold text-gold">
              Try again
            </button>
          </div>
        ) : null}
        {thread && thread.nextPage !== null && thread.nextPage > 0 ? (
          <div className="flex justify-center">
            <button type="button" onClick={loadOlder} disabled={thread.loadingOlder} className="flex items-center gap-1.5 rounded-full bg-cream/[0.06] px-3 py-1 text-[11.5px] font-semibold text-cream/80">
              {thread.loadingOlder ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null} Load earlier messages
            </button>
          </div>
        ) : null}
        {(!convId && !openError) || (thread?.loading && messages.length === 0) ? (
          <div className="grid place-items-center pt-10" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-gold" aria-label="Loading messages" />
          </div>
        ) : null}
        {thread?.error ? (
          <p className="mx-auto w-fit rounded-full bg-coral/10 px-3 py-1 text-center text-[11.5px] text-coral" role="alert">
            {thread.error}{" "}
            <button type="button" onClick={() => convId && openThread(convId)} className="font-bold underline">
              Retry
            </button>
          </p>
        ) : null}
        {thread && !thread.loading && !thread.error && messages.length === 0 && pendingImages.length === 0 ? <p className="pt-10 text-center text-[13px] text-muted">No messages yet. Say hi 👋</p> : null}
        {messages.map((m, i) => {
          const mine = Boolean(chat.myId && m.senderId === chat.myId);
          // Groups: the sender's name over the first of their messages in a row
          const from = group && !mine && messages[i - 1]?.senderId !== m.senderId ? memberName(m.senderId) : undefined;
          if (m.type === "SYSTEM") return <SystemBubble key={m.id} m={m} />;
          return <Bubble key={m.id} m={m} mine={mine} from={from} />;
        })}
        {typers.length ? (
          <div className="flex justify-start" aria-live="polite">
            <span className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg bg-surface px-3.5 py-2.5 text-[12px] text-muted">
              <span className="flex gap-0.5" aria-hidden>
                {[0, 1, 2].map((d) => (
                  <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-cream/60" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }} />
                ))}
              </span>
              {group ? typingLine(typers) : `${name} is typing`}
            </span>
          </div>
        ) : null}
        {pendingImages.map((o) => (
          <PendingImage key={o.tempId} o={o} onRetry={() => chat.retry(o.tempId)} onDiscard={() => chat.discard(o.tempId)} />
        ))}
      </div>

      {!blocked && !group && conv?.requestState === "PENDING" && convId ? (
        <div className="border-t border-line bg-[#7b5cff]/10 px-4 py-3" role="status">
          <p className="text-center text-[12.5px] text-cream/85">
            <b>{name}</b> isn&apos;t your friend yet and sent you a message request. Reply or accept to chat.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void declineChatRequest(convId).then(() => (loadInbox(true), pop())).catch(() => undefined)} className="h-9 rounded-full bg-white/10 text-[13px] font-bold text-cream">
              Delete
            </button>
            <button type="button" onClick={() => void acceptChatRequest(convId).then(() => loadInbox(true)).catch(() => undefined)} className="h-9 rounded-full bg-gradient-to-r from-[#7b5cff] to-coral text-[13px] font-bold text-white">
              Accept
            </button>
          </div>
        </div>
      ) : null}
      {!blocked && !group && conv && conv.requestState !== "PENDING" && conv.theirRequestState && conv.theirRequestState !== "ACCEPTED" && messages.some((m) => m.senderId === chat.myId) ? (
        <div className="border-t border-line bg-cream/[0.04] px-4 py-2.5 text-center text-[12px] text-muted" role="status">
          ✉️ Message request sent. You can send more once {name} accepts it or you become friends.
        </div>
      ) : null}
      {blocked ? (
        <div className="border-t border-line bg-cream/[0.04] px-4 py-2.5 text-center text-[12.5px] text-muted" role="status">
          {blocked === "byMe" ? (
            <>
              You blocked {name}.{" "}
              <button type="button" onClick={() => setMenuOpen(true)} className="font-bold text-gold underline">
                Unblock
              </button>
            </>
          ) : (
            "You can't reply to this chat."
          )}
        </div>
      ) : null}
      {convId && group ? <GroupInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} conversationId={convId} group={groupInfo} onChanged={setGroupInfo} /> : null}
      {!group ? <ChatMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} c={conv} name={name} personId={personId} /> : null}
      {failedText || pickError ? (
        <p className="border-t border-line bg-coral/10 px-4 py-2 text-[12px] font-semibold text-coral" role="alert">
          {failedText?.error ?? pickError}
        </p>
      ) : null}
      {official ? (
        <div className="pb-safe border-t border-line bg-ink/95 px-4 py-3 text-center text-[12px] text-muted" role="status">
          <span className="inline-flex items-center gap-1">
            <OfficialTick className="h-3.5 w-3.5" /> Official messages from Panchayat. You can&apos;t reply here.
          </span>
        </div>
      ) : (
      <form
        className="pb-safe border-t border-line bg-ink/95"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <IconButton label="Send a photo" onClick={() => fileInput.current?.click()}>
            <ImagePlus className="h-5 w-5" />
          </IconButton>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            aria-label="Photo to send"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (convId) chat.setTyping(convId, e.target.value.trim().length > 0);
            }}
            onBlur={() => convId && chat.setTyping(convId, false)}
            placeholder={`Message ${group ? (groupInfo?.name ?? conv?.otherName ?? "the group") : name}`}
            aria-label={`Message ${group ? (groupInfo?.name ?? "the group") : name}`}
            maxLength={CHAT_TEXT_MAX}
            disabled={busy || !convId || Boolean(blocked)}
            className="h-11 min-w-0 flex-1 rounded-full bg-surface px-4 text-[14px] text-cream ring-1 ring-line placeholder:text-muted/70 focus:outline-none focus:ring-gold/40 disabled:opacity-60"
          />
          <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!draft.trim() || busy || !convId || Boolean(blocked)} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full bg-coral text-white disabled:opacity-40">
            {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Send className="h-[18px] w-[18px]" />}
          </motion.button>
        </div>
      </form>
      )}
    </div>
  );
}
