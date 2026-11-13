import { Bell, Play } from "lucide-react";

/** A notice-style strip: the app is coming to Google Play. Server-rendered, no script needed. */
export function PlayStoreSoon({ className = "" }: { className?: string }) {
  return (
    <div role="status" className={`flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-gold/30 ${className}`} data-testid="playstore-soon">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
        <Bell className="h-5 w-5" aria-hidden />
        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-surface" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-cream">Coming soon on Google Play</span>
        <span className="block text-[12px] text-muted">Until then, install the app straight from here.</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-cream/80 ring-1 ring-line sm:inline-flex">
        <Play className="h-3.5 w-3.5 fill-current text-gold" aria-hidden /> Google Play
      </span>
    </div>
  );
}
