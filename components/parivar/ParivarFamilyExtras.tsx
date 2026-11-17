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
import { subscribe } from "@/lib/realtime/stomp";
import type { ParivarProfile } from "@/lib/api/parivar";
import { useApp } from "@/lib/app/store";

const base = (id: string) => `/api/v1/parivar/${id}`;
const opts = { auth: true, forbiddenIsAccess: true } as const;
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
const n = (v: number) => v.toLocaleString("en-IN");
const errText = (e: unknown, f = "Nahi hua. Dobara try karo.") => (e instanceof Error && e.message ? e.message : f);

type Top = { name: string; coins: number };
type Packet = { id: string; sender: string; total: number; pieces: number; claimed: number; status: string; message?: string | null; source: string; expiresAt: string; claimedByMe: boolean; myCoins: number | null; top: Top[] };
type Owned = { typeId: string; qty: number; name: string; coins: number; pieces: number };
type PacketList = { packets: Packet[]; canSend: boolean; funds: number; members: number; owned: Owned[] };
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
  send: (id: string, body: { typeId: number; equal: boolean; message?: string }, key: string) =>
    api<unknown>(`${base(id)}/redpackets`, { ...opts, method: "POST", body, headers: { "Idempotency-Key": key } }),
  claim: (id: string, packetId: string) => api<{ amount: number }>(`${base(id)}/redpackets/${packetId}/claim`, { ...opts, method: "POST", body: {} }),
  bans: (id: string) => api<BanRow[]>(`${base(id)}/bans`, opts),
  ban: (id: string, userId: string, reason?: string) => api<unknown>(`${base(id)}/members/${userId}/ban`, { ...opts, method: "POST", body: { reason } }),
  unban: (id: string, userId: string) => api<unknown>(`${base(id)}/members/${userId}/unban`, { ...opts, method: "POST", body: {} }),
};

type Props = { p: ParivarProfile; open: boolean; onClose: () => void; onChanged: () => void };

/** The family's red packets: open one if it is there, and the Mukhiya can send a new one. */
export function RedPacketSheet({ p, open, onClose, onChanged, onGo }: Props & { onGo?: (s: "shop") => void }) {
  const { toast, refreshCoins } = useApp();
  const [data, setData] = useState<PacketList | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [won, setWon] = useState<number | null>(null);
  const [equal, setEqual] = useState(false);
  const [message, setMessage] = useState("");
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

  const send = async (o: Owned) => {
    if (busy) return;
    setBusy("send" + o.typeId);
    try {
      await parivarRedApi.send(p.id, { typeId: Number(o.typeId), equal, message }, key.k);
      toast("Red packet Parivar ko bhej diya 🧧", "gold");
      key.k = newKey();
      setMessage("");
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
                <p className="text-[12.5px] font-bold text-cream/85">Parivar ke store me jo red packet hain unhe bhejo. Naya chahiye to Parivar shop se kharido.</p>
                {data.owned.length === 0 ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-black/25 p-3">
                    <span className="min-w-0 flex-1 text-[12.5px] font-bold text-cream/70">Abhi store me koi red packet nahi hai.</span>
                    {onGo ? (
                      <button type="button" onClick={() => onGo("shop")} className="shrink-0 rounded-full bg-gold px-3.5 py-2 text-[12px] font-extrabold text-ink">
                        🛒 Shop kholo
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 flex gap-2">
                      {([[false, "Random hisse"], [true, "Barabar hisse"]] as const).map(([v, label]) => (
                        <button key={label} type="button" aria-pressed={equal === v} onClick={() => setEqual(v)} className={`h-9 flex-1 rounded-full text-[12.5px] font-extrabold ring-1 ${equal === v ? "bg-gold text-ink ring-gold" : "bg-white/10 text-cream ring-white/10"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <input value={message} maxLength={80} onChange={(e) => setMessage(e.target.value)} placeholder="Sandesh (optional)" className="mt-2 h-10 w-full rounded-xl bg-black/30 px-3 text-[13.5px] text-cream ring-1 ring-white/10 placeholder:text-cream/35 focus:outline-none" aria-label="Message" />
                    <ul className="mt-2.5 space-y-2">
                      {data.owned.map((o) => (
                        <li key={o.typeId} className="flex items-center gap-3 rounded-xl bg-black/25 p-2.5">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#c1121f] text-[24px]" aria-hidden>
                            🧧
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-bold text-cream">
                              {o.name} <span className="text-gold">×{n(o.qty)}</span>
                            </span>
                            <span className="text-[11.5px] text-cream/60">
                              {n(o.coins)} coins · {Math.min(o.pieces, data.members)} hisse
                            </span>
                          </span>
                          <button type="button" disabled={busy !== null} onClick={() => void send(o)} className="rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e0a93a] px-4 py-2 text-[12.5px] font-black text-[#4a2600] disabled:opacity-50">
                            {busy === "send" + o.typeId ? "…" : "Bhejo"}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {onGo ? (
                      <button type="button" onClick={() => onGo("shop")} className="mt-2 h-9 w-full rounded-full bg-white/10 text-[12px] font-bold text-cream">
                        🛒 Aur red packet kharido
                      </button>
                    ) : null}
                  </>
                )}
              </section>
            ) : (
              <p className="rounded-2xl bg-white/[0.06] p-3 text-[12.5px] font-bold text-cream/70">Red packet Mukhiya (ya jise admin ne ijazat di ho) bhejta hai. Jab bheje, yahan kholna.</p>
            )}

            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Parivar ke red packets</p>
            <ul className="mt-2 space-y-2">
              {data.packets.length === 0 ? <li className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-muted ring-1 ring-line">Abhi koi red packet nahi hai.</li> : null}
              {data.packets.map((pk) => (
                <li key={pk.id}>
                  <PacketRow pk={pk} busy={busy !== null} onClaim={() => void claim(pk)} />
                </li>
              ))}
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

/** One red packet: who sent it, how much is left, the top 5 so far, and Kholo. */
function PacketRow({ pk, busy, onClaim }: { pk: Packet; busy: boolean; onClaim: () => void }) {
  const open = pk.status === "OPEN" && pk.claimed < pk.pieces;
  return (
    <div className={`rounded-2xl p-3 ring-1 ${open && !pk.claimedByMe ? "bg-gradient-to-r from-[#7a1226]/70 to-surface ring-gold/40" : "bg-surface ring-line"}`}>
      <div className="flex items-center gap-3">
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
          <button type="button" disabled={busy} onClick={onClaim} className="rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e0a93a] px-4 py-2 text-[12.5px] font-black text-[#4a2600] disabled:opacity-50">
            Kholo
          </button>
        ) : null}
      </div>
      {pk.top && pk.top.length ? (
        <ol className="mt-2 space-y-0.5 border-t border-white/10 pt-2" aria-label="Top 5">
          {pk.top.map((t, i) => (
            <li key={`${t.name}${i}`} className="flex items-center gap-2 text-[12px] font-semibold text-cream/80">
              <span className="w-4 text-center text-[11px] font-black text-gold">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{t.name}</span>
              <span className="flex items-center gap-1 font-extrabold text-[#ffe27a]">
                <Coin className="h-3.5 w-3.5" /> {n(t.coins)}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/** The red packet card that shows up inside the family chat (a system line that starts with ::redpacket::). */
export function parseRedPacket(text: string): { id: string; from: string; total: number; pieces: number; message: string } | null {
  if (!text.startsWith("::redpacket::")) return null;
  const [id, from, total, pieces, message] = text.slice(13).split("|");
  if (!id) return null;
  return { id, from: from || "Mukhiya", total: Number(total) || 0, pieces: Number(pieces) || 0, message: message ?? "" };
}

const packetCache = new Map<string, { at: number; data: PacketList }>();

export function RedPacketChatCard({ p, packetId, from, total, pieces, message, onChanged }: { p: ParivarProfile; packetId: string; from: string; total: number; pieces: number; message: string; onChanged?: () => void }) {
  const { toast, refreshCoins } = useApp();
  const [pk, setPk] = useState<Packet | null>(null);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const load = useCallback(() => {
    const hit = packetCache.get(p.id);
    const use = (d: PacketList) => setPk(d.packets.find((x) => x.id === packetId) ?? null);
    if (hit && Date.now() - hit.at < 8000) return use(hit.data);
    parivarRedApi
      .list(p.id)
      .then((d) => {
        packetCache.set(p.id, { at: Date.now(), data: d });
        use(d);
      })
      .catch(() => undefined);
  }, [p.id, packetId]);
  useEffect(() => {
    load();
    const i = window.setInterval(() => {
      packetCache.delete(p.id);
      load();
    }, 12_000);
    return () => window.clearInterval(i);
  }, [load, p.id]);
  const open = pk ? pk.status === "OPEN" && pk.claimed < pk.pieces : true;
  const claim = async () => {
    if (busy || !pk) return;
    setBusy(true);
    try {
      const r = await parivarRedApi.claim(p.id, packetId);
      setWon(r.amount);
      void refreshCoins();
      packetCache.delete(p.id);
      load();
      onChanged?.();
    } catch (e) {
      toast(errText(e), "error");
      packetCache.delete(p.id);
      load();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto w-[min(94%,320px)] overflow-hidden rounded-2xl bg-gradient-to-b from-[#c1121f] to-[#6a0b16] p-3 text-white shadow-[0_12px_28px_-12px_rgba(193,18,31,0.8)] ring-1 ring-[#ffd36e]/50">
      <p className="text-[12px] font-extrabold text-[#ffe9a8]">🧧 {from} ne Parivar ko red packet bheja</p>
      <p className="mt-0.5 flex items-center gap-1 font-display text-[22px] font-black">
        <Coin className="h-5 w-5" /> {n(total)} <span className="text-[12px] font-bold text-white/75">· {pieces} hisse</span>
      </p>
      {message ? <p className="text-[12px] italic text-white/80">“{message}”</p> : null}
      {won !== null ? (
        <p className="mt-2 rounded-xl bg-black/30 py-2 text-center text-[14px] font-black text-[#7dff9a]">✅ +{n(won)} coins wallet me aa gaye!</p>
      ) : pk?.claimedByMe ? (
        <p className="mt-2 rounded-xl bg-black/30 py-2 text-center text-[13px] font-black text-[#7dff9a]">Aapne {n(pk.myCoins ?? 0)} coins liye</p>
      ) : open ? (
        <button type="button" disabled={busy || !pk} onClick={() => void claim()} className="mt-2 h-10 w-full rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e0a93a] font-display text-[14px] font-black uppercase text-[#4a2600] shadow-[0_3px_0_#8a5a12] disabled:opacity-60">
          {busy ? "Khul raha hai…" : "Kholo"}
        </button>
      ) : (
        <p className="mt-2 rounded-xl bg-black/30 py-2 text-center text-[12.5px] font-bold text-white/70">Ye red packet band ho gaya</p>
      )}
      {pk ? (
        <>
          <p className="mt-2 text-[11px] font-bold text-white/70">
            {pk.claimed}/{pk.pieces} khule{open ? ` · ${left(pk.expiresAt)} baaki` : ""}
          </p>
          {pk.top.length ? (
            <ol className="mt-1.5 space-y-0.5 rounded-xl bg-black/25 p-2" aria-label="Top 5">
              {pk.top.map((t, i) => (
                <li key={`${t.name}${i}`} className="flex items-center gap-2 text-[12px] font-semibold">
                  <span className="w-4 text-center text-[11px] font-black text-[#ffd36e]">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <span className="font-extrabold text-[#ffe27a]">{n(t.coins)}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** A banner when the Parivar gets a red packet: a notice from the server, with a button that opens the family chat. */
export function ParivarRedPacketPrompt() {
  const { push } = useApp();
  const [note, setNote] = useState<{ id: string; parivarId: string; from: string; coins: number } | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    const off = subscribe("/user/queue/notify", (body) => {
      const b = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
      if (!b || b.type !== "PARIVAR_REDPACKET") return;
      setNote({ id: String(b.packetId), parivarId: String(b.parivarId), from: String(b.fromName ?? "Mukhiya"), coins: Number(b.coins) || 0 });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setNote(null), 12_000);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);
  return (
    <AnimatePresence>
      {note ? (
        <motion.div key={note.id} initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-[96] flex justify-center px-3 pt-2">
          <div className="pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-2xl bg-gradient-to-r from-[#c1121f] to-[#7a0f1c] p-3 text-white shadow-[0_16px_36px_-12px_rgba(193,18,31,0.9)] ring-1 ring-[#ffd36e]/60">
            <span className="text-[30px]" aria-hidden>
              🧧
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold">Parivar me red packet aaya!</span>
              <span className="block truncate text-[11.5px] text-white/80">
                {note.from} ne {n(note.coins)} coins bheje. Family chat me jaakar loot lo!
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                const id = note.parivarId;
                setNote(null);
                push({ kind: "parivar-chat", id });
              }}
              className="shrink-0 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#e0a93a] px-3.5 py-2 text-[12px] font-black text-[#4a2600]"
            >
              Chat kholo
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
