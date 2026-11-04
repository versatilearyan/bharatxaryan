"use client";

/**
 * Lobby for a board game opened from Home (no room yet):
 *  - Create a table: makes a game room on the server, takes you in, opens the game.
 *    Friends join from the chat invite or with the table's 6-character code.
 *  - Join with a code someone shared.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Hash, Loader2, Plus, Users } from "lucide-react";
import { createRoom, joinRoom } from "@/lib/api/voice-rooms";
import { jackarooApi } from "@/lib/api/jackaroo";
import { useJoinGameByCode } from "@/components/social/Invites";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { GameArt } from "@/components/art/GameArt";
import type { GameId } from "@/lib/app/types";

export function GameLobby({ title, art, blurb }: { title: string; art: GameId; blurb: string }) {
  const { pop, push, profile, enterRoom, toast } = useApp();
  const { addCreated } = useServerRooms();
  const joinByCode = useJoinGameByCode();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  const create = async () => {
    setBusy("create");
    try {
      const v = await createRoom({ name: `${profile.name || "My"}'s ${title} table`.slice(0, 60), roomType: "VOICE", isPrivate: false, maxParticipants: 12 });
      addCreated(v);
      await joinRoom(v.id).catch(() => undefined);
      await jackarooApi.open(v.id);
      enterRoom(serverRoomAppId(v.id));
      window.setTimeout(() => push({ kind: "jackaroo", roomId: v.id }), 600);
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't make a table.", "error");
    } finally {
      setBusy(null);
    }
  };
  const join = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return toast("Enter the table code your friend shared.", "error");
    setBusy("join");
    await joinByCode(c);
    setBusy(null);
  };

  return (
    <div className="app-scroll relative h-full bg-[radial-gradient(120%_70%_at_50%_0%,#3a1d5c,#16101f_60%)] pb-10">
      <header className="pt-safe flex items-center gap-2 px-3 pt-2">
        <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="font-display text-[20px] font-extrabold text-cream">{title}</h1>
      </header>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-3 overflow-hidden rounded-[28px] ring-1 ring-gold/25">
        <div className="relative aspect-[16/9]">
          <GameArt id={art} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <motion.span
            className="absolute -left-10 top-0 h-full w-16 rotate-12 bg-white/15 blur-md"
            animate={{ x: ["0%", "900%"] }}
            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
          />
          <p className="absolute bottom-3 left-4 right-4 text-[13px] leading-snug text-cream/90">{blurb}</p>
        </div>
      </motion.div>

      <div className="mx-4 mt-5 space-y-3">
        <motion.button whileTap={{ scale: 0.97 }} type="button" disabled={busy !== null} onClick={() => void create()} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-coral to-gold text-[16px] font-extrabold text-white shadow-[0_8px_30px_-8px_rgba(244,81,91,0.7)] disabled:opacity-60">
          {busy === "create" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Create a table
        </motion.button>
        <p className="text-center text-[11.5px] text-muted">You get a code to share. Invite friends from chat, or they join with the code.</p>

        <div className="rounded-2xl bg-surface/80 p-4 ring-1 ring-line">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-cream">
            <Hash className="h-4 w-4 text-gold" /> Join with a code
          </p>
          <div className="mt-2.5 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
              placeholder="e.g. K7Q2MX"
              aria-label="Table code"
              className="h-12 min-w-0 flex-1 rounded-xl bg-black/30 px-4 font-mono text-[18px] tracking-[0.3em] text-cream ring-1 ring-white/10 placeholder:tracking-normal placeholder:text-muted/60 focus:outline-none focus:ring-gold/50"
            />
            <motion.button whileTap={{ scale: 0.95 }} type="button" disabled={busy !== null || code.length < 4} onClick={() => void join()} className="h-12 rounded-xl bg-[#7b5cff] px-5 text-[14px] font-extrabold text-white disabled:opacity-50">
              {busy === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
            </motion.button>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/5">
          <Users className="h-5 w-5 shrink-0 text-speak" />
          <p className="text-[12px] leading-snug text-cream/75">2 to 4 players. Everyone at the table can talk on voice while you play. Wins earn EXP.</p>
        </div>
      </div>
    </div>
  );
}
