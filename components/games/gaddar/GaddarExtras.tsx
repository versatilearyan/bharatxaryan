"use client";

/** Lobby extras for Gaon ka Gaddaar: the avatar chooser (topi, kurta, face), the chat box and the sound switch. */
import { useEffect, useRef, useState } from "react";
import { Send, Volume2, VolumeX } from "lucide-react";
import { GADDAR_COLORS, type GaddarChat } from "@/lib/api/gaddar";
import { setSound, sfx, soundOn } from "@/lib/games/gaddarSound";
import { drawVillager } from "./GaddarField";
import { ACCS, HATS, SUITS, SUIT_COLORS, type Look } from "./looks";

/** A live picture of the villager with the chosen look. */
function Preview({ look, color }: { look: Look; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = (ms: number) => {
      const c = ref.current;
      const ctx = c?.getContext("2d");
      if (c && ctx) {
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.save();
        ctx.scale(2.6, 2.6);
        const bob = Math.sin(ms / 400) * 1.5;
        drawVillager(ctx, 36, 58 + bob, color, 1, false, ms / 1000, false, "", false, false, null, look.hat, look.suit, look.acc);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [look, color]);
  return <canvas ref={ref} width={190} height={190} className="h-[130px] w-[130px] shrink-0" aria-label="Your villager" />;
}

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} aria-pressed={on} className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-extrabold ring-1 transition active:scale-95 ${on ? "bg-gradient-to-r from-[#7c4dff] to-[#ff3d8b] text-white ring-white/40 shadow-[0_4px_14px_-4px_rgba(255,61,139,0.8)]" : "bg-white/10 text-cream/85 ring-white/10"}`}>
    {children}
  </button>
);

export function LookPicker({ look, colorIdx, onChange }: { look: Look; colorIdx: number; onChange: (l: Look) => void }) {
  const color = GADDAR_COLORS[colorIdx % GADDAR_COLORS.length];
  const set = (p: Partial<Look>) => {
    sfx("click");
    onChange({ ...look, ...p });
  };
  return (
    <section className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-[#2a2147] to-[#1a1326] p-3.5 ring-1 ring-white/15" aria-label="Apna avatar">
      <h3 className="font-display text-[17px] font-black text-cream">🎭 Apna avatar chuno</h3>
      <div className="mt-2 flex items-center gap-3">
        <div className="grid place-items-center rounded-2xl bg-black/30 ring-1 ring-white/10">
          <Preview look={look} color={color} />
        </div>
        <p className="text-[12.5px] font-bold leading-snug text-cream/80">Topi, kurta aur chehre ka saaman chuno. Sab doosre players ko game me yahi dikhega.</p>
      </div>
      <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wide text-cream/55">Topi / pagdi</p>
      <div className="app-scroll mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
        {HATS.map((h, i) => (
          <Chip key={h} on={look.hat === i} onClick={() => set({ hat: i })}>
            {h}
          </Chip>
        ))}
      </div>
      <p className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-cream/55">Kurta (dress)</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {SUITS.map((n, i) => {
          const c = SUIT_COLORS[i] ?? color;
          return (
            <button key={n} type="button" aria-label={n} aria-pressed={look.suit === i} onClick={() => set({ suit: i })} className={`h-9 w-9 rounded-full ring-2 transition active:scale-90 ${look.suit === i ? "scale-110 ring-white" : "ring-white/20"}`} style={{ background: c }}>
              {i === 0 ? <span className="text-[13px] font-black text-white drop-shadow">A</span> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-cream/55">Chehra / gala</p>
      <div className="app-scroll mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
        {ACCS.map((a, i) => (
          <Chip key={a} on={look.acc === i} onClick={() => set({ acc: i })}>
            {a}
          </Chip>
        ))}
      </div>
    </section>
  );
}

/** The lobby chat. */
export function LobbyChat({ chat, myId, onSay }: { chat: GaddarChat[]; myId: string; onSay: (t: string) => void }) {
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [chat.length]);
  const say = () => {
    const t = draft.trim();
    if (!t) return;
    onSay(t);
    sfx("click");
    setDraft("");
  };
  return (
    <section className="mx-4 mt-4 rounded-3xl bg-black/30 ring-1 ring-white/10" aria-label="Chat">
      <h3 className="px-4 pt-3 font-display text-[17px] font-black text-cream">💬 Chat</h3>
      <div ref={log} className="app-scroll mt-1 max-h-[180px] min-h-[70px] space-y-1.5 overflow-y-auto px-3 py-1">
        {chat.length === 0 ? <p className="pt-3 text-center text-[12.5px] font-bold text-cream/45">Sabko hello bolo 👋</p> : null}
        {chat.map((c, i) => (
          <div key={`${c.t}-${i}`} className={`flex ${c.from === myId ? "justify-end" : "justify-start"}`}>
            <p className="max-w-[85%] rounded-2xl px-3 py-1.5 text-[13px] font-semibold leading-snug text-white shadow" style={{ background: c.from === myId ? "linear-gradient(135deg,#7c4dff,#ff3d8b)" : "rgba(255,255,255,0.12)" }}>
              {c.from === myId ? null : (
                <b className="mr-1.5 text-[11.5px]" style={{ color: GADDAR_COLORS[c.color % GADDAR_COLORS.length] }}>
                  {c.name}
                </b>
              )}
              {c.text}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 p-2.5">
        <input value={draft} maxLength={140} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && say()} placeholder="Kuch likho…" aria-label="Message" className="h-11 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-[14px] font-semibold text-cream placeholder:text-cream/40 focus:outline-none" />
        <button type="button" disabled={!draft.trim()} onClick={say} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#ffd86b] to-[#ff9a3d] text-ink disabled:opacity-40">
          <Send className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}

/** A round speaker button: sound on or off. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundOn()), []);
  return (
    <button
      type="button"
      aria-label={on ? "Sound band karo" : "Sound chalu karo"}
      aria-pressed={on}
      onClick={() => {
        const n = !on;
        setSound(n);
        setOn(n);
        if (n) sfx("join");
      }}
      className={`grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream ring-1 ring-white/15 ${className}`}
    >
      {on ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </button>
  );
}
