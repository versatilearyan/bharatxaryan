"use client";

import { useEffect, useState } from "react";
import { CHESS_WS_URL } from "@/lib/config";

const MAX_RETRY_DELAY_MS = 10_000;

/**
 * One WebSocket to the chess server (chess-server/, from DevChess) while the
 * chess screen is open. Reconnects after 1 s, 2 s, 4 s, 8 s, then every 10 s.
 * Bumping `generation` drops the connection and opens a new one. Closing the screen
 * closes the socket, which the server counts as leaving the game.
 */
export function useChessSocket(generation: number) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    let current: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let stopped = false;

    const connect = () => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(CHESS_WS_URL);
      } catch {
        // A bad URL (or ws:// on an https page) throws right away
        setFailed((n) => n + 1);
        return;
      }
      current = ws;
      ws.onopen = () => {
        attempt = 0;
        setFailed(0);
        setSocket(ws);
      };
      ws.onclose = () => {
        if (current === ws) setSocket(null);
        if (stopped) return;
        setFailed((n) => n + 1);
        const delay = Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
        attempt++;
        retry = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      current?.close();
      setSocket(null);
    };
  }, [generation]);

  return { socket, failedAttempts: failed };
}
