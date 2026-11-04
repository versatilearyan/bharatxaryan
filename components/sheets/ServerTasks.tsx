"use client";

/**
 * Daily tasks from the server (GET /api/v1/tasks/daily): the list is set in the
 * admin panel, progress is counted by the server, and claiming adds real coins
 * to your balance (POST /api/v1/tasks/daily/{id}/claim).
 */
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Gift, Loader2, Mic, MessageCircle, Camera, Gamepad2, UserPlus, CalendarCheck, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/app/store";
import { Coin } from "@/components/ui/kit";

type Task = { id: string; title: string; kind: string; goal: number; progress: number; rewardCoins: number; rewardExp: number; claimed: boolean; done: boolean };

const ICON: Record<string, LucideIcon> = {
  CHECK_IN: CalendarCheck,
  VOICE_MINUTES: Mic,
  SEND_GIFT: Gift,
  PLAY_GAME: Gamepad2,
  INVITE_FRIEND: UserPlus,
  SEND_MESSAGE: MessageCircle,
  POST_MOMENT: Camera,
};

export async function fetchDailyTasks(): Promise<Task[]> {
  const d = await api<{ tasks?: Task[] }>("/api/v1/tasks/daily", { auth: true });
  return Array.isArray(d?.tasks) ? d.tasks : [];
}

export function ServerTasks({ open }: { open: boolean }) {
  const { refreshCoins } = useApp();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [won, setWon] = useState<{ coins: number; exp: number } | null>(null);

  const load = useCallback(() => {
    setError("");
    fetchDailyTasks()
      .then(setTasks)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load tasks."));
  }, []);
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const claim = async (t: Task) => {
    setBusy(t.id);
    setError("");
    try {
      const r = await api<{ coins: number; exp: number }>(`/api/v1/tasks/daily/${t.id}/claim`, { method: "POST", auth: true });
      setTasks((list) => (list ?? []).map((x) => (x.id === t.id ? { ...x, claimed: true } : x)));
      setWon({ coins: r.coins, exp: r.exp });
      window.setTimeout(() => setWon(null), 1800);
      void refreshCoins();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't claim.");
      load();
    } finally {
      setBusy(null);
    }
  };

  const doneCount = (tasks ?? []).filter((t) => t.claimed).length;

  return (
    <div className="relative px-5 pb-5">
      {tasks ? (
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-coral/20 to-gold/20 px-4 py-2.5 ring-1 ring-gold/20">
          <span className="text-[12.5px] font-semibold text-cream">
            {doneCount}/{tasks.length} claimed today
          </span>
          <span className="flex items-center gap-1 text-[12.5px] font-bold text-gold">
            <Coin className="h-3.5 w-3.5" /> {tasks.reduce((a, t) => a + t.rewardCoins, 0).toLocaleString("en-IN")} total
          </span>
        </div>
      ) : null}
      {!tasks && !error ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-gold" aria-label="Loading tasks" />
        </div>
      ) : null}
      {error ? (
        <p className="mb-2 rounded-xl bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {(tasks ?? []).map((t) => {
          const Icon = ICON[t.kind] ?? Gift;
          return (
            <li key={t.id} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${t.done && !t.claimed ? "bg-gold/[0.07] ring-gold/30" : "bg-surface ring-line"}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${t.claimed ? "bg-speak/15 text-speak" : "bg-cream/[0.06] text-gold"}`}>{t.claimed ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-cream">{t.title}</span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream/10">
                    <motion.span className="block h-full rounded-full bg-gradient-to-r from-coral to-gold" initial={{ width: 0 }} animate={{ width: `${(Math.min(t.progress, t.goal) / t.goal) * 100}%` }} />
                  </span>
                  <span className="text-[11px] text-muted">
                    {Math.min(t.progress, t.goal)}/{t.goal}
                  </span>
                </span>
                {t.rewardExp ? <span className="mt-0.5 block text-[10.5px] text-muted">+{t.rewardExp} EXP</span> : null}
              </span>
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                disabled={!t.done || t.claimed || busy !== null}
                onClick={() => void claim(t)}
                className={`flex h-9 min-w-[80px] items-center justify-center gap-1 rounded-full px-3 text-[12px] font-bold ${t.claimed ? "bg-cream/10 text-muted" : t.done ? "bg-gold text-ink shadow-[0_0_14px_rgba(231,188,114,0.45)]" : "bg-cream/[0.06] text-cream/60"}`}
              >
                {busy === t.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : t.claimed ? (
                  "Claimed"
                ) : (
                  <>
                    <Coin className="h-3.5 w-3.5" />+{t.rewardCoins.toLocaleString("en-IN")}
                  </>
                )}
              </motion.button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-[11px] text-muted">Tasks reset every day at midnight. Coins go straight to your balance.</p>
      <AnimatePresence>
        {won ? (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center rounded-3xl bg-ink/95 px-8 py-5 ring-1 ring-gold/40">
              <Coin className="h-10 w-10" />
              <span className="mt-1 font-display text-[22px] font-bold text-gold">+{won.coins.toLocaleString("en-IN")}</span>
              {won.exp ? <span className="text-[12px] text-cream/80">+{won.exp} EXP</span> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
