/**
 * Newbie Welcome Rooms, run by the server (/api/v1/newbie). The server decides which rooms are open and in what order,
 * who counts as a newbie, who may host and who may send the welcome gift. The app only shows what it answers.
 */
import { api } from "./client";

export type NewbieRoom = {
  id: number;
  roomId: number;
  roomCode: number;
  number: number;
  name: string;
  status: string;
  host: { id: string | null; name: string | null; avatarUrl: string | null; publicId: number | null; online: boolean };
  capacity: number;
  joined: number;
  seatsFree: number;
  newbiesInside: number;
  extraSeats: boolean;
};

export type NewbieMe = {
  newbie: boolean;
  expiresAt: string | null;
  welcomeSeen: boolean;
  roomId: string | null;
  isHost: boolean;
  welcomeGiftId: string | null;
  welcomeTitle: string;
  welcomeMessage: string;
  extraSeatsAllowed: boolean;
  gotWelcomeGift: boolean;
};

const opts = { auth: true, forbiddenIsAccess: true } as const;
const base = "/api/v1/newbie";

export const newbieApi = {
  rooms: () => api<NewbieRoom[]>(`${base}/rooms`, opts),
  me: () => api<NewbieMe>(`${base}/me`, opts),
  welcomeSeen: () => api<{ ok: boolean }>(`${base}/me/welcome-seen`, { ...opts, method: "POST" }),
  check: (ids: string[]) => api<{ newbies: string[] }>(`${base}/check?ids=${ids.map(encodeURIComponent).join(",")}`, opts),
  uploadBackground: (roomId: string, file: Blob) => {
    const form = new FormData();
    form.append("file", file, "background.jpg");
    return api<{ roomId: number; background: string }>(`${base}/rooms/${roomId}/background`, { ...opts, method: "POST", body: form, timeoutMs: 60_000 });
  },
  resetBackground: (roomId: string) => api<{ roomId: number; background: string }>(`${base}/rooms/${roomId}/background`, { ...opts, method: "DELETE" }),
  setExtraSeats: (roomId: string, enabled: boolean) => api<{ roomId: number; extraSeats: boolean }>(`${base}/rooms/${roomId}/extra-seats`, { ...opts, method: "PUT", body: { enabled } }),
};
