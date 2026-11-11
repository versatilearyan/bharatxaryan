import { NextResponse, type NextRequest } from "next/server";

/**
 * Local development only: calls to /backend/... are forwarded to the backend
 * (rewrites in next.config.ts), but the browser's Origin header rides along and
 * the backend's CORS check answers 403 to http://localhost:3000. In development,
 * drop that header on forwarded calls. Production is unchanged.
 */
export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.delete("origin");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/backend/:path*" };
