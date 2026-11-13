import type { FestivalConfig } from "./types";

/** Mixes a #rrggbb colour with white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${[r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("")}`;
}

const RADIUS = { pill: "9999px", rounded: "14px", square: "4px" } as const;

/**
 * The festival's colours as the app's own colour variables (the same ones every screen already uses: --color-gold, --color-ink ...),
 * so changing them re-colours the whole app, and the admin panel's preview uses this exact same function.
 */
export function festivalVars(c: FestivalConfig): Record<string, string> {
  const t = c.theme;
  const light = t.mode === "light";
  return {
    "--color-gold": t.primary,
    "--color-pink": t.accent,
    "--color-coral": t.accent,
    "--color-ink": t.background,
    "--color-ink-2": shade(t.background, light ? -0.04 : 0.06),
    "--color-surface": t.surface,
    "--color-surface-2": shade(t.surface, light ? -0.06 : 0.12),
    "--color-cream": t.text,
    "--color-muted": shade(t.text, light ? 0.45 : -0.35),
    "--color-wine": shade(t.accent, -0.7),
    "--color-wine-2": shade(t.accent, -0.82),
    "--festival-radius": RADIUS[t.buttonStyle],
    "--festival-primary": t.primary,
    "--festival-accent": t.accent,
  };
}

export function applyFestivalVars(el: HTMLElement, c: FestivalConfig | null) {
  const names = ["--color-gold", "--color-pink", "--color-coral", "--color-ink", "--color-ink-2", "--color-surface", "--color-surface-2", "--color-cream", "--color-muted", "--color-wine", "--color-wine-2", "--festival-radius", "--festival-primary", "--festival-accent"];
  for (const n of names) el.style.removeProperty(n);
  if (!c) {
    el.removeAttribute("data-festival");
    return;
  }
  for (const [k, v] of Object.entries(festivalVars(c))) el.style.setProperty(k, v);
  el.setAttribute("data-festival", c.theme.mode);
}
