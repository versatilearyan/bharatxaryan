"use client";

import { BagIcon, RankingIcon, ShopIcon, VisitorsIcon } from "@/components/art/ProfileIcons";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, Crown, Eye, FileText, Info, MessageCircle, Pencil, RotateCcw, RotateCw, LogOut, Shield, Smartphone, Volume2 } from "lucide-react";
import { setNotifyPrefs, useNotifyPrefs, notify as ping } from "@/lib/app/notify";
import { getPrivacy, setShowOnline } from "@/lib/api/chat";
import { GameArt } from "@/components/art/GameArt";
import { Modal } from "@/components/ui/Modal";
import { FollowCounts, ProfileHero, UserProfileBody } from "@/components/profile/UserProfile";
import { myUserIdFromToken } from "@/lib/auth/token";
import { Button, Coin, Toggle, formatCoins } from "@/components/ui/kit";
import { gameById } from "@/lib/app/data";
import { formatPoints, vipLevel } from "@/lib/app/levels";
import { useMarket } from "@/lib/app/market-store";
import { ME_ID, useApp } from "@/lib/app/store";
import { useVisitorStats } from "./ServerVisitors";
import { useMe } from "@/lib/app/me-store";

export function ProfileScreen() {
  const { profile, coins, setSheet, push, toast, resetDemo, signOut, session, vip: appVip } = useApp();
  const myServerId = session ? myUserIdFromToken() : null;
  const [notify, setNotify] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const alerts = useNotifyPrefs();
  const [showOnline, setShowOnlineState] = useState<boolean | null>(null);
  useEffect(() => {
    let off = false;
    getPrivacy()
      .then((p) => !off && setShowOnlineState(p.showOnline))
      .catch(() => !off && setShowOnlineState(true));
    return () => {
      off = true;
    };
  }, []);
  const market = useMarket();
  // Signed in: the server's visitor numbers
  const srvVisits = useVisitorStats();
  const visitors = srvVisits ? { length: srvVisits.visitors } : market.visitors;
  const newVisitors = srvVisits ? srvVisits.newCount : market.newVisitors;
  const me = useMe();
  // Fresh profile and stats each time the tab opens (skipped if loaded in the last 30 s)
  const { refresh } = me;
  useEffect(() => refresh(), [refresh]);
  const loadError = me.profile.error || me.stats.error;
  const loading = me.profile.loading || me.stats.loading;
  // VIP points come from the server; the level is read off the app's VIP thresholds
  // Growth only counts while you're VIP; the server's vipPoints are growth points (1 per 100 coins)
  const serverVip = me.stats.data ? vipLevel(me.stats.data.vipPoints, appVip.level > 0 || me.stats.data.vipPoints > 0) : null;

  return (
    <div className="app-scroll h-full bg-[radial-gradient(130%_60%_at_50%_35%,#3a1424_0%,#221220_45%,#141018_100%)] pb-[calc(84px+var(--mini,0px)+env(safe-area-inset-bottom))]">
      <ProfileHero
        personId="me"
        topRight={
          <button type="button" onClick={() => setSheet({ kind: "edit-profile" })} className="flex h-9 items-center gap-1.5 rounded-full bg-black/40 px-3.5 text-[12.5px] font-bold text-cream backdrop-blur">
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit profile
          </button>
        }
      />
      {loadError ? (
        <div role="alert" className="mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-[#ff8a8f]/10 px-4 py-3 ring-1 ring-[#ff8a8f]/30">
          <p className="flex-1 text-[12.5px] font-semibold text-[#ff8a8f]">{loadError}</p>
          <button type="button" onClick={() => refresh(true)} disabled={loading} className="flex items-center gap-1 rounded-full bg-cream/[0.08] px-3 py-1.5 text-[12px] font-bold text-cream disabled:opacity-50">
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden /> {loading ? "Loading…" : "Retry"}
          </button>
        </div>
      ) : null}
      {!loadError && me.profile.data?.profileCompleted === false ? (
        <button type="button" onClick={() => setSheet({ kind: "edit-profile" })} className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-gold/10 px-4 py-3 text-left ring-1 ring-gold/30">
          <span className="flex-1 text-[12.5px] font-semibold text-cream">Your profile isn&apos;t complete yet. Add your details so people can find you.</span>
          <span className="shrink-0 rounded-full bg-gold/20 px-3 py-1.5 text-[12px] font-bold text-cream">Complete</span>
        </button>
      ) : null}

      {/* Visitors, Shop, Bag and Ranking */}
      <div className="mx-4 mt-4 grid grid-cols-4 gap-2.5">
        {(
          [
            ["Visitors", <VisitorsIcon key="v" />, { kind: "visitors" }],
            ["Shop", <ShopIcon key="s" />, { kind: "shop" }],
            ["Bag", <BagIcon key="b" />, { kind: "bag" }],
            ["Ranking", <RankingIcon key="r" />, { kind: "ranking" }],
          ] as const
        ).map(([label, icon, screen]) => (
          <button key={label} type="button" onClick={() => push(screen)} className="relative flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br from-[#2c1622]/95 to-[#1b1622]/95 py-3 ring-1 ring-gold/15">
            <span className="grid h-9 place-items-center" aria-hidden>
              {icon}
            </span>
            <span className="text-[12.5px] font-bold text-cream">{label === "Visitors" && visitors.length ? `${label} ${visitors.length}` : label}</span>
            {label === "Visitors" && newVisitors > 0 ? (
              <span className="absolute -right-1 -top-1.5 rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-extrabold text-white ring-2 ring-ink">+{newVisitors} new</span>
            ) : null}
          </button>
        ))}
      </div>


      <UserProfileBody personId="me" />

      {/* Wallet + VIP */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setSheet({ kind: "coins" })} className="rounded-2xl bg-gradient-to-br from-[#2c1622]/95 to-[#1b1622]/95 p-4 text-left ring-1 ring-gold/15">
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <Coin className="h-4 w-4" /> Coins
          </span>
          <span className="mt-1 block font-display text-[22px] font-extrabold text-cream">{formatCoins(coins)}</span>
          <span className="text-[11px] font-semibold text-gold">Open wallet</span>
        </button>
        <button type="button" onClick={() => push({ kind: "vip-benefits" })} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5a1a28] to-[#1a0b11] p-4 text-left ring-1 ring-gold/40">
          <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <span className="relative flex items-center gap-1.5 text-[11.5px] text-gold">
            <Crown className="h-4 w-4" /> VIP status
          </span>
          {serverVip ? (
            <>
              <span className="relative mt-1 block font-display text-[18px] font-extrabold text-foil">{serverVip.level ? `VIP ${serverVip.level}` : "Not VIP yet"}</span>
              <span className="relative mt-1.5 block h-1.5 overflow-hidden rounded-full bg-cream/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-[#f6d899] to-[#c9954a]" style={{ width: `${Math.round(serverVip.progress * 100)}%` }} />
              </span>
              <span className="relative mt-1 block text-[10.5px] font-semibold text-cream/70">{serverVip.next ? `${formatPoints(serverVip.points)} / ${formatPoints(serverVip.next)} pts` : `${formatPoints(serverVip.points)} pts`}</span>
            </>
          ) : (
            <span className="relative mt-1 block font-display text-[18px] font-extrabold text-foil/70">{me.stats.loading ? "…" : "—"}</span>
          )}
        </button>
      </div>


      {/* Favorite games */}
      <section className="mt-6 px-4" aria-labelledby="fav-h">
        <h2 id="fav-h" className="font-display text-[17px] font-bold text-cream">
          Favorite games
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.favoriteGames.map((id) => {
            const g = gameById(id);
            if (!g) return null;
            return (
              <button key={id} type="button" onClick={() => setSheet({ kind: "game", gameId: id })} className="flex items-center gap-2 rounded-full bg-[#2c1622]/90 py-1 pl-1 pr-3.5 ring-1 ring-gold/15">
                <span className="h-7 w-7 overflow-hidden rounded-full">
                  <GameArt id={id} />
                </span>
                <span className="text-[13px] font-semibold text-cream">{g.name}</span>
              </button>
            );
          })}
          {profile.favoriteGames.length === 0 ? <p className="text-[13px] text-muted">Pick some in Edit profile.</p> : null}
        </div>
      </section>


      {/* Settings */}
      <section className="mx-4 mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#2c1622]/95 to-[#1b1622]/95 ring-1 ring-gold/15" aria-label="Settings">
        {session ? <Row icon={<span className="text-[17px] leading-none">🧧</span>} label="Refer & earn 20,000 coins" onClick={() => push({ kind: "refer" })} /> : null}
        <Row icon={<Pencil className="h-4.5 w-4.5" />} label="Edit profile" onClick={() => setSheet({ kind: "edit-profile" })} />
        <Row icon={<Bell className="h-4.5 w-4.5" />} label="Notifications" right={<Toggle checked={notify} onChange={(v) => (setNotify(v), toast(v ? "Notifications on" : "Notifications off"))} label="Notifications" />} />
        <Row icon={<Volume2 className="h-4.5 w-4.5" />} label="Room sounds" right={<Toggle checked={sounds} onChange={setSounds} label="Room sounds" />} />
        <Row
          icon={<MessageCircle className="h-4.5 w-4.5" />}
          label="Message sound"
          right={<Toggle checked={alerts.sound} onChange={(v) => { setNotifyPrefs({ sound: v }); if (v) ping("alert"); toast(v ? "Message sound on" : "Message sound off"); }} label="Message sound" />}
        />
        <Row
          icon={<Smartphone className="h-4.5 w-4.5" />}
          label="Vibration"
          right={<Toggle checked={alerts.vibrate} onChange={(v) => { setNotifyPrefs({ vibrate: v }); if (v) ping("alert"); toast(v ? "Vibration on" : "Vibration off"); }} label="Vibration" />}
        />
        <Row
          icon={<Eye className="h-4.5 w-4.5" />}
          label="Show my online status"
          right={
            <Toggle
              checked={showOnline ?? true}
              onChange={(v) => {
                const was = showOnline;
                setShowOnlineState(v);
                setShowOnline(v)
                  .then((p) => { setShowOnlineState(p.showOnline); toast(p.showOnline ? "People can see when you're online" : "Your online status is hidden"); })
                  .catch(() => { setShowOnlineState(was); toast("Couldn't change that. Try again."); });
              }}
              label="Show my online status"
            />
          }
        />
        <LinkRow href="/about" icon={<Info className="h-4.5 w-4.5" />} label="About Panchayat" />
        <LinkRow href="/privacy" icon={<Shield className="h-4.5 w-4.5" />} label="Privacy" />
        <LinkRow href="/terms" icon={<FileText className="h-4.5 w-4.5" />} label="Terms" />
        <Row icon={<RotateCcw className="h-4.5 w-4.5" />} label="Reset demo data" danger onClick={() => setConfirmReset(true)} />
        <Row icon={<LogOut className="h-4.5 w-4.5" />} label="Log out" danger onClick={signOut} />
      </section>
      <p className="px-6 pt-4 text-center text-[11px] text-muted/70">{session ? `Signed in with ${{ google: "Google", apple: "Apple", email: "email" }[session.method]} as ${session.email}.` : ""}</p>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo data?">
        <p className="text-sm text-muted">This restores the sample profile, coins and chats, and removes rooms you created on this device.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="soft" className="flex-1" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              resetDemo();
              setConfirmReset(false);
            }}
          >
            Reset
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ icon, label, onClick, right, danger }: { icon: React.ReactNode; label: string; onClick?: () => void; right?: React.ReactNode; danger?: boolean }) {
  const content = (
    <>
      <span className={`grid h-8 w-8 place-items-center rounded-xl ${danger ? "bg-[#3a1418] text-[#ff8a8f]" : "bg-cream/[0.07] text-cream/85"}`}>{icon}</span>
      <span className={`flex-1 text-[14px] font-medium ${danger ? "text-[#ff8a8f]" : "text-cream"}`}>{label}</span>
      {right ?? <ChevronRight className="h-4 w-4 text-muted" aria-hidden />}
    </>
  );
  const cls = "flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:bg-cream/[0.03]`}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}

function LinkRow({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 hover:bg-cream/[0.03]">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-cream/[0.07] text-cream/85">{icon}</span>
      <span className="flex-1 text-[14px] font-medium text-cream">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
    </Link>
  );
}
