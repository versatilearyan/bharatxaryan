import type { LucideIcon } from "lucide-react";

/** Decorative floating icon (pure CSS animation; disabled by prefers-reduced-motion). */
export function FloatingIcon({
  icon: Icon,
  className = "",
  tone = "coral",
  rotate = 0,
  slow = false,
  delay = 0,
}: {
  icon: LucideIcon;
  className?: string;
  tone?: "coral" | "gold" | "pink" | "cream";
  rotate?: number;
  slow?: boolean;
  delay?: number;
}) {
  const tones = {
    coral: "text-coral/70 [filter:drop-shadow(0_0_14px_rgb(244_81_91/0.55))]",
    gold: "text-gold/75 [filter:drop-shadow(0_0_14px_rgb(231_188_114/0.5))]",
    pink: "text-pink/70 [filter:drop-shadow(0_0_14px_rgb(255_100_124/0.5))]",
    cream: "text-cream/40 [filter:drop-shadow(0_0_12px_rgb(255_241_213/0.25))]",
  } as const;
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute grid place-items-center ${tones[tone]} ${slow ? "animate-float-slow" : "animate-float"} ${className}`}
      style={{ ["--r" as string]: `${rotate}deg`, animationDelay: `${delay}s` }}
    >
      <Icon className="h-full w-full" strokeWidth={1.6} />
    </span>
  );
}
