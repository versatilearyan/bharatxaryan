/**
 * Events, managed from the admin panel. GET /api/v1/events (the "Special events" cards on Discover and the home
 * screen's Event Center) and GET /api/v1/events/center (whether the Event Center is switched on).
 */
import { api } from "./client";
import { mediaSrc } from "./rewards";
import type { Cover, CoverMotif, CoverTheme } from "@/lib/app/types";

export type SpecialEvent = {
  id: string;
  title: string;
  when: string;
  body: string;
  cover: Cover;
  /** The Event Center banner (an admin upload), when there is one. */
  imageUrl?: string;
  /** The Event Center section it's listed under (Bonus, Recommend, ...). */
  section: string;
  /** The corner ribbon (PK, Recharge, Family, ...) and its colour. */
  tag?: string;
  tagColor?: string;
  /** What opens on tap: shop, ranking, pk, recharge, parivar, games, vip, tasks, room:<id> or an https:// page. */
  link?: string;
  endsAt?: string;
};

const THEMES: CoverTheme[] = ["dusk", "rose", "gold", "night", "monsoon", "ember"];
const MOTIFS: CoverMotif[] = ["banyan", "temple", "huts", "river", "kites", "lanterns"];
const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export async function fetchEvents(): Promise<SpecialEvent[]> {
  const raw = await api<unknown>("/api/v1/events", { auth: true });
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x) => {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    if (typeof o.title !== "string") return [];
    const theme = THEMES.includes(o.theme as CoverTheme) ? (o.theme as CoverTheme) : "gold";
    const motif = MOTIFS.includes(o.motif as CoverMotif) ? (o.motif as CoverMotif) : "lanterns";
    const color = s(o.tagColor);
    return [
      {
        id: String(o.id),
        title: o.title,
        when: typeof o.whenText === "string" ? o.whenText : "",
        body: typeof o.body === "string" ? o.body : "",
        cover: { theme, motif },
        imageUrl: mediaSrc(o.imageUrl) ?? undefined,
        section: s(o.section) ?? "Recommend",
        tag: s(o.tag),
        tagColor: color && /^#[0-9a-f]{6}$/i.test(color) ? color : undefined,
        link: s(o.link),
        endsAt: s(o.endsAt),
      },
    ];
  });
}

/** Whether the admins switched the Event Center on (off when it can't be read). */
export async function eventCenterOn(): Promise<boolean> {
  try {
    const d = (await api<unknown>("/api/v1/events/center", { auth: true, forbiddenIsAccess: true })) as { enabled?: unknown } | null;
    return d?.enabled === true;
  } catch {
    return false;
  }
}
