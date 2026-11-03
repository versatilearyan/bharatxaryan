/**
 * The one place the app talks to the Panchayat backend.
 *
 * - Requests go to this app's /backend path, which the Next.js server forwards
 *   to the backend (lib/config.ts, next.config.ts). A new ngrok URL only needs
 *   BACKEND_URL changed and the dev server restarted.
 * - JSON in and out, with a timeout, and errors turned into ApiError with a
 *   message that is safe to show (no stack traces or server internals).
 * - Protected calls (auth: true) send `Authorization: Bearer <backend JWT>`.
 *   Public sign-in calls never send a token. A 401/403 on a protected call, or
 *   a token that has already expired, signs the person out (see
 *   setUnauthorizedHandler); a failed sign-in call never does, so there is no
 *   redirect loop.
 */
import { authHeader, clearToken, isFresh, readToken, saveToken, type Stored } from "@/lib/auth/token";
import { API_BASE_URL_SETTING, backendOrigin } from "@/lib/config";

/**
 * The server's origin. Paths below already start with /api/v1, so a base URL
 * given with /api/v1 on the end has it removed instead of doubling it.
 */
export const API_BASE_URL = backendOrigin(API_BASE_URL_SETTING);
/**
 * Sends `ngrok-skip-browser-warning: 1` so ngrok's free-tier "You are about to
 * visit" page never replaces an API answer. Set NEXT_PUBLIC_SEND_NGROK_HEADER=false once the backend
 * isn't behind ngrok any more.
 */
const SKIP_NGROK_WARNING = process.env.NEXT_PUBLIC_SEND_NGROK_HEADER !== "false";
const DEFAULT_TIMEOUT_MS = 15000;

export type ApiErrorCode = "network" | "timeout" | "config" | "ngrok_interstitial" | "unauthorized" | "forbidden" | "http";

export class ApiError extends Error {
  /** HTTP status, or 0 when the request never got an answer. */
  status: number;
  code: ApiErrorCode;
  /** Field → message, when the backend sent validation errors. */
  fields: Record<string, string>;
  constructor(message: string, status: number, code: ApiErrorCode, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let onUnauthorized: ((reason: "expired" | "rejected") => void) | null = null;
/** The app store registers sign-out here. */
export function setUnauthorizedHandler(fn: typeof onUnauthorized) {
  onUnauthorized = fn;
}

/**
 * forbiddenIsAccess: treat 403 as "you can't do this" (e.g. a private room, or
 * closing someone else's room) instead of a dead session. 401 still signs out.
 */
type Options = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; auth?: boolean; timeoutMs?: number; forbiddenIsAccess?: boolean };

/* ---- Sessions: keep the short access token fresh with the refresh token ---- */

let refreshing: Promise<Stored | null> | null = null;

async function callRefresh(stale: Stored): Promise<Stored | null> {
  // Another tab may have refreshed while we waited for the lock: use its token
  const now = readToken();
  if (!now) return null;
  if (now.accessToken !== stale.accessToken && isFresh(now)) return now;
  if (!now.refreshToken) {
    clearToken();
    return null;
  }
  let res: Response;
  try {
    const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
    if (SKIP_NGROK_WARNING) headers["ngrok-skip-browser-warning"] = "1";
    res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, { method: "POST", headers, body: JSON.stringify({ refreshToken: now.refreshToken }) });
  } catch {
    // Offline or server down: not a sign-out, the session may still be good
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0, "network");
  }
  if (res.status === 401 || res.status === 400) {
    // The session ended (expired, signed out elsewhere, or already used)
    clearToken();
    return null;
  }
  const data = (await res.json().catch(() => null)) as { accessToken?: unknown; tokenType?: unknown; refreshToken?: unknown } | null;
  if (!res.ok || !data || typeof data.accessToken !== "string" || !data.accessToken) {
    throw new ApiError("The server had a problem. Try again in a moment.", res.status, "http");
  }
  saveToken(data.accessToken, typeof data.tokenType === "string" ? data.tokenType : "Bearer", typeof data.refreshToken === "string" ? data.refreshToken : now.refreshToken);
  return readToken();
}

/**
 * The access token to send, renewed first when it has under a minute left
 * (or always, with force). null = signed out. Only one refresh runs at a time,
 * across tabs too (each refresh token works once).
 */
export async function freshToken(force = false): Promise<Stored | null> {
  const t = readToken();
  if (!t) return null;
  if (!force && isFresh(t)) return t;
  if (!t.refreshToken) return isFresh(t, 0) ? t : null;
  if (!refreshing) {
    const run = () => callRefresh(t);
    const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: { request: (name: string, cb: () => Promise<Stored | null>) => Promise<Stored | null> } }).locks : undefined;
    const started: Promise<Stored | null> = locks ? Promise.resolve(locks.request("panchayat-token-refresh", run)) : run();
    refreshing = started.finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (e) {
    // The server didn't accept a token we thought was good: renew it once and try again
    if (options.auth && e instanceof RetryWithNewToken) {
      const t = await freshToken(true);
      if (t) return request<T>(path, options, true);
      onUnauthorized?.("rejected");
      throw new ApiError("Your session has ended. Please sign in again.", 401, "unauthorized");
    }
    throw e;
  }
}

class RetryWithNewToken extends Error {}

async function request<T>(path: string, { method = "GET", body, auth = false, timeoutMs = DEFAULT_TIMEOUT_MS, forbiddenIsAccess = false }: Options = {}, retried = false): Promise<T> {
  if (!API_BASE_URL) throw new ApiError("The app isn't connected to a server yet. Set BACKEND_URL in .env.local.", 0, "config");

  const headers: Record<string, string> = { Accept: "application/json" };
  // FormData (file uploads): the browser sets multipart/form-data with its boundary
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (SKIP_NGROK_WARNING) headers["ngrok-skip-browser-warning"] = "1";
  if (auth) {
    const token = await freshToken();
    if (!token) {
      onUnauthorized?.("expired");
      throw new ApiError("Your session has ended. Please sign in again.", 401, "unauthorized");
    }
    Object.assign(headers, authHeader(token));
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body), signal: ctrl.signal });
  } catch (e) {
    if (ctrl.signal.aborted) throw new ApiError("The server is taking too long to answer. Try again.", 0, "timeout");
    // fetch rejects without detail for offline, DNS, a stopped ngrok tunnel and CORS blocks alike
    void e;
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0, "network");
  } finally {
    clearTimeout(timer);
  }

  const type = res.headers.get("content-type") ?? "";
  const text = await res.text().catch(() => "");
  if (type.includes("text/html") && /ngrok/i.test(text)) {
    throw new ApiError("The server tunnel showed its warning page instead of answering. See README → Backend.", res.status, "ngrok_interstitial");
  }
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (res.ok) return data as T;

  const { message, fields } = readError(data);
  if (auth && (res.status === 401 || (res.status === 403 && !forbiddenIsAccess))) {
    if (!retried && readToken()?.refreshToken) throw new RetryWithNewToken();
    onUnauthorized?.("rejected");
    throw new ApiError("Your session has ended. Please sign in again.", res.status, res.status === 401 ? "unauthorized" : "forbidden", fields);
  }
  throw new ApiError(friendly(res.status, message), res.status, res.status === 401 ? "unauthorized" : res.status === 403 ? "forbidden" : "http", fields);
}

/** Pull a message and field errors out of the common Spring Boot error shapes. */
function readError(data: unknown): { message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  if (!data || typeof data !== "object") return { message: "", fields };
  const d = data as Record<string, unknown>;
  const errs = d.errors ?? d.fieldErrors;
  if (Array.isArray(errs)) {
    for (const e of errs) {
      if (e && typeof e === "object") {
        const o = e as Record<string, unknown>;
        const f = typeof o.field === "string" ? o.field : "";
        const m = typeof o.defaultMessage === "string" ? o.defaultMessage : typeof o.message === "string" ? o.message : "";
        if (f && m) fields[f] = m;
      }
    }
  } else if (errs && typeof errs === "object") {
    for (const [k, v] of Object.entries(errs)) if (typeof v === "string") fields[k] = v;
  }
  const raw = [d.message, d.error_description, d.detail, d.error].find((v) => typeof v === "string" && v.trim()) as string | undefined;
  return { message: raw ?? Object.values(fields)[0] ?? "", fields };
}

/** Show the backend's own message for client errors, but never anything that looks internal. */
function friendly(status: number, message: string) {
  const internal = !message || message.length > 160 || /exception|stack|sql|jdbc|hibernate|smtp|at [\w.$]+\(|org\.|java\./i.test(message);
  if (status >= 500) return "Something went wrong on our side. Try again in a moment.";
  if (status === 413) return "That file is too large for the server. Choose a smaller image.";
  if (status === 415) return "The server doesn't accept that file type. Use a JPG, PNG or WebP image.";
  if (status === 429) return internal ? "Too many attempts. Wait a little and try again." : message;
  if (internal) return status === 404 ? "That service isn't available right now." : "That didn't work. Check your details and try again.";
  return message;
}
