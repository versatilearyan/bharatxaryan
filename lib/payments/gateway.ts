/**
 * Payment gateways the backend supports. Today that is only PayU (hosted
 * checkout). Adding another one later means a new entry here plus whatever the
 * backend returns for it; the purchase screens don't change.
 *
 * Nothing secret lives here: no merchant key, salt or hash. The app only
 * checks that the checkout link points at the gateway before leaving for it,
 * so a bad response can't send the person somewhere else.
 */
import type { PaymentInitiation } from "@/lib/api/payments";

export type Gateway = {
  id: "PAYU";
  name: string;
  /** Whether a checkout link may be opened (https and the gateway's own domain). */
  allows: (url: URL) => boolean;
};

/** PayU's hosted checkout: secure.payu.in (live) and test.payu.in (sandbox). Which one is the backend's choice. */
export const PAYU: Gateway = {
  id: "PAYU",
  name: "PayU",
  allows: (u) => u.protocol === "https:" && (u.hostname === "payu.in" || u.hostname.endsWith(".payu.in")),
};

/** The gateway the backend uses. Only one exists, so there is no gateway picker. */
export const ACTIVE_GATEWAY: Gateway = PAYU;

/** Why a checkout link was refused, or "" when it's fine. */
export function checkoutProblem(init: PaymentInitiation, gateway: Gateway = ACTIVE_GATEWAY): string {
  let u: URL;
  try {
    u = new URL(init.checkoutUrl);
  } catch {
    return "The payment server sent a checkout link the app couldn't open. Nothing was charged.";
  }
  if (!gateway.allows(u)) return `The checkout link doesn't point to ${gateway.name}, so the app didn't open it. Nothing was charged.`;
  return "";
}

/**
 * Leave the app for the gateway's checkout page: a form POST with the fields
 * the backend sent, or a plain redirect when there are none.
 */
export function goToCheckout(init: PaymentInitiation) {
  if (init.formFields && Object.keys(init.formFields).length) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = init.checkoutUrl;
    form.style.display = "none";
    for (const [name, value] of Object.entries(init.formFields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    return;
  }
  window.location.assign(init.checkoutUrl);
}
