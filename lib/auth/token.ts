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
 * There is no refresh token: when the JWT expires the person signs in again.
 * Never log the token.
 */

const TOKEN_KEY = "panchayat-auth-token-v1";

type Stored = { accessToken: string; tokenType: string };

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

export function saveToken(accessToken: string, tokenType = "Bearer") {
  try {
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken, tokenType: tokenType || "Bearer" } satisfies Stored));
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

/** The stored token if it's still in date; an expired one is cleared and null returned. */
export function readToken(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(window.localStorage.getItem(TOKEN_KEY) ?? "null") as Stored | null;
    if (!s || typeof s.accessToken !== "string" || !s.accessToken) return null;
    const exp = expiryOf(s.accessToken);
    // 30 seconds of slack so a token doesn't expire mid-request
    if (exp !== null && exp * 1000 <= Date.now() + 30_000) {
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
