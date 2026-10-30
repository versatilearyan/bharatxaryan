import { MicOff } from "lucide-react";
import type { Member } from "@/lib/mock-data";
import { Crown } from "@/components/brand/Crown";

const HAIR: Record<Member["hairStyle"], string> = {
  // short textured crop
  0: "M17.5 27 C16 15 23 10.5 32 10.5 C41.5 10.5 48.5 15 46.5 27 C45 22.5 42 20.5 38 19.5 C35 21 29 21.5 24 19.8 C20.5 21 18.5 23.5 17.5 27 Z",
  // long hair, side part (back layer drawn separately)
  1: "M17 30 C15 16 23 11 33 11 C43 11 49 17 47 30 C45 23 41 19.5 35 18 C30 21 23 22 17 30 Z",
  // top bun
  2: "M17.5 27 C16.5 16 23 12 32 12 C41 12 47.5 16 46.5 27 C43 21 38 19 32 19 C26 19 21 21 17.5 27 Z M26 8.5 a6 5.5 0 1 0 12 0 a6 5.5 0 1 0 -12 0 Z",
  // curls
  3: "M16.5 28 C14 21 17 13.5 23 12.5 C25.5 9 31 8 35 10.5 C40 8.5 46 11.5 47.5 17 C50.5 20 50 25 47.5 28.5 C45 23 40 20.5 32 20.5 C24.5 20.5 19.5 23 16.5 28 Z",
};

const FRAME_STYLE: Record<Member["frame"], string> = {
  none: "",
  gold: "conic-gradient(from 210deg, #fff1c9, #e7bc72, #a8742f, #f6d899, #e7bc72, #fff1c9)",
  coral: "conic-gradient(from 90deg, #ff647c, #f4515b, #ffb199, #ff647c)",
  bloom: "conic-gradient(from 0deg, #e7bc72, #ff647c, #e7bc72, #ff647c, #e7bc72)",
};

type AvatarProps = {
  member: Member;
  size?: number;
  showName?: boolean;
  /** Animate the speaking ring (off in static/blurred previews). */
  live?: boolean;
};

/** Illustrated, fictional avatar with an optional profile frame and voice-activity ring. */
export function Avatar({ member, size = 64, showName = true, live = true }: AvatarProps) {
  const framed = member.frame !== "none";
  const gid = `${member.id}-${member.bg.slice(1)}-${member.outfit.slice(1)}`;
  const ring = framed ? Math.max(3, Math.round(size * 0.07)) : 0;

  return (
    <figure className="flex flex-col items-center gap-1.5" style={{ width: size + 12 }}>
      <div className="relative" style={{ width: size, height: size }}>
        {member.speaking && live ? (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-speak/80 animate-ping-soft" aria-hidden />
            <span className="absolute -inset-[3px] rounded-full border-2 border-speak" aria-hidden />
          </>
        ) : null}

        <div
          className="relative h-full w-full rounded-full"
          style={{ padding: ring, background: framed ? FRAME_STYLE[member.frame] : undefined }}
        >
          <AvatarArt look={member} gid={gid} />
        </div>

        {member.frame === "bloom" ? (
          <span aria-hidden className="absolute -inset-1 rounded-full border border-dashed border-gold/70" />
        ) : null}

        {member.host ? (
          <Crown className="absolute" style={{ width: size * 0.42, height: size * 0.32, top: -size * 0.24, left: "50%", marginLeft: -size * 0.21 }} />
        ) : null}

        {member.muted ? (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink-2 ring-2 ring-surface">
            <MicOff className="h-3 w-3 text-muted" aria-hidden />
          </span>
        ) : null}

        {member.speaking ? (
          <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-end gap-[2px] rounded-full bg-ink/90 px-1.5 py-1" aria-hidden>
            {[0, 0.15, 0.3].map((d) => (
              <span
                key={d}
                className={`block h-2 w-[3px] origin-bottom rounded-full bg-speak ${live ? "animate-eq" : ""}`}
                style={{ animationDelay: `${d}s` }}
              />
            ))}
          </span>
        ) : null}
      </div>
      {showName ? (
        <figcaption className="max-w-full truncate text-center text-[11px] font-medium text-cream/85">
          {member.name}
          <span className="sr-only">{member.speaking ? " (speaking)" : member.muted ? " (muted)" : ""}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}

export type AvatarLook = Pick<Member, "bg" | "skin" | "hair" | "hairStyle" | "outfit">;

/** The illustrated face itself, shared by the landing mockups and the web app. */
export function AvatarArt({ look, gid, className = "h-full w-full rounded-full" }: { look: AvatarLook; gid: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        {/* Same member always produces identical gradients, so repeated ids are harmless */}
        <radialGradient id={`bg-${gid}`} cx="0.3" cy="0.2" r="0.95">
          <stop offset="0" stopColor={look.bg} stopOpacity="0.55" />
          <stop offset="0.5" stopColor={look.bg} />
          <stop offset="1" stopColor="#141218" />
        </radialGradient>
        <linearGradient id={`sh-${gid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#bg-${gid})`} />
      <rect width="64" height="64" fill={look.bg} opacity="0.25" />
      {look.hairStyle === 1 ? (
        <path d="M15 30 C13 16 22 10 32 10 C43 10 51 16 49 30 L51 54 L13 54 Z" fill={look.hair} />
      ) : null}
      {/* shoulders + outfit */}
      <path d="M7 64 C8 52 17 46.5 32 46.5 C47 46.5 56 52 57 64 Z" fill={look.outfit} />
      <path d="M7 64 C8 52 17 46.5 32 46.5 C47 46.5 56 52 57 64 Z" fill="#000" opacity="0.18" />
      <path d="M24 47 L32 56 L40 47 Z" fill={look.skin} />
      <path d="M24 47 L32 56 L40 47" fill="none" stroke={look.outfit} strokeWidth="2" strokeLinejoin="round" />
      {/* neck */}
      <path d="M27 38 h10 v9 q-5 4 -10 0 Z" fill={look.skin} />
      <path d="M27 40 h10 v3 q-5 3 -10 0 Z" fill="#000" opacity="0.14" />
      {/* ears + face */}
      <ellipse cx="18.2" cy="30.5" rx="2.6" ry="3.4" fill={look.skin} />
      <ellipse cx="45.8" cy="30.5" rx="2.6" ry="3.4" fill={look.skin} />
      <ellipse cx="32" cy="29" rx="14" ry="15.5" fill={look.skin} />
      <ellipse cx="32" cy="29" rx="14" ry="15.5" fill={`url(#sh-${gid})`} />
      <path d={HAIR[look.hairStyle]} fill={look.hair} />
      {/* brows, eyes, nose, smile */}
      <path d="M23.5 25.2 q3 -1.6 5.6 0 M34.9 25.2 q2.6 -1.6 5.6 0" stroke={look.hair} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <ellipse cx="26.4" cy="29.8" rx="1.6" ry="2" fill="#1a1012" />
      <ellipse cx="37.6" cy="29.8" rx="1.6" ry="2" fill="#1a1012" />
      <circle cx="27" cy="29.1" r="0.55" fill="#fff" />
      <circle cx="38.2" cy="29.1" r="0.55" fill="#fff" />
      <path d="M32 31 q-1.6 3.4 0.4 3.6" stroke="#000" strokeOpacity="0.22" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M27.6 37 Q32 40.4 36.4 37" stroke="#5a2a22" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="23" cy="34.5" rx="2.4" ry="1.5" fill="#ff647c" opacity="0.22" />
      <ellipse cx="41" cy="34.5" rx="2.4" ry="1.5" fill="#ff647c" opacity="0.22" />
    </svg>
  );
}
