"use client";

/**
 * Chess: a lobby of live chess rooms (watch anyone playing), create a room,
 * join with a code, or a quick 1-on-1 match. In a room two people play and
 * everyone else watches; join the queue to get your number. The winner stays
 * on, the next in line plays. Moves are checked on the chess server.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Chess, type Square } from "chess.js";
import { ChevronLeft, Copy, Crown, Eye, Flag, Hash, Loader2, LogOut, Plus, Share2, Swords, Users, WifiOff, Zap } from "lucide-react";
import { Toran } from "@/components/ui/Toran";
import { useApp } from "@/lib/app/store";
import { useChessSocket } from "./useChessSocket";
import { ChessScreen } from "./ChessScreen";

type Seat = { name: string; avatar: string | null } | null;
type RoomCard = { code: string; title: string; status: "waiting" | "playing" | "over"; white: Seat; black: Seat; queue: number; watchers: number };
type RoomState = {
  code: string;
  title: string;
  status: "waiting" | "playing" | "over";
  fen: string;
  lastMove: { from: string; to: string } | null;
  moveNumber: number;
  turn: "white" | "black";
  check: boolean;
  white: Seat;
  black: Seat;
  queue: { name: string; avatar: string | null }[];
  watchers: number;
  result: { winner: "white" | "black" | null; reason: string } | null;
  wins: Record<string, number>;
  you: { role: "white" | "black" | "queue" | "watcher"; position: number | null };
};

const REASON: Record<string, string> = {
  checkmate: "Checkmate",
  resign: "Resigned",
  opponent_left: "Opponent left",
  stalemate: "Stalemate",
  repetition: "Repetition",
  insufficient_material: "No mating material",
  fifty_moves: "50-move rule",
};

function Avatar({ seat, size = 36 }: { seat: Seat; size?: number }) {
  if (seat?.avatar)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={seat.avatar} alt="" className="rounded-full object-cover ring-2 ring-white/10" style={{ width: size, height: size }} />;
  return (
    <span className="grid place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-coral font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {seat ? seat.name.slice(0, 1).toUpperCase() : "?"}
    </span>
  );
}

export function ChessHub() {
  const { pop, profile, toast } = useApp();
  const [mode, setMode] = useState<"hub" | "quick">("hub");
  const { socket, failedAttempts } = useChessSocket(0);
  const [rooms, setRooms] = useState<RoomCard[] | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const send = (m: object) => socket?.send(JSON.stringify(m));

  useEffect(() => {
    if (!socket) return;
    socket.onmessage = (ev) => {
      let m: { type?: string; payload?: unknown };
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (m.type === "rooms") setRooms(m.payload as RoomCard[]);
      else if (m.type === "room_state") {
        setRoom(m.payload as RoomState);
        setBusy(false);
      } else if (m.type === "room_error") {
        toast((m.payload as { message?: string })?.message ?? "That didn't work", "error");
        setBusy(false);
      }
    };
    const photo = typeof profile.photo === "string" && /^https:\/\//.test(profile.photo) ? profile.photo : undefined;
    socket.send(JSON.stringify({ type: "hello", name: (profile.name || "Player").slice(0, 40), ...(photo ? { avatar: photo } : {}) }));
    socket.send(JSON.stringify({ type: "list_rooms" }));
    // Back in the room after a reconnect
    if (room) socket.send(JSON.stringify({ type: "join_room", code: room.code }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  if (mode === "quick") return <ChessScreen onExit={() => setMode("hub")} />;

  if (room)
    return (
      <ChessRoomView
        room={room}
        send={send}
        connected={Boolean(socket)}
        onLeave={() => {
          send({ type: "leave_room" });
          setRoom(null);
          send({ type: "list_rooms" });
        }}
      />
    );

  return (
    <div className="app-scroll relative h-full bg-[radial-gradient(130%_55%_at_50%_0%,#4a1626_0%,#2a1430_42%,#141018_100%)] pb-10">
      <Toran />
      <header className="pt-safe relative flex h-16 items-center gap-2 px-3">
        <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/30 text-cream">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="bg-gradient-to-r from-[#fff1c9] via-gold to-[#ffb37a] bg-clip-text font-display text-[22px] font-extrabold text-transparent">Chess Chaupal</h1>
          <p className="text-[11px] text-cream/60">Play, watch and wait your turn</p>
        </div>
      </header>

      {/* Hero */}
      <div className="relative mx-4 mt-1 overflow-hidden rounded-3xl bg-gradient-to-br from-[#5a1a28] via-[#3a1420] to-[#1c1b22] p-4 ring-1 ring-gold/30">
        <div className="absolute right-3 top-2 flex gap-0.5 opacity-90">
          {["wk", "bq", "wn"].map((k, i) => (
            <motion.img
              key={k}
              src={`/chess/${k}.svg`}
              alt=""
              className="h-12 w-12 drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
            />
          ))}
        </div>
        <p className="relative mt-10 max-w-[70%] font-display text-[18px] font-extrabold leading-tight text-cream">The whole chaupal is watching</p>
        <p className="relative mt-1 max-w-[75%] text-[12px] text-cream/70">Winner stays on. Join the queue and take your number.</p>
      </div>
      {!socket ? (
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-black/30 p-4 ring-1 ring-gold/15">
          <WifiOff className="h-5 w-5 text-muted" />
          <p className="text-[13px] text-cream/80">{failedAttempts > 2 ? "The chess server isn't answering. Trying again…" : "Connecting to the chess server…"}</p>
        </div>
      ) : null}

      <div className="mx-4 mt-3 grid grid-cols-2 gap-2.5">
        <motion.button whileTap={{ scale: 0.96 }} type="button" disabled={!socket || busy} onClick={() => (setBusy(true), send({ type: "create_room" }))} className="flex h-[88px] flex-col items-start justify-between rounded-2xl bg-gradient-to-br from-coral to-gold p-3.5 text-left text-white shadow-[0_8px_26px_-10px_rgba(244,81,91,0.8)] ring-1 ring-white/15 disabled:opacity-60">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          <span className="font-display text-[15px] font-extrabold leading-tight">Create a room</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => setMode("quick")} className="flex h-[88px] flex-col items-start justify-between rounded-2xl bg-gradient-to-br from-[#5a1a36] to-[#2a1430] p-3.5 text-left text-cream shadow-[0_8px_26px_-12px_rgba(0,0,0,0.9)] ring-1 ring-gold/35">
          <Zap className="h-5 w-5" />
          <span className="font-display text-[15px] font-extrabold leading-tight">Quick match</span>
        </motion.button>
      </div>

      <div className="mx-4 mt-3 flex gap-2 rounded-2xl bg-black/30 p-2 ring-1 ring-gold/20">
        <span className="grid w-9 place-items-center text-gold">
          <Hash className="h-5 w-5" />
        </span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
          placeholder="Room code"
          aria-label="Chess room code"
          className="h-11 min-w-0 flex-1 bg-transparent font-mono text-[16px] tracking-[0.25em] text-cream placeholder:tracking-normal placeholder:text-muted/60 focus:outline-none"
        />
        <button type="button" disabled={!socket || code.length < 4} onClick={() => (setBusy(true), send({ type: "join_room", code }))} className="h-11 rounded-xl bg-gold px-4 text-[13px] font-extrabold text-ink disabled:opacity-50">
          Join
        </button>
      </div>

      <h2 className="mx-5 mt-6 flex items-center gap-2 font-display text-[17px] font-bold text-cream">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
        </span>
        Live chess rooms
      </h2>
      <div className="mt-2.5 space-y-2.5 px-4">
        {rooms === null && socket ? <div className="h-20 animate-pulse rounded-2xl bg-[#2c1622]/80" /> : null}
        {rooms?.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-[#2c1622]/90 to-[#1b1622]/90 px-4 py-6 text-center ring-1 ring-gold/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/chess/wn.svg" alt="" className="h-12 w-12 opacity-80" />
            <p className="mt-2 text-[13.5px] font-bold text-cream">The chaupal is quiet</p>
            <p className="mt-0.5 text-[12px] text-cream/60">Create a room and share the code with friends.</p>
          </div>
        ) : null}
        {rooms?.map((r, i) => (
          <motion.button
            key={r.code}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 6) * 0.04 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => send({ type: "join_room", code: r.code })}
            className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#2c1622]/95 to-[#1b1622]/95 p-3 text-left ring-1 ring-gold/15"
          >
            <div className="flex -space-x-2">
              <Avatar seat={r.white} size={34} />
              <Avatar seat={r.black} size={34} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-cream">{r.title}</p>
              <p className="truncate text-[11.5px] text-muted">
                {r.white?.name ?? "—"} vs {r.black?.name ?? "waiting…"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${r.status === "playing" ? "bg-speak/15 text-speak" : "bg-gold/15 text-gold"}`}>{r.status === "playing" ? "Live" : "Open"}</span>
              <span className="flex items-center gap-2 text-[10.5px] text-muted">
                <span className="flex items-center gap-0.5">
                  <Eye className="h-3 w-3" /> {r.watchers}
                </span>
                <span className="flex items-center gap-0.5">
                  <Users className="h-3 w-3" /> {r.queue}
                </span>
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ChessRoomView({ room, send, connected, onLeave }: { room: RoomState; send: (m: object) => void; connected: boolean; onLeave: () => void }) {
  const { toast } = useApp();
  const board = useMemo(() => {
    const c = new Chess();
    try {
      c.load(room.fen);
    } catch {
      /* keep the start */
    }
    return c;
  }, [room.fen]);
  const [from, setFrom] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);
  const lastFen = useRef(room.fen);
  useEffect(() => {
    if (lastFen.current !== room.fen) {
      lastFen.current = room.fen;
      setFrom(null);
      setTargets([]);
    }
  }, [room.fen]);

  const me = room.you.role;
  const playing = room.status === "playing";
  const myColor = me === "white" || me === "black" ? me : null;
  const myTurn = playing && myColor === room.turn;
  const flip = myColor === "black";
  const rows = flip ? [...board.board()].reverse().map((r) => [...r].reverse()) : board.board();
  const checkSq = room.check ? board.board().flat().find((p) => p?.type === "k" && p.color === board.turn())?.square : undefined;
  const top: Seat = flip ? room.white : room.black;
  const bottom: Seat = flip ? room.black : room.white;
  const topColor = flip ? "white" : "black";
  const bottomColor = flip ? "black" : "white";

  const tap = (sq: Square) => {
    if (!myTurn) return;
    const mine = myColor === "white" ? "w" : "b";
    const piece = board.get(sq);
    if (piece && piece.color === mine) {
      if (from === sq) {
        setFrom(null);
        setTargets([]);
      } else {
        setFrom(sq);
        setTargets(board.moves({ square: sq, verbose: true }).map((m) => m.to));
      }
      return;
    }
    if (!from || !targets.includes(sq)) {
      setFrom(null);
      setTargets([]);
      return;
    }
    const moving = board.get(from);
    const move = moving?.type === "p" && (sq[1] === "8" || sq[1] === "1") ? { from, to: sq, promotion: "q" } : { from, to: sq };
    send({ type: "room_move", move });
    setFrom(null);
    setTargets([]);
  };

  const share = async () => {
    const text = `♟️ Come play chess with me on Panchayat! Room code: ${room.code}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Invite copied. Paste it in a chat!");
      }
    } catch {
      /* cancelled */
    }
  };

  const winnerName = room.result?.winner ? (room.result.winner === "white" ? room.white?.name : room.black?.name) : null;

  const SeatBar = ({ seat, color }: { seat: Seat; color: "white" | "black" }) => {
    const active = playing && room.turn === color;
    const wins = seat ? (room.wins[seat.name] ?? 0) : 0;
    return (
      <div className={`flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition-colors ${active ? "bg-gold/10 ring-1 ring-gold/50" : "bg-black/25 ring-1 ring-white/5"}`}>
        <Avatar seat={seat} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold text-cream">{seat ? seat.name : "Empty seat"}</span>
          {wins ? (
            <span className="flex items-center gap-1 text-[10.5px] font-bold text-gold">
              <Crown className="h-3 w-3" /> {wins} {wins === 1 ? "win" : "wins"} streak
            </span>
          ) : null}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${color === "white" ? "bg-[#f0d9b5] text-[#3b2414]" : "bg-[#1c1b22] text-cream ring-1 ring-white/15"}`}>{color === "white" ? "White" : "Black"}</span>
      </div>
    );
  };

  return (
    <div className="app-scroll h-full bg-[radial-gradient(130%_55%_at_50%_0%,#4a1626_0%,#2a1430_42%,#141018_100%)] pb-10">
      <header className="pt-safe sticky top-0 z-20 border-b border-gold/10 bg-[#2a1420]/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-3">
          <button type="button" onClick={onLeave} aria-label="Leave room" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream">
            <LogOut className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[17px] font-bold text-cream">{room.title}</h1>
            <p className="flex items-center gap-2 text-[11px] text-muted">
              <span className="font-mono tracking-wider text-gold">#{room.code}</span>
              <span className="flex items-center gap-0.5">
                <Eye className="h-3 w-3" /> {room.watchers} here
              </span>
              {!connected ? <span className="text-coral">reconnecting…</span> : null}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(room.code);
              toast(`Code ${room.code} copied`);
            }}
            aria-label="Copy code"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-cream"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => void share()} aria-label="Invite friends" className="grid h-10 w-10 place-items-center rounded-full bg-gold text-ink">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[460px] px-3">
        <SeatBar seat={top} color={topColor} />
        <div className="relative my-2 overflow-hidden rounded-xl shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)] ring-2 ring-gold/25" role="grid" aria-label="Chess board">
          {rows.map((row, i) => (
            <div key={i} className="flex" role="row">
              {row.map((p, j) => {
                const file = flip ? 7 - j : j;
                const rank = flip ? i + 1 : 8 - i;
                const sq = `${String.fromCharCode(97 + file)}${rank}` as Square;
                const dark = (i + j) % 2 === 1;
                const hl = from === sq ? "bg-[#f6d899]/70" : room.lastMove && (room.lastMove.from === sq || room.lastMove.to === sq) ? "bg-[#f6d899]/40" : "";
                return (
                  <button key={j} type="button" role="gridcell" onClick={() => tap(sq)} aria-label={sq} className={`relative aspect-square w-[12.5%] ${dark ? "bg-[#8b5a3c]" : "bg-[#f0d9b5]"}`} style={checkSq === sq ? { backgroundImage: "radial-gradient(circle closest-side, #ff2020, rgb(239 68 68 / 0.45))" } : undefined}>
                    <span className={`absolute inset-0 grid place-items-center ${hl}`}>
                      {p ? (
                        <motion.img key={`${sq}-${p.color}${p.type}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={`/chess/${p.color}${p.type}.svg`} alt="" className="h-[80%] w-[80%] select-none" draggable={false} />
                      ) : null}
                    </span>
                    {targets.includes(sq) ? (
                      <span className="pointer-events-none absolute inset-0 grid place-items-center">
                        <span className={p ? "h-[86%] w-[86%] rounded-full ring-4 ring-black/30" : "h-[26%] w-[26%] rounded-full bg-black/35"} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
          <AnimatePresence>
            {room.status === "over" && room.result ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="rounded-3xl bg-[#2a1420]/95 px-6 py-4 text-center ring-1 ring-gold/40">
                  <Crown className="mx-auto h-8 w-8 text-gold" />
                  <p className="mt-1 font-display text-[20px] font-extrabold text-cream">{winnerName ? `${winnerName} wins!` : "Draw"}</p>
                  <p className="text-[12px] text-muted">{REASON[room.result.reason] ?? room.result.reason} · next game in a few seconds</p>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <SeatBar seat={bottom} color={bottomColor} />

        {/* You */}
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-[#2c1622]/95 to-[#1b1622]/95 p-3.5 ring-1 ring-gold/20" aria-live="polite">
          {myColor ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-cream">{playing ? (myTurn ? "Your move" : "Opponent's move") : room.status === "waiting" ? "Waiting for an opponent…" : "Game over"}</p>
                <p className="text-[11.5px] text-muted">
                  You play {myColor} · move {room.moveNumber}
                  {room.check ? " · check!" : ""}
                </p>
              </div>
              {playing ? (
                <button type="button" onClick={() => window.confirm("Resign this game?") && send({ type: "resign" })} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-cream">
                  <Flag className="h-3.5 w-3.5" /> Resign
                </button>
              ) : null}
            </div>
          ) : me === "queue" ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <motion.span key={room.you.position} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold to-[#ff9b5b] font-display text-[22px] font-extrabold text-ink">
                  #{room.you.position}
                </motion.span>
                <div>
                  <p className="text-[14px] font-bold text-cream">You&apos;re in the queue</p>
                  <p className="text-[11.5px] text-muted">{room.you.position === 1 ? "You play the winner of this game!" : `${(room.you.position ?? 1) - 1} ahead of you`}</p>
                </div>
              </div>
              <button type="button" onClick={() => send({ type: "queue_leave" })} className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-cream">
                Leave queue
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[14px] font-bold text-cream">
                  <Eye className="h-4 w-4 text-gold" /> Watching
                </p>
                <p className="text-[11.5px] text-muted">Join the queue to play the winner.</p>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => send({ type: "queue_join" })} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-coral to-gold px-4 py-2 text-[13px] font-extrabold text-white">
                <Swords className="h-4 w-4" /> Join queue
              </motion.button>
            </div>
          )}
        </div>

        {/* Queue */}
        <div className="mt-3 rounded-2xl bg-black/25 p-3.5 ring-1 ring-gold/10">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
            <Users className="h-3.5 w-3.5" /> Waiting to play · {room.queue.length}
          </p>
          {room.queue.length ? (
            <ol className="mt-2 space-y-1.5">
              {room.queue.map((q, i) => (
                <li key={`${q.name}-${i}`} className="flex items-center gap-2.5">
                  <span className="w-6 text-center font-mono text-[12px] font-bold text-gold">#{i + 1}</span>
                  <Avatar seat={q} size={26} />
                  <span className="truncate text-[13px] text-cream/90">{q.name}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1.5 text-[12px] text-muted">Nobody yet. Share the code #{room.code} with friends.</p>
          )}
        </div>
      </div>
    </div>
  );
}
