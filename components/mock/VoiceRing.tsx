import { MEMBERS, ROOM, type Member } from "@/lib/mock-data";
import { Avatar } from "./Avatar";

type VoiceRingProps = {
  members?: Member[];
  avatarSize?: number;
  live?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Replace the default room info in the middle of the circle. */
  center?: React.ReactNode;
};

/**
 * The signature Panchayat layout: everyone sits in a circle, like a village
 * panchayat under the banyan tree, with the room's host at the head.
 */
export function VoiceRing({ members = MEMBERS, avatarSize = 58, live = true, className, children, center }: VoiceRingProps) {
  const radius = 39; // % of the container

  return (
    <div className={`relative aspect-square w-full ${className ?? ""}`} style={{ containerType: "inline-size" }}>
      {/* Concentric "chaupal" rings */}
      <div aria-hidden className="absolute inset-[11%] rounded-full border border-line" />
      <div aria-hidden className="absolute inset-[24%] rounded-full border border-dashed border-gold/20" />
      <div
        aria-hidden
        className="absolute inset-[28%] rounded-full"
        style={{ background: "radial-gradient(circle, rgb(244 81 91 / 0.22), rgb(231 188 114 / 0.06) 55%, transparent 72%)" }}
      />

      {/* Centre: room info (or custom content) */}
      {center ?? (
        <div className="absolute inset-[30%] flex flex-col items-center justify-center rounded-full border border-line-strong bg-ink-2/90 p-3 text-center shadow-[inset_0_1px_0_rgb(255_241_213/0.08)]">
          <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-semibold text-pink">
            <span className="h-1.5 w-1.5 rounded-full bg-pink" aria-hidden />
            Live room
          </span>
          <p className="font-display text-[clamp(0.8rem,4.6cqw,1.2rem)] font-bold leading-tight text-cream">{ROOM.title}</p>
          <p className="mt-0.5 text-[clamp(0.6rem,3cqw,0.78rem)] text-muted">{ROOM.topic}</p>
          {children}
        </div>
      )}

      {/* Seats */}
      <ul className="absolute inset-0" aria-label="People in the room">
        {members.map((m, i) => {
          const angle = (-90 + (i * 360) / members.length) * (Math.PI / 180);
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);
          return (
            <li
              key={m.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <Avatar member={m} size={avatarSize} live={live} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
