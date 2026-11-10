import { Sparkles } from "lucide-react";

/** The golden NEWBIE tag. */
export function NewbieBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-[#f6d899] to-[#d9a84f] px-1.5 py-px text-[8.5px] leading-none font-extrabold tracking-wider text-[#2a1a0c] ${className}`}>
      <Sparkles className="h-2 w-2" aria-hidden /> NEWBIE
    </span>
  );
}
