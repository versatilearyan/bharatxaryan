"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Gavel, Lock, Palette, Plus, Trash2 } from "lucide-react";
import { sendDirectGift } from "@/lib/api/gifts";
import { tagsApi } from "@/lib/api/room-games";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { GiftArt } from "@/components/art/GiftArt";
import { TagPairArt, useTagTitle } from "@/components/rooms/TagParts";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Coin, ScreenHeader } from "@/components/ui/kit";
import { GIFTS, GIFTS_LIVE, GIFTS_SOON_TEXT, giftById } from "@/lib/app/data";
import { SoonTag } from "@/components/ui/ComingSoonBadge";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import { NICKNAME_MAX, RELATIONSHIPS, TAG_PERKS, TAG_SLOTS, TAG_THEMES, TOKENS, partnerOf, relationshipById, tagColors, tagLevel, tagSlotsFor, tokenById, type RelationshipId, type Tag } from "@/lib/app/tags";
import type { GiftId } from "@/lib/app/types";

const QUICK_GIFTS: GiftId[] = GIFTS.filter((g) => !g.packageOnly).slice(0, 4).map((g) => g.id);

/**
 * BFF (the intimate space): someone's tags won in BFF Kharidari, each with its
 * level, intimacy, token and perks. Everyone has 5 slots; each VIP level adds one, up to 12.
 */
export function IntimateSpace({ personId }: { personId: string }) {
  const { pop, tagsOf, profile, openRoom, push, vip } = useApp();
  const person = usePeople();
  const mine = personId === ME_ID;
  const owner = person(personId);
  const name = mine ? profile.name : owner.name;
  // Backend users: their BFF tags come from the server
  const { loadServerTags } = useApp();
  useEffect(() => {
    if (personId === "me" || personId.startsWith("srv-user:")) void loadServerTags(personId);
  }, [personId, loadServerTags]);
  const tags = [...tagsOf(personId)].sort((x, y) => y.intimacy - x.intimacy);
  // 5 slots for everyone, one more per VIP level, up to 12 (the server's count wins for backend users)
  const [serverSlots, setServerSlots] = useState<number | null>(null);
  useEffect(() => {
    const uid = personId === "me" ? undefined : personId.startsWith("srv-user:") ? personId.slice(9) : null;
    if (uid === null) return;
    let off = false;
    tagsApi
      .slots(uid)
      .then((x) => !off && setServerSlots(x.slots))
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [personId, tags.length]);
  const slots = Math.min(TAG_SLOTS, Math.max(serverSlots ?? tagSlotsFor(mine ? vip.level : 0), tags.length));
  const empty = mine ? slots - tags.length : 0;
  const invite = () => {
    pop();
    openRoom("r-kharidari");
  };

  return (
    <div className="app-scroll h-full pb-safe" style={{ background: "linear-gradient(180deg, #3a1f5c 0%, #1c1230 40%, #111114 100%)" }}>
      <ScreenHeader title={mine ? "My BFF" : `${name}'s BFF`} onBack={pop} />

      <div className="flex flex-col items-center px-4 text-center">
        <PersonAvatar person={owner} size={72} />
        <p className="mt-2 text-[12px] text-cream/65">
          {tags.length} of {slots} BFF slots
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {Array.from({ length: slots }, (_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i < tags.length ? "bg-gradient-to-r from-[#ff7fa8] to-gold" : "bg-white/15"}`} />
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3 px-4">
        {tags.map((t) => (
          <TagCard key={t.id} tag={t} viewer={personId} />
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <button key={`e${i}`} type="button" onClick={invite} className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-white/20 px-4 py-3.5 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.07] text-cream/70">
              <Plus className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-[14px] font-semibold text-cream">Empty slot</span>
              <span className="text-[11.5px] text-cream/55">Find a BFF in Kharidari Bazaar</span>
            </span>
          </button>
        ))}
        {mine && slots < TAG_SLOTS ? (
          <button type="button" onClick={() => push({ kind: "vip-benefits" })} className="flex w-full items-center gap-3 rounded-3xl bg-black/25 px-4 py-3.5 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/15 text-gold">
              <Lock className="h-4.5 w-4.5" aria-hidden />
            </span>
            <span>
              <span className="block text-[14px] font-semibold text-cream">More slots</span>
              <span className="text-[11.5px] text-cream/55">Each VIP level adds a BFF slot, up to {TAG_SLOTS}</span>
            </span>
          </button>
        ) : null}
        {tags.length === 0 && !mine ? (
          <div className="rounded-3xl bg-white/[0.05] p-6 text-center ring-1 ring-white/10">
            <p className="font-semibold text-cream">No BFF yet</p>
            <p className="mt-1 text-[12.5px] text-muted">{name} hasn&apos;t made a BFF yet.</p>
          </div>
        ) : null}
        {mine ? (
          <button type="button" onClick={invite} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7b5cff] to-[#a98bff] text-[14px] font-extrabold text-white">
            <Gavel className="h-4 w-4" aria-hidden /> Go to Kharidari Bazaar
          </button>
        ) : null}
      </div>

      {/* How it works */}
      <section className="mx-4 mt-6 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10" aria-labelledby="how-tags">
        <h2 id="how-tags" className="font-display text-[15px] font-bold text-cream">
          How BFF works
        </h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[12.5px] text-cream/75">
          <li>In a Kharidari room set to BFF, the person on the auction seat sets a tag declaration like Besties or Bro.</li>
          <li>Everyone bids with gifts. The biggest gift volume when the timer ends wins, and the two become BFF.</li>
          <li>The winning gift volume unlocks a token: {TOKENS.map((t) => `${t.emoji} ${t.label}${t.min ? ` (${t.min.toLocaleString("en-IN")}+)` : ""}`).join(", ")}.</li>
          <li>Every coin of gifts between you adds 1 intimacy. Intimacy raises the BFF level up to Lv 10.</li>
          <li>Sit beside your BFF in a room and your token shows between your seats.</li>
          <li>Give your BFF a pet name and a colour theme with Customize. Either of you can change it.</li>
          <li>Everyone has 5 BFF slots. Each VIP level adds one more, up to {TAG_SLOTS}.</li>
        </ol>
      </section>
      <div className="h-8" />
    </div>
  );
}

function TagCard({ tag, viewer }: { tag: Tag; viewer: string }) {
  const { spend, addIntimacy, addCharm, trackReceived, playGift, profile, toast, breakTag } = useApp();
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const c = tagColors(tag);
  const person = usePeople();
  const tagTitle = useTagTitle();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const rel = relationshipById(tag.relation);
  const token = tokenById(tag.token);
  const lv = tagLevel(tag.intimacy);
  const partner = partnerOf(tag, viewer);
  const partnerName = partner === ME_ID ? "You" : person(partner).name;
  const mine = tag.a === ME_ID || tag.b === ME_ID;
  const otherOfMine = tag.a === ME_ID ? tag.b : tag.a;

  const gift = (id: GiftId) => {
    const g = giftById(id);
    // Backend users: a real gift through the server (coins, charm and intimacy are counted there)
    if (otherOfMine.startsWith("srv-user:")) {
      if (sending) return;
      setSending(true);
      sendDirectGift(otherOfMine.slice(9), id, 1, "TAG")
        .then(() => {
          addIntimacy(ME_ID, otherOfMine, g.cost);
          playGift({ giftId: id, fromName: profile.name, toName: person(otherOfMine).name, count: 1 });
        })
        .catch((e) => toast(e instanceof Error && e.message ? e.message : "Couldn't send the gift.", "error"))
        .finally(() => setSending(false));
      return;
    }
    if (!GIFTS_LIVE) return toast(GIFTS_SOON_TEXT);
    if (!spend(g.cost)) {
      toast("Not enough coins", "error");
      return;
    }
    addIntimacy(ME_ID, otherOfMine, g.cost);
    addCharm(otherOfMine, g.cost);
    trackReceived(otherOfMine, id, 1);
    playGift({ giftId: id, fromName: profile.name, toName: person(otherOfMine).name, count: 1 });
  };

  return (
    <article className="relative overflow-hidden rounded-3xl p-[1.5px]" style={{ background: `linear-gradient(135deg, ${c.from}, #e7bc72 45%, ${c.to})`, boxShadow: `0 10px 30px -12px ${c.glow}88` }}>
     <div className="relative overflow-hidden rounded-[22px]" style={{ background: `radial-gradient(120% 80% at 50% 0%, ${c.from}40, transparent 60%), linear-gradient(165deg, ${c.to}66, #17151d 58%)` }}>
      {/* A slow shine across the card */}
      <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent" animate={{ x: ["0%", "450%"] }} transition={{ duration: 3.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }} />
      {lv.level >= 5 ? <span aria-hidden className="pointer-events-none absolute right-3 top-3 text-[13px]">{lv.level >= 10 ? "👑" : "✨"}</span> : null}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="relative w-full p-4 text-left">
        <TagPairArt tag={tag} size={56} />
        {tag.nickname ? (
          <p className="mt-2 text-center">
            <span className="inline-block rounded-full px-3 py-0.5 font-display text-[13px] font-extrabold text-white shadow" style={{ background: `linear-gradient(90deg, ${c.from}, ${c.to})` }}>
              “{tag.nickname}”
            </span>
          </p>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-[16px] font-extrabold text-cream">
              {partnerName} <span className="text-[12px] font-semibold text-cream/60">· {tagTitle(tag, viewer)}</span>
            </p>
            <p className="text-[11.5px] text-cream/60">
              {rel.emoji} {rel.label} · {token.emoji} {token.label} · since {new Date(tag.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} in {tag.roomName}
            </p>
          </div>
          <span className="shrink-0 rounded-full px-2.5 py-1 font-display text-[13px] font-extrabold text-[#1c1b22] shadow-[0_0_14px_rgba(255,220,150,0.45)]" style={{ background: `linear-gradient(135deg, #fff1d5, ${c.from})` }}>
            Lv {lv.level}
          </span>
        </div>
        {tag.declaration ? <p className="mt-1.5 rounded-xl bg-black/25 px-2.5 py-1.5 text-[11.5px] italic text-cream/80">“{tag.declaration}”</p> : null}
        <div className="mt-2">
          <div className="flex justify-between text-[11px] text-cream/70">
            <span>Intimacy</span>
            <span>
              <b className="text-cream">{tag.intimacy.toLocaleString("en-IN")}</b>
              {lv.next ? ` / ${lv.next.toLocaleString("en-IN")}` : " · Max"}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/40" role="progressbar" aria-label={`Intimacy toward level ${lv.level + 1}`} aria-valuenow={Math.round(lv.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${c.from}, #e7bc72)` }} initial={{ width: 0 }} animate={{ width: `${lv.progress * 100}%` }} transition={{ duration: 0.7 }} />
          </div>
        </div>
        <span className="mt-2 flex items-center justify-center gap-1 text-[11.5px] font-semibold text-cream/60">
          {open ? "Hide perks" : "Perks and gifts"} <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
      </button>

      {open ? (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          <ul className="space-y-1.5">
            {TAG_PERKS.map((p) => {
              const on = lv.level >= p.level;
              return (
                <li key={p.title} className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 ${on ? "bg-white/[0.07]" : "bg-black/20"}`}>
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${on ? "bg-gold text-ink" : "bg-white/10 text-cream/50"}`}>
                    {on ? <Check className="h-3 w-3" aria-label="Unlocked" /> : <Lock className="h-3 w-3" aria-label="Locked" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[12.5px] font-bold ${on ? "text-cream" : "text-cream/55"}`}>
                      Lv {p.level} · {p.title}
                    </span>
                    <span className="block text-[11.5px] text-cream/55">{p.detail}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          {mine ? (
            <>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-cream/55">Send a gift to raise intimacy</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {QUICK_GIFTS.map((id) => {
                  const g = giftById(id);
                  return (
                    <motion.button key={id} type="button" whileTap={{ scale: 0.92 }} onClick={() => gift(id)} className={`relative flex flex-col items-center rounded-xl bg-white/[0.06] py-2 ${GIFTS_LIVE ? "" : "opacity-70"}`} aria-label={GIFTS_LIVE ? `Send ${g.name} to ${person(otherOfMine).name}, ${g.cost} coins` : `${g.name}: ${GIFTS_SOON_TEXT}`}>
                      {!GIFTS_LIVE ? <SoonTag className="absolute right-1 top-1" /> : null}
                      <span className="h-8 w-8">
                        <GiftArt id={id} />
                      </span>
                      <span className="flex items-center gap-0.5 text-[10.5px] font-bold text-gold">
                        <Coin className="h-3 w-3" /> {g.cost}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setEditing(true)} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-bold text-white" style={{ background: `linear-gradient(90deg, ${c.from}, ${c.to})` }}>
                <Palette className="h-4 w-4" aria-hidden /> Customize tag
              </button>
              {confirm ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setConfirm(false)} className="h-10 flex-1 rounded-full bg-white/10 text-[13px] font-bold text-cream">
                    Keep tag
                  </button>
                  <button type="button" onClick={() => breakTag(tag.id)} className="h-10 flex-1 rounded-full bg-[#f4515b] text-[13px] font-bold text-white">
                    Remove for good
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirm(true)} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-[12.5px] font-bold text-cream/60 hover:text-cream">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove tag
                </button>
              )}
            </>
          ) : null}
        </div>
      ) : null}
     </div>
      {mine ? <TagCustomizeSheet tag={tag} open={editing} onClose={() => setEditing(false)} /> : null}
    </article>
  );
}

/** Either person in a tag: change its type, pet name and colour theme. */
function TagCustomizeSheet({ tag, open, onClose }: { tag: Tag; open: boolean; onClose: () => void }) {
  const { customizeTag, toast } = useApp();
  const [relation, setRelation] = useState<RelationshipId>(tag.relation);
  const [nickname, setNickname] = useState(tag.nickname ?? "");
  const [theme, setTheme] = useState<string>(tag.theme ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setRelation(tag.relation);
    setNickname(tag.nickname ?? "");
    setTheme(tag.theme ?? "");
  }, [open, tag]);
  const preview = tagColors({ relation, theme: (theme || undefined) as Tag["theme"] });
  const save = () => {
    setBusy(true);
    customizeTag(tag.id, { relation, nickname: nickname.trim(), theme })
      .then(() => {
        toast("Tag updated", "gold");
        onClose();
      })
      .catch((e: unknown) => toast(e instanceof Error && e.message ? e.message : "Couldn't save that.", "error"))
      .finally(() => setBusy(false));
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Customize tag">
      <div className="space-y-4 pb-2">
        <div className="rounded-2xl p-4 text-center" style={{ background: `linear-gradient(135deg, ${preview.from}, ${preview.to})` }}>
          <p className="font-display text-[17px] font-extrabold text-white drop-shadow">{nickname.trim() ? `“${nickname.trim()}”` : relationshipById(relation).label}</p>
          <p className="text-[11.5px] font-semibold text-white/80">
            {relationshipById(relation).label} · Lv {tagLevel(tag.intimacy).level}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Tag type</p>
          <div className="grid grid-cols-3 gap-2">
            {RELATIONSHIPS.map((r) => (
              <button key={r.id} type="button" onClick={() => setRelation(r.id)} className={`rounded-xl px-2 py-2 text-[12.5px] font-bold ring-1 transition ${relation === r.id ? "text-white ring-transparent" : "text-cream/80 ring-white/10"}`} style={relation === r.id ? { background: `linear-gradient(135deg, ${r.tint}, ${r.deep})` } : undefined}>
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Pet name</span>
          <input value={nickname} onChange={(e) => setNickname(e.target.value.slice(0, NICKNAME_MAX))} placeholder="Chai Partner, Partner in crime…" className="h-11 w-full rounded-xl bg-white/[0.06] px-3 text-[14px] text-cream outline-none ring-1 ring-white/10 focus:ring-gold/60" />
          <span className="mt-1 block text-right text-[10.5px] text-muted">
            {nickname.length}/{NICKNAME_MAX}
          </span>
        </label>
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Theme</p>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={() => setTheme("")} aria-pressed={theme === ""} className={`h-10 rounded-full px-3 text-[12px] font-bold ring-2 ${theme === "" ? "text-cream ring-gold" : "text-cream/70 ring-white/10"}`}>
              Default
            </button>
            {TAG_THEMES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTheme(t.id)} aria-label={t.label} aria-pressed={theme === t.id} className={`h-10 w-10 rounded-full ring-2 transition ${theme === t.id ? "scale-110 ring-gold" : "ring-white/10"}`} style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }} />
            ))}
          </div>
        </div>
        <button type="button" disabled={busy} onClick={save} className="h-12 w-full rounded-full bg-gradient-to-r from-[#ff7fa8] to-gold text-[15px] font-extrabold text-ink disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </BottomSheet>
  );
}
