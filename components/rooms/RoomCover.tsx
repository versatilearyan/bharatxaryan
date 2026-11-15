import { memo } from "react";
import { SunsetScene } from "@/components/art/SunsetScene";
import type { Room } from "@/lib/app/types";

/** A room's cover: the owner's uploaded picture, or the illustrated scene. */
function RoomCoverBase({ room, shade = false }: { room: Pick<Room, "cover" | "coverImage" | "name">; shade?: boolean }) {
  if (!room.coverImage) return <SunsetScene {...room.cover} shade={shade} />;
  return (
    <span className="relative block h-full w-full">
      <img src={room.coverImage} alt="" className="h-full w-full object-cover" />
      {shade ? <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" /> : null}
    </span>
  );
}

type CoverProps = { room: Pick<Room, "cover" | "coverImage" | "name">; shade?: boolean };
export const RoomCover = memo(
  RoomCoverBase,
  (p: CoverProps, n: CoverProps) => p.shade === n.shade && p.room.coverImage === n.room.coverImage && p.room.cover?.theme === n.room.cover?.theme && p.room.cover?.motif === n.room.cover?.motif,
);
