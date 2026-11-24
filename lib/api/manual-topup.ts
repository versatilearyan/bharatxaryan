/**
 * Manual UPI top-up ("pay Mukhiya ji"): for people whose Google Pay / Paytm doesn't like the payment gateway.
 *   GET  /api/v1/manual-topup/info
 *   POST /api/v1/manual-topup/requests  { packId }
 *   POST /api/v1/manual-topup/requests/{id}/submit   multipart: utr, screenshot
 *   POST /api/v1/manual-topup/requests/{id}/cancel
 *   GET  /api/v1/manual-topup/mine
 */
import { api } from "./client";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const opts = { auth: true, forbiddenIsAccess: true } as const;

export type TopupStatus = "REQUESTED" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
/** name: what the admin calls the person who checks payments (Mukhiya ji, Munshi ji, ...). */
export type TopupInfo = { enabled: boolean; name: string; upiId?: string; payeeName?: string; qrUrl?: string; note?: string };
export type TopupRequest = { id: string; reference: string; status: TopupStatus; kind: "COIN_PACK" | "ROYAL"; plateName?: string; packName: string; amountInr: number; coins: number; utr?: string; rejectReason?: string; upiLink?: string };

/** A profile title as the Royal Pack shows it. */
export type RoyalTitle = { id: string; name: string; iconUrl?: string; colorFrom: string; colorTo: string; textColor: string };
/** The Royal frame: its picture and how it fits (the same numbers a worn name frame uses). */
export type RoyalFrame = { id: string; name: string; imageUrl: string; scale: number; y: number; size: number; plateX: number; plateY: number; plateW: number; plateH: number; color: string; stroke: string };
/**
 * The Royal Pack, sold only through Munshi ji. myTitle: KING / QUEEN from the person's gender, or null (they pick).
 */
export type RoyalInfo = {
  enabled: boolean;
  name: string;
  priceInr: number;
  coins: number;
  frameDays: number;
  titleDays: number;
  badge: string;
  frame?: RoyalFrame;
  nawab?: RoyalTitle;
  king?: RoyalTitle;
  queen?: RoyalTitle;
  myTitle: "KING" | "QUEEN" | null;
};

const readTitle = (v: unknown): RoyalTitle | undefined => {
  const t = obj(v);
  const name = t ? str(t.name) : undefined;
  if (!t || !name) return undefined;
  return { id: str(t.id) ?? "", name, iconUrl: str(t.iconUrl), colorFrom: str(t.colorFrom) ?? "#7b5cff", colorTo: str(t.colorTo) ?? "#c56bff", textColor: str(t.textColor) ?? "#ffffff" };
};
const readFrame = (v: unknown): RoyalFrame | undefined => {
  const f = obj(v);
  const url = f ? str(f.imageUrl) : undefined;
  if (!f || !url) return undefined;
  return {
    id: str(f.id) ?? "",
    name: str(f.name) ?? "Royal frame",
    imageUrl: url,
    scale: num(f.scale) || 2.1,
    y: num(f.y) || 0.48,
    size: num(f.size) || 1.45,
    plateX: num(f.plateX),
    plateY: num(f.plateY),
    plateW: num(f.plateW),
    plateH: num(f.plateH),
    color: str(f.color) ?? "#fff1b8",
    stroke: str(f.stroke) ?? "#3b0d5c",
  };
};

/** Up to 14 letters for the frame's plate (an emoji counts as one). */
export const PLATE_MAX = 14;
export const plateLength = (s: string) => Array.from(s).length;

const status = (v: unknown): TopupStatus => (v === "SUBMITTED" || v === "APPROVED" || v === "REJECTED" || v === "CANCELLED" ? v : "REQUESTED");

function readRequest(raw: unknown): TopupRequest | null {
  const d = obj(raw);
  const id = d ? str(d.id) : undefined;
  if (!d || !id) return null;
  return { id, reference: str(d.reference) ?? "", status: status(d.status), kind: d.kind === "ROYAL" ? "ROYAL" : "COIN_PACK", plateName: str(d.plateName), packName: str(d.packName) ?? "Coin pack", amountInr: num(d.amountInr), coins: num(d.coins), utr: str(d.utr), rejectReason: str(d.rejectReason), upiLink: str(d.upiLink) };
}

export const manualTopupApi = {
  info: async (): Promise<TopupInfo> => {
    const d = obj(await api<unknown>("/api/v1/manual-topup/info", opts));
    return { enabled: d?.enabled === true, name: str(d?.name) ?? "Mukhiya ji", upiId: str(d?.upiId), payeeName: str(d?.payeeName), qrUrl: str(d?.qrUrl), note: str(d?.note) };
  },
  request: async (packId: string) => {
    const r = readRequest(await api<unknown>("/api/v1/manual-topup/requests", { ...opts, method: "POST", body: { packId } }));
    if (!r) throw new Error("The request was made, but the answer couldn't be read.");
    return r;
  },
  royal: async (): Promise<RoyalInfo> => {
    const d = obj(await api<unknown>("/api/v1/manual-topup/royal", opts));
    const my = d?.myTitle;
    return {
      enabled: d?.enabled === true,
      name: str(d?.name) ?? "Royal Pack",
      priceInr: num(d?.priceInr),
      coins: num(d?.coins),
      frameDays: num(d?.frameDays),
      titleDays: num(d?.titleDays),
      badge: str(d?.badge) ?? "",
      frame: readFrame(d?.frame),
      nawab: readTitle(d?.nawab),
      king: readTitle(d?.king),
      queen: readTitle(d?.queen),
      myTitle: my === "KING" || my === "QUEEN" ? my : null,
    };
  },
  requestRoyal: async (plateName: string, title: "KING" | "QUEEN") => {
    const r = readRequest(await api<unknown>("/api/v1/manual-topup/royal", { ...opts, method: "POST", body: { plateName, title } }));
    if (!r) throw new Error("The request was made, but the answer couldn't be read.");
    return r;
  },
  mine: async (): Promise<TopupRequest[]> => {
    const raw = await api<unknown>("/api/v1/manual-topup/mine", opts);
    return Array.isArray(raw) ? raw.flatMap((x) => readRequest(x) ?? []) : [];
  },
  cancel: (id: string) => api<unknown>(`/api/v1/manual-topup/requests/${encodeURIComponent(id)}/cancel`, { ...opts, method: "POST" }),
  submit: async (id: string, utr: string, screenshot: Blob) => {
    const form = new FormData();
    form.append("utr", utr);
    form.append("screenshot", screenshot, "proof.jpg");
    const r = readRequest(await api<unknown>(`/api/v1/manual-topup/requests/${encodeURIComponent(id)}/submit`, { ...opts, method: "POST", body: form, timeoutMs: 60_000 }));
    if (!r) throw new Error("Sent, but the answer couldn't be read.");
    return r;
  },
};
