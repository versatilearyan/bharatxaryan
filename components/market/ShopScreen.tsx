"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Backpack, RefreshCw } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Coin, ScreenHeader, formatCoins } from "@/components/ui/kit";
import { RedPacketArt } from "@/components/redpacket/RedPacket";
import { RED_PACKETS, formatInr, packetById, type RedPacketId } from "@/lib/app/redpacket";
import { CheckoutSheet } from "./CheckoutSheet";
import { ShopProductAsset } from "./ShopProductAsset";
import { useRedPackets } from "@/lib/app/redpacket-store";
import { useApp, type ShopTab } from "@/lib/app/store";
import { ApiError } from "@/lib/api/client";
import { getShopCategories, getShopProduct, getShopProducts, type ShopCategory, type ShopProduct } from "@/lib/api/shop";

const RARITY_TINT: Record<string, string> = { common: "#aaa6b0", rare: "#7fdcff", epic: "#b48bff", legendary: "#e7bc72" };
const rarityTint = (r?: string) => (r ? RARITY_TINT[r.toLowerCase()] : undefined) ?? "#aaa6b0";

/** "all", "packets", or "cat:<category id>". */
type TabKey = string;
const ALL = "all";
const PACKETS = "packets";
const catKey = (id: string) => `cat:${id}`;

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Try again.");

type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; data: T };

/**
 * The shop: products and categories come from the backend (lib/api/shop.ts),
 * and red packets are bought in rupees at checkout. Product prices are shown
 * in coins; buying them waits for a backend purchase endpoint.
 */
export function ShopScreen({ initialTab, initialPay }: { initialTab?: ShopTab; initialPay?: RedPacketId }) {
  const { pop, push, coins, setSheet, toast } = useApp();
  const { addPaid, owned } = useRedPackets();
  const [categories, setCategories] = useState<Load<ShopCategory[]>>({ status: "loading" });
  const [tab, setTab] = useState<TabKey | null>(initialTab === "packets" ? PACKETS : null);
  /** Products per tab, so going back to a tab shows it at once. */
  const [products, setProducts] = useState<Record<TabKey, Load<ShopProduct[]>>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  /** The red packet being paid for in rupees. */
  const [paying, setPaying] = useState<RedPacketId | null>(initialPay ?? null);
  const payFor = paying ? packetById(paying) : null;
  // Only the newest request for each tab may write its answer.
  const latest = useRef<Record<TabKey, number>>({});
  const seq = useRef(0);

  const loadCategories = useCallback(() => {
    setCategories({ status: "loading" });
    getShopCategories().then(
      (data) => setCategories({ status: "ok", data }),
      (e) => setCategories({ status: "error", message: errorText(e) }),
    );
  }, []);
  useEffect(loadCategories, [loadCategories]);

  // Once categories arrive, pick the first tab, or the one a link asked for (rings, bubbles).
  useEffect(() => {
    if (categories.status !== "ok" || tab) return;
    const want = initialTab === "rings" ? /ring/i : initialTab === "bubbles" ? /bubble/i : null;
    const match = want && categories.data.find((c) => want.test(c.name));
    setTab(match ? catKey(match.id) : ALL);
  }, [categories, tab, initialTab]);

  const loadProducts = useCallback((key: TabKey) => {
    const id = ++seq.current;
    latest.current[key] = id;
    setProducts((p) => ({ ...p, [key]: { status: "loading" } }));
    getShopProducts(key === ALL ? undefined : key.slice(4)).then(
      (data) => latest.current[key] === id && setProducts((p) => ({ ...p, [key]: { status: "ok", data } })),
      (e) => latest.current[key] === id && setProducts((p) => ({ ...p, [key]: { status: "error", message: errorText(e) } })),
    );
  }, []);

  useEffect(() => {
    if (tab && tab !== PACKETS && !products[tab]) loadProducts(tab);
  }, [tab, products, loadProducts]);

  const tabs: { key: TabKey; label: string }[] =
    categories.status === "ok" ? [{ key: ALL, label: "All" }, ...categories.data.map((c) => ({ key: catKey(c.id), label: c.name })), { key: PACKETS, label: "Red packets" }] : [];
  const current = tab && tab !== PACKETS ? products[tab] : undefined;
  const buy = (p: ShopProduct) => toast(`Buying ${p.name} isn't open yet. It will work once the shop's purchase service is live.`);

  return (
    <div className="app-scroll h-full bg-ink pb-8">
      <ScreenHeader
        title="Shop"
        onBack={pop}
        right={
          <button type="button" onClick={() => push({ kind: "bag" })} className="flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-[12.5px] font-bold text-cream ring-1 ring-line">
            <Backpack className="h-4 w-4" aria-hidden /> Bag
          </button>
        }
      />
      <button type="button" onClick={() => setSheet({ kind: "coins" })} className="mx-4 flex w-[calc(100%-2rem)] items-center gap-2 rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-line">
        <Coin className="h-5 w-5" />
        <span className="font-display text-[17px] font-bold text-cream">{formatCoins(coins)}</span>
        <span className="ml-auto text-[12px] font-semibold text-gold">Add coins</span>
      </button>

      {categories.status === "loading" ? (
        <div className="mx-4 mt-3 flex gap-1 rounded-full bg-surface p-1 ring-1 ring-line" aria-busy="true" aria-label="Loading shop">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-9 flex-1 animate-pulse rounded-full bg-cream/5" />
          ))}
        </div>
      ) : (
        <div className="no-scrollbar mx-4 mt-3 flex gap-0.5 overflow-x-auto rounded-full bg-surface p-1 ring-1 ring-line" role="tablist">
          {(tabs.length ? tabs : [{ key: PACKETS, label: "Red packets" }]).map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`h-9 min-w-fit flex-1 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-bold ${tab === t.key ? "bg-coral text-white" : "text-cream/65"}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {categories.status === "error" && tab !== PACKETS ? (
        <ErrorBox message={categories.message} onRetry={loadCategories} />
      ) : tab === PACKETS ? (
        <>
          <p className="mx-4 mt-3 text-[12px] text-muted">Buy red packets with UPI, card or net banking. They wait in your Bag: in any room, tap the red packet button to send one, pick a cover and when the rain starts.</p>
          <div className="mt-3 grid grid-cols-3 gap-2.5 px-4">
            {RED_PACKETS.map((p) => (
              <div key={p.id} className="flex flex-col items-center rounded-3xl bg-surface p-2.5 ring-1 ring-line">
                <RedPacketArt id={p.id} size={52} />
                <span className="mt-1 text-center text-[12px] font-bold leading-tight text-cream">{p.name}</span>
                <span className="text-[10.5px] text-muted">In Bag: {owned[p.id] ?? 0}</span>
                <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-cream/80">
                  <Coin className="h-3 w-3" /> {p.amount.toLocaleString("en-IN")}
                </span>
                <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setPaying(p.id)} aria-label={`Buy ${p.label} red packet for ${formatInr(p.inr)}`} className="mt-2 flex h-8 w-full items-center justify-center rounded-full bg-gold text-[12.5px] font-bold text-ink">
                  {formatInr(p.inr)}
                </motion.button>
              </div>
            ))}
          </div>
        </>
      ) : categories.status === "ok" && categories.data.length === 0 ? (
        <Empty text="The shop has nothing on its shelves yet. Check back soon." />
      ) : !current || current.status === "loading" ? (
        <div className="mt-3 grid grid-cols-2 gap-3 px-4" aria-busy="true" aria-label="Loading products">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-3xl bg-surface p-3 ring-1 ring-line">
              <span className="h-3 w-12 animate-pulse rounded-full bg-cream/5" />
              <span className="aspect-square w-full animate-pulse rounded-2xl bg-cream/5" />
              <span className="h-4 w-20 animate-pulse rounded-full bg-cream/5" />
              <span className="h-9 w-full animate-pulse rounded-full bg-cream/5" />
            </div>
          ))}
        </div>
      ) : current.status === "error" ? (
        <ErrorBox message={current.message} onRetry={() => tab && loadProducts(tab)} />
      ) : current.data.length === 0 ? (
        <Empty text="Nothing in this category yet." />
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 px-4">
          {current.data.map((p) => (
            <div key={p.id} className="flex flex-col items-center rounded-3xl bg-surface p-3 ring-1 ring-line">
              <button type="button" onClick={() => setOpenId(p.id)} className="flex w-full flex-col items-center" aria-label={`See ${p.name}`}>
                {p.rarity ? (
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: rarityTint(p.rarity) }}>
                    {p.rarity}
                  </span>
                ) : (
                  <span className="h-[15px]" />
                )}
                <ShopProductAsset key={p.assetUrl ?? "none"} url={p.assetUrl} type={p.assetType} name={p.name} className="my-1 max-w-[108px]" />
                <span className="line-clamp-1 font-display text-[15px] font-bold text-cream">{p.name}</span>
                {p.description && <span className="line-clamp-2 text-center text-[11px] text-muted">{p.description}</span>}
              </button>
              <PriceButton product={p} onBuy={buy} />
            </div>
          ))}
        </div>
      )}

      <ProductSheet id={openId} preview={current?.status === "ok" ? current.data.find((p) => p.id === openId) : undefined} onClose={() => setOpenId(null)} onBuy={buy} />

      <CheckoutSheet
        item={payFor ? { id: payFor.id, name: `${payFor.label} ${payFor.name}`, note: `${payFor.amount.toLocaleString("en-IN")} coins for the room to loot`, art: <RedPacketArt id={payFor.id} size={52} />, inr: payFor.inr } : null}
        onClose={() => setPaying(null)}
        onPaid={(id) => addPaid(id as RedPacketId)}
        onViewBag={() => push({ kind: "bag" })}
      />
    </div>
  );
}

function PriceButton({ product, onBuy, big }: { product: ShopProduct; onBuy: (p: ShopProduct) => void; big?: boolean }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => onBuy(product)} aria-label={product.price === undefined ? `${product.name}: price not set` : `Buy ${product.name} for ${product.price} coins`} className={`mt-auto flex w-full items-center justify-center gap-1 rounded-full bg-gold font-bold text-ink ${big ? "h-11 text-[14px]" : "mt-2 h-9 text-[13px]"}`}>
      {product.price === undefined ? (
        "Price not set"
      ) : (
        <>
          <Coin className="h-4 w-4" /> {product.price.toLocaleString("en-IN")}
        </>
      )}
    </motion.button>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-4 mt-4 flex flex-col items-center rounded-3xl bg-surface px-4 py-6 text-center ring-1 ring-line" role="alert">
      <p className="text-[13px] font-semibold text-cream">Couldn&apos;t load the shop</p>
      <p className="mt-1 text-[12px] text-muted">{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 flex h-9 items-center gap-1.5 rounded-full bg-gold px-4 text-[13px] font-bold text-ink">
        <RefreshCw className="h-4 w-4" aria-hidden /> Retry
      </button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mx-4 mt-6 rounded-3xl bg-surface px-4 py-8 text-center text-[13px] text-muted ring-1 ring-line">{text}</p>;
}

/** One product, fetched fresh from GET /shop/products/{id}. Shows the list's copy while that loads. */
function ProductSheet({ id, preview, onClose, onBuy }: { id: string | null; preview?: ShopProduct; onClose: () => void; onBuy: (p: ShopProduct) => void }) {
  const [state, setState] = useState<Load<ShopProduct | null>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!id) return;
    let stale = false;
    setState({ status: "loading" });
    getShopProduct(id).then(
      (data) => !stale && setState({ status: "ok", data }),
      (e) => !stale && setState({ status: "error", message: errorText(e) }),
    );
    return () => {
      stale = true;
    };
  }, [id, attempt]);

  const p = state.status === "ok" && state.data ? state.data : preview;
  return (
    <BottomSheet open={!!id} onClose={onClose} title={p?.name ?? "Product"}>
      {state.status === "ok" && !state.data ? (
        <p className="py-6 text-center text-[13px] text-muted">This product isn&apos;t available any more.</p>
      ) : !p ? (
        state.status === "error" ? (
          <div className="py-4 text-center">
            <p className="text-[12px] text-muted">{state.message}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 h-9 rounded-full bg-gold px-4 text-[13px] font-bold text-ink">
              Retry
            </button>
          </div>
        ) : (
          <div className="mx-auto my-6 h-40 w-40 animate-pulse rounded-3xl bg-cream/5" aria-busy="true" />
        )
      ) : (
        <div className="flex flex-col items-center pb-2">
          <ShopProductAsset key={p.assetUrl ?? "none"} url={p.assetUrl} type={p.assetType} name={p.name} className="max-w-[200px]" />
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold">
            {p.rarity && (
              <span className="rounded-full bg-black/30 px-2.5 py-1 uppercase tracking-[0.12em]" style={{ color: rarityTint(p.rarity) }}>
                {p.rarity}
              </span>
            )}
            {p.categoryName && <span className="rounded-full bg-black/30 px-2.5 py-1 text-cream/70">{p.categoryName}</span>}
          </div>
          {p.description && <p className="mt-3 text-center text-[13px] leading-relaxed text-cream/80">{p.description}</p>}
          {state.status === "error" && <p className="mt-2 text-center text-[11px] text-muted">Showing saved details. {state.message}</p>}
          <div className="mt-4 w-full">
            <PriceButton product={p} onBuy={onBuy} big />
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
