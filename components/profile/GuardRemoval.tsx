"use client";

/**
 * Removing the Guard between two people, from the Guard screen:
 *  - RemovalRequests: asks that came to you (accept: the Guard is gone both ways; refuse: nothing changes).
 *  - RemoveGuardSheet: ask the other person (free), or remove it right away for coins (the price is set in the admin panel).
 */
import { useCallback, useEffect, useState } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { guardRemovalApi, type RemovalState } from "@/lib/api/guard-removal";
import { useApp } from "@/lib/app/store";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin } from "@/components/ui/kit";

export function useGuardRemoval(enabled: boolean, onGuardChanged: () => void) {
  const { toast, refreshCoins } = useApp();
  const [state, setState] = useState<RemovalState | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    if (!enabled) return;
    guardRemovalApi
      .state()
      .then(setState)
      .catch(() => undefined);
  }, [enabled]);
  useEffect(load, [load]);
  const run = useCallback(
    async (f: () => Promise<RemovalState>, done: string, changesGuard: boolean) => {
      if (busy) return false;
      setBusy(true);
      try {
        setState(await f());
        toast(done, "gold");
        if (changesGuard) {
          onGuardChanged();
          void refreshCoins?.();
        }
        return true;
      } catch (e) {
        toast(e instanceof Error && e.message ? e.message : "That didn't work. Try again.", "error");
        load();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, toast, onGuardChanged, refreshCoins, load],
  );
  return {
    state,
    busy,
    ask: (userId: string) => run(() => guardRemovalApi.request(userId), "Request sent", false),
    accept: (id: string) => run(() => guardRemovalApi.accept(id), "The Guard was removed", true),
    refuse: (id: string) => run(() => guardRemovalApi.refuse(id), "You refused. The Guard stays", false),
    cancel: (id: string) => run(() => guardRemovalApi.cancel(id), "Request taken back", false),
    force: (userId: string) => run(() => guardRemovalApi.force(userId), "The Guard was removed", true),
  };
}

export type GuardRemoval = ReturnType<typeof useGuardRemoval>;

/** Asks from other people that wait for your answer. */
export function RemovalRequests({ rm }: { rm: GuardRemoval }) {
  const list = rm.state?.incoming ?? [];
  if (!list.length) return null;
  return (
    <section className="mx-4 mt-3 space-y-2" aria-label="Guard removal requests">
      {list.map((r) => (
        <div key={r.id} className="rounded-2xl bg-gradient-to-br from-[#3a1d24] to-[#241820] p-3.5 ring-1 ring-coral/35">
          <p className="flex items-center gap-2 text-[13.5px] font-bold text-cream">
            <ShieldOff className="h-4 w-4 shrink-0 text-coral" aria-hidden /> {r.name} wants to remove the Guard between you two
          </p>
          <p className="mt-1 text-[12px] text-cream/65">If you accept, the Guard is deleted both ways for good. If you refuse, nothing changes.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={rm.busy} onClick={() => void rm.refuse(r.id)} className="h-10 rounded-full bg-cream/10 text-[13.5px] font-bold text-cream disabled:opacity-50">
              Refuse
            </button>
            <button type="button" disabled={rm.busy} onClick={() => void rm.accept(r.id)} className="h-10 rounded-full bg-coral text-[13.5px] font-extrabold text-white disabled:opacity-50">
              Accept
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

export function RemoveGuardSheet({ rm, target, onClose }: { rm: GuardRemoval; target: { userId: string; name: string } | null; onClose: () => void }) {
  const [sure, setSure] = useState(false);
  useEffect(() => setSure(false), [target?.userId]);
  const cost = rm.state?.forceCost ?? 1_000_000;
  const mine = target ? rm.state?.outgoing.find((o) => o.userId === target.userId) : undefined;
  const waiting = mine?.status === "PENDING";
  const refused = mine?.status === "REFUSED";
  const theirs = target ? rm.state?.incoming.find((o) => o.userId === target.userId) : undefined;
  const done = async (f: () => Promise<boolean>) => {
    if (await f()) onClose();
  };
  return (
    <BottomSheet open={Boolean(target)} onClose={onClose} title={target ? `Remove Guard with ${target.name}` : "Remove Guard"}>
      {target ? (
        <div className="px-4 pb-5">
          <p className="text-[13px] leading-relaxed text-cream/75">
            This removes the Guard between you two, both ways, for good: the daily protects, the ring charm and the gifts that counted for it. It can't be brought back.
          </p>

          {theirs ? (
            <div className="mt-4 rounded-2xl bg-white/[0.06] p-3.5">
              <p className="text-[13px] font-semibold text-cream">{target.name} already asked you to remove it.</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button type="button" disabled={rm.busy} onClick={() => void done(() => rm.refuse(theirs.id))} className="h-10 rounded-full bg-cream/10 text-[13.5px] font-bold text-cream">
                  Refuse
                </button>
                <button type="button" disabled={rm.busy} onClick={() => void done(() => rm.accept(theirs.id))} className="h-10 rounded-full bg-coral text-[13.5px] font-extrabold text-white">
                  Accept
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-2xl bg-white/[0.06] p-3.5">
                <p className="text-[13.5px] font-bold text-cream">Ask {target.name}</p>
                <p className="mt-0.5 text-[12px] text-cream/60">Free. If they accept, the Guard is removed. If they refuse, nothing changes.</p>
                {waiting ? (
                  <button type="button" disabled={rm.busy} onClick={() => void rm.cancel(mine!.id)} className="mt-2.5 h-10 w-full rounded-full bg-cream/10 text-[13.5px] font-bold text-cream">
                    Request sent. Waiting for {target.name}. Tap to take it back
                  </button>
                ) : refused ? (
                  <p className="mt-2.5 rounded-full bg-cream/10 px-4 py-2.5 text-center text-[12.5px] font-semibold text-cream/70">{target.name} refused. You can ask again tomorrow.</p>
                ) : (
                  <button type="button" disabled={rm.busy} onClick={() => void done(() => rm.ask(target.userId))} className="mt-2.5 h-10 w-full rounded-full bg-gold text-[13.5px] font-extrabold text-ink disabled:opacity-50">
                    Send request
                  </button>
                )}
              </div>

              <div className="mt-3 rounded-2xl bg-white/[0.06] p-3.5">
                <p className="text-[13.5px] font-bold text-cream">Remove right away</p>
                <p className="mt-0.5 text-[12px] text-cream/60">{target.name} doesn&apos;t have to agree. It costs coins and they get a message.</p>
                {sure ? (
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button type="button" disabled={rm.busy} onClick={() => setSure(false)} className="h-10 rounded-full bg-cream/10 text-[13.5px] font-bold text-cream">
                      Cancel
                    </button>
                    <button type="button" disabled={rm.busy} onClick={() => void done(() => rm.force(target.userId))} className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-coral text-[13.5px] font-extrabold text-white disabled:opacity-50">
                      Pay <Coin className="h-4 w-4" /> {cost.toLocaleString("en-IN")}
                    </button>
                  </div>
                ) : (
                  <button type="button" disabled={rm.busy} onClick={() => setSure(true)} className="mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-coral/90 text-[13.5px] font-extrabold text-white">
                    <Shield className="h-4 w-4" aria-hidden /> Remove for <Coin className="h-4 w-4" /> {cost.toLocaleString("en-IN")}
                  </button>
                )}
              </div>
            </>
          )}
          <button type="button" onClick={onClose} className="mt-2 block w-full py-3 text-center text-[14px] font-semibold text-muted">
            Close
          </button>
        </div>
      ) : null}
    </BottomSheet>
  );
}
