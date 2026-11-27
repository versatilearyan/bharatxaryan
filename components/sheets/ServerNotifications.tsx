"use client";

/**
 * Notifications for signed-in people, in the Panchayat look:
 *  - unread messages (the same count as the Chat tab), opening Chat
 *  - who liked or commented on your Moments, and who replied to your comments, opening Moments
 * New ones (since you last opened the list) are highlighted; closing the list or "Mark all read" marks them seen.
 */
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronRight, Heart, MessageCircle, Play, Reply, UserCheck, UserPlus } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { markActivitySeen, refreshActivity, useActivity, type Activity } from "@/lib/app/activity-store";
import { useServerUnread } from "@/lib/app/chat-store";
import { useApp } from "@/lib/app/store";

function ago(at: number): string {
  const s = Math.max(1, Math.round((Date.now() - at) / 1000));
  if (s < 60) return "abhi";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d` : new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const KIND = {
  LIKE: { icon: Heart, tint: "bg-coral", line: "liked your Moment" },
  COMMENT: { icon: MessageCircle, tint: "bg-[#7b5cff]", line: "commented on your Moment" },
  REPLY: { icon: Reply, tint: "bg-[#2fbf86]", line: "replied to your comment" },
} as const;

export function ServerNotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setTab, push, setSheet, openProfile } = useApp();
  const { items, seenAt, fresh, friends } = useActivity();
  const incoming = friends?.incoming ?? [];
  const accepted = friends?.accepted ?? [];
  const openRequests = () => {
    markActivitySeen();
    setSheet({ kind: "friends", tab: "requests" });
  };
  const unreadChats = useServerUnread() ?? 0;
  useEffect(() => {
    if (open) refreshActivity(true);
  }, [open]);
  const close = () => {
    markActivitySeen();
    onClose();
  };
  const openChat = () => {
    close();
    setTab("chat");
  };
  const openMoment = (a: Activity) => {
    close();
    push(a.kind === "REPLY" ? { kind: "moments" } : { kind: "moments", personId: "me" });
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="Notifications"
      tall
      className="!bg-[radial-gradient(90%_35%_at_50%_0%,rgba(231,188,114,0.16),transparent_70%),linear-gradient(180deg,#2a1420_0%,#160d18_55%,#0f0b12_100%)]"
      headerRight={
        fresh ? (
          <button type="button" onClick={markActivitySeen} className="text-[12px] font-bold text-gold">
            Mark all read
          </button>
        ) : null
      }
    >
      <div className="px-4 pb-6">
        {/* Unread messages */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={openChat}
          className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ${unreadChats ? "bg-gradient-to-r from-[#4a1626] via-[#2c1622] to-[#1c1824] ring-gold/35" : "bg-white/[0.04] ring-white/10"}`}
        >
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f6d899] to-[#d9a84f] text-[#2a1a0c]">
            <MessageCircle className="h-5 w-5" aria-hidden />
            {unreadChats ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10.5px] font-black text-white ring-2 ring-[#2a1420]">{unreadChats > 99 ? "99+" : unreadChats}</span> : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-extrabold text-cream">{unreadChats ? `${unreadChats} unread message${unreadChats === 1 ? "" : "s"}` : "Messages"}</span>
            <span className="block text-[12px] text-cream/60">{unreadChats ? "Tap karke Chat kholo" : "Sab padh liye ✓"}</span>
          </span>
          <ChevronRight className="h-5 w-5 text-cream/40" aria-hidden />
        </motion.button>

        {/* Friend requests */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={openRequests}
          className={`mt-2.5 flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ${incoming.length ? "bg-gradient-to-r from-[#4a1626] via-[#2c1622] to-[#1c1824] ring-gold/35" : "bg-white/[0.04] ring-white/10"}`}
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center">
            {incoming.length ? (
              incoming.slice(0, 2).map((p, i) => (
                <span key={p.userId} className={`absolute h-9 w-9 overflow-hidden rounded-full ring-2 ring-[#2a1420] ${i ? "left-3.5 top-2.5" : "left-0 top-0"}`}>
                  <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#7b5cff] to-coral text-[13px] font-bold text-white">{p.name.slice(0, 1).toUpperCase()}</span>
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" onError={(e) => (e.currentTarget.style.display = "none")} className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                </span>
              ))
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-b from-[#f6d899] to-[#d9a84f] text-[#2a1a0c]">
                <UserPlus className="h-5 w-5" aria-hidden />
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-extrabold text-cream">
              {incoming.length ? `${incoming.length} friend request${incoming.length === 1 ? "" : "s"}` : "Friend requests"}
            </span>
            <span className="block truncate text-[12px] text-cream/60">{incoming.length ? (incoming.length > 1 ? `${incoming[0].name} aur ${incoming.length - 1} log aapke friend banna chahte hain` : `${incoming[0].name} aapka friend banna chahta hai`) : "Koi nayi request nahi"}</span>
          </span>
          {incoming.some((p) => p.at > seenAt) ? <span className="h-2 w-2 shrink-0 rounded-full bg-coral" aria-label="New" /> : null}
          <ChevronRight className="h-5 w-5 text-cream/40" aria-hidden />
        </motion.button>

        {accepted.length ? (
          <ul className="mt-2.5 space-y-1.5">
            {accepted.slice(0, 5).map((p) => {
              const isNew = p.at > seenAt;
              return (
                <li key={`acc-${p.userId}`}>
                  <button type="button" onClick={() => (close(), openProfile(`srv-user:${p.userId}`))} className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left ${isNew ? "bg-gold/[0.09] ring-1 ring-gold/25" : ""}`}>
                    <span className="relative h-11 w-11 shrink-0">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-coral font-bold text-white ring-2 ring-gold/30">{p.name.slice(0, 1).toUpperCase()}</span>
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatarUrl} alt="" onError={(e) => (e.currentTarget.style.display = "none")} className="absolute inset-0 h-11 w-11 rounded-full object-cover ring-2 ring-gold/30" />
                      ) : null}
                      <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#3ddc97] text-white ring-2 ring-[#1c0d14]">
                        <UserCheck className="h-3 w-3" aria-hidden />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] leading-snug text-cream">
                        <b className="font-extrabold">{p.name}</b> <span className="text-cream/75">accepted your friend request 🤝</span>
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted">{ago(p.at)}</span>
                    </span>
                    {isNew ? <span className="h-2 w-2 shrink-0 rounded-full bg-coral" aria-label="New" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {/* Moments activity */}
        <p className="mb-1 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold/80">Moments</p>
        {items === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((k) => (
              <div key={k} className="h-14 animate-pulse rounded-2xl bg-white/[0.05]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.04] px-4 py-8 text-center ring-1 ring-white/10">
            <Bell className="mx-auto h-8 w-8 text-gold/60" aria-hidden />
            <p className="mt-2 text-[13px] font-semibold text-cream/80">Abhi koi notification nahi</p>
            <p className="mt-0.5 text-[11.5px] text-muted">Jab koi aapke Moment ko like ya comment karega, yahan dikhega.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {items.map((a, i) => {
              const k = KIND[a.kind];
              const isNew = a.at > seenAt;
              return (
                <li key={`${a.kind}-${a.momentId}-${a.user.userId}-${a.at}-${i}`}>
                  <button type="button" onClick={() => openMoment(a)} className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors ${isNew ? "bg-gold/[0.09] ring-1 ring-gold/25" : "hover:bg-white/[0.03]"}`}>
                    <span className="relative shrink-0">
                      {/* the first letter sits under the photo, so a photo that fails to load still shows something */}
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-coral font-bold text-white ring-2 ring-gold/30">{a.user.name.slice(0, 1).toUpperCase()}</span>
                      {a.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.user.avatarUrl} alt="" onError={(e) => (e.currentTarget.style.display = "none")} className="absolute inset-0 h-11 w-11 rounded-full object-cover ring-2 ring-gold/30" />
                      ) : null}
                      <span className={`absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full ${k.tint} text-white ring-2 ring-[#1c0d14]`}>
                        <k.icon className={`h-3 w-3 ${a.kind === "LIKE" ? "fill-white" : ""}`} aria-hidden />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] leading-snug text-cream">
                        <b className="font-extrabold">{a.user.name}</b> <span className="text-cream/75">{k.line}</span>
                      </span>
                      {a.text ? <span className="mt-0.5 block truncate text-[12.5px] text-cream/60">“{a.text}”</span> : null}
                      <span className="mt-0.5 block text-[11px] text-muted">{ago(a.at)}</span>
                    </span>
                    {a.thumb ? (
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-gold/20">
                        {a.thumbType === "VIDEO" ? (
                          <>
                            <video src={a.thumb} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                            <Play className="absolute inset-0 m-auto h-4 w-4 fill-white text-white" aria-hidden />
                          </>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                        )}
                      </span>
                    ) : a.momentBody ? (
                      <span className="line-clamp-3 h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#2c1622] p-1 text-[8.5px] leading-tight text-cream/70 ring-1 ring-gold/20">{a.momentBody}</span>
                    ) : null}
                    {isNew ? <span className="h-2 w-2 shrink-0 rounded-full bg-coral" aria-label="New" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}
