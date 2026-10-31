"use client";

/**
 * The cosmetics uploaded for one VIP level (GET /api/v1/vip/cosmetics?level=N), grouped
 * by frame, chat bubble, entry and badge. A preview of what the level comes with, not of
 * what the person owns or wears: that stays with their VIP status and the Bag.
 *
 * SVGA files can be several MB, so they only download and play when tapped, through the
 * app's SvgaAnim player (which keeps each parsed file, so a second look is instant).
 * PNGs show as pictures. Each level's list is cached for a minute.
 */
import { useState } from "react";
import { ImageOff, Loader2, Play, RotateCcw } from "lucide-react";
import { SvgaAnim } from "@/components/effects/SvgaAnim";
import { COSMETIC_TYPES, getCosmeticsByLevel, type CosmeticType, type VipCosmetic } from "@/lib/api/vip-cosmetics";
import { useCachedLoad } from "@/lib/app/use-wallet";

const LABEL: Record<CosmeticType, string> = { FRAME: "Frame", BUBBLE: "Chat bubble", ENTRY: "Entry", BADGE: "Badge" };

export function VipCosmeticsPreview({ level }: { level: number }) {
  const valid = Number.isInteger(level) && level >= 1 && level <= 7;
  const list = useCachedLoad<VipCosmetic[]>(valid ? `vip-cosmetics:${level}` : null, () => getCosmeticsByLevel(level));

  return (
    <section className="mt-6 px-4" aria-labelledby="vip-cos-h">
      <h2 id="vip-cos-h" className="font-display text-lg font-bold text-cream">
        VIP {level} cosmetics
      </h2>
      {!valid ? (
        <p className="mt-2 rounded-2xl bg-black/15 p-4 text-[12.5px] text-cream/70 ring-1 ring-gold/15">Cosmetics are set for VIP 1 to 7. VIP {level} uses the VIP 7 set.</p>
      ) : list.loading ? (
        <div className="mt-3 grid place-items-center rounded-2xl bg-black/15 py-8 ring-1 ring-gold/15" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-gold" aria-label="Loading cosmetics" />
        </div>
      ) : list.error ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-black/20 p-4 text-[12.5px] text-cream/80 ring-1 ring-coral/30" role="alert">
          <span className="min-w-0 flex-1">Couldn&apos;t load VIP {level} cosmetics. {list.error}</span>
          <button type="button" onClick={list.retry} className="flex shrink-0 items-center gap-1 rounded-full bg-gold/15 px-3 py-1.5 text-[12px] font-bold text-gold">
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : !list.data?.length ? (
        <p className="mt-2 rounded-2xl bg-black/15 p-4 text-[12.5px] text-cream/70 ring-1 ring-gold/15">No cosmetics have been uploaded for VIP {level} yet.</p>
      ) : (
        <>
          <p className="mt-0.5 text-[12px] text-muted">What VIP {level} comes with. Tap an animation to play it.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {COSMETIC_TYPES.map((t) => {
              const items = list.data!.filter((c) => c.cosmeticType === t);
              return (
                <div key={t} className="rounded-2xl bg-wine/60 p-2.5 ring-1 ring-gold/15" data-cosmetic-type={t}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-cream/60">{LABEL[t]}</p>
                  {items.length ? (
                    <div className="space-y-2">
                      {items.map((c) => (
                        <CosmeticTile key={c.id} item={c} />
                      ))}
                    </div>
                  ) : (
                    <p className="grid aspect-square place-items-center rounded-xl bg-black/20 text-center text-[11px] text-muted">Not uploaded yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function CosmeticTile({ item }: { item: VipCosmetic }) {
  const [play, setPlay] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = `VIP ${item.vipLevel} ${LABEL[item.cosmeticType].toLowerCase()} (${item.format})`;

  return (
    <figure className="relative">
      <div className={`relative grid w-full place-items-center overflow-hidden rounded-xl bg-black/25 ${item.cosmeticType === "ENTRY" || item.cosmeticType === "BUBBLE" ? "aspect-[2/1]" : "aspect-square"}`}>
        {failed ? (
          <span className="flex flex-col items-center gap-1 text-[10.5px] text-muted">
            <ImageOff className="h-4 w-4" aria-hidden /> Couldn&apos;t load
          </span>
        ) : item.format === "PNG" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={label} loading="lazy" className="h-full w-full object-contain p-2" onLoad={() => setReady(true)} onError={() => setFailed(true)} />
        ) : play ? (
          <SvgaAnim key={item.url} src={item.url} className="h-full w-full" onReady={() => setReady(true)} onError={() => setFailed(true)} />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="flex flex-col items-center gap-1 text-[11px] font-bold text-gold" aria-label={`Play ${label}`}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/15">
              <Play className="h-4 w-4" aria-hidden />
            </span>
            Play
          </button>
        )}
        {!failed && !ready && (item.format === "PNG" || play) ? <Loader2 className="absolute h-4 w-4 animate-spin text-gold/70" aria-label="Loading" /> : null}
      </div>
      <figcaption className="mt-1 flex items-center justify-between gap-1 text-[10.5px] text-cream/60">
        <span>VIP {item.vipLevel}</span>
        <span className="rounded bg-black/30 px-1 font-bold">{item.format}</span>
      </figcaption>
    </figure>
  );
}
