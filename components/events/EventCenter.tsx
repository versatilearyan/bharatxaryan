"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { ScreenHeader } from "@/components/ui/kit";
import { SunsetScene } from "@/components/art/SunsetScene";
import { fetchEvents, type SpecialEvent } from "@/lib/api/events";
import { searchServer } from "@/lib/api/search";
import { serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";

/**
 * Event Center: every live event the admins set up, in their sections (Bonus, Recommend, ...), two banners to a row,
 * each with its corner tag. Tapping one opens what the admin linked (Shop, PK, a room, a page ...).
 */
export function EventCenterScreen() {
  const { pop, push, setSheet, setTab, openRoom, toast } = useApp();
  const { addCreated } = useServerRooms();
  const [events, setEvents] = useState<SpecialEvent[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<SpecialEvent | null>(null);

  useEffect(() => {
    let live = true;
    fetchEvents().then(
      (e) => live && setEvents(e),
      (e) => live && (setEvents([]), setError(e instanceof Error && e.message ? e.message : "Couldn't load the events.")),
    );
    return () => {
      live = false;
    };
  }, []);

  // Sections in the order their first event comes (the admins' order)
  const sections = useMemo(() => {
    const map = new Map<string, SpecialEvent[]>();
    for (const e of events ?? []) map.set(e.section, [...(map.get(e.section) ?? []), e]);
    return [...map.entries()];
  }, [events]);

  const go = async (e: SpecialEvent) => {
    const l = e.link ?? "";
    if (!l) return setOpen(e);
    if (l.startsWith("https://")) return void window.open(l, "_blank", "noopener,noreferrer");
    if (l.startsWith("room:")) {
      try {
        const r = await searchServer(l.slice(5));
        const room = r.rooms[0];
        if (!room) return toast("That room isn't open right now.", "error");
        addCreated(room);
        openRoom(serverRoomAppId(room.id));
      } catch {
        toast("Couldn't open the room. Try again.", "error");
      }
      return;
    }
    if (l === "shop") push({ kind: "shop" });
    else if (l === "pk") push({ kind: "pkCoins" });
    else if (l === "ranking") push({ kind: "ranking" });
    else if (l === "recharge") setSheet({ kind: "coins" });
    else if (l === "parivar") push({ kind: "parivar-list" });
    else if (l === "games") push({ kind: "games" });
    else if (l === "vip") push({ kind: "vip-benefits" });
    else if (l === "tasks") setSheet({ kind: "tasks" });
    else setTab("home");
  };

  return (
    <div className="app-scroll h-full bg-ink pb-10">
      <ScreenHeader title="Event Center" onBack={pop} />
      {!events ? (
        <div className="grid grid-cols-2 gap-3 px-4 pt-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="aspect-[2/1.3] animate-pulse rounded-2xl bg-surface" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded-full bg-surface" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="mx-4 mt-10 text-center text-[13px] text-muted">{error || "No events right now. Check back soon."}</p>
      ) : (
        sections.map(([name, list], si) => (
          <section key={name} className="mt-3" aria-labelledby={`ev-sec-${si}`}>
            <h2 id={`ev-sec-${si}`} className="px-4 font-display text-[19px] font-extrabold text-cream">
              {name}
            </h2>
            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-4 px-4">
              {list.map((e, i) => (
                <motion.button
                  key={e.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void go(e)}
                  className="min-w-0 text-left"
                  aria-label={e.title}
                >
                  <span className="relative block aspect-[2/1.3] overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
                    {e.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <SunsetScene {...e.cover} shade />
                        <span className="absolute inset-x-2 bottom-2 line-clamp-2 font-display text-[14px] font-extrabold leading-tight text-cream drop-shadow">{e.title}</span>
                      </>
                    )}
                    {e.tag ? <CornerTag text={e.tag} color={e.tagColor ?? "#2f6bf0"} /> : null}
                  </span>
                  <span className="mt-1.5 block truncate font-display text-[15px] font-extrabold text-cream">{e.title}</span>
                  {e.when ? (
                    <span className="flex items-center gap-1 truncate text-[11px] font-semibold text-gold/90">
                      <CalendarDays className="h-3 w-3 shrink-0" aria-hidden /> <span className="truncate">{e.when}</span>
                    </span>
                  ) : null}
                </motion.button>
              ))}
            </div>
          </section>
        ))
      )}

      {/* An event without a link: its details */}
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={() => setOpen(null)} role="dialog" aria-modal aria-label={open.title}>
          <div className="w-full max-w-[420px] overflow-hidden rounded-3xl bg-surface ring-1 ring-line" onClick={(ev) => ev.stopPropagation()}>
            <div className="relative aspect-[2/1.1]">
              {open.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={open.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <SunsetScene {...open.cover} shade />
              )}
            </div>
            <div className="p-4">
              <p className="font-display text-[19px] font-extrabold text-cream">{open.title}</p>
              {open.when ? <p className="mt-0.5 text-[12px] font-semibold text-gold">{open.when}</p> : null}
              {open.body ? <p className="mt-2 text-[13px] leading-snug text-cream/80">{open.body}</p> : null}
              <button type="button" onClick={() => setOpen(null)} className="mt-4 h-11 w-full rounded-full bg-gold text-[14px] font-bold text-ink">
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** The diagonal ribbon across the top-left corner (PK, Recharge, Family ...). */
function CornerTag({ text, color }: { text: string; color: string }) {
  return (
    <span className="pointer-events-none absolute -left-[30px] top-[10px] w-[110px] -rotate-45 py-[3px] text-center text-[10.5px] font-extrabold italic text-white shadow-[0_2px_6px_rgba(0,0,0,0.45)]" style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}>
      <span className="block truncate px-6">{text}</span>
    </span>
  );
}
