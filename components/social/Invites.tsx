"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Lock, Send, Users } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { friendsApi, type FriendCard } from "@/lib/api/social";
import { gameByCode, sendInvite, type ChatInvite } from "@/lib/api/invites";
import { getRoomById, rememberRoomPassword } from "@/lib/api/voice-rooms";
import { useChat } from "@/lib/app/chat-store";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";

const errText = (e: unknown, f: string) => (e instanceof Error && e.message ? e.message : f);

/**
 * Join a room from an invite (or a game code): a password room lets you in
 * with the invite instead of the password. Then, for a game, open the table.
 */
export function useJoinFromInvite() {
  const { enterRoom, unlockRoom, push, toast, activeRoomId, expandRoom } = useApp();
  const { addCreated } = useServerRooms();
  return async (roomId: string, invite?: string, gameId?: string, game?: string) => {
    try {
      const appId = serverRoomAppId(roomId);
      if (activeRoomId !== appId) {
        if (invite) rememberRoomPassword(roomId, invite);
        const v = await getRoomById(roomId);
        addCreated(v);
        unlockRoom(appId);
        enterRoom(appId);
      } else expandRoom();
      if (gameId) window.setTimeout(() => push(game === "JACKAROO" ? { kind: "jackaroo", roomId } : { kind: "ludo", roomId }), 700);
    } catch (e) {
      toast(errText(e, "That room isn't open any more."), "error");
    }
  };
}

/** Join a game table by its 6-character code. */
export function useJoinGameByCode() {
  const join = useJoinFromInvite();
  const { toast } = useApp();
  return async (code: string) => {
    try {
      const g = await gameByCode(code);
      await join(g.roomId, g.invite, g.gameId, g.game);
      return true;
    } catch (e) {
      toast(errText(e, "No game with that code."), "error");
      return false;
    }
  };
}

/** An invite in a chat: the room (or game) with a Join button. */
export function InviteCard({ inv, mine }: { inv: ChatInvite; mine: boolean }) {
  const join = useJoinFromInvite();
  const [busy, setBusy] = useState(false);
  const expired = inv.expiresAt !== undefined && inv.expiresAt < Date.now();
  const game = inv.kind === "GAME";
  return (
    <div className={`w-[240px] overflow-hidden rounded-2xl ring-1 ${mine ? "bg-white/15 ring-white/25" : "bg-gradient-to-b from-[#2a2238] to-[#1a1624] ring-white/10"}`}>
      <div className="relative h-[86px] overflow-hidden">
        {inv.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inv.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className={`h-full w-full ${game ? "bg-gradient-to-br from-[#7b5cff] to-[#ff7fa8]" : "bg-gradient-to-br from-[#f4515b] to-[#ffb347]"}`} />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10.5px] font-extrabold text-white backdrop-blur">
          {game ? "🎮 GAME INVITE" : "🎙 ROOM INVITE"}
        </span>
        {inv.private ? (
          <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-black/50 px-2 py-0.5 text-[10.5px] font-bold text-white">
            <Lock className="h-3 w-3" /> Private
          </span>
        ) : null}
        <span className="absolute bottom-1.5 left-2.5 right-2.5 truncate font-display text-[15px] font-extrabold text-white">{game ? `${inv.game === "JACKAROO" || inv.game === "LUDO" ? "Ludo" : (inv.game ?? "Game")} in ${inv.roomName}` : inv.roomName}</span>
      </div>
      <div className="px-2.5 pb-2.5 pt-2 text-[11.5px] text-cream/75">
        {game ? (
          <p>
            Table code <b className="font-mono text-gold">{inv.gameCode}</b>
            {inv.players !== undefined ? ` · ${inv.players}/4 seated` : ""}
          </p>
        ) : (
          <p>
            Room ID <b className="text-gold">{inv.roomCode}</b>
            {inv.private ? " · this invite lets you in" : ""}
          </p>
        )}
        {mine ? (
          <p className="mt-1.5 text-center text-[11px] text-cream/55">You sent this invite</p>
        ) : (
          <button
            type="button"
            disabled={busy || expired}
            onClick={() => {
              setBusy(true);
              void join(inv.roomId, inv.invite, game ? inv.gameId : undefined, inv.game).finally(() => setBusy(false));
            }}
            className="mt-2 h-9 w-full rounded-full bg-gradient-to-r from-coral to-gold text-[13px] font-extrabold text-white disabled:opacity-50"
          >
            {expired ? "Invite expired" : busy ? "Joining…" : game ? "Join game" : "Join room"}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Invite people to a room or a game table: your chats (people and groups)
 * and your friends. The invite arrives in their chat as a card with Join.
 */
export function ChatInviteSheet({ open, onClose, kind, roomId, gameId, code, title }: { open: boolean; onClose: () => void; kind: "ROOM" | "GAME"; roomId: string; gameId?: string; code?: string; title: string }) {
  const { toast } = useApp();
  const chat = useChat();
  const [friends, setFriends] = useState<FriendCard[]>([]);
  const [sent, setSent] = useState<Record<string, "sending" | "sent">>({});
  useEffect(() => {
    if (!open) return;
    chat.loadInbox(true);
    friendsApi
      .list("friends")
      .then((l) => setFriends(l.people))
      .catch(() => setFriends([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const chats = (chat.inbox.data ?? []).filter((c) => c.requestState !== "PENDING" && !c.blockedByMe && !c.blockedMe);
  const inChats = new Set(chats.map((c) => c.otherUserId).filter(Boolean));
  const others = friends.filter((f) => !inChats.has(f.userId));

  const send = async (key: string, conversation: () => Promise<string>) => {
    if (sent[key]) return;
    setSent((s) => ({ ...s, [key]: "sending" }));
    try {
      await sendInvite(await conversation(), kind, { roomId, gameId });
      setSent((s) => ({ ...s, [key]: "sent" }));
    } catch (e) {
      setSent((s) => {
        const n = { ...s };
        delete n[key];
        return n;
      });
      toast(errText(e, "Couldn't send the invite."), "error");
    }
  };

  const Row = ({ k, name, avatar, group, sub, onSend }: { k: string; name: string; avatar?: string; group?: boolean; sub?: string; onSend: () => void }) => (
    <li className="flex items-center gap-3 px-5 py-2">
      {group ? (
        <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-[#f4515b] text-white">
          <Users className="h-5 w-5" />
        </span>
      ) : avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
      ) : (
        <span className="grid h-11 w-11 place-items-center rounded-full bg-surface font-bold text-cream">{name.slice(0, 1)}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-cream">{name}</span>
        {sub ? <span className="block truncate text-[11.5px] text-muted">{sub}</span> : null}
      </span>
      <motion.button whileTap={{ scale: 0.92 }} type="button" disabled={Boolean(sent[k])} onClick={onSend} className={`flex h-8 items-center gap-1 rounded-full px-3.5 text-[12px] font-bold ${sent[k] === "sent" ? "bg-speak/20 text-speak" : "bg-coral text-white"} disabled:opacity-90`}>
        {sent[k] === "sent" ? (
          <>
            <Check className="h-3.5 w-3.5" /> Sent
          </>
        ) : sent[k] === "sending" ? (
          "…"
        ) : (
          <>
            <Send className="h-3.5 w-3.5" /> Invite
          </>
        )}
      </motion.button>
    </li>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={title} tall>
      {code ? (
        <div className="mx-5 mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#7b5cff]/20 to-coral/15 px-4 py-3 ring-1 ring-[#7b5cff]/30">
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{kind === "GAME" ? "Table code" : "Room ID"}</span>
            <span className="font-mono text-[22px] font-extrabold tracking-[0.18em] text-cream">{code}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(code).catch(() => undefined);
              toast(`${code} copied`);
            }}
            className="flex h-9 items-center gap-1 rounded-full bg-white/10 px-3 text-[12px] font-bold text-cream"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
      ) : null}
      <p className="px-5 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Chats</p>
      <ul>
        {chats.length === 0 ? <li className="px-5 py-3 text-[13px] text-muted">No chats yet.</li> : null}
        {chats.map((c) => (
          <Row key={`c${c.id}`} k={`c${c.id}`} name={c.otherName ?? "Chat"} avatar={c.otherAvatarUrl} group={c.kind === "GROUP"} sub={c.kind === "GROUP" ? `${c.memberCount ?? ""} members` : c.otherOnline ? "Online" : undefined} onSend={() => void send(`c${c.id}`, async () => c.id)} />
        ))}
      </ul>
      {others.length ? (
        <>
          <p className="px-5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Friends</p>
          <ul className="pb-6">
            {others.map((f) => (
              <Row key={`f${f.userId}`} k={`f${f.userId}`} name={f.name} avatar={f.avatarUrl} sub={f.online ? "Online" : undefined} onSend={() => void send(`f${f.userId}`, () => chat.conversationWith(f.userId))} />
            ))}
          </ul>
        </>
      ) : null}
    </BottomSheet>
  );
}
