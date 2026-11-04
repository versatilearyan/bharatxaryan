"use client";

/**
 * @mentions in the live room chat.
 *  - MentionPicker: typing "@" in the room chat lists the people in the room; picking
 *    one puts "@Their_Name " in the message.
 *  - MentionText: shows a message with every @name highlighted; mentions of you glow gold.
 *  - useMentionAlerts: a toast when someone mentions you.
 */
import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AtSign } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import type { RoomSession } from "./useRoomSession";

/** "Bharat Pathania" → "Bharat_Pathania" (one token, so it can be typed and found again). */
export const mentionHandle = (name: string) => name.trim().replace(/\s+/g, "_");
const norm = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "_");

/** The "@word" being typed at the end of the message, or null. */
export function mentionQuery(text: string): string | null {
  const m = /(^|\s)@([^\s@]{0,30})$/.exec(text);
  return m ? m[2] : null;
}

/** Everyone in the room you could mention: seated people, the owner and listeners. */
export function useRoomPeople(s: RoomSession) {
  const person = usePeople();
  return useMemo(() => {
    const ids = new Set<string>();
    for (const id of s.seats) if (id && id !== ME_ID) ids.add(id);
    if (s.room.hostId && s.room.hostId !== ME_ID) ids.add(s.room.hostId);
    for (const id of s.listenerIds) if (id !== ME_ID) ids.add(id);
    return [...ids].map((id) => person(id)).filter((p) => p && p.name);
  }, [s.seats, s.room.hostId, s.listenerIds, person]);
}

export function MentionPicker({ s, value, onPick }: { s: RoomSession; value: string; onPick: (next: string) => void }) {
  const people = useRoomPeople(s);
  const q = mentionQuery(value);
  const list = q === null ? [] : people.filter((p) => norm(p.name).includes(norm(q))).slice(0, 6);
  return (
    <AnimatePresence>
      {q !== null && list.length ? (
        <motion.ul
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-30 max-h-[220px] overflow-y-auto rounded-2xl bg-[#1b1530]/95 p-1.5 shadow-2xl ring-1 ring-white/10 backdrop-blur"
          role="listbox"
          aria-label="Mention someone"
        >
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(value.replace(/@([^\s@]{0,30})$/, `@${mentionHandle(p.name)} `))}
                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-white/[0.06]"
              >
                <PersonAvatar person={p} size={28} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-cream">{p.name}</span>
                <AtSign className="h-3.5 w-3.5 text-gold" aria-hidden />
              </button>
            </li>
          ))}
        </motion.ul>
      ) : null}
    </AnimatePresence>
  );
}

/** True when the text mentions this name. */
export function mentions(text: string | undefined, name: string | undefined) {
  if (!text || !name) return false;
  const h = norm(mentionHandle(name));
  const first = norm(name.trim().split(/\s+/)[0] ?? "");
  return (text.match(/@[^\s@]+/g) ?? []).some((t) => {
    const x = norm(t.slice(1)).replace(/[.,!?:;]+$/, "");
    return x === h || (first.length > 1 && x === first);
  });
}

export function MentionText({ text }: { text?: string }) {
  const { profile } = useApp();
  if (!text) return null;
  const parts = text.split(/(@[^\s@]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") && part.length > 1 ? (
          <span key={i} className={`rounded px-0.5 font-bold ${mentions(part, profile.name) ? "bg-gold/25 text-gold" : "text-[#8fc3ff]"}`}>
            {part.replace(/_/g, " ")}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** A toast when a new room message mentions you. */
export function useMentionAlerts(s: RoomSession) {
  const { profile, toast } = useApp();
  const person = usePeople();
  const seen = useRef<number>(-1);
  useEffect(() => {
    const msgs = s.messages;
    if (seen.current < 0) {
      seen.current = msgs.length;
      return;
    }
    for (const m of msgs.slice(seen.current)) {
      if (m.kind === "text" && m.authorId !== ME_ID && mentions(m.text, profile.name)) toast(`${person(m.authorId).name} mentioned you`, "gold");
    }
    seen.current = msgs.length;
  }, [s.messages, profile.name, toast, person]);
}
