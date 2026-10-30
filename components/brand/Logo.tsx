import Image from "next/image";
import { BRAND } from "@/lib/site";
import { Crown } from "./Crown";

type LogoProps = {
  /** Font size of the wordmark, e.g. "1.5rem" or "clamp(3rem, 9vw, 7rem)". */
  size?: string;
  sparkle?: boolean;
  className?: string;
  /** Responsive image hint for the PNG logo. */
  sizes?: string;
};

/**
 * Panchayat wordmark.
 *
 * ⚠️ PLACEHOLDER: when `BRAND.logoSrc` is null (default), this draws an
 * approximation of the logo in code: glossy cream-to-coral 3D lettering with a
 * small gold crown. Drop the official artwork into public/brand/ and set
 * `BRAND.logoSrc` in lib/site.ts to use it everywhere automatically.
 */
export function Logo({ size = "1.6rem", sparkle = false, className, sizes = "(min-width: 1024px) 420px, 60vw" }: LogoProps) {
  if (BRAND.logoSrc) {
    return (
      <span className={`inline-block ${className ?? ""}`} style={{ height: `calc(${size} * 1.9)` }}>
        <Image
          src={BRAND.logoSrc}
          alt="Panchayat"
          width={BRAND.logoWidth}
          height={BRAND.logoHeight}
          priority
          sizes={sizes}
          className="h-full w-auto"
        />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex select-none items-end font-display font-extrabold leading-none tracking-[-0.035em] ${className ?? ""}`}
      style={{ fontSize: size, fontVariationSettings: '"wdth" 100' }}
      role="img"
      aria-label="Panchayat"
    >
      {/* Extruded back layer gives the glossy 3D depth */}
      <span
        aria-hidden
        className="absolute inset-0 text-[#7d1a26]"
        style={{
          textShadow:
            "0 0.02em 0 #a8222f, 0 0.04em 0 #96202c, 0 0.06em 0 #861c28, 0 0.08em 0 #6f1620, 0 0.14em 0.18em rgb(0 0 0 / 0.55)",
        }}
      >
        Panchayat
      </span>
      {/* Gradient face */}
      <span aria-hidden className="text-brand relative">
        Panchayat
      </span>
      {/* Specular highlight along the top of the letters */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(180deg, rgb(255 255 255 / 0.7) 0%, rgb(255 255 255 / 0) 28%)",
          WebkitBackgroundClip: "text",
        }}
      >
        Panchayat
      </span>
      {/* Crown sits tilted on the shoulder of the "P" (sized relative to the wordmark) */}
      <Crown
        sparkle={sparkle}
        className="absolute"
        style={{ width: "0.46em", height: "0.35em", top: "-0.26em", left: "-0.1em", transform: "rotate(-18deg)" }}
      />
    </span>
  );
}
