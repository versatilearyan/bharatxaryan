"use client";

/**
 * Parivar: red packets for the family, and Help and support (what the Mukhiya can do, and the ban list).
 * The Mukhiya sends a red packet; every member opens one piece. The Mukhiya can ban and unban.
 */
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin } from "@/components/ui/kit";
import { api } from "@/lib/api/client";
import type { ParivarProfile } from "@/lib/api/parivar";
import { useApp } from "@/lib/app/store";

const base = (id: string) => `/api/v1/parivar/${id}`;
const opts = { auth: true, forbiddenIsAccess: true } as const;
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
const n = (v: number) => v.toLocaleString("en-IN");
const errText = (e: unknown, f = "Nahi hua. Dobara try karo.") => (e instanceof Error && e.message ? e.message : f);

type Packet = { id: string; sender: string; total: number; pieces: number; claimed: number; status: string; message?: string | null; source: string; expiresAt: string; claimedByMe: boolean; myCoins: number | null };
type PacketList = { packets: Packet[]; canSend: boolean; funds: number; members: number };
type BanRow = { userId: string; name: string; avatarUrl?: string; publicId: number; reason?: string; at: string };

const left = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "band";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} ghante ${m} min` : `${m} min`;
};

export const parivarRedApi = {
  list: (id: string) => api<PacketList>(`${base(id)}/redpackets`, opts),
  send: (id: string, body: { coins: number; pieces: number; equal: boolean; source: "COINS" | "FUNDS"; message?: string }, key: string) =>
    api<unknown>(`${base(id)}/redpackets`, { ...opts, method: "POST", body, headers: { "Idempotency-Key": key } }),
  claim: (id: string, packetId: string) => api<{ amount: number }>(`${base(id)}/redpackets/${packetId}/claim`, { ...opts, method: "POST", body: {} }),
  bans: (id: string) => api<BanRow[]>(`${base(id)}/bans`, opts),
  ban: (id: string, userId: string, reason?: string) => api<unknown>(`${base(id)}/members/${userId}/ban`, { ...opts, method: "POST", body: { reason } }),
  unban: (id: string, userId: string) => api<unknown>(`${base(id)}/members/${userId}/unban`, { ...opts, method: "POST", body: {} }),
};

type Props = { p: ParivarProfile; open: boolean; onClose: () => void; onChanged: () => void };

/** The family's red packets: open one if it is there, and the Mukhiya can send a new one. */
export function RedPacketSheet({ p, open, onClose, onChanged }: Props) {
  const { toast, refreshCoins, coins } = useApp();
  const [data, setData] = useState<PacketList | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [won, setWon] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [pieces, setPieces] = useState("");
  const [equal, setEqual] = useState(false);
  const [source, setSource] = useState<"COINS" | "FUNDS">("COINS");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(false);
  const key = useState(() => ({ k: newKey() }))[0];

  const load = useCallback(() => {
    parivarRedApi.list(p.id).then(setData).catch((e) => toast(errText(e), "error"));
  }, [p.id, toast]);
  useEffect(() => {
    if (!open) return;
    load();
    const i = window.setInterval(load, 15_000);
    return () => window.clearInterval(i);
  }, [open, load]);

  const claim = async (pk: Packet) => {
    if (busy) return;
    setBusy(pk.id);
    try {
      const r = await parivarRedApi.claim(p.id, pk.id);
      setWon(r.amount);
      void refreshCoins();
      load();
      onChanged();
    } catch (e) {
      toast(errText(e), "error");
      load();
    } finally {
      setBusy(null);
    }
  };

  const total = Number(amount) || 0;
  const count = Number(pieces) || 0;
  const send = async () => {
    if (busy) return;
    setBusy("send");
    try {
      await parivarRedApi.send(p.id, { coins: total, pieces: count, equal, source, message }, key.k);
      toast("Red packet Parivar ko bhej diya 🧧", "gold");
      key.k = newKey();
      setAmount("");
      setPieces("");
      setMessage("");
      setForm(false);
      void refreshCoins();
      load();
      onChanged();
    } catch (e) {
      toast(errText(e), "error");
      key.k = newKey();
    } finally {
      setBusy(null);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="🧧 Parivar red packet" tall>
      <div className="relative px-4 pb-6">
        {!data ? (
          <div className="mx-auto my-10 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-gold" aria-label="Loading" />
        ) : (
          <>
            {data.canSend ? (
              <section className="rounded-2xl bg-gradient-to-br from-[#7a1226] to-[#2a0b14] p-3.5 ring-1 ring-gold/30">
                {!form ? (
                  <button type="button" onClick={() => setForm(true)} className="h-12 w-full rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e0a93a] font-display text-[15px] font-black uppercase text-[#4a2600] shadow-[0_4px_0_#8a5a12]">
                    🧧 Naya red packet bhejo
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[12.5px] font-bold text-cream/80">Mukhiya, sab Parivar walon ke liye red packet banao.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11.5px] font-bold text-cream/70">
                        Kul coins
                        <input value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="jaise 5000" className="mt-1 h-11 w-full rounded-xl bg-black/30 px-3 text-[15px] font-bold text-cream ring-1 ring-white/10 focus:outline-none focus:ring-gold/50" />
                      </label>
                      <label className="text-[11.5px] font-bold text-cream/70">
                        Kitne hisse (max {Math.min(100, data.members)})
                        <input value={pieces} inputMode="numeric" onChange={(e) => setPieces(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder={`jaise ${Math.min(10, data.members)}`} className="mt-1 h-11 w-full rounded-xl bg-black/30 px-3 text-[15px] font-bold text-cream ring-1 ring-white/10 focus:outline-none focus:ring-gold/50" />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      {([[false, "Random hisse"], [true, "Barabar hisse"]] as const).map(([v, label]) => (
                        <button key={label} type="button" aria-pressed={equal === v} onClick={() => setEqual(v)} className={`h-9 flex-1 rounded-full text-[12.5px] font-extrabold ring-1 ${equal === v ? "bg-gold text-ink ring-gold" : "bg-white/10 text-cream ring-white/10"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {([["COINS", `Mere wallet se (${n(coins)})`], ["FUNDS", `Treasury se (${n(data.funds)})`]] as const).map(([v, label]) => (
                        <button key={v} type="button" aria-pressed={source === v} onClick={() => setSource(v)} className={`h-9 flex-1 rounded-full px-2 text-[11.5px] font-extrabold ring-1 ${source === v ? "bg-gold text-ink ring-gold" : "bg-white/10 text-cream ring-white/10"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <input value={message} maxLength={80} onChange={(e) => setMessage(e.target.value)} placeholder="Sandesh (optional)" className="h-10 w-full rounded-xl bg-black/30 px-3 text-[13.5px] text-cream ring-1 ring-white/10 placeholder:text-cream/35 focus:outline-none" aria-label="Message" />
                    <p className="text-[11.5px] text-cream/60">Jo hissa 24 ghante me koi na khole wo coins wapas aapke wallet (ya treasury) me aa jate hain.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setForm(false)} className="h-11 flex-1 rounded-full bg-white/10 text-[13px] font-bold">
                        Cancel
                      </button>
                      <button type="button" disabled={busy !== null || total < 1 || count < 1} onClick={() => void send()} className="h-11 flex-[1.6] rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e0a93a] font-display text-[14px] font-black uppercase text-[#4a2600] disabled:opacity-50">
                        {busy === "send" ? "Bhej rahe hain…" : `Bhejo ${total ? n(total) : ""} coins`}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <p className="rounded-2xl bg-white/[0.06] p-3 text-[12.5px] font-bold text-cream/70">Red packet sirf Mukhiya bhej sakta hai. Jab bheje, yahan kholna.</p>
            )}

            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Parivar ke red packets</p>
            <ul className="mt-2 space-y-2">
              {data.packets.length === 0 ? <li className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-muted ring-1 ring-line">Abhi koi red packet nahi hai.</li> : null}
              {data.packets.map((pk) => {
                const open = pk.status === "OPEN" && pk.claimed < pk.pieces;
                return (
                  <li key={pk.id} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${open && !pk.claimedByMe ? "bg-gradient-to-r from-[#7a1226]/70 to-surface ring-gold/40" : "bg-surface ring-line"}`}>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#c1121f] text-[26px]" aria-hidden>
                      🧧
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold text-cream">
                        {pk.sender} ka red packet · {n(pk.total)} coins
                      </span>
                      <span className="block truncate text-[11.5px] text-muted">
                        {pk.message ? `“${pk.message}” · ` : ""}
                        {pk.claimed}/{pk.pieces} khule · {open ? `${left(pk.expiresAt)} baaki` : pk.status === "DONE" ? "sab hisse ho gaye" : "band"}
                      </span>
                    </span>
                    {pk.claimedByMe ? (
                      <span className="flex items-center gap-1 text-[12px] font-extrabold text-[#7dff9a]">
                        <Coin className="h-4 w-4" /> +{n(pk.myCoins ?? 0)}
                      </span>
                    ) : open ? (
                      <button type="button" disabled={busy !== null} onClick={() => void claim(pk)} className="rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e0a93a] px-4 py-2 text-[12.5px] font-black text-[#4a2600] disabled:opacity-50">
                        Kholo
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <AnimatePresence>
          {won !== null ? (
            <motion.div className="absolute inset-0 z-20 grid place-items-center bg-black/85 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center">
                <motion.p className="text-[84px] leading-none" initial={{ scale: 0.2, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
                  🧧
                </motion.p>
                <p className="mt-2 flex items-center justify-center gap-1.5 font-display text-[30px] font-black text-[#ffe27a]">
                  <Coin className="h-8 w-8" /> +{n(won)}
                </p>
                <p className="text-[13px] font-bold text-cream/80">Coins aapke wallet me aa gaye!</p>
                <button type="button" onClick={() => setWon(null)} className="mt-5 h-11 rounded-full bg-gold px-8 text-[14px] font-extrabold text-ink">
                  Shukriya
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}

/** Help and support: what the Mukhiya can do, and (for those who may) the banned list with Unban. */
export function HelpSheet({ p, open, onClose, onChanged }: Props) {
  const { toast } = useApp();
  const [bans, setBans] = useState<BanRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const canManage = p.myRole === "LEADER" || p.myPerms.includes("REMOVE_MEMBERS");
  const load = useCallback(() => {
    if (!canManage) return;
    parivarRedApi.bans(p.id).then(setBans).catch(() => setBans([]));
  }, [p.id, canManage]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);
  const unban = async (b: BanRow) => {
    setBusy(b.userId);
    try {
      await parivarRedApi.unban(p.id, b.userId);
      toast(`${b.name} ka ban hata diya`, "gold");
      load();
      onChanged();
    } catch (e) {
      toast(errText(e), "error");
    } finally {
      setBusy(null);
    }
  };
  const items: [string, string][] = [
    ["🧧", "Red packet: Mukhiya Parivar ke liye coins ka red packet bhejta hai (apne wallet ya treasury se). Har member ek hissa kholta hai."],
    ["🚫", "Ban: Members tab me kisi member ke saamne Ban dabao. Wo Parivar se nikal jata hai aur dobara jud ya apply nahi kar sakta."],
    ["✅", "Unban: neeche ban ki list me Unban dabao, wo phir se jud sakta hai."],
    ["🚪", "Remove: member ko sirf nikalna ho (ban nahi) to Remove dabao. Wo dobara apply kar sakta hai."],
    ["📣", "Announcement, join karne ka tareeka (Open ya Approval), naam aur logo: Manage tab me Mukhiya badalta hai."],
    ["🛡️", "Kavach, Chests, Gacha, Treasury: Mukhiya inhe chalata hai. Chest sirf Mukhiya kholta hai."],
    ["🆘", "Koi dikkat ho to Parivar chat me Mukhiya ko batao. Admin team bhi har Parivar ke ban aur red packets dekh sakti hai."],
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title="🆘 Help and support" tall>
      <div className="px-4 pb-6">
        <ul className="space-y-2">
          {items.map(([icon, text]) => (
            <li key={icon} className="flex gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
              <span className="text-[22px] leading-none" aria-hidden>
                {icon}
              </span>
              <span className="text-[12.5px] font-semibold leading-snug text-cream/85">{text}</span>
            </li>
          ))}
        </ul>
        {canManage ? (
          <>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Ban ki list</p>
            <ul className="mt-2 space-y-2">
              {bans === null ? <li className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-muted ring-1 ring-line">Dhoondh rahe hain…</li> : null}
              {bans && bans.length === 0 ? <li className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-muted ring-1 ring-line">Abhi koi ban nahi hai.</li> : null}
              {(bans ?? []).map((b) => (
                <li key={b.userId} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-cream">
                      {b.name} <span className="text-[11px] text-muted">#{b.publicId}</span>
                    </span>
                    {b.reason ? <span className="block truncate text-[11.5px] text-muted">{b.reason}</span> : null}
                  </span>
                  <button type="button" disabled={busy !== null} onClick={() => void unban(b)} className="rounded-full bg-gold px-3.5 py-1.5 text-[12px] font-extrabold text-ink disabled:opacity-50">
                    Unban
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </BottomSheet>
  );
}
