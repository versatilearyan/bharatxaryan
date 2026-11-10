"use client";

/** Small shared pieces for the Parivar screens: icon tiles that replace emoji, and glossy "orbs". */
import { Coins, Gift, HeartHandshake, Landmark, Swords, MessageCircle, Megaphone, Mic, ShieldCheck, ShoppingBag, Sparkles, Star, Ticket, VenetianMask, Dices, type LucideIcon } from "lucide-react";

export const KIND_GLYPH: Record<string, LucideIcon> = { COINS: Coins, FUNDS: Landmark, CHARM: Sparkles, CHEST: Gift, CARD: Ticket, GACHA_CARD: Ticket, BARRIER: ShieldCheck, EXP: Star, GIFT_CARD: Gift, WEAPON: Swords, ITEM: Sparkles };
export const TILE_GLYPH: Record<string, LucideIcon> = { gift: HeartHandshake, chat: MessageCircle, gacha: Dices, cheer: Megaphone, chests: Gift, shop: ShoppingBag, kavach: ShieldCheck, chori: VenetianMask, voice: Mic };

/** A thin-line icon on a frosted gold tile. */
export function Glyph({ icon: Icon, size = 44, tone = "gold", className = "" }: { icon: LucideIcon; size?: number; tone?: "gold" | "light" | "mute"; className?: string }) {
  const bg = tone === "light" ? "linear-gradient(160deg, #fff3da, #f0d9ac)" : tone === "mute" ? "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))" : "linear-gradient(160deg, rgba(240,205,130,0.28), rgba(185,128,58,0.12))";
  const color = tone === "light" ? "#5a3a12" : tone === "mute" ? "rgba(255,241,213,0.7)" : "#f0cd82";
  return (
    <span className={`grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size, borderRadius: size * 0.32, background: bg, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(240,205,130,0.22)", color }} aria-hidden>
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={1.7} />
    </span>
  );
}

/** A glossy glass sphere, lit from the top left. */
export function Orb({ color, size = 58, className = "", style }: { color: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`absolute block rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 24%, rgba(255,255,255,0.95) 0 6%, rgba(255,255,255,0.0) 22%), radial-gradient(circle at 50% 38%, ${color} 0%, ${color} 38%, rgba(0,0,0,0.55) 100%)`,
        boxShadow: `inset 0 -${size * 0.12}px ${size * 0.2}px rgba(0,0,0,0.45), inset 0 ${size * 0.05}px ${size * 0.1}px rgba(255,255,255,0.25), 0 ${size * 0.14}px ${size * 0.22}px -${size * 0.06}px rgba(0,0,0,0.65)`,
        ...style,
      }}
    />
  );
}
