/**
 * Voice timings measured on this phone, sent to the backend in small batches
 * (see VoiceMetricsController). Numbers and fixed words only, never a token or
 * an address. A lost batch doesn't matter: nothing here is retried, and it can
 * never get in the way of the call.
 */
import { api } from "./client";

export type VoiceMetric = { name: string; ms?: number; path?: string; reason?: string };

const SEND_AFTER_MS = 4000;
const MAX_WAITING = 20;

let waiting: VoiceMetric[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

export function reportVoiceMetric(m: VoiceMetric) {
  if (waiting.length >= MAX_WAITING) return;
  waiting.push(m);
  timer ??= setTimeout(() => {
    timer = undefined;
    const batch = waiting;
    waiting = [];
    api("/api/v1/voice-metrics", { method: "POST", auth: true, body: batch }).catch(() => {});
  }, SEND_AFTER_MS);
}
