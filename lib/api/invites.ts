/**
 * Room and game invites in chats, game codes and private-room invite codes.
 *   POST /api/v1/chat/conversations/{id}/invites  { kind: ROOM|GAME, roomId?, gameId? }
 *   POST /api/v1/voice-rooms/{roomId}/invite-code → { invite: "inv:CODE" }
 *   GET  /api/v1/games/code/{code}                → { gameId, game, roomId, roomName, status, invite? }
 * An invite arrives as a chat message starting with INVITE_MARK + JSON.
 */
import { api } from "./client";

export const INVITE_MARK = "::invite::";

export type ChatInvite = {
  kind: "ROOM" | "GAME";
  roomId: string;
  roomName: string;
  roomCode?: string;
  coverUrl?: string;
  private?: boolean;
  /** "inv:CODE": lets the friend into a password room. */
  invite?: string;
  game?: string;
  gameId?: string;
  gameCode?: string;
  status?: string;
  players?: number;
  byUserId?: string;
  expiresAt?: number;
};

/** The invite inside a chat message, or null for a normal message. */
export function parseInvite(text?: string): ChatInvite | null {
  if (!text || !text.startsWith(INVITE_MARK)) return null;
  try {
    const d = JSON.parse(text.slice(INVITE_MARK.length)) as Record<string, unknown>;
    const s = (v: unknown) => (v == null ? undefined : String(v));
    if ((d.kind !== "ROOM" && d.kind !== "GAME") || !d.roomId) return null;
    return {
      kind: d.kind,
      roomId: String(d.roomId),
      roomName: s(d.roomName) ?? "A room",
      roomCode: s(d.roomCode),
      coverUrl: s(d.coverUrl),
      private: d.private === true,
      invite: s(d.invite),
      game: s(d.game),
      gameId: s(d.gameId),
      gameCode: s(d.gameCode),
      status: s(d.status),
      players: typeof d.players === "number" ? d.players : undefined,
      byUserId: s(d.byUserId),
      expiresAt: typeof d.expiresAt === "string" ? Date.parse(d.expiresAt) : undefined,
    };
  } catch {
    return null;
  }
}

/** A chat line for an invite (inbox previews). */
export const invitePreview = (text?: string) => {
  const i = parseInvite(text);
  return i ? (i.kind === "GAME" ? "🎮 Game invite" : "🎙 Room invite") : text;
};

const opts = { auth: true, forbiddenIsAccess: true } as const;

export async function sendInvite(conversationId: string, kind: "ROOM" | "GAME", ids: { roomId?: string; gameId?: string }) {
  await api<unknown>(`/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/invites`, {
    ...opts,
    method: "POST",
    body: { kind, roomId: ids.roomId ? Number(ids.roomId) : undefined, gameId: ids.gameId ? Number(ids.gameId) : undefined },
  });
}

export async function gameByCode(code: string) {
  const d = (await api<unknown>(`/api/v1/games/code/${encodeURIComponent(code.trim().toUpperCase())}`, opts)) as Record<string, unknown>;
  return { gameId: String(d.gameId), game: String(d.game ?? "JACKAROO"), roomId: String(d.roomId), roomName: String(d.roomName ?? "a room"), status: String(d.status ?? ""), invite: d.invite ? String(d.invite) : undefined };
}

/** Game codes are 6 letters and digits with at least one letter (room IDs are 7 digits). */
export const looksLikeGameCode = (q: string) => /^[A-Za-z0-9]{6}$/.test(q.trim()) && /[A-Za-z]/.test(q);
