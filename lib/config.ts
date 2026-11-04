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
<<<<<<< HEAD
// Only a fallback for local development: production sets BACKEND_URL (server) and
// NEXT_PUBLIC_CHAT_WS_URL (live connection) in its environment. No tunnel address is hardcoded.
export const DEFAULT_BACKEND_URL = "http://localhost:8080";
=======
export const DEFAULT_BACKEND_URL = "https://api.panchayat.world/";
>>>>>>> 5860b43 (  feat done)
const DEFAULT_GOOGLE_CLIENT_ID = "688204337983-ao5gnds2t1p6tq0qn5m9p53ttoo9t1mt.apps.googleusercontent.com";

/** The path in this app that forwards to the backend. */
export const API_PROXY_PATH = "/backend";

/** Backend origin with any trailing slash or /api/v1 removed (paths in the app already start with /api/v1). */
export const backendOrigin = (url: string) => url.trim().replace(/\/+$/, "").replace(/\/api\/v1$/i, "");

// Written out in full so Next.js can inline them at build time
const USE_PROXY = process.env.NEXT_PUBLIC_USE_API_PROXY !== "false";
export const API_BASE_URL_SETTING = USE_PROXY ? API_PROXY_PATH : process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BACKEND_URL;
export const GOOGLE_CLIENT_ID_SETTING = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID;

/**
 * The chess game server (chess-server/ in this project, from DevChess). The
 * browser talks to it directly over WebSocket. On an https site it must be a
 * wss:// URL. Locally run it with `PORT=8090 npm run dev` inside chess-server/.
 */
export const CHESS_WS_URL = process.env.NEXT_PUBLIC_CHESS_WS_URL?.trim() || "ws://localhost:8090";

/**
 * The backend's STOMP WebSocket endpoint (private chat and voice-room chat).
 * The browser connects to it directly, not through the /backend proxy, so it
 * needs the backend's own address. Set NEXT_PUBLIC_CHAT_WS_URL to the full
 * ws:// or wss:// URL of the endpoint registered in the backend's
 * WebSocketMessageBrokerConfigurer (for a SockJS endpoint "/ws", use
 * ".../ws/websocket"). Not verified against the backend: the default below is
 * DEFAULT_BACKEND_URL with wss:// and "/ws".
 */
export const CHAT_WS_URL_SETTING = process.env.NEXT_PUBLIC_CHAT_WS_URL?.trim() || `${backendOrigin(DEFAULT_BACKEND_URL).replace(/^http/i, "ws")}/ws`;
