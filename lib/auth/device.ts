/**
 * The id of this phone, sent when someone signs in or opens an account (X-Device-Id) so the server can keep it to one
 * account per phone. Inside the Android app the app injects the phone's own id (window.__PANCHAYAT_DEVICE__), which
 * survives clearing the app's data. In a browser it's a random id kept in the browser's storage.
 */
const KEY = "panchayat.device";

declare global {
  interface Window {
    __PANCHAYAT_DEVICE__?: string;
  }
}

const ok = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9._-]{16,100}$/.test(v);

function random(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `web-${crypto.randomUUID()}`;
  } catch {
    /* fall through */
  }
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function deviceId(): string | null {
  if (typeof window === "undefined") return null;
  if (ok(window.__PANCHAYAT_DEVICE__)) return window.__PANCHAYAT_DEVICE__;
  try {
    const have = window.localStorage.getItem(KEY);
    if (ok(have)) return have;
    const id = random();
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    return null;
  }
}

/** Headers for the sign-in and sign-up calls. */
export function deviceHeaders(): Record<string, string> | undefined {
  const id = deviceId();
  return id ? { "X-Device-Id": id } : undefined;
}
