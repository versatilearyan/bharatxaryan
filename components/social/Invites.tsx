"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Lock, Send, Users } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { friendsApi, type FriendCard } from "@/lib/api/social";
import { gameByCode, sendInvite, sendTableInvite, type ChatInvite } from "@/lib/api/invites";
import { gaddarTables } from "@/lib/api/gaddar";
import { rmcsTables } from "@/lib/api/rmcs";
import { getRoomById, rememberRoomPassword } from "@/lib/api/voice-rooms";
import { useChat } from "@/lib/app/chat-store";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { lazySheet } from "@/components/ui/lazySheet";
import { coupleNames, mayEnterCoupleRoom } from "@/lib/app/couple-room";
import { myUserIdFromToken } from "@/lib/auth/token";

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
        // A Couple Room is only for its two partners, even with an invite
        if (!mayEnterCoupleRoom({ name: v.name, settings: v.settings, hostId: "" }, myUserIdFromToken())) {
          toast(`💞 ${coupleNames(v)}'s Couple Room is only for the two of them`);
          return;
        }
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

/** Join a table that has no voice room, from an invite card's code. */
function useJoinTable() {
  const { push, toast } = useApp();
  return async (game: string | undefined, code: string) => {
    try {
      if (game === "RMCS") {
        const t = await rmcsTables.join(code);
        push({ kind: "rmcs", table: t.roomId });
      } else {
        const b = await gaddarTables.join(code);
        if (b.state.table?.id) push({ kind: "gaddar", table: b.state.table.id });
      }
    } catch (e) {
      toast(errText(e, "That table is closed."), "error");
    }
  };
}

/** The invite card for a table game, in the Panchayat colours: maroon, marigold and gold. */
function TableInviteCard({ inv, mine }: { inv: ChatInvite; mine: boolean }) {
  const joinTable = useJoinTable();
  const [busy, setBusy] = useState(false);
  const expired = inv.expiresAt !== undefined && inv.expiresAt < Date.now();
  const rm = inv.game === "RMCS";
  return (
    <div className="w-[250px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#4a1626] to-[#240c14] ring-1 ring-[#e7bc72]/40">
      <div className={`relative h-[90px] overflow-hidden ${rm ? "bg-gradient-to-br from-[#7a1f3d] via-[#c2417a] to-[#ffb347]" : "bg-gradient-to-br from-[#5a1a3a] via-[#c2417a] to-[#ff8a3d]"}`}>
        <span className="absolute -right-3 -top-4 text-[74px] opacity-90" aria-hidden>
          {rm ? "👑" : "🛖"}
        </span>
        <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10.5px] font-extrabold text-[#ffe9a8] backdrop-blur">🎮 GAME INVITE</span>
        <span className="absolute bottom-1.5 left-2.5 right-2.5 truncate font-display text-[16px] font-black text-white drop-shadow">{inv.roomName}</span>
      </div>
      <div className="px-3 pb-3 pt-2 text-[12px] text-cream/80">
        <p>
          Table code <b className="font-mono text-[15px] tracking-[0.2em] text-[#ffe27a]">{inv.gameCode}</b>
        </p>
        {mine ? (
          <p className="mt-1.5 text-center text-[11px] text-cream/55">You sent this invite</p>
        ) : (
          <button
            type="button"
            disabled={busy || expired || !inv.gameCode}
            onClick={() => {
              setBusy(true);
              void joinTable(inv.game, inv.gameCode ?? "").finally(() => setBusy(false));
            }}
            className="mt-2 h-10 w-full rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e0a93a] text-[13.5px] font-black uppercase text-[#4a2600] shadow-[0_3px_0_#8a5a12] disabled:opacity-50"
          >
            {expired ? "Invite expired" : busy ? "Joining…" : "Table me judo"}
          </button>
        )}
      </div>
    </div>
  );
}

/** An invite in a chat: the room (or game) with a Join button. */
export function InviteCard({ inv, mine }: { inv: ChatInvite; mine: boolean }) {
  const join = useJoinFromInvite();
  const [busy, setBusy] = useState(false);
  const expired = inv.expiresAt !== undefined && inv.expiresAt < Date.now();
  const game = inv.kind === "GAME";
  if (inv.kind === "TABLE") return <TableInviteCard inv={inv} mine={mine} />;
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
        <span className="absolute bottom-1.5 left-2.5 right-2.5 truncate font-display text-[15px] font-extrabold text-white">{game ? `${inv.game === "JACKAROO" ? "Jackaroo" : inv.game === "LUDO" ? "Ludo" : (inv.game ?? "Game")} in ${inv.roomName}` : inv.roomName}</span>
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
function ChatInviteSheetImpl({ open, onClose, kind, roomId, gameId, code, title, table }: { open: boolean; onClose: () => void; kind: "ROOM" | "GAME"; roomId: string; gameId?: string; code?: string; title: string; table?: "GADDAR" | "RMCS" }) {
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
      const conv = await conversation();
      // A table with no voice room: the card carries its code
      if (table && code) await sendTableInvite(conv, table, code);
      else await sendInvite(conv, kind, { roomId, gameId });
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
export const ChatInviteSheet = lazySheet(ChatInviteSheetImpl);
