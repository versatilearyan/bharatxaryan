"use client";

/**
 * Raja Mantri Chor Sipahi: 4 or 5 chairs round a 3D table inside a voice room (so everyone can talk on the mic), chat and
 * emotes. Chairs nobody takes are filled by the game. The cards are hidden: you see only your own until one is shown.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronLeft, Copy, Hash, Loader2, Mic, MicOff, Plus, Send, Share2, Users, X } from "lucide-react";
import { subscribe } from "@/lib/realtime/stomp";
import { myUserIdFromToken } from "@/lib/auth/token";
import { useActiveVoice } from "@/lib/app/active-voice";
import { useApp } from "@/lib/app/store";
import { ROLE_INFO, isTableKey, readChatLine, rmcsApi, rmcsTables, rmcsTopic, tableKey, type RmcsChat, type RmcsOpenTable, type RmcsSeat, type RmcsTable } from "@/lib/api/rmcs";
import { sfx, wakeSound } from "@/lib/games/gaddarSound";
import { SoundToggle } from "@/components/games/gaddar/GaddarExtras";
import { ChatInviteSheet } from "@/components/social/Invites";

const BG = "bg-[radial-gradient(120%_70%_at_50%_0%,#4b1d6b_0%,#241038_50%,#120a1e_100%)]";
const COLORS = ["#ff5f7e", "#ffb02e", "#3ddc97", "#4da3ff", "#b57cff"];

/** Seats go round an oval, the first one at the bottom (you). Returns left/top in percent. */
function spot(i: number, n: number) {
  const a = Math.PI / 2 + (i / n) * Math.PI * 2;
  return { left: 50 + Math.cos(a) * 41, top: 47 + Math.sin(a) * 36 };
}

function Pic({ s, size, ring }: { s: Pick<RmcsSeat, "name" | "avatarUrl">; size: number; ring?: string }) {
  const [bad, setBad] = useState(false);
  return (
    <span className="relative grid place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#7c4dff] to-[#ff3d8b] font-black text-white shadow-lg" style={{ width: size, height: size, boxShadow: ring ? `0 0 0 3px ${ring}, 0 0 18px ${ring}` : undefined, fontSize: size * 0.42 }}>
      {s.avatarUrl && !bad ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} className="h-full w-full object-cover" />
      ) : (
        (s.name || "?").slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/** A card that flips (3D). */
function Card({ role, up, size = 1, mine, glow }: { role?: keyof typeof ROLE_INFO; up: boolean; size?: number; mine?: boolean; glow?: boolean }) {
  const info = role ? ROLE_INFO[role] : null;
  return (
    <div className="[perspective:600px]" style={{ width: 44 * size, height: 62 * size }}>
      <motion.div className="relative h-full w-full [transform-style:preserve-3d]" animate={{ rotateY: up ? 180 : 0, y: up ? -4 : 0 }} transition={{ type: "spring", stiffness: 160, damping: 15 }}>
        <div className="absolute inset-0 grid place-items-center rounded-xl bg-gradient-to-br from-[#ff3d8b] via-[#7c4dff] to-[#2d1a6b] ring-2 ring-white/60 [backface-visibility:hidden]" style={mine ? { boxShadow: "0 0 14px #ffe27a" } : undefined}>
          <span className="text-[18px] drop-shadow" style={{ fontSize: 20 * size }}>
            ♛
          </span>
        </div>
        <div className="absolute inset-0 grid place-items-center rounded-xl bg-gradient-to-b from-white to-[#fff3d0] ring-2 [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ borderColor: info?.tone, boxShadow: glow && info ? `0 0 18px ${info.tone}` : undefined, outline: info ? `2px solid ${info.tone}` : undefined }}>
          {info ? (
            <span className="text-center leading-none">
              <span style={{ fontSize: 24 * size }}>{info.icon}</span>
              <span className="mt-0.5 block font-black uppercase text-[#2a1440]" style={{ fontSize: 8.5 * size }}>
                {info.name}
              </span>
            </span>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

export function RmcsScreen({ roomId, table }: { roomId?: string; table?: string }) {
  if (table) return <Table roomId={tableKey(table)} />;
  if (roomId) return <Table roomId={roomId} />;
  return <Entrance />;
}

/** The front door from Game Modes: open a table (you get a code), join by code, or join an open table. No voice room needed. */
function Entrance() {
  const { pop, replaceTop, push, toast } = useApp();
  const voice = useActiveVoice();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<RmcsOpenTable[] | null>(null);
  const [guide, setGuide] = useState(false);
  const refresh = useCallback(() => {
    rmcsTables.list().then(setOpen).catch(() => setOpen([]));
  }, []);
  useEffect(() => {
    refresh();
    const i = window.setInterval(refresh, 6000);
    return () => window.clearInterval(i);
  }, [refresh]);
  const go = async (what: string, f: () => Promise<RmcsTable>) => {
    if (busy) return;
    setBusy(what);
    try {
      const t = await f();
      if (t.roomId) replaceTop({ kind: "rmcs", table: t.roomId });
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Nahi hua.", "error");
      refresh();
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className={`app-scroll h-full ${BG} pb-10 text-white`}>
      <header className="pt-safe flex items-center gap-2 px-3 pt-2">
        <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/40">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-display text-[17px] font-black uppercase tracking-tight">Raja Mantri Chor Sipahi</h1>
        <button type="button" onClick={() => setGuide(true)} aria-label="Kaise khelte hain" className="grid h-10 w-10 place-items-center rounded-full bg-gold text-ink">
          <BookOpen className="h-5 w-5" />
        </button>
      </header>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative mx-4 mt-3 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#7c4dff] via-[#c2417a] to-[#ff8a3d] p-5 text-center shadow-[0_18px_40px_-14px_rgba(124,77,255,0.7)] ring-1 ring-white/30">
        <motion.div aria-hidden className="relative mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-white/20 text-[46px] shadow-[0_12px_0_-4px_rgba(0,0,0,0.25),inset_0_2px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40" animate={{ y: [0, -7, 0], rotate: [-3, 3, -3] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
          👑
        </motion.div>
        <h2 className="mt-4 font-display text-[clamp(21px,6.6vw,28px)] font-black uppercase leading-none tracking-tight drop-shadow-[0_3px_0_rgba(80,20,90,0.55)]">Raja Mantri Chor Sipahi</h2>
        <p className="mt-2 text-[13.5px] font-bold leading-snug text-white/95">Chhupe patte, bluff aur point. Mantri ko Chor pehchanna hai, warna Chor uske 800 le jata hai.</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {["Bina voice room", "4 ya 5 chair", "Chat + emotes"].map((x) => (
            <span key={x} className="rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-white/25">
              {x}
            </span>
          ))}
        </div>
      </motion.section>
      <div className="mx-4 mt-4 space-y-3">
        <button type="button" disabled={busy !== null} onClick={() => void go("create", () => rmcsTables.create())} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff3d8b] to-[#ffb347] text-[17px] font-black uppercase tracking-wide shadow-[0_6px_0_#a3204f,0_14px_28px_-8px_rgba(255,61,139,0.7)] active:translate-y-[3px] active:shadow-[0_3px_0_#a3204f] disabled:opacity-60">
          {busy === "create" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Naya table kholo
        </button>
        <p className="text-center text-[12px] font-bold text-cream/70">Aapko ek code milega. Dost us code se judenge, ya table ko sabke liye khula rakho.</p>
        {voice?.roomServerId ? (
          <button type="button" onClick={() => push({ kind: "rmcs", roomId: voice.roomServerId })} className="h-12 w-full rounded-2xl bg-white/10 text-[14px] font-extrabold ring-1 ring-white/20">
            🎙️ Apne voice room me khelo (mic ke saath)
          </button>
        ) : null}
        <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
          <p className="flex items-center gap-1.5 text-[14px] font-extrabold">
            <Hash className="h-4 w-4 text-gold" /> Code se judo
          </p>
          <div className="mt-2.5 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="jaise K7Q2MX" aria-label="Table code" className="h-12 min-w-0 flex-1 rounded-xl bg-black/30 px-4 font-mono text-[18px] tracking-[0.3em] placeholder:tracking-normal placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold/50" />
            <button type="button" disabled={busy !== null || code.length < 4} onClick={() => void go("join", () => rmcsTables.join(code))} className="h-12 rounded-xl bg-[#7b5cff] px-5 text-[14px] font-extrabold disabled:opacity-50">
              {busy === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Judo"}
            </button>
          </div>
        </div>
        <div>
          <h3 className="flex items-center gap-2 font-display text-[18px] font-black">
            <Users className="h-5 w-5" aria-hidden /> Khule tables
          </h3>
          <ul className="mt-2 space-y-2">
            {open === null ? <li className="rounded-2xl bg-black/20 p-4 text-center text-[13px] text-cream/60">Dhoondh rahe hain…</li> : null}
            {open?.length === 0 ? <li className="rounded-2xl bg-black/20 p-4 text-center text-[13px] text-cream/60">Abhi koi khula table nahi hai. Pehle aap kholo!</li> : null}
            {open?.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/15 text-[20px]" aria-hidden>
                  👑
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold">{t.host} ka table</span>
                  <span className="block text-[11.5px] text-cream/60">
                    {t.players}/{t.max} baithe
                  </span>
                </span>
                <button type="button" disabled={busy !== null} onClick={() => void go(t.id, () => rmcsTables.joinById(t.id))} className="h-9 rounded-full bg-gold px-4 text-[13px] font-extrabold text-ink disabled:opacity-50">
                  {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Judo"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {guide ? <Guide onClose={() => setGuide(false)} /> : null}
    </div>
  );
}

function Table({ roomId }: { roomId: string }) {
  const { pop, toast } = useApp();
  const standalone = isTableKey(roomId);
  const myId = myUserIdFromToken() ?? "";
  const voice = useActiveVoice();
  const [t, setT] = useState<RmcsTable | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<RmcsChat[]>([]);
  const [bursts, setBursts] = useState<{ id: number; from: string; e: string }[]>([]);
  const [peek, setPeek] = useState(false);
  const [guide, setGuide] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [talk, setTalk] = useState(false);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const prev = useRef<{ phase?: string; round?: number }>({});
  const burstId = useRef(0);
  const log = useRef<HTMLDivElement>(null);

  const apply = useCallback((x: RmcsTable) => {
    offset.current = x.serverTime - Date.now();
    setT(x);
    if (x.chat.length) setChat((c) => (c.length > x.chat.length ? c : x.chat));
  }, []);
  const refresh = useCallback(() => {
    rmcsApi
      .get(roomId)
      .then(apply)
      .catch((e) => setError(e instanceof Error && e.message ? e.message : "Table nahi khula."));
  }, [roomId, apply]);

  useEffect(() => {
    refresh();
    const off = subscribe(rmcsTopic(roomId), (raw) => {
      const o = raw as { k?: string };
      if (o?.k === "ping") refresh();
      else {
        const c = readChatLine(raw);
        if (!c) return;
        if (c.k === "chat") {
          setChat((l) => [...l.slice(-39), c]);
          if (c.from !== myId) sfx("chat");
        } else if (c.e) {
          const id = ++burstId.current;
          setBursts((b) => [...b, { id, from: c.from, e: c.e! }]);
          window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 2200);
          if (c.from !== myId) sfx("join");
        }
      }
    });
    const keep = window.setInterval(refresh, 8000);
    const clock = window.setInterval(() => setNow(Date.now()), 500);
    const wake = () => wakeSound();
    window.addEventListener("pointerdown", wake, { once: true });
    return () => {
      off();
      window.clearInterval(keep);
      window.clearInterval(clock);
      window.removeEventListener("pointerdown", wake);
    };
  }, [roomId, refresh, myId]);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [chat.length, talk]);

  // sounds on each step
  const phase = t?.phase;
  const round = t?.round ?? 0;
  useEffect(() => {
    if (!t) return;
    const p = prev.current;
    if (p.phase !== undefined && (p.phase !== t.phase || p.round !== t.round)) {
      if (t.phase === "DEAL") {
        sfx("enter");
        setPeek(false);
      } else if (t.phase === "GUESS") sfx("report");
      else if (t.phase === "RESULT") sfx(t.caught ? "fixed" : "kill");
      else if (t.phase === "ENDED") sfx(t.winners.includes(myId) ? "win" : "lose");
    }
    prev.current = { phase: t.phase, round: t.round };
  }, [phase, round]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (f: () => Promise<RmcsTable>) => {
    if (busy) return;
    setBusy(true);
    try {
      apply(await f());
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Nahi hua.", "error");
    } finally {
      setBusy(false);
    }
  };

  const seats = t?.seats ?? [];
  const meSeat = seats.find((s) => s.id === myId);
  const iAmIn = !!meSeat;
  const isHost = t?.host === myId;
  const left = t ? Math.max(0, Math.ceil((t.endsAt - (now + offset.current)) / 1000)) : 0;
  // put me at the bottom: rotate the seat order so I'm first
  const ordered = useMemo(() => {
    if (!meSeat) return seats;
    const i = seats.findIndex((s) => s.id === myId);
    return [...seats.slice(i), ...seats.slice(0, i)];
  }, [seats, meSeat, myId]);
  const total = t && t.phase === "LOBBY" ? t.size : Math.max(t?.size ?? 4, seats.length);
  const myRole = meSeat?.role;
  const amMantri = myRole === "MANTRI" && t?.phase === "GUESS" && !t.picked;
  const speaking = new Set(voice?.speakingIds ?? []);

  const say = () => {
    const x = draft.trim();
    if (!x || !iAmIn) return;
    setDraft("");
    void rmcsApi.say(roomId, x).catch(() => undefined);
  };

  if (error && !t) {
    return (
      <div className={`h-full ${BG} p-6 pt-20 text-center`}>
        <button type="button" onClick={pop} aria-label="Back" className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="rounded-2xl bg-coral/10 p-4 text-[13px] font-bold text-coral">{error}</p>
      </div>
    );
  }
  if (!t) return <div className={`grid h-full place-items-center ${BG}`}><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>;

  const banner =
    t.phase === "LOBBY"
      ? iAmIn
        ? `Chair pe baithe ho. Start karte hi table bhar jayegi.`
        : "Baitho aur khelo!"
      : t.phase === "DEAL"
        ? "Patte baant diye! Apna patta dekhne ke liye dabao 👇"
        : t.phase === "GUESS"
          ? amMantri
            ? "Tum Mantri ho: Chor ko pehchano. Kisi par dabao 👇"
            : `${seats.find((s) => s.role === "MANTRI")?.name ?? "Mantri"} Chor dhoondh raha hai…`
          : t.phase === "RESULT"
            ? t.caught
              ? "Chor pakda gaya! 🎉"
              : "Chor bach nikla! Mantri ke 800 le gaya 😈"
            : "Game khatam!";

  return (
    <div className={`relative flex h-full flex-col overflow-hidden ${BG} text-white`}>
      {/* header */}
      <header className="pt-safe z-20 flex items-center gap-2 px-3 pb-1 pt-2">
        <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/40">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[14.5px] font-black uppercase leading-tight tracking-tight">👑 Raja Mantri Chor Sipahi</h1>
          <p className="text-[11px] font-bold text-cream/70">{t.phase === "LOBBY" || t.phase === "NONE" ? `${seats.length}/${t.size} chair bhari` : `Round ${t.round}/${t.rounds}`}</p>
        </div>
        <SoundToggle />
        <button type="button" onClick={() => setGuide(true)} aria-label="Kaise khelte hain" className="grid h-10 w-10 place-items-center rounded-full bg-gold text-ink">
          <BookOpen className="h-5 w-5" />
        </button>
      </header>

      {/* the table */}
      <div className="relative z-10 mx-auto w-full max-w-[460px] flex-1 px-2" style={{ minHeight: 330 }}>
        <div className="absolute inset-x-3 top-[10%] bottom-[8%] [perspective:900px]">
          <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(52deg)]">
            <div className="absolute inset-[8%] rounded-[50%] bg-gradient-to-br from-[#14a05a] to-[#0a5a3a] shadow-[0_30px_50px_rgba(0,0,0,0.55),inset_0_0_40px_rgba(0,0,0,0.35)] ring-[10px] ring-[#8a4b1f]" />
            <div className="absolute inset-[16%] rounded-[50%] border-2 border-dashed border-white/20" />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <motion.p key={t.phase + t.round} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-[56%] rounded-2xl bg-black/45 px-3 py-2 text-center font-display text-[13.5px] font-black leading-tight text-white shadow-xl ring-1 ring-white/20 backdrop-blur-md">
            {banner}
            {t.phase === "DEAL" || t.phase === "GUESS" ? <span className="mt-1 block text-[18px] text-[#ffe27a]">{left}s</span> : null}
          </motion.p>
        </div>

        {Array.from({ length: total }).map((_, i) => {
          const s = ordered[i];
          const pos = spot(i, total);
          const mine = !!s && s.id === myId;
          const showUp = !!s && !!s.role && (t.phase === "RESULT" || t.phase === "ENDED" || (t.phase === "GUESS" && (s.role === "RAJA" || s.role === "MANTRI")) || (mine && peek));
          const clickable = !!s && !mine && amMantri && s.role !== "RAJA";
          const hasCards = t.phase === "DEAL" || t.phase === "GUESS" || t.phase === "RESULT";
          const burst = bursts.filter((b) => b.from === s?.id).slice(-1)[0];
          const gainTone = s && t.phase === "RESULT" ? (s.gain > 0 ? "#3ddc97" : "#ff4d6d") : undefined;
          return (
            <div key={s?.id ?? `empty${i}`} className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${pos.left}%`, top: `${pos.top}%` }}>
              {s ? (
                <>
                  <AnimatePresence>
                    {burst ? (
                      <motion.span key={burst.id} initial={{ y: 0, opacity: 0, scale: 0.4 }} animate={{ y: -34, opacity: 1, scale: 1.5 }} exit={{ opacity: 0, y: -60 }} className="absolute -top-8 z-30 text-[28px]">
                        {burst.e}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                  {t.phase === "RESULT" && s.gain !== 0 ? (
                    <motion.span initial={{ y: 8, opacity: 0 }} animate={{ y: -4, opacity: 1 }} className="absolute -top-6 z-20 rounded-full bg-black/70 px-2 py-0.5 text-[12px] font-black" style={{ color: gainTone }}>
                      +{s.gain}
                    </motion.span>
                  ) : null}
                  <button
                    type="button"
                    disabled={!clickable || busy}
                    onClick={() => {
                      sfx("vote");
                      void run(() => rmcsApi.pick(roomId, s.id));
                    }}
                    aria-label={clickable ? `${s.name} ko Chor batao` : s.name}
                    className={`relative rounded-full ${clickable ? "animate-bounce" : ""}`}
                  >
                    <Pic s={s} size={mine ? 58 : 50} ring={speaking.has(s.id) ? "#7dff9a" : mine ? "#ffe27a" : clickable ? "#ff4d6d" : undefined} />
                    {t.phase === "GUESS" && s.role === "RAJA" ? <span className="absolute -right-2 -top-3 text-[20px]">👑</span> : null}
                    {t.phase === "GUESS" && s.role === "MANTRI" ? <span className="absolute -right-2 -top-3 text-[20px]">🧠</span> : null}
                    {t.picked === s.id ? <span className="absolute -bottom-1 -right-2 text-[20px]">👈</span> : null}
                  </button>
                  <span className="mt-0.5 max-w-[78px] truncate rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-extrabold">{mine ? "Tum" : s.name}</span>
                  <span className="text-[11px] font-black text-[#ffe27a]">{s.score}</span>
                  {hasCards ? (
                    <button type="button" disabled={!mine || t.phase !== "DEAL"} onClick={() => setPeek((p) => !p)} aria-label={mine ? "Apna patta dekho" : "Patta"} className="mt-1">
                      <Card role={s.role} up={showUp} size={mine ? 1.05 : 0.8} mine={mine && !peek && t.phase === "DEAL"} glow={t.phase === "RESULT"} />
                    </button>
                  ) : null}
                  {mine && t.phase === "GUESS" && !showUp ? (
                    <button type="button" onClick={() => setPeek((p) => !p)} className="mt-1 text-[10px] font-bold text-cream/70">
                      {peek ? "Chhupao" : "Patta dekho"}
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-dashed border-white/35 bg-black/25 text-[20px]">🪑</span>
                  <span className="mt-0.5 rounded-full bg-black/40 px-2 py-0.5 text-[10.5px] font-bold text-white/70">Khali</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* my card told in words */}
      {iAmIn && myRole && (peek || t.phase === "RESULT") && t.phase !== "LOBBY" ? (
        <p className="z-10 mx-auto -mt-1 mb-1 rounded-full px-4 py-1.5 text-center text-[13px] font-black text-white shadow-lg" style={{ background: ROLE_INFO[myRole].tone }}>
          {ROLE_INFO[myRole].icon} {ROLE_INFO[myRole].line}
        </p>
      ) : null}

      {/* controls */}
      <div className="z-20 space-y-2 px-3 pb-3">
        {t.phase === "LOBBY" || t.phase === "NONE" ? (
          <>
            {t.table ? (
              <div className="rounded-2xl bg-black/35 p-3 ring-1 ring-gold/30">
                <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-cream/60">Table code</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-[26px] font-black tracking-[0.3em] text-[#ffe27a]">{t.table.code}</span>
                  <span className="flex-1" />
                  <button type="button" aria-label="Copy the code" onClick={() => { navigator.clipboard?.writeText(t.table!.code).catch(() => undefined); toast(`Code ${t.table!.code} copy ho gaya`, "gold"); }} className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
                    <Copy className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Invite friends"
                    onClick={() => setInviteOpen(true)}
                    className="grid h-10 w-10 place-items-center rounded-full bg-gold text-ink"
                  >
                    <Share2 className="h-4.5 w-4.5" />
                  </button>
                </div>
                {isHost ? (
                  <div className="mt-2 flex gap-2">
                    {[[true, "Sab judein"], [false, "Sirf code se"]].map(([v, label]) => (
                      <button key={String(v)} type="button" disabled={busy} onClick={() => void run(() => rmcsApi.setPublic(roomId, v as boolean))} aria-pressed={t.table!.public === v} className={`h-8 flex-1 rounded-full text-[12px] font-extrabold ring-1 ${t.table!.public === v ? "bg-gradient-to-r from-[#7c4dff] to-[#ff3d8b] ring-white/40" : "bg-white/10 ring-white/10"}`}>
                        {String(label)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {isHost ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-[12px] font-black uppercase text-cream/70">Chairs</span>
                {[4, 5].map((n) => (
                  <button key={n} type="button" disabled={busy} onClick={() => void run(() => rmcsApi.size(roomId, n))} aria-pressed={t.size === n} className={`h-9 w-14 rounded-full text-[14px] font-black ring-1 ${t.size === n ? "bg-gradient-to-r from-[#7c4dff] to-[#ff3d8b] ring-white/40" : "bg-white/10 ring-white/10"}`}>
                    {n}
                  </button>
                ))}
              </div>
            ) : null}
            {!iAmIn ? (
              <button type="button" disabled={busy || seats.length >= t.size || !t.enabled} onClick={() => void run(() => rmcsApi.sit(roomId))} className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#ffd86b] to-[#ff9a3d] font-display text-[17px] font-black uppercase tracking-wide text-[#3a1d00] shadow-[0_6px_0_#a85a12] active:translate-y-[3px] active:shadow-[0_3px_0_#a85a12] disabled:opacity-50">
                {t.enabled ? "🪑 Chair par baitho" : "Abhi band hai"}
              </button>
            ) : (
              <>
                {isHost ? (
                  <button type="button" disabled={busy} onClick={() => void run(() => rmcsApi.start(roomId))} className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#ff3d8b] to-[#ffb347] font-display text-[17px] font-black uppercase tracking-wide text-white shadow-[0_6px_0_#a3204f] active:translate-y-[3px] active:shadow-[0_3px_0_#a3204f]">
                    ▶ Khel shuru
                  </button>
                ) : (
                  <p className="rounded-2xl bg-white/10 p-3 text-center text-[13px] font-bold">Host ke start karne ka intezaar…</p>
                )}
                <button type="button" disabled={busy} onClick={() => (standalone ? void rmcsApi.stand(roomId).catch(() => undefined).then(() => pop()) : void run(() => rmcsApi.stand(roomId)))} className="h-10 w-full rounded-full bg-white/10 text-[13px] font-bold">
                  Chair chhodo
                </button>
              </>
            )}
          </>
        ) : null}

        {t.phase === "ENDED" ? (
          <div className="rounded-3xl bg-black/45 p-3 ring-1 ring-white/20">
            <p className="text-center font-display text-[18px] font-black text-[#ffe27a]">🏆 {t.winners.includes(myId) ? "Tum jeet gaye!" : `${seats.filter((s) => t.winners.includes(s.id)).map((s) => s.name).join(", ")} jeete`}</p>
            <ul className="mt-2 space-y-1">
              {[...seats].sort((a, b) => b.score - a.score).map((s, i) => (
                <li key={s.id} className="flex items-center gap-2 rounded-xl bg-white/10 px-2 py-1">
                  <span className="w-5 text-center font-black">{i + 1}</span>
                  <Pic s={s} size={28} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold">{s.id === myId ? "Tum" : s.name}</span>
                  <span className="font-black text-[#ffe27a]">{s.score}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              {isHost ? (
                <button type="button" disabled={busy} onClick={() => void run(() => rmcsApi.start(roomId))} className="h-11 flex-1 rounded-full bg-gradient-to-r from-[#ffd86b] to-[#ff9a3d] font-black text-[#3a1d00]">
                  Phir se khelo
                </button>
              ) : null}
              <button type="button" disabled={busy} onClick={() => void run(() => (isHost ? rmcsApi.lobby(roomId) : rmcsApi.stand(roomId)))} className="h-11 flex-1 rounded-full bg-white/15 font-bold">
                {isHost ? "Lobby" : "Chair chhodo"}
              </button>
            </div>
          </div>
        ) : null}

        {/* emotes, mic and chat */}
        {iAmIn ? (
          <div className="flex items-center gap-1.5">
            {voice && !standalone ? (
              <button
                type="button"
                aria-label={voice.muted ? "Mic chalu karo" : "Mic band karo"}
                onClick={() => {
                  if (!voice.seated && !voice.sitToTalk()) return;
                  voice.toggleMute();
                }}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ring-white/20 ${voice.muted ? "bg-black/50" : "bg-[#2ea44f] shadow-[0_0_16px_#7dff9a]"}`}
              >
                {voice.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            ) : null}
            <div className="app-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {t.emotes.map((e) => (
                <button key={e} type="button" onClick={() => void rmcsApi.emote(roomId, e).catch(() => undefined)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-[22px] ring-1 ring-white/10 active:scale-90">
                  {e}
                </button>
              ))}
            </div>
            <button type="button" aria-label="Chat" onClick={() => setTalk((x) => !x)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#7c4dff] to-[#ff3d8b] text-[20px]">
              💬
            </button>
          </div>
        ) : null}
      </div>

      {/* chat sheet */}
      <AnimatePresence>
        {talk ? (
          <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: "spring", damping: 26, stiffness: 260 }} className="absolute inset-x-0 bottom-0 z-30 max-h-[55%] rounded-t-3xl bg-[#1a0f2b]/95 p-3 ring-1 ring-white/15 backdrop-blur-xl">
            <div className="mb-1 flex items-center">
              <h3 className="flex-1 font-display text-[16px] font-black">💬 Chat</h3>
              <button type="button" onClick={() => setTalk(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div ref={log} className="app-scroll h-40 space-y-1.5 overflow-y-auto">
              {chat.length === 0 ? <p className="pt-6 text-center text-[12.5px] font-bold text-cream/50">Sabko hello bolo 👋</p> : null}
              {chat.map((c, i) => (
                <div key={`${c.t}-${i}`} className={`flex ${c.from === myId ? "justify-end" : "justify-start"}`}>
                  <p className="max-w-[85%] rounded-2xl px-3 py-1.5 text-[13px] font-semibold" style={{ background: c.from === myId ? "linear-gradient(135deg,#7c4dff,#ff3d8b)" : "rgba(255,255,255,0.12)" }}>
                    {c.from === myId ? null : <b className="mr-1.5 text-[11.5px]" style={{ color: COLORS[Math.abs(c.name.length) % COLORS.length] }}>{c.name}</b>}
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={draft} maxLength={140} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && say()} placeholder="Kuch likho…" aria-label="Message" className="h-11 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-[14px] font-semibold placeholder:text-cream/40 focus:outline-none" />
              <button type="button" disabled={!draft.trim()} onClick={say} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#ffd86b] to-[#ff9a3d] text-ink disabled:opacity-40">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {guide ? <Guide onClose={() => setGuide(false)} /> : null}
      {t.table ? <ChatInviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} kind="GAME" roomId="" code={t.table.code} title="Dost ko bulao" table="RMCS" /> : null}
    </div>
  );
}

function Guide({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/60 sm:items-center sm:justify-center" role="dialog" aria-label="Kaise khelte hain">
      <div className="app-scroll max-h-[88%] w-full max-w-[460px] overflow-y-auto rounded-t-3xl bg-gradient-to-b from-[#2b1650] to-[#150a26] p-5 ring-1 ring-white/15 sm:rounded-3xl">
        <div className="flex items-center">
          <h2 className="flex-1 font-display text-[20px] font-black uppercase text-[#ffe27a]">Kaise khelte hain 👑</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="mt-3 space-y-2.5 text-[14px] font-bold leading-snug text-white/90">
          <li>🪑 <b>4 ya 5 log</b> table par baithte hain. Chair kam pade to table apne aap bhar jati hai.</li>
          <li>🃏 Har round me sabko ek <b>chhupa patta</b> milta hai: <b>Raja 👑 1000</b>, <b>Mantri 🧠 800</b>, <b>Sipahi 🛡️ 500</b>, <b>Chor 🦹 0</b>, aur 5 log ho to <b>Prajaa 🧑‍🌾 300</b>.</li>
          <li>👀 Apna patta sirf tum dekh sakte ho. Patta dabake dekho, kisi ko batana mat!</li>
          <li>👑 Phir <b>Raja aur Mantri</b> apna patta dikhate hain.</li>
          <li>🧠 <b>Mantri</b> ko batana hai: <b>Chor kaun?</b> Baaki chhupe logon me se ek ko chuno. Sahi nikla to Mantri ke <b>800</b>, aur Chor ke 0. Galat nikla to <b>Chor Mantri ke 800 le jata hai</b>!</li>
          <li>🗣️ Sab mic pe baat karo, chat karo, emotes bhejo. Chor ko bluff karna hai, Mantri ko dimaag lagana hai.</li>
          <li>🏆 <b>5 round</b> ke baad sabse zyada point wala jeetta hai.</li>
        </ol>
        <button type="button" onClick={onClose} className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-[#ffd86b] to-[#ff9a3d] font-display text-[16px] font-black uppercase text-[#3a1d00]">
          Samajh gaya
        </button>
      </div>
    </div>
  );
}
