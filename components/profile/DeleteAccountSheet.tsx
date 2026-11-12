"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/app/store";

/** Deleting your own account: names and picture are removed, you are signed out everywhere, coins left are lost. */
export function DeleteAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signOut, toast } = useApp();
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async () => {
    if (word.trim() !== "DELETE" || busy) return;
    setBusy(true);
    setError("");
    try {
      await api<unknown>("/api/v1/users/me/account", { auth: true, method: "DELETE", body: { confirm: "DELETE" } });
      toast("Your account was deleted");
      onClose();
      signOut();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't delete the account. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={open} onClose={busy ? () => undefined : onClose} title="Delete my account">
      <div className="space-y-3 px-5 pb-6 pt-1">
        <p className="text-[13px] leading-snug text-cream/85">This removes your name, picture and bio, closes your rooms, takes you out of your Parivar and signs you out everywhere. It can&apos;t be undone.</p>
        <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-cream/70">
          <li>Coins and VIP left on this account are lost.</li>
          <li>Gifts and messages you sent stay in other people&apos;s history, without your name.</li>
          <li>If you are the Mukhiya of a Parivar with members, hand over leadership first.</li>
        </ul>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-cream/70">Type DELETE to confirm</span>
          <input value={word} onChange={(e) => setWord(e.target.value)} autoCapitalize="characters" autoComplete="off" aria-label="Type DELETE to confirm" className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-cream focus:border-coral/60 focus:outline-none" />
        </label>
        {error ? (
          <p role="alert" className="rounded-2xl bg-[#3a1418] px-3.5 py-3 text-[12.5px] text-[#ffb0b4] ring-1 ring-coral/25">
            {error}
          </p>
        ) : null}
        <button type="button" onClick={() => void go()} disabled={word.trim() !== "DELETE" || busy} className="h-12 w-full rounded-full bg-coral text-[15px] font-extrabold text-white disabled:opacity-40">
          {busy ? "Deleting…" : "Delete my account"}
        </button>
        <button type="button" onClick={onClose} disabled={busy} className="h-11 w-full rounded-full text-[14px] font-semibold text-cream/70">
          Keep my account
        </button>
      </div>
    </BottomSheet>
  );
}
