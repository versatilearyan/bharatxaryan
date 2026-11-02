/**
 * Payments (/api/v1/payments/*). The backend owns everything that matters:
 * the price, the PayU order and its signature, verifying the result and
 * crediting coins or red packets. The app only asks it to start a payment and
 * then sends the person to the checkout page it returns.
 *
 *   POST /api/v1/payments/initiate
 *   { purpose: "COIN_PACK" | "RED_PACKET", productId, firstName, lastName,
 *     address1, phone, city, state, zipCode }
 *
 * No price or amount is ever sent: the backend looks it up from productId.
 * There is no payment-status endpoint the app knows of, so nothing here can
 * say whether a payment succeeded.
 *
 * The initiate response DTO wasn't available to check. The checkout link is
 * read from the first of these that is present: checkoutUrl, paymentUrl,
 * redirectUrl, actionUrl, url (top level or under `data`). If the backend also
 * returns PayU's form fields (for a hosted-checkout POST) they are read from
 * formFields / params / formParams / fields and posted as they are; the app
 * never computes a hash or touches a merchant key. Trim these lists once the
 * DTO is confirmed.
 */
import { api, ApiError } from "./client";
import type { BillingDetails } from "@/lib/payments/billing";

/** The purposes the backend supports today. VIP is not one of them. */
export type PaymentPurpose = "COIN_PACK" | "RED_PACKET";

export type InitiatePaymentRequest = BillingDetails & { purpose: PaymentPurpose; productId: number };

export type PaymentInitiation = {
  /** Where to send the person (validated by the gateway before use). */
  checkoutUrl: string;
  /** Present when the gateway needs a form POST rather than a plain redirect. */
  formFields?: Record<string, string>;
  /** The backend's or PayU's transaction reference, when sent (shown to the person, not secret). */
  reference?: string;
};

const URL_KEYS = ["checkoutUrl", "paymentUrl", "redirectUrl", "actionUrl", "url"] as const;
const FORM_KEYS = ["formFields", "params", "formParams", "fields"] as const;
const REF_KEYS = ["transactionId", "txnId", "txnid", "merchantTransactionId", "orderId"] as const;

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);

function readInitiation(raw: unknown): PaymentInitiation {
  const top = obj(raw);
  const d = obj(top?.data) ?? top;
  if (!d) throw new ApiError("The payment server sent a reply the app couldn't read. Nothing was charged.", 200, "http");
  const checkoutUrl = URL_KEYS.map((k) => str(d[k])).find(Boolean);
  if (!checkoutUrl) throw new ApiError("The payment server didn't send a checkout link. Nothing was charged. Please try again later.", 200, "http");
  let formFields: Record<string, string> | undefined;
  for (const k of FORM_KEYS) {
    const f = obj(d[k]);
    if (!f) continue;
    formFields = {};
    for (const [name, value] of Object.entries(f)) {
      const v = str(value) ?? (value === "" ? "" : undefined);
      if (v !== undefined) formFields[name] = v;
    }
    break;
  }
  const reference = REF_KEYS.map((k) => str(d[k]) ?? (formFields ? str(formFields[k]) : undefined)).find(Boolean);
  return { checkoutUrl, formFields, reference };
}

/** A backend product id as the number the request needs. Never guessed. */
export function productIdNumber(id: string): number | null {
  return /^\d+$/.test(id) && Number(id) > 0 && Number.isSafeInteger(Number(id)) ? Number(id) : null;
}

/**
 * Ask the backend to start a payment. Throws ApiError. A 401 goes through the
 * app's normal sign-out; a 403 doesn't (it means not allowed, not signed out).
 */
export async function initiatePayment(req: InitiatePaymentRequest): Promise<PaymentInitiation> {
  const body: InitiatePaymentRequest = {
    purpose: req.purpose,
    productId: req.productId,
    firstName: req.firstName,
    lastName: req.lastName,
    address1: req.address1,
    phone: req.phone,
    city: req.city,
    state: req.state,
    zipCode: req.zipCode,
  };
  return readInitiation(await api<unknown>("/api/v1/payments/initiate", { method: "POST", body, auth: true, forbiddenIsAccess: true, timeoutMs: 30_000 }));
}

/** Words for a failed start, safe to show. The amount is never mentioned as charged. */
export function paymentErrorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return "Couldn't reach the payment server. Check your connection and try again. Nothing was charged.";
    if (e.status === 400) return `${e.message || "Some details weren't accepted."} Nothing was charged.`;
    if (e.status === 401) return "Your session has ended. Please sign in again.";
    if (e.status === 403) return "Your account isn't allowed to make this purchase right now (403). Nothing was charged.";
    if (e.status === 404) return "This item isn't on sale any more. Nothing was charged.";
    if (e.status >= 500) return "The payment server had a problem. Nothing was charged. Please try again in a moment.";
    return e.message || "Couldn't start the payment. Nothing was charged.";
  }
  return e instanceof Error && e.message ? e.message : "Couldn't start the payment. Nothing was charged.";
}
