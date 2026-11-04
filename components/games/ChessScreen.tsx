"use client";

import { useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Swords, WifiOff } from "lucide-react";
import { Button, ScreenHeader } from "@/components/ui/kit";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { useApp } from "@/lib/app/store";
import { useChessSocket } from "./useChessSocket";

/**
 * Online chess, from DevChess (github.com/DevdharManpuria/devchess, MIT).
 * Find a match pairs you with the next player who presses it; the first one
 * waiting plays white. The server checks every move with chess.js before the
 * opponent sees it. Leaving the screen mid-game counts as resigning.
 *
 * The chess server has no accounts, so the opponent shows as "Opponent", and
 * results don't give EXP (the server can't prove who won).
 */

type Color = "white" | "black";
type Reason = "checkmate" | "stalemate" | "repetition" | "insufficient_material" | "fifty_moves" | "opponent_left" | "connection_lost";
type Result = { winner: Color | null; reason: Reason };
type Move = { from: Square; to: Square; promotion?: "q" | "r" | "b" | "n" };

const DRAW_TEXT: Record<string, string> = {
  stalemate: "Stalemate.",
  repetition: "The same position came up three times.",
  insufficient_material: "Neither side can checkmate.",
  fifty_moves: "50 moves without a capture or pawn move.",
};

function resultText(r: Result, me: Color | null) {
  if (r.reason === "connection_lost") return { title: "Connection lost", sub: "The chess server dropped the game." };
  if (r.reason === "opponent_left") return { title: "You win!", sub: "Your opponent left the game." };
  if (!r.winner) return { title: "Draw", sub: DRAW_TEXT[r.reason] ?? "The game is a draw." };
  return r.winner === me ? { title: "You win!", sub: "Checkmate." } : { title: "You lost", sub: "Checkmate." };
}

export function ChessScreen({ onExit }: { onExit?: () => void } = {}) {
  const { pop: popScreen, profile } = useApp();
  const pop = onExit ?? popScreen;
  const [generation, setGeneration] = useState(0);
  const { socket, failedAttempts } = useChessSocket(generation);
  const chess = useRef(new Chess());
  const [, setTick] = useState(0);
  const redraw = () => setTick((n) => n + 1);
  const [color, setColor] = useState<Color | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [from, setFrom] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const playing = color !== null && !result;
  const colorRef = useRef(color);
  colorRef.current = color;

  useEffect(() => {
    if (!socket) return;
    socket.onmessage = (ev) => {
      let m: { type?: string; payload?: unknown };
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (m.type === "init_game") {
        const c = (m.payload as { color?: string })?.color;
        if (c !== "white" && c !== "black") return;
        chess.current = new Chess();
        setColor(c);
        setWaiting(false);
        setResult(null);
        setFrom(null);
        setTargets([]);
        redraw();
      } else if (m.type === "move") {
        try {
          chess.current.move(m.payload as Move);
        } catch {
          return; // The server already checked it, so this only happens if we fell out of sync
        }
        redraw();
      } else if (m.type === "game_over") {
        setResult(m.payload as Result);
      }
    };
  }, [socket]);

  // The socket dropped: a search is over, a game in progress is lost
  useEffect(() => {
    if (socket) return;
    setWaiting(false);
    if (colorRef.current) setResult((r) => r ?? { winner: null, reason: "connection_lost" });
  }, [socket]);

  const findMatch = () => {
    if (!socket) return;
    chess.current = new Chess();
    setColor(null);
    setResult(null);
    setFrom(null);
    setTargets([]);
    socket.send(JSON.stringify({ type: "init_game" }));
    setWaiting(true);
    redraw();
  };

  // The server only drops you from the queue when the connection closes
  const cancelSearch = () => {
    setWaiting(false);
    setGeneration((g) => g + 1);
  };

  const back = () => {
    if (playing && !confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    pop();
  };

  const c = chess.current;
  const mine = color ? color[0] : null;
  const myTurn = playing && c.turn() === mine;
  const flip = color === "black";
  const last = c.history({ verbose: true }).at(-1);
  const board = c.board();
  const checkSq = c.inCheck() ? board.flat().find((p) => p?.type === "k" && p.color === c.turn())?.square : undefined;

  const tap = (sq: Square) => {
    if (!socket || !myTurn) return;
    const piece = c.get(sq);
    if (piece && piece.color === mine) {
      if (from === sq) {
        setFrom(null);
        setTargets([]);
      } else {
        setFrom(sq);
        setTargets(c.moves({ square: sq, verbose: true }).map((m) => m.to));
      }
      return;
    }
    if (!from) return;
    if (!targets.includes(sq)) {
      setFrom(null);
      setTargets([]);
      return;
    }
    const moving = c.get(from);
    // Auto-queen, like DevChess
    const move: Move = moving?.type === "p" && (sq[1] === "8" || sq[1] === "1") ? { from, to: sq, promotion: "q" } : { from, to: sq };
    try {
      c.move(move);
    } catch {
      return;
    }
    socket.send(JSON.stringify({ type: "move", move }));
    setFrom(null);
    setTargets([]);
    redraw();
  };

  const rows = flip ? [...board].reverse().map((r) => [...r].reverse()) : board;
  const done = result ? resultText(result, color) : null;
  const opp: Color | null = color ? (color === "white" ? "black" : "white") : null;

  return (
    <div className="app-scroll h-full bg-[radial-gradient(130%_55%_at_50%_0%,#4a1626_0%,#2a1430_42%,#141018_100%)] pb-8">
      <ScreenHeader title="Chess" sub="Online match" onBack={back} />

      {confirmLeave ? (
        <div className="mx-4 mb-3 rounded-2xl bg-[#3a1418] p-3 ring-1 ring-[#ff8a8f]/30" role="alert">
          <p className="text-[13px] text-cream">Leave this game? Your opponent wins.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="danger" onClick={pop}>Leave game</Button>
            <Button size="sm" variant="soft" onClick={() => setConfirmLeave(false)}>Keep playing</Button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[460px] px-4">
        <PlayerBar
          avatar={<span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted"><Swords className="h-4 w-4" aria-hidden /></span>}
          name={color ? "Opponent" : waiting ? "Looking for a player…" : "Opponent"}
          side={opp}
          active={playing && !myTurn}
        />

        <div className="my-2 overflow-hidden rounded-xl shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)] ring-2 ring-gold/25" role="grid" aria-label="Chess board">
          {rows.map((row, i) => (
            <div key={i} className="flex" role="row">
              {row.map((p, j) => {
                const file = flip ? 7 - j : j;
                const rank = flip ? i + 1 : 8 - i;
                const sq = `${String.fromCharCode(97 + file)}${rank}` as Square;
                const dark = (i + j) % 2 === 1;
                const hl = from === sq ? "bg-[#f6d899]/70" : last && (last.from === sq || last.to === sq) ? "bg-[#f6d899]/40" : "";
                return (
                  <button
                    key={j}
                    type="button"
                    role="gridcell"
                    aria-label={`${sq}${p ? ` ${p.color === "w" ? "white" : "black"} ${p.type}` : ""}`}
                    onClick={() => tap(sq)}
                    className={`relative aspect-square w-[12.5%] ${dark ? "bg-[#8b5a3c]" : "bg-[#f0d9b5]"}`}
                    style={checkSq === sq ? { backgroundImage: "radial-gradient(circle closest-side, #ff2020, rgb(239 68 68 / 0.45))" } : undefined}
                  >
                    <span className={`absolute inset-0 grid place-items-center ${hl}`}>
                      {p ? <img src={`/chess/${p.color}${p.type}.svg`} alt="" className="h-[80%] w-[80%] select-none" draggable={false} /> : null}
                    </span>
                    {targets.includes(sq) ? (
                      <span className="pointer-events-none absolute inset-0 grid place-items-center">
                        <span className={p ? "h-[86%] w-[86%] rounded-full ring-4 ring-black/30" : "h-[26%] w-[26%] rounded-full bg-black/35"} />
                      </span>
                    ) : null}
                    {j === 0 ? <span className={`absolute left-0.5 top-0 text-[9px] font-bold ${dark ? "text-[#f0d9b5]" : "text-[#8b5a3c]"}`}>{rank}</span> : null}
                    {i === 7 ? <span className={`absolute bottom-0 right-0.5 text-[9px] font-bold ${dark ? "text-[#f0d9b5]" : "text-[#8b5a3c]"}`}>{String.fromCharCode(97 + file)}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <PlayerBar
          avatar={<PersonAvatar person={{ id: "me", look: profile.look, photo: profile.photo, frame: profile.frame }} size={36} />}
          name={profile.name}
          side={color}
          active={myTurn}
        />

        <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#2c1622]/95 to-[#1b1622]/95 p-4 ring-1 ring-gold/20" aria-live="polite">
          {!socket ? (
            <div className="flex items-start gap-3">
              <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
              <div>
                <p className="text-[14px] font-semibold text-cream">{result ? (done?.title ?? "") : "Connecting to the chess server…"}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {result ? done?.sub : failedAttempts > 2 ? "Still trying. The chess server may be off or waking up." : "This can take a moment."}
                </p>
              </div>
            </div>
          ) : done ? (
            <div className="text-center">
              <p className="font-display text-[22px] font-extrabold text-cream">{done.title}</p>
              <p className="mt-0.5 text-[12.5px] text-muted">{done.sub}</p>
              <Button size="lg" className="mt-4 w-full" onClick={findMatch}>Play again</Button>
            </div>
          ) : playing ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-cream">{myTurn ? "Your move" : "Opponent's move"}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  You play {color} · move {c.moveNumber()}
                  {c.inCheck() ? " · check!" : ""}
                </p>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${myTurn ? "bg-speak" : "bg-muted/50"}`} aria-hidden />
            </div>
          ) : waiting ? (
            <div className="text-center">
              <p className="text-[14px] font-semibold text-cream">Looking for an opponent…</p>
              <p className="mt-0.5 text-[12px] text-muted">You'll be paired with the next player who taps Find a match.</p>
              <Button size="md" variant="soft" className="mt-3" onClick={cancelSearch}>Cancel</Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[13px] text-muted">Play a real game against another Panchayat player.</p>
              <Button size="lg" className="mt-3 w-full" onClick={findMatch}>Find a match</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerBar({ avatar, name, side, active }: { avatar: React.ReactNode; name: string; side: Color | null; active: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-2xl px-2 py-1.5 transition-colors ${active ? "bg-speak/10 ring-1 ring-speak/40" : ""}`}>
      {avatar}
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-cream">{name}</span>
      {side ? (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${side === "white" ? "bg-[#f0d9b5] text-[#3b2414]" : "bg-[#1c1b22] text-cream ring-1 ring-line-strong"}`}>
          {side === "white" ? "White" : "Black"}
        </span>
      ) : null}
    </div>
  );
}
