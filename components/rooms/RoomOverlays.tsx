"use client";

import { VipBadge } from "@/components/effects/VipFx";
import { useMarket } from "@/lib/app/market-store";
import { RoomCover } from "@/components/rooms/RoomCover";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Copy, Eye, Gift, Heart, Lock, LockOpen, MessageCircle, Mic, MicOff, Pencil, Shield, ShieldOff, User, UserMinus, UserPlus, UserX, X } from "lucide-react";
import { SunsetScene } from "@/components/art/SunsetScene";
import { GiftPanel } from "@/components/gifts/GiftPanel";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { CharmBadge } from "@/components/ui/CharmBadge";
import { Button, formatCount } from "@/components/ui/kit";
import { usePeople } from "@/lib/app/people";
import { vipName } from "@/lib/app/levels";
import { ME_ID, useApp } from "@/lib/app/store";
import { MicQueueSheet, RoleBadge } from "./RoomParts";
import { RoomPeopleSheet } from "./RoomPeopleSheet";
import { TagStrip, TagTitleChip } from "./TagParts";
import { RoomInfoSheet, RoomSettingsScreen } from "./RoomSettings";
import type { RoomSession } from "./useRoomSession";
import { nameFace } from "@/lib/app/fonts";
import { LevelPill } from "@/components/profile/IdTags";

/** Sheets and cards shared by every room mode: profile card, seat menu, room info, people. */
export function RoomOverlays({ s }: { s: RoomSession }) {
  const [giftTo, setGiftTo] = useState<string | null>(null);
  return (
    <>
      <RoomProfileCard s={s} onGift={(id) => setGiftTo(id)} />
      <SeatMenuSheet s={s} />
      <RoomInfoSheet s={s} />
      <RoomSettingsScreen s={s} />
      <RoomPeopleSheet s={s} />
      <MicQueueSheet s={s} />
      <GiftPanel open={Boolean(giftTo)} onClose={() => setGiftTo(null)} s={s} initialTo={giftTo ?? undefined} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Profile card                                                         */
/* ------------------------------------------------------------------ */

function RoomProfileCard({ s, onGift }: { s: RoomSession; onGift: (id: string) => void }) {
  const { profile, toggleFollow, openConversation, minimizeRoom, toast, membershipOf, openIntimateSpace, openProfile } = useApp();
  const person = usePeople();
  const id = s.cardId;
  const p = id ? person(id) : null;
  const cardFx = useMarket().effectsFor(id ?? "", p?.vip);
  const close = () => s.openCard(null);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && s.openCard(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, s]);

  if (!p || !id) return <AnimatePresence />;
  const role = id === s.room.hostId ? "owner" : s.admins.includes(id) ? "admin" : null;
  const onMic = s.seatedIds.includes(id);
  const following = profile.following.includes(id);
  const manage = s.canManage(id);
  const membership = membershipOf(s.room, id);
  const eligible = membership.joined && membership.followed;
  const me = id === ME_ID;

  const Action = ({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) => (
    <button type="button" onClick={onClick} className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold ${danger ? "text-[#e2404a]" : "text-[#3a3340]"} hover:bg-black/[0.04]`}>
      <span className={`grid h-10 w-10 place-items-center rounded-full ${danger ? "bg-[#ffe3e5]" : "bg-[#f1edf4]"}`}>{icon}</span>
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-[55] grid place-items-center p-6" role="dialog" aria-modal="true" aria-label={`${p.name}'s profile`}>
        <motion.button type="button" aria-label="Close" className="absolute inset-0 bg-black/65" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={close} />
        <motion.div
          className="relative w-full max-w-[340px] overflow-hidden rounded-3xl bg-white shadow-2xl"
          initial={{ opacity: 0, scale: 0.92, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
          <div className="relative h-28">
            {p.id === ME_ID && profile.banner ? <img src={profile.banner} alt="" className="h-full w-full object-cover" /> : <SunsetScene theme="rose" motif="lanterns" />}
            <button type="button" onClick={close} className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-black/35 text-white" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 pb-5">
            <div className="-mt-7 flex items-end gap-3">
              <button type="button" onClick={() => (close(), openProfile(p.id))} aria-label={`Open ${p.name}'s profile`} className="shrink-0 rounded-full">
                <PersonAvatar person={p} size={76} className="rounded-full ring-4 ring-white" />
              </button>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-[19px] font-extrabold text-[#1c1820]">
                  <span className={`${vipName(p.vip)} truncate`} style={nameFace(p.nameFont)}>{p.name}</span> {cardFx.badge ? <VipBadge set={cardFx.badge} level={p.vip} size={18} animated /> : null} {role ? <RoleBadge role={role} /> : null}
                </p>
                <div className="mt-0.5 flex items-center gap-1">
                  {/* Backend room users: their level isn't sent by the participants API, so none is shown */}
                  {p.id.startsWith("srv-user:") ? null : <LevelPill level={p.level} gender={p.gender} size="sm" />}
                  <CharmBadge personId={id} light showCount />
                  <span className={`rounded px-1.5 text-[10px] font-bold ${membership.joined ? "bg-[#fff3e6] text-[#f08a24]" : "bg-[#f1edf4] text-[#a5a3bd] line-through"}`}>Member</span>
                  <span className={`rounded px-1.5 text-[10px] font-bold ${membership.followed ? "bg-[#ffe9ea] text-[#f0505c]" : "bg-[#f1edf4] text-[#a5a3bd] line-through"}`}>Fan</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(p.uid).catch(() => {});
                toast(`ID ${p.uid} copied`);
              }}
              className="mt-2 flex items-center gap-1 text-[13px] font-bold text-[#8d8796]"
            >
              ID: {p.uid} <Copy className="h-3.5 w-3.5" aria-hidden />
            </button>
            <TagTitleChip personId={id} className="mt-1.5 !text-[#7a3fa8]" />
            <p className="mt-1.5 line-clamp-2 text-[13px] text-[#5b5163]">{p.bio}</p>
            <TagStrip
              personId={id}
              light
              onOpen={() => {
                close();
                minimizeRoom();
                openIntimateSpace(id);
              }}
            />

            {me ? (
              // Your own card: your profile and a gift to yourself, then your seat controls
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => (close(), openProfile(id))} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#3aa0f0] text-[13px] font-bold text-white">
                  <User className="h-4 w-4" /> My profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onGift(id);
                  }}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff7d8e] to-[#f4515b] text-[13px] font-bold text-white"
                >
                  <Gift className="h-4 w-4" /> Gift
                </button>
              </div>
            ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => toggleFollow(id)} className={`flex h-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-bold ${following ? "bg-[#f1edf4] text-[#3a3340]" : "bg-coral text-white"}`}>
                {following ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} {following ? "Following" : "Follow"}
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  minimizeRoom();
                  openConversation(id);
                }}
                className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#3aa0f0] text-[13px] font-bold text-white"
              >
                <MessageCircle className="h-4 w-4" /> Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  onGift(id);
                }}
                className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff7d8e] to-[#f4515b] text-[13px] font-bold text-white"
              >
                <Gift className="h-4 w-4" /> Gift
              </button>
            </div>
            )}

            {me && onMic ? (
              <div className="mt-4 border-t border-black/[0.06] pt-3">
                <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8d8796]">Your seat</p>
                <div className="grid grid-cols-4">
                  <Action icon={s.muted ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />} label={s.muted ? "Unmute" : "Mute"} onClick={() => s.toggleMute()} />
                  {/* Spectate: leave the seat but stay in the room as a listener. The owner's seat is fixed. */}
                  {!s.isOwner ? (
                    <Action
                      icon={<Eye className="h-4.5 w-4.5" />}
                      label="Spectate"
                      onClick={() => {
                        s.leaveSeat();
                        close();
                      }}
                    />
                  ) : null}
                </div>
                {s.isOwner ? <p className="mt-1 text-[11.5px] text-[#6d6575]">As the owner, your seat is fixed at the top of the room.</p> : null}
              </div>
            ) : null}

            {manage && !me ? (
              <div className="mt-4 border-t border-black/[0.06] pt-3">
                <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8d8796]">{s.isOwner ? "Owner tools" : "Admin tools"}</p>
                <div className="grid grid-cols-4">
                  {onMic ? (
                    <>
                      <Action icon={s.forceMuted.includes(id) ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />} label={s.forceMuted.includes(id) ? "Unmute" : "Mute"} onClick={() => s.toggleForceMute(id)} />
                      {id !== s.room.hostId ? <Action icon={<UserMinus className="h-4.5 w-4.5" />} label="Off mic" onClick={() => s.removeFromMic(id)} /> : null}
                    </>
                  ) : (
                    <Action icon={<Mic className="h-4.5 w-4.5" />} label="Invite to mic" onClick={() => s.inviteToSeat(id)} />
                  )}
                  {s.isOwner ? (
                    <Action
                      icon={role === "admin" ? <ShieldOff className="h-4.5 w-4.5" /> : <Shield className="h-4.5 w-4.5" />}
                      label={role === "admin" ? "Remove admin" : "Make admin"}
                      onClick={() => s.setAdmin(id, role !== "admin")}
                    />
                  ) : null}
                  <Action icon={<UserX className="h-4.5 w-4.5" />} label="Kick out" danger onClick={() => s.kick(id)} />
                </div>
              </div>
            ) : null}
            {manage && s.isOwner && !role && !eligible ? (
              <p className="mt-2 rounded-xl bg-[#f6f3f8] p-2.5 text-[11.5px] text-[#6d6575]">
                {p.name} hasn&apos;t {!membership.joined && !membership.followed ? "joined or followed" : !membership.joined ? "joined" : "followed"} this room yet, so they can&apos;t be made an admin.
              </p>
            ) : null}
            {!manage && s.canModerate && id !== ME_ID ? (
              <p className="mt-4 rounded-xl bg-[#f6f3f8] p-2.5 text-[11.5px] text-[#6d6575]">{role === "owner" ? "This is the room owner." : "Only the owner can manage another admin."}</p>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Seat menu                                                            */
/* ------------------------------------------------------------------ */

function SeatMenuSheet({ s }: { s: RoomSession }) {
  const person = usePeople();
  const [inviting, setInviting] = useState(false);
  const index = s.seatMenu;
  const open = index !== null;
  const close = () => {
    s.setSeatMenu(null);
    setInviting(false);
  };
  const id = index !== null ? s.seats[index] : null;
  const mine = id === ME_ID;
  const closed = index !== null && s.closedSeats.includes(index);

  const Line = ({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) => (
    <button type="button" onClick={onClick} className={`block w-full border-b border-line py-3.5 text-center text-[15px] font-semibold ${danger ? "text-[#ff8a8f]" : "text-cream"}`}>
      {label}
    </button>
  );

  return (
    <BottomSheet open={open} onClose={close} title={mine ? "Your seat" : index !== null ? `Seat No.${index + 1}` : ""}>
      <div className="px-5 pb-4">
        {index === null ? null : mine ? (
          <>
            <Line
              label={s.muted ? "Unmute my mic" : "Mute my mic"}
              onClick={() => {
                s.toggleMute();
                close();
              }}
            />
            {s.isOwner ? (
              <p className="py-3 text-center text-[12px] text-muted">As the owner, your seat is fixed at the top of the room.</p>
            ) : (
              <Line
                label="Leave the mic"
                onClick={() => {
                  s.leaveSeat();
                  close();
                }}
              />
            )}
          </>
        ) : inviting ? (
          <ul>
            {s.listenerIds.length === 0 ? <p className="py-4 text-center text-[13px] text-muted">Nobody is waiting off the mic right now.</p> : null}
            {s.listenerIds.map((pid) => {
              const p = person(pid);
              return (
                <li key={pid}>
                  <button
                    type="button"
                    onClick={() => {
                      s.inviteToSeat(pid, index);
                      close();
                    }}
                    className="flex w-full items-center gap-3 py-2 text-left"
                  >
                    <PersonAvatar person={p} size={40} />
                    <span className="flex-1 text-[14px] font-semibold text-cream">{p.name}</span>
                    <span className="rounded-full bg-coral px-3 py-1 text-[12px] font-bold text-white">Invite</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            {!s.isOwner && index !== 0 && !closed ? (
              <Line
                label="Take this seat"
                onClick={() => {
                  s.takeSeat(index);
                  close();
                }}
              />
            ) : null}
            {index !== 0 ? (
              <>
                <Line
                  label={closed ? "Open seat" : "Close seat"}
                  onClick={() => {
                    s.setSeatClosed(index, !closed);
                    close();
                  }}
                />
                <Line
                  label={s.mutedSeats.includes(index) ? "Unmute seat" : "Mute seat"}
                  onClick={() => {
                    s.setSeatMuted(index, !s.mutedSeats.includes(index));
                    close();
                  }}
                />
                <Line label="Invite someone" onClick={() => setInviting(true)} />
              </>
            ) : (
              <p className="py-3 text-center text-[12px] text-muted">This seat belongs to the owner.</p>
            )}
          </>
        )}
        <button type="button" onClick={close} className="mt-1 block w-full py-3.5 text-center text-[15px] font-semibold text-muted">
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
