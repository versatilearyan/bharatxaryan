"use client";

import { motion } from "framer-motion";
import { Bell, Compass, House, MessageCircle, Mic, Radio, Search, Send, UserRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { GiftArt } from "@/components/art/GiftArt";
import { Logo } from "@/components/brand/Logo";
import { FestivalBackground } from "./FestivalBackground";
import { FestivalBanner } from "./FestivalBanner";
import { FestivalDecor } from "./FestivalDecor";
import { FestivalPopup } from "./FestivalPopup";
import { useFestival } from "./FestivalProvider";
import { TitlePill } from "@/components/profile/ProfileTitles";
import { LevelPill } from "@/components/profile/IdTags";
import { Coin } from "@/components/ui/kit";
import { GIFTS } from "@/lib/app/data";

/**
 * The screens of the admin panel's phone preview. They are built from the app's own pieces (the Panchayat logo, festival banner, pop-up,
 * decorations, gift art, level pill, title pills, coins) and the app's own colour variables, with sample people and rooms. The festival
 * pieces and the theme function are the very same code the real app runs, so what the admin sees is what users get.
 */
export type PreviewScreen = "home" | "login" | "profile" | "gifts" | "voice" | "popup";

const SAMPLE = [
  { name: "Aarav", color: "from-[#ff8a5c] to-[#f4515b]" },
  { name: "Meera", color: "from-[#7a5cff] to-[#c56bff]" },
  { name: "Kabir", color: "from-[#19c3b2] to-[#42d6e0]" },
  { name: "Isha", color: "from-[#f0a030] to-[#ffcf5a]" },
  { name: "Rohan", color: "from-[#3a8dff] to-[#7fd6ff]" },
  { name: "Zoya", color: "from-[#ff5d8f] to-[#ffb3c8]" },
];

function Face({ i, size = 40, ring = false }: { i: number; size?: number; ring?: boolean }) {
  const s = SAMPLE[i % SAMPLE.length];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${s.color} font-display font-extrabold text-white ${ring ? "ring-2 ring-gold" : ""}`} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {s.name[0]}
    </span>
  );
}

const NAV: { id: PreviewScreen; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "voice", label: "Rooms", icon: Radio },
  { id: "gifts", label: "Chat", icon: MessageCircle },
  { id: "login", label: "Discover", icon: Compass },
  { id: "profile", label: "Profile", icon: UserRound },
];

function Nav({ screen, go }: { screen: PreviewScreen; go: (s: PreviewScreen) => void }) {
  return (
    <nav aria-label="Main" className="absolute inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 backdrop-blur-xl">
      <ul className="grid h-16 grid-cols-5">
        {NAV.map(({ id, label, icon: Icon }, i) => {
          const active = id === screen || (screen === "popup" && id === "home");
          return (
            <li key={label + i}>
              <button type="button" onClick={() => go(id)} className="relative flex h-full w-full flex-col items-center justify-center gap-1" aria-current={active ? "page" : undefined}>
                <span className="relative grid h-8 w-12 place-items-center">
                  {active ? <span className="absolute inset-0 rounded-full bg-coral/15 ring-1 ring-coral/30" /> : null}
                  <Icon className={`relative h-[22px] w-[22px] ${active ? "text-coral" : "text-muted"}`} strokeWidth={active ? 2.3 : 1.9} aria-hidden />
                </span>
                <span className={`text-[10.5px] font-semibold ${active ? "text-cream" : "text-muted"}`}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Status() {
  return (
    <div className="flex h-7 shrink-0 items-center justify-between px-5 text-[11px] font-bold text-cream/90">
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <span>5G</span>
        <span className="inline-block h-2.5 w-5 rounded-[3px] border border-cream/70 p-px">
          <span className="block h-full w-3/4 rounded-[1px] bg-cream/80" />
        </span>
      </span>
    </div>
  );
}

function Btn({ children, solid = false }: { children: ReactNode; solid?: boolean }) {
  return (
    <button
      type="button"
      className={`w-full py-3 text-[14px] font-extrabold ${solid ? "text-[#2a1a0c]" : "text-cream ring-1 ring-line-strong"}`}
      style={{ borderRadius: "var(--festival-radius, 9999px)", background: solid ? "var(--festival-primary, #e7bc72)" : "var(--color-surface)" }}
    >
      {children}
    </button>
  );
}

function Home({ go }: { go: (s: PreviewScreen) => void }) {
  return (
    <div className="app-scroll h-full overflow-y-auto pb-24">
      <div className="flex items-center justify-between px-4 pt-1">
        <Logo size="1.2rem" sizes="160px" />
        <span className="flex items-center gap-2">
          <span className="flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface/80 pl-1.5 pr-2.5">
            <Coin className="h-5 w-5" />
            <span className="text-[13.5px] font-bold text-cream">12,500</span>
          </span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-surface/80 text-cream ring-1 ring-line-strong">
            <Bell className="h-4 w-4" />
          </span>
        </span>
      </div>
      <FestivalBanner onOpen={() => go("gifts")} />
      <div className="mt-4 grid grid-cols-4 gap-2 px-4">
        {["Ludo", "Chess", "Rooms", "Parivar"].map((n, i) => (
          <button key={n} type="button" onClick={() => n === "Rooms" && go("voice")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface py-3 ring-1 ring-line">
            <Face i={i + 1} size={34} />
            <span className="text-[11px] font-semibold text-cream">{n}</span>
          </button>
        ))}
      </div>
      <h3 className="px-4 pt-5 font-display text-[16px] font-extrabold text-cream">Popular rooms</h3>
      <ul className="mt-2 space-y-2 px-4">
        {["Chai Adda", "Bollywood Night", "Gaming Gang"].map((n, i) => (
          <li key={n}>
            <button type="button" onClick={() => go("voice")} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-line">
              <Face i={i} size={46} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[15px] font-bold text-cream">{n}</span>
                <span className="mt-0.5 block text-[11.5px] text-muted">
                  <span className="rounded-md bg-gold/20 px-1.5 py-0.5 font-bold text-gold">Lv.{3 + i}</span> · {12 + i * 7} online
                </span>
              </span>
              <span className="rounded-full bg-coral/15 px-3 py-1.5 text-[12px] font-bold text-coral">Join</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Login() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8 pb-10 text-center">
      <Logo size="2rem" />
      <p className="max-w-[240px] text-[13px] leading-relaxed text-cream/70">Voice rooms, games and gifts with your people.</p>
      <div className="w-full space-y-2.5">
        <Btn solid>Continue with Google</Btn>
        <Btn>Continue with phone</Btn>
        <Btn>Continue with email</Btn>
      </div>
      <p className="text-[11px] text-muted">By continuing you accept the Terms and Privacy Policy.</p>
    </div>
  );
}

function Profile() {
  const { config } = useFestival();
  return (
    <div className="app-scroll h-full overflow-y-auto pb-24">
      <div className="h-32 w-full" style={{ background: "linear-gradient(135deg, var(--color-wine), var(--color-wine-2))" }} />
      <div className="-mt-12 px-4">
        <Face i={1} size={88} ring />
        <h1 className="mt-2 font-display text-[24px] font-extrabold text-cream">Meera Sharma</h1>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <LevelPill level={12} gender="female" />
          <span className="rounded-md bg-gold/15 px-2 py-1 text-[10.5px] font-bold text-gold">4,820 charm</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <TitlePill t={{ id: "1", name: config?.banner.title.slice(0, 14) || "Festival Star", colorFrom: config?.theme.accent ?? "#ff687c", colorTo: config?.theme.primary ?? "#e7bc72", textColor: "#ffffff", rarity: "EPIC" }} />
          <TitlePill t={{ id: "2", name: "Shining Star", colorFrom: "#19c3b2", colorTo: "#42d6e0", textColor: "#ffffff", rarity: "PREMIUM" }} />
        </div>
        <p className="mt-3 text-[13.5px] text-cream/80">Chai, cricket aur gaana. Always up for a room.</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[["4,820", "Charm"], ["12", "Guard"], ["96", "Gifts"], ["31", "BFF"]].map(([a, b]) => (
            <div key={b} className="rounded-2xl bg-surface py-3 text-center ring-1 ring-line">
              <p className="font-display text-[17px] font-extrabold text-cream">{a}</p>
              <p className="text-[10.5px] text-muted">{b}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <p className="font-display text-[14px] font-bold text-cream">Level 12</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
            <div className="h-full w-2/3 rounded-full" style={{ background: "linear-gradient(90deg, var(--festival-accent, #ff687c), var(--festival-primary, #e7bc72))" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Gifts() {
  const { config } = useFestival();
  const list = GIFTS.slice(0, 8);
  const hi = config?.sections.giftsHighlight ?? false;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-1">
        <h2 className="font-display text-[19px] font-extrabold text-cream">Send a gift</h2>
        <span className="flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface/80 pl-1.5 pr-2.5">
          <Coin className="h-5 w-5" />
          <span className="text-[13.5px] font-bold text-cream">12,500</span>
        </span>
      </div>
      {hi ? (
        <div className="mx-4 mt-3 rounded-2xl p-3 ring-1 ring-gold/50" style={{ background: "linear-gradient(135deg, var(--festival-accent, #ff687c)33, var(--festival-primary, #e7bc72)33)" }}>
          <p className="text-[11px] font-extrabold tracking-wider text-gold uppercase">{config?.banner.title || "Festival"} special</p>
          <p className="mt-0.5 text-[12.5px] text-cream/85">Festival gifts are on top this season.</p>
        </div>
      ) : null}
      <div className="mt-3 grid flex-1 grid-cols-4 content-start gap-2 overflow-y-auto px-4 pb-24">
        {list.map((g, i) => (
          <button key={g.id} type="button" className={`flex flex-col items-center gap-1 rounded-2xl bg-surface p-2 ring-1 ${hi && i < 2 ? "ring-gold" : "ring-line"}`}>
            <span className="grid h-12 w-12 place-items-center overflow-hidden">
              {g.video?.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.video.icon} alt="" className="h-full w-full object-contain" />
              ) : (
                <GiftArt id={g.id} />
              )}
            </span>
            <span className="w-full truncate text-center text-[10px] font-semibold text-cream">{g.name}</span>
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-gold">
              <Coin className="h-3 w-3" />
              {g.cost.toLocaleString("en-IN")}
            </span>
          </button>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-16 z-20 border-t border-line bg-ink/95 px-4 py-2.5 backdrop-blur">
        <Btn solid>Send gift</Btn>
      </div>
    </div>
  );
}

function Voice() {
  const lines = [
    ["Aarav", "Happy festival everyone!"],
    ["Meera", "Sending a gift, wait"],
    ["Kabir", "Mic on karo yaar"],
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-1">
        <span className="flex items-center gap-2">
          <Face i={0} size={34} />
          <span>
            <span className="block font-display text-[14px] font-bold text-cream">Chai Adda</span>
            <span className="block text-[10.5px] text-muted">
              <span className="rounded bg-gold/20 px-1 font-extrabold text-gold">Lv.5</span> ID 4800123
            </span>
          </span>
        </span>
        <span className="rounded-full bg-coral px-3 py-1.5 text-[12px] font-bold text-white">Join</span>
      </div>
      <div className="mt-4 grid grid-cols-4 justify-items-center gap-x-2 gap-y-3 px-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            {i < 6 ? <Face i={i} size={52} ring={i === 0 || i === 2} /> : <span className="grid h-[52px] w-[52px] place-items-center rounded-full border border-dashed border-line-strong text-muted">+</span>}
            <span className="text-[10px] text-cream/70">{i < 6 ? SAMPLE[i].name : "Seat " + (i + 1)}</span>
          </div>
        ))}
      </div>
      <div className="mx-4 mt-4 flex-1 space-y-1.5 overflow-hidden">
        {lines.map(([n, t]) => (
          <p key={n} className="w-fit max-w-full rounded-2xl bg-black/35 px-3 py-1.5 text-[12.5px] text-cream">
            <b className="text-gold">{n}: </b>
            {t}
          </p>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-16 z-20 flex items-center gap-2 border-t border-line bg-ink/95 px-3 py-2.5 backdrop-blur">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-cream ring-1 ring-line-strong">
          <Mic className="h-4 w-4" />
        </span>
        <span className="flex h-9 flex-1 items-center rounded-full bg-surface px-3 text-[12.5px] text-muted ring-1 ring-line-strong">Say something…</span>
        <span className="grid h-9 w-9 place-items-center rounded-full text-[#2a1a0c]" style={{ background: "var(--festival-primary, #e7bc72)" }}>
          <Send className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

export function PreviewStage({ screen, onScreen }: { screen: PreviewScreen; onScreen: (s: PreviewScreen) => void }) {
  const showNav = screen !== "login";
  return (
    <div id="main" className="relative flex h-full w-full flex-col overflow-hidden bg-ink text-cream">
      <FestivalBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Status />
        <motion.div key={screen} className="relative min-h-0 flex-1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {screen === "home" || screen === "popup" ? <Home go={onScreen} /> : screen === "login" ? <Login /> : screen === "profile" ? <Profile /> : screen === "gifts" ? <Gifts /> : <Voice />}
        </motion.div>
      </div>
      {showNav ? <Nav screen={screen} go={onScreen} /> : null}
      <FestivalDecor contained />
      <FestivalPopup open={screen === "popup"} />
      <span className="sr-only">
        <Search />
      </span>
    </div>
  );
}
