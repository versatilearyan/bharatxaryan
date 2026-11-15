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
export type TopupInfo = { enabled: boolean; upiId?: string; payeeName?: string; qrUrl?: string; note?: string };
export type TopupRequest = { id: string; reference: string; status: TopupStatus; packName: string; amountInr: number; coins: number; utr?: string; rejectReason?: string; upiLink?: string };

const status = (v: unknown): TopupStatus => (v === "SUBMITTED" || v === "APPROVED" || v === "REJECTED" || v === "CANCELLED" ? v : "REQUESTED");

function readRequest(raw: unknown): TopupRequest | null {
  const d = obj(raw);
  const id = d ? str(d.id) : undefined;
  if (!d || !id) return null;
  return { id, reference: str(d.reference) ?? "", status: status(d.status), packName: str(d.packName) ?? "Coin pack", amountInr: num(d.amountInr), coins: num(d.coins), utr: str(d.utr), rejectReason: str(d.rejectReason), upiLink: str(d.upiLink) };
}

export const manualTopupApi = {
  info: async (): Promise<TopupInfo> => {
    const d = obj(await api<unknown>("/api/v1/manual-topup/info", opts));
    return { enabled: d?.enabled === true, upiId: str(d?.upiId), payeeName: str(d?.payeeName), qrUrl: str(d?.qrUrl), note: str(d?.note) };
  },
  request: async (packId: string) => {
    const r = readRequest(await api<unknown>("/api/v1/manual-topup/requests", { ...opts, method: "POST", body: { packId } }));
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
