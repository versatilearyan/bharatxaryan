"use client";

import { motion } from "framer-motion";
import { Compass, House, MessageCircle, Radio, UserRound, type LucideIcon } from "lucide-react";
import { useChat, useServerUnread } from "@/lib/app/chat-store";
import { useMarket } from "@/lib/app/market-store";
import { useApp, type Tab } from "@/lib/app/store";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "rooms", label: "Rooms", icon: Radio },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "profile", label: "Profile", icon: UserRound },
];

/** Fixed bottom navigation, pinned inside the mobile-width app container. */
export function BottomNav() {
  const { tab, setTab, conversations } = useApp();
  // Signed in: the server's count (GET /chat/unread-count); otherwise the demo chats'
  const serverUnread = useServerUnread();
  const signedIn = useChat().enabled;
  const unread = signedIn ? (serverUnread ?? 0) : conversations.reduce((n, c) => n + c.unread, 0);
  const { newVisitors } = useMarket();

  return (
    <nav aria-label="Main" className="pb-safe pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-2">
      <ul className="pointer-events-auto grid h-[66px] grid-cols-5 rounded-[26px] bg-[#1a1030]/90 px-1 ring-1 ring-white/15 backdrop-blur-xl shadow-[0_18px_40px_-10px_rgba(124,77,255,0.6)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className="relative flex h-full w-full flex-col items-center justify-center gap-1"
              >
                <span className="relative grid h-9 w-12 place-items-center">
                  {active ? (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7c4dff] to-[#ff3d8b] shadow-[0_5px_0_#4a1f9e,0_12px_20px_-6px_rgba(255,61,139,0.7)]"
                      transition={{ type: "spring", stiffness: 500, damping: 36 }}
                    />
                  ) : null}
                  <motion.span animate={{ scale: active ? 1.08 : 1 }} className="relative">
                    <Icon className={`h-[22px] w-[22px] ${active ? "text-white" : "text-white/55"}`} strokeWidth={active ? 2.6 : 2} aria-hidden />
                  </motion.span>
                  {id === "profile" && newVisitors > 0 ? <span className="absolute right-2.5 top-0.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-ink" aria-label={`${newVisitors} new visitors`} /> : null}
                  {id === "chat" && unread > 0 ? (
                    <span className="absolute right-1 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[9px] font-bold text-white ring-2 ring-ink">
                      {unread}
                    </span>
                  ) : null}
                </span>
                <span className={`text-[10.5px] font-extrabold ${active ? "text-white" : "text-white/55"}`}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
