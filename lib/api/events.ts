/** The "Special events" cards on Discover. GET /api/v1/events (managed from the admin panel). */
import { api } from "./client";
import type { Cover, CoverMotif, CoverTheme } from "@/lib/app/types";

export type SpecialEvent = { id: string; title: string; when: string; body: string; cover: Cover };

const THEMES: CoverTheme[] = ["dusk", "rose", "gold", "night", "monsoon", "ember"];
const MOTIFS: CoverMotif[] = ["banyan", "temple", "huts", "river", "kites", "lanterns"];

export async function fetchEvents(): Promise<SpecialEvent[]> {
  const raw = await api<unknown>("/api/v1/events", { auth: true });
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x) => {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    if (typeof o.title !== "string") return [];
    const theme = THEMES.includes(o.theme as CoverTheme) ? (o.theme as CoverTheme) : "gold";
    const motif = MOTIFS.includes(o.motif as CoverMotif) ? (o.motif as CoverMotif) : "lanterns";
    return [{ id: String(o.id), title: o.title, when: typeof o.whenText === "string" ? o.whenText : "", body: typeof o.body === "string" ? o.body : "", cover: { theme, motif } }];
  });
}
