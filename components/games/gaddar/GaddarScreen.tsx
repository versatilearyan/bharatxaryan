"use client";

/**
 * Gaon ka Gaddaar, inside a voice room: lobby (map and rules), the village, sabotage and vents, little kaam games,
 * Sarpanch ki baithak (the meeting and the vote) and the result.
 * It is played with text only: the room's mic is turned off while you play, and the baithak has a text chat.
 * The village is played sideways (landscape); on a phone held upright the game is turned with CSS so it still fits.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, BellRing, BookOpen, Cable, ChevronLeft, ChevronRight, Copy, Crown, Droplets, Flame, Hash, LightbulbOff, Loader2, LogOut, Megaphone, MessageSquareText, Plus, Send, Share2, Swords, Users, Wrench } from "lucide-react";
import { publish, subscribe } from "@/lib/realtime/stomp";
import { GADDAR_COLORS, tableKey, GADDAR_ME_QUEUE, gaddarActDest, gaddarApi, gaddarChatDest, gaddarTables, gaddarTopic, readChat, readMe, readSnap, readState, type GaddarBundle, type GaddarChat, type GaddarEvent, type GaddarMap, type GaddarOpenTable, type GaddarMe, type GaddarPlayer, type GaddarSettings, type GaddarSnap, type GaddarState } from "@/lib/api/gaddar";
import { useActiveVoice } from "@/lib/app/active-voice";
import { useApp } from "@/lib/app/store";
import { myUserIdFromToken } from "@/lib/auth/token";
import { GaddarField, type FieldControls, type FieldEffect, type Near } from "./GaddarField";
import { GaddarGuide, GUIDE_SEEN_KEY } from "./GaddarGuide";
import { ActionBtn, Chip, Ended, Face, HoldBtn, Loading } from "./GaddarUi";
import { TaskGame } from "./TaskGame";
import { ChatInviteSheet } from "@/components/social/Invites";
import { LobbyChat, LookPicker, SoundToggle } from "./GaddarExtras";
import { DEFAULT_LOOK, saveLook, savedLook, type Look } from "./looks";
import { sfx, wakeSound } from "@/lib/games/gaddarSound";
import type { GaddarTaskKind } from "@/lib/api/gaddar";

const BG = "bg-[radial-gradient(130%_80%_at_50%_0%,#4a2a14_0%,#2a1a14_45%,#141018_100%)]";
const MIN_LOADING_MS = 2200;
const HINTS = [
  "Gaddaar ko pehchano, par bina saboot ke vote mat do.",
  "Kaam ke circle me khade hokar Kaam button daba ke rakho.",
  "Gaddaar surang (vent) me chhup sakta hai. Jaali ke paas dhyan rakho.",
  "Andhera ho to bijli ke box par jao. Kuan sukha me do pump ek saath.",
  "Is game me mic band hai. Baithak me sab text me baat karte hain.",
];
const NO_NEAR: Near = { task: false, taskId: 0, taskKind: null, body: false, chaupal: false, victim: false, vent: false, fix: false };
const MAP_ICON: Record<string, string> = { random: "🎲", gaon: "🌾", mela: "🎡", haveli: "🏰" };

/** True when the game is turned sideways with CSS (an upright phone): the joystick reads its direction differently. */
const TurnedContext = createContext(false);

const useNow = (ms = 250) => {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    const i = window.setInterval(() => setN(Date.now()), ms);
    return () => window.clearInterval(i);
  }, [ms]);
  return n;
};


/**
 * With a voice room's id the game is played in that room; with a table id it is a game of its own (no room);
 * with neither it is the entrance: open a game, find an open one, or join with a code.
 */
export function GaddarScreen({ roomId, table }: { roomId?: string; table?: string }) {
  const key = roomId ?? (table ? tableKey(table) : undefined);
  if (!key) return <GaddarHome />;
  return <Game roomId={key} />;
}

function GaddarHome() {
  const { pop, replaceTop, toast } = useApp();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | string | null>(null);
  const [open, setOpen] = useState<GaddarOpenTable[] | null>(null);
  const [guide, setGuide] = useState(false);
  const refresh = useCallback(() => {
    gaddarTables
      .list()
      .then(setOpen)
      .catch(() => setOpen([]));
  }, []);
  useEffect(() => {
    refresh();
    const i = window.setInterval(refresh, 6000);
    return () => window.clearInterval(i);
  }, [refresh]);
  const enter = (b: GaddarBundle) => {
    const id = b.state.table?.id;
    if (id) replaceTop({ kind: "gaddar", table: id });
  };
  const run = async (what: string, f: () => Promise<GaddarBundle>) => {
    if (busy) return;
    setBusy(what);
    try {
      enter(await f());
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "That didn't work.", "error");
      refresh();
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className={`app-scroll h-full ${BG} pb-10`}>
      <Header
        title="Gaon ka Gaddaar"
        onBack={pop}
        right={
          <button type="button" onClick={() => setGuide(true)} className="flex h-10 items-center gap-1.5 rounded-full bg-gold px-3.5 text-[12.5px] font-extrabold text-ink">
            <BookOpen className="h-4 w-4" aria-hidden /> <span className="max-[360px]:hidden">Kaise khelte hain</span>
          </button>
        }
      />
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-4 mt-2 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#7c4dff] via-[#c2417a] to-[#ff8a3d] p-5 text-center shadow-[0_18px_40px_-14px_rgba(124,77,255,0.7)] ring-1 ring-white/30"
      >
        <span aria-hidden className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-10 -right-6 h-36 w-36 rounded-full bg-[#ffe27a]/25 blur-2xl" />
        {["✨", "⭐", "✨"].map((e, k) => (
          <motion.span key={k} aria-hidden className="pointer-events-none absolute text-[16px]" style={{ left: `${14 + k * 36}%`, top: k === 1 ? "12%" : "58%" }} animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.4 + k * 0.5, repeat: Infinity }}>
            {e}
          </motion.span>
        ))}
        <motion.div
          aria-hidden
          className="relative mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-white/20 text-[46px] shadow-[0_12px_0_-4px_rgba(0,0,0,0.25),inset_0_2px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40"
          animate={{ y: [0, -7, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          🛖
        </motion.div>
        <h2 className="mt-4 font-display text-[clamp(22px,7vw,30px)] font-black uppercase leading-none tracking-tight text-white drop-shadow-[0_3px_0_rgba(80,20,90,0.55)]">Gaon ka Gaddaar</h2>
        <p className="mt-2 text-[clamp(12.5px,3.6vw,14px)] font-bold leading-snug text-white/95">Gaon me ek gaddaar chhupa hai. Kaam poora karo, gaddaar ko pehchano, aur Sarpanch ki baithak me use bahar nikalo.</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {["Bina voice room", "Sirf text", "4 se 10 players"].map((t) => (
            <span key={t} className="rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-extrabold text-white ring-1 ring-white/25">
              {t}
            </span>
          ))}
        </div>
      </motion.section>

      <div className="mx-4 mt-4 space-y-3">
        <button type="button" disabled={busy !== null} onClick={() => void run("create", () => gaddarTables.create())} className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#ff3d8b] to-[#ffb347] text-[17px] font-black uppercase tracking-wide text-white shadow-[0_6px_0_#a3204f,0_14px_28px_-8px_rgba(255,61,139,0.7)] active:translate-y-[3px] active:shadow-[0_3px_0_#a3204f] disabled:opacity-60 motion-safe:animate-[pulse_2.6s_ease-in-out_infinite]">
          {busy === "create" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Naya game kholo
        </button>
        <p className="text-center text-[12px] font-bold text-cream/70">Aapko ek code milega. Dost us code se judenge, ya game ko sabke liye khula rakho.</p>

        <div className="rounded-2xl bg-surface/80 p-4 ring-1 ring-line">
          <p className="flex items-center gap-1.5 text-[14px] font-extrabold text-cream">
            <Hash className="h-4 w-4 text-gold" /> Code se judo
          </p>
          <div className="mt-2.5 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="jaise K7Q2MX"
              aria-label="Game code"
              className="h-12 min-w-0 flex-1 rounded-xl bg-black/30 px-4 font-mono text-[18px] tracking-[0.3em] text-cream ring-1 ring-white/10 placeholder:tracking-normal placeholder:text-muted/60 focus:outline-none focus:ring-gold/50"
            />
            <button type="button" disabled={busy !== null || code.length < 4} onClick={() => void run("join", () => gaddarTables.join(code))} className="h-12 rounded-xl bg-[#7b5cff] px-5 text-[14px] font-extrabold text-white disabled:opacity-50">
              {busy === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Judo"}
            </button>
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 font-display text-[18px] font-black text-cream">
            <Users className="h-4.5 w-4.5" aria-hidden /> Khule games
          </h3>
          <ul className="mt-2 space-y-2">
            {open === null ? <li className="rounded-2xl bg-black/20 p-4 text-center text-[13px] text-muted">Dhoondh rahe hain…</li> : null}
            {open?.length === 0 ? <li className="rounded-2xl bg-black/20 p-4 text-center text-[13px] text-muted">Abhi koi khula game nahi hai. Pehle aap kholo!</li> : null}
            {open?.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/15 text-[20px]" aria-hidden>
                  🛖
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold text-cream">{t.host} ka game</span>
                  <span className="block text-[11.5px] text-cream/60">
                    {t.players}/{t.max} players · {t.map === "random" ? "Random map" : t.map}
                  </span>
                </span>
                <button type="button" disabled={busy !== null} onClick={() => void run(t.id, () => gaddarApi.join(tableKey(t.id)))} className="h-9 rounded-full bg-gold px-4 text-[13px] font-extrabold text-ink disabled:opacity-50">
                  {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Judo"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {guide ? <GaddarGuide onClose={() => setGuide(false)} /> : null}
    </div>
  );
}

function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="pt-safe relative z-20 flex items-center gap-2 px-3 py-2">
      <button type="button" onClick={onBack} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/35 text-cream">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h1 className="font-display text-[18px] font-extrabold text-cream">{title}</h1>
      <span className="flex-1" />
      {right}
    </div>
  );
}

/**
 * The game stage is always wider than tall. If the screen is held upright it is turned a quarter with CSS
 * (turn the phone sideways and it fills the screen); where the browser lets us, we also ask for landscape.
 */
function Stage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    // Works in a full-screen web app on Android; elsewhere it is refused and the CSS turn is used
    const o = (screen as Screen & { orientation?: ScreenOrientation & { lock?: (m: string) => Promise<void> } }).orientation;
    void o?.lock?.("landscape")?.catch(() => undefined);
    return () => {
      try {
        o?.unlock?.();
      } catch {
        /* nothing to unlock */
      }
    };
  }, []);
  const turned = size.w > 0 && size.w < size.h;
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-[#1c2a1c]">
      {size.w === 0 ? null : turned ? (
        <div style={{ position: "absolute", left: size.w, top: 0, width: size.h, height: size.w, transformOrigin: "0 0", transform: "rotate(90deg)" }}>
          <TurnedContext.Provider value>
            <div className="relative h-full w-full">{children}</div>
          </TurnedContext.Provider>
        </div>
      ) : (
        <div className="relative h-full w-full">{children}</div>
      )}
    </div>
  );
}

function Game({ roomId }: { roomId: string }) {
  const { pop, toast } = useApp();
  const myId = myUserIdFromToken() ?? "";
  const voice = useActiveVoice();
  const [map, setMap] = useState<GaddarMap | null>(null);
  const [state, setState] = useState<GaddarState | null>(null);
  const [me, setMe] = useState<GaddarMe | undefined>();
  const [chat, setChat] = useState<GaddarChat[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [near, setNear] = useState<Near>(NO_NEAR);
  const [splashUntil, setSplashUntil] = useState(0);
  const [layerReady, setLayerReady] = useState(false);
  const [snapOk, setSnapOk] = useState(false);
  const [loadStart, setLoadStart] = useState(0);
  const [guide, setGuide] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [taskGame, setTaskGame] = useState<{ id: number; kind: Exclude<GaddarTaskKind, "hold"> | "fuse"; name: string; at: number } | null>(null);
  const [sb, setSb] = useState<GaddarSnap["sb"]>(undefined);
  const snapRef = useRef<GaddarSnap | null>(null);
  const controls = useRef<FieldControls>({ work: false });
  const stick = useRef({ x: 0, y: 0 });
  const effects = useRef<FieldEffect[]>([]);
  const offset = useRef(0);
  const meAt = useRef(0);
  const lastPhase = useRef<string>("");
  const now = useNow(250);

  const apply = useCallback((b: GaddarBundle) => {
    if (b.map) setMap(b.map);
    setState(b.state);
    offset.current = b.state.serverTime - Date.now();
    if (b.me) {
      meAt.current = Date.now();
      setMe(b.me);
    }
    if (b.snap) snapRef.current = b.snap;
    if (b.chat.length) setChat(b.chat);
  }, []);

  useEffect(() => {
    let off = false;
    gaddarApi
      .get(roomId)
      .then((b) => !off && apply(b))
      .catch((e) => !off && setError(e instanceof Error && e.message ? e.message : "Couldn't open the game."));
    const u1 = subscribe(gaddarTopic(roomId), (raw) => {
      const o = raw as { k?: string };
      if (o?.k === "state") {
        const s = readState(raw);
        offset.current = s.serverTime - Date.now();
        setState((cur) => (cur && s.version < cur.version ? cur : s));
      } else if (o?.k === "snap") {
        const sn = readSnap(raw);
        if (sn) snapRef.current = sn;
      } else if (o?.k === "chat") {
        const c = readChat(raw);
        if (c) setChat((l) => [...l.slice(-59), c]);
      }
    });
    const u2 = subscribe(GADDAR_ME_QUEUE, (raw) => {
      const o = raw as { g?: string; k?: string };
      if (o?.g !== "gaddar") return;
      if (o.k === "evt") {
        const e = raw as unknown as GaddarEvent;
        effects.current.push({ x: e.x, y: e.y, at: Date.now(), inVent: e.in });
        toast(e.in ? `👀 ${e.name} surang me ghusa!` : `👀 ${e.name} surang se nikla!`, "error");
        return;
      }
      meAt.current = Date.now();
      setMe(readMe(raw));
    });
    return () => {
      off = true;
      u1();
      u2();
    };
  }, [roomId, apply, toast]);

  // In the lobby the phone asks for the game every few seconds: a table forgets a phone that has gone quiet
  useEffect(() => {
    if (!state || state.phase === "PLAY" || state.phase === "MEETING") return;
    const i = window.setInterval(() => {
      gaddarApi
        .get(roomId)
        .then((b) => apply(b))
        .catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(i);
  }, [state?.phase, roomId, apply]); // eslint-disable-line react-hooks/exhaustive-deps

  // The first time, show the guide
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(GUIDE_SEEN_KEY)) setGuide(true);
    } catch {
      /* no storage */
    }
  }, []);
  const closeGuide = () => {
    setGuide(false);
    try {
      window.localStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch {
      /* no storage */
    }
  };

  // A game on another map: get its picture
  const mapId = state?.mapId;
  useEffect(() => {
    if (!mapId || map?.id === mapId) return;
    let off = false;
    gaddarApi
      .map(roomId, mapId)
      .then((m) => !off && m && setMap(m))
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [mapId, map?.id, roomId]);

  // Text only: the room's mic is turned off while you are in the game
  useEffect(() => {
    if (voice?.seated && !voice.muted) voice.toggleMute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice?.seated, voice?.muted]);

  const inGame = state?.phase === "PLAY" || state?.phase === "MEETING" || state?.phase === "ENDED";
  const mapReady = !!map && map.id === mapId;

  // Loading: the map, the connection, the first position from the server and the village drawn, and at least a short moment
  useEffect(() => {
    if (inGame && loadStart === 0) setLoadStart(Date.now());
    if (!inGame) {
      setLoadStart(0);
      setLayerReady(false);
      setSnapOk(false);
    }
  }, [inGame, loadStart]);
  useEffect(() => {
    if (!inGame) return;
    const i = window.setInterval(() => {
      if (snapRef.current && !snapOk) setSnapOk(true);
      setSb(snapRef.current?.sb);
    }, 150);
    return () => window.clearInterval(i);
  }, [inGame, snapOk]);
  // Between rounds (a baithak or the end) there may be no snapshots: don't wait for one forever
  useEffect(() => {
    if (!inGame || snapOk || state?.phase === "PLAY") return;
    const t = window.setTimeout(() => setSnapOk(true), 1500);
    return () => window.clearTimeout(t);
  }, [inGame, snapOk, state?.phase]);
  const elapsed = loadStart ? now - loadStart : 0;
  const loaded = mapReady && layerReady && snapOk && elapsed >= MIN_LOADING_MS;
  const progress = Math.min(1, (Number(mapReady) + Number(snapOk) + Number(layerReady)) / 3, elapsed / MIN_LOADING_MS);

  // The role card when a round begins
  useEffect(() => {
    if (!state) return;
    if (state.phase === "PLAY" && lastPhase.current !== "PLAY" && lastPhase.current !== "MEETING") {
      setSplashUntil(Date.now() + MIN_LOADING_MS + 3500);
      setLayerReady(false);
    }
    if (state.phase === "MEETING") setTaskGame(null);
    lastPhase.current = state.phase;
  }, [state]);

  const run = async (f: () => Promise<GaddarBundle>) => {
    if (busy) return;
    setBusy(true);
    try {
      apply(await f());
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "That didn't work.", "error");
    } finally {
      setBusy(false);
    }
  };

  const act = (a: string) => publish(gaddarActDest(roomId), { a });
  const iAmIn = !!state?.players.some((p) => p.id === myId);
  const players = useMemo(() => state?.players ?? [], [state]);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const serverNow = now + offset.current;

  /* ---- my look (topi, kurta, face): remembered on this phone and told to the game ---- */
  const [look, setLookState] = useState<Look>(DEFAULT_LOOK);
  const lookSent = useRef(false);
  useEffect(() => setLookState(savedLook()), []);
  const myServer = state?.players.find((p) => p.id === myId);
  const lobbyPhase = state?.phase === "LOBBY";
  useEffect(() => {
    // after joining, make the game match what this phone remembers
    if (!iAmIn || !lobbyPhase || lookSent.current || !myServer) return;
    lookSent.current = true;
    const l = savedLook();
    if (l.hat !== (myServer.hat ?? 0) || l.suit !== (myServer.suit ?? 0) || l.acc !== (myServer.acc ?? 0)) void gaddarApi.look(roomId, l).then(apply).catch(() => undefined);
  }, [iAmIn, lobbyPhase, myServer, roomId, apply]);
  const pickLook = (l: Look) => {
    setLookState(l);
    saveLook(l);
    if (iAmIn) void gaddarApi.look(roomId, l).then(apply).catch(() => undefined);
  };

  /* ---- sounds ---- */
  useEffect(() => {
    const wake = () => wakeSound();
    window.addEventListener("pointerdown", wake, { once: true });
    return () => window.removeEventListener("pointerdown", wake);
  }, []);
  const sndPhase = useRef<string | undefined>(undefined);
  const sndDone = useRef(-1);
  const sndSab = useRef("");
  const sndAlive = useRef(true);
  const sndVent = useRef(false);
  const sndChat = useRef(0);
  const sndPlayers = useRef(-1);
  const phaseNow = state?.phase;
  useEffect(() => {
    const was = sndPhase.current;
    sndPhase.current = phaseNow;
    if (!phaseNow || was === undefined || was === phaseNow) return;
    if (phaseNow === "PLAY" && was !== "MEETING") sfx("enter");
    else if (phaseNow === "MEETING") sfx(state?.meeting?.why === "emergency" ? "emergency" : "report");
    else if (phaseNow === "ENDED") {
      const mine = state?.players.find((p) => p.id === myId);
      const won = state?.winner === "GAONWALE" ? mine?.role === "GAONWALA" : mine?.role === "GADDAR";
      sfx(won ? "win" : "lose");
    }
  }, [phaseNow]); // eslint-disable-line react-hooks/exhaustive-deps
  const doneNow = me?.tasks.filter((t) => t.p >= 1).length ?? 0;
  const totalNow = me?.tasks.length ?? 0;
  useEffect(() => {
    if (sndDone.current >= 0 && doneNow > sndDone.current) sfx(totalNow > 0 && doneNow >= totalNow ? "taskAll" : "task");
    sndDone.current = doneNow;
  }, [doneNow, totalNow]);
  const sabKey = sb?.[0] ?? "";
  useEffect(() => {
    if (sabKey && !sndSab.current) sfx("alarm");
    if (!sabKey && sndSab.current) sfx("fixed");
    sndSab.current = sabKey;
  }, [sabKey]);
  const aliveNow = me?.alive !== false;
  useEffect(() => {
    if (sndAlive.current && !aliveNow) sfx("kill");
    sndAlive.current = aliveNow;
  }, [aliveNow]);
  const ventNow = !!me?.vent;
  useEffect(() => {
    if (sndVent.current !== ventNow) sfx("vent");
    sndVent.current = ventNow;
  }, [ventNow]);
  useEffect(() => {
    if (sndChat.current && chat.length > sndChat.current && chat[chat.length - 1]?.from !== myId) sfx("chat");
    sndChat.current = chat.length;
  }, [chat.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const nPlayers = state?.players.length ?? 0;
  useEffect(() => {
    if (sndPlayers.current >= 0 && nPlayers > sndPlayers.current && lobbyPhase) sfx("join");
    sndPlayers.current = nPlayers;
  }, [nPlayers, lobbyPhase]);

  if (error) {
    return (
      <div className={`h-full ${BG}`}>
        <Header title="Gaon ka Gaddaar" onBack={pop} />
        <p className="mx-6 mt-16 rounded-2xl bg-coral/10 p-4 text-center text-[13px] text-coral">{error}</p>
      </div>
    );
  }
  if (!state) {
    return (
      <div className={`h-full ${BG}`}>
        <Header title="Gaon ka Gaddaar" onBack={pop} />
        <div className="mx-auto mt-24 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold" aria-label="Loading" />
      </div>
    );
  }

  const phase = state.phase;

  /* ---------------- lobby ---------------- */
  if (!inGame) {
    const isHost = state.host === myId;
    const enough = players.length >= state.min;
    const st = state.settings;
    const set = (s: Partial<GaddarSettings>) => void run(() => gaddarApi.settings(roomId, s));
    const maps = [{ id: "random", name: "Random", blurb: "Har baar koi ek map" }, ...state.maps];
    return (
      <div className={`app-scroll h-full ${BG} pb-8`}>
        <Header
          title="Gaon ka Gaddaar"
          onBack={pop}
          right={
            <span className="flex items-center gap-1.5">
              <SoundToggle />
              <button type="button" onClick={() => setGuide(true)} className="flex h-10 items-center gap-1.5 rounded-full bg-gold px-3.5 text-[12.5px] font-extrabold text-ink">
                <BookOpen className="h-4 w-4" aria-hidden /> <span className="max-[360px]:hidden">Kaise khelte hain</span>
              </button>
            </span>
          }
        />
        <section className="mx-4 mt-2 rounded-3xl bg-gradient-to-br from-[#5a3a18] to-[#2a1d16] p-5 text-center ring-1 ring-gold/30">
          <div className="text-[44px] leading-none" aria-hidden>
            🛖
          </div>
          <h2 className="mt-2 font-display text-[22px] font-extrabold text-gold">Gaon ka Gaddaar</h2>
          <p className="mt-1 text-[13px] text-cream/80">Gaon me ek gaddaar chhupa hai. Kaam poora karo, gaddaar ko pehchano, aur Sarpanch ki baithak me use bahar nikalo.</p>
          <p className="mt-2 text-[11.5px] text-cream/60">📵 Mic band, sirf text · 📱 Landscape · 4 se 10 players</p>
        </section>

        {state.table ? (
          <section className="mx-4 mt-3 rounded-2xl bg-black/30 p-3.5 ring-1 ring-gold/25">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cream/60">Game code</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[28px] font-extrabold tracking-[0.3em] text-gold">{state.table.code}</span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(state.table!.code).catch(() => undefined);
                  toast(`Code ${state.table!.code} copy ho gaya`, "gold");
                }}
                aria-label="Copy the code"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-cream"
              >
                <Copy className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                aria-label="Invite friends in chat"
                className="grid h-10 w-10 place-items-center rounded-full bg-gold text-ink"
              >
                <Share2 className="h-4.5 w-4.5" />
              </button>
            </div>
            {isHost ? (
              <div className="mt-2.5">
                <Segment label="Kaun jud sakta" options={[[1, "Sab"], [0, "Sirf code se"]]} value={state.table.public ? 1 : 0} disabled={busy} onPick={(v) => void run(() => gaddarApi.settings(roomId, { isPublic: v === 1 }))} />
              </div>
            ) : (
              <p className="mt-1.5 text-[11.5px] text-cream/55">{state.table.public ? "Ye game sabke liye khula hai." : "Sirf code se jud sakte hain."}</p>
            )}
          </section>
        ) : null}

        <h3 className="mx-5 mt-5 font-display text-[16px] font-bold text-cream">Map</h3>
        <ul className="mx-4 mt-2 grid grid-cols-2 gap-2">
          {maps.map((m) => {
            const on = st.map === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={!isHost || busy}
                  onClick={() => set({ map: m.id })}
                  aria-pressed={on}
                  className={`h-full w-full rounded-2xl p-3 text-left ring-1 transition ${on ? "bg-gold/15 ring-2 ring-gold" : "bg-black/25 ring-white/10"} ${isHost ? "" : "opacity-90"}`}
                >
                  <span className="text-[22px]" aria-hidden>
                    {MAP_ICON[m.id] ?? "🗺️"}
                  </span>
                  <span className="block font-display text-[14px] font-extrabold text-cream">{m.name}</span>
                  <span className="block text-[11px] leading-snug text-cream/65">{m.blurb}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <h3 className="mx-5 mt-4 font-display text-[16px] font-bold text-cream">Rules</h3>
        <div className="mx-4 mt-2 space-y-2.5 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
          <Segment label="Gaddaar kitne" options={[[0, "Auto"], [1, "1"], [2, "2"]]} value={st.gaddars} disabled={!isHost || busy} onPick={(v) => set({ gaddars: v })} />
          <Segment label="Hatao cooldown" options={[[15, "15s"], [25, "25s"], [40, "40s"]]} value={st.killCd} disabled={!isHost || busy} onPick={(v) => set({ killCd: v })} />
          {!isHost ? <p className="text-[11px] text-cream/50">Sirf host (jisne game khola) ye badal sakta hai.</p> : null}
        </div>

        {iAmIn ? <LookPicker look={look} colorIdx={myServer?.color ?? 0} onChange={pickLook} /> : null}

        <h3 className="mx-5 mt-5 flex items-center gap-2 font-display text-[16px] font-bold text-cream">
          <Users className="h-4.5 w-4.5" aria-hidden /> Players {players.length}/{state.max}
        </h3>
        <ul className="mx-4 mt-2 space-y-2">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-black/25 p-2.5 ring-1 ring-white/10">
              <Face p={p} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-cream">{p.id === myId ? `${p.name} (you)` : p.name}</span>
              {p.id === state.host ? <Crown className="h-4 w-4 text-gold" aria-label="Host" /> : null}
            </li>
          ))}
          {!players.length ? <li className="rounded-2xl bg-black/20 p-4 text-center text-[13px] text-muted">Nobody has joined yet.</li> : null}
        </ul>

        {iAmIn ? <LobbyChat chat={chat} myId={myId} onSay={(text) => publish(gaddarChatDest(roomId), { text })} /> : null}

        <div className="mx-4 mt-5 space-y-2">
          {!iAmIn ? (
            <button type="button" disabled={busy} onClick={() => void run(() => gaddarApi.join(roomId))} className="h-12 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c] disabled:opacity-50">
              Join the game
            </button>
          ) : (
            <>
              {isHost ? (
                <button type="button" disabled={busy || !enough} onClick={() => void run(() => gaddarApi.start(roomId))} className="h-12 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c] disabled:opacity-45">
                  {enough ? "Start the game" : `Need ${state.min - players.length} more to start`}
                </button>
              ) : (
                <p className="rounded-2xl bg-white/[0.06] p-3 text-center text-[13px] text-cream/75">{enough ? "Waiting for the host to start…" : `Waiting for ${state.min - players.length} more players…`}</p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void (state.table ? gaddarApi.leave(roomId).catch(() => undefined).then(() => pop()) : run(() => gaddarApi.leave(roomId)))
                }
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white/10 text-[14px] font-semibold text-cream"
              >
                <LogOut className="h-4 w-4" aria-hidden /> Leave
              </button>
            </>
          )}
          <p className="text-center text-[11.5px] text-muted">{state.table ? "Dost Games me Gaddaar kholkar ye code daalein, ya khule games me se judein." : "Tell the others in the room to open the menu and join."}</p>
        </div>
        {guide ? <GaddarGuide onClose={closeGuide} /> : null}
        {state.table ? <ChatInviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} kind="GAME" roomId="" code={state.table.code} title="Dost ko bulao" table="GADDAR" /> : null}
      </div>
    );
  }

  /* ---------------- the village / meeting / result (sideways) ---------------- */
  const myPlayer = byId.get(myId);
  const alive = me ? me.alive : myPlayer?.alive !== false;
  const isGaddar = me?.role === "GADDAR";
  const inVent = !!me?.vent;
  const tasksTotal = me?.tasks.length ?? 0;
  const tasksDone = me?.tasks.filter((t) => t.p >= 1).length ?? 0;
  const sinceMe = now - meAt.current;
  const killLeft = isGaddar ? Math.max(0, Math.ceil(((me?.killIn ?? 0) - sinceMe) / 1000)) : 0;
  const sabLeft = isGaddar && (me?.sabIn ?? 0) >= 0 ? Math.max(0, Math.ceil(((me?.sabIn ?? 0) - sinceMe) / 1000)) : -1;
  const sabOn = sb?.[0] === "L" ? "LIGHTS" : sb?.[0] === "R" ? "REACTOR" : null;
  const reactorLeft = sb?.[0] === "R" ? Math.max(0, Math.ceil((sb[1] - serverNow) / 1000)) : 0;
  const startKaam = () => {
    if (!me || !near.task) return;
    const tk = me.tasks.find((t) => t.id === near.taskId);
    if (!tk || tk.kind === "hold") return;
    act(`tstart:${tk.id}`);
    setTaskGame({ id: tk.id, kind: tk.kind, name: tk.name, at: Date.now() });
  };
  const finishKaam = () => {
    const g = taskGame;
    if (!g) return;
    if (g.kind === "fuse") {
      act("lightsfix");
      setTaskGame(null);
      return;
    }
    // The server wants a task to take at least about two seconds, so wait out the rest of it
    const wait = Math.max(0, 2500 - (Date.now() - g.at));
    window.setTimeout(() => act(`tdone:${g.id}`), wait);
    setTaskGame(null);
  };
  const cancelKaam = () => {
    act("tcancel");
    setTaskGame(null);
  };
  const lightsPanel = near.fix && sabOn === "LIGHTS" && !isGaddar;
  const openPanel = () => setTaskGame({ id: 0, kind: "fuse", name: "Bijli ka panel", at: Date.now() });
  const holdKind = near.fix && sabOn === "REACTOR" && !isGaddar ? "fix" : near.task && near.taskKind === "hold" ? "task" : null;

  return (
    // Fixed: the village uses the whole screen (a wide landscape one too), not the app's narrow column
    <div className="fixed inset-0 z-[70] overflow-hidden bg-[#1c2a1c]">
      <Stage>
        {mapReady && map ? (
          <GaddarField roomId={roomId} map={map} myId={myId} players={players} me={me} snapRef={snapRef} controls={controls} stick={stick} effects={effects} frozen={!!taskGame} onNear={setNear} onReady={() => setLayerReady(true)} />
        ) : null}

        {/* Top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-2">
            <button type="button" onClick={pop} aria-label="Back to the room" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-cream ring-1 ring-white/25 backdrop-blur-md">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 max-w-[300px] flex-1">
              <div className="h-3.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/25 backdrop-blur" aria-label="Village work done">
                <div className="h-full rounded-full bg-gradient-to-r from-[#7df9c8] via-[#fff1b0] to-[#ff9ad5] shadow-[0_0_12px_rgba(125,249,200,0.8)] transition-all" style={{ width: `${Math.round(state.taskPct * 100)}%` }} />
              </div>
              <p className="mt-0.5 text-[10.5px] font-bold text-white/85 drop-shadow">
                Gaon ka kaam {Math.round(state.taskPct * 100)}% · {map?.name ?? ""}
              </p>
            </div>
            <span className="flex-1" />
            <Chip tone={isGaddar ? "red" : "green"}>
              {!me?.role ? "…" : isGaddar ? "🗡️ Gaddaar" : "🧑‍🌾 Gaonwala"}
              {!alive ? " · 👻 bhoot" : ""}
            </Chip>
            <Chip>📵 text only</Chip>
            <span className="pointer-events-auto">
              <SoundToggle className="!h-8 !w-8 !bg-white/15" />
            </span>
            <button type="button" onClick={() => setGuide(true)} aria-label="How to play" className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-white/15 text-cream ring-1 ring-white/25 backdrop-blur-md">
              <BookOpen className="h-4 w-4" />
            </button>
          </div>
          {alive && ((!isGaddar && tasksTotal > 0) || (isGaddar && (me?.fake.length ?? 0) > 0)) ? (
            <ul className="pointer-events-none ml-3 mt-0.5 w-44 space-y-0.5 rounded-2xl bg-black/35 p-2.5 text-[10.5px] text-white/90 ring-1 ring-white/15 backdrop-blur-md">
              {isGaddar
                ? me!.fake.map((n) => <li key={n}>• {n}</li>)
                : me!.tasks.map((t) => (
                    <li key={t.id} className={t.p >= 1 ? "text-[#7ddc7a] line-through" : ""}>
                      {t.p >= 1 ? "✓" : "•"} {t.name}
                    </li>
                  ))}
              <li className="pt-0.5 text-[10px] text-white/60">{isGaddar ? "(sirf dikhawe ke kaam)" : `${tasksDone}/${tasksTotal} done`}</li>
            </ul>
          ) : null}
        </div>

        {/* Sabotage alert */}
        {sabOn && phase === "PLAY" && loaded ? (
          <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 0.9, repeat: Infinity }} className="pointer-events-none absolute left-1/2 top-12 z-20 w-[min(92%,420px)] -translate-x-1/2 rounded-2xl bg-gradient-to-r from-[#8a0f22]/95 to-[#c1121f]/95 px-4 py-2 text-center text-white shadow-[0_0_30px_rgba(255,60,80,0.6)] ring-2 ring-[#ff8a95]">
            <p className="font-display text-[15px] font-extrabold">{sabOn === "LIGHTS" ? "⚡ ANDHERA! Bijli ka box theek karo" : `💧 KUAN SUKHA! ${reactorLeft}s`}</p>
            <p className="text-[11px] opacity-90">{sabOn === "LIGHTS" ? "Laal circle ke paas jao, Kaam dabao aur saare switch ON karo." : "Do log ek saath dono pump par Kaam daba ke rakho."}</p>
            <div className="mx-auto mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-black/40">
              <div className="h-full bg-[#7df9c8]" style={{ width: `${Math.round((sb?.[2] ?? 0) * 100)}%` }} />
            </div>
          </motion.div>
        ) : null}

        {/* Controls */}
        {phase === "PLAY" && loaded ? (
          <>
            {!inVent ? <Joystick stick={stick} /> : null}
            <div className="absolute bottom-4 right-4 z-10 flex flex-wrap items-end justify-end gap-2.5">
              {isGaddar && alive && inVent ? (
                <>
                  <ActionBtn label="Pichla" tone="violet" icon={<ChevronLeft className="h-6 w-6" />} enabled={(me?.vent?.links ?? 0) > 1} onPress={() => act("vent:prev")} />
                  <ActionBtn label="Agla" tone="violet" icon={<ChevronRight className="h-6 w-6" />} enabled={(me?.vent?.links ?? 0) > 1} onPress={() => act("vent:next")} />
                  <ActionBtn label="Bahar" tone="danger" icon={<ArrowUpFromLine className="h-5.5 w-5.5" />} enabled onPress={() => act("vent:exit")} />
                </>
              ) : null}
              {isGaddar && alive && !inVent ? (
                <>
                  <ActionBtn label="Surang" tone="violet" icon={<ArrowDownToLine className="h-5.5 w-5.5" />} enabled={near.vent} pulse={near.vent} onPress={() => act("vent")} />
                  <ActionBtn label={sabLeft > 0 ? `${sabLeft}s` : "Andhera"} tone="violet" icon={<LightbulbOff className="h-5.5 w-5.5" />} enabled={sabLeft === 0} onPress={() => act("sab:lights")} />
                  <ActionBtn label={sabLeft > 0 ? `${sabLeft}s` : "Kuan"} tone="violet" icon={<Droplets className="h-5.5 w-5.5" />} enabled={sabLeft === 0} onPress={() => act("sab:reactor")} />
                  <ActionBtn label={killLeft > 0 && !near.victim ? `${killLeft}s` : "Hatao"} tone="danger" icon={<Swords className="h-5.5 w-5.5" />} enabled={near.victim && killLeft <= 0} pulse={near.victim && killLeft <= 0} onPress={() => act("kill")} />
                </>
              ) : null}
              {alive && !inVent ? <ActionBtn label="Baithak" tone="gold" icon={<BellRing className="h-5.5 w-5.5" />} enabled={near.chaupal && !!me?.canEmergency} onPress={() => act("emergency")} /> : null}
              {alive && !inVent ? <ActionBtn label="Report" tone="gold" icon={<Megaphone className="h-5.5 w-5.5" />} enabled={near.body} pulse={near.body} onPress={() => act("report")} /> : null}
              {!isGaddar && alive ? (
                lightsPanel ? (
                  <ActionBtn label="Panel" tone="mint" icon={<LightbulbOff className="h-6 w-6" />} enabled pulse onPress={openPanel} />
                ) : holdKind || !near.task || near.taskKind === "hold" ? (
                  <HoldBtn
                    label={holdKind === "fix" ? "Theek karo" : "Kaam"}
                    icon={<Wrench className="h-6 w-6" />}
                    enabled={!!holdKind}
                    onDown={() => {
                      controls.current.work = true;
                    }}
                    onUp={() => {
                      controls.current.work = false;
                    }}
                  />
                ) : (
                  <ActionBtn label="Kaam" tone="mint" icon={near.taskKind === "seq" ? <Flame className="h-6 w-6" /> : near.taskKind === "wires" ? <Cable className="h-6 w-6" /> : <Wrench className="h-6 w-6" />} enabled pulse onPress={startKaam} />
                )
              ) : null}
              {!isGaddar && !alive ? (
                near.task && near.taskKind !== "hold" ? (
                  <ActionBtn label="Kaam" tone="mint" icon={near.taskKind === "seq" ? <Flame className="h-6 w-6" /> : near.taskKind === "wires" ? <Cable className="h-6 w-6" /> : <Wrench className="h-6 w-6" />} enabled pulse onPress={startKaam} />
                ) : (
                  <HoldBtn label="Kaam" icon={<Wrench className="h-6 w-6" />} enabled={holdKind === "task"} onDown={() => (controls.current.work = true)} onUp={() => (controls.current.work = false)} />
                )
              ) : null}
            </div>
            {inVent ? <p className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-4 py-1.5 text-[12.5px] font-bold text-white">🕳️ Aap surang me ho. Agla/Pichla se doosri jaali par jao, Bahar se niklo.</p> : null}
          </>
        ) : null}

        {taskGame && phase === "PLAY" ? <TaskGame kind={taskGame.kind} name={taskGame.name} onDone={finishKaam} onCancel={cancelKaam} /> : null}

        {/* Role card */}
        <AnimatePresence>
          {phase === "PLAY" && loaded && splashUntil > now && me?.role ? (
            <motion.div key="role" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 grid place-items-center px-8 text-center backdrop-blur-sm" style={{ background: isGaddar ? "radial-gradient(110% 90% at 50% 40%,rgba(170,20,50,0.92),rgba(14,6,16,0.97))" : "radial-gradient(110% 90% at 50% 40%,rgba(14,130,96,0.92),rgba(6,12,20,0.97))" }}>
              <div>
                <motion.p className="text-[56px] leading-none drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)]" initial={{ scale: 0.3, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 10 }} aria-hidden>
                  {isGaddar ? "🗡️" : "🧑‍🌾"}
                </motion.p>
                <h2 className={`mt-2 font-display text-[28px] font-extrabold ${isGaddar ? "text-[#ff6b6b]" : "text-[#7ddc7a]"}`}>{isGaddar ? "Tum Gaddaar ho" : "Tum Gaonwale ho"}</h2>
                <p className="mt-1.5 text-[13.5px] text-white/80">{isGaddar ? "Chupke se gaonwalon ko hatao, sabotage karo, surang me chhupo. Kisi ko pata na chale." : "Apne kaam poore karo aur gaddaar ko pehchano."}</p>
                {isGaddar && me?.mates.length ? <p className="mt-2 text-[13px] text-[#ff9a9a]">Doosra gaddaar: {me.mates.map((m) => byId.get(m)?.name ?? "?").join(", ")}</p> : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {phase === "MEETING" && loaded ? <Meeting state={state} me={me} players={players} myId={myId} serverNow={serverNow} busy={busy} chat={chat} onVote={(t) => {
          sfx("vote");
          void run(() => gaddarApi.vote(roomId, t));
        }} onSay={(text) => publish(gaddarChatDest(roomId), { text })} /> : null}
        {phase === "ENDED" && loaded ? <Ended state={state} myId={myId} busy={busy} onLobby={() => void run(() => gaddarApi.lobby(roomId))} onExit={pop} exitLabel={state.table ? "Wapas jao" : "Room me wapas"} /> : null}

        {/* Loading: wait for the map, the connection, the first positions and the village before showing anything */}
        {!loaded ? <Loading hints={HINTS} progress={progress} now={now} steps={[{ label: "Gaon ka naksha", done: mapReady }, { label: "Dusre players se jud rahe hain", done: snapOk }, { label: "Gaon bana rahe hain", done: layerReady }]} /> : null}
        {guide ? <GaddarGuide onClose={closeGuide} /> : null}
      </Stage>
    </div>
  );
}

function Segment({ label, options, value, disabled, onPick }: { label: string; options: [number, string][]; value: number; disabled: boolean; onPick: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[12.5px] font-semibold text-cream/80">{label}</span>
      <div className="flex flex-1 gap-1.5">
        {options.map(([v, text]) => (
          <button key={v} type="button" disabled={disabled} aria-pressed={value === v} onClick={() => onPick(v)} className={`h-9 flex-1 rounded-full text-[12.5px] font-bold ${value === v ? "bg-gold text-ink" : "bg-white/10 text-cream/80"} disabled:opacity-60`}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- loading ---------------- */


/* ---------------- controls ---------------- */

function Joystick({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const turned = useContext(TurnedContext);
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const R = 46;
  const set = (e: React.PointerEvent) => {
    const r = base.current?.getBoundingClientRect();
    if (!r) return;
    // The pointer is read on the real screen. When the game is turned a quarter with CSS, screen (x, y) is the game's (y, -x)
    let sx = e.clientX - (r.left + r.width / 2);
    let sy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(sx, sy);
    if (len > R) {
      sx = (sx / len) * R;
      sy = (sy / len) * R;
    }
    const dx = turned ? sy : sx;
    const dy = turned ? -sx : sy;
    setKnob({ x: dx, y: dy });
    const m = Math.hypot(dx, dy) / R;
    stick.current = m < 0.15 ? { x: 0, y: 0 } : { x: dx / R, y: dy / R };
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    stick.current = { x: 0, y: 0 };
  };
  return (
    <div
      ref={base}
      className="absolute bottom-5 left-6 z-10 h-[116px] w-[116px] touch-none rounded-full bg-black/35 ring-2 ring-white/25"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        set(e);
      }}
      onPointerMove={(e) => active.current === e.pointerId && set(e)}
      onPointerUp={end}
      onPointerCancel={end}
      aria-label="Move"
      role="application"
    >
      <span className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-white/55 shadow-lg" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}



/* ---------------- Sarpanch ki baithak ---------------- */

function Meeting({ state, me, players, myId, serverNow, busy, chat, onVote, onSay }: { state: GaddarState; me: GaddarMe | undefined; players: GaddarPlayer[]; myId: string; serverNow: number; busy: boolean; chat: GaddarChat[]; onVote: (target: string | null) => void; onSay: (text: string) => void }) {
  const m = state.meeting;
  const result = m?.result;
  const left = Math.max(0, Math.ceil((state.endsAt - serverNow) / 1000));
  const iVoted = !!me?.myVote || !!players.find((p) => p.id === myId)?.voted;
  const alive = me ? me.alive : true;
  const byId = new Map(players.map((p) => [p.id, p]));
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [chat.length]);
  const say = () => {
    const t = draft.trim();
    if (!t || !alive || result) return;
    onSay(t);
    setDraft("");
  };
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-[#3a2412] to-[#150f0b]">
      <div className="flex items-center gap-2 px-4 pb-1.5 pt-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[18px] font-extrabold text-gold">🛕 Sarpanch ki baithak</h2>
          <p className="truncate text-[11.5px] text-cream/75">{m?.why === "emergency" ? `${m.byName} ne baithak bulayi` : `${m?.byName ?? "Kisi"} ko laash mili`}. Text me baat karo, phir vote do.</p>
        </div>
        <span className="rounded-full bg-black/40 px-3 py-1 font-display text-[15px] font-extrabold text-cream">{left}s</span>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 px-4 pb-3">
        {/* Text chat */}
        <section className="flex min-h-0 w-[44%] flex-col rounded-2xl bg-black/30 ring-1 ring-white/10" aria-label="Baithak chat">
          <p className="flex items-center gap-1.5 px-3 pt-2 text-[11px] font-bold uppercase tracking-wide text-cream/60">
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden /> Baat-cheet
          </p>
          <div ref={log} className="app-scroll min-h-0 flex-1 space-y-1 px-3 py-1.5">
            {chat.length === 0 ? <p className="pt-3 text-center text-[12px] text-cream/45">Kuch likho: kisne kya dekha?</p> : null}
            {chat.map((c, i) => (
              <div key={`${c.t}-${i}`} className={`flex ${c.from === myId ? "justify-end" : "justify-start"}`}>
                <p className="max-w-[88%] rounded-2xl px-2.5 py-1 text-[12.5px] leading-snug text-white shadow" style={{ background: c.from === myId ? "linear-gradient(135deg,#7c4dff,#ff3d8b)" : "rgba(255,255,255,0.12)" }}>
                  {c.from === myId ? null : <b className="mr-1 text-[11px]" style={{ color: GADDAR_COLORS[c.color % GADDAR_COLORS.length] }}>{c.name}</b>}
                  {c.text}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 border-t border-white/10 p-1.5">
            <input
              value={draft}
              maxLength={140}
              disabled={!alive || !!result}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && say()}
              placeholder={alive ? "Kuch likho…" : "Bhoot baat nahi kar sakte"}
              aria-label="Message"
              className="h-9 min-w-0 flex-1 rounded-full bg-white/10 px-3 text-[13px] text-cream placeholder:text-cream/40 focus:outline-none disabled:opacity-50"
            />
            <button type="button" disabled={!draft.trim() || !alive || !!result} onClick={say} aria-label="Send" className="grid h-9 w-9 place-items-center rounded-full bg-gold text-ink disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* The vote */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ul className="app-scroll grid min-h-0 flex-1 grid-cols-2 content-start gap-1.5">
            {players
              .filter((p) => !p.gone)
              .map((p) => {
                const votes = result?.tally[p.id] ?? 0;
                const isMe = p.id === myId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={busy || !alive || iVoted || !p.alive || !!result}
                      onClick={() => onVote(p.id)}
                      className={`flex w-full items-center gap-2 rounded-xl p-2 text-left ring-1 ${p.alive ? "bg-white/[0.08] ring-white/15" : "bg-black/30 opacity-50 ring-white/5"} ${me?.myVote === p.id ? "ring-2 ring-gold" : ""}`}
                    >
                      <Face p={p} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-cream">{isMe ? `${p.name} (you)` : p.name}</span>
                        <span className="block text-[9.5px] text-cream/60">{!p.alive ? "Bhoot" : p.voted ? "Vote de diya" : "Soch raha hai…"}</span>
                      </span>
                      {result && votes > 0 ? <span className="rounded-full bg-gold px-2 py-0.5 text-[10.5px] font-extrabold text-ink">{votes}</span> : null}
                    </button>
                  </li>
                );
              })}
          </ul>
          {!result ? (
            <button type="button" disabled={busy || !alive || iVoted} onClick={() => onVote(null)} className="mt-1.5 h-9 w-full rounded-full bg-white/12 text-[12.5px] font-bold text-cream disabled:opacity-45">
              {iVoted ? (me?.myVote === "0" ? "Tumne skip kiya" : "Vote ho gaya") : alive ? "Skip (kisi ko mat nikalo)" : "Bhoot vote nahi de sakte"}
            </button>
          ) : (
            <div className="mt-1.5 rounded-xl bg-black/50 p-2.5 text-center ring-1 ring-gold/30">
              {result.ejected ? (
                <>
                  <p className="font-display text-[15px] font-extrabold text-cream">{result.ejectedName ?? byId.get(result.ejected)?.name} ko gaon se nikala gaya</p>
                  <p className={`text-[12.5px] font-bold ${result.wasGaddar ? "text-[#7ddc7a]" : "text-[#ff8a80]"}`}>{result.wasGaddar ? "Wo Gaddaar tha! 🎉" : "Wo Gaddaar nahi tha 😔"}</p>
                </>
              ) : (
                <p className="font-display text-[15px] font-extrabold text-cream">Koi nahi nikla</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------- the end ---------------- */

