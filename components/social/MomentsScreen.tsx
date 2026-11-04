"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Globe2, Heart, ImagePlus, Lock, MessageCircle, MoreHorizontal, Play, Send, Trash2, Users, Video, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { momentsApi, type Moment, type MomentComment } from "@/lib/api/social";
import { Toran } from "@/components/ui/Toran";
import { useApp } from "@/lib/app/store";
import { MomentAuthor } from "./MomentAuthor";
import { myUserIdFromToken } from "@/lib/auth/token";

const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

function Avatar({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="shrink-0 rounded-full object-cover ring-1 ring-white/10" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-[#ff7fa8] font-display font-extrabold text-white" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

type Scope = "all" | "friends";

/**
 * Moments: a feed of posts with text, photos (up to 9) or a video, with
 * likes and comments. personId: only that person's Moments.
 */
export function MomentsScreen({ personId }: { personId?: string }) {
  const { pop, session, toast, openProfile } = useApp();
  const uid = personId === "me" ? (myUserIdFromToken() ?? undefined) : personId?.startsWith("srv-user:") ? personId.slice(9) : undefined;
  const mineOnly = personId === "me";
  const [scope, setScope] = useState<Scope>("all");
  const [items, setItems] = useState<Moment[]>([]);
  const [next, setNext] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);
  const [commentsFor, setCommentsFor] = useState<Moment | null>(null);
  const [viewer, setViewer] = useState<{ list: Moment["media"]; i: number } | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (more: boolean) => {
      if (!session) return;
      setLoading(true);
      setError("");
      try {
        const r = await momentsApi.feed(uid ? "user" : scope, { userId: uid, before: more ? next : undefined });
        setItems((cur) => (more ? [...cur, ...r.items.filter((m) => !cur.some((c) => c.id === m.id))] : r.items));
        setNext(r.next);
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "Couldn't load Moments.");
      } finally {
        setLoading(false);
      }
    },
    [session, uid, scope, next],
  );
  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, uid, session]);

  // Endless scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && !loading && void load(true), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [next, loading, load]);

  const patch = (id: string, p: Partial<Moment>) => setItems((list) => list.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const like = (m: Moment) => {
    const on = !m.liked;
    patch(m.id, { liked: on, likeCount: Math.max(0, m.likeCount + (on ? 1 : -1)) });
    if (on) navigator.vibrate?.(15);
    momentsApi
      .like(m.id, on)
      .then((r) => patch(m.id, { liked: r.liked, likeCount: r.likeCount }))
      .catch(() => patch(m.id, { liked: m.liked, likeCount: m.likeCount }));
  };
  const remove = (m: Moment) => {
    setItems((list) => list.filter((x) => x.id !== m.id));
    momentsApi
      .remove(m.id)
      .then(() => toast("Moment deleted"))
      .catch((e) => {
        toast(e instanceof Error && e.message ? e.message : "Couldn't delete it.", "error");
        void load(false);
      });
  };

  return (
    <div className="relative flex h-full flex-col bg-[radial-gradient(130%_55%_at_50%_0%,#4a1626_0%,#2a1430_42%,#141018_100%)]">
      <Toran />
      <header className="relative flex items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button type="button" onClick={pop} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-cream">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 bg-gradient-to-r from-[#fff1c9] via-gold to-[#ffb37a] bg-clip-text font-display text-[22px] font-extrabold text-transparent">Moments</h1>
        {!uid ? (
          <div className="flex rounded-full bg-black/35 p-1 ring-1 ring-gold/20">
            {(["all", "friends"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setScope(s)} className={`relative rounded-full px-3 py-1 text-[12px] font-bold ${scope === s ? "text-ink" : "text-cream/70"}`}>
                {scope === s ? <motion.span layoutId="moment-scope" className="absolute inset-0 rounded-full bg-gold" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
                <span className="relative">{s === "all" ? "For you" : "Friends"}</span>
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="app-scroll min-h-0 flex-1 pb-28">
        {!session ? <p className="px-6 py-16 text-center text-[13px] text-muted">Sign in to see and post Moments.</p> : null}
        {error ? (
          <button type="button" onClick={() => void load(false)} className="mx-4 mt-3 block w-[calc(100%-2rem)] rounded-2xl bg-coral/10 p-3 text-center text-[13px] text-coral">
            {error} Tap to retry.
          </button>
        ) : null}
        {session && !loading && !error && items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[40px]">📸</p>
            <p className="mt-2 font-display text-[16px] font-bold text-cream">No Moments yet</p>
            <p className="mt-1 text-[12.5px] text-muted">{uid ? "Nothing posted yet." : scope === "friends" ? "Follow people to see their Moments here." : "Be the first to share one."}</p>
          </div>
        ) : null}
        <ul className="space-y-3 px-3 pt-1">
          {items.map((m) => (
            <motion.li key={m.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#2c1622]/95 to-[#1b1622]/95 p-3.5 shadow-[0_14px_34px_-18px_rgba(0,0,0,0.95)] ring-1 ring-gold/15 before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-gold/60 before:to-transparent">
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => openProfile(`srv-user:${m.author.userId}`)} className="flex min-w-0 flex-1 items-center text-left">
                  <MomentAuthor
                    a={m.author}
                    sub={
                      <span className="flex items-center gap-1 text-[11px] text-muted">
                        {ago(m.at)} · {m.visibility === "FRIENDS" ? <Users className="h-3 w-3" aria-label="Friends only" /> : <Globe2 className="h-3 w-3" aria-label="Public" />}
                      </span>
                    }
                  />
                </button>
                {m.mine ? <MomentMenu onDelete={() => remove(m)} /> : null}
              </div>
              {m.body ? <p className="mt-2.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-cream/90">{m.body}</p> : null}
              {m.media.length ? <MediaGrid media={m.media} onOpen={(i) => setViewer({ list: m.media, i })} /> : null}
              <div className="mt-3 flex items-center gap-1 border-t border-gold/10 pt-2">
                <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={() => like(m)} aria-pressed={m.liked} className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${m.liked ? "text-[#ff5c7a]" : "text-cream/70"}`}>
                  <motion.span key={String(m.liked)} initial={{ scale: m.liked ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 14 }}>
                    <Heart className="h-[18px] w-[18px]" fill={m.liked ? "currentColor" : "none"} />
                  </motion.span>
                  {m.likeCount || ""}
                </motion.button>
                <button type="button" onClick={() => setCommentsFor(m)} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-cream/70">
                  <MessageCircle className="h-[18px] w-[18px]" /> {m.commentCount || ""}
                </button>
              </div>
              <CommentPreview m={m} onOpen={() => setCommentsFor(m)} />
            </motion.li>
          ))}
        </ul>
        {loading ? (
          <div className="space-y-3 px-3 pt-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-3xl bg-surface" />
            ))}
          </div>
        ) : null}
        <div ref={sentinel} className="h-4" />
      </div>

      {session && (!uid || mineOnly) ? (
        <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={() => setComposing(true)} className="absolute bottom-[calc(env(safe-area-inset-bottom)+20px)] right-5 flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-coral to-gold px-5 font-bold text-white shadow-[0_10px_30px_-8px_rgba(255,120,90,0.7)]">
          <ImagePlus className="h-5 w-5" /> Post
        </motion.button>
      ) : null}

      <Composer
        open={composing}
        onClose={() => setComposing(false)}
        onPosted={(m) => {
          setItems((list) => [m, ...list]);
          setComposing(false);
          toast("Moment posted ✨", "gold");
        }}
      />
      <CommentsSheet moment={commentsFor} onClose={() => setCommentsFor(null)} onCount={(id, n) => patch(id, { commentCount: n })} />
      <AnimatePresence>{viewer ? <MediaViewer list={viewer.list} start={viewer.i} onClose={() => setViewer(null)} /> : null}</AnimatePresence>
    </div>
  );
}

function MomentMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  return (
    <span className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="More" className="grid h-9 w-9 place-items-center rounded-full text-cream/60">
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open ? (
        <span className="absolute right-0 top-10 z-10 w-40 overflow-hidden rounded-2xl bg-ink-2 shadow-xl ring-1 ring-line">
          <button
            type="button"
            onClick={() => {
              if (!sure) return setSure(true);
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-bold text-[#ff8a8f]"
          >
            <Trash2 className="h-4 w-4" /> {sure ? "Tap again to delete" : "Delete"}
          </button>
        </span>
      ) : null}
    </span>
  );
}

function MediaGrid({ media, onOpen }: { media: Moment["media"]; onOpen: (i: number) => void }) {
  if (media[0]?.type === "VIDEO")
    return (
      <div className="mt-2.5 overflow-hidden rounded-2xl bg-black">
        <video src={media[0].url} controls playsInline preload="metadata" className="max-h-[420px] w-full" />
      </div>
    );
  const n = media.length;
  const cols = n === 1 ? "grid-cols-1" : n === 2 || n === 4 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={`mt-2.5 grid gap-1 overflow-hidden rounded-2xl ${cols}`}>
      {media.map((m, i) => (
        <button key={m.url} type="button" onClick={() => onOpen(i)} className={`relative overflow-hidden bg-black/30 ${n === 1 ? "max-h-[420px]" : "aspect-square"}`} aria-label={`Open photo ${i + 1}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt="" loading="lazy" className={`h-full w-full object-cover ${n === 1 ? "max-h-[420px]" : ""}`} />
        </button>
      ))}
    </div>
  );
}

function MediaViewer({ list, start, onClose }: { list: Moment["media"]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const m = list[i];
  return (
    <motion.div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Photos">
      <motion.div className="flex h-full w-full items-center justify-center" drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, info) => (info.offset.x < -60 ? setI((x) => Math.min(list.length - 1, x + 1)) : info.offset.x > 60 ? setI((x) => Math.max(0, x - 1)) : null)}>
        {m?.type === "VIDEO" ? (
          <video src={m.url} controls autoPlay playsInline className="max-h-full max-w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img key={m?.url} src={m?.url} alt="" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-h-full max-w-full object-contain" draggable={false} />
        )}
      </motion.div>
      {list.length > 1 ? (
        <span className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] left-1/2 flex -translate-x-1/2 gap-1.5">
          {list.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />
          ))}
        </span>
      ) : null}
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-[calc(env(safe-area-inset-top)+14px)] grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white">
        <X className="h-5 w-5" />
      </button>
    </motion.div>
  );
}

const MAX_PHOTOS = 9;

function Composer({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: (m: Moment) => void }) {
  const { toast } = useApp();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"PUBLIC" | "FRIENDS">("PUBLIC");
  const [progress, setProgress] = useState<number | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const isVideo = files[0]?.type.startsWith("video/");

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  useEffect(() => {
    if (open) return;
    setText("");
    setFiles([]);
    setProgress(null);
  }, [open]);

  const addPhotos = (list: FileList | null) => {
    if (!list) return;
    const ok = [...list].filter((f) => /^image\/(jpe?g|png)$/i.test(f.type));
    if (ok.length < list.length) toast("Only JPG and PNG photos", "error");
    const big = ok.find((f) => f.size > 10 * 1024 * 1024);
    if (big) return toast("Photos can be up to 10 MB each", "error");
    setFiles((cur) => (cur[0]?.type.startsWith("video/") ? ok : [...cur, ...ok]).slice(0, MAX_PHOTOS));
  };
  const addVideo = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (!/^video\/mp4$/i.test(f.type) && !/\.mp4$/i.test(f.name)) return toast("Videos must be MP4", "error");
    if (f.size > 60 * 1024 * 1024) return toast("Videos can be up to 60 MB", "error");
    setFiles([f]);
  };
  const post = () => {
    if (!text.trim() && !files.length) return;
    setProgress(0);
    momentsApi
      .post(text, files, visibility, (p) => setProgress(p))
      .then(onPosted)
      .catch((e) => {
        setProgress(null);
        toast(e instanceof Error && e.message ? e.message : "Couldn't post. Try again.", "error");
      });
  };
  const busy = progress !== null;

  return (
    <BottomSheet open={open} onClose={() => !busy && onClose()} title="New Moment" tall>
      <div className="flex flex-col gap-3 px-5 pb-6">
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} placeholder="What's happening?" rows={4} className="w-full resize-none rounded-2xl bg-white/[0.05] p-3.5 text-[15px] text-cream outline-none ring-1 ring-white/10 placeholder:text-muted focus:ring-gold/50" />
        <p className="-mt-2 text-right text-[11px] text-muted">{text.length}/1000</p>
        {files.length ? (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((u, i) => (
              <div key={u} className="relative aspect-square overflow-hidden rounded-xl bg-black/40">
                {isVideo ? (
                  <>
                    <video src={u} muted playsInline className="h-full w-full object-cover" />
                    <Play className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow" />
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u} alt="" className="h-full w-full object-cover" />
                )}
                {!busy ? (
                  <button type="button" onClick={() => setFiles((cur) => cur.filter((_, k) => k !== i))} aria-label="Remove" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <input ref={photoRef} type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={(e) => (addPhotos(e.target.files), (e.target.value = ""))} />
          <input ref={videoRef} type="file" accept="video/mp4" className="hidden" onChange={(e) => (addVideo(e.target.files), (e.target.value = ""))} />
          <button type="button" disabled={busy || (!isVideo && files.length >= MAX_PHOTOS)} onClick={() => photoRef.current?.click()} className="flex h-10 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] font-bold text-cream ring-1 ring-line disabled:opacity-50">
            <ImagePlus className="h-4 w-4" /> Photos
          </button>
          <button type="button" disabled={busy} onClick={() => videoRef.current?.click()} className="flex h-10 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] font-bold text-cream ring-1 ring-line disabled:opacity-50">
            <Video className="h-4 w-4" /> Video
          </button>
          <span className="flex-1" />
          <button type="button" disabled={busy} onClick={() => setVisibility((v) => (v === "PUBLIC" ? "FRIENDS" : "PUBLIC"))} className="flex h-10 items-center gap-1.5 rounded-full bg-surface px-3 text-[12px] font-bold text-cream/80 ring-1 ring-line">
            {visibility === "PUBLIC" ? <Globe2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {visibility === "PUBLIC" ? "Everyone" : "Friends"}
          </button>
        </div>
        <button type="button" disabled={busy || (!text.trim() && !files.length)} onClick={post} className="relative h-12 overflow-hidden rounded-full bg-gradient-to-r from-coral to-gold text-[15px] font-extrabold text-white disabled:opacity-50">
          {busy ? <span className="absolute inset-y-0 left-0 bg-white/25 transition-[width]" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} /> : null}
          <span className="relative">{busy ? (progress !== null && progress >= 1 ? "Finishing…" : `Uploading ${Math.round((progress ?? 0) * 100)}%`) : "Post"}</span>
        </button>
      </div>
    </BottomSheet>
  );
}

function CommentsSheet({ moment, onClose, onCount }: { moment: Moment | null; onClose: () => void; onCount: (id: string, n: number) => void }) {
  const { toast, openProfile } = useApp();
  const [list, setList] = useState<MomentComment[] | null>(null);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<MomentComment | null>(null);
  const [busy, setBusy] = useState(false);
  const id = moment?.id;
  useEffect(() => {
    if (!id) return;
    setList(null);
    setReply(null);
    momentsApi
      .comments(id)
      .then(setList)
      .catch(() => setList([]));
  }, [id]);
  const send = () => {
    if (!id || !text.trim()) return;
    setBusy(true);
    momentsApi
      .comment(id, text.trim(), reply?.id)
      .then((c) => {
        setList((l) => {
          const next = [...(l ?? []), c];
          onCount(id, next.length);
          return next;
        });
        setText("");
        setReply(null);
      })
      .catch((e) => toast(e instanceof Error && e.message ? e.message : "Couldn't comment.", "error"))
      .finally(() => setBusy(false));
  };
  const del = (c: MomentComment) => {
    if (!id) return;
    setList((l) => {
      const next = (l ?? []).filter((x) => x.id !== c.id);
      onCount(id, next.length);
      return next;
    });
    momentsApi.removeComment(id, c.id).catch(() => toast("Couldn't delete the comment.", "error"));
  };
  return (
    <BottomSheet open={!!moment} onClose={onClose} title={`Comments${list ? ` · ${list.length}` : ""}`} tall>
      <div className="flex h-full flex-col">
        <ul className="flex-1 space-y-3 px-5 pb-3">
          {list === null ? <li className="py-6 text-center text-[13px] text-muted">Loading…</li> : null}
          {list && list.length === 0 ? <li className="py-6 text-center text-[13px] text-muted">No comments yet. Say something nice!</li> : null}
          {(list ?? []).map((c) => (
            <li key={c.id} className="flex gap-2.5 rounded-2xl bg-gradient-to-r from-[#2c1622]/80 to-transparent p-2 ring-1 ring-gold/10">
              <button type="button" onClick={() => openProfile(`srv-user:${c.userId}`)}>
                <Avatar src={c.avatarUrl} name={c.name} size={32} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-cream/90">
                  <b className="text-gold">{c.name}</b> {c.replyToName ? <span className="text-gold">@{c.replyToName} </span> : null}
                  {c.body}
                </p>
                <p className="mt-0.5 flex gap-3 text-[11px] text-muted">
                  {ago(c.at)}
                  <button type="button" onClick={() => setReply(c)} className="font-bold text-cream/70 hover:text-gold">
                    Reply
                  </button>
                  {moment?.mine || c.userId === myUserIdFromToken() ? (
                    <button type="button" onClick={() => del(c)} className="font-bold opacity-70">
                      Delete
                    </button>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="pb-safe sticky bottom-0 border-t border-gold/15 bg-gradient-to-t from-[#1b1020] to-[#24131f] px-4 py-2.5"
        >
          {reply ? (
            <p className="mb-1.5 flex items-center gap-2 text-[11.5px] text-muted">
              Replying to <b className="text-cream">{reply.name}</b>
              <button type="button" onClick={() => setReply(null)} aria-label="Cancel reply">
                <X className="h-3.5 w-3.5" />
              </button>
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <input value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} placeholder="Add a comment…" className="h-10 min-w-0 flex-1 rounded-full bg-black/30 px-4 text-[14px] text-cream outline-none ring-1 ring-gold/20 placeholder:text-cream/40 focus:ring-gold/60" />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-coral to-gold text-white disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </BottomSheet>
  );
}

/** The newest comments under a post, with a box to add one (opens the full comments). */
function CommentPreview({ m, onOpen }: { m: Moment; onOpen: () => void }) {
  const [list, setList] = useState<MomentComment[] | null>(null);
  useEffect(() => {
    if (!m.commentCount) {
      setList([]);
      return;
    }
    let live = true;
    momentsApi
      .comments(m.id)
      .then((c) => live && setList(c))
      .catch(() => live && setList([]));
    return () => {
      live = false;
    };
  }, [m.id, m.commentCount]);
  const last = (list ?? []).slice(-2);
  return (
    <div className="mt-1 space-y-1.5">
      {last.map((c) => (
        <button key={c.id} type="button" onClick={onOpen} className="flex w-full items-start gap-2 text-left">
          {c.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.avatarUrl} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cream/10 text-[11px] font-bold text-cream">{c.name.slice(0, 1)}</span>
          )}
          <span className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-[#3a1d2c]/70 px-3 py-1.5 text-[13px] leading-snug ring-1 ring-gold/10">
            <b className="mr-1.5 text-gold">{c.name}</b>
            {c.replyToName ? <span className="mr-1 text-gold">@{c.replyToName}</span> : null}
            <span className="break-words text-cream/80">{c.body}</span>
          </span>
        </button>
      ))}
      {list && m.commentCount > last.length ? (
        <button type="button" onClick={onOpen} className="pl-8 text-[12px] font-semibold text-muted hover:text-cream">
          View all {m.commentCount} comments
        </button>
      ) : null}
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 rounded-full bg-black/25 px-3 py-2 text-left text-[12.5px] text-cream/55 ring-1 ring-gold/15">
        <MessageCircle className="h-4 w-4 text-gold/80" /> Add a comment…
      </button>
    </div>
  );
}
