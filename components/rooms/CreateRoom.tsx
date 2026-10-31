"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock3, Crown, Gavel, Globe2, Lock, Minus, MonitorPlay, Mic, Plus } from "lucide-react";
import { COVER_LABELS, SunsetScene } from "@/components/art/SunsetScene";
import { Button, Coin, DemoNote, ScreenHeader, Toggle } from "@/components/ui/kit";
import { CATEGORIES } from "@/lib/app/data";
import { PERMANENT_ROOM_COST, useApp } from "@/lib/app/store";
import { SERVER_TYPE, serverRoomAppId, useServerRooms } from "@/lib/app/server-rooms";
import { MAX_PARTICIPANTS, MIN_PARTICIPANTS, ROOM_NAME_MAX, createRoom as createServerRoom, roomErrorText, validateCreateRoom } from "@/lib/api/voice-rooms";
import { ApiError } from "@/lib/api/client";
import type { Cover, CoverTheme, RoomType } from "@/lib/app/types";

const TYPES: { id: RoomType; label: string; hint: string; icon: typeof Mic }[] = [
  { id: "voice", label: "Voice", hint: "Talk on mic seats", icon: Mic },
  { id: "watch", label: "YouTube", hint: "Watch together", icon: MonitorPlay },
  { id: "kharidari", label: "Kharidari", hint: "Auction room", icon: Gavel },
];

const COVERS: Cover[] = [
  { theme: "dusk", motif: "banyan" },
  { theme: "rose", motif: "lanterns" },
  { theme: "gold", motif: "temple" },
  { theme: "night", motif: "river" },
  { theme: "monsoon", motif: "kites" },
  { theme: "ember", motif: "huts" },
];

export function CreateRoom() {
  const { pop, createRoom, profile, coins, myPermanentRoom, signedIn, enterRoom, payForPermanentRoom, toast } = useApp();
  const live = useServerRooms();
  const [name, setName] = useState(`${profile.name}'s adda`);
  const [type, setType] = useState<RoomType>("voice");
  const [cover, setCover] = useState<Cover>(COVERS[0]);
  const [isPrivate, setPrivate] = useState(false);
  const [seats, setSeats] = useState(10);
  const [category, setCategory] = useState<string>("Chai Adda");
  const canPermanent = !myPermanentRoom && coins >= PERMANENT_ROOM_COST;
  const [permanent, setPermanent] = useState(canPermanent);
  const valid = name.trim().length >= 3 && (!permanent || canPermanent);
  // Signed in: the room is created on the server (POST /voice-rooms) and has real voice
  const online = signedIn;
  const [description, setDescription] = useState("");
  const [maxPeople, setMaxPeople] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const busy = useRef(false);

  const submit = async () => {
    if (!online) {
      createRoom({ name, type, cover, isPrivate, seats, category, permanent });
      return;
    }
    if (busy.current) return;
    const payload = { name, description, roomType: SERVER_TYPE[type], isPrivate, maxParticipants: maxPeople };
    const invalid = validateCreateRoom(payload);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    busy.current = true;
    setSubmitting(true);
    try {
      const room = await createServerRoom(payload);
      // Coins for a permanent room are only taken once the room exists
      const paid = permanent && payForPermanentRoom();
      live.rememberPrefs(room.id, { cover, category, seats, permanent: paid });
      live.addCreated(room);
      pop();
      enterRoom(serverRoomAppId(room.id));
      toast(paid ? `Permanent room created · −${PERMANENT_ROOM_COST} coins` : "Room created");
    } catch (e) {
      if (e instanceof ApiError && e.fields && Object.keys(e.fields).length) setErrors(e.fields);
      else setErrors({ form: roomErrorText(e, "create") });
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="app-scroll h-full pb-safe">
      <ScreenHeader title="Create Room" onBack={pop} />
      <div className="space-y-6 px-4 pb-10 pt-2">
        {/* Live preview */}
        <div className="relative overflow-hidden rounded-3xl ring-1 ring-line">
          <div className="aspect-[16/8]">
            <SunsetScene {...cover} shade />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cream/70">{TYPES.find((t) => t.id === type)?.label} room · {category}</p>
            <p className="mt-0.5 truncate font-display text-xl font-bold text-cream">{name.trim() || "Room name"}</p>
          </div>
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-cream backdrop-blur">
            {isPrivate ? <Lock className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}
            {isPrivate ? "Private" : "Public"}
          </span>
        </div>

        <Field label="Room name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, Math.min(40, ROOM_NAME_MAX)))}
            className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-cream placeholder:text-muted/70 focus:border-gold/50 focus:outline-none"
            placeholder="Give your room a name"
            aria-label="Room name"
          />
          <p className="mt-1.5 flex justify-between text-[11px]">
            <span className="text-coral">{errors.name ?? ""}</span>
            <span className="text-muted">{name.length}/40</span>
          </p>
        </Field>

        {online ? (
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              rows={2}
              className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[14px] text-cream placeholder:text-muted/70 focus:border-gold/50 focus:outline-none"
              placeholder="What's the room about? (optional)"
              aria-label="Description"
            />
            {errors.description ? <p className="mt-1 text-[11px] text-coral">{errors.description}</p> : null}
          </Field>
        ) : null}

        <Field label="Room type">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Room type">
            {TYPES.map((t) => {
              const on = type === t.id;
              const Icon = t.icon;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center ring-1 ${on ? "bg-coral/15 ring-coral" : "bg-surface ring-line"}`}
                >
                  <Icon className={`h-5 w-5 ${on ? "text-coral" : "text-cream/70"}`} aria-hidden />
                  <span className="text-[12.5px] font-bold text-cream">{t.label}</span>
                  <span className="text-[10.5px] text-muted">{t.hint}</span>
                </motion.button>
              );
            })}
          </div>
        </Field>

        <Field label="Room kind">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Room kind">
            <KindOption
              on={permanent}
              disabled={!canPermanent}
              onClick={() => setPermanent(true)}
              icon={<Crown className="h-5 w-5" aria-hidden />}
              title="Permanent"
              body="Yours forever. Levels up from Lv.1 to Lv.10 as people gift."
              foot={
                myPermanentRoom ? (
                  <span className="text-muted">You already own one</span>
                ) : (
                  <span className="flex items-center gap-1 text-gold">
                    <Coin className="h-3.5 w-3.5" /> {PERMANENT_ROOM_COST.toLocaleString("en-IN")} coins
                  </span>
                )
              }
            />
            <KindOption
              on={!permanent}
              onClick={() => setPermanent(false)}
              icon={<Clock3 className="h-5 w-5" aria-hidden />}
              title="Temporary"
              body="Free. Closes as soon as you leave. No room level."
              foot={<span className="text-speak">Free</span>}
            />
          </div>
          <p className="mt-2 text-[11.5px] text-muted">
            Your balance: <span className="font-semibold text-cream">{coins.toLocaleString("en-IN")}</span> coins
            {!myPermanentRoom && coins < PERMANENT_ROOM_COST ? ". Recharge coins from your profile to unlock a permanent room." : "."}
          </p>
        </Field>

        <Field label="Cover">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Room cover">
            {COVERS.map((c) => {
              const on = c.theme === cover.theme;
              return (
                <button key={c.theme} type="button" role="radio" aria-checked={on} onClick={() => setCover(c)} className={`relative overflow-hidden rounded-2xl ring-2 ${on ? "ring-gold" : "ring-transparent"}`}>
                  <span className="block aspect-[4/3]">
                    <SunsetScene {...c} shade />
                  </span>
                  <span className="absolute bottom-1 left-2 text-[10.5px] font-semibold text-cream">{COVER_LABELS[c.theme as CoverTheme]}</span>
                  {on ? (
                    <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-ink">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={`h-8 rounded-full px-3.5 text-[12.5px] font-semibold ${category === c ? "bg-cream text-ink" : "bg-surface text-cream/75"}`}>
                {c}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between rounded-2xl bg-surface p-4 ring-1 ring-line">
          <div>
            <p className="text-sm font-semibold text-cream">Private room</p>
            <p className="text-[11.5px] text-muted">{online ? "Won't show in the public room list" : "Only people you invite can join (demo setting)"}</p>
          </div>
          <Toggle checked={isPrivate} onChange={setPrivate} label="Private room" />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-surface p-4 ring-1 ring-line">
          <div>
            <p className="text-sm font-semibold text-cream">Seats</p>
            <p className="text-[11.5px] text-muted">How many people can be on mic</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Fewer seats" disabled={seats <= 2} onClick={() => setSeats((n) => n - 1)} className="grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-cream disabled:opacity-30">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-display text-lg font-bold text-cream" aria-live="polite">
              {seats}
            </span>
            <button type="button" aria-label="More seats" disabled={seats >= 12} onClick={() => setSeats((n) => n + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-cream disabled:opacity-30">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {online ? (
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cream">Max people</p>
                <p className="text-[11.5px] text-muted">Everyone in the room, listeners included</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Fewer people" disabled={maxPeople <= MIN_PARTICIPANTS} onClick={() => setMaxPeople((n) => Math.max(MIN_PARTICIPANTS, n - (n > 10 ? 5 : 1)))} className="grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-cream disabled:opacity-30">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-7 text-center font-display text-lg font-bold text-cream" aria-live="polite">
                  {maxPeople}
                </span>
                <button type="button" aria-label="More people" disabled={maxPeople >= MAX_PARTICIPANTS} onClick={() => setMaxPeople((n) => Math.min(MAX_PARTICIPANTS, n + (n >= 10 ? 5 : 1)))} className="grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-cream disabled:opacity-30">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {errors.maxParticipants ? <p className="mt-1.5 text-[11px] text-coral">{errors.maxParticipants}</p> : null}
          </div>
        ) : null}

        {online ? (
          <DemoNote>
            The room, its name, type, privacy and size are saved on the server and voice is live. Seats, chat, gifts, cover and category stay on this device for now.
            {permanent ? "" : " A temporary room closes when you leave it."}
          </DemoNote>
        ) : (
        <DemoNote>
          {permanent
            ? "Your permanent room is saved on this device and stays in your Rooms list."
            : "A temporary room isn't saved. It closes when you leave it."}{" "}
          Other people can't see it in this preview.
        </DemoNote>
        )}

        {errors.form ? (
          <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-[12.5px] text-cream ring-1 ring-coral/25">
            {errors.form}
          </p>
        ) : null}

        <Button size="lg" className="w-full" disabled={!valid || submitting} onClick={() => void submit()}>
          {submitting ? "Creating…" : permanent ? `Create permanent room · ${PERMANENT_ROOM_COST.toLocaleString("en-IN")} coins` : "Create temporary room"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      {children}
    </div>
  );
}

function KindOption({ on, disabled, onClick, icon, title, body, foot }: { on: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; title: string; body: string; foot: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-2xl p-3 text-left ring-1 disabled:opacity-45 ${on ? "bg-coral/15 ring-coral" : "bg-surface ring-line"}`}
    >
      <span className={on ? "text-coral" : "text-cream/70"}>{icon}</span>
      <span className="text-[14px] font-bold text-cream">{title}</span>
      <span className="text-[11px] leading-snug text-muted">{body}</span>
      <span className="mt-1 text-[11.5px] font-bold">{foot}</span>
    </motion.button>
  );
}
