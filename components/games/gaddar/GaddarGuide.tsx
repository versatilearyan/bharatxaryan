"use client";

/**
 * "Kaise khelte hain": the guide for Gaon ka Gaddaar, in simple Hinglish. Opened from the lobby, and shown by itself the first time.
 */
import { useState } from "react";
import { X } from "lucide-react";

const TABS = ["Basics", "Roles", "Controls", "Maps", "Tips"] as const;
type Tab = (typeof TABS)[number];

export const GUIDE_SEEN_KEY = "gaddar.guide.seen.v1";

function Card({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
      <h3 className="flex items-center gap-2 font-display text-[15px] font-extrabold text-gold">
        <span className="text-[20px]" aria-hidden>
          {icon}
        </span>
        {title}
      </h3>
      <div className="mt-1.5 space-y-1.5 text-[13px] leading-relaxed text-cream/85">{children}</div>
    </section>
  );
}

function Key({ icon, name, children }: { icon: string; name: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-black/25 p-2.5 ring-1 ring-white/10">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-[22px]" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-cream/85">
        <b className="block text-[13.5px] text-cream">{name}</b>
        {children}
      </span>
    </li>
  );
}

export function GaddarGuide({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Basics");
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-gradient-to-b from-[#3a2412] to-[#120d0a]" role="dialog" aria-label="Kaise khelte hain">
      <div className="pt-safe flex items-center gap-2 px-4 pb-1 pt-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[20px] font-extrabold text-gold">📖 Kaise khelte hain</h2>
          <p className="text-[12px] text-cream/65">Gaon ka Gaddaar: 4 se 10 dost, ek gaddaar, ek gaon.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the guide" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-cream">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-4 py-2" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-bold ${tab === t ? "bg-gold text-ink" : "bg-white/10 text-cream/80"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="app-scroll min-h-0 flex-1 space-y-3 px-4 pb-6">
        {tab === "Basics" ? (
          <>
            <Card icon="🛖" title="Game kya hai?">
              <p>Ek gaon me kuch log <b>Gaonwale</b> hain aur 1 ya 2 chhupe hue <b>Gaddaar</b>. Gaonwale apne kaam poore karte hain, gaddaar chupke se unhe hatate hain. Jab koi laash mile ya shak ho, <b>Sarpanch ki baithak</b> lagti hai: sab text me baat karte hain aur vote karke ek ko gaon se nikalte hain.</p>
            </Card>
            <Card icon="🏆" title="Jeet kaise hoti hai?">
              <p>
                <b>Gaonwale jeette</b> jab: gaon ka poora kaam ho jaye (upar wali bar full), ya sab gaddaar gaon se nikal jayein.
              </p>
              <p>
                <b>Gaddaar jeette</b> jab: gaddaar ginti me baaki logon ke barabar ho jayein, ya <b>Kuan sukha</b> (sabotage) ka waqt khatam ho jaye.
              </p>
            </Card>
            <Card icon="🎬" title="Ek round kaise chalta hai?">
              <ol className="list-decimal space-y-1 pl-5">
                <li>Room me <b>Gaddaar</b> game kholo, <b>Join</b> karo. Host <b>Start</b> karta hai (kam se kam 4 players).</li>
                <li>Aapko apna role dikhega: Gaonwala ya Gaddaar. Kisi ko mat batao!</li>
                <li>Sab chaupal (ya map ki ghanti) se shuru karte hain aur gaon me ghoomte hain.</li>
                <li>Laash dikhe to <b>Report</b>. Ya ghanti par jakar <b>Baithak</b> bulao.</li>
                <li>Baithak me text me baat karo, phir vote do. Sabse zyada vote wala gaon se bahar.</li>
                <li>Jab tak jeet na ho, round dobara chalta hai.</li>
              </ol>
            </Card>
            <Card icon="📵" title="Mic band, sirf text">
              <p>Is game me <b>mic band</b> rehta hai. Baat sirf Baithak ke text chat me hoti hai (zinda log hi likh sakte hain). Game aada (<b>landscape</b>) chalta hai: phone ko ghuma lo. Seedhe phone par game khud ghum jata hai.</p>
            </Card>
          </>
        ) : null}

        {tab === "Roles" ? (
          <>
            <Card icon="🧑‍🌾" title="Gaonwala (villager)">
              <p>Aapke paas <b>4 kaam</b> hote hain (list upar left me, map par peele <b>!</b> circle). Har kaam poora karo to gaon ki bar badhti hai. Aap <b>mar jao</b> to bhoot ban jate ho: tab bhi kaam kar sakte ho aur gaon ki madad kar sakte ho, par vote ya baat nahi.</p>
              <p>Gaonwale ko <b>Report</b>, <b>Baithak</b> aur <b>Kaam</b> milte hain. Andhera hone par nazar bahut kam ho jati hai, to bijli ka box theek karo.</p>
            </Card>
            <Card icon="🗡️" title="Gaddaar (traitor)">
              <p>Aapke paas koi asli kaam nahi hota (sirf dikhawe ki list). Aapke hathiyar:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><b>Hatao</b>: paas wale gaonwale ko hatao. Cooldown hota hai (host chunta hai: 15, 25 ya 40 sec).</li>
                <li><b>Andhera</b>: bijli gul. Gaonwalon ko kuch nahi dikhta jab tak koi bijli ke box par jaake switch-panel ke saare switch ON na kar de.</li>
                <li><b>Kuan sukha</b>: 40 sec ka countdown. Do gaonwale <b>ek saath</b> do alag pumps par Kaam daba ke rakhein warna aap jeet jaoge. Is dauran Baithak ghanti band hoti hai.</li>
                <li><b>Surang (vent)</b>: zameen ki jaali ke paas <b>Surang</b> dabao, chhup jao aur doosri jaali se nikal jao. Jo paas hoga wo aapko ghusta ya nikalta dekh sakta hai!</li>
              </ul>
              <p>Aapko doosra gaddaar (agar hai) lal naam se dikhta hai. Gaddaar ki nazar gaonwale se zyada door tak hoti hai, andhere me bhi.</p>
            </Card>
            <Card icon="👻" title="Bhoot (jo mar gaya ya nikala gaya)">
              <p>Deewaron se guzar sakte ho, kaam kar sakte ho, par vote aur chat nahi. Zinda logon ko bhoot dikhte nahi.</p>
            </Card>
          </>
        ) : null}

        {tab === "Controls" ? (
          <>
            <Card icon="🕹️" title="Chalna">
              <p>Neeche left me <b>joystick</b> hai: ungli se ghumao. Computer par <b>W A S D</b> ya arrow keys. Deewaron aur imaraton se tak karate ho to ruk jate ho.</p>
            </Card>
            <ul className="space-y-2">
              <Key icon="🛠️" name="Kaam (daba ke rakho)">Peele <b>!</b> circle ke paas jao, button <b>daba ke rakho</b> jab tak bar bhar na jaye (3 sec). Computer par Space.</Key>
              <Key icon="🪔" name="Kaam (chhota game)">Kuch kaam me button dabate hi chhota game khulta hai: diye <b>1 se 5</b> tak jalao, <b>taar</b> ek rang ke jodo, <b>card swipe</b> karo (na tez, na dheere), <b>engine slider</b> align karke Lock karo, ya <b>shield</b> ki laal tiles dabao.</Key>
              <Key icon="📢" name="Report">Laash ke paas jao aur dabao. Seedha Baithak lagti hai.</Key>
              <Key icon="🔔" name="Baithak">Map ki ghanti ke paas jao. Har player ek hi baar, shuru ke 15 sec baad. Kuan sukha me band.</Key>
              <Key icon="🗡️" name="Hatao (sirf gaddaar)">Kisi ke paas jao. Cooldown me number dikhta hai.</Key>
              <Key icon="💡" name="Andhera / 💧 Kuan sukha (sirf gaddaar)">Sabotage. Ek samay me ek hi chalta hai, aur dobara ke liye 30 sec rukna padta hai.</Key>
              <Key icon="🕳️" name="Surang (sirf gaddaar)">Jaali ke paas dabao. Andar: <b>Agla / Pichla</b> doosri jaali par jao, <b>Bahar</b> nikalo.</Key>
            </ul>
          </>
        ) : null}

        {tab === "Maps" ? (
          <>
            <Card icon="🌾" title="Gaon">
              <p>Chaupal, haveli, mandir, mandi aur khet. Khula gaon, saaf nazar. Seedha shuru karne ke liye achha map. 8 kaam, 5 surang.</p>
            </Card>
            <Card icon="🎡" title="Mela">
              <p>Jhoola, halwai, chai ki dukan aur maut ka kuan. Bheed jaise stalls, kai raaste. 8 kaam, 4 surang.</p>
            </Card>
            <Card icon="🏰" title="Haveli">
              <p>9 kamre aur beech me aangan. Darwaze se darwaze, andhere kone: gaddaar ke liye jannat, gaonwale ke liye dhyan rakhne wala map. 9 kaam, 6 surang.</p>
            </Card>
            <Card icon="🎲" title="Random">
              <p>Host &ldquo;Random&rdquo; chune to game shuru hone par koi bhi ek map aata hai.</p>
            </Card>
          </>
        ) : null}

        {tab === "Tips" ? (
          <>
            <Card icon="🧑‍🌾" title="Gaonwale ke liye">
              <ul className="list-disc space-y-1 pl-5">
                <li>Akele mat ghoomo. Do-teen log saath rahenge to gaddaar hamla nahi kar paayega.</li>
                <li>Laash dikhte hi Report karo, aur Baithak me batao <b>kahan</b> thi aur <b>kaun</b> paas tha.</li>
                <li>Kaam karte waqt koi gaddaar ko surang me ghusta dekho to turant Baithak me bolo: surang sirf gaddaar use karte hain.</li>
                <li>Andhera ho to bijli ke box (laal circle) par jao. Kuan sukha me <b>do log do pumps</b> par chahiye.</li>
              </ul>
            </Card>
            <Card icon="🗡️" title="Gaddaar ke liye">
              <ul className="list-disc space-y-1 pl-5">
                <li>Dikhawe ke kaam ki jagah par jao, jaise kaam kar rahe ho.</li>
                <li>Hatao tabhi karo jab koi aur paas na ho. Phir door chale jao ya surang me chhup jao.</li>
                <li>Kuan sukha se Baithak ghanti band ho jati hai: us dauran hamla karo.</li>
                <li>Baithak me shant raho, koi sahi jawab do (&ldquo;main mela wali taraf tha&rdquo;).</li>
              </ul>
            </Card>
            <Card icon="❓" title="Aksar poochhe jane wale sawal">
              <p><b>Game beech me chhod diya to?</b> Aap gaon se chupchap nikal jate ho (laash nahi). 20 sec tak phone shant raha to bhi yahi hota hai.</p>
              <p><b>Kya mic chalu kar sakte hain?</b> Nahi. Is game me mic band hai; sirf Baithak ka text chat hai.</p>
              <p><b>Kitne log?</b> 4 se 10. 7 ya zyada ho to 2 gaddaar (host badal sakta hai).</p>
              <p><b>Phone lag kare to?</b> Wi-Fi ya achhe network par khelo. Aapka apna character turant chalta hai, server baad me sahi kar deta hai.</p>
            </Card>
          </>
        ) : null}
      </div>
      <div className="px-4 pb-5 pt-2">
        <button type="button" onClick={onClose} className="h-12 w-full rounded-full bg-gradient-to-r from-[#f6d899] via-[#e7bc72] to-[#c9954a] font-display text-[15px] font-extrabold text-[#2a1a0c]">
          Samajh gaya, khelte hain
        </button>
      </div>
    </div>
  );
}
