/** Tiny "Soon" tag for a tile, such as a gift that can't be sent yet. */
export function SoonTag({ className = "" }: { className?: string }) {
  return <span className={`rounded-full bg-gold/15 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-gold ring-1 ring-gold/30 ${className}`}>Soon</span>;
}

/** Animated "coming soon" status indicator. */
export function ComingSoonBadge({ children = "Coming soon", className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-full border border-gold/30 bg-gold/[0.07] py-1.5 pl-2.5 pr-3.5 text-[0.72rem] font-semibold tracking-[0.08em] text-gold ${className}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-gold animate-ping-soft" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
      </span>
      {children}
    </span>
  );
}
