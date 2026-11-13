"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { titlesApi, type MyTitles, type ProfileTitle } from "@/lib/api/titles";
import { myUserIdFromToken } from "@/lib/auth/token";
import { ME_ID, useApp } from "@/lib/app/store";

/* Profile titles: coloured name tags the admin makes. Everyone can see what a person wears; you wear, take off or buy your own. */

const n = (v: number) => v.toLocaleString("en-IN");
const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : "That didn't work. Try again.");

export function TitlePill({ t, size = "md" }: { t: ProfileTitle; size?: "sm" | "md" }) {
  const sm = size === "sm";
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full font-bold leading-none shadow-[0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-white/25 ${sm ? "py-[3px] pl-1 pr-2 text-[10.5px]" : "py-1 pl-1.5 pr-3 text-[12.5px]"}`}
      style={{ background: `linear-gradient(90deg, ${t.colorFrom}, ${t.colorTo})`, color: t.textColor }}
    >
      {t.iconUrl ? (
        <span className={sm ? "block h-4 w-4 shrink-0" : "block h-6 w-6 shrink-0"}>
          <SvgaAnim src={t.iconUrl} className="h-full w-full object-contain" />
        </span>
      ) : (
        <span className={sm ? "text-[10px]" : "text-[12px]"}>★</span>
      )}
      <span className="truncate">{t.name}</span>
    </span>
  );
}

/* A small cache so a profile does not ask again and again. Wearing something clears it. */
const cache = new Map<string, { at: number; value: ProfileTitle[] }>();
const listeners = new Set<() => void>();
let version = 0;
const bump = () => {
  cache.clear();
  version++;
  listeners.forEach((l) => l());
};

function userIdOf(personId: string): string | null {
  if (personId === ME_ID) return myUserIdFromToken() ?? null;
  return personId.startsWith("srv-user:") ? personId.slice(9) : null;
}

/** The titles someone wears, shown on their profile. */
export function WornTitles({ personId, className = "" }: { personId: string; className?: string }) {
  const { session } = useApp();
  const v = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
    () => 0,
  );
  const [list, setList] = useState<ProfileTitle[]>([]);
  useEffect(() => {
    const uid = userIdOf(personId);
    if (!uid || !session) return;
    const hit = cache.get(uid);
    if (hit && Date.now() - hit.at < 60_000) {
      setList(hit.value);
      return;
    }
    let live = true;
    titlesApi
      .of(uid)
      .then((r) => {
        cache.set(uid, { at: Date.now(), value: r });
        if (live) setList(r);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [personId, session, v]);
  if (!list.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {list.map((t) => (
        <TitlePill key={t.id} t={t} />
      ))}
    </div>
  );
}

/** Your titles: wear up to the limit, take one off, or buy one with coins. */
export function MyTitlesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast, refreshCoins } = useApp();
  const [d, setD] = useState<MyTitles | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setErr("");
    titlesApi
      .mine()
      .then(setD)
      .catch((e) => setErr(errText(e)));
  }, [open]);
  const run = async (key: string, f: () => Promise<MyTitles>, ok?: string) => {
    setBusy(key);
    try {
      setD(await f());
      bump();
      if (ok) toast(ok, "gold");
      void refreshCoins();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setBusy(null);
    }
  };
  const wearing = d?.owned.filter((t) => t.worn).length ?? 0;
  return (
    <BottomSheet open={open} onClose={onClose} title="My titles" tall>
      <div className="px-4 pb-8">
        {!d ? (
          err ? (
            <p className="my-6 rounded-2xl bg-coral/10 p-4 text-center text-[13px] text-coral">{err}</p>
          ) : (
            <div className="mx-auto my-10 h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-gold" aria-label="Loading" />
          )
        ) : (
          <>
            <p className="text-[12.5px] text-muted">
              Wearing <b className="text-gold">{wearing}</b>{d.maxWorn > 0 ? ` of ${d.maxWorn}` : ""}. Worn titles show on your profile for everyone.
            </p>
            <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Your titles</p>
            <ul className="space-y-2">
              {!d.owned.length ? <li className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-muted ring-1 ring-line">You don&apos;t have a title yet. Buy one below or win one in a Family Treasure chest.</li> : null}
              {d.owned.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                  <span className="min-w-0 flex-1">
                    <TitlePill t={t} />
                    {t.expiresAt ? <span className="mt-1 block text-[10.5px] text-muted">until {new Date(t.expiresAt).toLocaleDateString("en-IN")}</span> : null}
                  </span>
                  {t.worn ? (
                    <button type="button" disabled={busy !== null} onClick={() => void run(t.id, () => titlesApi.takeOff(t.id))} className="rounded-full bg-cream/10 px-3.5 py-2 text-[12.5px] font-extrabold text-cream disabled:opacity-45">
                      Take off
                    </button>
                  ) : (
                    <button type="button" disabled={busy !== null} onClick={() => void run(t.id, () => titlesApi.wear(t.id), `${t.name} is on your profile`)} className="rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] px-3.5 py-2 text-[12.5px] font-extrabold text-[#2a1a0c] disabled:opacity-45">
                      Wear
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {d.store.length ? (
              <>
                <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Get more</p>
                <ul className="space-y-2">
                  {d.store.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                      <span className="min-w-0 flex-1">
                        <TitlePill t={t} />
                      </span>
                      <button type="button" disabled={busy !== null} onClick={() => void run(t.id, () => titlesApi.buy(t.id), `${t.name} is yours`)} className="flex items-center gap-1 rounded-full bg-gold/15 px-3.5 py-2 text-[12.5px] font-extrabold text-gold ring-1 ring-gold/40 disabled:opacity-45">
                        🪙 {n(t.priceCoins)}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/** The "My titles" button on your own profile. */
export function MyTitlesButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-cream/10 px-2.5 py-1 text-[11px] font-bold text-gold ring-1 ring-gold/30 active:scale-95">
        ＋ My titles
      </button>
      <MyTitlesSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
