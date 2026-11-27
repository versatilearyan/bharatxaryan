"use client";

/**
 * Friends instead of Follow, everywhere a person is shown:
 *   Add friend → Requested (tap to cancel) → they Accept → Friends ✓ (tap to unfriend)
 *   They asked you: Accept (and × to reject)
 * And Propose, only when neither of you has a CP.
 */
import { useCallback, useEffect, useState } from "react";
import { Check, Clock, Heart, UserCheck, UserPlus, X } from "lucide-react";
import { friendsApi, type FollowStatus } from "@/lib/api/social";
import { cpApi } from "@/lib/api/cp";
import { refreshActivity } from "@/lib/app/activity-store";
import { useApp } from "@/lib/app/store";

export type FriendState = "none" | "sent" | "incoming" | "friends";

export function friendState(st: Pick<FollowStatus, "following" | "followsYou"> | null): FriendState {
  if (!st) return "none";
  if (st.following && st.followsYou) return "friends";
  if (st.following) return "sent";
  if (st.followsYou) return "incoming";
  return "none";
}

/** The friendship with one person, from the server, with the actions. */
export function useFriendship(userId: string | null) {
  const { toast } = useApp();
  const [st, setSt] = useState<FollowStatus | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    friendsApi
      .status(userId)
      .then((s) => live && setSt(s))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [userId]);
  const run = useCallback(
    async (f: () => Promise<FollowStatus>, done?: (s: FollowStatus) => string | null) => {
      if (busy) return;
      setBusy(true);
      try {
        const s = await f();
        setSt(s);
        const t = done?.(s);
        if (t) toast(t);
        refreshActivity(true);
      } catch (e) {
        toast(e instanceof Error && e.message ? e.message : "That didn't work.", "error");
      } finally {
        setBusy(false);
      }
    },
    [busy, toast],
  );
  const state = friendState(st);
  return {
    state,
    loaded: st !== null,
    busy,
    add: () => userId && run(() => friendsApi.follow(userId), (s) => (s.friends ? "You're friends now 🤝" : "Friend request sent")),
    accept: () => userId && run(() => friendsApi.follow(userId), () => "You're friends now 🤝"),
    reject: () => userId && run(() => friendsApi.decline(userId), () => "Request removed"),
    cancel: () => userId && run(() => friendsApi.unfollow(userId), () => "Request cancelled"),
    unfriend: () => userId && run(() => friendsApi.unfriend(userId), () => "Removed from friends"),
  };
}

/** One button for the friendship: Add friend / Requested / Accept / Friends. `light` for the white room card. */
export function FriendButton({ userId, light = false, className = "" }: { userId: string; light?: boolean; className?: string }) {
  const f = useFriendship(userId);
  const [confirm, setConfirm] = useState(false);
  const base = `flex h-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-bold disabled:opacity-60 ${className}`;
  if (!f.loaded) return <span className={`${base} animate-pulse ${light ? "bg-[#f1edf4]" : "bg-white/10"}`} aria-busy />;
  if (f.state === "incoming")
    return (
      <span className={`flex gap-1.5 ${className}`}>
        <button type="button" disabled={f.busy} onClick={() => void f.accept()} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-[#f6d899] to-[#d9a84f] text-[#2a1a0c] text-[13px] font-extrabold disabled:opacity-60">
          <Check className="h-4 w-4" /> Accept
        </button>
        <button type="button" disabled={f.busy} onClick={() => void f.reject()} aria-label="Reject friend request" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${light ? "bg-[#f1edf4] text-[#3a3340]" : "bg-white/10 text-cream"}`}>
          <X className="h-4 w-4" />
        </button>
      </span>
    );
  if (f.state === "sent")
    return (
      <button type="button" disabled={f.busy} onClick={() => void f.cancel()} className={`${base} ${light ? "bg-[#f1edf4] text-[#3a3340]" : "bg-white/10 text-cream"}`} aria-label="Friend request sent. Tap to cancel">
        <Clock className="h-4 w-4" /> Requested
      </button>
    );
  if (f.state === "friends")
    return confirm ? (
      <button type="button" disabled={f.busy} onClick={() => (setConfirm(false), void f.unfriend())} className={`${base} bg-[#e2404a] text-white`}>
        <X className="h-4 w-4" /> Unfriend?
      </button>
    ) : (
      <button type="button" onClick={() => setConfirm(true)} className={`${base} ${light ? "bg-[#eaf8f0] text-[#178a52]" : "bg-[#3ddc97]/15 text-[#3ddc97]"}`}>
        <UserCheck className="h-4 w-4" /> Friends
      </button>
    );
  return (
    <button type="button" disabled={f.busy} onClick={() => void f.add()} className={`${base} bg-gradient-to-b from-[#f6d899] to-[#d9a84f] text-[#2a1a0c]`}>
      <UserPlus className="h-4 w-4" /> Add friend
    </button>
  );
}

/** True when neither you nor they have a CP (so a proposal can be made); null while checking. */
export function useCanPropose(userId: string | null): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    Promise.all([cpApi.mine(), cpApi.of(userId)])
      .then(([a, b]) => live && setOk(!a && !b))
      .catch(() => live && setOk(false));
    return () => {
      live = false;
    };
  }, [userId]);
  return ok;
}

export function ProposeButton({ onPropose, light = false }: { onPropose: () => void; light?: boolean }) {
  return (
    <button type="button" onClick={onPropose} className={`mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-bold ring-1 ${light ? "bg-gradient-to-r from-[#fff0f5] to-[#ffe4ee] text-[#c2185b] ring-[#f8bbd0]" : "bg-gradient-to-r from-[#4a1626] to-[#2c1622] text-[#ffb3cf] ring-[#ff7fa8]/40"}`}>
      <Heart className="h-4 w-4" /> 💍 Propose
    </button>
  );
}
