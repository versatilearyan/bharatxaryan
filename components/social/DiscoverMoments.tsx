"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Heart, MessageCircle, Play } from "lucide-react";
import { momentsApi, type Moment } from "@/lib/api/social";
import { useApp } from "@/lib/app/store";
import { MomentAuthor } from "./MomentAuthor";

const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

/**
 * Moments in Discover: the newest posts from everyone, as cards you swipe
 * through. Each author shows what they wear (frame, shining badge, VIP name).
 */
export function DiscoverMoments() {
  const { push, session } = useApp();
  const [items, setItems] = useState<Moment[] | null>(null);
  useEffect(() => {
    if (!session) return;
    let off = false;
    momentsApi
      .feed("all", { limit: 12 })
      .then((r) => !off && setItems(r.items))
      .catch(() => !off && setItems([]));
    return () => {
      off = true;
    };
  }, [session]);
  if (!session) return null;
  const open = () => push({ kind: "moments" });

  return (
    <section className="mt-6" aria-labelledby="discover-moments">
      <div className="flex items-center justify-between px-4">
        <h2 id="discover-moments" className="font-display text-[20px] font-extrabold text-cream">
          Moments <span aria-hidden>📸</span>
        </h2>
        <button type="button" onClick={open} className="flex items-center gap-0.5 text-[12px] font-bold uppercase tracking-[0.12em] text-cream/60">
          See all <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {items === null
          ? [0, 1, 2].map((i) => <div key={i} className="h-[300px] w-[240px] shrink-0 animate-pulse rounded-3xl bg-surface" />)
          : null}
        {items && items.length === 0 ? (
          <button type="button" onClick={open} className="flex h-[150px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 text-center">
            <span className="text-[28px]" aria-hidden>
              ✨
            </span>
            <span className="mt-1 text-[13.5px] font-bold text-cream">Be the first to post a Moment</span>
            <span className="text-[12px] text-muted">Photos, a video or just a thought</span>
          </button>
        ) : null}
        {(items ?? []).map((m, i) => {
          const media = m.media[0];
          return (
            <motion.button
              key={m.id}
              type="button"
              onClick={open}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 6) * 0.05 }}
              whileTap={{ scale: 0.97 }}
              className="relative flex h-[300px] w-[240px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-[#2a2238] to-[#15121c] text-left shadow-[0_14px_34px_-18px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.08]"
            >
              {/* Picture or video first frame, or the text on a soft gradient */}
              <div className="relative h-[178px] w-full overflow-hidden">
                {media ? (
                  media.type === "VIDEO" ? (
                    <>
                      <video src={media.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 grid place-items-center">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
                          <Play className="h-5 w-5" fill="currentColor" />
                        </span>
                      </span>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full w-full items-center bg-gradient-to-br from-[#7b5cff]/50 via-[#ff7fa8]/30 to-[#ffb347]/30 p-4">
                    <p className="line-clamp-5 font-display text-[17px] font-bold leading-snug text-white drop-shadow">{m.body}</p>
                  </div>
                )}
                {m.media.length > 1 ? <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10.5px] font-bold text-white">+{m.media.length - 1}</span> : null}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#1d1828] to-transparent" />
              </div>
              <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
                <MomentAuthor a={m.author} size={34} />
                {media && m.body ? <p className="mt-1.5 line-clamp-2 text-[12.5px] text-cream/80">{m.body}</p> : null}
                <span className="mt-auto flex items-center gap-3 pt-1 text-[11.5px] font-semibold text-cream/55">
                  <span className="flex items-center gap-1">
                    <Heart className={`h-3.5 w-3.5 ${m.liked ? "text-[#ff5c7a]" : ""}`} fill={m.liked ? "currentColor" : "none"} /> {m.likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" /> {m.commentCount}
                  </span>
                  <span className="ml-auto">{ago(m.at)}</span>
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
