import { api } from "./client";

export type ReportTarget = {
  type: "USER" | "MESSAGE" | "ROOM";
  /** The person responsible (the user, or the author of the message), as a backend user id. */
  userId?: string;
  /** A message id or room id. */
  ref?: string;
  /** Who or what is being reported, shown in the sheet. */
  name: string;
  /** A short copy of the message, so a moderator can see it even if it is deleted later. */
  snippet?: string;
};

export const REPORT_REASONS: { id: string; label: string }[] = [
  { id: "SPAM", label: "Spam or fake account" },
  { id: "ABUSE", label: "Abuse or bad language" },
  { id: "HARASSMENT", label: "Harassment or bullying" },
  { id: "NUDITY", label: "Nudity or sexual content" },
  { id: "HATE", label: "Hate or violence" },
  { id: "SCAM", label: "Scam or cheating" },
  { id: "UNDERAGE", label: "Seems under 13" },
  { id: "OTHER", label: "Something else" },
];

export const sendReport = (t: ReportTarget, reason: string, note: string) =>
  api<{ sent: boolean; duplicate?: boolean }>("/api/v1/reports", {
    method: "POST",
    auth: true,
    body: { targetType: t.type, userId: t.userId ? Number(t.userId) : undefined, ref: t.ref, reason, note: note.trim() || undefined, snippet: t.snippet },
  });

export const getBlockedIds = async (): Promise<string[]> => {
  const list = await api<unknown>("/api/v1/chat/blocks", { auth: true });
  return (Array.isArray(list) ? list : []).flatMap((x) => {
    const id = (x as { userId?: unknown })?.userId;
    return id === undefined || id === null ? [] : [String(id)];
  });
};
