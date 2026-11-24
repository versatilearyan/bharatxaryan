"use client";

import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/app/store";

/* The silent observer (a trusted staff account, invisible in rooms) can ban an account from inside the room. */

let observerCache: Promise<boolean> | null = null;
/** Is the signed-in account a silent observer? Asked once per visit. */
export function useIsObserver() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    observerCache ??= api<{ observer?: boolean }>("/api/v1/observer/me", { auth: true })
      .then((d) => d?.observer === true)
      .catch(() => false);
    let live = true;
    void observerCache.then((v) => live && setOn(v));
    return () => {
      live = false;
    };
  }, []);
  return on;
}

const LENGTHS: { days: number | null; label: string }[] = [
  { days: 1, label: "1 day" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: null, label: "Permanent" },
];

export function ObserverBan({ roomId, personId, name, onDone }: { roomId: string; personId: string; name: string; onDone: () => void }) {
  const { toast } = useApp();
  const [days, setDays] = useState<number | null>(7);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const userId = personId.startsWith("srv-user:") ? personId.slice(9) : personId;
  const ban = async () => {
    if (!window.confirm(`Ban ${name}'s account ${days ? `for ${days} day${days === 1 ? "" : "s"}` : "for good"}? They are signed out and removed from the room.`)) return;
    setBusy(true);
    try {
      await api(`/api/v1/voice-rooms/${encodeURIComponent(roomId)}/observer/ban`, { method: "POST", auth: true, body: { user: userId, days, reason: reason.trim() } });
      toast(`${name} is banned`, "gold");
      onDone();
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't ban. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4 rounded-2xl bg-[#fdf0f0] p-3 ring-1 ring-[#f3c4c4]">
      <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#a42323]">
        <Ban className="h-4 w-4" aria-hidden /> Ban account (safety team)
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {LENGTHS.map((l) => (
          <button key={l.label} type="button" onClick={() => setDays(l.days)} aria-pressed={days === l.days} className={`rounded-full px-3 py-1 text-[12px] font-bold ring-1 ${days === l.days ? "bg-[#a42323] text-white ring-[#a42323]" : "bg-white text-[#6d6575] ring-[#e6dada]"}`}>
            {l.label}
          </button>
        ))}
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value.slice(0, 200))} placeholder="Reason (they see it)" className="mt-2 h-10 w-full rounded-xl bg-white px-3 text-[13px] text-[#1f1d3a] ring-1 ring-[#e6dada] focus:outline-none" />
      <button type="button" disabled={busy} onClick={() => void ban()} className="mt-2 h-10 w-full rounded-full bg-[#a42323] text-[13.5px] font-extrabold text-white disabled:opacity-50">
        {busy ? "Banning…" : "Ban account"}
      </button>
    </div>
  );
}
