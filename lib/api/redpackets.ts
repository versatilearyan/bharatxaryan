/**
 * Red packets in rooms, run by the server:
 *   POST /api/v1/voice-rooms/{roomId}/red-packets   { amount, cover, delaySeconds }
 *   GET  /api/v1/voice-rooms/{roomId}/red-packets/current
 *   POST /api/v1/red-packets/{id}/grab
 * Live: /topic/voice-rooms/{roomId}/redpacket (this room), /topic/redpackets (banner everywhere).
 */
import { api } from "./client";

export type ServerRedPacket = {
  id: string;
  roomId: string;
  roomName?: string;
  senderId: string;
  senderName?: string;
  amount: number;
  cover: string;
  left: number;
  grabbers: number;
  rainAt: number;
  endAt: number;
  settled: boolean;
  maxGrabs: number;
  serverTime: number;
  event: "DROPPED" | "GRABBED" | "ENDED" | "CURRENT";
  grabberId?: string;
  got?: number;
  mine?: number;
  myGrabs?: number;
  /** Sent when the rain ends: the five who looted the most. */
  top?: { userId: string; name: string; coins: number }[];
};

export type GrabResult = { got: number; mine: number; myGrabs: number; maxGrabs: number; left: number };

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

export function readRedPacket(raw: unknown): ServerRedPacket | null {
  const d = obj(raw);
  const id = str(d?.id);
  const roomId = str(d?.roomId);
  if (!d || !id || !roomId) return null;
  const ev = d.event === "GRABBED" || d.event === "ENDED" || d.event === "DROPPED" ? d.event : "CURRENT";
  return {
    id,
    roomId,
    roomName: str(d.roomName),
    senderId: str(d.senderId) ?? "",
    senderName: str(d.senderName),
    amount: num(d.amount),
    cover: str(d.cover) ?? "red",
    left: num(d.left),
    grabbers: num(d.grabbers),
    rainAt: num(d.rainAt),
    endAt: num(d.endAt),
    settled: d.settled === true,
    maxGrabs: num(d.maxGrabs) || 40,
    serverTime: num(d.serverTime) || Date.now(),
    event: ev,
    grabberId: str(d.grabberId),
    got: d.got === undefined ? undefined : num(d.got),
    mine: d.mine === undefined ? undefined : num(d.mine),
    myGrabs: d.myGrabs === undefined ? undefined : num(d.myGrabs),
    top: Array.isArray(d.top)
      ? d.top.flatMap((t) => {
          const o = obj(t);
          const coins = num(o?.coins);
          return o && coins > 0 ? [{ userId: str(o.userId) ?? "", name: str(o.name) ?? "Someone", coins }] : [];
        })
      : undefined,
  };
}

const opts = { auth: true, forbiddenIsAccess: true } as const;

export async function dropRedPacket(roomId: string, amount: number, cover: string, delaySeconds: number) {
  const m = readRedPacket(await api<unknown>(`/api/v1/voice-rooms/${encodeURIComponent(roomId)}/red-packets`, { ...opts, method: "POST", body: { amount, cover, delaySeconds } }));
  if (!m) throw new Error("The red packet was dropped, but the answer couldn't be read.");
  return m;
}

export async function getCurrentRedPacket(roomId: string) {
  const d = obj(await api<unknown>(`/api/v1/voice-rooms/${encodeURIComponent(roomId)}/red-packets/current`, opts));
  return readRedPacket(d?.packet);
}

export async function grabRedPacket(packetId: string): Promise<GrabResult> {
  const d = obj(await api<unknown>(`/api/v1/red-packets/${encodeURIComponent(packetId)}/grab`, { ...opts, method: "POST" }));
  return { got: num(d?.got), mine: num(d?.mine), myGrabs: num(d?.myGrabs), maxGrabs: num(d?.maxGrabs) || 40, left: num(d?.left) };
}

export const roomRedPacketTopic = (roomId: string) => `/topic/voice-rooms/${encodeURIComponent(roomId)}/redpacket`;
export const RED_PACKETS_TOPIC = "/topic/redpackets";
