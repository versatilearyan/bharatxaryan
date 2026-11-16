/**
 * What the server uses to keep one account per phone, sent when someone signs in or opens an account:
 *  - X-Device-Id: inside the Android app the phone's own id (window.__PANCHAYAT_DEVICE__, it survives clearing the app's
 *    data). In a browser a random id kept in three places at once (local storage, a cookie and IndexedDB), so clearing
 *    one of them does not make the person new.
 *  - X-Device-Fp: a hash of what the browser and device look like (screen, graphics chip, time zone and so on). It is
 *    not unique to one phone, so the server only uses it together with the network, to catch a private window or
 *    cleared data on the same phone and connection.
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

/* ---- the three places the browser id is kept ---- */

const fromStorage = (): string | null => {
  try {
    const v = window.localStorage.getItem(KEY);
    return ok(v) ? v : null;
  } catch {
    return null;
  }
};

const fromCookie = (): string | null => {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${KEY.replace(".", "\\.")}=([^;]+)`));
    return m && ok(m[1]) ? m[1] : null;
  } catch {
    return null;
  }
};

const idb = <T>(run: (store: IDBObjectStore) => IDBRequest<T>, write: boolean): Promise<T | null> =>
  new Promise((resolve) => {
    try {
      const open = indexedDB.open("panchayat-device", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("kv");
      open.onerror = () => resolve(null);
      open.onsuccess = () => {
        try {
          const tx = open.result.transaction("kv", write ? "readwrite" : "readonly");
          const req = run(tx.objectStore("kv"));
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => resolve(null);
          tx.oncomplete = () => open.result.close();
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });

const fromIdb = async (): Promise<string | null> => {
  const v = await idb<unknown>((s) => s.get(KEY), false);
  return ok(v) ? v : null;
};

function keep(id: string) {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* blocked */
  }
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${KEY}=${id}; max-age=63072000; path=/; SameSite=Lax${secure}`;
  } catch {
    /* blocked */
  }
  void idb((s) => s.put(id, KEY), true);
}

let cachedId: string | null | undefined;

export async function deviceId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (ok(window.__PANCHAYAT_DEVICE__)) return window.__PANCHAYAT_DEVICE__;
  if (cachedId !== undefined) return cachedId;
  const id = fromStorage() ?? fromCookie() ?? (await fromIdb()) ?? random();
  keep(id); // refill whichever place was cleared
  cachedId = id;
  return id;
}

/* ---- the fingerprint ---- */

async function sha256(text: string): Promise<string | null> {
  try {
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function canvasPart(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 40;
    const g = c.getContext("2d");
    if (!g) return "";
    g.textBaseline = "top";
    g.font = "16px Arial";
    g.fillStyle = "#f60";
    g.fillRect(10, 5, 80, 20);
    g.fillStyle = "#069";
    g.fillText("Panchayat \u{1f64f} 1234", 4, 8);
    return c.toDataURL().slice(-120);
  } catch {
    return "";
  }
}

function webglPart(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl") as WebGLRenderingContext | null;
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? `${gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)}|${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}` : String(gl.getParameter(gl.RENDERER));
  } catch {
    return "";
  }
}

let cachedFp: string | null | undefined;

export async function fingerprint(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (cachedFp !== undefined) return cachedFp;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const parts = [
    nav.platform,
    (nav.languages ?? []).join(","),
    `${screen.width}x${screen.height}x${screen.colorDepth}@${window.devicePixelRatio}`,
    String(nav.hardwareConcurrency ?? ""),
    String(nav.deviceMemory ?? ""),
    String(nav.maxTouchPoints ?? ""),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvasPart(),
    webglPart(),
  ];
  cachedFp = await sha256(parts.join("||"));
  return cachedFp;
}

/** Headers for the sign-in and sign-up calls. */
export async function deviceHeaders(): Promise<Record<string, string> | undefined> {
  const [id, fp] = await Promise.all([deviceId(), fingerprint()]);
  const h: Record<string, string> = {};
  if (id) h["X-Device-Id"] = id;
  if (fp) h["X-Device-Fp"] = fp;
  return Object.keys(h).length ? h : undefined;
}
