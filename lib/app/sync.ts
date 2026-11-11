/**
 * A tiny "this changed on the server" signal, so screens that show the same
 * data refetch it after a successful change instead of waiting for a reload.
 *
 * Only sent after the backend accepted the change. Each listener refetches
 * just its own data (no polling, nothing faked):
 * - "my-cosmetics": you wore or took off a VIP cosmetic. Listeners: your
 *   cosmetics (inventory + equipped), GET /users/me, the room you're in
 *   (participants), and your own public profile if it's open.
 * - "my-profile": your profile, picture or banner changed. Listeners: the room
 *   you're in, and your own public profile if it's open. (GET /users/me already
 *   applies the backend's answer itself.)
 */
export type SyncTopic = "my-cosmetics" | "my-profile";

const subs = new Map<SyncTopic, Set<() => void>>();

/** Listen for one or more topics; returns the unsubscribe function. */
export function onSync(topics: SyncTopic[], cb: () => void): () => void {
  for (const t of topics) {
    if (!subs.has(t)) subs.set(t, new Set());
    subs.get(t)!.add(cb); 
  }
  return () => {
    for (const t of topics) subs.get(t)?.delete(cb);
  };
}

/** Tell every listener. A listener on several topics runs once per call. */
export function emitSync(topic: SyncTopic) {
  for (const cb of [...(subs.get(topic) ?? [])]) {
    try {
      cb();
    } catch {
      /* one listener failing doesn't stop the others */
    }
  }
}
