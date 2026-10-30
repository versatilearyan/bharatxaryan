"use client";

import { ActiveLevelCard, CharmCard } from "@/components/profile/StatsCards";
import { ScreenHeader, formatCount } from "@/components/ui/kit";
import { usePeople } from "@/lib/app/people";
import { ME_ID, useApp } from "@/lib/app/store";
import { giftWallStats } from "@/lib/app/social";

/** Someone's numbers: level, charm, followers, gifts and guard. */
export function StatsScreen({ personId }: { personId: string }) {
  const { pop, profile, giftsSent, receivedOf, guardiansOf, tagsOf } = useApp();
  const person = usePeople();
  const p = person(personId);
  const mine = personId === ME_ID;
  const wall = giftWallStats(receivedOf(personId));
  const guard = guardiansOf(personId).reduce((a, g) => a + g.value, 0);

  const cells: [string, string][] = [
    ["Followers", formatCount(p.followers)],
    ["Following", mine ? String(profile.following.length) : formatCount(Math.round(p.followers / 7))],
    ["Gifts received", formatCount(wall.gifts)],
    mine ? ["Gifts sent", String(giftsSent)] : ["Level", String(p.level)],
    ["Total guard", formatCount(guard)],
    ["BFF", String(tagsOf(personId).length)],
  ];

  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader title={mine ? "My stats" : `${p.name}'s stats`} onBack={pop} />
      <div className="mx-4 mt-2 grid grid-cols-3 gap-y-3 rounded-2xl bg-surface py-3 ring-1 ring-line">
        {cells.map(([k, v]) => (
          <div key={k} className="text-center">
            <p className="font-display text-[17px] font-bold text-cream">{v}</p>
            <p className="text-[10.5px] text-muted">{k}</p>
          </div>
        ))}
      </div>
      {mine ? <ActiveLevelCard /> : null}
      <CharmCard personId={personId} />
    </div>
  );
}
