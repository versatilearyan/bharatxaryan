"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Copy, ImagePlus, Lock, Settings, Share2, X } from "lucide-react";
import { COVER_LABELS, SunsetScene } from "@/components/art/SunsetScene";
import { cropImage } from "@/components/profile/EditProfileSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { CATEGORIES } from "@/lib/app/data";
import { formatPoints } from "@/lib/app/levels";
import { usePeople } from "@/lib/app/people";
import { GOLD_NAME_VIP } from "@/lib/app/levels";
import { NAME_FONTS, nameFace } from "@/lib/app/fonts";
import { ME_ID, useApp } from "@/lib/app/store";
import type { Cover, RoomBackground, RoomSettings } from "@/lib/app/types";
import { RoomCover } from "./RoomCover";
import { MODE_LABEL, type RoomMode, type RoomSession } from "./useRoomSession";

/** What each role can do. Shown in the room profile sheet. */
const PERMISSIONS: [string, boolean, boolean][] = [
  ["Fixed seat that never changes (Kharidari too)", true, false],
  ["Appoint and remove admins", true, false],
  ["Kick admins out of the room", true, false],
  ["Change the mode", true, true],
  ["Room settings, announcement and password", true, true],
  ["Start and end Kharidari", true, true],
  ["Kick members out of the room", true, true],
  ["Mute people and remove them from the mic", true, true],
  ["Invite people to a seat", true, true],
  ["Close and open seats", true, true],
];

/** Room level tiers shown next to the tag, like "Advanced" in the reference. */
const TIERS = ["Basic", "Basic", "Advanced", "Advanced", "Elite", "Elite", "Royal", "Royal", "Legend", "Legend"];

export const BACKGROUNDS: { id: RoomBackground; label: string; css: string; vip?: boolean }[] = [
  { id: "cover", label: "Room cover", css: "" },
  { id: "brief", label: "Brief", css: "#2a2a30" },
  { id: "velvet", label: "Velvet", css: "radial-gradient(120% 70% at 50% 0%, #5a1a3a 0%, #2a0f22 55%, #160a14 100%)" },
  { id: "starry", label: "Starry night", css: "radial-gradient(1px 1px at 20% 30%, #fff8 50%, transparent 51%), radial-gradient(1px 1px at 70% 20%, #fff6 50%, transparent 51%), radial-gradient(1.5px 1.5px at 40% 60%, #fff5 50%, transparent 51%), radial-gradient(1px 1px at 85% 55%, #fff7 50%, transparent 51%), radial-gradient(1px 1px at 10% 80%, #fff5 50%, transparent 51%), linear-gradient(180deg, #101a3d 0%, #0c1128 60%, #0a0c1a 100%)" },
  { id: "darbar", label: "Royal Darbar", vip: true, css: "radial-gradient(80% 45% at 50% 0%, #f5cf7a55 0%, transparent 70%), repeating-linear-gradient(90deg, #e7bc7212 0 2px, transparent 2px 46px), linear-gradient(180deg, #4a1f08 0%, #2b1206 55%, #160904 100%)" },
  { id: "sheesh-mahal", label: "Sheesh Mahal", vip: true, css: "radial-gradient(2px 2px at 15% 20%, #fff 50%, transparent 51%), radial-gradient(2px 2px at 75% 30%, #ffe9b0 50%, transparent 51%), radial-gradient(1.5px 1.5px at 45% 55%, #fff 50%, transparent 51%), radial-gradient(2px 2px at 85% 75%, #cfe8ff 50%, transparent 51%), conic-gradient(from 45deg at 50% 40%, #2a2350, #5b4a8a, #2a2350, #8a6fb8, #2a2350), linear-gradient(180deg, #1b1538, #0d0a1c)" },
  { id: "aurora", label: "Golden Aurora", vip: true, css: "radial-gradient(70% 40% at 20% 10%, #19c3b255 0%, transparent 70%), radial-gradient(70% 40% at 80% 20%, #e7bc7266 0%, transparent 70%), linear-gradient(180deg, #0b1f24 0%, #0c1416 60%, #08090b 100%)" },
];

/** VIP levels an owner can require before someone takes a seat in a VIP room. */
const SEAT_ACCESS = [1, 3, 6, 10] as const;

const PARTNER: { id: RoomSettings["partnerSeat"]; label: string; hint: string }[] = [
  { id: "all", label: "Enable All", hint: "Every pair of seats is linked" },
  { id: "owner", label: "Owner seat only", hint: "Only the owner's partner seat is linked" },
  { id: "off", label: "Off", hint: "No linked seats" },
];

const COVERS: Cover[] = [
  { theme: "dusk", motif: "banyan" },
  { theme: "rose", motif: "lanterns" },
  { theme: "gold", motif: "temple" },
  { theme: "night", motif: "river" },
  { theme: "monsoon", motif: "kites" },
  { theme: "ember", motif: "huts" },
];

/* ------------------------------------------------------------------ */
/* Room profile sheet                                                   */
/* ------------------------------------------------------------------ */

/** Room profile, styled after the reference: cover, name, tag, ID, level and exp, owner and admins. */
export function RoomInfoSheet({ s }: { s: RoomSession }) {
  const { isJoined, isFollowingRoom, toggleJoinRoom, toggleFollowRoom, announcementOf, roomLevelOf, toast } = useApp();
  const person = usePeople();
  const open = s.panel === "info";
  const close = () => s.setPanel(null);
  const joined = isJoined(s.room.id);
  const following = isFollowingRoom(s.room.id);
  const lvl = roomLevelOf(s.room);
  const staff = [s.room.hostId, ...s.admins.filter((id) => id !== s.room.hostId && !s.kicked.includes(id))];
  const announcement = announcementOf(s.room);

  const share = async () => {
    const text = `Join my room "${s.room.name}" on Panchayat. Room ID ${s.room.code}`;
    try {
      if (navigator.share) await navigator.share({ title: "Panchayat", text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Room invite copied");
      }
    } catch {
      /* share cancelled */
    }
  };

  return (
    <LightSheet
      open={open}
      onClose={close}
      label={`${s.room.name} room profile`}
      tall
      top={
        <span className="absolute -top-11 left-5 z-10 block h-[92px] w-[92px] overflow-hidden rounded-[22px] shadow-[0_10px_24px_-8px_rgb(0_0_0/0.45)]">
          <RoomCover room={s.room} />
        </span>
      }
    >
      {/* Actions (the cover sits above, overlapping the sheet edge) */}
      <div className="relative px-5">
        <div className="flex items-end justify-end">
          <div className="flex gap-3">
            {s.canModerate ? (
              <RoundIcon label="Room settings" onClick={() => s.setPanel("settings")}>
                <Settings className="h-[22px] w-[22px]" />
              </RoundIcon>
            ) : null}
            <RoundIcon label="Share room" onClick={share}>
              <Share2 className="h-[20px] w-[20px]" />
            </RoundIcon>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-[26px] font-extrabold text-[#1f1d3a]">{s.room.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[#ffe9ea] px-2.5 py-0.5 text-[13px] font-extrabold text-[#f0505c]">{s.room.category}</span>
              {s.room.permanent ? <span className="rounded-full bg-[#f2f1f6] px-2.5 py-0.5 text-[13px] font-extrabold text-[#a5a3bd]">{TIERS[lvl.level - 1] ?? "Basic"}</span> : <span className="rounded-full bg-[#f2f1f6] px-2.5 py-0.5 text-[13px] font-extrabold text-[#a5a3bd]">Temporary</span>}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(s.room.code).catch(() => {});
                  toast("Room ID copied");
                }}
                className="flex items-center gap-1 text-[13.5px] font-extrabold text-[#a5a3bd]"
              >
                ID: {s.room.code} <Copy className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
          {s.room.permanent ? (
            <div className="-mr-5 flex shrink-0 items-center gap-2 rounded-l-2xl bg-gradient-to-r from-[#eef3fb] to-[#f8f9fc] py-2 pl-2 pr-4">
              <LevelGem level={lvl.level} />
              <span className="min-w-0">
                <span className="block text-[12px] font-extrabold text-[#1f1d3a]">Room exp</span>
                <span className="block text-[13px] font-extrabold text-[#2f8cf0]">{formatPoints(lvl.points)}</span>
                <span className="mt-0.5 block h-1 w-14 overflow-hidden rounded-full bg-[#dfe3ec]">
                  <span className="block h-full rounded-full bg-[#2f8cf0]" style={{ width: `${lvl.progress * 100}%` }} />
                </span>
              </span>
            </div>
          ) : null}
        </div>

        {/* Owner and admins */}
        <button type="button" onClick={() => s.setPanel("members")} className="mt-5 flex w-full items-center gap-4 text-left" aria-label="Owner and admins, see members">
          <span className="no-scrollbar flex min-w-0 flex-1 gap-4 overflow-x-auto">
            {staff.map((id) => {
              const p = person(id);
              const owner = id === s.room.hostId;
              return (
                <span key={id} className="flex w-[64px] shrink-0 flex-col items-center">
                  <PersonAvatar person={{ ...p, frame: "none" }} size={56} />
                  <span className="mt-1 max-w-full truncate text-[13px] font-extrabold text-[#2b2833]">{id === ME_ID ? "You" : p.name}</span>
                  <span className={`mt-0.5 rounded-full px-1.5 text-[10.5px] font-extrabold ${owner ? "bg-[#fff3dc] text-[#f0a92e]" : "bg-[#e5f3ff] text-[#2f8cf0]"}`}>{owner ? "Owner" : "Admin"}</span>
                </span>
              );
            })}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-[#c4c2cf]" aria-hidden />
        </button>

        {/* Online / Members */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => s.setPanel("online")} className="flex items-center justify-between rounded-2xl bg-[#ebfaf1] px-3.5 py-3 text-left ring-1 ring-[#bfe9cf]">
            <span>
              <span className="block text-[13px] font-extrabold text-[#24b36b]">Online</span>
              <span className="font-display text-[18px] font-extrabold text-[#24b36b]">{s.onlineIds.length}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#24b36b]" aria-hidden />
          </button>
          <button type="button" onClick={() => s.setPanel("members")} className="flex items-center justify-between rounded-2xl bg-[#fff3e6] px-3.5 py-3 text-left ring-1 ring-[#ffd9ad]">
            <span>
              <span className="block text-[13px] font-extrabold text-[#f08a24]">Members</span>
              <span className="font-display text-[18px] font-extrabold text-[#f08a24]">{(s.room.members + (joined ? 1 : 0)).toLocaleString("en-IN")}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#f08a24]" aria-hidden />
          </button>
        </div>

        {!s.isOwner ? (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => toggleJoinRoom(s.room)} className={`h-11 rounded-full text-[14px] font-extrabold ${joined ? "bg-[#f2f1f6] text-[#6d6a7c]" : "bg-gradient-to-r from-[#ffb347] to-[#ff8a3d] text-white"}`}>
              {joined ? "Joined" : "Join"}
            </button>
            <button type="button" onClick={() => toggleFollowRoom(s.room)} className={`h-11 rounded-full text-[14px] font-extrabold ${following ? "bg-[#f2f1f6] text-[#6d6a7c]" : "bg-coral text-white"}`}>
              {following ? "Following" : "Follow"}
            </button>
          </div>
        ) : null}

        <dl className="mt-3 divide-y divide-[#f0eff4] text-[15px]">
          <div className="flex items-center justify-between py-3.5">
            <dt className="font-bold text-[#a5a3bd]">Fans</dt>
            <dd className="font-extrabold text-[#1f1d3a]">{((s.room.fans ?? Math.round(s.room.members * 1.8)) + (following ? 1 : 0)).toLocaleString("en-IN")}</dd>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <dt className="font-bold text-[#a5a3bd]">Nation</dt>
            <dd className="font-extrabold text-[#1f1d3a]">India</dd>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <dt className="font-bold text-[#a5a3bd]">Mode</dt>
            <dd className="font-extrabold text-[#1f1d3a]">{MODE_LABEL[s.mode]}</dd>
          </div>
          <button type="button" onClick={() => s.setPanel("contribution")} className="flex w-full items-center justify-between py-3.5">
            <span className="font-bold text-[#a5a3bd]">Contribution</span>
            <ChevronRight className="h-4 w-4 text-[#c4c2cf]" aria-hidden />
          </button>
          <div className="py-3.5">
            <dt className="font-bold text-[#a5a3bd]">Announcement</dt>
            <dd className="mt-1 text-[14.5px] font-semibold text-[#2b2833]">{announcement || "No announcement yet."}</dd>
          </div>
        </dl>

        {/* Owner vs admins */}
        <div className="mt-2 pb-6">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#a5a3bd]">Owner and admins</p>
          <div className="mt-2 overflow-hidden rounded-2xl ring-1 ring-[#ecebf2]">
            <div className="grid grid-cols-[1fr_54px_54px] bg-[#f7f6fa] px-3 py-2 text-[11.5px] font-extrabold text-[#a5a3bd]">
              <span>Power</span>
              <span className="text-center text-[#f0a92e]">Owner</span>
              <span className="text-center text-[#2f8cf0]">Admin</span>
            </div>
            {PERMISSIONS.map(([label, o, a]) => (
              <div key={label} className="grid grid-cols-[1fr_54px_54px] items-center border-t border-[#f0eff4] px-3 py-2 text-[12.5px] font-semibold text-[#3a3646]">
                <span>{label}</span>
                <span className="grid place-items-center">{o ? <Check className="h-4 w-4 text-[#24b36b]" aria-label="Yes" /> : <Lock className="h-3.5 w-3.5 text-[#c4c2cf]" aria-label="No" />}</span>
                <span className="grid place-items-center">{a ? <Check className="h-4 w-4 text-[#24b36b]" aria-label="Yes" /> : <Lock className="h-3.5 w-3.5 text-[#c4c2cf]" aria-label="No" />}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-[#8d8a9c]">
            You are {s.role === "owner" ? "the owner" : s.role === "admin" ? "an admin" : s.role === "member" ? "a member" : "a guest"} here.
            {s.isOwner ? " Tap anyone in the room to make them an admin, mute them or kick them out." : ""} Only people who have joined and followed the room can be made admins.
          </p>
        </div>
      </div>
    </LightSheet>
  );
}

function RoundIcon({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-12 w-12 place-items-center rounded-full bg-[#f4f3f7] text-[#1f1d3a] hover:bg-[#ebe9f1]">
      {children}
    </button>
  );
}

/** Blue diamond level badge. */
function LevelGem({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0" aria-label={`Room level ${level}`}>
      <defs>
        <linearGradient id="gem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fd4ff" />
          <stop offset="1" stopColor="#1f86e8" />
        </linearGradient>
      </defs>
      <path d="M22 2 L40 22 L22 42 L4 22 Z" fill="url(#gem)" stroke="#bfe8ff" strokeWidth="2" />
      <path d="M22 8 L34 22 L22 36 L10 22 Z" fill="#fff" fillOpacity="0.18" />
      <text x="22" y="28" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff" fontFamily="sans-serif">
        {level}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Settings screen                                                      */
/* ------------------------------------------------------------------ */

type Picker = null | "title" | "cover" | "announcement" | "mode" | "tag" | "background" | "partner" | "password" | "seat" | "font";

/** The owner's room settings, laid out like the reference. Admins can look but not change. */
export function RoomSettingsScreen({ s }: { s: RoomSession }) {
  const { announcementOf, setAnnouncement, vip, toast } = useApp();
  const open = s.panel === "settings";
  const [picker, setPicker] = useState<Picker>(null);
  const st = s.settings;
  const locked = !s.canModerate;
  const announcement = announcementOf(s.room);

  useEffect(() => {
    if (!open) setPicker(null);
  }, [open]);

  // Escape steps back to the room profile (pickers handle their own Escape first)
  useEffect(() => {
    if (!open || picker) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && s.setPanel("info");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, picker, s]);

  const pick = (p: Picker) => {
    if (locked) return;
    setPicker(p);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-[56] flex flex-col bg-[#f4f3f8]"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 40 }}
          role="dialog"
          aria-modal="true"
          aria-label="Room settings"
        >
          <header className="pt-safe bg-white">
            <div className="relative flex h-14 items-center justify-center">
              <button type="button" onClick={() => s.setPanel("info")} aria-label="Back" className="absolute left-2 grid h-10 w-10 place-items-center text-[#1f1d3a]">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h2 className="text-[18px] font-bold text-[#1f1d3a]">Settings</h2>
            </div>
          </header>

          <div className="app-scroll flex-1 pb-safe">
            {locked ? <p className="mx-4 mt-3 rounded-xl bg-[#fff3dc] px-3 py-2 text-[12.5px] font-semibold text-[#a3701c]">Only the owner and admins can change these settings.</p> : null}
            <Group>
              <Row label="Title" value={s.room.name} onClick={() => pick("title")} locked={locked} />
              <Row label="Name font" value={<span style={nameFace(st.nameFont)}>{NAME_FONTS.find((f) => f.id === (st.nameFont ?? "default"))?.label}</span>} onClick={() => pick("font")} locked={locked} />
              <Row
                label="Cover"
                value={
                  <span className="block h-9 w-9 overflow-hidden rounded-full">
                    <RoomCover room={s.room} />
                  </span>
                }
                onClick={() => pick("cover")}
                locked={locked}
              />
              <Row label="Announcement" value={announcement ? <span className="block max-w-[160px] truncate">{announcement}</span> : ""} onClick={() => pick("announcement")} locked={locked} />
              <Row label="Mode" value={MODE_LABEL[s.mode]} onClick={() => pick("mode")} locked={locked} />
              <Row label="Tag" value={s.room.category} onClick={() => pick("tag")} locked={locked} />
              <Row label="Background" value={BACKGROUNDS.find((b) => b.id === st.background)?.label} onClick={() => pick("background")} locked={locked} />
            </Group>
            {s.room.vip ? (
              <Group>
                <Row label="Seat access" value={`VIP ${st.vipSeatLevel ?? 1}+ only`} onClick={() => pick("seat")} locked={locked} />
              </Group>
            ) : null}
            <Group>
              <Row label="Partner Seat" value={PARTNER.find((p) => p.id === st.partnerSeat)?.label} onClick={() => pick("partner")} locked={locked} />
            </Group>
            <Group>
              <SwitchRow label="High Quality Mode" on={st.highQuality} onChange={(v) => s.updateSettings({ highQuality: v })} locked={locked} />
              <SwitchRow label="Ban Text Chatting" on={st.banText} onChange={(v) => s.updateSettings({ banText: v })} locked={locked} />
              <SwitchRow label="No Images" on={st.noImages} onChange={(v) => s.updateSettings({ noImages: v })} locked={locked} />
              <SwitchRow label="Ban Red Packet" on={st.banRedPacket} onChange={(v) => s.updateSettings({ banRedPacket: v })} locked={locked} />
            </Group>
            <Group>
              <SwitchRow
                label="Password"
                hint={s.room.password ? `Password ${s.room.password}` : undefined}
                on={Boolean(s.room.password)}
                onChange={(v) => (v ? pick("password") : s.updateRoom({ password: undefined }, "Owner removed the room password"))}
                locked={locked}
              />
            </Group>
            <Group>
              <SwitchRow label="Manage event" hint="Shows an event banner in the room" on={st.event} onChange={(v) => s.updateSettings({ event: v })} locked={locked} />
            </Group>
            <p className="px-5 pb-6 pt-1 text-[11.5px] text-[#a5a3bd]">Saved on this device. Ban Text Chatting stops members typing; the owner and admins still can.</p>
          </div>

          {/* Pickers */}
          <TextPicker
            open={picker === "title"}
            title="Title"
            initial={s.room.name}
            max={40}
            onClose={() => setPicker(null)}
            onSave={(v) => v.trim().length >= 2 && s.updateRoom({ name: v.trim() }, "Owner changed the title")}
          />
          <TextPicker
            open={picker === "announcement"}
            title="Announcement"
            initial={announcement}
            max={120}
            multiline
            onClose={() => setPicker(null)}
            onSave={(v) => {
              setAnnouncement(s.room, v.trim());
              s.addSystem(`${s.actor} updated the announcement`);
            }}
          />
          <CoverPicker s={s} open={picker === "cover"} onClose={() => setPicker(null)} />
          <OptionPicker
            open={picker === "mode"}
            title="Mode"
            options={(Object.keys(MODE_LABEL) as RoomMode[]).map((m) => ({ id: m, label: MODE_LABEL[m], hint: m === "voice" ? "Voice seats" : m === "youtube" ? "Watch YouTube together" : "Kharidari auction" }))}
            value={s.mode}
            onPick={(m) => s.setMode(m)}
            onClose={() => setPicker(null)}
          />
          <OptionPicker
            open={picker === "tag"}
            title="Tag"
            options={CATEGORIES.map((c) => ({ id: c as string, label: c }))}
            value={s.room.category}
            onPick={(c) => s.updateRoom({ category: c }, "Owner changed the tag")}
            onClose={() => setPicker(null)}
            chips
          />
          <OptionPicker
            open={picker === "background"}
            title="Background"
            options={BACKGROUNDS.map((b) => ({ id: b.id, label: b.vip ? `${b.label} 👑` : b.label, hint: b.vip ? `VIP ${GOLD_NAME_VIP}+ exclusive` : undefined, swatch: b.id === "cover" ? undefined : b.css }))}
            value={st.background}
            onPick={(b) => (BACKGROUNDS.find((x) => x.id === b)?.vip && vip.level < GOLD_NAME_VIP ? toast(`VIP backgrounds unlock at VIP ${GOLD_NAME_VIP}`, "error") : s.updateSettings({ background: b }))}
            onClose={() => setPicker(null)}
          />
          <OptionPicker
            open={picker === "font"}
            title="Room name font"
            options={NAME_FONTS.map((f) => ({ id: f.id, label: s.room.name, hint: f.label, face: nameFace(f.id) }))}
            value={st.nameFont ?? "default"}
            onPick={(f) => s.updateSettings({ nameFont: f })}
            onClose={() => setPicker(null)}
          />
          <OptionPicker
            open={picker === "seat"}
            title="Seat access"
            options={SEAT_ACCESS.map((n) => ({ id: String(n), label: `VIP ${n}+`, hint: n === 1 ? "Any VIP subscriber can sit" : `Only VIP ${n} and above can sit` }))}
            value={String(st.vipSeatLevel ?? 1)}
            onPick={(v) => s.updateSettings({ vipSeatLevel: Number(v) })}
            onClose={() => setPicker(null)}
          />
          <OptionPicker
            open={picker === "partner"}
            title="Partner Seat"
            options={PARTNER}
            value={st.partnerSeat}
            onPick={(p) => s.updateSettings({ partnerSeat: p })}
            onClose={() => setPicker(null)}
          />
          <PasswordPicker open={picker === "password"} onClose={() => setPicker(null)} onSave={(pw) => s.updateRoom({ password: pw }, "Owner locked the room with a password")} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <div className="mt-3 bg-white">{children}</div>;
}

function Row({ label, value, onClick, locked }: { label: string; value?: ReactNode; onClick: () => void; locked: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={locked} className="flex min-h-[58px] w-full items-center gap-3 px-5 text-left disabled:cursor-default">
      <span className="flex-1 text-[17px] font-extrabold text-[#1f1d3a]">{label}</span>
      <span className="text-[15px] font-extrabold text-[#a5a3bd]">{value}</span>
      <ChevronRight className="h-4 w-4 text-[#c4c2cf]" aria-hidden />
    </button>
  );
}

function SwitchRow({ label, hint, on, onChange, locked }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void; locked: boolean }) {
  return (
    <div className="flex min-h-[58px] items-center gap-3 px-5">
      <span className="flex-1">
        <span className="block text-[17px] font-extrabold text-[#1f1d3a]">{label}</span>
        {hint ? <span className="block text-[11.5px] font-semibold text-[#a5a3bd]">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={locked}
        onClick={() => onChange(!on)}
        className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-[#19c3f0]" : "bg-[#e6e5ec]"}`}
      >
        <motion.span className="absolute top-[3px] h-6 w-6 rounded-full bg-white shadow" animate={{ left: on ? 25 : 3 }} transition={{ type: "spring", stiffness: 500, damping: 34 }} />
      </button>
    </div>
  );
}

/** Light bottom sheet for the settings pickers and the room profile. */
function LightSheet({ open, onClose, label, children, tall = false, top }: { open: boolean; onClose: () => void; label: string; children: ReactNode; tall?: boolean; top?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={label}>
          <motion.button type="button" aria-label="Close" className="absolute inset-0 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className={`pb-safe relative rounded-t-[28px] bg-white ${tall ? "max-h-[86%]" : "max-h-[75%]"} flex flex-col`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
          >
            {top}
            <div className={`app-scroll rounded-t-[28px] ${tall ? "pt-4" : "pt-2"}`}>{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function PickerHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pb-2 pt-3">
      <p className="text-[18px] font-extrabold text-[#1f1d3a]">{title}</p>
      <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-[#f4f3f7] text-[#1f1d3a]">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function TextPicker({ open, title, initial, max, multiline, onClose, onSave }: { open: boolean; title: string; initial: string; max: number; multiline?: boolean; onClose: () => void; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  useEffect(() => {
    if (open) setV(initial);
  }, [open, initial]);
  const cls = "w-full rounded-2xl border border-[#e6e5ec] bg-[#f7f6fa] px-4 py-3 text-[16px] font-semibold text-[#1f1d3a] focus:border-[#19c3f0] focus:outline-none";
  return (
    <LightSheet open={open} onClose={onClose} label={title}>
      <PickerHeader title={title} onClose={onClose} />
      <div className="px-5 pb-5">
        {multiline ? (
          <textarea value={v} onChange={(e) => setV(e.target.value.slice(0, max))} rows={3} aria-label={title} className={`${cls} resize-none`} autoFocus />
        ) : (
          <input value={v} onChange={(e) => setV(e.target.value.slice(0, max))} aria-label={title} className={cls} autoFocus />
        )}
        <p className="mt-1 text-right text-[11px] text-[#a5a3bd]">
          {v.length}/{max}
        </p>
        <button
          type="button"
          onClick={() => {
            onSave(v);
            onClose();
          }}
          className="mt-2 h-12 w-full rounded-full bg-[#19c3f0] text-[15px] font-extrabold text-white"
        >
          Save
        </button>
      </div>
    </LightSheet>
  );
}

function OptionPicker<T extends string>({
  open,
  title,
  options,
  value,
  onPick,
  onClose,
  chips,
}: {
  open: boolean;
  title: string;
  options: { id: T; label: string; hint?: string; swatch?: string; face?: CSSProperties }[];
  value: T;
  onPick: (v: T) => void;
  onClose: () => void;
  chips?: boolean;
}) {
  return (
    <LightSheet open={open} onClose={onClose} label={title}>
      <PickerHeader title={title} onClose={onClose} />
      <div className={`px-5 pb-6 ${chips ? "flex flex-wrap gap-2" : ""}`} role="radiogroup" aria-label={title}>
        {options.map((o) => {
          const on = o.id === value;
          return chips ? (
            <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => (onPick(o.id), onClose())} className={`h-10 rounded-full px-4 text-[14px] font-extrabold ${on ? "bg-[#ffe9ea] text-[#f0505c] ring-1 ring-[#f0505c]/40" : "bg-[#f4f3f7] text-[#5b5868]"}`}>
              {o.label}
            </button>
          ) : (
            <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => (onPick(o.id), onClose())} className="flex w-full items-center gap-3 border-b border-[#f0eff4] py-3.5 text-left last:border-0">
              {o.swatch !== undefined || o.id === "cover" ? (
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-[#e6e5ec]" style={{ background: o.swatch }}>
                  {o.swatch === undefined ? <SunsetScene theme="dusk" motif="banyan" /> : null}
                </span>
              ) : null}
              <span className="flex-1">
                <span className="block text-[16px] font-extrabold text-[#1f1d3a]" style={o.face}>
                  {o.label}
                </span>
                {o.hint ? <span className="block text-[12px] font-semibold text-[#a5a3bd]">{o.hint}</span> : null}
              </span>
              {on ? <Check className="h-5 w-5 text-[#19c3f0]" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </LightSheet>
  );
}

function CoverPicker({ s, open, onClose }: { s: RoomSession; open: boolean; onClose: () => void }) {
  const { toast } = useApp();
  const input = useRef<HTMLInputElement>(null);
  return (
    <LightSheet open={open} onClose={onClose} label="Cover">
      <PickerHeader title="Cover" onClose={onClose} />
      <div className="px-5 pb-6">
        <button type="button" onClick={() => input.current?.click()} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#e8f8fd] text-[15px] font-extrabold text-[#0f9cc4]">
          <ImagePlus className="h-5 w-5" aria-hidden /> Upload a picture
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          aria-label="Upload room cover"
          data-testid="room-cover-input"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const data = await cropImage(file, 480, 480, 0.8);
              s.updateRoom({ coverImage: data }, "Owner changed the cover");
              onClose();
            } catch {
              toast("Couldn't read that image. Try a JPG or PNG.", "error");
            }
          }}
        />
        <p className="mt-4 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#a5a3bd]">Or pick a scene</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {COVERS.map((c) => {
            const on = !s.room.coverImage && s.room.cover.theme === c.theme && s.room.cover.motif === c.motif;
            return (
              <button
                key={c.theme}
                type="button"
                onClick={() => {
                  s.updateRoom({ cover: c, coverImage: undefined }, "Owner changed the cover");
                  onClose();
                }}
                className={`relative overflow-hidden rounded-2xl ring-2 ${on ? "ring-[#19c3f0]" : "ring-transparent"}`}
              >
                <span className="block aspect-square">
                  <SunsetScene {...c} shade />
                </span>
                <span className="absolute bottom-1 left-2 text-[10.5px] font-semibold text-white">{COVER_LABELS[c.theme]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </LightSheet>
  );
}

function PasswordPicker({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  useEffect(() => {
    if (open) setPw("");
  }, [open]);
  return (
    <LightSheet open={open} onClose={onClose} label="Room password">
      <PickerHeader title="Room password" onClose={onClose} />
      <div className="px-5 pb-6">
        <p className="text-[13px] font-semibold text-[#8d8a9c]">Everyone except you will need this 4-digit password to enter.</p>
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          aria-label="4-digit password"
          placeholder="••••"
          autoFocus
          className="mt-3 h-14 w-full rounded-2xl border border-[#e6e5ec] bg-[#f7f6fa] text-center font-display text-[26px] font-extrabold tracking-[0.5em] text-[#1f1d3a] focus:border-[#19c3f0] focus:outline-none"
        />
        <button
          type="button"
          disabled={pw.length !== 4}
          onClick={() => {
            onSave(pw);
            onClose();
          }}
          className="mt-3 h-12 w-full rounded-full bg-[#19c3f0] text-[15px] font-extrabold text-white disabled:opacity-40"
        >
          Lock room
        </button>
      </div>
    </LightSheet>
  );
}
