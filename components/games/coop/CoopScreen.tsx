"use client";

/**
 * Duo Dash inside Panchayat.
 *  - Start screen: a slideshow of the game, Play (new code or join with a friend's code), the couple Ranking,
 *    and a Guide. The game downloads in the background while you are here.
 *  - The game: full screen, with its own private voice channel for the two of you (no Panchayat voice room),
 *    a mic button, the code to share, and a "turn your phone" prompt when it is held upright.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Copy, Heart, Loader2, Maximize2, Mic, MicOff, Play, RotateCw, Sparkles, Trophy, Users } from "lucide-react";
import { useApp } from "@/lib/app/store";
import { coopServerUrl, preloadCoop, COOP_BASE } from "@/lib/games/coop";
import { duoApi, newDuoCode, useDuoVoice, type DuoCouple, type DuoMatch, type DuoSession } from "@/lib/games/duo";

const NEON = "bg-[radial-gradient(120%_80%_at_20%_0%,#5b16b8_0%,#1b0738_45%,#07020f_100%)]";
const msg = (e: unknown, d = "Nahi hua.") => (e instanceof Error && e.message ? e.message : d);

const SLIDES = [
  { src: "slide-hug.jpg", text: "Romantic spots pe saath ruko. Hug & kiss (dono ki marzi se)" },
  { src: "slide-map.jpg", text: "10 duniya, 150 levels. Saath me aage badho" },
  { src: "slide-climb.jpg", text: "Ek doosre ke sir pe chadho, partner ko upar phenko" },
  { src: "slide-love.jpg", text: "Couple moments, hearts aur photo" },
  { src: "slide-level.jpg", text: "Missions poore karo. Finish par sawaal ka jawab saath me" },
  { src: "slide-kiss.jpg", text: "Voice chat poore game me ON" },
];

export function CoopScreen({ code }: { code?: string }) {
  return code ? <DuoGame code={code} /> : <DuoStart />;
}

function useLoad() {
  const [p, setP] = useState(0);
  useEffect(() => preloadCoop(setP), []);
  return p;
}

function Slideshow() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % SLIDES.length), 3600);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="relative mx-4 mt-3 aspect-[16/10] overflow-hidden rounded-[26px] shadow-[0_0_40px_-8px_#ff3d8b] ring-2 ring-[#ff3d8b]/60">
      {SLIDES.map((s, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.src}
          src={`${COOP_BASE}media/${s.src}`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1400ms] ease-out"
          style={{ opacity: k === i ? 1 : 0, transform: k === i ? "scale(1.08)" : "scale(1)" }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#c6ff3d] ring-1 ring-[#c6ff3d]/40">
        <Sparkles className="h-3.5 w-3.5" /> New · Couple game
      </div>
      <p className="absolute inset-x-4 bottom-8 text-[15px] font-extrabold leading-snug text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{SLIDES[i].text}</p>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {SLIDES.map((s, k) => (
          <span key={s.src} className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-[#ff3d8b]" : "w-1.5 bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}

function DuoStart() {
  const { pop, replaceTop, toast } = useApp();
  const loaded = useLoad();
  const [tab, setTab] = useState<"play" | "rank" | "guide">("play");
  const [code, setCode] = useState("");
  const pct = Math.round(loaded * 100);
  const start = () => replaceTop({ kind: "coop", code: newDuoCode() });
  const join = () => {
    const c = code.replace(/\D/g, "");
    if (c.length < 6) return toast("Partner ka 6-digit code daalo.", "error");
    replaceTop({ kind: "coop", code: c });
  };
  return (
    <div className={`app-scroll h-full ${NEON} pb-10 text-white`}>
      <header className="pt-safe flex items-center gap-2 px-3 pt-2">
        <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="bg-gradient-to-r from-[#ff3d8b] via-[#ffb347] to-[#c6ff3d] bg-clip-text font-display text-[26px] font-black uppercase italic tracking-tight text-transparent">Duo Dash</h1>
        <Heart className="h-5 w-5 fill-[#ff3d8b] text-[#ff3d8b]" />
        <span className="ml-auto text-[11px] font-black uppercase tracking-widest text-white/60">Do dil · ek mission</span>
      </header>
      <Slideshow />

      <nav className="mx-4 mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-black/50 p-1 ring-1 ring-white/10" role="tablist">
        {(
          [
            ["play", "Play"],
            ["rank", "Ranking"],
            ["guide", "Guide"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-11 rounded-xl text-[14px] font-black uppercase tracking-wide transition ${tab === k ? "bg-gradient-to-r from-[#ff3d8b] to-[#8b5cf6] text-white shadow-[0_0_18px_-4px_#ff3d8b]" : "text-white/60"}`}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "play" ? (
        <div className="mx-4 mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between text-[12px] font-black uppercase tracking-wide text-white/70">
              <span>{pct >= 100 ? "Game ready" : "Game load ho raha hai..."}</span>
              <span className="text-[#c6ff3d]">{pct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#c6ff3d] via-[#ffb347] to-[#ff3d8b] transition-[width] duration-300" style={{ width: `${Math.max(4, pct)}%` }} />
            </div>
          </div>
          <button type="button" onClick={start} className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff3d8b] via-[#ff6a3d] to-[#ffb347] text-[19px] font-black uppercase italic tracking-wide shadow-[0_6px_0_#8a1846,0_0_30px_-6px_#ff3d8b] active:translate-y-[3px] active:shadow-[0_3px_0_#8a1846]">
            <Play className="h-6 w-6 fill-white" /> Start a duo
          </button>
          <p className="text-center text-[12.5px] font-bold text-white/70">Tumhe ek 6-digit code milega. Partner usse judega. Voice chat game me hi chalega.</p>
          <Matchmaking onMatched={(c) => replaceTop({ kind: "coop", code: c })} />
          <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-[#8b5cf6]/50">
            <p className="flex items-center gap-1.5 text-[14px] font-black uppercase tracking-wide">
              <Users className="h-4 w-4 text-[#c6ff3d]" /> Partner ka code
            </p>
            <div className="mt-2.5 flex gap-2">
              <input value={code} inputMode="numeric" onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => e.key === "Enter" && join()} placeholder="482193" aria-label="Partner's code" className="h-12 min-w-0 flex-1 rounded-xl bg-black/50 px-4 font-mono text-[22px] font-bold tracking-[0.35em] text-[#c6ff3d] placeholder:tracking-[0.2em] placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#c6ff3d]" />
              <button type="button" disabled={code.length < 6} onClick={join} className="h-12 rounded-xl bg-[#8b5cf6] px-6 text-[15px] font-black uppercase disabled:opacity-40">
                Join
              </button>
            </div>
          </div>
        </div>
      ) : tab === "rank" ? (
        <Ranking />
      ) : (
        <Guide />
      )}
    </div>
  );
}

/** Singles: find someone of the other gender who is looking right now; on a match the game opens for both. */
function Matchmaking({ onMatched }: { onMatched: (code: string) => void }) {
  const { profile, toast } = useApp();
  const [m, setM] = useState<DuoMatch | null>(null);
  const [askGender, setAskGender] = useState(false);
  const looking = m?.state === "waiting" || m?.state === "matched";
  useEffect(() => {
    if (m?.state !== "waiting") return;
    const t = window.setInterval(() => {
      duoApi.matchStatus().then(setM).catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(t);
  }, [m?.state]);
  useEffect(() => {
    if (m?.state === "matched" && m.code) {
      const t = window.setTimeout(() => onMatched(m.code!), 2200);
      return () => window.clearTimeout(t);
    }
  }, [m, onMatched]);
  useEffect(() => () => void duoApi.matchLeave().catch(() => undefined), []);
  const start = async (gender?: "male" | "female") => {
    try {
      setAskGender(false);
      setM(await duoApi.matchJoin(gender ?? (profile.gender as "male" | "female" | undefined)));
    } catch (e) {
      const t = msg(e);
      if (/boy or girl/i.test(t)) setAskGender(true);
      else toast(t, "error");
    }
  };
  const stop = () => {
    void duoApi.matchLeave().catch(() => undefined);
    setM(null);
  };
  if (m?.state === "matched" && m.partner) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-[#ff3d8b]/40 to-[#8b5cf6]/40 p-4 text-center ring-2 ring-[#ff3d8b]">
        <p className="font-display text-[20px] font-black uppercase italic text-[#c6ff3d]">It&apos;s a match! 💘</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <Avatar p={{ name: profile.name || "You", avatarUrl: undefined }} size={54} ring="#ff7a2f" />
          <Heart className="h-7 w-7 animate-pulse fill-[#ff3d8b] text-[#ff3d8b]" />
          <Avatar p={m.partner} size={54} ring="#3da5ff" />
        </div>
        <p className="mt-2 text-[15px] font-extrabold">{m.partner.name}</p>
        <p className="text-[12px] text-white/70">Game khul raha hai...</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-[#ff3d8b]/50">
      <p className="text-[14px] font-black uppercase tracking-wide">💘 Single ho? Partner dhoondo</p>
      <p className="mt-1 text-[12px] text-white/70">Ladke ka match ladki se (aur ladki ka ladke se) jo abhi dhoondh rahe hain. Saath me duniya explore karo!</p>
      {askGender ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void start("male")} className="h-11 rounded-xl bg-[#ff7a2f] text-[14px] font-black uppercase">
            Main ladka hoon
          </button>
          <button type="button" onClick={() => void start("female")} className="h-11 rounded-xl bg-[#3da5ff] text-[14px] font-black uppercase">
            Main ladki hoon
          </button>
        </div>
      ) : looking ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#ff3d8b]/40" />
            <Heart className="h-6 w-6 fill-[#ff3d8b] text-[#ff3d8b]" />
          </span>
          <span className="flex-1 text-[13px] font-bold">
            Dhoondh rahe hain... {m?.waitingSeconds ?? 0}s
            <span className="block text-[11.5px] font-semibold text-white/60">{m?.lookingNow ? `${m.lookingNow} log abhi dhoondh rahe hain` : "Thoda ruko, koi aata hi hoga"}</span>
          </span>
          <button type="button" onClick={stop} className="h-10 rounded-xl bg-white/15 px-4 text-[13px] font-black uppercase">
            Stop
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => void start()} className="mt-3 h-12 w-full rounded-xl bg-gradient-to-r from-[#ff3d8b] to-[#8b5cf6] text-[15px] font-black uppercase italic">
          Find a partner
        </button>
      )}
    </div>
  );
}

function Avatar({ p, size, ring }: { p: { name: string; avatarUrl?: string }; size: number; ring: string }) {
  const [bad, setBad] = useState(false);
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#ff3d8b] to-[#8b5cf6] font-black text-white" style={{ width: size, height: size, boxShadow: `0 0 0 2px ${ring}`, fontSize: size * 0.4 }}>
      {p.avatarUrl && !bad ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.avatarUrl} alt="" onError={() => setBad(true)} className="h-full w-full object-cover" />
      ) : (
        (p.name || "?").slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function Ranking() {
  const [period, setPeriod] = useState<"week" | "all">("week");
  const [rows, setRows] = useState<DuoCouple[] | null>(null);
  useEffect(() => {
    setRows(null);
    duoApi.leaderboard(period).then(setRows).catch(() => setRows([]));
  }, [period]);
  return (
    <div className="mx-4 mt-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-[#ffd34d]" />
        <p className="flex-1 text-[15px] font-black uppercase">Top couples</p>
        {(["week", "all"] as const).map((p) => (
          <button key={p} type="button" onClick={() => setPeriod(p)} className={`h-8 rounded-full px-3 text-[12px] font-black uppercase ${period === p ? "bg-[#c6ff3d] text-[#120624]" : "bg-white/10 text-white/70"}`}>
            {p === "week" ? "Is hafte" : "All time"}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11.5px] text-white/55">Sabse aage wale level se rank, phir stars, phir coins.</p>
      <ol className="mt-3 space-y-2">
        {rows === null ? <li className="rounded-2xl bg-black/40 p-4 text-center text-[13px] text-white/60">Loading...</li> : null}
        {rows?.length === 0 ? <li className="rounded-2xl bg-black/40 p-4 text-center text-[13px] text-white/60">Abhi koi couple nahi. Sabse pehle tum dono aao!</li> : null}
        {rows?.map((r) => (
          <li key={`${r.a.id}-${r.b.id}`} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${r.rank <= 3 ? "bg-gradient-to-r from-[#ff3d8b]/25 to-[#8b5cf6]/20 ring-[#ff3d8b]/50" : "bg-white/[0.06] ring-white/10"}`}>
            <span className={`w-7 text-center font-display text-[20px] font-black italic ${r.rank === 1 ? "text-[#ffd34d]" : r.rank <= 3 ? "text-[#ff9ac4]" : "text-white/50"}`}>{r.rank}</span>
            <span className="flex -space-x-3">
              <Avatar p={r.a} size={40} ring="#ff7a2f" />
              <Avatar p={r.b} size={40} ring="#3da5ff" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-extrabold">
                {r.a.name} <span className="text-[#ff3d8b]">♥</span> {r.b.name}
                {r.engaged ? <span className="ml-1" title="CP couple">💍</span> : null}
              </span>
              <span className="block text-[11.5px] font-bold text-white/60">
                {r.stars} stars · {r.coins} coins · {r.coupleMoments} moments
              </span>
            </span>
            <span className="text-right">
              <span className="block font-display text-[18px] font-black text-[#c6ff3d]">L{r.bestLevel}</span>
              <span className="block text-[10px] uppercase text-white/50">level</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Guide() {
  const items: [string, string, string][] = [
    ["🎯", "Goal", "Do log, ek team. Har level ke finish tak dono ko pahunchna hai. Akele koi level khatam nahi hota."],
    ["🕹️", "Controls", "Left: joystick. JUMP, hawa me dobara JUMP (ya x2) = double jump. USE: lever, crate pakadna, partner ko phenkna. Right side drag = camera."],
    ["🤝", "Teamwork", "Partner ke sir pe chadh kar oonchi jagah pahuncho. Partner sir pe ho to USE se upar phenko. Plate pe khade raho, lever khincho, crate dhakelo."],
    ["💞", "Couple moments", "Har level me ek romantic spot hai: dono saath khade ho to hearts! Love button: Wave, Heart, Hug, Kiss. Hug/Kiss sirf tab jab partner Accept kare."],
    ["📝", "Missions", "Har level me 3 missions screen par dikhte hain (coins, no fall, time, hug...). Har mission +5 coins."],
    ["❓", "Final question", "Finish par ek sawaal aata hai. Dono ka sahi jawab = level complete!"],
    ["💍", "Propose with a ring", "Love → Propose: apni Bag ki CP ring chuno (Shop se khareedi hui). Partner YES bole to tum Panchayat me CP ban jaate ho, aur game me dono ke haath me wahi ring dikhti hai."],
    ["💘", "Single ho?", "Find a partner: ladka-ladki ka match hota hai jo abhi dhoondh rahe hain. Match hote hi game shuru. Hug, kiss aur propose sirf dono ki marzi se."],
    ["🎙️", "Voice & chat", "Game me voice chat ON rehta hai (sirf tum dono). Chat button se jaldi messages bhejo."],
    ["📸", "Photo", "Photo button se couple photo, seedha downloads me."],
    ["🏆", "Ranking", "Jo couple sabse aage level tak gaya, wo upar. Barabar ho to stars, phir coins."],
  ];
  return (
    <div className="mx-4 mt-4 space-y-2.5">
      {items.map(([icon, title, text]) => (
        <div key={title} className="flex gap-3 rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ff3d8b]/40 to-[#8b5cf6]/40 text-[22px]" aria-hidden>
            {icon}
          </span>
          <span>
            <span className="block text-[15px] font-black uppercase tracking-wide text-[#c6ff3d]">{title}</span>
            <span className="mt-0.5 block text-[13px] font-semibold leading-snug text-white/85">{text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function DuoGame({ code }: { code: string }) {
  const { pop, profile, toast } = useApp();
  const loaded = useLoad();
  const box = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState(false);
  const [waitedLong, setWaitedLong] = useState(false);
  const [session, setSession] = useState<DuoSession | null>(null);
  const [sessionTried, setSessionTried] = useState(false);
  const voice = useDuoVoice(session);

  useEffect(() => {
    let off = false;
    duoApi
      .session(code)
      .then((s) => {
        if (!off) setSession(s);
      })
      .catch((e) => {
        if (!off) toast(msg(e, "Voice aur ranking abhi band hain. Game khel sakte ho."), "error");
      })
      .finally(() => {
        if (!off) setSessionTried(true);
      });
    const t = window.setTimeout(() => setWaitedLong(true), 90_000);
    return () => {
      off = true;
      window.clearTimeout(t);
    };
  }, [code, toast]);

  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth && window.matchMedia("(pointer: coarse)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const share = useCallback(async () => {
    const text = `Duo Dash khelo mere saath on Panchayat! Code: ${code}`;
    try {
      if (navigator.share) await navigator.share({ title: "Duo Dash", text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Code copy ho gaya. Partner ko bhejo!", "gold");
      }
    } catch {
      /* closed the share sheet */
    }
  }, [code, toast]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { source?: string; type?: string } | null;
      if (!d || d.source !== "panchayat-coop" || e.origin !== window.location.origin) return;
      if (d.type === "exit") pop();
      else if (d.type === "invite") void share();
      else if (d.type === "photo") toast("Photo downloads me save ho gayi.", "gold");
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pop, share, toast]);

  const fullscreen = async () => {
    try {
      await box.current?.requestFullscreen?.();
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await o.lock?.("landscape").catch(() => undefined);
    } catch {
      /* not allowed here */
    }
  };

  const q = new URLSearchParams({ embed: "1", room: code, name: (profile.name || "Player").slice(0, 16), server: session?.gameServer || coopServerUrl() });
  if (profile.gender === "female") q.set("character", "girl");
  else if (profile.gender === "male") q.set("character", "boy");
  if (session?.ticket) q.set("ticket", session.ticket);
  if (session?.rings?.length) q.set("rings", JSON.stringify(session.rings.map((r) => ({ id: r.id, name: r.name, rarity: r.rarity, qty: r.qty }))));
  const src = `${COOP_BASE}index.html?${q.toString()}`;
  const ready = (loaded >= 1 || waitedLong) && sessionTried;

  return (
    // fixed to the whole window: on a computer the app is a phone-width column, the game should not be
    <div ref={box} className="fixed inset-0 z-[60] overflow-hidden bg-black">
      {ready ? <iframe title="Duo Dash" src={src} className="h-full w-full border-0" allow="fullscreen; autoplay; clipboard-write; gamepad" allowFullScreen /> : null}

      <div className="pointer-events-none absolute left-2 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        <button type="button" onClick={pop} aria-label="Back" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/25">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button type="button" onClick={() => void share()} aria-label="Share the game code" className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-black/60 px-3 text-[13px] font-black tracking-wider text-[#c6ff3d] ring-1 ring-[#c6ff3d]/40">
          <Copy className="h-4 w-4" /> {code}
        </button>
        <button type="button" onClick={() => void fullscreen()} aria-label="Full screen" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/25">
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>

      {/* bottom-centre: the private voice for the two of you */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+10px)] flex justify-center">
        <button
          type="button"
          onClick={voice.toggleMic}
          disabled={voice.state !== "on"}
          aria-label={voice.micOn ? "Turn the mic off" : "Turn the mic on"}
          className={`pointer-events-auto flex h-12 items-center gap-2 rounded-full px-5 text-[13px] font-black uppercase text-white ring-2 disabled:opacity-70 ${voice.state === "on" && voice.micOn ? "bg-[#16a34a] shadow-[0_0_20px_#c6ff3d] ring-[#c6ff3d]" : "bg-black/65 ring-white/25"}`}
        >
          {voice.state === "connecting" ? <Loader2 className="h-5 w-5 animate-spin" /> : voice.micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          {voice.state === "on" ? (voice.micOn ? "Mic on" : "Mic off") : voice.state === "connecting" ? "Voice..." : voice.state === "error" ? "Voice offline" : "Voice"}
          {voice.state === "on" ? (
            <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${voice.partnerHere ? "bg-[#ff3d8b]" : "bg-white/15"}`}>
              {voice.partnerHere ? (voice.partnerTalking ? "Partner bol raha" : "Partner on") : "Partner ka wait"}
            </span>
          ) : null}
        </button>
      </div>

      {!ready || loaded < 1 ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-[min(72%,440px)] -translate-y-1/2 text-center">
          <p className="font-display text-[26px] font-black uppercase italic text-[#ff3d8b]">Duo Dash</p>
          <p className="mt-1 text-[13px] font-bold text-white/85">Loading... {Math.round(loaded * 100)}%</p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#c6ff3d] to-[#ff3d8b]" style={{ width: `${Math.max(4, loaded * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {portrait ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#07020f]/94 p-8 text-center text-white">
          <RotateCw className="h-14 w-14 animate-spin text-[#c6ff3d] [animation-duration:2.5s]" aria-hidden />
          <p className="font-display text-[22px] font-black uppercase italic">Phone ghumao</p>
          <p className="text-[13px] text-white/75">Duo Dash landscape me khelte hain. Voice chalta rahega.</p>
          <button type="button" onClick={() => void fullscreen()} className="rounded-full bg-gradient-to-r from-[#ff3d8b] to-[#8b5cf6] px-6 py-3 text-[14px] font-black uppercase">
            Full screen
          </button>
        </div>
      ) : null}
    </div>
  );
}
