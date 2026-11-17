"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Ban, Flag, MoreVertical, ShieldCheck } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useApp } from "@/lib/app/store";
import { setUserBlocked } from "@/lib/api/chat";
import { REPORT_REASONS, getBlockedIds, sendReport, type ReportTarget } from "@/lib/api/reports";

/* A report can be started from anywhere (a profile, a chat message, a room): openReport(target). ReportHost shows the sheet once, in the app shell. */
let current: ReportTarget | null = null;
const listeners = new Set<() => void>();
export function openReport(t: ReportTarget) {
  current = t;
  listeners.forEach((l) => l());
}
function closeReport() {
  current = null;
  listeners.forEach((l) => l());
}
const useTarget = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );

export function ReportHost() {
  const t = useTarget();
  const { toast } = useApp();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setReason("");
    setNote("");
  }, [t]);
  const send = async () => {
    if (!t || !reason || busy) return;
    setBusy(true);
    try {
      await sendReport(t, reason, note);
      toast("Thanks. Our team will look at your report.", "gold");
      closeReport();
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't send the report. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={Boolean(t)} onClose={closeReport} title="Report">
      <div className="px-4 pb-6">
        <p className="text-[12.5px] text-cream/75">
          {t ? `Why are you reporting ${t.type === "MESSAGE" ? "this message" : t.type === "ROOM" ? "this room" : t.name}?` : ""} We keep your report private.
        </p>
        <div role="radiogroup" aria-label="Reason" className="mt-3 grid gap-1.5">
          {REPORT_REASONS.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={reason === r.id} onClick={() => setReason(r.id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold ring-1 ${reason === r.id ? "bg-gold/15 text-gold ring-gold/50" : "bg-white/[0.05] text-cream ring-white/10"}`}>
              <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ring-2 ${reason === r.id ? "ring-gold" : "ring-white/30"}`}>{reason === r.id ? <span className="h-2 w-2 rounded-full bg-gold" /> : null}</span>
              {r.label}
            </button>
          ))}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Tell us more (optional)" aria-label="More details" className="mt-3 w-full rounded-xl bg-black/30 px-3 py-2 text-[13.5px] text-cream ring-1 ring-white/10 placeholder:text-cream/35 focus:outline-none" />
        <button type="button" disabled={!reason || busy} onClick={() => void send()} className="mt-3 h-12 w-full rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e0a93a] font-display text-[15px] font-black text-[#4a2600] disabled:opacity-45">
          {busy ? "Sending…" : "Send report"}
        </button>
      </div>
    </BottomSheet>
  );
}

/** The "⋯" button on someone else's profile: report them or block them. */
export function ProfileSafetyButton({ personId, name }: { personId: string; name: string }) {
  const { toast } = useApp();
  const uid = personId.startsWith("srv-user:") ? personId.slice(9) : /^\d+$/.test(personId) ? personId : null;
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    if (uid) getBlockedIds().then((ids) => setBlocked(ids.includes(uid))).catch(() => setBlocked(false));
  }, [uid]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);
  if (!uid) return null;
  const toggleBlock = async () => {
    if (busy) return;
    if (!blocked && !window.confirm(`Block ${name}? They won't be able to message you.`)) return;
    setBusy(true);
    try {
      await setUserBlocked(uid, !blocked);
      setBlocked(!blocked);
      toast(blocked ? `${name} is unblocked` : `${name} is blocked`);
      setOpen(false);
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "That didn't work.", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="More options" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream backdrop-blur">
        <MoreVertical className="h-5 w-5" />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={name}>
        <div className="px-3 pb-6">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openReport({ type: "USER", userId: uid, name });
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-coral hover:bg-cream/[0.04]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-coral/10">
              <Flag className="h-4 w-4" />
            </span>
            <span className="text-[14.5px] font-semibold">Report {name}</span>
          </button>
          <button type="button" disabled={busy || blocked === null} onClick={() => void toggleBlock()} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-cream hover:bg-cream/[0.04] disabled:opacity-60">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-cream/[0.07]">{blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold">{blocked ? `Unblock ${name}` : `Block ${name}`}</span>
              <span className="block text-[11.5px] text-muted">{blocked ? "They can message you again." : "They can't message you."}</span>
            </span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
