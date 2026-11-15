"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, Plus } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { manualTopupApi } from "@/lib/api/manual-topup";
import { TICKET_CATEGORIES, ticketsApi, type TicketCategory, type TicketDetail, type TicketStatus, type TicketSummary } from "@/lib/api/payment-tickets";
import { shrinkToJpeg } from "@/lib/app/chat-wallpaper";

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const inputClass = "w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[14.5px] text-cream placeholder:text-cream/30 focus:border-gold/50 focus:outline-none";
const when = (iso: string) => (iso ? new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const STATUS: Record<TicketStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-amber-500/15 text-amber-200" },
  ANSWERED: { label: "Answered", cls: "bg-emerald-500/15 text-emerald-200" },
  CLOSED: { label: "Closed", cls: "bg-cream/10 text-cream/60" },
};
const catLabel = (c: TicketCategory) => TICKET_CATEGORIES.find((x) => x.value === c)?.label ?? "Payment problem";

/**
 * Payment tickets: raise a problem with a payment, follow what Munshi ji (the payments desk) answers. Every answer also comes as a
 * message in Munshi ji's chat, with a button that brings you back here.
 */
export function TicketSheet({ open, onClose, ticketId }: { open: boolean; onClose: () => void; ticketId?: string }) {
  const [name, setName] = useState("Munshi ji");
  const [view, setView] = useState<"list" | "new" | "one">("list");
  const [list, setList] = useState<TicketSummary[] | null>(null);
  const [one, setOne] = useState<TicketDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // the new ticket
  const [cat, setCat] = useState<TicketCategory>("NOT_CREDITED");
  const [ref, setRef] = useState("");
  const [text, setText] = useState("");
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [reply, setReply] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async () => {
    try {
      setList(await ticketsApi.mine());
    } catch (e) {
      setError(errText(e, "Couldn't load your tickets."));
    }
  }, []);
  const openOne = useCallback(async (id: string) => {
    setError("");
    setBusy(true);
    try {
      setOne(await ticketsApi.get(id));
      setView("one");
    } catch (e) {
      setError(errText(e, "Couldn't open the ticket."));
      setView("list");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setError("");
    setView("list");
    setOne(null);
    setCat("NOT_CREDITED");
    setRef("");
    setText("");
    setShot(null);
    setReply("");
    manualTopupApi.info().then((i) => setName(i.name)).catch(() => undefined);
    void loadList();
    if (ticketId) void openOne(ticketId);
  }, [open, ticketId, loadList, openOne]);

  useEffect(
    () => () => {
      if (shot) URL.revokeObjectURL(shot.url);
    },
    [shot],
  );

  const pickShot = async (f?: File) => {
    if (!f) return;
    setError("");
    try {
      const blob = await shrinkToJpeg(f);
      setShot({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(errText(e, "Couldn't read that picture."));
    }
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const t = await ticketsApi.create(cat, ref, text, shot?.blob ?? null);
      setOne(t);
      setView("one");
      setText("");
      setRef("");
      setShot(null);
      void loadList();
    } catch (e) {
      setError(errText(e, "Couldn't send the ticket."));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!one || busy || !reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      setOne(await ticketsApi.follow(one.id, reply));
      setReply("");
      void loadList();
    } catch (e) {
      setError(errText(e, "Couldn't send."));
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <button type="button" onClick={() => { setView("list"); setError(""); void loadList(); }} className="mb-3 flex items-center gap-1 text-[13px] font-semibold text-cream/70">
      <ChevronLeft className="h-4 w-4" aria-hidden /> All tickets
    </button>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Payment tickets" tall>
      <div className="space-y-4 px-5 pb-6">
        {error ? (
          <p role="alert" className="rounded-2xl bg-[#3a1418] px-3.5 py-3 text-[12.5px] text-[#ffb0b4] ring-1 ring-coral/25">
            {error}
          </p>
        ) : null}

        {view === "new" ? (
          <>
            {back}
            <p className="text-[13px] text-cream/75">Tell {name} what went wrong. We reply here and in {name}&apos;s chat.</p>
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-cream/70">What happened?</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="What happened">
                {TICKET_CATEGORIES.map((c) => (
                  <button key={c.value} type="button" role="radio" aria-checked={cat === c.value} onClick={() => setCat(c.value)} className={`h-8 rounded-full px-3 text-[12px] font-semibold ring-1 ${cat === c.value ? "bg-cream text-ink ring-cream" : "text-cream ring-line-strong"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-cream/70">Transaction ID / UTR / order number (if you have it)</span>
              <input value={ref} onChange={(e) => setRef(e.target.value.slice(0, 80))} aria-label="Transaction reference" placeholder="For example 412345678901" className={`${inputClass} h-11`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-cream/70">Describe the problem</span>
              <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} aria-label="Describe the problem" rows={4} placeholder="For example: I paid ₹149 on 12 Nov but my coins did not come." className={inputClass} />
              <span className="mt-0.5 block text-right text-[11px] text-cream/45">{text.trim().length}/1000 · at least 10 letters</span>
            </label>
            <div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Choose a screenshot" onChange={(e) => { void pickShot(e.target.files?.[0]); e.target.value = ""; }} />
              {shot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shot.url} alt="Your screenshot" className="mb-2 max-h-48 w-full rounded-xl object-contain ring-1 ring-line" />
              ) : null}
              <button type="button" onClick={() => fileRef.current?.click()} className="h-11 w-full rounded-2xl border border-dashed border-gold/50 text-[13.5px] font-semibold text-gold">
                {shot ? "Choose another screenshot" : "Add a payment screenshot (optional)"}
              </button>
            </div>
            <button type="button" disabled={busy || text.trim().length < 10} onClick={() => void submit()} className="flex h-12 w-full items-center justify-center rounded-full bg-coral text-[15px] font-extrabold text-white disabled:opacity-40">
              {busy ? "Sending…" : "Send ticket"}
            </button>
          </>
        ) : view === "one" && one ? (
          <>
            {back}
            <div className="rounded-2xl bg-surface p-3.5 ring-1 ring-line">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[14px] font-bold text-cream">Ticket #{one.id}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS[one.status].cls}`}>{STATUS[one.status].label}</span>
              </div>
              <p className="mt-0.5 text-[12px] text-cream/60">
                {catLabel(one.category)}
                {one.reference ? ` · ${one.reference}` : ""} · {when(one.createdAt)}
              </p>
            </div>
            <div className="space-y-2" aria-live="polite">
              {one.messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "USER" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[86%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug ${m.from === "USER" ? "rounded-br-md bg-gold/90 text-ink" : "rounded-bl-md bg-surface text-cream ring-1 ring-line"}`}>
                    {m.from === "ADMIN" ? <p className="mb-0.5 text-[11px] font-bold text-gold">{name}</p> : null}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-0.5 text-[10px] ${m.from === "USER" ? "text-ink/60" : "text-cream/45"}`}>{when(m.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
            {one.status === "CLOSED" ? (
              <p className="rounded-2xl bg-cream/[0.06] px-4 py-3 text-center text-[12.5px] text-cream/70">This ticket is closed. If it isn&apos;t solved, please raise a new one.</p>
            ) : (
              <div className="flex items-end gap-2">
                <textarea value={reply} onChange={(e) => setReply(e.target.value.slice(0, 1000))} rows={2} aria-label="Add a message to the ticket" placeholder="Add more details…" className={`${inputClass} min-w-0 flex-1`} />
                <button type="button" disabled={busy || !reply.trim()} onClick={() => void send()} className="h-11 rounded-full bg-coral px-5 text-[14px] font-bold text-white disabled:opacity-40">
                  Send
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setView("new"); setError(""); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-coral text-[15px] font-extrabold text-white">
              <Plus className="h-4 w-4" aria-hidden /> Raise a ticket
            </button>
            {!list ? (
              <p className="grid place-items-center py-8" role="status">
                <Loader2 className="h-5 w-5 animate-spin text-gold" aria-label="Loading" />
              </p>
            ) : !list.length ? (
              <p className="rounded-2xl bg-surface px-4 py-6 text-center text-[13px] text-muted ring-1 ring-line">No tickets yet. If a payment didn&apos;t go right, raise one and {name} will help.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => void openOne(t.id)} className="flex w-full items-start justify-between gap-3 rounded-2xl bg-surface p-3.5 text-left ring-1 ring-line">
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-cream">
                          #{t.id} · {catLabel(t.category)}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-cream/60">{t.message}</span>
                        <span className="mt-0.5 block text-[11px] text-cream/40">{when(t.updatedAt)}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
