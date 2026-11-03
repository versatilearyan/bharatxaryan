"use client";

/**
 * One shared STOMP connection for the whole app (private chat and voice-room
 * chat), over a plain WebSocket to CHAT_WS_URL_SETTING.
 *
 * - Auth: the signed-in user's JWT goes in the STOMP CONNECT frame as
 *   `Authorization: Bearer …` (never in the URL, never logged). The backend
 *   resolves the user from it, so no client-side sender id is ever sent.
 * - Connects only while something is subscribed, and only when signed in.
 *   Re-renders can subscribe and unsubscribe freely: subscriptions are counted
 *   here, so there's one connection and one STOMP subscription per destination
 *   callback.
 * - Reconnects after a dropped connection with capped exponential backoff
 *   (1 s, 2 s, 4 s … up to 30 s), immediately when the browser comes back
 *   online. A STOMP ERROR that looks like an auth refusal stops retrying until
 *   the token changes.
 * - After a reconnect every subscription is made again.
 */
import { Client, type StompSubscription } from "@stomp/stompjs";
import { useSyncExternalStore } from "react";
import { authHeader, readToken } from "@/lib/auth/token";
import { freshToken } from "@/lib/api/client";
import { CHAT_WS_URL_SETTING } from "@/lib/config";

export type StompStatus = "idle" | "connecting" | "connected" | "reconnecting" | "auth-failed";

type Entry = { dest: string; cb: (body: unknown) => void; sub?: StompSubscription };

const subs = new Map<number, Entry>();
let nextId = 1;
let client: Client | null = null;
let status: StompStatus = "idle";
let attempts = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
/** The token a STOMP auth refusal was for: no retries with it. */
let refusedToken: string | null = null;
const statusListeners = new Set<() => void>();

const dev = process.env.NODE_ENV !== "production";
const setStatus = (s: StompStatus) => {
  if (status === s) return;
  status = s;
  statusListeners.forEach((l) => l());
};

const AUTH_REFUSAL = /unauthori[sz]ed|forbidden|access.?denied|authenticat|\b40[13]\b|jwt|token/i;

function attach(e: Entry) {
  if (!client?.connected || e.sub) return;
  e.sub = client.subscribe(e.dest, (m) => {
    let body: unknown;
    try {
      body = m.body ? JSON.parse(m.body) : null;
    } catch {
      // Not JSON: ignored. The content isn't logged (it may be a private message).
      if (dev) console.warn(`[STOMP] Ignored a message on ${e.dest} that isn't JSON.`);
      return;
    }
    e.cb(body);
  });
}

function stop() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  const c = client;
  client = null;
  for (const e of subs.values()) e.sub = undefined;
  if (c) void c.deactivate();
}

function scheduleRetry() {
  if (retryTimer || subs.size === 0) return;
  const delay = Math.min(30_000, 1000 * 2 ** attempts) + Math.floor(Math.random() * 400);
  attempts += 1;
  setStatus("reconnecting");
  retryTimer = setTimeout(() => {
    retryTimer = null;
    ensure();
  }, delay);
}

/** Connect if something is subscribed, we're signed in, and not refused for this token. */
function ensure() {
  if (typeof window === "undefined" || subs.size === 0 || client) return;
  const t = readToken();
  if (!t) {
    setStatus("idle");
    return;
  }
  if (refusedToken === t.accessToken) {
    setStatus("auth-failed");
    return;
  }
  const c = new Client({
    brokerURL: CHAT_WS_URL_SETTING,
    // Reconnects are handled here (backoff, auth refusal), not by the library
    reconnectDelay: 0,
    heartbeatIncoming: 20_000,
    heartbeatOutgoing: 20_000,
    debug: () => {},
    beforeConnect: async () => {
      // Renew an expiring access token first, so a reconnect after a long time still signs in
      const now = await freshToken().catch(() => readToken());
      if (now) c.connectHeaders = authHeader(now);
    },
    onConnect: () => {
      if (client !== c) return;
      attempts = 0;
      setStatus("connected");
      for (const e of subs.values()) {
        e.sub = undefined;
        attach(e);
      }
    },
    onStompError: (frame) => {
      if (client !== c) return;
      const msg = `${frame.headers.message ?? ""} ${frame.body ?? ""}`;
      if (AUTH_REFUSAL.test(msg)) {
        refusedToken = readToken()?.accessToken ?? t.accessToken;
        stop();
        setStatus("auth-failed");
        if (dev) console.warn("[STOMP] The server refused the connection (sign-in). Not retrying until you sign in again.");
      }
    },
    onWebSocketClose: () => {
      if (client !== c) return;
      // Dropped: start over with a new client after a pause
      client = null;
      for (const e of subs.values()) e.sub = undefined;
      void c.deactivate();
      scheduleRetry();
    },
  });
  client = c;
  setStatus(attempts ? "reconnecting" : "connecting");
  c.activate();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
      attempts = 0;
      ensure();
    }
  });
}

/**
 * Listen on a STOMP destination. The callback gets each message's JSON body.
 * Returns the function that stops listening (safe to call more than once).
 */
export function subscribe(dest: string, cb: (body: unknown) => void): () => void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  const id = nextId++;
  const e: Entry = { dest, cb };
  subs.set(id, e);
  if (client?.connected) attach(e);
  else ensure();
  return () => {
    const cur = subs.get(id);
    if (!cur) return;
    subs.delete(id);
    try {
      cur.sub?.unsubscribe();
    } catch {
      /* connection already gone */
    }
    // Nothing left: close shortly (a re-render may subscribe again right away)
    if (subs.size === 0 && !idleTimer)
      idleTimer = setTimeout(() => {
        idleTimer = null;
        if (subs.size === 0) {
          stop();
          attempts = 0;
          setStatus("idle");
        }
      }, 1500);
  };
}

/** Send a JSON body to an /app/... destination. Throws when not connected, so the caller can show it failed. */
export function publish(dest: string, body: unknown) {
  if (!client?.connected) throw new Error("Not connected to chat right now. Try again in a moment.");
  client.publish({ destination: dest, body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}

/** Drop the connection and forget any auth refusal (sign-out, or a new sign-in). */
export function resetRealtime() {
  refusedToken = null;
  attempts = 0;
  stop();
  setStatus("idle");
  ensure();
}

export const stompStatus = () => status;

/** The connection's state, for showing "Connecting…" or "Reconnecting…". */
export function useStompStatus(): StompStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => "idle",
  );
}
