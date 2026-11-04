"use client";

import { VipAvatar, VipBadge } from "@/components/effects/VipFx";
import { CharmBadge } from "@/components/ui/CharmBadge";
import { LevelPill } from "@/components/profile/IdTags";
import { nameFace } from "@/lib/app/fonts";
import type { NameFont } from "@/lib/app/types";
import { vipName } from "@/lib/app/levels";
import { activeVipLevel, profileEffects } from "@/lib/app/vip-cosmetics";
import type { Moment } from "@/lib/api/social";

/** A small round photo (or first letter) used inside a frame. */
function Face({ src, name, size }: { src?: string; name: string; size: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-[#ff7fa8] font-display font-extrabold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * A Moment's author as they look everywhere else: their VIP or reward frame
 * round the photo, the VIP badge (animated, shining), the name in their VIP
 * colour and font, and their level and charm.
 */
export function MomentAuthor({ a, size = 42, sub }: { a: Moment["author"]; size?: number; sub?: React.ReactNode }) {
  const fx = profileEffects(a.vip);
  const vip = activeVipLevel(a.vip);
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <VipAvatar
        frame={fx?.frame}
        size={size}
        framedStyle={(_, f) => ({ marginLeft: Math.max(0, f.side - 6), marginRight: Math.max(0, f.side - 6) })}
        render={(s, framed) => (
          <span className={framed ? "" : "rounded-full ring-2 ring-white/10"}>
            <Face src={a.avatarUrl} name={a.name} size={s} />
          </span>
        )}
      />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1">
          <span className={`truncate text-[14.5px] font-extrabold ${vipName(vip) || "text-cream"}`} style={nameFace(a.nameFont as NameFont | undefined)}>
            {a.name}
          </span>
          {fx?.badge ? (
            <span className="relative inline-flex shrink-0 overflow-hidden rounded-md">
              <VipBadge set={fx.badge} level={vip} size={18} animated />
              {/* A light sweep across the badge */}
              <span className="pointer-events-none absolute inset-y-0 -left-4 w-3 -skew-x-12 animate-[badge-shine_2.6s_ease-in-out_infinite] bg-white/60 blur-[1px]" aria-hidden />
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 flex items-center gap-1">
          {a.level ? <LevelPill level={a.level} size="sm" /> : null}
          {a.charmPoints !== undefined ? <CharmBadge personId={`srv-user:${a.userId}`} points={a.charmPoints} /> : null}
          {sub}
        </span>
      </span>
    </span>
  );
}
