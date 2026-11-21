"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gameTopic, jackarooApi, readGame, type JGame } from "@/lib/api/jackaroo";
import { ludoApi, readLudo, type LudoGame } from "@/lib/api/ludo";
import { useApp } from "@/lib/app/store";
import { subscribe } from "@/lib/realtime/stomp";

/** A table that actually has someone sitting at it (not just an empty table nobody ever joined). */
const atTable = (g: { status: string; players: unknown[] } | null): g is { status: string; players: unknown[] } =>
  Boolean(g && g.players.length > 0 && (g.status === "WAITING" || g.status === "PLAYING"));

/** A floating pill in the room while a Ludo or Jackaroo table actually has players at it: tap to watch or join. */
export function RoomGamePill({ roomId, inRoom }: { roomId?: string; inRoom: boolean }) {
  const { push } = useApp();
  const [ludo, setLudo] = useState<LudoGame | null>(null);
  const [jack, setJack] = useState<JGame | null>(null);
  useEffect(() => {
    if (!roomId || !inRoom) {
      setLudo(null);
      setJack(null);
      return;
    }
    let off = false;
    ludoApi.current(roomId).then((x) => !off && setLudo(x)).catch(() => undefined);
    jackarooApi.current(roomId).then((x) => !off && setJack(x)).catch(() => undefined);
    const un = subscribe(gameTopic(roomId), (body) => {
      const l = readLudo(body);
      if (l) return setLudo(l);
      const j = readGame(body);
      if (j) setJack(j);
    });
    return () => {
      off = true;
      un();
    };
  }, [roomId, inRoom]);

  const shown = atTable(ludo) ? ({ kind: "ludo", g: ludo } as const) : atTable(jack) ? ({ kind: "jackaroo", g: jack } as const) : null;

  return (
    <AnimatePresence>
      {shown && roomId ? (
        <motion.button
          type="button"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          onClick={() => push({ kind: shown.kind, roomId })}
          className="absolute right-2 top-[calc(var(--st)+108px)] z-30 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7b5cff] to-[#ff7fa8] py-1.5 pl-2 pr-3 text-[11.5px] font-extrabold text-white shadow-[0_6px_20px_-6px_rgba(123,92,255,0.9)]"
        >
          <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.6, repeat: Infinity }} aria-hidden>
            {shown.kind === "ludo" ? "🎲" : "🃏"}
          </motion.span>
          {shown.kind === "ludo" ? "🎲 Ludo" : "🃏 Jackaroo"} · {shown.g.status === "WAITING" ? `${shown.g.players.length}/4 · Join` : "Watch"}
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
