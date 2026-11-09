/** The VIP plans on sale (GET /api/v1/vip/plans). Set in the admin panel; the backend sets the price charged. */
import { api } from "./client";

export type VipPlan = { id: number; name: string; days: number; priceInRupees: number };

export async function getVipPlans(): Promise<VipPlan[]> {
  const d = await api<unknown>("/api/v1/vip/plans", { auth: true });
  return (Array.isArray(d) ? d : []).flatMap((x) => {
    const o = x && typeof x === "object" ? (x as Record<string, unknown>) : null;
    const id = Number(o?.id);
    const days = Number(o?.days);
    const price = Number(o?.priceInRupees);
    return o && id > 0 && days > 0 && price > 0 ? [{ id, name: String(o.name ?? "VIP"), days, priceInRupees: price }] : [];
  });
}
