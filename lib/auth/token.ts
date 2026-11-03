/**
 * The backend-issued JWT (never the Google ID token).
 *
 * The backend returns the token in the response body and expects it back as a
 * Bearer header, so it has to live where JavaScript can read it. It is kept in
 * localStorage so a reload stays signed in. Trade-off: any script running on
 * this origin (an XSS bug, a bad dependency) could read it, so localStorage is
 * NOT safe against XSS. If the backend later sets an HttpOnly, Secure,
 * SameSite cookie instead, drop this file and send requests with
 * `credentials: "include"`.
 *
 * Sessions: sign-in also returns a refresh token (days). The short access token
 * (minutes) is swapped for a new pair before it runs out (freshToken() in
 * lib/api/client.ts), so people stay signed in. Never log either token.
 */

const TOKEN_KEY = "panchayat-auth-token-v1";

export type Stored = { accessToken: string; tokenType: string; refreshToken?: string };

/** Seconds since epoch from the JWT's `exp`, or null if it has none or can't be read. Not a signature check. */
function expiryOf(jwt: string): number | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

export function saveToken(accessToken: string, tokenType = "Bearer", refreshToken?: string) {
  try {
    const data: Stored = { accessToken, tokenType: tokenType || "Bearer", ...(refreshToken ? { refreshToken } : {}) };
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: requests this visit will fail with 401 and ask to sign in again */
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Whether this access token still has more than `slackMs` left. */
export function isFresh(t: Stored, slackMs = 60_000): boolean {
  const exp = expiryOf(t.accessToken);
  return exp === null || exp * 1000 > Date.now() + slackMs;
}

/**
 * The stored session, or null when signed out. A session counts while its
 * access token is in date or it has a refresh token to get a new one, so this
 * is the "am I signed in?" check. For a request, use freshToken() instead,
 * which renews an expiring access token first.
 */
export function readToken(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(window.localStorage.getItem(TOKEN_KEY) ?? "null") as Stored | null;
    if (!s || typeof s.accessToken !== "string" || !s.accessToken) return null;
    if (s.refreshToken) return s;
    // No refresh token (signed in before sessions existed): 30 seconds of slack so it doesn't expire mid-request
    if (!isFresh(s, 30_000)) {
      clearToken();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function authHeader(t: Stored): Record<string, string> {
  // Some backends send "bearer"; the header scheme is case-insensitive but keep it tidy
  const scheme = /^bearer$/i.test(t.tokenType) ? "Bearer" : t.tokenType;
  return { Authorization: `${scheme} ${t.accessToken}` };
}

/** Milliseconds until the stored token expires, or null if unknown. */
export function msUntilExpiry(): number | null {
  const t = readToken();
  if (!t) return null;
  const exp = expiryOf(t.accessToken);
  return exp === null ? null : exp * 1000 - Date.now();
}

/** Your backend user id, from the stored access token's `sub` claim (not a signature check). */
export function myUserIdFromToken(): string | null {
  const t = readToken();
  if (!t) return null;
  try {
    const part = t.accessToken.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return typeof json.sub === "string" && /^\d+$/.test(json.sub) ? json.sub : null;
  } catch {
    return null;
  }
}
