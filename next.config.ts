import type { NextConfig } from "next";
import { API_PROXY_PATH, DEFAULT_BACKEND_URL, backendOrigin } from "./lib/config";

/** Where /backend/... is forwarded. BACKEND_URL in .env.local wins over the default in lib/config.ts. */
const BACKEND = backendOrigin(process.env.BACKEND_URL || DEFAULT_BACKEND_URL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // The browser calls this app; the server passes it on, so the backend needs no CORS setup for it
    return [{ source: `${API_PROXY_PATH}/:path*`, destination: `${BACKEND}/:path*` }];
  },
};

export default nextConfig;
