"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PenSquare, UserPlus } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { DemoNote, IconButton, SearchField } from "@/components/ui/kit";
import { PEOPLE } from "@/lib/app/data";
import { usePeople } from "@/lib/app/people";
import { useApp } from "@/lib/app/store";
import { useChat } from "@/lib/app/chat-store";
import { ServerInbox } from "./ServerChat";

export function timeAgo(at: number) {
  const m = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function ChatScreen() {
  const { conversations, openConversation, typing, setSheet } = useApp();
  const person = usePeople();
  const [q, setQ] = useState("");
  const [picker, setPicker] = useState(false);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return conversations.filter((c) => !needle || person(c.personId).name.toLowerCase().includes(needle));
  }, [conversations, q, person]);

  const online = PEOPLE.filter((p) => p.online);
  // Signed in: your real chats from the backend instead of the demo ones
  const server = useChat().enabled;

  return (
    <div className="app-scroll h-full pb-[calc(84px+var(--mini,0px)+env(safe-area-inset-bottom))]">
      <header className="pt-safe sticky top-0 z-20 bg-ink/90 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="font-display text-[24px] font-extrabold text-cream">Chats</h1>
          <IconButton label="New message" onClick={() => setPicker(true)}>
            <PenSquare className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
        <div className="px-4 pb-3">
          <SearchField value={q} onChange={setQ} placeholder="Search chats" />
        </div>
      </header>

      {server ? <ServerInbox query={q} /> : null}

      {/* Online now */}
      {server ? null : <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-4 pt-1">
        {online.map((p) => (
          <button key={p.id} type="button" onClick={() => openConversation(p.id)} className="flex w-14 shrink-0 flex-col items-center gap-1" aria-label={`Message ${p.name}`}>
            <span className="relative">
              <PersonAvatar person={p} size={52} />
              <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-speak ring-2 ring-ink" />
            </span>
            <span className="max-w-full truncate text-[11px] text-cream/80">{p.name}</span>
          </button>
        ))}
      </div>

      <DemoNote className="mx-4 mb-2">Demo chats: messages stay on this device and replies are simulated.</DemoNote>

      <ul>
        {list.map((c) => {
          const p = person(c.personId);
          const last = c.messages[c.messages.length - 1];
          return (
            <li key={c.id}>
              <motion.button type="button" whileTap={{ scale: 0.985 }} onClick={() => openConversation(c.personId)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cream/[0.03]">
                <span className="relative">
                  <PersonAvatar person={p} size={52} />
                  {p.online ? <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-speak ring-2 ring-ink" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-[15px] ${c.unread ? "font-bold text-cream" : "font-semibold text-cream/90"}`}>{p.name}</span>
                    {p.vip ? <span className="rounded bg-gold/15 px-1 text-[9px] font-bold text-gold">VIP{p.vip}</span> : null}
                    <span className="ml-auto shrink-0 text-[11px] text-muted">{last ? timeAgo(last.at) : ""}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className={`truncate text-[13px] ${c.unread ? "text-cream/85" : "text-muted"}`}>
                      {typing === c.personId ? <span className="text-speak">typing…</span> : last ? `${last.from === "me" ? "You: " : ""}${last.text}` : "Say hi 👋"}
                    </span>
                    {c.unread ? <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-coral px-1.5 text-[10.5px] font-bold text-white">{c.unread}</span> : null}
                  </span>
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>
      {list.length === 0 ? <p className="px-4 pt-10 text-center text-sm text-muted">No chats match “{q}”.</p> : null}
      </>}

      <BottomSheet open={picker} onClose={() => setPicker(false)} title="New message" tall>
        <button
          type="button"
          onClick={() => {
            setPicker(false);
            setSheet({ kind: "find-user" });
          }}
          className="mx-5 mb-2 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl bg-coral/10 px-4 py-3 text-left ring-1 ring-coral/30"
        >
          <UserPlus className="h-5 w-5 text-coral" aria-hidden />
          <span className="text-[14px] font-semibold text-cream">Find someone by user ID</span>
        </button>
        {server ? <p className="px-5 pb-6 pt-2 text-[13px] text-muted">To message someone, open their profile and tap Chat.</p> : null}
        <ul className="pb-4">
          {(server ? [] : PEOPLE).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setPicker(false);
                  openConversation(p.id);
                }}
                className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-cream/[0.03]"
              >
                <PersonAvatar person={p} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-cream">{p.name}</span>
                  <span className="block truncate text-[11.5px] text-muted">{p.bio}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}
