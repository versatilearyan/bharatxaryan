/**
 * Public settings for the backend and Google sign-in. Never put secrets here.
 *
 * The browser never calls the backend directly. It calls this app's own
 * `/backend/...` path, and the Next.js server forwards that to the backend
 * (see `rewrites` in next.config.ts). Same origin means no CORS preflight, so
 * a new ngrok URL only has to be set in one place: BACKEND_URL below (or the
 * BACKEND_URL variable in .env.local, which wins). Restart `npm run dev` after
 * changing it.
 *
 * NEXT_PUBLIC_API_BASE_URL is only used when NEXT_PUBLIC_USE_API_PROXY=false,
 * for hosting where there's no Next.js server to forward requests.
 */
export const DEFAULT_BACKEND_URL = "https://f829-2401-4900-8913-7e7f-edbd-ec4a-ff05-9abf.ngrok-free.app";
const DEFAULT_GOOGLE_CLIENT_ID = "688204337983-ao5gnds2t1p6tq0qn5m9p53ttoo9t1mt.apps.googleusercontent.com";

/** The path in this app that forwards to the backend. */
export const API_PROXY_PATH = "/backend";

/** Backend origin with any trailing slash or /api/v1 removed (paths in the app already start with /api/v1). */
export const backendOrigin = (url: string) => url.trim().replace(/\/+$/, "").replace(/\/api\/v1$/i, "");

// Written out in full so Next.js can inline them at build time
const USE_PROXY = process.env.NEXT_PUBLIC_USE_API_PROXY !== "false";
export const API_BASE_URL_SETTING = USE_PROXY ? API_PROXY_PATH : process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BACKEND_URL;
export const GOOGLE_CLIENT_ID_SETTING = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID;
