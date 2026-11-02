/**
 * Coin packs sold in rupees. Prices include GST. Bigger packs give more coins
 * per rupee (12.2 on the smallest, 17.5 on the biggest).
 *
 * Sample packs for the on-device demo only. Real coin packs come from
 * GET /api/v1/wallet/coin-packs and are bought through the backend and PayU
 * (CheckoutSheet); coins are only ever added by the backend.
 */

export type CoinPack = { id: string; coins: number; inr: number; tag?: "Popular" | "Best value" };

export const COIN_PACKS: CoinPack[] = [
  { id: "coins-600", coins: 600, inr: 49 },
  { id: "coins-2000", coins: 2_000, inr: 149 },
  { id: "coins-6000", coins: 6_000, inr: 449, tag: "Popular" },
  { id: "coins-12000", coins: 12_000, inr: 849 },
  { id: "coins-30000", coins: 30_000, inr: 1_999 },
  { id: "coins-65000", coins: 65_000, inr: 3_999 },
  { id: "coins-140000", coins: 1_40_000, inr: 7_999, tag: "Best value" },
];

export const coinPackById = (id: string) => COIN_PACKS.find((p) => p.id === id);

/** Extra coins compared with buying at the smallest pack's rate, as a whole percent. */
export function packBonus(p: CoinPack) {
  const base = COIN_PACKS[0].coins / COIN_PACKS[0].inr;
  return Math.max(0, Math.round((p.coins / p.inr / base - 1) * 100));
}
