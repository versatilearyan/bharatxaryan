"use client";

/**
 * Nearby: people around you who also turned Nearby on. Your location is asked
 * once, rounded to about 1 km on the server, and only a rough distance is
 * shown to anyone. Turn it off any time (your location is erased).
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, MessageCircle, Navigation, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api/client";
import { SERVER_USER_PREFIX } from "@/lib/app/server-rooms";
import { useApp } from "@/lib/app/store";
import { ScreenHeader } from "@/components/ui/kit";

type Person = { userId: string; publicId?: number; name: string; avatarUrl?: string; gender?: string; age?: number; bio?: string; vipLevel: number; online: boolean; distance: string };
type Gender = "ALL" | "FEMALE" | "MALE";

function locate(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This device can't share a location."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.code === 1 ? "Location permission was denied. Allow it in your browser settings to use Nearby." : "Couldn't get your location. Try again.")),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

export function NearbyScreen() {
  const { pop, setSheet, openConversation } = useApp();
  const [on, setOn] = useState<boolean | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [gender, setGender] = useState<Gender>("ALL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (g: Gender) => {
    try {
      const d = await api<{ on: boolean; people: Person[] }>(`/api/v1/nearby?gender=${g}`, { auth: true });
      setOn(d.on);
      setPeople(d.people ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load Nearby.");
      setOn(false);
    }
  }, []);

  useEffect(() => {
    void load(gender);
  }, [gender, load]);

  // Refresh your spot quietly when Nearby is on
  useEffect(() => {
    if (!on) return;
    locate()
      .then((p) => api("/api/v1/nearby/me", { method: "PUT", auth: true, body: p }))
      .catch(() => undefined);
  }, [on]);

  const turnOn = async () => {
    setBusy(true);
    setError("");
    try {
      const p = await locate();
      await api("/api/v1/nearby/me", { method: "PUT", auth: true, body: p });
      await load(gender);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn on Nearby.");
    } finally {
      setBusy(false);
    }
  };
  const turnOff = async () => {
    await api("/api/v1/nearby/me", { method: "DELETE", auth: true }).catch(() => undefined);
    setOn(false);
    setPeople([]);
  };

  return (
    <div className="app-scroll h-full bg-[radial-gradient(130%_60%_at_50%_0%,#5a1a28_0%,#2a1430_45%,#141018_100%)] pb-10">
      <ScreenHeader
        title="Nearby"
        sub="People around you on Panchayat"
        onBack={pop}
        right={
          on ? (
            <button type="button" onClick={() => void turnOff()} className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-cream">
              Turn off
            </button>
          ) : undefined
        }
      />

      {on === null ? (
        <div className="grid place-items-center pt-24">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : !on ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-5 mt-8 flex flex-col items-center text-center">
          <div className="relative grid h-36 w-36 place-items-center">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="absolute inset-0 rounded-full border-2 border-[#4fd6a5]/40" initial={{ scale: 0.4, opacity: 0.8 }} animate={{ scale: 1.2, opacity: 0 }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }} />
            ))}
            <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-[#4fd6a5] to-[#1fae86] shadow-[0_0_40px_rgba(79,214,165,0.45)]">
              <MapPin className="h-9 w-9 text-white" />
            </span>
          </div>
          <h2 className="mt-5 font-display text-[22px] font-extrabold text-cream">Meet people near you</h2>
          <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-cream/75">See who&apos;s around your city, say namaste and make new friends.</p>
          <motion.button whileTap={{ scale: 0.96 }} type="button" disabled={busy} onClick={() => void turnOn()} className="mt-6 flex h-12 w-full max-w-[320px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-gold text-[15px] font-extrabold text-white shadow-[0_8px_30px_-8px_rgba(244,81,91,0.7)] disabled:opacity-60">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />} Turn on Nearby
          </motion.button>
          {error ? <p className="mt-3 text-[12.5px] font-semibold text-coral">{error}</p> : null}
          <div className="mt-6 flex max-w-[330px] gap-2.5 rounded-2xl bg-black/30 px-4 py-3 text-left ring-1 ring-white/10">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#4fd6a5]" />
            <p className="text-[12px] leading-relaxed text-cream/75">Your exact location is never shown. Others only see a rough distance like &ldquo;3 km&rdquo;. Turn it off any time and it&apos;s erased.</p>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="mx-4 mt-1 grid grid-cols-3 rounded-full bg-black/30 p-1 ring-1 ring-white/10" role="radiogroup" aria-label="Show">
            {(["ALL", "FEMALE", "MALE"] as Gender[]).map((g) => (
              <button key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => setGender(g)} className={`h-9 rounded-full text-[13px] font-bold ${gender === g ? "bg-gold text-ink" : "text-cream/70"}`}>
                {g === "ALL" ? "Everyone" : g === "FEMALE" ? "Girls" : "Boys"}
              </button>
            ))}
          </div>
          {people.length === 0 ? (
            <p className="mx-6 mt-12 text-center text-[13px] text-cream/70">Nobody nearby has Nearby on yet. Check back soon, or invite friends from your city!</p>
          ) : (
            <ul className="mt-4 space-y-2.5 px-4">
              {people.map((p, i) => (
                <motion.li key={p.userId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
                  <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#2a1620]/90 to-[#1c1824]/90 p-3 ring-1 ring-gold/15">
                    <button type="button" onClick={() => setSheet({ kind: "person", personId: `${SERVER_USER_PREFIX}${p.userId}` })} className="relative shrink-0" aria-label={`${p.name}'s profile`}>
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-gold/40" />
                      ) : (
                        <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#7b5cff] to-coral font-display text-xl font-bold text-white">{p.name.slice(0, 1)}</span>
                      )}
                      {p.online ? <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-speak ring-2 ring-[#2a1620]" /> : null}
                    </button>
                    <button type="button" onClick={() => setSheet({ kind: "person", personId: `${SERVER_USER_PREFIX}${p.userId}` })} className="min-w-0 flex-1 text-left">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[15px] font-bold text-cream">{p.name}</span>
                        {p.age ? <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${p.gender === "FEMALE" ? "bg-pink-500/20 text-pink-300" : "bg-sky-500/20 text-sky-300"}`}>{p.gender === "FEMALE" ? "♀" : p.gender === "MALE" ? "♂" : ""} {p.age}</span> : null}
                        {p.vipLevel ? <span className="rounded-full bg-gold/20 px-1.5 py-px text-[10px] font-extrabold text-gold">VIP {p.vipLevel}</span> : null}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[12px] text-[#4fd6a5]">
                        <MapPin className="h-3 w-3" /> {p.distance}
                      </span>
                      {p.bio ? <span className="mt-0.5 block truncate text-[12px] text-cream/60">{p.bio}</span> : null}
                    </button>
                    <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => openConversation(`${SERVER_USER_PREFIX}${p.userId}`)} aria-label={`Message ${p.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-coral to-gold text-white">
                      <MessageCircle className="h-5 w-5" />
                    </motion.button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
