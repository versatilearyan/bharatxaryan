"use client";

/**
 * Co-op Adventure inside Panchayat.
 *  - Without a code: the start screen. The game downloads in the background while you choose:
 *    "Start a game" makes a small voice room for you two (its 7-digit ID is the game code),
 *    "Join with code" puts you in your friend's voice room and game.
 *  - With a code: the game itself, full screen, on top of the voice room, so you can talk the whole time.
 *    A mic button sits at the bottom; on a phone held upright we ask to turn it sideways.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Copy, Loader2, Maximize2, Mic, MicOff, Play, RotateCw, Users } from "lucide-react";
import { useApp } from "@/lib/app/store";
import { useActiveVoice } from "@/lib/app/active-voice";
import { createRoom, joinRoom } from "@/lib/api/voice-rooms";
import { searchServer } from "@/lib/api/search";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { publicRoomId } from "@/lib/app/public-ids";
import { coopUrl, preloadCoop } from "@/lib/games/coop";

const BG = "bg-[radial-gradient(120%_70%_at_50%_0%,#3b1a6b_0%,#1a0c33_55%,#0b0616_100%)]";
const msg = (e: unknown, d = "Nahi hua.") => (e instanceof Error && e.message ? e.message : d);

export function CoopScreen({ code }: { code?: string }) {
  return code ? <CoopGame code={code} /> : <CoopStart />;
}

function useLoad() {
  const [p, setP] = useState(0);
  useEffect(() => preloadCoop(setP), []);
  return p;
}

function CoopStart() {
  const { pop, profile, enterRoom, replaceTop, minimizeRoom, toast } = useApp();
  const { addCreated, rememberPrefs } = useServerRooms();
  const voice = useActiveVoice();
  const loaded = useLoad();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  const go = (roomId: string) => {
    enterRoom(serverRoomAppId(roomId));
    // the voice room connects underneath (and keeps going, minimised); the game goes on top of it
    window.setTimeout(() => {
      replaceTop({ kind: "coop", code: publicRoomId(roomId) });
      minimizeRoom();
    }, 500);
  };
  const create = async () => {
    setBusy("create");
    try {
      const v = await createRoom({ name: `${profile.name || "My"}'s Co-op`.slice(0, 60), roomType: "VOICE", isPrivate: false, maxParticipants: 8, temporary: true });
      rememberPrefs(v.id, { permanent: false, category: "Gaming" });
      addCreated(v);
      await joinRoom(v.id).catch(() => undefined);
      go(v.id);
    } catch (e) {
      toast(msg(e, "Couldn't start a game."), "error");
    } finally {
      setBusy(null);
    }
  };
  const join = async () => {
    const c = code.replace(/\D/g, "");
    if (c.length < 7) return toast("Type your friend's 7-digit code.", "error");
    setBusy("join");
    try {
      const { rooms } = await searchServer(c);
      const room = rooms.find((r) => publicRoomId(r.id) === c);
      if (!room) {
        toast("No game with that code. Check the number with your friend.", "error");
        return;
      }
      addCreated(room);
      await joinRoom(room.id);
      go(room.id);
    } catch (e) {
      toast(msg(e, "Couldn't join."), "error");
    } finally {
      setBusy(null);
    }
  };

  const pct = Math.round(loaded * 100);
  return (
    <div className={`app-scroll h-full ${BG} pb-10 text-white`}>
      <header className="pt-safe flex items-center gap-2 px-3 pt-2">
        <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/40">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="font-display text-[18px] font-black uppercase tracking-tight">Co-op Adventure</h1>
      </header>
      <section className="mx-4 mt-3 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#ff8a3d] via-[#c2417a] to-[#5b2bd6] p-5 text-center shadow-[0_18px_40px_-14px_rgba(124,77,255,0.7)] ring-1 ring-white/30">
        <p className="text-[46px] leading-none" aria-hidden>
          🧑‍🤝‍🧑
        </p>
        <h2 className="mt-3 font-display text-[clamp(22px,7vw,30px)] font-black uppercase leading-none">Two of you. One goal.</h2>
        <p className="mt-2 text-[13.5px] font-bold leading-snug text-white/95">Run, jump, lift each other up and solve puzzles together in a colourful 3D world. Talk on voice the whole time. Nobody finishes alone!</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {["2 players", "Voice chat", "Hug & photo", "150 levels"].map((x) => (
            <span key={x} className="rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-white/25">
              {x}
            </span>
          ))}
        </div>
      </section>

      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between text-[12px] font-bold text-white/70">
          <span>{pct >= 100 ? "Game ready" : "Getting the game ready..."}</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-[#ffb347] to-[#ff3d8b] transition-[width] duration-300" style={{ width: `${Math.max(4, pct)}%` }} />
        </div>
      </div>

      <div className="mx-4 mt-4 space-y-3">
        {voice?.roomServerId ? (
          <button type="button" onClick={() => replaceTop({ kind: "coop", code: publicRoomId(voice.roomServerId!) })} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white/12 text-[15px] font-extrabold ring-1 ring-white/25">
            <Mic className="h-5 w-5" /> Play with people in my room
          </button>
        ) : null}
        <button type="button" disabled={busy !== null} onClick={() => void create()} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff3d8b] to-[#ffb347] text-[17px] font-black uppercase tracking-wide shadow-[0_6px_0_#a3204f] active:translate-y-[3px] active:shadow-[0_3px_0_#a3204f] disabled:opacity-60">
          {busy === "create" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />} Start a game
        </button>
        <p className="text-center text-[12px] font-bold text-white/65">You get a 7-digit code. Your friend enters it to join you (game + voice).</p>
        <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
          <p className="flex items-center gap-1.5 text-[14px] font-extrabold">
            <Users className="h-4 w-4" /> Join with code
          </p>
          <div className="mt-2.5 flex gap-2">
            <input value={code} inputMode="numeric" onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 7))} onKeyDown={(e) => e.key === "Enter" && void join()} placeholder="e.g. 4821930" aria-label="Game code" className="h-12 min-w-0 flex-1 rounded-xl bg-black/30 px-4 font-mono text-[19px] tracking-[0.25em] placeholder:tracking-normal placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffb347]/60" />
            <button type="button" disabled={busy !== null || code.length < 7} onClick={() => void join()} className="h-12 rounded-xl bg-[#7b5cff] px-5 text-[14px] font-extrabold disabled:opacity-50">
              {busy === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoopGame({ code }: { code: string }) {
  const { pop, profile, toast } = useApp();
  const voice = useActiveVoice();
  const loaded = useLoad();
  const box = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState(false);
  const [waitedLong, setWaitedLong] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setWaitedLong(true), 90_000);
    return () => window.clearTimeout(t);
  }, []);
  // boy / girl from the profile; without one the game picks (the room's host a boy, the guest a girl)
  const [src] = useState(() => coopUrl({ code, name: profile.name || "Player", character: profile.gender === "female" ? "girl" : profile.gender === "male" ? "boy" : undefined }));

  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth && window.matchMedia("(pointer: coarse)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const share = useCallback(
    async (c: string) => {
      const text = `Play Co-op Adventure with me on Panchayat! Game code: ${c}`;
      try {
        if (navigator.share) await navigator.share({ title: "Co-op Adventure", text });
        else {
          await navigator.clipboard.writeText(text);
          toast("Code copied. Send it to your friend!", "gold");
        }
      } catch {
        /* closed the share sheet */
      }
    },
    [toast],
  );

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { source?: string; type?: string; value?: string } | null;
      if (!d || d.source !== "panchayat-coop" || e.origin !== window.location.origin) return;
      if (d.type === "exit") pop();
      else if (d.type === "invite") void share(code);
      else if (d.type === "photo") toast("Photo saved to your downloads.", "gold");
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pop, share, code, toast]);

  const fullscreen = async () => {
    try {
      await box.current?.requestFullscreen?.();
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await o.lock?.("landscape").catch(() => undefined);
    } catch {
      /* not allowed here */
    }
  };

  const someoneTalking = (voice?.speakingIds.length ?? 0) > 0;
  return (
    // fixed to the whole window: on a computer the app is a phone-width column, the game should not be
    <div ref={box} className="fixed inset-0 z-[60] overflow-hidden bg-black">
      {/* opened once the files are downloaded, so they come from the cache (one download, not two) */}
      {loaded >= 1 || waitedLong ? <iframe title="Co-op Adventure" src={src} className="h-full w-full border-0" allow="fullscreen; autoplay; clipboard-write; gamepad" allowFullScreen /> : null}

      {/* left edge, middle: back, code, full screen (the game uses the corners for its own buttons) */}
      <div className="pointer-events-none absolute left-2 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        <button type="button" onClick={pop} aria-label="Back" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button type="button" onClick={() => void share(code)} aria-label="Share the game code" className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-black/55 px-3 text-[12px] font-extrabold text-white ring-1 ring-white/20">
          <Copy className="h-4 w-4" /> {code}
        </button>
        <button type="button" onClick={() => void fullscreen()} aria-label="Full screen" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20">
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>

      {/* bottom-centre: the voice room's mic */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+10px)] flex justify-center">
        {voice ? (
          <button
            type="button"
            onClick={() => {
              if (!voice.seated && !voice.sitToTalk()) return;
              voice.toggleMute();
            }}
            aria-label={voice.muted ? "Turn the mic on" : "Turn the mic off"}
            className={`pointer-events-auto flex h-12 items-center gap-2 rounded-full px-5 text-[13px] font-extrabold text-white ring-2 ${voice.muted ? "bg-black/60 ring-white/25" : "bg-[#2ea44f] ring-[#7dff9a] shadow-[0_0_18px_#7dff9a]"}`}
          >
            {voice.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {voice.muted ? "Mic off" : "Mic on"}
            {someoneTalking ? <span className="ml-1 h-2.5 w-2.5 animate-pulse rounded-full bg-[#7dff9a]" aria-label="Someone is talking" /> : null}
          </button>
        ) : (
          <span className="rounded-full bg-black/55 px-4 py-2 text-[12px] font-bold text-white/80">Voice connects with the room...</span>
        )}
      </div>

      {loaded < 1 ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-[min(70%,420px)] -translate-y-1/2 text-center">
          <p className="text-[13px] font-bold text-white/80">Loading the game... {Math.round(loaded * 100)}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#ffb347] to-[#ff3d8b]" style={{ width: `${Math.max(4, loaded * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {portrait ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0b0616]/92 p-8 text-center text-white">
          <RotateCw className="h-14 w-14 animate-spin [animation-duration:2.5s]" aria-hidden />
          <p className="font-display text-[20px] font-black">Turn your phone sideways</p>
          <p className="text-[13px] text-white/75">The game plays in landscape. Voice keeps working.</p>
          <button type="button" onClick={() => void fullscreen()} className="rounded-full bg-[#ff3d8b] px-6 py-3 text-[14px] font-extrabold">
            Full screen
          </button>
        </div>
      ) : null}
    </div>
  );
}
