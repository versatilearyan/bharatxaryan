/**
 * Panchayat Co-op Adventure: a two-player 3D game (Godot, WebAssembly) served from /games/coop/.
 * The game and its voice share one code: the 7-digit ID of a Panchayat voice room. Both players are in that
 * voice room (so they can talk), and the game puts them in the same game room on the co-op game server.
 */

export const COOP_BASE = "/games/coop/";
const FILES = ["index.js", "index.pck", "index.wasm"];

/** The game server: a local one while developing, otherwise NEXT_PUBLIC_COOP_WS_URL or Panchayat's own. */
export function coopServerUrl(): string {
  const env = process.env.NEXT_PUBLIC_COOP_WS_URL?.trim();
  if (env) return env;
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || /^192\.168\./.test(h) || /^10\./.test(h)) return `ws://${h}:9080`;
  }
  return "wss://api.panchayat.world/coop-ws";
}

export function coopUrl(p: { code: string; name: string; character?: "boy" | "girl" }): string {
  const q = new URLSearchParams({ embed: "1", room: p.code, name: p.name.slice(0, 16), server: coopServerUrl() });
  if (p.character) q.set("character", p.character);
  return `${COOP_BASE}index.html?${q.toString()}`;
}

type Listener = (fraction: number) => void;
let started = false;
let done = false;
let progress = 0;
const listeners = new Set<Listener>();

/**
 * Downloads the game files in the background (once per visit), so the game opens straight away when you tap Play.
 * The browser keeps them in its cache; the game's own loader then reads them from there.
 */
export function preloadCoop(onProgress?: Listener): () => void {
  if (onProgress) {
    listeners.add(onProgress);
    onProgress(done ? 1 : progress);
  }
  if (!started && typeof window !== "undefined") {
    started = true;
    void (async () => {
      const sizes = new Map<string, number>();
      const got = new Map<string, number>();
      const report = () => {
        const total = [...sizes.values()].reduce((a, b) => a + b, 0) || 1;
        const have = [...got.values()].reduce((a, b) => a + b, 0);
        progress = Math.min(0.99, have / total);
        listeners.forEach((l) => l(progress));
      };
      await Promise.all(
        FILES.map(async (f) => {
          try {
            const res = await fetch(COOP_BASE + f, { cache: "force-cache" });
            const len = Number(res.headers.get("content-length") || 0);
            sizes.set(f, len || (f.endsWith(".wasm") ? 40_000_000 : 300_000));
            if (!res.body) return;
            const reader = res.body.getReader();
            let n = 0;
            for (;;) {
              const { done: end, value } = await reader.read();
              if (end) break;
              n += value?.length ?? 0;
              got.set(f, n);
              report();
            }
          } catch {
            /* the game will fetch it itself */
          }
        }),
      );
      done = true;
      progress = 1;
      listeners.forEach((l) => l(1));
    })();
  }
  return () => {
    if (onProgress) listeners.delete(onProgress);
  };
}

export const coopReady = () => done;
