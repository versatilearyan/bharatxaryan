"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readRoomChat, roomChatSend, roomChatTopic, sendRoomChatHttp, type RoomChatMessage } from "@/lib/api/voice-room-chat";
import { SERVER_USER_PREFIX, useServerRooms } from "@/lib/app/server-rooms";
import { ME_ID } from "@/lib/app/store";
import type { RoomMessage } from "@/lib/app/types";
import { publish, subscribe, useStompStatus } from "@/lib/realtime/stomp";
import { sendRoomChatImage } from "@/lib/api/social";

/** Room chat lines from the server have ids starting with this. */
export const SERVER_CHAT_PREFIX = "srv-chat:";

/**
 * A backend room's text chat: only what's said after you join (no earlier
 * chat), live over STOMP, line by line. Each message is delivered once (by the
 * server's id, or sender + time + text when it has none), scoped to this room.
 * Sending goes to STOMP only; your line appears when the server broadcasts it.
 *
 * `ready`: your join has gone through (the voice call is up), so the room's
 * chat is yours to read. `deliver(list, history)` adds lines to the room's
 * message list (history goes before any live lines already shown).
 */
export function useServerRoomChat(roomId: string | null, ready: boolean, myId: string | undefined, deliver: (list: RoomMessage[], history: boolean) => void, onSendError?: (message: string) => void) {
  const sendErrorRef = useRef(onSendError);
  sendErrorRef.current = onSendError;
  const { rememberPeople } = useServerRooms();
  const [historyError, setHistoryError] = useState("");
  const seen = useRef(new Set<string>());
  const status = useStompStatus();
  const deliverRef = useRef(deliver);
  deliverRef.current = deliver;
  const remember = useRef(rememberPeople);
  remember.current = rememberPeople;

  const toLines = useCallback(
    (list: RoomChatMessage[]): RoomMessage[] => {
      const out: RoomMessage[] = [];
      const names: Record<string, { name: string }> = {};
      for (const m of list) {
        if (seen.current.has(m.key)) continue;
        seen.current.add(m.key);
        const authorId = m.senderId && myId && m.senderId === myId ? ME_ID : `${SERVER_USER_PREFIX}${m.senderId ?? "unknown"}`;
        if (authorId !== ME_ID && m.senderName) names[authorId] = { name: m.senderName };
        out.push({ id: `${SERVER_CHAT_PREFIX}${m.key}`, kind: "text", authorId, text: m.text, imageUrl: m.imageUrl });
      }
      if (Object.keys(names).length) remember.current(names);
      return out;
    },
    [myId],
  );

  // A new room starts clean
  useEffect(() => {
    seen.current = new Set();
    setHistoryError("");
  }, [roomId]);

  // Live messages for this room only, while you're in it
  useEffect(() => {
    if (!roomId || !ready) return;
    return subscribe(roomChatTopic(roomId), (body) => {
      const m = readRoomChat(body);
      if (!m || (m.roomId && m.roomId !== roomId)) return;
      const lines = toLines([m]);
      if (lines.length) deliverRef.current(lines, false);
    });
  }, [roomId, ready, toLines]);

  // No earlier chat: like a real room, you only see what's said after you walk in.
  // New lines arrive one by one, live, as people send them.

  /** Send a line. Resolves to an error message, or "" when it went out. */
  const send = useCallback(
    (text: string): string => {
      if (!roomId) return "Chat isn't available here.";
      if (!ready) return "Wait until you've joined the room.";
      try {
        publish(roomChatSend(roomId), { message: text });
        return "";
      } catch {
        // The live connection is reconnecting: send over plain HTTP instead, and show the line from the answer
        sendRoomChatHttp(roomId, text)
          .then((m) => {
            if (!m) return;
            const lines = toLines([m]);
            if (lines.length) deliverRef.current(lines, false);
          })
          .catch((e) => sendErrorRef.current?.(e instanceof Error && e.message ? e.message : "Couldn't send. Try again."));
        return "";
      }
    },
    [roomId, ready, toLines],
  );

  /** Send a photo (JPG or PNG, up to 8 MB). Everyone sees it arrive on the room's chat topic. */
  const sendImage = useCallback(
    async (file: File, onProgress?: (p: number) => void): Promise<string> => {
      if (!roomId) return "Chat isn't available here.";
      if (!ready) return "Wait until you've joined the room.";
      if (!/^image\/(jpe?g|png)$/i.test(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) return "Send a JPG or PNG photo.";
      try {
        const m = readRoomChat(await sendRoomChatImage(roomId, file, onProgress));
        if (m) {
          const lines = toLines([m]);
          if (lines.length) deliverRef.current(lines, false);
        }
        return "";
      } catch (e) {
        return e instanceof Error && e.message ? e.message : "Couldn't send the photo.";
      }
    },
    [roomId, ready, toLines],
  );

  return { send, sendImage, historyError, retryHistory: () => undefined, connection: status };
}
