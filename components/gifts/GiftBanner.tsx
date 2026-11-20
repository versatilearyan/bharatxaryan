"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, X } from "lucide-react";
import { GiftArt } from "@/components/art/GiftArt";
import { Marquee, roomKind } from "@/components/redpacket/RedPacket";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Modal } from "@/components/ui/Modal";
import { giftById } from "@/lib/app/data";
import { useGiftNews } from "@/lib/app/gift-news-store";
import { usePeople } from "@/lib/app/people";
import { useRedPackets } from "@/lib/app/redpacket-store";
import { ME_ID, useApp } from "@/lib/app/store";
import { useServerRooms } from "@/lib/app/server-rooms";
import { getRoomById } from "@/lib/api/voice-rooms";

/**
 * The server-wide gift notification: a royal purple and gold ribbon that
 * slides across the top of the app when someone sends a big animated gift,
 * with the sender's message. It waits its turn behind red packet banners.
 */
export function GiftBanner() {
  const { news, dismiss } = useGiftNews();
  const { banners } = useRedPackets();
  const { roomById, openRoom, activeRoomId } = useApp();
  const person = usePeople();
  const n = banners.length ? undefined : news;
  const id = n?.id;
  useEffect(() => {
    if (!id) return;
    const t = window.setTimeout(() => dismiss(id), 8_000);
    return () => window.clearTimeout(t);
  }, [id, dismiss]);
  const room = n ? roomById(n.roomId) : undefined;
  // A room we don't know and that isn't a server room: nothing to show
  const known = Boolean(room || n?.serverRoomId);
  useEffect(() => {
    if (id && !known) dismiss(id);
  }, [id, known, dismiss]);
  const { addCreated } = useServerRooms();
  const go = async () => {
    if (!n) return;
    dismiss(n.id);
    if (!room && n.serverRoomId) {
      try {
        addCreated(await getRoomById(n.serverRoomId));
      } catch {
        return;
      }
    }
    openRoom(n.roomId);
  };
  const here = n?.roomId === activeRoomId;
  const locked = Boolean(room?.password) && room?.hostId !== ME_ID;
  const name = (pid: string) => (pid === ME_ID ? "You" : person(pid).name);
  // Tapping the banner asks first, instead of jumping straight into the room
  const [ask, setAsk] = useState(false);
  const askLabel = n ? (room ? `${roomKind(room)} ${room.code}` : (n.roomName ?? "a room")) : "";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--st)+50px)] z-[66] h-[48px] overflow-hidden">
      <AnimatePresence>
        {n && known ? (
          <motion.div
            key={n.id}
            role="status"
            aria-label="Gift notification"
            initial={{ x: "105%" }}
            animate={{ x: 0 }}
            exit={{ x: "-105%" }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
            // Tap anywhere on the banner: asks first before taking you to the room where it happened
            onClick={here ? () => dismiss(n.id) : () => setAsk(true)}
            className="pointer-events-auto absolute inset-x-3 top-1.5 flex h-[38px] cursor-pointer items-center"
          >
            <motion.span className="relative z-10 -mr-5 h-[40px] w-[40px] shrink-0 drop-shadow-[0_3px_8px_rgb(0_0_0/0.5)]" animate={{ rotate: [-6, 6, -6], scale: [1, 1.06, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
              <GiftArt id={n.giftId} />
            </motion.span>
            <div className="relative flex h-[34px] min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-full bg-[linear-gradient(90deg,rgb(76_24_140/0.96),rgb(132_40_160/0.92)_55%,rgb(190_60_140/0.88))] pl-6 pr-1 shadow-[0_4px_16px_-4px_rgb(150_60_220/0.7)] ring-1 ring-[#f6d899]/55 backdrop-blur-sm">
              {/* A thin gold line along the top edge and a soft sheen */}
              <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#ffe3a3]/80 to-transparent" aria-hidden />
              <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-20" aria-hidden />
              <span className="relative flex shrink-0 items-center">
                <PersonAvatar person={{ ...person(n.fromId), frame: "none" }} size={20} />
                <span className="-ml-1.5 rounded-full ring-[1.5px] ring-[#8a2bb8]">
                  <PersonAvatar person={{ ...person(n.toId), frame: "none" }} size={20} />
                </span>
              </span>
              <span className="relative flex min-w-0 flex-1 flex-col overflow-hidden leading-none">
                <Marquee className="text-[11.5px] font-bold text-white drop-shadow-[0_1px_1px_rgb(40_0_60/0.6)]">
                  {name(n.fromId)} sent <span className="font-extrabold text-[#ffd98a]">{giftById(n.giftId).name}{n.count > 1 ? ` ×${n.count}` : ""}</span> to {n.toId === n.fromId ? (n.fromId === ME_ID ? "yourself" : "themselves") : name(n.toId)} in {room ? `${roomKind(room)} ${room.code}` : (n.roomName ?? "a room")}
                  {n.message ? <span className="font-semibold italic text-[#ffe9bf]"> · “{n.message}”</span> : null}
                </Marquee>
              </span>
              {here ? (
                <span className="relative shrink-0 rounded-full bg-[#4c1888] px-2 py-[3px] text-[10.5px] font-bold text-white ring-1 ring-white/25">Here</span>
              ) : locked ? (
                <span className="relative flex shrink-0 items-center gap-1 rounded-full bg-black/25 px-2 py-[3px] text-[10.5px] font-bold text-white/85">
                  <Lock className="h-2.5 w-2.5" aria-hidden /> Locked
                </span>
              ) : (
                <span className="relative shrink-0 rounded-full bg-gradient-to-b from-[#fff3c4] to-[#f0c66a] px-2.5 py-[3px] text-[11px] font-extrabold text-[#5b1fa8] shadow-[0_1px_4px_rgb(0_0_0/0.25)]">Join</span>
              )}
              {/* Close just this notification (the tap on the banner would otherwise take you to the room) */}
              <button
                type="button"
                aria-label="Close notification"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(n.id);
                }}
                className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black/25 text-white/85 active:bg-black/45"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Modal open={ask} onClose={() => setAsk(false)} title="Join this room?" className="max-w-[300px] text-center">
        <p className="text-[13px] leading-relaxed text-cream/80">
          {name(n?.fromId ?? "")} sent a gift in <span className="font-bold text-gold">{askLabel}</span>. Go there now?
        </p>
        <button
          type="button"
          onClick={() => {
            setAsk(false);
            void go();
          }}
          className="mt-4 h-11 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[14px] font-extrabold text-[#2a1a0c]"
        >
          Go to room
        </button>
        <button type="button" onClick={() => setAsk(false)} className="mt-2 h-10 w-full rounded-full text-[13px] font-semibold text-cream/60">
          Not now
        </button>
      </Modal>
    </div>
  );
}
