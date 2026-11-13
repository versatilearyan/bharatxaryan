import { BadgeCheck } from "lucide-react";

/** Marks a room as an official room of Panchayat (owned by the Sarpanch). */
export function OfficialBadge({ full = false, className = "" }: { full?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-[#2a1a0c] shadow-[0_1px_6px_rgba(231,188,114,0.45)] ${className}`}
      aria-label="Official room of Panchayat"
    >
      <BadgeCheck className="h-3 w-3" aria-hidden />
      {full ? "Official room of Panchayat" : "Official"}
    </span>
  );
}
