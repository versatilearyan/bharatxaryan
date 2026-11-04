"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gameTopic, jackarooApi, readGame, type JGame } from "@/lib/api/jackaroo";
import { useApp } from "@/lib/app/store";
import { subscribe } from "@/lib/realtime/stomp";

/** A floating pill in the room while a Jackaroo table is open or playing: tap to watch or join. */
export function RoomGamePill({ roomId, inRoom }: { roomId?: string; inRoom: boolean }) {
  const { push } = useApp();
  const [g, setG] = useState<JGame | null>(null);
  useEffect(() => {
    if (!roomId || !inRoom) return setG(null);
    let off = false;
    jackarooApi
      .current(roomId)
      .then((x) => !off && setG(x))
      .catch(() => undefined);
    const un = subscribe(gameTopic(roomId), (body) => setG(readGame(body)));
    return () => {
      off = true;
      un();
    };
  }, [roomId, inRoom]);
  const show = g && (g.status === "WAITING" || g.status === "PLAYING");
  return (
    <AnimatePresence>
      {show && roomId ? (
        <motion.button
          type="button"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          onClick={() => push({ kind: "jackaroo", roomId })}
          className="absolute right-2 top-[calc(env(safe-area-inset-top)+108px)] z-30 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7b5cff] to-[#ff7fa8] py-1.5 pl-2 pr-3 text-[11.5px] font-extrabold text-white shadow-[0_6px_20px_-6px_rgba(123,92,255,0.9)]"
        >
          <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.6, repeat: Infinity }} aria-hidden>
            🎲
          </motion.span>
          Jackaroo · {g.status === "WAITING" ? `${g.players.length}/4 · Join` : "Watch"}
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
