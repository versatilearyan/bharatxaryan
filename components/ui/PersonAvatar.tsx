"use client";

import { motion } from "framer-motion";
import { Crown as CrownIcon, MicOff } from "lucide-react";
import { AvatarArt } from "@/components/mock/Avatar";
import type { Person } from "@/lib/app/types";

type Props = {
  person: Pick<Person, "id" | "look" | "frame"> & { photo?: string };
  size?: number;
  speaking?: boolean;
  muted?: boolean;
  host?: boolean;
  className?: string;
};

/** Illustrated avatar (or photo) with speaking ring and status badges. Frames are the animated VIP ones, drawn around it by VipFrame. */
export function PersonAvatar({ person, size = 48, speaking = false, muted = false, host = false, className = "" }: Props) {
  const gid = `${person.id}-${person.look.bg.slice(1)}-${person.look.outfit.slice(1)}-${person.look.hairStyle}`;

  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      {speaking ? (
        <>
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-speak"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.35, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
          <span aria-hidden className="absolute -inset-[3px] rounded-full border-2 border-speak" />
        </>
      ) : null}
      <span className="relative block h-full w-full rounded-full">
        {person.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.photo} alt="" className="h-full w-full rounded-full object-cover" draggable={false} />
        ) : (
          <AvatarArt look={person.look} gid={gid} />
        )}
      </span>
      {host ? (
        <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-ink ring-2 ring-ink" title="Host">
          <CrownIcon className="h-3 w-3" aria-hidden />
        </span>
      ) : null}
      {muted ? (
        <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink-2 ring-2 ring-surface">
          <MicOff className="h-3 w-3 text-muted" aria-hidden />
        </span>
      ) : null}
    </span>
  );
}
