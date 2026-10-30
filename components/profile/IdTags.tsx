"use client";

import { Mars, Venus } from "lucide-react";
import { VipBadge } from "@/components/effects/VipFx";
import { useMarket } from "@/lib/app/market-store";
import type { Gender } from "@/lib/app/types";

/** Someone's VIP badge (the animated badge of their VIP set), or nothing if they aren't VIP. */
export function VipBadgeFor({ personId, vip, size = 18, animated = false, className = "" }: { personId: string; vip?: number; size?: number; animated?: boolean; className?: string }) {
  const badge = useMarket().effectsFor(personId, vip).badge;
  return badge ? <VipBadge set={badge} level={vip} size={size} animated={animated} className={className} /> : null;
}

/** Orange "Lv.12" pill, with a ♂/♀ icon in front when the gender is known. Everyone starts at Lv.1. */
/** Demo levels start at 1; pass `exact` to show a backend level as-is (0 included). */
export function LevelPill({ level, gender, size = "md", className = "", exact = false }: { level: number; gender?: Gender; size?: "sm" | "md"; className?: string; exact?: boolean }) {
  const sm = size === "sm";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 align-middle ${className}`}>
      {gender === "male" ? <Mars className={sm ? "h-3 w-3" : "h-4 w-4"} strokeWidth={3} color="#3b8cf5" aria-label="Male" /> : null}
      {gender === "female" ? <Venus className={sm ? "h-3 w-3" : "h-4 w-4"} strokeWidth={3} color="#ff5c9a" aria-label="Female" /> : null}
      <span className={`rounded-md bg-gradient-to-b from-[#ff8455] to-[#f0512d] font-extrabold leading-none text-white ${sm ? "px-1 py-[3px] text-[9.5px]" : "px-1.5 py-1 text-[11px]"}`}>
        Lv.{exact ? level : Math.max(1, level)}
      </span>
    </span>
  );
}
