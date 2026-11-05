"use client";

/**
 * Refer & earn: your invite link (with WhatsApp and share), how many friends
 * joined and what you earned. Each friend who joins with your link gives you
 * 20,000 coins (the server checks and pays).
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Gift, Share2, Users } from "lucide-react";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/app/store";
import { Coin, ScreenHeader } from "@/components/ui/kit";
import { Toran } from "@/components/ui/Toran";

type Mine = { code: string; link: string; reward: number; count: number; earned: number; friends: { userId: string; name: string; avatarUrl?: string; joinedAt?: string }[] };

export function ReferScreen() {
  const { pop, toast } = useApp();
  const [d, setD] = useState<Mine | null>(null);
  useEffect(() => {
    api<Mine>("/api/v1/referrals/me", { auth: true })
      .then(setD)
      .catch((e) => toast(e instanceof Error ? e.message : "Couldn't load your invite link.", "error"));
  }, [toast]);

  const text = d ? `Namaste! 🙏 Join me on Panchayat: voice rooms, games, gifts and more. Use my link and get a 50,000-coin welcome red packet 🧧\n${d.link}` : "";
  const copy = async () => {
    if (!d) return;
    try {
      await navigator.clipboard.writeText(d.link);
      toast("Link copied!", "gold");
    } catch {
      toast(d.link);
    }
  };
  const share = async () => {
    if (!d) return;
    try {
      if (navigator.share) await navigator.share({ title: "Panchayat", text });
      else await copy();
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="app-scroll relative h-full bg-[radial-gradient(130%_55%_at_50%_0%,#4a1626_0%,#2a1430_42%,#141018_100%)] pb-10">
      <Toran />
      <ScreenHeader title="Refer & earn" onBack={pop} />
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mx-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#5a1a28] via-[#3a1420] to-[#1c1824] p-5 text-center ring-1 ring-gold/35">
        <motion.span className="pointer-events-none absolute -left-10 top-0 h-full w-16 rotate-12 bg-white/10 blur-md" animate={{ x: ["0%", "800%"] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }} aria-hidden />
        <motion.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 2.2, repeat: Infinity }} className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-b from-[#ff3b3b] to-[#b3001b] text-[30px] shadow-[0_10px_30px_-8px_rgba(255,59,59,0.7)]">
          🧧
        </motion.div>
        <p className="mt-3 bg-gradient-to-r from-[#fff1c9] via-gold to-[#ffb37a] bg-clip-text font-display text-[24px] font-extrabold text-transparent">Get 20,000 coins</p>
        <p className="mt-1 text-[13px] text-cream/80">for every friend who joins Panchayat with your link. No limit!</p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-black/35 p-2 ring-1 ring-gold/20">
          <span className="min-w-0 flex-1 truncate px-2 text-left font-mono text-[12.5px] text-cream/90">{d?.link ?? "Loading…"}</span>
          <button type="button" onClick={() => void copy()} disabled={!d} className="flex h-9 items-center gap-1 rounded-xl bg-white/10 px-3 text-[12.5px] font-bold text-cream">
            <Copy className="h-4 w-4" /> Copy
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={d ? `https://wa.me/?text=${encodeURIComponent(text)}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25d366] text-[14px] font-extrabold text-white shadow-[0_8px_24px_-10px_rgba(37,211,102,0.8)] ${d ? "" : "pointer-events-none opacity-50"}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2s-1 .2-3.3-.7a11.6 11.6 0 0 1-4.6-4.1 5.2 5.2 0 0 1-1.1-2.8 3 3 0 0 1 1-2.2 1 1 0 0 1 .7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6a8.6 8.6 0 0 0 1.6 2 7.7 7.7 0 0 0 2.3 1.4c.3.2.5.1.6 0l.8-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3a2.5 2.5 0 0 1-.1 1.3Z" />
            </svg>
            WhatsApp
          </a>
          <button type="button" onClick={() => void share()} disabled={!d} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-coral to-gold text-[14px] font-extrabold text-white disabled:opacity-50">
            <Share2 className="h-5 w-5" /> Share
          </button>
        </div>
      </motion.section>

      <div className="mx-4 mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-gradient-to-br from-[#2c1622]/95 to-[#1b1622]/95 p-3.5 text-center ring-1 ring-gold/15">
          <Users className="mx-auto h-5 w-5 text-gold" />
          <p className="mt-1 font-display text-[22px] font-extrabold text-cream">{d?.count ?? "–"}</p>
          <p className="text-[11px] text-muted">Friends joined</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#2c1622]/95 to-[#1b1622]/95 p-3.5 text-center ring-1 ring-gold/15">
          <Gift className="mx-auto h-5 w-5 text-gold" />
          <p className="mt-1 flex items-center justify-center gap-1 font-display text-[22px] font-extrabold text-gold">
            <Coin className="h-5 w-5" /> {d ? d.earned.toLocaleString("en-IN") : "–"}
          </p>
          <p className="text-[11px] text-muted">Coins earned</p>
        </div>
      </div>

      <h2 className="mx-5 mt-6 font-display text-[17px] font-bold text-cream">How it works</h2>
      <ol className="mx-4 mt-2 space-y-2">
        {["Share your link on WhatsApp or anywhere", "Your friend signs up and sets up their profile", "You get 20,000 coins, and they get a 50,000-coin welcome red packet 🧧"].map((t, i) => (
          <li key={t} className="flex items-center gap-3 rounded-2xl bg-black/25 px-3 py-2.5 ring-1 ring-gold/10">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold font-display text-[13px] font-extrabold text-ink">{i + 1}</span>
            <span className="text-[13px] text-cream/85">{t}</span>
          </li>
        ))}
      </ol>

      {d && d.friends.length ? (
        <>
          <h2 className="mx-5 mt-6 font-display text-[17px] font-bold text-cream">Your friends</h2>
          <ul className="mx-4 mt-2 space-y-2">
            {d.friends.map((f) => (
              <li key={f.userId} className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#2c1622]/95 to-[#1b1622]/95 p-2.5 ring-1 ring-gold/15">
                {f.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-coral font-bold text-white">{(f.name ?? "?").slice(0, 1)}</span>
                )}
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-cream">{f.name ?? "A friend"}</span>
                <span className="flex items-center gap-1 text-[12.5px] font-bold text-gold">
                  +<Coin className="h-3.5 w-3.5" /> {d.reward.toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
