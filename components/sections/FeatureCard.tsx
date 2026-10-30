import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

type FeatureCardProps = {
  title: string;
  description: string;
  illustration: ReactNode;
  icon: LucideIcon;
  className?: string;
  delay?: number;
};

/** A planned-feature card: illustration on top, plain copy below. */
export function FeatureCard({ title, description, illustration, icon: Icon, className = "", delay = 0 }: FeatureCardProps) {
  return (
    <Reveal as="li" delay={delay} className={`min-w-0 ${className}`}>
      <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-surface transition-[border-color,transform] duration-500 ease-out hover:-translate-y-1 hover:border-gold/35">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-2/3 -translate-x-1/2 rounded-full bg-coral/0 blur-3xl transition-colors duration-500 group-hover:bg-coral/15"
        />
        <div className="relative flex min-h-[13.5rem] flex-1 items-center justify-center overflow-hidden px-6 py-8">
          {illustration}
        </div>
        <div className="relative border-t border-line bg-ink-2/40 p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-coral/12 text-coral ring-1 ring-coral/25">
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <h3 className="font-display text-2xl font-bold tracking-[-0.025em] text-cream">{title}</h3>
          </div>
          <p className="mt-3 max-w-sm leading-relaxed text-muted">{description}</p>
        </div>
      </article>
    </Reveal>
  );
}
