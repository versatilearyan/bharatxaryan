"use client";

/**
 * Discover → Notice: every Sarpanch announcement as a full card (category chip, date and number, title, the
 * Sarpanch team line, the text with "Read more", picture and button). The server writes them; this only shows them.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Megaphone } from "lucide-react";
import { OfficialTick, sarpanchApi, useOpenAction, type Notice } from "@/components/sarpanch/Sarpanch";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function day(at?: string): string {
  if (!at) return "";
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;
}

export function NoticeFeed() {
  const [list, setList] = useState<Notice[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = () => {
    setFailed(false);
    sarpanchApi
      .notices(50)
      .then(setList)
      .catch(() => setFailed(true));
  };
  useEffect(load, []);

  if (failed) {
    return (
      <button type="button" onClick={load} className="mx-4 mt-3 block w-[calc(100%-2rem)] rounded-2xl bg-coral/10 p-3 text-center text-[13px] text-coral">
        Notices load nahi hue. Tap karke dobara try karo.
      </button>
    );
  }
  if (!list) {
    return (
      <div className="space-y-3 px-4 pt-3" aria-busy>
        {[0, 1].map((k) => (
          <div key={k} className="h-40 animate-pulse rounded-3xl bg-white/[0.05] ring-1 ring-gold/10" />
        ))}
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className="px-8 py-12 text-center">
        <Megaphone className="mx-auto h-10 w-10 text-gold/70" aria-hidden />
        <p className="mt-2 font-display text-[16px] font-bold text-cream">Abhi koi notice nahi</p>
        <p className="mt-1 text-[12.5px] text-muted">Sarpanch ki nayi khabar yahan aayegi.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3.5 px-4 pt-3" aria-label="Sarpanch notices">
      {list.map((n, i) => (
        <NoticeCard key={n.id || i} n={n} number={list.length - i} index={i} />
      ))}
    </ul>
  );
}

function NoticeCard({ n, number, index }: { n: Notice; number: number; index: number }) {
  const open = useOpenAction();
  const [more, setMore] = useState(false);
  const long = (n.body?.length ?? 0) > 170 || (n.body?.split("\n").length ?? 0) > 4;
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 5) * 0.05 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#2c1622]/95 to-[#1b1622]/95 shadow-[0_14px_34px_-18px_rgba(0,0,0,0.95)] ring-1 ring-gold/20 before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-gold/60 before:to-transparent"
    >
      <div className="px-4 pt-3.5">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-gradient-to-b from-[#f6d899] to-[#d9a84f] px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wide text-[#2a1a0c]">{n.category || "Update"}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" aria-hidden />
          {day(n.at) ? (
            <span className="flex items-center gap-1 text-[10.5px] font-semibold text-cream/55">
              <CalendarDays className="h-3 w-3" aria-hidden /> {day(n.at)}
            </span>
          ) : null}
          <span className="text-[10.5px] font-bold text-gold/70">#{String(number).padStart(2, "0")}</span>
        </div>
        {n.title ? <h3 className="mt-2.5 font-display text-[17px] font-extrabold leading-snug text-cream">{n.title}</h3> : null}
        <p className="mt-0.5 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-gold/75">
          Sarpanch team <OfficialTick className="h-3.5 w-3.5" />
        </p>
      </div>
      {n.body ? (
        <div className="px-4 pt-2">
          <p className={`whitespace-pre-line text-[13.5px] leading-relaxed text-cream/80 ${more ? "" : "line-clamp-4"}`}>{n.body}</p>
          {long ? (
            <button type="button" onClick={() => setMore((v) => !v)} className="mt-1.5 text-[12px] font-bold text-gold">
              {more ? "Show less" : "Read more"}
            </button>
          ) : null}
        </div>
      ) : null}
      {n.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={n.imageUrl} alt="" className="mx-4 mt-3 block max-h-[220px] w-[calc(100%-2rem)] rounded-2xl object-cover ring-1 ring-gold/15" loading="lazy" />
      ) : null}
      <div className="px-4 pb-4 pt-3">
        {n.actionLabel && n.actionUrl ? (
          <button type="button" onClick={() => open(n.actionUrl)} className="rounded-full bg-gradient-to-b from-[#f6d899] to-[#d9a84f] px-4 py-1.5 text-[12.5px] font-extrabold text-[#2a1a0c]">
            {n.actionLabel}
          </button>
        ) : null}
      </div>
    </motion.li>
  );
}
