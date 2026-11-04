"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Crown, Flame, HelpCircle, LogOut, Play, Users } from "lucide-react";
import { CELLS, HOME, MY_GAME_QUEUE, STRIDE, gameTopic, jackarooApi, readGame, readYou, type JGame, type JMove, type JPlayer, type JYou } from "@/lib/api/jackaroo";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { notify } from "@/lib/app/notify";
import { useApp } from "@/lib/app/store";
import { myUserIdFromToken } from "@/lib/auth/token";
import { subscribe } from "@/lib/realtime/stomp";

const COLORS = ["#ff5c7a", "#4fb3ff", "#ffd166", "#5ee6a5"];
const DEEP = ["#b3203f", "#1f6fc0", "#c79a1f", "#1f9a63"];
const SIZE = 400;
const C = SIZE / 2;
const R = 168;

const errText = (e: unknown, f: string) => (e instanceof Error && e.message ? e.message : f);

/** Screen position of a board cell, rotated so your start is at the bottom. */
function cellXY(abs: number, mySeat: number) {
  const a = ((90 + (abs - mySeat * STRIDE) * (360 / CELLS)) * Math.PI) / 180;
  return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
}
function homeXY(seat: number, h: number, mySeat: number) {
  const a = ((90 + (seat * STRIDE - 0.5 - mySeat * STRIDE) * (360 / CELLS)) * Math.PI) / 180;
  const r = R - 26 * (h + 1);
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}
function baseXY(seat: number, k: number, mySeat: number) {
  const a = ((90 + (seat * STRIDE + 7 - mySeat * STRIDE) * (360 / CELLS)) * Math.PI) / 180;
  const bx = C + 112 * Math.cos(a);
  const by = C + 112 * Math.sin(a);
  return { x: bx + (k % 2 ? 11 : -11), y: by + (k < 2 ? -11 : 11) };
}
function marbleXY(p: JPlayer, k: number, mySeat: number) {
  const pos = p.marbles[k];
  if (pos < 0) return baseXY(p.seat, k, mySeat);
  if (pos >= HOME) return homeXY(p.seat, pos - HOME, mySeat);
  return cellXY(pos, mySeat);
}

const isRed = (card: string) => /[HD]$/.test(card);
const rankOf = (card: string) => card.slice(0, -1);
const suitOf = (card: string) => ({ S: "♠", H: "♥", D: "♦", C: "♣" })[card.slice(-1)] ?? "";

/**
 * Jackaroo at a room's table: lobby (sit, start), then the board with
 * everyone's marbles moving live, your cards, the turn timer, and the result.
 */
export function JackarooScreen({ roomId }: { roomId?: string }) {
  const { pop, toast } = useApp();
  const myId = myUserIdFromToken();
  const [game, setGame] = useState<JGame | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState<number | null>(null);
  const [swapFrom, setSwapFrom] = useState<number | null>(null);
  const [help, setHelp] = useState(false);
  const offset = useRef(0);
  const [now, setNow] = useState(Date.now());

  const apply = useCallback((g: JGame | null, keepYou = false) => {
    if (!g) return setGame(null);
    offset.current = g.serverTime - Date.now();
    setGame((cur) => {
      if (cur && cur.id === g.id && g.version < cur.version) return cur;
      return keepYou && cur && cur.id === g.id ? { ...g, you: g.you ?? cur.you } : g;
    });
  }, []);

  const load = useCallback(async () => {
    if (!roomId) return setGame(null);
    try {
      apply(await jackarooApi.current(roomId));
    } catch (e) {
      toast(errText(e, "Couldn't load the game."), "error");
      setGame(null);
    }
  }, [roomId, apply, toast]);
  useEffect(() => {
    void load();
  }, [load]);

  // Live table and your own hand
  useEffect(() => {
    if (!roomId) return;
    const a = subscribe(gameTopic(roomId), (body) => apply(readGame(body), true));
    const b = subscribe(MY_GAME_QUEUE, (body) => {
      const you = readYou(body);
      const gid = body && typeof body === "object" ? String((body as { gameId?: unknown }).gameId ?? "") : "";
      if (!you) return;
      setGame((cur) => (cur && cur.id === gid ? { ...cur, you } : cur));
    });
    return () => {
      a();
      b();
    };
  }, [roomId, apply]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  // Your turn: a ping, and the selection resets
  const myTurn = Boolean(game?.you?.myTurn);
  const turnKey = `${game?.id}:${game?.turnUserId}:${game?.version}`;
  const prevTurn = useRef(false);
  useEffect(() => {
    if (myTurn && !prevTurn.current) notify("alert");
    prevTurn.current = myTurn;
    setCard(null);
    setSwapFrom(null);
  }, [myTurn, turnKey]);

  const act = async (f: () => Promise<JGame | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      apply(await f());
    } catch (e) {
      toast(errText(e, "That didn't work."), "error");
      void load();
    } finally {
      setBusy(false);
    }
  };

  const mySeat = game?.you?.seat ?? 0;
  const legalFor = useMemo(() => (game?.you?.legal ?? []).filter((m) => m.card === card), [game?.you?.legal, card]);

  const tapMarble = (p: JPlayer, k: number) => {
    if (!game || !myTurn || card === null) return;
    if (p.userId === myId) {
      const options = legalFor.filter((m) => m.marble === k);
      if (!options.length) return;
      const swaps = options.filter((m) => m.action === "SWAP");
      if (swaps.length === options.length) return setSwapFrom(k);
      if (options.length === 1) return act(() => jackarooApi.play(game.id, options[0].index));
      setSwapFrom(null);
      return; // several choices (A: 1 or 11): the chips below
    }
    if (swapFrom !== null) {
      const m = legalFor.find((x) => x.action === "SWAP" && x.marble === swapFrom && x.targetSeat === p.seat && x.targetMarble === k);
      if (m) void act(() => jackarooApi.play(game.id, m.index));
    }
  };

  const back = (
    <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream backdrop-blur">
      <ChevronLeft className="h-6 w-6" />
    </button>
  );

  if (!roomId)
    return (
      <div className="h-full bg-ink p-3">
        {back}
        <p className="mt-20 text-center text-[13px] text-muted">Open Jackaroo from inside a room.</p>
      </div>
    );

  if (game === undefined)
    return (
      <div className="h-full bg-[#0f1220] p-3">
        {back}
        <div className="mx-auto mt-32 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold" aria-label="Loading" />
      </div>
    );

  const inGame = Boolean(game?.players.some((p) => p.userId === myId));
  const turnLeft = game?.turnEndsAt ? Math.max(0, Math.ceil((game.turnEndsAt - (now + offset.current)) / 1000)) : 0;
  const turnPlayer = game?.players.find((p) => p.userId === game.turnUserId);
  const seatsTaken = new Map((game?.players ?? []).map((p) => [p.seat, p]));
  const opener = game?.createdBy === myId;
  const won = game?.status === "FINISHED" && myId ? game.winners.includes(myId) : false;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#2a2350,#0f1220_60%)]">
      <header className="pt-safe flex items-center gap-2 px-3 pb-1 pt-2">
        {back}
        <h1 className="flex-1 font-display text-[19px] font-extrabold text-cream">Jackaroo</h1>
        <button type="button" onClick={() => setHelp(true)} aria-label="How to play" className="grid h-10 w-10 place-items-center rounded-full bg-black/30 text-cream/80">
          <HelpCircle className="h-5 w-5" />
        </button>
        {inGame && game && game.status !== "FINISHED" ? (
          <button type="button" disabled={busy} onClick={() => act(() => jackarooApi.leave(game.id))} aria-label="Leave the game" className="grid h-10 w-10 place-items-center rounded-full bg-black/30 text-cream/80">
            <LogOut className="h-5 w-5" />
          </button>
        ) : null}
      </header>

      {/* No table yet */}
      {!game ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-[64px]" aria-hidden>
            🎲
          </motion.div>
          <p className="mt-2 font-display text-[20px] font-extrabold text-cream">Play Jackaroo</p>
          <p className="mt-1 text-[13px] text-cream/60">A card and marble race for 2 or 4 players. Teams sit opposite each other.</p>
          <button type="button" disabled={busy} onClick={() => act(() => jackarooApi.open(roomId))} className="mt-6 flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#7b5cff] to-[#ff7fa8] px-7 text-[15px] font-extrabold text-white shadow-[0_10px_30px_-10px_rgba(123,92,255,0.8)]">
            <Play className="h-5 w-5" /> Open a table
          </button>
        </div>
      ) : (
        <>
          {/* Board */}
          <div className="relative mx-auto mt-1 aspect-square w-full max-w-[440px] px-2">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="Jackaroo board">
              <defs>
                <radialGradient id="jk-felt" cx="50%" cy="45%" r="60%">
                  <stop offset="0" stopColor="#3a2f6e" />
                  <stop offset="1" stopColor="#1a1638" />
                </radialGradient>
              </defs>
              <circle cx={C} cy={C} r={R + 22} fill="url(#jk-felt)" stroke="#ffd98a55" strokeWidth="2" />
              <circle cx={C} cy={C} r={R - 116} fill="#0f0d22" stroke="#ffd98a33" />
              <text x={C} y={C + 6} textAnchor="middle" fontSize="16" fontWeight="800" fill="#ffd98a" opacity=".8">
                {game.lastCard ? `${rankOf(game.lastCard)}${suitOf(game.lastCard)}` : "♠♥"}
              </text>
              {/* Ring */}
              {Array.from({ length: CELLS }, (_, i) => {
                const { x, y } = cellXY(i, mySeat);
                const seatStart = i % STRIDE === 0 ? i / STRIDE : -1;
                return <circle key={i} cx={x} cy={y} r={seatStart >= 0 ? 8.5 : 5.5} fill={seatStart >= 0 ? COLORS[seatStart] : "#ffffff22"} stroke={seatStart >= 0 ? "#fff" : "none"} strokeWidth="1.5" opacity={seatStart >= 0 ? 0.85 : 1} />;
              })}
              {/* Home lanes and bases */}
              {[0, 1, 2, 3].map((s) => (
                <g key={s} opacity={seatsTaken.has(s) ? 1 : 0.35}>
                  {[0, 1, 2, 3].map((h) => {
                    const { x, y } = homeXY(s, h, mySeat);
                    return <circle key={h} cx={x} cy={y} r="7" fill="none" stroke={COLORS[s]} strokeWidth="2" />;
                  })}
                  {[0, 1, 2, 3].map((k) => {
                    const { x, y } = baseXY(s, k, mySeat);
                    return <circle key={k} cx={x} cy={y} r="8" fill={`${COLORS[s]}22`} stroke={`${COLORS[s]}88`} />;
                  })}
                </g>
              ))}
              {/* Marbles */}
              {game.players.map((p) =>
                p.marbles.map((_, k) => {
                  const { x, y } = marbleXY(p, k, mySeat);
                  const mine = p.userId === myId;
                  const playable = myTurn && card !== null && mine && legalFor.some((m) => m.marble === k);
                  const target = myTurn && swapFrom !== null && !mine && legalFor.some((m) => m.action === "SWAP" && m.marble === swapFrom && m.targetSeat === p.seat && m.targetMarble === k);
                  const chosen = mine && swapFrom === k;
                  return (
                    <motion.g key={`${p.seat}-${k}`} initial={false} animate={{ x, y }} transition={{ type: "spring", stiffness: 120, damping: 16 }} onClick={() => tapMarble(p, k)} style={{ cursor: playable || target ? "pointer" : "default" }}>
                      {playable || target || chosen ? (
                        <motion.circle r="14" fill="none" stroke={target ? "#fff" : "#ffd98a"} strokeWidth="2.5" animate={{ r: [12, 16, 12], opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                      ) : null}
                      <circle r="9" fill={COLORS[p.seat]} stroke={DEEP[p.seat]} strokeWidth="2" />
                      <circle r="3.2" cx="-2.6" cy="-2.6" fill="#ffffffcc" />
                      {/* A bigger tap area */}
                      <circle r="16" fill="transparent" />
                    </motion.g>
                  );
                }),
              )}
            </svg>
            {/* Player chips around the board */}
            {[0, 1, 2, 3].map((s) => {
              const p = seatsTaken.get(s);
              const rel = (s - mySeat + 4) % 4; // 0 bottom, 1 left, 2 top, 3 right (clockwise)
              const pos = ["bottom-1 left-1/2 -translate-x-1/2", "left-1 top-1/2 -translate-y-1/2", "top-1 left-1/2 -translate-x-1/2", "right-1 top-1/2 -translate-y-1/2"][rel];
              const turn = p && p.userId === game.turnUserId && game.status === "PLAYING";
              return (
                <div key={s} className={`absolute ${pos} pointer-events-auto`}>
                  {p ? (
                    <div className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[11px] font-bold text-white shadow-lg ${p.left ? "opacity-40" : ""}`} style={{ background: `linear-gradient(90deg, ${DEEP[s]}, ${COLORS[s]})`, boxShadow: turn ? `0 0 0 3px #fff, 0 0 18px ${COLORS[s]}` : undefined }}>
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-black/30">{p.name.slice(0, 1)}</span>
                      )}
                      <span className="max-w-[70px] truncate">{p.userId === myId ? "You" : p.name}</span>
                      {game.status === "PLAYING" ? <span className="rounded-full bg-black/25 px-1">🂠{p.cards}</span> : null}
                      {turn ? <span className="tabular-nums">{turnLeft}s</span> : null}
                    </div>
                  ) : game.status === "WAITING" ? (
                    <button type="button" disabled={busy} onClick={() => act(() => jackarooApi.sit(game.id, s))} className="rounded-full border border-dashed px-3 py-1 text-[11px] font-bold" style={{ borderColor: COLORS[s], color: COLORS[s] }}>
                      {inGame ? "Move here" : "Sit here"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* What just happened */}
          <AnimatePresence mode="wait">
            <motion.p key={game.last} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-4 mt-1 rounded-full bg-black/30 px-3 py-1.5 text-center text-[12px] text-cream/85">
              {game.last}
            </motion.p>
          </AnimatePresence>

          {/* Lobby controls */}
          {game.status === "WAITING" ? (
            <div className="mx-4 mt-3 rounded-3xl bg-black/30 p-4 text-center ring-1 ring-white/10">
              <p className="flex items-center justify-center gap-1.5 text-[13px] text-cream">
                <Users className="h-4 w-4" /> {game.players.length} / 4 seated · needs 2 or 4
              </p>
              {!inGame ? (
                <button type="button" disabled={busy || game.players.length >= 4} onClick={() => act(() => jackarooApi.sit(game.id))} className="mt-3 h-11 w-full rounded-full bg-gradient-to-r from-[#7b5cff] to-[#ff7fa8] text-[14px] font-extrabold text-white disabled:opacity-50">
                  Take a seat
                </button>
              ) : opener ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" disabled={busy} onClick={() => act(() => jackarooApi.cancel(game.id))} className="h-11 rounded-full bg-white/10 text-[13.5px] font-bold text-cream">
                    Close table
                  </button>
                  <button type="button" disabled={busy || (game.players.length !== 2 && game.players.length !== 4)} onClick={() => act(() => jackarooApi.start(game.id))} className="h-11 rounded-full bg-gold text-[14px] font-extrabold text-ink disabled:opacity-50">
                    Start
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-[12px] text-cream/60">Waiting for the host to start…</p>
              )}
            </div>
          ) : null}

          {/* Your cards */}
          {game.status === "PLAYING" && game.you ? (
            <div className="mt-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              <p className="mb-1.5 text-center text-[12px] font-bold text-cream/80">
                {myTurn ? (game.you.mustBurn ? "No move possible: tap a card to burn it" : card === null ? "Your turn: pick a card" : swapFrom !== null ? "Now tap the marble to swap with" : "Tap a glowing marble") : `${turnPlayer?.name ?? "…"}'s turn`}
                {myTurn ? <span className="ml-1.5 tabular-nums text-gold">{turnLeft}s</span> : null}
              </p>
              <div className="flex justify-center gap-2">
                {game.you.hand.map((c, i) => {
                  const usable = myTurn && (game.you!.mustBurn || game.you!.legal.some((m) => m.card === i));
                  const sel = card === i;
                  return (
                    <motion.button
                      key={`${c}-${i}`}
                      type="button"
                      layout
                      initial={{ y: 40, opacity: 0, rotate: (i - 1.5) * 6 }}
                      animate={{ y: sel ? -14 : 0, opacity: 1, rotate: (i - 1.5) * 4 }}
                      whileTap={{ scale: 0.94 }}
                      disabled={!myTurn || busy}
                      onClick={() => {
                        if (game.you!.mustBurn) return void act(() => jackarooApi.burn(game.id, i));
                        setSwapFrom(null);
                        setCard(sel ? null : i);
                      }}
                      className={`relative flex h-[92px] w-[64px] flex-col justify-between rounded-xl bg-gradient-to-b from-white to-[#f1ecff] p-1.5 shadow-xl ring-2 ${sel ? "ring-gold" : usable ? "ring-white/60" : "ring-transparent opacity-60"}`}
                      aria-label={`Card ${rankOf(c)} ${suitOf(c)}`}
                    >
                      <span className={`text-left text-[15px] font-extrabold leading-none ${isRed(c) ? "text-[#d6203d]" : "text-[#1a1638]"}`}>
                        {rankOf(c)}
                        <br />
                        {suitOf(c)}
                      </span>
                      <span className={`self-center text-[26px] leading-none ${isRed(c) ? "text-[#d6203d]" : "text-[#1a1638]"}`}>{suitOf(c)}</span>
                      {game.you!.mustBurn && myTurn ? <Flame className="absolute right-1 top-1 h-3.5 w-3.5 text-[#ff7a3d]" /> : null}
                    </motion.button>
                  );
                })}
              </div>
              {/* Choices when a card and marble allow more than one move (Ace 1 or 11, swaps) */}
              {myTurn && card !== null && legalFor.length ? (
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {legalFor
                    .filter((m) => m.action !== "SWAP" || swapFrom === null || m.marble === swapFrom)
                    .slice(0, 8)
                    .map((m: JMove) => (
                      <button key={m.index} type="button" disabled={busy} onClick={() => act(() => jackarooApi.play(game.id, m.index))} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-cream ring-1 ring-white/15">
                        <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: COLORS[game.you!.seat] }} />
                        {m.marble + 1}: {m.label}
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {game.status === "PLAYING" && !game.you ? <p className="mt-auto pb-8 text-center text-[12.5px] text-cream/60">You&apos;re watching. Next game, take a seat!</p> : null}
        </>
      )}

      {/* Result */}
      <AnimatePresence>
        {game && game.status === "FINISHED" ? (
          <motion.div className="absolute inset-0 z-20 grid place-items-center bg-black/60 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {won
              ? Array.from({ length: 24 }, (_, i) => (
                  <motion.span key={i} className="pointer-events-none absolute top-0 text-[18px]" style={{ left: `${(i * 41) % 100}%` }} initial={{ y: -40, rotate: 0 }} animate={{ y: 900, rotate: 360 }} transition={{ duration: 2.4 + (i % 5) * 0.3, delay: (i % 8) * 0.1, ease: "easeIn" }}>
                    {["🎉", "✨", "🏆", "🎊"][i % 4]}
                  </motion.span>
                ))
              : null}
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="w-full max-w-[320px] rounded-3xl bg-gradient-to-b from-[#3a2f6e] to-[#1a1638] p-6 text-center ring-1 ring-gold/50">
              <Crown className="mx-auto h-12 w-12 text-gold" />
              <p className="mt-2 font-display text-[22px] font-extrabold text-cream">{won ? "You won!" : "Game over"}</p>
              <p className="mt-1 text-[13px] text-cream/70">{game.last}</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={pop} className="h-11 rounded-full bg-white/10 text-[13.5px] font-bold text-cream">
                  Back to room
                </button>
                <button type="button" disabled={busy} onClick={() => act(() => jackarooApi.open(roomId))} className="h-11 rounded-full bg-gold text-[14px] font-extrabold text-ink">
                  New table
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <BottomSheet open={help} onClose={() => setHelp(false)} title="How to play Jackaroo">
        <div className="space-y-2 px-5 pb-6 text-[13px] text-cream/85">
          <p>Get all your marbles round the board and into your home lane. In 4 players, you win with your teammate (sitting opposite).</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>A</b> bring a marble out, or move 1 or 11 · <b>K</b> bring out or move 13
            </li>
            <li>
              <b>Q</b> move 12 · <b>J</b> swap one of your marbles with anyone&apos;s
            </li>
            <li>
              <b>4</b> moves backwards · other cards move that many
            </li>
            <li>Land on a marble to send it back to its base.</li>
            <li>No move possible? Burn a card. Each turn lasts {game?.turnSeconds ?? 25} seconds.</li>
          </ul>
        </div>
      </BottomSheet>
    </div>
  );
}
