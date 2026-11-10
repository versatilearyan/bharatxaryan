import type { NextConfig } from "next";
import { API_PROXY_PATH, DEFAULT_BACKEND_URL, backendOrigin } from "./lib/config";

/** Where /backend/... is forwarded. BACKEND_URL in .env.local wins over the default in lib/config.ts. */
const BACKEND = backendOrigin(process.env.BACKEND_URL || DEFAULT_BACKEND_URL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Uploads pass through the /backend proxy: Moments videos can be up to 60 MB
    proxyClientMaxBodySize: "70mb",
  },
  async headers() {
    // Pictures and sounds in /public keep their names between releases: let browsers keep them for an hour, then check again
    const revalidate = [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }];
    return ["backgrounds", "gifts", "brand", "charm", "effects", "rings", "ranking", "audio", "chess"].map((d) => ({ source: `/${d}/:path*`, headers: revalidate }));
  },
  async rewrites() {
    // The browser calls this app; the server passes it on, so the backend needs no CORS setup for it
    return [{ source: `${API_PROXY_PATH}/:path*`, destination: `${BACKEND}/:path*` }];
  },
};

export default nextConfig;
