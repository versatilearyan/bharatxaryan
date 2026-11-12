/**
 * The Android app (React Native) opens this website in a web view and answers a few questions the website can't:
 * Google sign-in, Google Play purchases and the phone's push-notification token.
 *
 * The app adds " PanchayatApp/<version>" to the browser's user agent. A message goes to the app with
 * window.ReactNativeWebView.postMessage and the app answers by calling window.__panchayatNativeReply.
 * In a normal browser none of this exists and isNativeApp() is false, so the website works as before.
 */
type Reply = { id: string; ok: boolean; data?: unknown; error?: string };
type Waiting = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: number };

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (data: string) => void };
    __panchayatNativeReply?: (r: Reply) => void;
  }
}

const waiting = new Map<string, Waiting>();
let seq = 0;
let installed = false;

export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Boolean(window.ReactNativeWebView) && /PanchayatApp\//.test(navigator.userAgent);
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.__panchayatNativeReply = (r) => {
    const w = waiting.get(r.id);
    if (!w) return;
    waiting.delete(r.id);
    window.clearTimeout(w.timer);
    if (r.ok) w.resolve(r.data);
    else w.reject(new Error(r.error || "That didn't work."));
  };
}

/** Ask the app something and wait for its answer. Rejects with the app's message (for example when the person cancels). */
export function nativeCall<T = unknown>(type: string, payload?: unknown, timeoutMs = 180_000): Promise<T> {
  if (!isNativeApp()) return Promise.reject(new Error("This only works in the Panchayat app."));
  install();
  const id = `n${Date.now().toString(36)}${++seq}`;
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      waiting.delete(id);
      reject(new Error("The app didn't answer. Try again."));
    }, timeoutMs);
    waiting.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
    window.ReactNativeWebView!.postMessage(JSON.stringify({ id, type, payload }));
  });
}

/** Tell the app something; no answer is expected. */
export function nativeEmit(type: string, payload?: unknown) {
  if (!isNativeApp()) return;
  try {
    window.ReactNativeWebView!.postMessage(JSON.stringify({ id: "", type, payload }));
  } catch {
    /* the app is not listening */
  }
}
