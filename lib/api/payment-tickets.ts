/**
 * Payment tickets: a problem with a payment, answered by Munshi ji (the payments desk).
 *   GET  /api/v1/payment-tickets
 *   POST /api/v1/payment-tickets                         multipart: category, reference?, message, screenshot?
 *   GET  /api/v1/payment-tickets/{id}
 *   POST /api/v1/payment-tickets/{id}/messages  { body }
 */
import { api } from "./client";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const opts = { auth: true, forbiddenIsAccess: true } as const;

export type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";
export type TicketCategory = "NOT_CREDITED" | "MONEY_DEDUCTED" | "MANUAL_TOPUP" | "REFUND" | "OTHER";
export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "NOT_CREDITED", label: "Paid, but no coins" },
  { value: "MONEY_DEDUCTED", label: "Money deducted, payment failed" },
  { value: "MANUAL_TOPUP", label: "UPI top-up problem" },
  { value: "REFUND", label: "Refund" },
  { value: "OTHER", label: "Something else" },
];
export type TicketSummary = { id: string; category: TicketCategory; reference?: string; status: TicketStatus; message: string; createdAt: string; updatedAt: string };
export type TicketMessage = { id: string; from: "USER" | "ADMIN"; body: string; createdAt: string };
export type TicketDetail = TicketSummary & { messages: TicketMessage[] };

const status = (v: unknown): TicketStatus => (v === "ANSWERED" || v === "CLOSED" ? v : "OPEN");
const category = (v: unknown): TicketCategory => (v === "NOT_CREDITED" || v === "MONEY_DEDUCTED" || v === "MANUAL_TOPUP" || v === "REFUND" ? v : "OTHER");

function readSummary(raw: unknown): TicketSummary | null {
  const d = obj(raw);
  const id = d ? str(d.id) : undefined;
  if (!d || !id) return null;
  return { id, category: category(d.category), reference: str(d.reference), status: status(d.status), message: str(d.message) ?? "", createdAt: str(d.createdAt) ?? "", updatedAt: str(d.updatedAt) ?? "" };
}

function readDetail(raw: unknown): TicketDetail {
  const s = readSummary(raw);
  if (!s) throw new Error("The ticket couldn't be read.");
  const d = obj(raw);
  const messages: TicketMessage[] = Array.isArray(d?.messages)
    ? (d!.messages as unknown[]).flatMap((m) => {
        const o = obj(m);
        const id = o ? str(o.id) : undefined;
        return o && id ? [{ id, from: o.from === "ADMIN" ? "ADMIN" : "USER", body: str(o.body) ?? "", createdAt: str(o.createdAt) ?? "" } as TicketMessage] : [];
      })
    : [];
  return { ...s, messages };
}

export const ticketsApi = {
  mine: async (): Promise<TicketSummary[]> => {
    const raw = await api<unknown>("/api/v1/payment-tickets", opts);
    return Array.isArray(raw) ? raw.flatMap((x) => readSummary(x) ?? []) : [];
  },
  get: async (id: string) => readDetail(await api<unknown>(`/api/v1/payment-tickets/${encodeURIComponent(id)}`, opts)),
  create: async (category: TicketCategory, reference: string, message: string, screenshot: Blob | null) => {
    const form = new FormData();
    form.append("category", category);
    if (reference.trim()) form.append("reference", reference.trim());
    form.append("message", message.trim());
    if (screenshot) form.append("screenshot", screenshot, "proof.jpg");
    return readDetail(await api<unknown>("/api/v1/payment-tickets", { ...opts, method: "POST", body: form, timeoutMs: 60_000 }));
  },
  follow: async (id: string, body: string) => readDetail(await api<unknown>(`/api/v1/payment-tickets/${encodeURIComponent(id)}/messages`, { ...opts, method: "POST", body: { body } })),
};
