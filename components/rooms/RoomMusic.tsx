"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Disc3, Heart, Music2, Pause, Play, Plus, Repeat1, Search, SkipForward, Trash2, Upload, Volume2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { musicApi } from "@/lib/api/music";
import { MAX_SONG_MB, mmss, spotifyTrackId, type Song } from "@/lib/app/music";
import { useMusic } from "@/lib/app/music-store";
import { useApp } from "@/lib/app/store";

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

function sourceLabel(song: Song) {
  if (song.source === "audius") return "Audius";
  if (song.source === "jamendo") return "Jamendo";
  if (song.source === "upload") return `Uploaded by ${song.mine ? "you" : (song.uploaderName ?? "someone")}`;
  return "Panchayat";
}

function SongRow({ song, right, active, onClick }: { song: Song; right: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <li className={`flex items-center gap-3 border-l-[3px] px-3 py-2.5 ${active ? "border-[#3d9bff] bg-[#3d9bff]/10" : "border-transparent"}`}>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left" disabled={!onClick}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5a2a8c] to-[#1a0b11] ring-1 ring-white/15">
          {active ? <Music2 className="h-4.5 w-4.5 text-[#7fb6ff]" aria-hidden /> : <Disc3 className="h-4.5 w-4.5 text-cream/70" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[14px] font-bold ${active ? "text-[#7fb6ff]" : "text-cream"}`}>{song.title}</span>
          <span className="block truncate text-[11px] text-muted">
            {song.artist}
            {song.duration ? ` · ${mmss(song.duration)}` : ""} · {sourceLabel(song)}
          </span>
        </span>
      </button>
      {right}
    </li>
  );
}

const OrderButton = ({ song, onOrder }: { song: Song; onOrder: () => void }) => (
  <button type="button" onClick={onOrder} aria-label={`Order ${song.title}`} className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#3d9bff] px-3 text-[12px] font-bold text-white">
    <Plus className="h-3.5 w-3.5" aria-hidden /> Order
  </button>
);

/** Songs ordered in the room, the library to order from, and uploading your own. */
export function MusicSheet({ open, onClose, canControl = true }: { open: boolean; onClose: () => void; canControl?: boolean }) {
  const m = useMusic();
  const [tabPicked, setTab] = useState<"ordered" | "library" | "contribute">("ordered");
  // Only the room owner and admins can order and play songs; everyone else just sees what is ordered
  const tab = canControl ? tabPicked : "ordered";
  useEffect(() => {
    if (open) void m.refreshSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <BottomSheet open={open} onClose={onClose} title={`🎵 ${m.queue.length} ${m.queue.length === 1 ? "song" : "songs"} ordered`} tall className="h-[84%]">
      <div className="flex h-full min-h-0 flex-col">
        {canControl ? null : <p className="mx-4 mb-1 rounded-xl bg-gold/10 px-3 py-2 text-center text-[12px] font-semibold text-gold">Only the room owner and admins can play songs here.</p>}
        {canControl ? (
        <div className="mx-4 flex rounded-full bg-surface p-1 ring-1 ring-line" role="tablist">
          {(
            [
              ["ordered", "Ordered"],
              ["library", "Library"],
              ["contribute", "Upload"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-9 flex-1 rounded-full text-[13px] font-bold ${tab === id ? "bg-[#3d9bff] text-white" : "text-cream/65"}`}>
              {label}
            </button>
          ))}
        </div>
        ) : null}

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
                      onClick={canControl ? () => m.playAt(i) : undefined}
                      right={
                        <span className="flex shrink-0 items-center gap-1">
                          <button type="button" onClick={() => m.toggleFavourite(id)} aria-label={m.favourites.includes(id) ? "Unfavourite" : "Favourite"} className="grid h-8 w-8 place-items-center rounded-full text-cream/60">
                            <Heart className={`h-4 w-4 ${m.favourites.includes(id) ? "fill-pink text-pink" : ""}`} />
                          </button>
                          {canControl ? (
                            <button type="button" onClick={() => m.removeFromQueue(i)} aria-label={`Remove ${s.title}`} className="grid h-8 w-8 place-items-center rounded-full text-cream/60">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </span>
                      }
                    />
                  );
                })}
              </ul>
            ) : (
              <div className="px-6 pt-10 text-center">
                <Disc3 className="mx-auto h-10 w-10 text-cream/30" aria-hidden />
                <p className="mt-2 text-[13px] text-muted">{canControl ? "No songs yet. Order one from the Library." : "No songs are playing."}</p>
                {canControl ? (
                  <button type="button" onClick={() => setTab("library")} className="mt-3 h-9 rounded-full bg-[#3d9bff] px-5 text-[13px] font-bold text-white">
                    Order a song
                  </button>
                ) : null}
              </div>
            )
          ) : tab === "library" ? (
            <Library />
          ) : (
            <UploadTab />
          )}
        </div>

        {m.onlyHere && m.current?.id === m.onlyHere ? <p className="mx-4 mb-1 rounded-xl bg-gold/10 px-3 py-1.5 text-center text-[11.5px] text-gold">This song plays only for you: its website doesn&apos;t let us send it to the room.</p> : null}
        {canControl ? <Player /> : <p className="shrink-0 border-t border-line bg-ink-2 px-4 py-3 text-center text-[12px] font-semibold text-cream/80">{m.current ? `Now playing: ${m.current.title} · ${m.current.artist}` : "Nothing playing"}</p>}
      </div>
    </BottomSheet>
  );
}

/** The library: our songs and uploads, songs from Audius (and Jamendo when it is on), and a Spotify link. */
function Library() {
  const m = useMusic();
  const [source, setSource] = useState<"ours" | "audius" | "jamendo" | "spotify">("ours");
  const [jamendo, setJamendo] = useState(false);
  useEffect(() => {
    musicApi.sources().then((s) => setJamendo(s.jamendo)).catch(() => undefined);
  }, []);
  const chips: [typeof source, string][] = [["ours", "Panchayat"], ["audius", "Audius"], ...(jamendo ? ([["jamendo", "Jamendo"]] as [typeof source, string][]) : []), ["spotify", "Spotify"]];
  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Where to find songs">
        {chips.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={source === id} onClick={() => setSource(id)} className={`h-8 shrink-0 rounded-full px-3.5 text-[12.5px] font-bold ring-1 ${source === id ? "bg-[#3d9bff]/20 text-[#7fb6ff] ring-[#3d9bff]/60" : "text-cream/65 ring-white/15"}`}>
            {label}
          </button>
        ))}
      </div>
      {source === "ours" ? (
        <ul>
          {m.library.map((s) => (
            <SongRow key={s.id} song={s} right={<OrderButton song={s} onOrder={() => m.order(s.id)} />} />
          ))}
        </ul>
      ) : source === "spotify" ? (
        <SpotifyBox />
      ) : (
        <Catalogue key={source} source={source} />
      )}
    </div>
  );
}

/** Search a free music catalogue (Audius / Jamendo) and order a result. */
function Catalogue({ source }: { source: "audius" | "jamendo" }) {
  const m = useMusic();
  const { toast } = useApp();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Song[] | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (q.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      setRows((await musicApi.search(source, q.trim())).results);
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't search right now", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <form
        className="mx-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void go();
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} placeholder={`Search ${source === "audius" ? "Audius" : "Jamendo"}`} aria-label="Search songs" className="h-10 min-w-0 flex-1 rounded-xl bg-surface px-3 text-[14px] text-cream ring-1 ring-line placeholder:text-muted focus:outline-none" />
        <button type="submit" disabled={busy || q.trim().length < 2} className="grid h-10 w-10 place-items-center rounded-xl bg-[#3d9bff] text-white disabled:bg-cream/10 disabled:text-muted" aria-label="Search">
          <Search className="h-4.5 w-4.5" aria-hidden />
        </button>
      </form>
      <p className="mx-4 mt-1.5 text-[11px] text-muted">{source === "audius" ? "Free songs by artists on Audius." : "Free music from Jamendo."} The song plays from your phone and goes into the room for everyone.</p>
      {rows === null ? null : rows.length === 0 ? (
        <p className="px-6 pt-8 text-center text-[13px] text-muted">{busy ? "Searching…" : "No songs found. Try another word."}</p>
      ) : (
        <ul className="mt-1">
          {rows.map((s) => (
            <SongRow key={s.id} song={s} right={<OrderButton song={s} onOrder={() => m.order(s)} />} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Spotify: paste a track link to listen on your own phone. Spotify does not let any app send its songs into a room. */
function SpotifyBox() {
  const [link, setLink] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [bad, setBad] = useState(false);
  const show = () => {
    const t = spotifyTrackId(link);
    setId(t);
    setBad(!t);
  };
  return (
    <div className="px-4">
      <p className="text-[12.5px] text-muted">Paste a Spotify song link. It plays here for you (full song if you are logged in to Spotify, a short preview if not).</p>
      <div className="mt-2 flex gap-2">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://open.spotify.com/track/..." aria-label="Spotify link" className="h-10 min-w-0 flex-1 rounded-xl bg-surface px-3 text-[13px] text-cream ring-1 ring-line placeholder:text-muted focus:outline-none" />
        <button type="button" onClick={show} disabled={!link.trim()} className="h-10 rounded-xl bg-[#3d9bff] px-4 text-[13px] font-bold text-white disabled:bg-cream/10 disabled:text-muted">
          Show
        </button>
      </div>
      {bad ? <p className="mt-2 text-[12px] text-[#ff8a8f]">That doesn&apos;t look like a Spotify song link.</p> : null}
      {id ? (
        <iframe
          title="Spotify player"
          className="mt-3 w-full rounded-2xl"
          style={{ border: 0, height: 152 }}
          src={`https://open.spotify.com/embed/track/${id}?utm_source=generator`}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      ) : null}
      <p className="mt-3 rounded-xl bg-white/[0.05] px-3 py-2 text-[11.5px] leading-snug text-cream/70">Spotify&apos;s rules say its songs can only play inside Spotify, on the listener&apos;s own account. So the room can&apos;t hear this one. To play music for the whole room, use Panchayat songs, Audius, or upload your own.</p>
    </div>
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

function UploadTab() {
  const m = useMusic();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const submit = async () => {
    if (!file || !title.trim() || !rights) return;
    setBusy(true);
    const ok = await m.upload(file, title, artist);
    setBusy(false);
    if (ok) {
      setFile(null);
      setTitle("");
      setArtist("");
      setRights(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className="px-4 pb-4">
      <p className="text-[12.5px] text-muted">Upload your song (MP3). It goes live for everyone right away. Only upload music you made or have the rights to; songs that break this are removed.</p>
      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#3d9bff]/60 bg-[#3d9bff]/5 px-3 py-3">
        <Upload className="h-5 w-5 shrink-0 text-[#7fb6ff]" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-cream">{file ? file.name : `Choose an MP3 (up to ${MAX_SONG_MB} MB)`}</span>
        <input
          ref={input}
          type="file"
          accept=".mp3,audio/mpeg"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
          }}
        />
      </label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Song title" aria-label="Song title" className="mt-2 h-11 w-full rounded-xl bg-surface px-3 text-[14px] text-cream ring-1 ring-line placeholder:text-muted focus:outline-none" />
      <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={60} placeholder="Artist" aria-label="Artist" className="mt-2 h-11 w-full rounded-xl bg-surface px-3 text-[14px] text-cream ring-1 ring-line placeholder:text-muted focus:outline-none" />
      <label className="mt-3 flex items-start gap-2 text-[12px] text-cream/75">
        <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5" />
        <span>I made this song or I have the right to share it.</span>
      </label>
      <button type="button" onClick={submit} disabled={!file || !title.trim() || !rights || busy} className="mt-3 h-11 w-full rounded-full bg-[#3d9bff] text-[14px] font-bold text-white disabled:bg-cream/10 disabled:text-muted">
        {busy ? "Uploading…" : "Upload song"}
      </button>

      {m.mine.length ? (
        <>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Your songs</p>
          <ul className="mt-2 space-y-2">
            {m.mine.map((c) => (
              <li key={c.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-cream">{c.title}</span>
                    <span className="block truncate text-[11px] text-muted">
                      {c.artist}
                      {c.duration ? ` · ${mmss(c.duration)}` : ""}
                    </span>
                  </span>
                  <span className="rounded-full bg-[#3ddc84]/15 px-2 py-0.5 text-[11px] font-bold text-[#3ddc84]">Live ✓</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11.5px] font-semibold">
                  <button type="button" onClick={() => m.order(c.id)} className="text-[#7fb6ff]">
                    Order in this room
                  </button>
                  <button type="button" onClick={() => window.confirm(`Remove "${c.title}" for everyone?`) && void m.removeSong(c.id)} className="ml-auto text-[#ff8a8f]">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
