"use client";

import { useEffect, useState } from "react";
import { FramedPicture, SignBadge } from "./ParivarFrames";
import { parivarApi, parivarExtra } from "@/lib/api/parivar";
import { useApp } from "@/lib/app/store";

type Row = { id: string; name: string; sign: string; frame?: string; logoUrl?: string; emblem: string; color: string; last?: string; at?: string };

const clock = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const same = d.toDateString() === new Date().toDateString();
  return same ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString([], { day: "numeric", month: "short" });
};

/** Pinned at the top of Chats for people who are in a Parivar: opens the Parivar chat. */
export function ParivarChatRow() {
  const { push } = useApp();
  const [r, setR] = useState<Row | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const me = await parivarApi.mine();
        if (!me.enabled || !me.parivarId) return live && setR(null);
        const p = await parivarApi.profile(me.parivarId);
        let last: string | undefined;
        let at: string | undefined;
        try {
          const c = await parivarExtra.chat(me.parivarId, 0);
          const m = c.messages[c.messages.length - 1];
          if (m) {
            last = m.kind === "SYSTEM" ? m.text : `${m.name ? `${m.name}: ` : ""}${m.text}`;
            at = m.at;
          }
        } catch {
          /* no preview */
        }
        if (live) setR({ id: p.id, name: p.name, sign: p.sign, frame: p.frame, logoUrl: p.logoUrl, emblem: p.emblem, color: p.color, last, at });
      } catch {
        /* not in a Parivar */
      }
    };
    void load();
    const t = window.setInterval(() => document.visibilityState === "visible" && void load(), 30_000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, []);
  if (!r) return null;
  return (
    <button type="button" onClick={() => push({ kind: "parivar-chat", id: r.id })} className="flex w-full items-center gap-3 border-b border-white/[0.06] bg-white/[0.04] px-4 py-3 text-left active:bg-white/[0.07]">
      <FramedPicture frame={r.frame} size={50}>
        {r.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-[24px]" style={{ background: `radial-gradient(circle at 30% 25%, ${r.color}aa, ${r.color}33 70%), #1c1b22` }} aria-hidden>
            {r.emblem}
          </span>
        )}
      </FramedPicture>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-display text-[16.5px] font-extrabold text-cream">{r.name}</span>
          <span className="shrink-0 rounded-full border border-gold/60 px-2 py-0.5 text-[10.5px] font-bold text-gold">Parivar</span>
          <SignBadge sign={r.sign} frame={r.frame} size="sm" />
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-cream/55">{r.last ?? "Say hello to your Parivar"}</span>
      </span>
      <span className="shrink-0 self-start pt-1 text-[11.5px] text-cream/40">{clock(r.at)}</span>
    </button>
  );
}
