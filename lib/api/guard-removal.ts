/**
 * Removing the Guard between two people.
 *   GET    /api/v1/guard-removal
 *   POST   /api/v1/guard-removal/request/{userId}   ask them (they accept or refuse)
 *   POST   /api/v1/guard-removal/{id}/accept | /refuse
 *   DELETE /api/v1/guard-removal/{id}
 *   POST   /api/v1/guard-removal/force/{userId}     remove it right away for coins
 */
import { api } from "./client";

export type RemovalRow = { id: string; userId: string; name: string; avatarUrl?: string; status: "PENDING" | "REFUSED"; at: string };
export type RemovalState = { forceCost: number; incoming: RemovalRow[]; outgoing: RemovalRow[] };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function rows(v: unknown): RemovalRow[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((r) => {
    const o = obj(r);
    const id = String(o.id ?? "");
    if (!id) return [];
    return [
      {
        id,
        userId: String(o.userId ?? ""),
        name: typeof o.name === "string" && o.name ? o.name : "Someone",
        avatarUrl: typeof o.avatarUrl === "string" ? o.avatarUrl : undefined,
        status: o.status === "REFUSED" ? ("REFUSED" as const) : ("PENDING" as const),
        at: String(o.at ?? ""),
      },
    ];
  });
}

function read(raw: unknown): RemovalState {
  const o = obj(raw);
  return { forceCost: typeof o.forceCost === "number" ? o.forceCost : 1_000_000, incoming: rows(o.incoming), outgoing: rows(o.outgoing) };
}

const opts = { auth: true } as const;
const base = "/api/v1/guard-removal";

export const guardRemovalApi = {
  state: async () => read(await api<unknown>(base, opts)),
  request: async (userId: string) => read(await api<unknown>(`${base}/request/${encodeURIComponent(userId)}`, { ...opts, method: "POST" })),
  accept: async (id: string) => read(await api<unknown>(`${base}/${encodeURIComponent(id)}/accept`, { ...opts, method: "POST" })),
  refuse: async (id: string) => read(await api<unknown>(`${base}/${encodeURIComponent(id)}/refuse`, { ...opts, method: "POST" })),
  cancel: async (id: string) => read(await api<unknown>(`${base}/${encodeURIComponent(id)}`, { ...opts, method: "DELETE" })),
  force: async (userId: string) => read(await api<unknown>(`${base}/force/${encodeURIComponent(userId)}`, { ...opts, method: "POST" })),
};
