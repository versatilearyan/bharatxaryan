"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Send, Smile } from "lucide-react";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { IconButton } from "@/components/ui/kit";
import { usePeople } from "@/lib/app/people";
import { useApp } from "@/lib/app/store";

const fmt = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function ConversationView({ personId }: { personId: string }) {
  const { conversations, sendMessage, pop, typing, setSheet } = useApp();
  const person = usePeople();
  const p = person(personId);
  const conv = conversations.find((c) => c.personId === personId);
  const messages = conv?.messages ?? [];
  const [draft, setDraft] = useState("");
  const [emoji, setEmoji] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typing]);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    sendMessage(personId, t);
    setDraft("");
    setEmoji(false);
  };

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="pt-safe border-b border-line bg-ink/95">
        <div className="flex h-14 items-center gap-2 px-2">
          <IconButton label="Back" onClick={pop} className="!bg-transparent">
            <ChevronLeft className="h-6 w-6" />
          </IconButton>
          <button type="button" onClick={() => setSheet({ kind: "person", personId })} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <PersonAvatar person={p} size={38} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold text-cream">{p.name}</span>
              <span className={`block text-[11px] ${typing === personId ? "text-speak" : "text-muted"}`}>{typing === personId ? "typing…" : p.online ? "Online" : "Offline"}</span>
            </span>
          </button>
        </div>
      </header>

      <div className="app-scroll min-h-0 flex-1 space-y-2 px-3 py-4" aria-live="polite">
        <p className="mx-auto w-fit rounded-full bg-cream/[0.06] px-3 py-1 text-center text-[11px] text-muted">Demo chat · replies are simulated and nothing leaves this device</p>
        {messages.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] rounded-3xl px-3.5 py-2 text-[14px] leading-snug ${m.from === "me" ? "rounded-br-lg bg-coral text-white" : "rounded-bl-lg bg-surface text-cream"}`}>
              {m.text}
              <span className={`ml-2 inline-block translate-y-0.5 text-[10px] ${m.from === "me" ? "text-white/70" : "text-muted"}`}>{fmt(m.at)}</span>
            </div>
          </motion.div>
        ))}
        <AnimatePresence>
          {typing === personId ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-fit gap-1 rounded-3xl rounded-bl-lg bg-surface px-4 py-3" aria-label={`${p.name} is typing`}>
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-muted" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div ref={end} />
      </div>

      <AnimatePresence>
        {emoji ? (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-line bg-ink-2">
            <EmojiPicker
              className="p-3"
              onPick={(e) => {
                setDraft((d) => d + e);
                input.current?.focus();
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <form
        className="pb-safe border-t border-line bg-ink/95"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <IconButton label={emoji ? "Hide emoji" : "Emoji"} onClick={() => setEmoji((v) => !v)} active={emoji}>
            <Smile className="h-5 w-5" />
          </IconButton>
          <input
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${p.name}`}
            aria-label={`Message ${p.name}`}
            maxLength={500}
            className="h-11 min-w-0 flex-1 rounded-full bg-surface px-4 text-[14px] text-cream ring-1 ring-line placeholder:text-muted/70 focus:outline-none focus:ring-gold/40"
          />
          <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!draft.trim()} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full bg-coral text-white disabled:opacity-40">
            <Send className="h-[18px] w-[18px]" />
          </motion.button>
        </div>
      </form>
    </div>
  );
}
