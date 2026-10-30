"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Link2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/kit";
import { SAMPLE_VIDEOS } from "@/lib/app/data";
import { fetchVideoMeta, parseYouTubeId, thumbnailUrl } from "@/lib/app/youtube";
import { YouTubeMark } from "./YouTubePlayer";

type Check = { state: "idle" } | { state: "invalid" } | { state: "checking"; id: string } | { state: "ok"; id: string; title: string; author: string } | { state: "blocked" | "missing"; id: string };

function Thumb({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [id]);
  if (failed)
    return (
      <span className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_40%,#2a1a22,#0c0b0f_70%)]">
        <YouTubeMark className="h-8 w-12" />
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={thumbnailUrl(id)} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />;
}

export function AddVideoModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (v: { id: string; title: string }) => void }) {
  const [url, setUrl] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });

  useEffect(() => {
    if (!open) {
      setUrl("");
      setCheck({ state: "idle" });
    }
  }, [open]);

  // Validate as the user types or pastes
  useEffect(() => {
    if (!url.trim()) {
      setCheck({ state: "idle" });
      return;
    }
    const id = parseYouTubeId(url);
    if (!id) {
      setCheck({ state: "invalid" });
      return;
    }
    let live = true;
    setCheck({ state: "checking", id });
    fetchVideoMeta(id).then((meta) => {
      if (!live) return;
      if (meta === "blocked" || meta === "missing") setCheck({ state: meta, id });
      // If the lookup couldn't run (offline, blocked), still allow it: the player reports real errors.
      else setCheck({ state: "ok", id, title: meta?.title ?? SAMPLE_VIDEOS.find((v) => v.id === id)?.title ?? "YouTube video", author: meta?.author ?? "" });
    });
    return () => {
      live = false;
    };
  }, [url]);

  const ok = check.state === "ok";

  return (
    <Modal open={open} onClose={onClose} title="Add a YouTube video">
      <label className="flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-3 focus-within:border-gold/50">
        <Link2 className="h-4.5 w-4.5 text-muted" aria-hidden />
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube link"
          aria-label="YouTube link"
          inputMode="url"
          className="min-w-0 flex-1 bg-transparent text-sm text-cream placeholder:text-muted/70 focus:outline-none"
        />
      </label>
      <p className="mt-2 text-[11px] text-muted">Works with youtube.com/watch, youtu.be, Shorts and live links.</p>

      {check.state === "invalid" ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[#ffb0b4]">
          <AlertTriangle className="h-4 w-4" aria-hidden /> That doesn&apos;t look like a YouTube video link.
        </p>
      ) : null}

      {"id" in check ? (
        <div className="mt-3 overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
          <div className="relative aspect-video bg-black">
            <Thumb id={check.id} />
            {check.state === "checking" ? (
              <span className="absolute inset-0 grid place-items-center bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-cream" aria-label="Checking video" />
              </span>
            ) : null}
          </div>
          <div className="p-3">
            {check.state === "ok" ? (
              <>
                <p className="line-clamp-2 text-sm font-semibold text-cream">{check.title}</p>
                {check.author ? <p className="mt-0.5 text-[11px] text-muted">{check.author}</p> : null}
              </>
            ) : check.state === "blocked" ? (
              <p className="text-[12.5px] text-[#ffb0b4]">This video is private or its owner doesn&apos;t allow it to play in other apps.</p>
            ) : check.state === "missing" ? (
              <p className="text-[12.5px] text-[#ffb0b4]">This video couldn&apos;t be found. It may have been removed.</p>
            ) : (
              <p className="text-[12.5px] text-muted">Checking video…</p>
            )}
          </div>
        </div>
      ) : null}

      {check.state === "idle" ? (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Try a sample</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SAMPLE_VIDEOS.map((v) => (
              <button key={v.id} type="button" onClick={() => setUrl(`https://youtu.be/${v.id}`)} className="rounded-full bg-cream/[0.07] px-3 py-1.5 text-[12px] font-semibold text-cream hover:bg-cream/[0.12]">
                {v.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Button
        size="lg"
        className="mt-5 w-full"
        disabled={!ok}
        onClick={() => {
          if (check.state !== "ok") return;
          onAdd({ id: check.id, title: check.title });
          onClose();
        }}
      >
        Add to room
      </Button>
      <p className="mt-3 text-center text-[11px] leading-snug text-muted">Playback is local to your device in this preview. Syncing with others needs a live service.</p>
    </Modal>
  );
}
