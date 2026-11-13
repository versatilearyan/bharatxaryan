/** Profile titles (the server's): see what a person wears, and wear, take off or buy your own. */
import { api } from "./client";

export type ProfileTitle = { id: string; name: string; iconUrl?: string | null; colorFrom: string; colorTo: string; textColor: string; rarity: string };
export type OwnedTitle = ProfileTitle & { worn: boolean; wornPos?: number | null; expiresAt?: string | null; free: boolean };
export type StoreTitle = ProfileTitle & { priceCoins: number };
export type MyTitles = { maxWorn: number; owned: OwnedTitle[]; store: StoreTitle[] };

const opts = { auth: true, forbiddenIsAccess: true } as const;
const base = "/api/v1/titles";

export const titlesApi = {
  mine: () => api<MyTitles>(`${base}/mine`, opts),
  wear: (id: string) => api<MyTitles>(`${base}/${id}/wear`, { ...opts, method: "POST" }),
  takeOff: (id: string) => api<MyTitles>(`${base}/${id}/wear`, { ...opts, method: "DELETE" }),
  buy: (id: string) => api<MyTitles>(`${base}/${id}/buy`, { ...opts, method: "POST" }),
  of: (userId: string) => api<ProfileTitle[]>(`${base}/of/${userId}`, opts),
};
