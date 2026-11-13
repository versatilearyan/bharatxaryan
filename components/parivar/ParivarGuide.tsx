"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { treasureApi, type ParivarProfile, type TreasureInfo } from "@/lib/api/parivar";

/* A plain guide for members: how a Parivar grows, what each feature does, and what the weekly chests need.
   The numbers that the admin can change (level needs, chest targets and pools) are read live from the server. */

const n = (v: number) => v.toLocaleString("en-IN");

function Step({ no, title, children }: { no: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f6d899] to-[#c9954a] font-display text-[14px] font-extrabold text-[#2a1a0c]">{no}</span>
      <span className="min-w-0">
        <span className="block font-display text-[14px] font-extrabold text-cream">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-cream/75">{children}</span>
      </span>
    </li>
  );
}

function Feature({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
      <span className="text-[22px] leading-none">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-extrabold text-cream">{title}</span>
        <span className="block text-[12.5px] leading-relaxed text-cream/70">{children}</span>
      </span>
    </li>
  );
}

const H = ({ children }: { children: ReactNode }) => <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-gold/80">{children}</p>;

export function ParivarGuideSheet({ p, open, onClose }: { p: ParivarProfile; open: boolean; onClose: () => void }) {
  const [t, setT] = useState<TreasureInfo | null>(null);
  useEffect(() => {
    if (!open) return;
    void treasureApi.state(p.id).then(setT).catch(() => undefined);
  }, [open, p.id]);
  const lu = p.levelUp;
  return (
    <BottomSheet open={open} onClose={onClose} title="How a Parivar grows" tall>
      <div className="px-4 pb-10">
        <p className="text-[13px] leading-relaxed text-cream/80">
          A Parivar is your family on Panchayat. Together you earn <b className="text-gold">activity</b>, build a <b className="text-gold">family fund</b>, level up, climb the ranking and open{" "}
          <b className="text-gold">weekly treasure chests</b>.
        </p>

        <H>The path to a bigger Parivar</H>
        <ol className="space-y-2">
          <Step no={1} title="Join or create a Parivar">
            Find a Parivar in Search and join (or ask to join). You can also create your own and become its Mukhiya (Leader). Gather friends: a higher level lets more members in.
          </Step>
          <Step no={2} title="Earn weekly activity together">
            Activity comes from what the family does together: sending gifts to each other, cheering, daily check-in and tasks. Every member&apos;s effort adds to the same number. It restarts every Monday 00:00, so be active every week.
            {t ? (
              <>
                {" "}
                This week your Parivar has <b className="text-gold">{n(t.weekActivity)}</b>.
              </>
            ) : null}
          </Step>
          <Step no={3} title="Fill the family fund">
            Members donate coins to the Parivar treasury. The fund pays for chests, Kavach, the shop and level ups, so a rich fund makes a strong Parivar.
          </Step>
          <Step no={4} title="Level up">
            A new level needs <b>both</b> enough activity and enough fund. When both are ready, the Mukhiya presses <b>Level up</b>.
            {lu ? (
              <>
                {" "}
                Level {lu.level} needs <b className={lu.expOk ? "text-speak" : "text-gold"}>{n(lu.expNeeded)} activity {lu.expOk ? "✓" : ""}</b> and{" "}
                <b className={lu.fundOk ? "text-speak" : "text-gold"}>{n(lu.fundNeeded)} fund {lu.fundOk ? "✓" : ""}</b>.
              </>
            ) : null}{" "}
            {lu?.spendAll ? <b className="text-gold">Levelling up uses up the whole family fund, so the fund starts again from 0. </b> : null}A higher level gives a bigger frame, more members and more features.
          </Step>
          <Step no={5} title="Climb the ranking and win prizes">
            The weekly and the total ranking compare all Parivars. Top Parivars get prizes and appear in the World news.
          </Step>
        </ol>

        <H>Weekly Family Treasure</H>
        <p className="mb-2 text-[12.5px] leading-relaxed text-cream/75">
          Reach a weekly activity target and the Parivar earns a chest. Any member can <b>Claim</b> it into the Treasure. After its unlock timer ends it says <b>Ready to Open</b>, and the Mukhiya or a Deputy sends it: to everyone by luck, to one member, or takes it all.
          Rewards go straight to your wallet, Diamond wallet, bag and Parivar collection.
        </p>
        {!t ? null : (
          <ul className="space-y-2">
            {t.tiers
              .filter((x) => x.enabled)
              .map((x) => (
                <li key={x.id} className="flex items-center justify-between rounded-2xl bg-surface p-3 ring-1 ring-line">
                  <span>
                    <span className="block text-[13.5px] font-extrabold text-cream">{x.name}</span>
                    <span className="block text-[11.5px] text-muted">
                      🪙 {n(x.poolCoins)}
                      {x.poolDiamonds > 0 ? ` · 💎 ${n(x.poolDiamonds)}` : ""} · unlocks {x.unlockMinutes} min after claiming
                    </span>
                  </span>
                  <span className="text-right text-[12px] font-bold text-gold">
                    {n(x.target)}
                    <span className="block text-[10px] font-semibold uppercase text-muted">activity / week</span>
                  </span>
                </li>
              ))}
          </ul>
        )}

        <H>What you can do inside</H>
        <ul className="space-y-2">
          <Feature icon="💬" title="Family chat">
            Talk with everyone. Gifts and big wins appear here too.
          </Feature>
          <Feature icon="🎁" title="Send gift">
            Gifts to a member (or to all) add activity for the Parivar and Charm for the receiver.
          </Feature>
          <Feature icon="📣" title="Cheer">
            Spend coins to cheer the family and boost its activity and fund.
          </Feature>
          <Feature icon="🎰" title="Gacha">
            Roll for coins, gifts, frames and more. Your free rolls are paid by the family fund.
          </Feature>
          <Feature icon="🛒" title="Shop and Chests">
            The Parivar buys cards, Kavach and chests with its fund. Chests are shared piece by piece.
          </Feature>
          <Feature icon="🛡️" title="Kavach">
            A shield for the treasury. While it is on, other Parivars find it harder to steal from you.
          </Feature>
          <Feature icon="🥷" title="Chori">
            Try to take a part of a rival Parivar&apos;s treasury. Success is a chance, and a failed try can cost you. Keep your own Kavach on.
          </Feature>
          <Feature icon="🎤" title="Family voice room">
            Unlocks at a Parivar level. Talk live together.
          </Feature>
        </ul>

        <H>Roles</H>
        <ul className="space-y-2">
          <Feature icon="👑" title="Mukhiya (Leader)">
            Runs the Parivar: levels it up, appoints Deputies, changes settings, and sends the weekly chests.
          </Feature>
          <Feature icon="⭐" title="Deputy">
            Helps the Mukhiya and can also send the weekly chests.
          </Feature>
          <Feature icon="🛠️" title="Admin">
            Helps with joins and members, as the Mukhiya allows.
          </Feature>
          <Feature icon="🙂" title="Member">
            Be active, donate, claim chests and enjoy the rewards.
          </Feature>
        </ul>

        <H>Tips to grow fast</H>
        <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-cream/75">
          <li>Check in and finish the Tasks every day.</li>
          <li>Send gifts inside the Parivar. Many small gifts from many members add up fast.</li>
          <li>Reach the weekly targets before Monday, because the week starts again from zero.</li>
          <li>Keep a healthy fund for the level up, and use Kavach before rivals try Chori.</li>
          <li>Invite active friends. A Parivar with more active members opens better chests.</li>
        </ul>
      </div>
    </BottomSheet>
  );
}
