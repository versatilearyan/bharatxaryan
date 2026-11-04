"use client";

/**
 * Sarpanch, the official Panchayat account:
 *  - SystemBubble: its messages in chat (title, picture, action button), read-only
 *  - SarpanchAnnouncement: the newest announcement to everyone, on Discover
 *  - SarpanchScreen: its profile (OFFICIAL, ID, followers, notice board, stay safe)
 * The server writes every Sarpanch message; the app only shows them.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Bell, ChevronRight, Loader2, MessageCircle, Megaphone, ShieldCheck, UserPlus, UserCheck } from "lucide-react";
import { api } from "@/lib/api/client";
import { friendsApi } from "@/lib/api/social";
import type { ChatMessage } from "@/lib/api/chat";
import { SERVER_USER_PREFIX } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { ScreenHeader } from "@/components/ui/kit";

export type Notice = { id: string; title?: string; body?: string; imageUrl?: string; actionLabel?: string; actionUrl?: string; category?: string; at?: string };
export type SarpanchProfile = {
  userId: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  publicId?: string;
  followers: number;
  youFollow: boolean;
  conversationId?: string;
  notices: Notice[];
};

type Obj = Record<string, unknown>;
const o = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const s = (v: unknown) => (typeof v === "string" && v.trim() ? v : typeof v === "number" ? String(v) : undefined);
const readNotice = (v: unknown): Notice => {
  const d = o(v);
  return { id: s(d.id) ?? "", title: s(d.title), body: s(d.body), imageUrl: s(d.imageUrl), actionLabel: s(d.actionLabel), actionUrl: s(d.actionUrl), category: s(d.category), at: s(d.at) };
};

export const sarpanchApi = {
  async profile(): Promise<SarpanchProfile> {
    const d = o(await api<unknown>("/api/v1/sarpanch/profile", { auth: true }));
    return {
      userId: s(d.userId) ?? "",
      name: s(d.name) ?? "Sarpanch",
      avatarUrl: s(d.avatarUrl),
      bio: s(d.bio),
      publicId: s(d.publicId),
      followers: typeof d.followers === "number" ? d.followers : 0,
      youFollow: d.youFollow === true,
      conversationId: s(d.conversationId),
      notices: Array.isArray(d.notices) ? d.notices.map(readNotice) : [],
    };
  },
  async latest(): Promise<Notice | null> {
    const d = await api<unknown>("/api/v1/sarpanch/announcements/latest", { auth: true });
    return d && typeof d === "object" ? readNotice(d) : null;
  },
};

const ago = (iso?: string) => {
  const at = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(at)) return "";
  const m = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (m < 60) return m < 1 ? "now" : `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
};

/** Opens a Sarpanch action link (/wallet, /bag, /vip, /cp, /rooms, /shop, or a web link). */
export function useOpenAction() {
  const { push, setSheet, setTab } = useApp();
  return (url?: string) => {
    if (!url) return;
    if (/^https:\/\//i.test(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    const path = url.split("?")[0].toLowerCase();
    if (path.startsWith("/wallet") || path.startsWith("/coins")) setSheet({ kind: "coins" });
    else if (path.startsWith("/bag")) push({ kind: "bag" });
    else if (path.startsWith("/vip")) push({ kind: "vip-benefits" });
    else if (path.startsWith("/cp")) push({ kind: "intimate-space", personId: "me" });
    else if (path.startsWith("/shop")) push({ kind: "shop" });
    else if (path.startsWith("/rooms")) setTab("rooms");
    else if (path.startsWith("/discover")) setTab("discover");
    else if (path.startsWith("/tasks")) setSheet({ kind: "tasks" });
    else if (path.startsWith("/moments")) push({ kind: "moments" });
  };
}

export function OfficialTick({ className = "h-4 w-4" }: { className?: string }) {
  return <BadgeCheck className={`${className} shrink-0 fill-[#3b82f6] text-white`} aria-label="Official account" />;
}

const CATEGORY_TONE: Record<string, string> = {
  PAYMENT: "from-emerald-500/25",
  VIP: "from-gold/30",
  RED_PACKET: "from-coral/30",
  CP: "from-pink-500/25",
  SAFETY: "from-amber-500/25",
  ANNOUNCEMENT: "from-[#7b5cff]/30",
};

export function SystemBubble({ m }: { m: ChatMessage }) {
  const open = useOpenAction();
  const tone = CATEGORY_TONE[m.category ?? ""] ?? "from-cream/10";
  return (
    <div className="flex justify-start" data-message-id={m.id}>
      <div className={`w-[86%] overflow-hidden rounded-3xl rounded-bl-lg bg-gradient-to-br ${tone} to-surface ring-1 ring-line`}>
        {m.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.imageUrl} alt="" className="block max-h-[220px] w-full object-cover" loading="lazy" />
        ) : null}
        <div className="px-3.5 py-2.5">
          {m.title ? <p className="text-[14px] font-bold text-cream">{m.title}</p> : null}
          <p className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-snug text-cream/85">{m.text ?? ""}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted">{Number.isFinite(m.at) ? new Date(m.at).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""}</span>
            {m.actionLabel && m.actionUrl ? (
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => open(m.actionUrl)} className="flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-[12px] font-bold text-ink">
                {m.actionLabel} <ChevronRight className="h-3.5 w-3.5" />
              </motion.button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Discover: the newest Sarpanch announcement to everyone. */
export function SarpanchAnnouncement() {
  const { push } = useApp();
  const open = useOpenAction();
  const [n, setN] = useState<Notice | null>(null);
  useEffect(() => {
    let live = true;
    sarpanchApi
      .latest()
      .then((x) => live && setN(x))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  if (!n) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#7b5cff]/35 via-surface to-surface ring-1 ring-gold/25">
      <button type="button" onClick={() => push({ kind: "sarpanch" })} className="flex w-full items-center gap-2 px-4 pt-3 text-left">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gold/20 text-gold">
          <Megaphone className="h-4 w-4" />
        </span>
        <span className="flex items-center gap-1 text-[13px] font-bold text-cream">
          Sarpanch <OfficialTick className="h-3.5 w-3.5" />
        </span>
        <span className="ml-auto text-[10.5px] text-muted">{ago(n.at)}</span>
      </button>
      {n.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={n.imageUrl} alt="" className="mt-3 block max-h-[180px] w-full object-cover" loading="lazy" />
      ) : null}
      <div className="px-4 pb-3.5 pt-2">
        {n.title ? <p className="font-display text-[16px] font-bold text-cream">{n.title}</p> : null}
        {n.body ? <p className="mt-0.5 line-clamp-3 text-[13px] text-cream/80">{n.body}</p> : null}
        {n.actionLabel && n.actionUrl ? (
          <button type="button" onClick={() => open(n.actionUrl)} className="mt-2.5 rounded-full bg-gold px-4 py-1.5 text-[12.5px] font-bold text-ink">
            {n.actionLabel}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

/** The official account's profile page. */
export function SarpanchScreen() {
  const { pop, push } = useApp();
  const open = useOpenAction();
  const [p, setP] = useState<SarpanchProfile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    sarpanchApi
      .profile()
      .then(setP)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load Sarpanch."));
  }, []);

  const toggleFollow = async () => {
    if (!p || busy) return;
    setBusy(true);
    try {
      const st = p.youFollow ? await friendsApi.unfollow(p.userId) : await friendsApi.follow(p.userId);
      setP({ ...p, youFollow: st.following, followers: st.followers || p.followers + (st.following ? 1 : -1) });
    } catch {
      /* keep as is */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-scroll h-full bg-ink pb-10">
      <ScreenHeader title="Sarpanch" sub="Official Panchayat account" onBack={pop} />
      {error ? <p className="px-6 pt-10 text-center text-[13px] text-coral">{error}</p> : null}
      {!p && !error ? (
        <div className="grid place-items-center pt-16">
          <Loader2 className="h-6 w-6 animate-spin text-gold" aria-label="Loading" />
        </div>
      ) : null}
      {p ? (
        <>
          <section className="relative mx-4 mt-2 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3a1d5c] via-[#251733] to-surface px-5 pb-5 pt-6 ring-1 ring-gold/25">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/15 blur-3xl" />
            <div className="flex items-center gap-4">
              <div className="relative">
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-[3px] ring-gold" />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-gold/20 font-display text-3xl font-bold text-gold ring-[3px] ring-gold">स</div>
                )}
                <span className="absolute -bottom-1 -right-1 rounded-full bg-ink p-0.5">
                  <OfficialTick className="h-5 w-5" />
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 font-display text-[22px] font-bold text-cream">{p.name}</h2>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-ink">OFFICIAL</span>
                  <span className="rounded-full bg-[#7b5cff]/30 px-2 py-0.5 text-[10px] font-bold text-cream">Panchayat Team</span>
                </div>
                <p className="mt-1.5 font-mono text-[12px] text-muted">ID {p.publicId ?? "—"}</p>
              </div>
            </div>
            {p.bio ? <p className="mt-4 text-[13px] leading-relaxed text-cream/80">{p.bio}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-ink/40 py-2.5">
                <div className="font-display text-[18px] font-bold text-cream">{p.followers.toLocaleString("en-IN")}</div>
                <div className="text-[11px] text-muted">Followers</div>
              </div>
              <div className="rounded-2xl bg-ink/40 py-2.5">
                <div className="font-display text-[18px] font-bold text-cream">{p.notices.length}</div>
                <div className="text-[11px] text-muted">Notices</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <motion.button whileTap={{ scale: 0.96 }} type="button" disabled={busy} onClick={() => void toggleFollow()} className={`flex h-11 items-center justify-center gap-1.5 rounded-full text-[14px] font-bold ${p.youFollow ? "bg-white/10 text-cream" : "bg-gradient-to-r from-coral to-gold text-white"}`}>
                {p.youFollow ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} {p.youFollow ? "Following" : "Follow"}
              </motion.button>
              <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => push({ kind: "conversation", personId: `${SERVER_USER_PREFIX}${p.userId}` })} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 text-[14px] font-bold text-cream">
                <MessageCircle className="h-4 w-4" /> Messages
              </motion.button>
            </div>
          </section>

          <h3 className="mx-5 mt-6 flex items-center gap-2 font-display text-[17px] font-bold text-cream">
            <Bell className="h-4 w-4 text-gold" /> Notice board
          </h3>
          <div className="mt-2 space-y-2.5 px-4">
            {p.notices.length === 0 ? <p className="rounded-2xl bg-surface px-4 py-5 text-center text-[13px] text-muted">No notices yet.</p> : null}
            {p.notices.map((n) => (
              <div key={n.id} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
                {n.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.imageUrl} alt="" className="block max-h-[160px] w-full object-cover" loading="lazy" />
                ) : null}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-bold text-cream">{n.title ?? "Notice"}</p>
                    <span className="shrink-0 text-[10.5px] text-muted">{ago(n.at)}</span>
                  </div>
                  {n.body ? <p className="mt-0.5 text-[13px] text-cream/75">{n.body}</p> : null}
                  {n.actionLabel && n.actionUrl ? (
                    <button type="button" onClick={() => open(n.actionUrl)} className="mt-2 text-[12.5px] font-bold text-gold">
                      {n.actionLabel} →
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mx-4 mt-6 flex gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3.5 ring-1 ring-emerald-500/25">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-[12.5px] leading-relaxed text-cream/80">
              <b className="text-cream">Stay safe.</b> Sarpanch never asks for your password, OTP or payment details. Only messages with the blue tick come from the Panchayat team.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
