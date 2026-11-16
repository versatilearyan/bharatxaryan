"use client";

import { useEffect, useState } from "react";
import { ActiveLevelCard, CharmCard } from "@/components/profile/StatsCards";
import { useGiftsReceived } from "@/components/profile/useGiftsReceived";
import { usePublicProfile } from "@/components/profile/usePublicProfile";
import { useServerGuard } from "@/components/profile/useServerGuard";
import { ScreenHeader, formatCount } from "@/components/ui/kit";
import { friendsApi } from "@/lib/api/social";
import { tagsApi } from "@/lib/api/room-games";
import { readToken } from "@/lib/auth/token";
import { usePeople } from "@/lib/app/people";
import { useMe } from "@/lib/app/me-store";
import { SERVER_USER_PREFIX } from "@/lib/app/server-rooms";
import { ME_ID, useApp } from "@/lib/app/store";
import { giftWallStats } from "@/lib/app/social";

type Counts = { followers: number; following: number; bff: number };

/** Followers, following and BFF tags for a real person, from the server. */
function useServerCounts(uid: string | null) {
  const [c, setC] = useState<Partial<Counts>>({});
  useEffect(() => {
    setC({});
    if (!uid) return;
    let off = false;
    (uid === "me" ? friendsApi.list("friends").then((d) => ({ followers: d.followers, following: d.followingCount })) : friendsApi.status(uid).then((d) => ({ followers: d.followers, following: d.followingCount })))
      .then((x) => !off && setC((cur) => ({ ...cur, ...x })))
      .catch(() => undefined);
    (uid === "me" ? tagsApi.mine() : tagsApi.of(uid))
      .then((t) => !off && setC((cur) => ({ ...cur, bff: t.length })))
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [uid]);
  return c;
}

/** Someone's numbers: level, charm, followers, gifts and guard. Real people's come from the server. */
export function StatsScreen({ personId }: { personId: string }) {
  const { pop, profile, giftsSent, receivedOf, guardiansOf, tagsOf } = useApp();
  const person = usePeople();
  const p = person(personId);
  const mine = personId === ME_ID;
  const isServer = personId.startsWith(SERVER_USER_PREFIX);
  const real = isServer || (mine && !!readToken());
  const uid = isServer ? personId.slice(SERVER_USER_PREFIX.length) : mine && real ? "me" : null;

  const pub = usePublicProfile(isServer ? personId : "");
  const me = useMe();
  const counts = useServerCounts(uid);
  const gifts = useGiftsReceived(personId);
  const guardSrv = useServerGuard(personId);

  // Numbers from the server first; for demo people the old sample numbers
  const level = isServer ? pub.data?.level : mine ? (me.stats.data?.level ?? undefined) : undefined;
  const charmPoints = isServer ? pub.data?.charmPoints : mine ? me.stats.data?.charmPoints : undefined;
  const wall = giftWallStats(receivedOf(personId));
  const guardLocal = guardiansOf(personId).reduce((a, g) => a + g.value, 0);
  const dash = "–";
  const val = (v: number | undefined | null, fallback: number | null) => (v !== undefined && v !== null ? formatCount(v) : real ? dash : fallback === null ? dash : formatCount(fallback));

  const cells: [string, string][] = [
    ["Followers", val(counts.followers, p.followers)],
    ["Following", mine && !real ? String(profile.following.length) : val(counts.following, Math.round(p.followers / 7))],
    ["Gifts received", val(gifts?.totalGifts, wall.gifts)],
    mine ? ["Gifts sent", String(giftsSent)] : ["Level", level !== undefined && level !== null ? String(level) : real ? dash : String(p.level)],
    ["Total guard", val(guardSrv.data?.total, guardLocal)],
    ["BFF", counts.bff !== undefined ? String(counts.bff) : real ? dash : String(tagsOf(personId).length)],
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
      {!real || charmPoints !== undefined ? <CharmCard personId={personId} points={real ? (charmPoints ?? undefined) : undefined} /> : null}
    </div>
  );
}
