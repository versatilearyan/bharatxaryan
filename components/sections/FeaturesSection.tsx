import { Gamepad2, Mic, Users, Volume2 } from "lucide-react";
import { Avatar } from "@/components/mock/Avatar";
import { GameGlyph } from "@/components/mock/GameTile";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GAMES, MEMBERS, type Member } from "@/lib/mock-data";
import { FeatureCard } from "./FeatureCard";

const m = (id: string) => MEMBERS.find((x) => x.id === id) as Member;

export function FeaturesSection() {
  return (
    <section id="features" aria-labelledby="features-title" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading id="features-title" title="A little more fun in every conversation." />
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            className="md:col-span-2 lg:col-span-1"
            title="Voice Rooms"
            icon={Mic}
            description="Find your people, join the conversation, and hang out together."
            illustration={<VoiceRoomsArt />}
          />
          <FeatureCard
            delay={0.05}
            title="Play Together"
            icon={Gamepad2}
            description="Turn a regular conversation into a fun game session."
            illustration={<PlayArt />}
          />
          <FeatureCard
            delay={0.1}
            title="Meet Your Community"
            icon={Users}
            description="Create memorable moments with people who share your vibe."
            illustration={<CommunityArt />}
          />
        </ul>
      </div>
    </section>
  );
}

/* ---------- Illustrations (original, built from the same mock UI parts) ---------- */

function VoiceRoomsArt() {
  const people = ["riya", "kabir", "meher", "tara"].map(m);
  return (
    <div className="w-full max-w-xl rounded-2xl border border-line bg-ink-2 p-5 transition-transform duration-500 group-hover:-translate-y-1">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-bold text-cream">Late night Antakshari</p>
          <p className="text-xs text-muted">Music room, open to everyone</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg bg-speak/10 px-2.5 py-1 text-xs font-semibold text-speak">
          <Volume2 className="h-3.5 w-3.5" aria-hidden /> On air
        </span>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {people.map((p) => (
          <Avatar key={p.id} member={p} size={46} />
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-coral text-white">
          <Mic className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex h-6 flex-1 items-center gap-[3px]" aria-hidden>
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              className="w-[3px] flex-1 origin-center rounded-full bg-cream/30 animate-eq"
              style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 7) * 0.11}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayArt() {
  const picks = GAMES.slice(0, 3);
  const rot = [-14, 0, 14];
  return (
    <div className="relative h-48 w-56">
      {picks.map((g, i) => (
        <div
          key={g.id}
          className="absolute left-1/2 top-1/2 flex h-36 w-28 flex-col items-center justify-center gap-2 rounded-2xl border border-line-strong p-3 shadow-xl transition-transform duration-500 ease-out"
          style={{
            background: `linear-gradient(180deg, color-mix(in oklab, ${g.hue} 22%, #222127), #19191f)`,
            transform: `translate(calc(-50% + ${(i - 1) * 46}px), -50%) rotate(${rot[i]}deg)`,
            zIndex: i === 1 ? 2 : 1,
          }}
        >
          <span className="h-14 w-14">
            <GameGlyph glyph={g.glyph} hue={g.hue} />
          </span>
          <span className="text-center text-xs font-semibold text-cream">{g.name}</span>
        </div>
      ))}
    </div>
  );
}



function CommunityArt() {
  const people = ["tara", "ishaan", "zoya", "dev"].map(m);
  return (
    <div className="relative w-full max-w-[17rem]">
      <div className="flex justify-center -space-x-3">
        {people.map((p) => (
          <div key={p.id} className="rounded-full ring-4 ring-surface">
            <Avatar member={{ ...p, speaking: false, muted: false, host: false }} size={54} showName={false} />
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-2 text-sm text-cream">anyone up for carrom? 🎯</p>
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-coral px-3.5 py-2 text-sm font-medium text-white transition-transform duration-500 group-hover:-translate-y-0.5">
          saving you a seat
        </p>
      </div>
    </div>
  );
}
