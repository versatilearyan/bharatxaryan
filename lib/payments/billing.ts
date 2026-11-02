/**
 * Billing details the backend needs to start a PayU payment. They live only in
 * the checkout form's state: never saved, logged or kept after the sheet closes.
 */
export type BillingDetails = {
  firstName: string;
  lastName: string;
  address1: string;
  phone: string;
  city: string;
  state: string;
  zipCode: string;
};

export const EMPTY_BILLING: BillingDetails = { firstName: "", lastName: "", address1: "", phone: "", city: "", state: "", zipCode: "" };

export const BILLING_FIELDS: { key: keyof BillingDetails; label: string; placeholder: string; inputMode?: "text" | "numeric" | "tel"; autoComplete: string; max: number }[] = [
  { key: "firstName", label: "First name", placeholder: "First name", autoComplete: "given-name", max: 60 },
  { key: "lastName", label: "Last name", placeholder: "Last name", autoComplete: "family-name", max: 60 },
  { key: "phone", label: "Mobile number", placeholder: "10-digit mobile number", inputMode: "tel", autoComplete: "tel-national", max: 10 },
  { key: "address1", label: "Address", placeholder: "House, street, area", autoComplete: "address-line1", max: 120 },
  { key: "city", label: "City", placeholder: "City", autoComplete: "address-level2", max: 60 },
  { key: "state", label: "State", placeholder: "State", autoComplete: "address-level1", max: 60 },
  { key: "zipCode", label: "PIN code", placeholder: "6-digit PIN code", inputMode: "numeric", autoComplete: "postal-code", max: 6 },
];

const NAME = /^[\p{L}][\p{L} .'-]*$/u;

/** Trimmed copy of what was typed (phone and PIN as digits only). */
export function cleanBilling(b: BillingDetails): BillingDetails {
  return {
    firstName: b.firstName.trim(),
    lastName: b.lastName.trim(),
    address1: b.address1.trim(),
    phone: b.phone.replace(/\D/g, ""),
    city: b.city.trim(),
    state: b.state.trim(),
    zipCode: b.zipCode.replace(/\D/g, ""),
  };
}

/** Field → message for anything that isn't valid; empty when all is well. */
export function billingErrors(raw: BillingDetails): Partial<Record<keyof BillingDetails, string>> {
  const b = cleanBilling(raw);
  const e: Partial<Record<keyof BillingDetails, string>> = {};
  if (!b.firstName) e.firstName = "Enter your first name";
  else if (!NAME.test(b.firstName)) e.firstName = "Use letters only";
  if (!b.lastName) e.lastName = "Enter your last name";
  else if (!NAME.test(b.lastName)) e.lastName = "Use letters only";
  if (!/^[6-9]\d{9}$/.test(b.phone)) e.phone = "Enter a 10-digit Indian mobile number";
  if (b.address1.length < 3) e.address1 = "Enter your address";
  if (b.city.length < 2) e.city = "Enter your city";
  if (b.state.length < 2) e.state = "Enter your state";
  if (!/^[1-9]\d{5}$/.test(b.zipCode)) e.zipCode = "Enter a 6-digit PIN code";
  return e;
}

/** First and last name from a display name, as a starting point the person can change. */
export function splitName(name: string | undefined): Pick<BillingDetails, "firstName" | "lastName"> {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}
