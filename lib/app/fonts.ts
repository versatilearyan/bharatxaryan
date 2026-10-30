import type { CSSProperties } from "react";
import { vipName } from "./levels";
import type { NameFont } from "./types";

/** Personal name fonts people pick for their own name and their room's name. */
export const NAME_FONTS: { id: NameFont; label: string; family?: string }[] = [
  { id: "default", label: "Classic" },
  { id: "pacifico", label: "Pacifico", family: '"Pacifico", cursive' },
  { id: "dancing", label: "Dancing Script", family: '"Dancing Script", cursive' },
  { id: "cinzel", label: "Royal Cinzel", family: '"Cinzel Decorative", serif' },
  { id: "yatra", label: "Yatra", family: '"Yatra One", system-ui' },
  { id: "righteous", label: "Righteous", family: '"Righteous", system-ui' },
];

/** Inline style for a name font; undefined keeps the surrounding font. */
export const nameFace = (font?: NameFont): CSSProperties | undefined => {
  const family = NAME_FONTS.find((f) => f.id === font)?.family;
  return family ? { fontFamily: family } : undefined;
};

/** Class for a person's name: VIP 1–5 shine, VIP 6+ are gold (on top of their own font), others use the fallback colour. */
export const nameTone = (vip: number | undefined, fallback = "text-cream", where: "out" | "room" = "out") => vipName(vip, where) || fallback;
