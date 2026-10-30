import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function SectionHeading({
  id,
  title,
  children,
  align = "left",
}: {
  id?: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <Reveal className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <h2
        id={id}
        className="font-display text-[clamp(2.1rem,5.2vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.035em] text-cream text-balance"
      >
        {title}
      </h2>
      {children ? <p className="mt-5 text-lg leading-relaxed text-muted text-pretty">{children}</p> : null}
    </Reveal>
  );
}
