"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Disc3, Heart, Music2, Pause, Play, Plus, Repeat1, SkipForward, Trash2, Upload, Volume2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DAY_MS } from "@/lib/app/market";
import { MAX_SONG_MB, REVIEW_MAX_DAYS, REVIEW_MIN_DAYS, mmss, type Song } from "@/lib/app/music";
import { useMusic } from "@/lib/app/music-store";
import { usePeople } from "@/lib/app/people";
import { ME_ID } from "@/lib/app/store";

/** The spinning-disc pill beside the top seats: what's playing in the room. Tap for the songs. */
export function MusicPill({ className = "", onOpen, onlyMe = false }: { className?: string; onOpen: () => void; onlyMe?: boolean }) {
  const { current, playing, queue } = useMusic();
  return (
    <>
      <button type="button" onClick={onOpen} aria-label={current ? `Now playing ${current.title}. Open songs` : "Songs. Open songs"} className={`relative flex h-9 max-w-[96px] items-center gap-1.5 rounded-full bg-black/45 py-1 pl-1 pr-2.5 ring-1 ring-white/15 backdrop-blur ${className}`}>
        <motion.span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#3a2d6b] to-[#111] ring-1 ring-white/20" animate={playing ? { rotate: 360 } : { rotate: 0 }} transition={playing ? { duration: 4, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}>
          <Disc3 className="h-4 w-4 text-cream/85" aria-hidden />
        </motion.span>
        <span className="min-w-0 overflow-hidden whitespace-nowrap text-[11px] font-bold text-cream">
          {current ? (
            <motion.span className="inline-block" animate={{ x: ["0%", "-60%"] }} transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "linear", delay: 1 }}>
              {current.title}
            </motion.span>
          ) : queue.length ? (
            "Paused"
          ) : (
            "No songs"
          )}
        </span>
        {onlyMe ? <span className="absolute -bottom-2 right-1 rounded-full bg-[#e2242f] px-1.5 text-[9px] font-extrabold text-white">Only you</span> : null}
      </button>
    </>
  );
}

function SongRow({ song, right, active, onClick }: { song: Song; right: React.ReactNode; active?: boolean; onClick?: () => void }) {
  const person = usePeople();
  const by = song.uploader === "Panchayat" ? "Panchayat" : song.uploader === ME_ID ? "you" : person(song.uploader).name;
  return (
    <li className={`flex items-center gap-3 border-l-[3px] px-3 py-2.5 ${active ? "border-[#3d9bff] bg-[#3d9bff]/10" : "border-transparent"}`}>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left" disabled={!onClick}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5a2a8c] to-[#1a0b11] ring-1 ring-white/15">
          {active ? <Music2 className="h-4.5 w-4.5 text-[#7fb6ff]" aria-hidden /> : <Disc3 className="h-4.5 w-4.5 text-cream/70" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[14px] font-bold ${active ? "text-[#7fb6ff]" : "text-cream"}`}>{song.title}</span>
          <span className="block truncate text-[11px] text-muted">
            {song.artist} · {mmss(song.duration)} · Uploaded by {by}
          </span>
        </span>
      </button>
      {right}
    </li>
  );
}

/** Songs ordered in the room, the library to order from, and contributing your own. */
export function MusicSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMusic();
  const [tab, setTab] = useState<"ordered" | "library" | "contribute">("ordered");
  return (
    <BottomSheet open={open} onClose={onClose} title={`🎵 ${m.queue.length} ${m.queue.length === 1 ? "song" : "songs"} ordered`} tall className="h-[84%]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="mx-4 flex rounded-full bg-surface p-1 ring-1 ring-line" role="tablist">
          {(
            [
              ["ordered", "Ordered"],
              ["library", "Library"],
              ["contribute", "Contribute"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-9 flex-1 rounded-full text-[13px] font-bold ${tab === id ? "bg-[#3d9bff] text-white" : "text-cream/65"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="app-scroll mt-2 min-h-0 flex-1">
          {tab === "ordered" ? (
            m.queue.length ? (
              <ul>
                {m.queue.map((id, i) => {
                  const s = m.songById(id);
                  if (!s) return null;
                  return (
                    <SongRow
                      key={`${id}-${i}`}
                      song={s}
                      active={i === m.index}
                      onClick={() => m.playAt(i)}
                      right={
                        <span className="flex shrink-0 items-center gap-1">
                          <button type="button" onClick={() => m.toggleFavourite(id)} aria-label={m.favourites.includes(id) ? "Unfavourite" : "Favourite"} className="grid h-8 w-8 place-items-center rounded-full text-cream/60">
                            <Heart className={`h-4 w-4 ${m.favourites.includes(id) ? "fill-pink text-pink" : ""}`} />
                          </button>
                          <button type="button" onClick={() => m.removeFromQueue(i)} aria-label={`Remove ${s.title}`} className="grid h-8 w-8 place-items-center rounded-full text-cream/60">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </span>
                      }
                    />
                  );
                })}
              </ul>
            ) : (
              <div className="px-6 pt-10 text-center">
                <Disc3 className="mx-auto h-10 w-10 text-cream/30" aria-hidden />
                <p className="mt-2 text-[13px] text-muted">No songs yet. Order one from the Library.</p>
                <button type="button" onClick={() => setTab("library")} className="mt-3 h-9 rounded-full bg-[#3d9bff] px-5 text-[13px] font-bold text-white">
                  Order a song
                </button>
              </div>
            )
          ) : tab === "library" ? (
            <ul>
              {m.library.map((s) => (
                <SongRow
                  key={s.id}
                  song={s}
                  right={
                    <button type="button" onClick={() => m.order(s.id)} aria-label={`Order ${s.title}`} className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#3d9bff] px-3 text-[12px] font-bold text-white">
                      <Plus className="h-3.5 w-3.5" aria-hidden /> Order
                    </button>
                  }
                />
              ))}
            </ul>
          ) : (
            <Contribute />
          )}
        </div>

        <Player />
      </div>
    </BottomSheet>
  );
}

function Player() {
  const m = useMusic();
  const dur = m.current?.duration || 0;
  return (
    <div className="shrink-0 border-t border-line bg-ink-2 px-4 pb-3 pt-2.5">
      <p className="truncate text-center text-[12px] font-semibold text-cream/80">{m.current ? `${m.current.title} · ${m.current.artist}` : "Nothing playing"}</p>
      <input type="range" min={0} max={dur || 1} step={1} value={Math.min(m.pos, dur)} onChange={(e) => m.seek(Number(e.target.value))} aria-label="Seek" className="mt-1.5 w-full accent-[#3d9bff]" disabled={!m.current} />
      <div className="flex items-center justify-between text-[11px] tabular-nums text-muted">
        <span>{mmss(m.pos)}</span>
        <span>{mmss(dur)}</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-3">
        <button type="button" onClick={() => m.setRepeat(!m.repeat)} aria-pressed={m.repeat} aria-label="Repeat this song" className={`grid h-9 w-9 place-items-center rounded-full ${m.repeat ? "bg-[#3d9bff]/20 text-[#7fb6ff]" : "text-cream/60"}`}>
          <Repeat1 className="h-4.5 w-4.5" />
        </button>
        <button type="button" onClick={m.toggle} disabled={!m.current} aria-label={m.playing ? "Pause" : "Play"} className="grid h-12 w-12 place-items-center rounded-full bg-[#3d9bff] text-white disabled:bg-cream/10 disabled:text-muted">
          {m.playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
        </button>
        <button type="button" onClick={m.next} disabled={!m.current} aria-label="Next song" className="grid h-9 w-9 place-items-center rounded-full text-cream/75 disabled:text-cream/25">
          <SkipForward className="h-4.5 w-4.5" />
        </button>
        <span className="flex items-center gap-1.5 text-cream/60">
          <Volume2 className="h-4 w-4" aria-hidden />
          <input type="range" min={0} max={1} step={0.05} value={m.volume} onChange={(e) => m.setVolume(Number(e.target.value))} aria-label="Volume" className="w-20 accent-[#3d9bff]" />
        </span>
      </div>
    </div>
  );
}

function reviewLeft(liveAt: number, now: number) {
  const ms = liveAt - now;
  const d = Math.floor(ms / DAY_MS);
  const h = Math.max(1, Math.floor((ms % DAY_MS) / 3_600_000));
  return d ? `${d}d ${h}h` : `${h}h`;
}

function Contribute() {
  const m = useMusic();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const submit = async () => {
    if (!file || !title.trim()) return;
    setBusy(true);
    const ok = await m.contribute(file, title, artist);
    setBusy(false);
    if (ok) {
      setFile(null);
      setTitle("");
      setArtist("");
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className="px-4 pb-4">
      <p className="text-[12.5px] text-muted">
        Add your song to Panchayat. Our team reviews it and it goes live for everyone in {REVIEW_MIN_DAYS}–{REVIEW_MAX_DAYS} days. Only upload music you made or have the rights to.
      </p>
      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#3d9bff]/60 bg-[#3d9bff]/5 px-3 py-3">
        <Upload className="h-5 w-5 shrink-0 text-[#7fb6ff]" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-cream">{file ? file.name : `Choose an audio file (up to ${MAX_SONG_MB} MB)`}</span>
        <input
          ref={input}
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
          }}
        />
      </label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Song title" aria-label="Song title" className="mt-2 h-11 w-full rounded-xl bg-surface px-3 text-[14px] text-cream ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-[#3d9bff]" />
      <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={60} placeholder="Artist" aria-label="Artist" className="mt-2 h-11 w-full rounded-xl bg-surface px-3 text-[14px] text-cream ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-[#3d9bff]" />
      <button type="button" onClick={submit} disabled={!file || !title.trim() || busy} className="mt-3 h-11 w-full rounded-full bg-[#3d9bff] text-[14px] font-bold text-white disabled:bg-cream/10 disabled:text-muted">
        {busy ? "Sending…" : "Send for review"}
      </button>

      {m.contributions.length ? (
        <>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Your songs</p>
          <ul className="mt-2 space-y-2">
            {m.contributions.map((c) => {
              const live = m.isLive(c);
              return (
                <li key={c.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-cream">{c.title}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {c.artist}
                        {c.duration ? ` · ${mmss(c.duration)}` : ""}
                      </span>
                    </span>
                    {live ? (
                      <span className="rounded-full bg-[#3ddc84]/15 px-2 py-0.5 text-[11px] font-bold text-[#3ddc84]">Live ✓</span>
                    ) : (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">In review · live in {reviewLeft(c.liveAt, m.now)}</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11.5px] font-semibold">
                    {live ? (
                      <button type="button" onClick={() => m.order(c.id)} className="text-[#7fb6ff]">
                        Order in this room
                      </button>
                    ) : (
                      <button type="button" onClick={() => m.approveNow(c.id)} className="text-cream/60 underline decoration-dotted">
                        Demo: finish review now
                      </button>
                    )}
                    <button type="button" onClick={() => m.removeContribution(c.id)} className="ml-auto text-[#ff8a8f]">
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
