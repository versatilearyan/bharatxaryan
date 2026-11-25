"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { getWalletCoinPacks, walletImageSrc, type WalletCoinPack } from "@/lib/api/wallet";
import { Coin } from "@/components/ui/kit";

/** Live price list for the public Products & Pricing page (coin packs, VIP plans, Royal Pack), straight from the server. */
type Plan = { id: number; name: string; days: number; price: number };
type Royal = { enabled: boolean; name: string; priceInr: number; coins: number };

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

function Card({ img, title, sub, price }: { img: React.ReactNode; title: string; sub: string; price: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-cream/[0.04] p-3 ring-1 ring-line">
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-black/30">{img}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-cream">{title}</span>
        <span className="block text-sm text-muted">{sub}</span>
      </span>
      <span className="shrink-0 font-display text-xl font-bold text-gold">{price}</span>
    </li>
  );
}

export function PriceList() {
  const [packs, setPacks] = useState<WalletCoinPack[] | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [royal, setRoyal] = useState<Royal | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getWalletCoinPacks().then(setPacks).catch(() => setError(true));
    api<unknown>("/api/v1/vip/plans")
      .then((raw) =>
        setPlans(
          (Array.isArray(raw) ? raw : []).flatMap((r) => {
            const o = r as Record<string, unknown>;
            return o && o.active !== false ? [{ id: num(o.id), name: String(o.name ?? "VIP"), days: num(o.days), price: num(o.priceInRupees) }] : [];
          }),
        ),
      )
      .catch(() => setPlans([]));
    api<unknown>("/api/v1/manual-topup/royal")
      .then((raw) => {
        const o = (raw ?? {}) as Record<string, unknown>;
        setRoyal({ enabled: o.enabled === true, name: String(o.name ?? "Royal Pack"), priceInr: num(o.priceInr), coins: num(o.coins) });
      })
      .catch(() => setRoyal(null));
  }, []);

  if (error && !packs) return <p className="text-sm">The price list couldn&apos;t load right now. Please refresh the page, or see prices inside the app.</p>;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-2xl font-bold text-cream">Coin packs</h2>
        <p className="mt-1 text-sm">Coins are used inside the app to send gifts and red packets. One-time purchase, delivered to your account.</p>
        <ul className="mt-3 space-y-2">
          {!packs ? <li className="text-sm">Loading prices…</li> : null}
          {packs?.map((p) => {
            const src = walletImageSrc(p.imageUrl);
            return (
              <Card
                key={p.id}
                // eslint-disable-next-line @next/next/no-img-element
                img={src ? <img src={src} alt={`${p.coins.toLocaleString("en-IN")} coins`} className="h-14 w-14 object-contain" /> : <Coin className="h-10 w-10" />}
                title={`${p.coins.toLocaleString("en-IN")} coins`}
                sub={p.bonusCoins > 0 ? `+ ${p.bonusCoins.toLocaleString("en-IN")} bonus coins${p.name ? ` · ${p.name}` : ""}` : p.name || "Coin pack"}
                price={inr(p.priceInRupees)}
              />
            );
          })}
        </ul>
      </section>

      {plans && plans.length ? (
        <section>
          <h2 className="font-display text-2xl font-bold text-cream">VIP plans</h2>
          <p className="mt-1 text-sm">VIP frame, chat bubble, entry effect and badge, for the number of days shown. One-time purchase, no auto-renewal.</p>
          <ul className="mt-3 space-y-2">
            {plans.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <Card key={p.id} img={<img src="/effects/vip1/badge.png" alt="VIP badge" className="h-14 w-14 object-contain" />} title={p.name} sub={`${p.days} days of VIP`} price={inr(p.price)} />
            ))}
          </ul>
        </section>
      ) : null}

      {royal?.enabled ? (
        <section>
          <h2 className="font-display text-2xl font-bold text-cream">Special pack</h2>
          <ul className="mt-3 space-y-2">
            <Card
              // eslint-disable-next-line @next/next/no-img-element
              img={<img src="/frames/crown-name.png" alt="Royal frame" className="h-14 w-14 object-contain" />}
              title={royal.name}
              sub={`${royal.coins.toLocaleString("en-IN")} coins + royal frame with your name + royal titles`}
              price={inr(royal.priceInr)}
            />
          </ul>
        </section>
      ) : null}

      <p className="text-sm">
        All prices are in Indian Rupees (INR). Items are digital and are delivered to your {`Panchayat`} account inside the app. Coins and items have no cash
        value.
      </p>
    </div>
  );
}
