"use client";

/**
 * Group chats and chat settings (signed in):
 * - CreateGroupSheet: a name and the people to add (your chats, or search by ID or name).
 * - GroupInfoSheet: members (online, roles), and for the owner and admins: add,
 *   remove, make admin, rename. Everyone can mute or leave.
 * - ChatMenuSheet: a direct chat's mute and block.
 */
import { useEffect, useMemo, useState } from "react";
import { BellOff, Bell, Check, Crown, Loader2, LogOut, Pencil, Search, Shield, ShieldOff, UserMinus, UserPlus, Users, X, Ban } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import {
  addGroupMembers,
  createGroup,
  getGroupInfo,
  presenceText,
  removeGroupMember,
  renameGroup,
  setChatMuted,
  setGroupAdmin,
  setUserBlocked,
  type ChatConversation,
  type GroupInfo,
  type GroupMember,
} from "@/lib/api/chat";
import { searchServer, type FoundUser } from "@/lib/api/search";
import { useChat } from "@/lib/app/chat-store";
import { usePeople } from "@/lib/app/people";
import { userPersonId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { SERVER_CONV_PREFIX } from "./ServerChat";

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/* ------------------------------------------------------------------ */
/* People picker                                                       */
/* ------------------------------------------------------------------ */

type Pick = { id: string; name: string; avatarUrl?: string };

function PeoplePicker({ picked, onToggle, exclude = [] }: { picked: Pick[]; onToggle: (p: Pick) => void; exclude?: string[] }) {
  const { inbox, myId } = useChat();
  const person = usePeople();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<FoundUser[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // People you already chat with, first
  const recent: Pick[] = useMemo(
    () =>
      (inbox.data ?? [])
        .filter((c) => c.kind === "DIRECT" && c.otherUserId && !exclude.includes(c.otherUserId) && c.otherUserId !== myId)
        .slice(0, 20)
        .map((c) => ({ id: c.otherUserId!, name: c.otherName ?? `User ${c.otherPublicId ?? ""}`, avatarUrl: c.otherAvatarUrl })),
    [inbox.data, exclude, myId],
  );
  const run = () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    setError("");
    searchServer(q)
      .then((r) => setFound(r.users.filter((u) => u.id !== myId && !exclude.includes(u.id))))
      .catch((e) => setError(errText(e, "Search didn't work.")))
      .finally(() => setBusy(false));
  };
  const list: Pick[] = found ? found.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl })) : recent;
  const on = (id: string) => picked.some((p) => p.id === id);
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-3">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value.slice(0, 40))} placeholder="Search by ID or name" aria-label="Search people" className="min-w-0 flex-1 bg-transparent text-[14px] text-cream placeholder:text-muted/70 focus:outline-none" />
        </label>
        <button type="submit" disabled={q.trim().length < 2 || busy} className="h-11 rounded-2xl bg-cream/10 px-4 text-[13px] font-bold text-cream disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </form>
      {error ? <p className="mt-2 text-[12px] text-coral">{error}</p> : null}
      <p className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wide text-muted">{found ? "Results" : "Your chats"}</p>
      <ul className="max-h-[38vh] overflow-y-auto">
        {list.length === 0 ? <li className="py-4 text-center text-[12.5px] text-muted">{found ? "No one found." : "Search for people by their ID or name."}</li> : null}
        {list.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onToggle(p)} className="flex w-full items-center gap-3 py-2 text-left" aria-pressed={on(p.id)}>
              <PersonAvatar person={{ ...person(userPersonId(p.id)), photo: p.avatarUrl ?? person(userPersonId(p.id)).photo, frame: "none" }} size={40} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-cream">{p.name}</span>
              <span className={`grid h-6 w-6 place-items-center rounded-full ring-1 ${on(p.id) ? "bg-coral text-white ring-coral" : "ring-line-strong"}`}>{on(p.id) ? <Check className="h-3.5 w-3.5" /> : null}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chips({ picked, onRemove }: { picked: Pick[]; onRemove: (id: string) => void }) {
  if (!picked.length) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {picked.map((p) => (
        <span key={p.id} className="flex items-center gap-1 rounded-full bg-coral/15 py-1 pl-2.5 pr-1 text-[12px] font-semibold text-cream">
          {p.name}
          <button type="button" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`} className="grid h-5 w-5 place-items-center rounded-full bg-black/20">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New group                                                           */
/* ------------------------------------------------------------------ */

export function CreateGroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { openConversation, toast } = useApp();
  const { loadInbox } = useChat();
  const { rememberPeople } = useServerRooms();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Pick[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => {
    onClose();
    setName("");
    setPicked([]);
    setError("");
  };
  const toggle = (p: Pick) => setPicked((l) => (l.some((x) => x.id === p.id) ? l.filter((x) => x.id !== p.id) : [...l, p]));
  const create = () => {
    if (!name.trim()) return setError("Give the group a name.");
    if (!picked.length) return setError("Add at least one person.");
    setBusy(true);
    setError("");
    rememberPeople(Object.fromEntries(picked.map((p) => [userPersonId(p.id), { name: p.name, avatarUrl: p.avatarUrl }])));
    createGroup(name.trim(), picked.map((p) => p.id))
      .then((g) => {
        loadInbox(true);
        toast(`${g.name} is ready`);
        close();
        openConversation(`${SERVER_CONV_PREFIX}${g.conversationId}`);
      })
      .catch((e) => setError(errText(e, "Couldn't make the group.")))
      .finally(() => setBusy(false));
  };
  return (
    <BottomSheet open={open} onClose={close} title="New group" tall>
      <div className="px-5 pb-6">
        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">Group name</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder="e.g. Chai Adda Gang" className="h-11 w-full rounded-2xl border border-line bg-surface px-3.5 text-[14px] text-cream placeholder:text-muted/70 focus:border-gold/50 focus:outline-none" />
        </label>
        <Chips picked={picked} onRemove={(id) => setPicked((l) => l.filter((x) => x.id !== id))} />
        <PeoplePicker picked={picked} onToggle={toggle} />
        {error ? (
          <p className="mt-2 text-[12.5px] font-semibold text-coral" role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" onClick={create} disabled={busy} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-coral text-[15px] font-bold text-white disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Create group{picked.length ? ` (${picked.length + 1})` : ""}
        </button>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Group info                                                          */
/* ------------------------------------------------------------------ */

const ROLE_TEXT = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "" } as const;

export function useGroupInfo(conversationId: string | null, enabled: boolean) {
  const { groupVersion, watchPresence } = useChat();
  const [info, setInfo] = useState<GroupInfo | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!conversationId || !enabled) return;
    let live = true;
    getGroupInfo(conversationId)
      .then((g) => {
        if (!live || !g) return;
        setInfo(g);
        watchPresence(g.members.map((m) => m.userId));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [conversationId, enabled, groupVersion, tick, watchPresence]);
  return { info, setInfo, reload: () => setTick((n) => n + 1) };
}

export function GroupInfoSheet({ open, onClose, conversationId, group, onChanged }: { open: boolean; onClose: () => void; conversationId: string; group: GroupInfo | null; onChanged: (g: GroupInfo | null) => void }) {
  const { pop, toast, setSheet } = useApp();
  const chat = useChat();
  const person = usePeople();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Pick[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  if (!group) return null;
  const me = chat.myId;
  const mine = group.myRole;
  const canManage = mine === "OWNER" || mine === "ADMIN";
  const canRemove = (m: GroupMember) => m.userId !== me && (mine === "OWNER" || (mine === "ADMIN" && m.role === "MEMBER"));
  const run = async (key: string, f: () => Promise<GroupInfo | null | unknown>, ok?: string) => {
    setBusy(key);
    try {
      const r = await f();
      if (r && typeof r === "object" && "members" in (r as object)) onChanged(r as GroupInfo);
      chat.loadInbox(true);
      if (ok) toast(ok);
      return true;
    } catch (e) {
      toast(errText(e, "That didn't work."), "error");
      return false;
    } finally {
      setBusy(null);
    }
  };
  const status = (m: GroupMember) => presenceText(chat.presence[m.userId] ?? { online: m.online, lastSeenAt: m.lastSeenAt });

  return (
    <BottomSheet open={open} onClose={onClose} title={group.name} tall>
      <div className="px-5 pb-6">
        <p className="-mt-1 mb-3 text-[12.5px] text-muted">
          Group · {group.members.length} members · {group.members.filter((m) => (chat.presence[m.userId] ?? m).online).length} online
        </p>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("mute", async () => (await setChatMuted(conversationId, !group.muted), onChanged({ ...group, muted: !group.muted })), group.muted ? "Alerts on" : "Muted")}
            className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 text-[12px] font-semibold text-cream ring-1 ring-line"
          >
            {group.muted ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            {group.muted ? "Unmute" : "Mute"}
          </button>
          {canManage ? (
            <button type="button" onClick={() => (setAdding((v) => !v), setRenaming(false))} className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 text-[12px] font-semibold text-cream ring-1 ring-line">
              <UserPlus className="h-5 w-5" /> Add people
            </button>
          ) : (
            <span />
          )}
          {canManage ? (
            <button type="button" onClick={() => (setRenaming((v) => !v), setAdding(false), setName(group.name))} className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 text-[12px] font-semibold text-cream ring-1 ring-line">
              <Pencil className="h-5 w-5" /> Rename
            </button>
          ) : (
            <span />
          )}
        </div>

        {renaming ? (
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run("rename", () => renameGroup(conversationId, name), "Group renamed").then((ok) => ok && setRenaming(false));
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} aria-label="Group name" className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-3.5 text-[14px] text-cream focus:outline-none" />
            <button type="submit" disabled={!name.trim() || busy !== null} className="h-11 rounded-2xl bg-coral px-4 text-[13px] font-bold text-white disabled:opacity-50">
              Save
            </button>
          </form>
        ) : null}

        {adding ? (
          <div className="mb-4 rounded-2xl bg-surface/60 p-3 ring-1 ring-line">
            <Chips picked={picked} onRemove={(id) => setPicked((l) => l.filter((x) => x.id !== id))} />
            <PeoplePicker picked={picked} onToggle={(p) => setPicked((l) => (l.some((x) => x.id === p.id) ? l.filter((x) => x.id !== p.id) : [...l, p]))} exclude={group.members.map((m) => m.userId)} />
            <button
              type="button"
              disabled={!picked.length || busy !== null}
              onClick={() =>
                void run("add", () => addGroupMembers(conversationId, picked.map((p) => p.id)), `${picked.length} added`).then((ok) => {
                  if (ok) {
                    setPicked([]);
                    setAdding(false);
                  }
                })
              }
              className="mt-3 h-11 w-full rounded-full bg-coral text-[14px] font-bold text-white disabled:opacity-50"
            >
              Add {picked.length || ""} to the group
            </button>
          </div>
        ) : null}

        <ul className="divide-y divide-line">
          {group.members.map((m) => {
            const p = person(userPersonId(m.userId));
            const st = status(m);
            return (
              <li key={m.userId} className="flex items-center gap-3 py-2.5">
                <button type="button" disabled={m.userId === me} onClick={() => (onClose(), setSheet({ kind: "person", personId: userPersonId(m.userId) }))} className="relative shrink-0">
                  <PersonAvatar person={{ ...p, photo: m.avatarUrl ?? p.photo, frame: "none" }} size={42} />
                  {(chat.presence[m.userId] ?? m).online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-speak ring-2 ring-[#18171d]" /> : null}
                </button>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-semibold text-cream">{m.userId === me ? "You" : m.name}</span>
                    {m.role !== "MEMBER" ? (
                      <span className={`flex items-center gap-0.5 rounded px-1 text-[10px] font-bold ${m.role === "OWNER" ? "bg-gold/15 text-gold" : "bg-cream/10 text-cream"}`}>
                        {m.role === "OWNER" ? <Crown className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />} {ROLE_TEXT[m.role]}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-[11.5px] text-muted">{st || `ID ${m.publicId}`}</span>
                </span>
                {mine === "OWNER" && m.userId !== me ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run(`admin-${m.userId}`, () => setGroupAdmin(conversationId, m.userId, m.role !== "ADMIN"), m.role === "ADMIN" ? `${m.name} is no longer an admin` : `${m.name} is now an admin`)}
                    aria-label={m.role === "ADMIN" ? `Remove ${m.name} as admin` : `Make ${m.name} an admin`}
                    className="grid h-8 w-8 place-items-center rounded-full bg-cream/[0.07] text-cream"
                  >
                    {m.role === "ADMIN" ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  </button>
                ) : null}
                {canRemove(m) ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run(`rm-${m.userId}`, () => removeGroupMember(conversationId, m.userId).then(() => getGroupInfo(conversationId)), `${m.name} removed`)}
                    aria-label={`Remove ${m.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full bg-coral/10 text-coral"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            if (!me || !window.confirm(`Leave ${group.name}?`)) return;
            void run("leave", () => removeGroupMember(conversationId, me), `You left ${group.name}`).then((ok) => {
              if (!ok) return;
              onClose();
              pop();
            });
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-coral/10 text-[14px] font-bold text-coral"
        >
          <LogOut className="h-4 w-4" /> Leave group
        </button>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Direct chat menu                                                    */
/* ------------------------------------------------------------------ */

export function ChatMenuSheet({ open, onClose, c, name, personId }: { open: boolean; onClose: () => void; c: ChatConversation | undefined; name: string; personId: string }) {
  const { toast, setSheet } = useApp();
  const chat = useChat();
  const [busy, setBusy] = useState(false);
  if (!c) return null;
  const run = async (f: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await f();
      chat.loadInbox(true);
      toast(ok);
      onClose();
    } catch (e) {
      toast(errText(e, "That didn't work."), "error");
    } finally {
      setBusy(false);
    }
  };
  const Row = ({ icon, label, sub, onClick, danger }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void; danger?: boolean }) => (
    <button type="button" disabled={busy} onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-cream/[0.04] disabled:opacity-60 ${danger ? "text-coral" : "text-cream"}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-full ${danger ? "bg-coral/10" : "bg-cream/[0.07]"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold">{label}</span>
        {sub ? <span className="block text-[11.5px] text-muted">{sub}</span> : null}
      </span>
    </button>
  );
  return (
    <BottomSheet open={open} onClose={onClose} title={name}>
      <div className="px-3 pb-6">
        <Row icon={<UserPlus className="h-4 w-4" />} label="View profile" onClick={() => (onClose(), setSheet({ kind: "person", personId }))} />
        <Row
          icon={c.muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          label={c.muted ? "Unmute" : "Mute"}
          sub={c.muted ? "Get alerts for new messages again" : "No alerts for new messages from this chat"}
          onClick={() => void run(() => setChatMuted(c.id, !c.muted), c.muted ? `${name} unmuted` : `${name} muted`)}
        />
        {c.otherUserId ? (
          <Row
            icon={<Ban className="h-4 w-4" />}
            label={c.blockedByMe ? "Unblock" : "Block"}
            sub={c.blockedByMe ? "Let them message you again" : "They can't message you and you can't message them"}
            danger={!c.blockedByMe}
            onClick={() => {
              if (!c.blockedByMe && !window.confirm(`Block ${name}? They won't be able to message you.`)) return;
              void run(() => setUserBlocked(c.otherUserId!, !c.blockedByMe), c.blockedByMe ? `${name} unblocked` : `${name} blocked`);
            }}
          />
        ) : null}
      </div>
    </BottomSheet>
  );
}
