"use client";

/**
 * Private chat with backend users (signed in): the inbox list and the
 * conversation view, in the same look as the demo chat screens. Data and
 * actions come from lib/app/chat-store.tsx.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ChevronLeft, ImagePlus, Loader2, RotateCcw, Send, X } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { IconButton } from "@/components/ui/kit";
import { usePublicProfile } from "@/components/profile/usePublicProfile";
import { checkChatImage, fetchChatImage, CHAT_TEXT_MAX, type ChatConversation, type ChatMessage } from "@/lib/api/chat";
import { useChat, type Outgoing } from "@/lib/app/chat-store";
import { usePeople } from "@/lib/app/people";
import { SERVER_USER_PREFIX, useServerPeople, useServerRooms } from "@/lib/app/server-rooms";
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

/** Downloaded image bytes, newest last; at most 40 kept. Each view makes (and revokes) its own object URL. */
const blobs = new Map<string, Promise<Blob>>();
function loadBlob(conversationId: string, messageId: string) {
  const key = `${conversationId}/${messageId}`;
  let p = blobs.get(key);
  if (p) {
    blobs.delete(key);
    blobs.set(key, p);
    return p;
  }
  p = fetchChatImage(conversationId, messageId);
  p.catch(() => blobs.delete(key));
  blobs.set(key, p);
  while (blobs.size > 40) blobs.delete(blobs.keys().next().value as string);
  return p;
}

function ChatImage({ conversationId, messageId }: { conversationId: string; messageId: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
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
    loadBlob(conversationId, messageId)
      .then((b) => {
        if (!live) return;
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Photo" className="block max-h-[280px] w-full object-cover" />
      ) : error ? (
        <button type="button" onClick={() => setTick((n) => n + 1)} className="flex flex-col items-center gap-1 p-3 text-[11.5px] text-cream/80">
          <AlertCircle className="h-5 w-5" aria-hidden />
          {error}
          <span className="font-bold underline">Try again</span>
        </button>
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-cream/70" aria-label="Loading image" />
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Inbox                                                               */
/* ------------------------------------------------------------------ */

function InboxRow({ c, onOpen }: { c: ChatConversation; onOpen: (personId: string) => void }) {
  const person = usePeople();
  const known = useServerPeople();
  const personId = c.otherUserId ? `${SERVER_USER_PREFIX}${c.otherUserId}` : "";
  // The response may not name the person: their public profile does (fetched once)
  usePublicProfile(personId && !c.otherName && !known[personId]?.name ? personId : "");
  const p = personId ? person(personId) : null;
  const name = c.otherName ?? (personId && known[personId]?.name) ?? (c.otherUserId ? `User ${c.otherUserId}` : "Chat");
  const unread = c.unreadCount ?? 0;
  return (
    <li>
      <motion.button type="button" whileTap={{ scale: 0.985 }} onClick={() => onOpen(personId || `${SERVER_CONV_PREFIX}${c.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cream/[0.03]" aria-label={`Chat with ${name}${unread ? `, ${unread} unread` : ""}`}>
        {p ? <PersonAvatar person={p} size={52} /> : <span className="h-[52px] w-[52px] rounded-full bg-surface" />}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`truncate text-[15px] ${unread ? "font-bold text-cream" : "font-semibold text-cream/90"}`}>{name}</span>
            <span className="ml-auto shrink-0 text-[11px] text-muted">{ago(c.lastAt)}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className={`truncate text-[13px] ${unread ? "text-cream/85" : "text-muted"}`}>{c.lastMessage ?? ""}</span>
            {unread ? <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-coral px-1.5 text-[10.5px] font-bold text-white">{unread}</span> : null}
          </span>
        </span>
      </motion.button>
    </li>
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
  const list = useMemo(
    () => (inbox.data ?? []).filter((c) => !needle || (c.otherName ?? (c.otherUserId ? person(`${SERVER_USER_PREFIX}${c.otherUserId}`).name : "")).toLowerCase().includes(needle)),
    [inbox.data, needle, person],
  );

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
      <ul>
        {list.map((c) => (
          <InboxRow key={c.id} c={c} onOpen={openConversation} />
        ))}
      </ul>
      {inbox.data && inbox.data.length === 0 ? <p className="px-6 pt-10 text-center text-sm text-muted">No chats yet. Open someone&apos;s profile and tap Chat to start one.</p> : null}
      {inbox.data && inbox.data.length > 0 && list.length === 0 ? <p className="px-4 pt-10 text-center text-sm text-muted">No chats match “{query}”.</p> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Conversation                                                        */
/* ------------------------------------------------------------------ */

function Bubble({ m, mine }: { m: ChatMessage; mine: boolean }) {
  const image = m.type === "IMAGE";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`} data-message-id={m.id}>
      <div className={`max-w-[78%] rounded-3xl ${image ? "p-1.5" : "px-3.5 py-2"} text-[14px] leading-snug ${mine ? "rounded-br-lg bg-coral text-white" : "rounded-bl-lg bg-surface text-cream"}`}>
        {image ? <ChatImage conversationId={m.conversationId} messageId={m.id} /> : <span className="whitespace-pre-wrap break-words">{m.text ?? ""}</span>}
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
  const { pop, setSheet } = useApp();
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
          <button type="button" disabled={!userId} onClick={() => setSheet({ kind: "person", personId })} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            {p ? <PersonAvatar person={p} size={38} /> : null}
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold text-cream">{name}</span>
              {live ? <span className="block text-[11px] text-muted" role="status">{live}</span> : null}
            </span>
          </button>
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
        {messages.map((m) => (
          <Bubble key={m.id} m={m} mine={Boolean(chat.myId && m.senderId === chat.myId)} />
        ))}
        {pendingImages.map((o) => (
          <PendingImage key={o.tempId} o={o} onRetry={() => chat.retry(o.tempId)} onDiscard={() => chat.discard(o.tempId)} />
        ))}
      </div>

      {failedText || pickError ? (
        <p className="border-t border-line bg-coral/10 px-4 py-2 text-[12px] font-semibold text-coral" role="alert">
          {failedText?.error ?? pickError}
        </p>
      ) : null}
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
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${name}`}
            aria-label={`Message ${name}`}
            maxLength={CHAT_TEXT_MAX}
            disabled={busy || !convId}
            className="h-11 min-w-0 flex-1 rounded-full bg-surface px-4 text-[14px] text-cream ring-1 ring-line placeholder:text-muted/70 focus:outline-none focus:ring-gold/40 disabled:opacity-60"
          />
          <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!draft.trim() || busy || !convId} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full bg-coral text-white disabled:opacity-40">
            {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Send className="h-[18px] w-[18px]" />}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
