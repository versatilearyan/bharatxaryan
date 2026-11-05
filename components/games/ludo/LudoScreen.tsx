"use client";

/**
 * Ludo at a room's table: lobby (stake, sit, start, invite), the board with a
 * real server dice, table chat, emotes and the room's voice. Opened from Home
 * with no room, it shows the game lobby (create a table / join with a code).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Crown, HelpCircle, LogOut, Mic, MicOff, Send, Smile, Users } from "lucide-react";
import { LUDO_EMOTES, LUDO_STAKES, SEAT_COLOR, ludoApi, ludoChatTopic, ludoTopic, readLudo, type LudoChat, type LudoGame } from "@/lib/api/ludo";
import { gameTopic } from "@/lib/api/jackaroo";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ChatInviteSheet } from "@/components/social/Invites";
import { GameLobby } from "@/components/games/GameLobby";
import { Coin } from "@/components/ui/kit";
import { notify } from "@/lib/app/notify";
import { useActiveVoice } from "@/lib/app/active-voice";
import { useApp } from "@/lib/app/store";
import { myUserIdFromToken } from "@/lib/auth/token";
import { subscribe } from "@/lib/realtime/stomp";
import { Dice, LudoBoard, rotationFor } from "./LudoBoard";

const BG = "bg-[radial-gradient(130%_80%_at_50%_0%,#4a1626_0%,#2a1430_45%,#141018_100%)]";
/** Screen corner for a seat once the board is turned so `mine` is bottom left. */
function cornerOf(seat: number, mine: number): "bl" | "tl" | "tr" | "br" {
  const order = ["tl", "tr", "br", "bl"] as const; // seats 0..3 unturned
  const steps = rotationFor(mine) / 90; // clockwise quarter turns
  const idx = (seat + steps) % 4;
  return order[idx];
}

function Avatar({ url, name, size = 40, color }: { url?: string; name: string; size?: number; color: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="rounded-full object-cover" style={{ width: size, height: size, boxShadow: `0 0 0 3px ${color}` }} />
  ) : (
    <span className="grid place-items-center rounded-full font-display font-bold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function LudoScreen({ roomId }: { roomId?: string }) {
  if (!roomId) return <GameLobby title="Ludo" art="ludo" blurb="Classic Ludo with friends. Roll a 6 to start, cut their tokens, race home. Talk on voice while you play." />;
  return <LudoTable roomId={roomId} />;
}

function LudoTable({ roomId }: { roomId: string }) {
  const { pop, toast, refreshCoins } = useApp();
  const myId = myUserIdFromToken();
  const voice = useActiveVoice();
  const [g, setG] = useState<LudoGame | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [stake, setStake] = useState<number>(0);
  const [help, setHelp] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [chat, setChat] = useState<LudoChat[]>([]);
  const [draft, setDraft] = useState("");
  const [emotes, setEmotes] = useState(false);
  const [bursts, setBursts] = useState<LudoChat[]>([]);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const lastRolls = useRef<number | null>(null);

  const apply = useCallback((x: LudoGame | null) => {
    if (!x) return;
    offset.current = x.serverTime - Date.now();
    setG((cur) => {
      if (cur && cur.id === x.id && x.version < cur.version) return cur;
      // The table topic has no "you": keep yours until the next personal answer
      return cur && cur.id === x.id && !x.you ? { ...x, you: recompute(x, myId) } : x;
    });
  }, [myId]);

  const load = useCallback(async () => {
    try {
      const x = await ludoApi.current(roomId);
      setG(x);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't load the table.", "error");
      setG(null);
    }
  }, [roomId, toast]);

  useEffect(() => {
    void load();
    const un = subscribe(gameTopic(roomId), (body) => {
      const x = readLudo(body);
      if (x) apply(x);
    });
    return un;
  }, [roomId, load, apply]);

  // Table + chat topics for this game
  const gid = g?.id;
  useEffect(() => {
    if (!gid) return;
    const a = subscribe(ludoTopic(gid), (body) => apply(readLudo(body)));
    const b = subscribe(ludoChatTopic(gid), (body) => {
      const m = body as LudoChat;
      if (!m?.id) return;
      setChat((c) => [...c.slice(-30), m]);
      if (m.emote) {
        setBursts((list) => [...list, m]);
        window.setTimeout(() => setBursts((list) => list.filter((x) => x.id !== m.id)), 2200);
      }
    });
    return () => {
      a();
      b();
    };
  }, [gid, apply]);

  // Turn clock
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  // Dice roll animation whenever a new roll happens
  useEffect(() => {
    if (!g) return;
    if (lastRolls.current !== null && g.rolls > lastRolls.current) {
      setRolling(true);
      window.setTimeout(() => setRolling(false), 650);
    }
    lastRolls.current = g.rolls;
  }, [g?.rolls, g]);

  // Your turn: a buzz
  const myTurnRef = useRef(false);
  useEffect(() => {
    const mine = Boolean(g?.you?.myTurn);
    if (mine && !myTurnRef.current) notify("alert");
    myTurnRef.current = mine;
  }, [g?.you?.myTurn]);

  // Winner: refresh coins
  useEffect(() => {
    if (g?.status === "FINISHED" && g.winner === myId && g.pot > 0) void refreshCoins();
  }, [g?.status, g?.winner, g?.pot, myId, refreshCoins]);

  const act = async (fn: () => Promise<LudoGame | null>) => {
    setBusy(true);
    try {
      const x = await fn();
      if (x) setG(x);
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "That didn't work.", "error");
      void load();
    } finally {
      setBusy(false);
    }
  };

  const send = async (text?: string, emote?: string) => {
    if (!g) return;
    try {
      await ludoApi.chat(g.id, text, emote);
      setDraft("");
      setEmotes(false);
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't send.", "error");
    }
  };

  const mySeat = g?.you?.seat ?? 3;
  const me = g?.players.find((p) => p.userId === myId);
  const turnPlayer = g?.players.find((p) => p.userId === g.turnUserId);
  const left = g?.turnEndsAt ? Math.max(0, Math.ceil((g.turnEndsAt - (now + offset.current)) / 1000)) : 0;
  const opener = g?.createdBy === myId;
  const seatsUsed = useMemo(() => new Set(g?.players.map((p) => p.seat)), [g?.players]);

  const header = (
    <header className="pt-safe flex items-center gap-2 px-3 pt-2">
      <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/35 text-cream">
        <ChevronLeft className="h-6 w-6" />
      </button>
      <h1 className="flex-1 bg-gradient-to-r from-[#fff1c9] via-gold to-[#ffb37a] bg-clip-text font-display text-[22px] font-extrabold text-transparent">Ludo</h1>
      {g && g.code && (g.status === "WAITING" || g.status === "PLAYING") ? (
        <button type="button" onClick={() => setInviting(true)} className="flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7b5cff] to-[#ff7fa8] px-3 text-[12px] font-extrabold text-white">
          <span className="font-mono tracking-wider">{g.code}</span> · Invite
        </button>
      ) : null}
      <button type="button" onClick={() => setHelp(true)} aria-label="How to play" className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-cream">
        <HelpCircle className="h-5 w-5" />
      </button>
      {me ? (
        <button
          type="button"
          onClick={() => {
            if (g?.status === "PLAYING" && !window.confirm(g.pot > 0 ? "Leave the game? You lose your stake." : "Leave the game?")) return;
            if (g) void act(() => ludoApi.leave(g.id));
          }}
          aria-label="Leave the table"
          className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-cream"
        >
          <LogOut className="h-5 w-5" />
        </button>
      ) : null}
    </header>
  );

  if (g === undefined)
    return (
      <div className={`h-full ${BG}`}>
        {header}
        <div className="mx-auto mt-32 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold" aria-label="Loading" />
      </div>
    );

  // No table yet: open one with a stake
  if (!g || g.status === "CANCELLED" || (g.status === "FINISHED" && !g.players.some((p) => p.userId === myId)))
    return (
      <div className={`app-scroll h-full ${BG} pb-10`}>
        {header}
        <div className="mx-4 mt-6 rounded-3xl bg-black/25 p-5 text-center ring-1 ring-gold/20">
          <div className="mx-auto flex w-fit gap-2">
            {SEAT_COLOR.map((c) => (
              <span key={c.name} className="h-5 w-5 rounded-full" style={{ background: c.main, boxShadow: `0 0 12px ${c.glow}` }} />
            ))}
          </div>
          <p className="mt-3 font-display text-[20px] font-extrabold text-cream">Open a Ludo table</p>
          <p className="mt-1 text-[12.5px] text-cream/70">2 to 4 players. Everyone puts in the stake when the game starts; the winner takes the whole pot.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Stake">
            {LUDO_STAKES.map((v) => (
              <button key={v} type="button" role="radio" aria-checked={stake === v} onClick={() => setStake(v)} className={`flex h-10 items-center gap-1 rounded-full px-3.5 text-[13px] font-bold ring-1 ${stake === v ? "bg-gold text-ink ring-gold" : "bg-white/5 text-cream ring-white/10"}`}>
                {v === 0 ? "Free" : (
                  <>
                    <Coin className="h-3.5 w-3.5" /> {v.toLocaleString("en-IN")}
                  </>
                )}
              </button>
            ))}
          </div>
          <motion.button whileTap={{ scale: 0.96 }} type="button" disabled={busy} onClick={() => void act(() => ludoApi.open(roomId, stake))} className="mt-5 h-12 w-full rounded-2xl bg-gradient-to-r from-coral to-gold text-[15px] font-extrabold text-white shadow-[0_8px_30px_-8px_rgba(244,81,91,0.7)] disabled:opacity-60">
            Open table
          </motion.button>
        </div>
      </div>
    );

  const myColor = SEAT_COLOR[mySeat].main;
  const corners: Record<string, string> = { tl: "left-1 top-1", tr: "right-1 top-1", bl: "left-1 bottom-1", br: "right-1 bottom-1" };

  return (
    <div className={`relative flex h-full flex-col overflow-hidden ${BG}`}>
      {header}

      {/* Pot + status */}
      <div className="mx-3 mt-1 flex items-center justify-between gap-2 text-[12px]">
        <span className="truncate text-cream/75">{g.last}</span>
        {g.pot > 0 || g.stake > 0 ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 font-bold text-gold ring-1 ring-gold/30">
            <Coin className="h-3.5 w-3.5" /> {(g.pot || g.stake * g.players.length).toLocaleString("en-IN")} pot
          </span>
        ) : null}
      </div>

      {/* Board with players in the corners */}
      <div className="relative mx-auto mt-2 w-full max-w-[460px] px-2">
        <LudoBoard g={g} mySeat={mySeat} highlight={g.you?.movable ?? []} onToken={(t) => g.you?.myTurn && void act(() => ludoApi.move(g.id, t))} />
        {g.players.map((p) => {
          const c = SEAT_COLOR[p.seat];
          const turn = g.turnUserId === p.userId && g.status === "PLAYING";
          const corner = cornerOf(p.seat, mySeat);
          const burst = bursts.filter((b) => b.userId === p.userId).at(-1);
          return (
            <div key={p.userId} className={`pointer-events-none absolute ${corners[corner]} flex w-[34%] flex-col items-center justify-center`} style={{ aspectRatio: "1 / 1" }}>
              <div className="relative">
                {turn ? (
                  <svg className="absolute -inset-1.5" viewBox="0 0 52 52" aria-hidden>
                    <circle cx={26} cy={26} r={24} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={3} />
                    <circle cx={26} cy={26} r={24} fill="none" stroke={c.main} strokeWidth={3} strokeLinecap="round" strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - left / g.turnSeconds)} transform="rotate(-90 26 26)" />
                  </svg>
                ) : null}
                <span className={p.left ? "opacity-30 grayscale" : ""}>
                  <Avatar url={p.avatarUrl} name={p.name} size={40} color={c.main} />
                </span>
                {voice?.speakingIds.includes(`srv-user:${p.userId}`) ? <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-speak ring-2 ring-ink" /> : null}
                <AnimatePresence>
                  {burst ? (
                    <motion.span key={burst.id} initial={{ scale: 0, y: 0, opacity: 0 }} animate={{ scale: 1.6, y: -30, opacity: 1 }} exit={{ opacity: 0, y: -50 }} className="absolute left-1/2 top-0 -translate-x-1/2 text-[22px]">
                      {burst.emote}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
              <span className="mt-1 max-w-full truncate rounded-full bg-black/45 px-2 py-0.5 text-[10.5px] font-bold text-white">{p.userId === myId ? "You" : p.name}</span>
              {p.home ? <span className="text-[10px] font-bold" style={{ color: c.main }}>🏠 {p.home}/4</span> : null}
            </div>
          );
        })}
      </div>

      {/* Dice / actions */}
      <div className="mt-2 flex flex-col items-center gap-1.5">
        {g.status === "WAITING" ? (
          <div className="w-full max-w-[460px] px-4">
            <div className="rounded-2xl bg-black/30 p-3 text-center ring-1 ring-gold/20">
              <p className="text-[13px] font-semibold text-cream">
                {g.players.length}/4 at the table{g.stake > 0 ? ` · stake ${g.stake.toLocaleString("en-IN")} coins each` : " · free game"}
              </p>
              <div className="mt-2 flex gap-2">
                {!me ? (
                  <button type="button" disabled={busy || g.players.length >= 4} onClick={() => void act(() => ludoApi.sit(g.id))} className="h-11 flex-1 rounded-xl bg-gradient-to-r from-coral to-gold text-[14px] font-extrabold text-white disabled:opacity-50">
                    Sit down{g.stake > 0 ? ` (${g.stake} coins)` : ""}
                  </button>
                ) : opener ? (
                  <button type="button" disabled={busy || g.players.length < 2} onClick={() => void act(() => ludoApi.start(g.id))} className="h-11 flex-1 rounded-xl bg-gradient-to-r from-coral to-gold text-[14px] font-extrabold text-white disabled:opacity-50">
                    {g.players.length < 2 ? "Waiting for players…" : "Start game"}
                  </button>
                ) : (
                  <p className="flex-1 py-2.5 text-[12.5px] text-cream/70">Waiting for the host to start…</p>
                )}
                <button type="button" onClick={() => setInviting(true)} className="flex h-11 items-center gap-1 rounded-xl bg-white/10 px-3 text-[13px] font-bold text-cream">
                  <Users className="h-4 w-4" /> Invite
                </button>
              </div>
              <div className="mt-2 flex justify-center gap-1.5">
                {[0, 1, 2, 3].map((s) => (
                  <span key={s} className={`h-2.5 w-2.5 rounded-full ${seatsUsed.has(s) ? "" : "opacity-25"}`} style={{ background: SEAT_COLOR[s].main }} />
                ))}
              </div>
            </div>
          </div>
        ) : g.status === "PLAYING" ? (
          <div className="flex items-center gap-4">
            <Dice
              value={g.dice}
              rolling={rolling}
              color={turnPlayer ? SEAT_COLOR[turnPlayer.seat].glow : "rgba(0,0,0,0.4)"}
              size={g.you?.canRoll ? 74 : 60}
              disabled={!g.you?.canRoll || busy}
              onClick={g.you?.canRoll ? () => void act(() => ludoApi.roll(g.id)) : undefined}
            />
            <div className="min-w-[120px]">
              <p className="text-[14px] font-extrabold" style={{ color: turnPlayer ? SEAT_COLOR[turnPlayer.seat].main : undefined }}>
                {g.you?.myTurn ? (g.you.canRoll ? "Tap the dice!" : "Pick a token") : `${turnPlayer?.name ?? "…"}'s turn`}
              </p>
              <p className="text-[11.5px] text-cream/60">{left}s left</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Chat feed */}
      <div className="pointer-events-none mt-auto px-3 pb-1">
        <AnimatePresence initial={false}>
          {chat.slice(-3).map((m) => (
            <motion.p key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="mb-1 w-fit max-w-[85%] truncate rounded-full bg-black/45 px-3 py-1 text-[12px] text-cream">
              <b style={{ color: m.seat != null ? SEAT_COLOR[m.seat].main : "#e7bc72" }}>{m.userId === myId ? "You" : m.name}</b> {m.text ?? m.emote}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      {/* Chat / emotes / voice */}
      <div className="pb-safe border-t border-gold/15 bg-black/30 px-3 py-2">
        <AnimatePresence>
          {emotes ? (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-2 grid grid-cols-6 gap-1.5 overflow-hidden">
              {LUDO_EMOTES.map((e) => (
                <motion.button key={e} whileTap={{ scale: 0.8 }} type="button" onClick={() => void send(undefined, e)} className="grid h-10 place-items-center rounded-xl bg-white/5 text-[22px]">
                  {e}
                </motion.button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) void send(draft.trim());
          }}
        >
          <button
            type="button"
            aria-label={voice?.muted === false && voice.seated ? "Mute" : "Talk"}
            onClick={() => {
              if (!voice) return toast("Voice works when you're in the table's room.", "error");
              if (!voice.seated) {
                if (!voice.sitToTalk()) toast("No free seat in the room to talk from.", "error");
                return;
              }
              voice.toggleMute();
            }}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${voice?.seated && !voice.muted ? "bg-speak text-ink" : "bg-white/10 text-cream"}`}
          >
            {voice?.seated && !voice.muted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 120))} placeholder="Say something…" aria-label="Table chat" className="h-10 min-w-0 flex-1 rounded-full bg-white/5 px-4 text-[13.5px] text-cream ring-1 ring-white/10 placeholder:text-cream/40 focus:outline-none focus:ring-gold/50" />
          <button type="button" onClick={() => setEmotes((v) => !v)} aria-label="Emotes" className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${emotes ? "bg-gold text-ink" : "bg-white/10 text-cream"}`}>
            <Smile className="h-5 w-5" />
          </button>
          <button type="submit" disabled={!draft.trim()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-coral to-gold text-white disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Winner */}
      <AnimatePresence>
        {g.status === "FINISHED" ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 grid place-items-center bg-black/60 backdrop-blur-sm">
            <Confetti />
            <motion.div initial={{ scale: 0.7, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative mx-6 rounded-3xl bg-gradient-to-b from-[#4a1626] to-[#1c1824] px-6 py-6 text-center ring-1 ring-gold/50">
              <Crown className="mx-auto h-12 w-12 text-gold drop-shadow-[0_0_12px_rgba(231,188,114,0.8)]" />
              {(() => {
                const w = g.players.find((p) => p.userId === g.winner);
                const mine = g.winner === myId;
                return (
                  <>
                    <p className="mt-2 font-display text-[24px] font-extrabold text-cream">{mine ? "You won! 🎉" : w ? `${w.name} won!` : "Game over"}</p>
                    {g.pot > 0 ? (
                      <p className="mt-1 flex items-center justify-center gap-1 text-[15px] font-bold text-gold">
                        <Coin className="h-4 w-4" /> {g.pot.toLocaleString("en-IN")} coins {mine ? "added to your balance" : "to the winner"}
                      </p>
                    ) : null}
                  </>
                );
              })()}
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={pop} className="h-11 flex-1 rounded-xl bg-white/10 text-[14px] font-bold text-cream">
                  Back
                </button>
                <button type="button" onClick={() => void act(() => ludoApi.open(roomId, g.stake))} className="h-11 flex-1 rounded-xl bg-gradient-to-r from-coral to-gold text-[14px] font-extrabold text-white">
                  Play again
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {g.code ? <ChatInviteSheet open={inviting} onClose={() => setInviting(false)} kind="GAME" roomId={roomId} gameId={g.id} code={g.code} title="Invite to Ludo" /> : null}
      <BottomSheet open={help} onClose={() => setHelp(false)} title="How to play Ludo">
        <ul className="space-y-2 px-5 pb-6 text-[13.5px] leading-relaxed text-cream/85">
          <li>🎲 Tap the dice on your turn. You need a <b>6</b> to bring a token out.</li>
          <li>➡️ Tap a glowing token to move it by the dice.</li>
          <li>✂️ Land on someone&apos;s token to send it home. Stars and coloured start squares are safe.</li>
          <li>🔁 A 6, a cut or bringing a token home gives you another roll. Three 6s in a row lose the turn.</li>
          <li>🏠 Get all 4 tokens home first to win{g.stake > 0 ? " the pot" : ""}. You need the exact number to finish.</li>
          <li>⏱ {g.turnSeconds}s per step. If time runs out the game plays for you.</li>
        </ul>
      </BottomSheet>
      <span className="sr-only" aria-live="polite">
        {g.you?.myTurn ? "Your turn" : ""}
      </span>
      <span className="hidden" style={{ color: myColor }} />
    </div>
  );
}

/** "you" from a table update (the topic doesn't carry it). */
function recompute(g: LudoGame, myId: string | null): LudoGame["you"] {
  const p = g.players.find((x) => x.userId === myId);
  if (!p) return undefined;
  const myTurn = g.status === "PLAYING" && g.turnUserId === myId;
  return { seat: p.seat, myTurn, canRoll: myTurn && g.phase === "ROLL", movable: myTurn && g.phase === "MOVE" ? movable(p.tokens, g.dice) : [] };
}

/** Which of your tokens can move with this dice (the server re-checks every move). */
function movable(tokens: number[], dice: number): number[] {
  const out: number[] = [];
  tokens.forEach((pos, t) => {
    if (pos === 56) return;
    if (pos === -1) {
      if (dice === 6) out.push(t);
      return;
    }
    if (pos + dice <= 56) out.push(t);
  });
  return out;
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ i, x: Math.random() * 100, d: 1.6 + Math.random() * 1.4, c: SEAT_COLOR[i % 4].main, r: Math.random() * 360 })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <motion.span key={b.i} className="absolute top-0 h-3 w-1.5 rounded-sm" style={{ left: `${b.x}%`, background: b.c }} initial={{ y: -20, rotate: b.r }} animate={{ y: "110vh", rotate: b.r + 360 }} transition={{ duration: b.d, repeat: Infinity, delay: Math.random() }} />
      ))}
    </div>
  );
}
