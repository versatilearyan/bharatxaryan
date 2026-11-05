"use client";

import { VipBadge } from "@/components/effects/VipFx";
import { nameTone } from "@/lib/app/fonts";
import { useMarket } from "@/lib/app/market-store";
import { RoomCover } from "@/components/rooms/RoomCover";
import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Copy, DoorOpen, Gift, Hash, MessageCircle, Radio, SearchX, Sparkles, UserCheck, UserPlus } from "lucide-react";
import { GameArt } from "@/components/art/GameArt";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CharmBadge } from "@/components/ui/CharmBadge";
import { TagStrip, TagTitleChip } from "@/components/rooms/TagParts";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Button, Coin, DemoNote, formatCount } from "@/components/ui/kit";
import { EditProfileSheet } from "@/components/profile/EditProfileSheet";
import { RedPacketArt, RedPacketShop } from "@/components/redpacket/RedPacket";
import { CheckoutSheet, type CheckoutItem } from "@/components/market/CheckoutSheet";
import { WalletImage } from "@/components/redpacket/RedPacket";
import { useWalletCatalog } from "@/lib/app/use-wallet";
import { walletImageSrc } from "@/lib/api/wallet";
import { checkRoomPassword } from "@/lib/api/voice-rooms";
import { formatInr } from "@/lib/app/redpacket";
import { CATEGORIES, PEOPLE, TASKS, gameById } from "@/lib/app/data";
import { RoomTypeBadge } from "@/components/rooms/RoomCards";
import { ME_ID, useApp } from "@/lib/app/store";
import { usePeople } from "@/lib/app/people";
import { serverRoomAppId, toAppRoom, useServerRooms, userPersonId } from "@/lib/app/server-rooms";
import { searchServer, type FoundUser } from "@/lib/api/search";
import type { VoiceRoom } from "@/lib/api/voice-rooms";
import { myUserIdFromToken } from "@/lib/auth/token";
import type { GameId } from "@/lib/app/types";
import { EXP_SOURCES, GAME_WIN_EXP } from "@/lib/app/progress";
import { LevelPill } from "@/components/profile/IdTags";
import { FriendsPanel } from "@/components/social/FriendsPanel";
import { useJoinGameByCode } from "@/components/social/Invites";
import { ServerTasks } from "./ServerTasks";
import { looksLikeGameCode } from "@/lib/api/invites";

/** App-level bottom sheets opened from Home, Discover, Profile and rooms. */
export function GlobalSheets() {
  const { sheet, setSheet } = useApp();
  const close = () => setSheet(null);
  return (
    <>
      <PersonSheet personId={sheet?.kind === "person" ? sheet.personId : null} onClose={close} />
      <NotificationsSheet open={sheet?.kind === "notifications"} onClose={close} />
      <TasksSheet open={sheet?.kind === "tasks"} onClose={close} />
      <FriendsSheet open={sheet?.kind === "friends"} onClose={close} tab={sheet?.kind === "friends" ? sheet.tab : undefined} />
      <CoinsSheet open={sheet?.kind === "coins"} onClose={close} />
      <GameSheet gameId={sheet?.kind === "game" ? sheet.gameId : null} onClose={close} />
      <EditProfileSheet open={sheet?.kind === "edit-profile"} onClose={close} />
      <FindUserSheet open={sheet?.kind === "find-user"} onClose={close} />
      <JoinRoomSheet open={sheet?.kind === "join-room"} onClose={close} />
      <RoomPasswordSheet roomId={sheet?.kind === "room-password" ? sheet.roomId : null} onClose={close} />
    </>
  );
}

function PersonSheet({ personId, onClose }: { personId: string | null; onClose: () => void }) {
  const { profile, toggleFollow, openConversation, rooms, openRoom, openIntimateSpace } = useApp();
  const p = PEOPLE.find((x) => x.id === personId);
  const fxOf = useMarket().effectsFor;
  const hosting = rooms.find((r) => r.hostId === personId);
  return (
    <BottomSheet open={Boolean(p)} onClose={onClose}>
      {p ? (
        <div className="px-5 pb-6 pt-2 text-center">
          <div className="flex justify-center">
            <PersonAvatar person={p} size={88} />
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5">
            <span className={`font-display text-[22px] font-extrabold ${nameTone(p.vip)}`}>{p.name}</span>
            {fxOf(p.id, p.vip).badge ? <VipBadge set={fxOf(p.id, p.vip).badge!} level={p.vip} size={24} animated /> : null}
          </p>
          <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[12px] text-muted">
            <LevelPill level={p.level} gender={p.gender} size="sm" />
            <CharmBadge personId={p.id} />
            {p.handle}
            {p.city ? ` · ${p.city}` : ""}
          </p>
          <CopyId id={p.uid} label="User ID" />
          <div className="mt-2">
            <TagTitleChip personId={p.id} />
          </div>
          <p className="mt-3 text-[14px] text-cream/85">{p.bio}</p>
          <div className="mt-3 flex justify-center gap-2">
            {p.tags.map((t) => (
              <span key={t} className="rounded-full bg-cream/[0.07] px-2.5 py-1 text-[11px] text-cream/80">
                {t}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted">{formatCount(p.followers)} followers</p>
          <TagStrip
            personId={p.id}
            onOpen={() => {
              onClose();
              openIntimateSpace(p.id);
            }}
          />
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant={profile.following.includes(p.id) ? "soft" : "primary"} onClick={() => toggleFollow(p.id)}>
              <UserPlus className="h-4 w-4" /> {profile.following.includes(p.id) ? "Following" : "Follow"}
            </Button>
            <Button variant="soft" onClick={() => openConversation(p.id)}>
              <MessageCircle className="h-4 w-4" /> Message
            </Button>
          </div>
          {hosting ? (
            <button type="button" onClick={() => openRoom(hosting.id)} className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-coral/10 px-4 py-3 text-left ring-1 ring-coral/30">
              <Radio className="h-4 w-4 text-coral" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[13px] text-cream">
                Hosting <span className="font-bold">{hosting.name}</span>
              </span>
              <span className="text-[12px] font-bold text-pink">Join</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  );
}

function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notices, markNoticesRead } = useApp();
  const icon = { gift: Gift, room: Radio, friend: UserPlus, system: Sparkles };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Notifications"
      headerRight={
        <button type="button" onClick={markNoticesRead} className="text-[12px] font-semibold text-gold">
          Mark all read
        </button>
      }
    >
      <ul className="pb-4">
        {notices.map((n) => {
          const Icon = icon[n.kind];
          return (
            <li key={n.id} className="flex items-start gap-3 px-5 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream/[0.07] text-gold">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[14px] ${n.read ? "text-cream/80" : "font-semibold text-cream"}`}>{n.title}</span>
                <span className="block text-[12px] text-muted">{n.body}</span>
              </span>
              <span className="flex flex-col items-end gap-1.5">
                <span className="text-[11px] text-muted">{n.at}</span>
                {!n.read ? <span className="h-2 w-2 rounded-full bg-coral" aria-label="Unread" /> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center justify-center gap-1.5 px-5 pb-5 text-[11px] text-muted">
        <Bell className="h-3 w-3" aria-hidden /> Sample notifications for this preview
      </p>
    </BottomSheet>
  );
}

function TasksSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { claimed, claimTask, session } = useApp();
  if (session)
    return (
      <BottomSheet open={open} onClose={onClose} title="Daily tasks">
        <ServerTasks open={open} />
      </BottomSheet>
    );
  return (
    <BottomSheet open={open} onClose={onClose} title="Daily tasks">
      <ul className="space-y-2 px-5 pb-4">
        {TASKS.map((t) => {
          const done = t.progress >= t.goal;
          const got = claimed.includes(t.id);
          return (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-cream">{t.title}</span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream/10">
                    <span className="block h-full rounded-full bg-gradient-to-r from-coral to-gold" style={{ width: `${(Math.min(t.progress, t.goal) / t.goal) * 100}%` }} />
                  </span>
                  <span className="text-[11px] text-muted">
                    {Math.min(t.progress, t.goal)}/{t.goal}
                  </span>
                </span>
              </span>
              <button
                type="button"
                disabled={!done || got}
                onClick={() => claimTask(t.id, t.reward)}
                className={`flex h-9 min-w-[76px] items-center justify-center gap-1 rounded-full px-3 text-[12px] font-bold ${got ? "bg-cream/10 text-muted" : done ? "bg-gold text-ink" : "bg-cream/[0.06] text-cream/60"}`}
              >
                {got ? (
                  "Claimed"
                ) : (
                  <>
                    <Coin className="h-3.5 w-3.5" />+{t.reward}
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <DemoNote className="mx-5 mb-5">Task rewards are demo coins for trying out the app.</DemoNote>
    </BottomSheet>
  );
}

function FriendsSheet({ open, onClose, tab }: { open: boolean; onClose: () => void; tab?: "friends" | "following" | "followers" }) {
  const { profile, rooms, openRoom, openConversation, setSheet, session } = useApp();
  const friends = PEOPLE.filter((p) => profile.following.includes(p.id));
  // Signed in: friends, following, followers and activity come from the server
  if (session)
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Friends"
        tall
        headerRight={
          <button type="button" onClick={() => setSheet({ kind: "find-user" })} className="flex items-center gap-1 rounded-full bg-coral/15 px-3 py-1.5 text-[12px] font-bold text-pink">
            <UserPlus className="h-3.5 w-3.5" /> Add by ID
          </button>
        }
      >
        {open ? <FriendsPanel key={tab ?? "friends"} onClose={onClose} initialTab={tab} /> : null}
      </BottomSheet>
    );
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Friends · ${friends.length}`}
      tall
      headerRight={
        <button type="button" onClick={() => setSheet({ kind: "find-user" })} className="flex items-center gap-1 rounded-full bg-coral/15 px-3 py-1.5 text-[12px] font-bold text-pink">
          <UserPlus className="h-3.5 w-3.5" /> Add by ID
        </button>
      }
    >
      {friends.length === 0 ? (
        <div className="px-5 pb-8 pt-4 text-center">
          <p className="text-sm text-muted">You aren&apos;t following anyone yet.</p>
          <Button className="mt-4" onClick={() => setSheet({ kind: "find-user" })}>
            <UserPlus className="h-4 w-4" /> Add a friend by user ID
          </Button>
        </div>
      ) : (
        <ul className="pb-4">
          {friends.map((p) => {
            const inRoom = rooms.find((r) => r.seated.includes(p.id) && r.live);
            return (
              <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="relative">
                  <PersonAvatar person={p} size={46} />
                  {p.online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-speak ring-2 ring-ink-2" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-cream">{p.name}</span>
                  <span className="block truncate text-[11.5px] text-muted">{inRoom ? `In ${inRoom.name}` : p.online ? "Online" : "Offline"}</span>
                </span>
                {inRoom ? (
                  <button type="button" onClick={() => openRoom(inRoom.id)} className="h-8 rounded-full bg-coral px-3.5 text-[12px] font-bold text-white">
                    Join
                  </button>
                ) : null}
                <button type="button" onClick={() => openConversation(p.id)} className="grid h-8 w-8 place-items-center rounded-full bg-cream/[0.08] text-cream" aria-label={`Message ${p.name}`}>
                  <MessageCircle className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </BottomSheet>
  );
}

function CoinsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { coins, toast } = useApp();
  const { coinPacks, redPackets, inventory, signedIn } = useWalletCatalog(open);
  const packs = coinPacks.data ?? [];
  // Buying goes through the backend and PayU (CheckoutSheet); nothing is credited here
  const [checkout, setCheckout] = useState<CheckoutItem | null>(null);
  const needSignIn = () => toast("Sign in to buy coins and red packets.");
  const buyPack = (p: (typeof packs)[number]) => {
    if (!signedIn) return needSignIn();
    const img = walletImageSrc(p.imageUrl);
    setCheckout({
      id: `pack-${p.id}`,
      name: `${p.coins.toLocaleString("en-IN")} coins`,
      note: p.bonusCoins > 0 ? `Includes ${p.bonusCoins.toLocaleString("en-IN")} bonus coins` : p.name || "Coin pack",
      art: img ? <WalletImage src={img} alt="" className="h-12 w-12 object-contain" fallback={<Coin className="h-11 w-11" />} /> : <Coin className="h-11 w-11" />,
      inr: p.priceInRupees,
      tone: "gold",
      purchase: { purpose: "COIN_PACK", productId: p.id },
    });
  };
  const buyPacket = (p: NonNullable<typeof redPackets.data>[number]) => {
    if (!signedIn) return needSignIn();
    setCheckout({
      id: `packet-${p.id}`,
      name: p.name,
      note: `${p.coinValue.toLocaleString("en-IN")} coins for the room to loot`,
      art: <WalletImage src={walletImageSrc(p.imageUrl)} alt="" className="h-12 w-12 object-contain" fallback={<RedPacketArt id="rp-10k" cover="red" size={44} label={false} />} />,
      inr: p.priceInRupees,
      purchase: { purpose: "RED_PACKET", productId: p.id, ownedBefore: inventory.data ? (inventory.data[p.id] ?? 0) : undefined },
    });
  };
  return (
    <>
    <BottomSheet open={open} onClose={onClose} title="Wallet" tall>
      <div className="px-5 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4a3214] via-[#2a1a0c] to-[#1a1008] p-5 ring-1 ring-gold/40">
          <span className="foil-shimmer animate-shimmer pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <p className="relative text-[12px] text-gold/80">Coin balance</p>
          <p className="relative mt-1 flex items-center gap-2 font-display text-[34px] font-extrabold text-cream">
            <Coin className="h-8 w-8" /> {coins.toLocaleString("en-IN")}
          </p>
          <p className="relative mt-1 text-[11.5px] text-cream/60">Send gifts, red packets and more in any room</p>
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Recharge coins</p>
        {coinPacks.error ? (
          <WalletError message={coinPacks.error} onRetry={coinPacks.retry} />
        ) : coinPacks.loading ? (
          <div className="mt-2 grid grid-cols-2 gap-2" aria-busy="true" aria-label="Loading coin packs">
            {[0, 1, 2, 3].map((k) => (
              <span key={k} className="h-[104px] animate-pulse rounded-2xl bg-surface ring-1 ring-line" />
            ))}
          </div>
        ) : !packs.length ? (
          <p className="mt-2 rounded-2xl bg-surface px-4 py-6 text-center text-[12.5px] text-muted ring-1 ring-line">No coin packs are on sale right now. Check back soon.</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {packs.map((p, i) => {
              const wide = i === packs.length - 1 && packs.length % 2 === 1;
              const bonusText = p.bonusPercentage > 0 ? `+${p.bonusPercentage}% more coins` : p.bonusCoins > 0 ? `+${p.bonusCoins.toLocaleString("en-IN")} bonus coins` : p.name;
              const img = walletImageSrc(p.imageUrl);
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => buyPack(p)}
                  aria-label={`${p.coins.toLocaleString("en-IN")} coins for ${formatInr(p.priceInRupees)}`}
                  className={`relative flex flex-col items-center gap-1 rounded-2xl bg-surface px-2 pb-2.5 pt-3.5 ring-1 hover:ring-gold/50 ${p.badge ? "ring-gold/50" : "ring-line"} ${wide ? "col-span-2" : ""}`}
                >
                  {p.badge ? <span className="absolute -top-2 rounded-full bg-gold px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-ink">{p.badge}</span> : null}
                  {img ? <WalletImage src={img} alt="" className="h-9 w-9 object-contain" fallback={null} /> : null}
                  <span className="flex items-center gap-1.5 font-display text-[18px] font-extrabold text-cream">
                    <Coin className="h-5 w-5" /> {p.coins.toLocaleString("en-IN")}
                  </span>
                  {bonusText ? <span className={`max-w-full truncate text-[10.5px] font-semibold ${p.bonusPercentage > 0 || p.bonusCoins > 0 ? "text-speak" : "text-muted"}`}>{bonusText}</span> : null}
                  <span className="mt-1 flex h-8 w-full max-w-[160px] items-center justify-center rounded-full bg-gold text-[13px] font-bold text-ink">{formatInr(p.priceInRupees)}</span>
                </motion.button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted">Prices include GST. You pay on PayU&apos;s secure page; coins arrive once Panchayat confirms the payment.</p>
        <RedPacketShop products={redPackets} inventory={inventory} signedIn={signedIn} onBuy={buyPacket} />
      </div>
    </BottomSheet>
    <CheckoutSheet item={checkout} onClose={() => setCheckout(null)} />
    </>
  );
}

/** A failed wallet list: a safe message and Retry. */
export function WalletError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mt-2 flex items-center gap-3 rounded-2xl bg-[#3a1418] px-3.5 py-3 text-[12.5px] text-[#ffb0b4] ring-1 ring-coral/25">
      <span className="min-w-0 flex-1">{message}</span>
      <button type="button" onClick={onRetry} className="shrink-0 rounded-full bg-coral/20 px-3 py-1.5 text-[12px] font-bold text-[#ffd0d3]">
        Retry
      </button>
    </div>
  );
}

function GameSheet({ gameId, onClose }: { gameId: GameId | null; onClose: () => void }) {
  const { expToday, push } = useApp();
  const g = gameId ? gameById(gameId) : undefined;

  return (
    <BottomSheet open={Boolean(g)} onClose={onClose}>
      {g ? (
        <div className="px-5 pb-6 pt-1">
          <div className="relative overflow-hidden rounded-3xl ring-1 ring-line">
            <div className="aspect-[16/9]">
              <GameArt id={g.id} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
            <p className="absolute bottom-3 left-4 font-display text-[26px] font-extrabold uppercase text-white">{g.name}</p>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-cream/85">{g.blurb}</p>
          <p className="mt-2 flex items-center gap-3 text-[12px] text-muted">
            <span>{g.players}</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-speak" />
              {g.soon ? "Coming soon" : `${formatCount(g.online)} playing`}
            </span>
          </p>
          {g.soon ? (
            <>
              <Button size="lg" className="mt-5 w-full" disabled>
                Coming soon
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted">We&apos;re building {g.name}. It will be playable in an update soon.</p>
            </>
          ) : g.id === "chess" ? (
            <>
              <Button
                size="lg"
                variant="gold"
                className="mt-5 w-full"
                onClick={() => {
                  onClose();
                  push({ kind: "chess" });
                }}
              >
                Play chess
              </Button>
              <p className="mt-1.5 text-center text-[11px] text-muted">Watch live chess rooms, join the queue, or play a quick match.</p>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant="gold"
                className="mt-5 w-full"
                onClick={() => {
                  onClose();
                  push({ kind: "jackaroo" });
                }}
              >
                Play with friends
              </Button>
              <p className="mt-1.5 text-center text-[11px] text-muted">
                Real multiplayer board game. Share the game code with friends. Wins earn {GAME_WIN_EXP} EXP · today {expToday("game")}/{EXP_SOURCES.game.cap}
              </p>
            </>
          )}
        </div>
      ) : null}
    </BottomSheet>
  );
}

function CopyId({ id, label }: { id: string; label: string }) {
  const { toast } = useApp();
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(id).catch(() => {});
        toast(`${label} ${id} copied`);
      }}
      className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-cream/[0.07] px-2.5 py-1 text-[11.5px] font-semibold text-cream/80"
    >
      {label} {id} <Copy className="h-3 w-3" aria-hidden />
    </button>
  );
}

/** The search field shared by the "find people" and "join room" sheets: a 7-digit ID or a name. */
function CodeField({ value, onChange, onSubmit, label, placeholder }: { value: string; onChange: (v: string) => void; onSubmit: () => void; label: string; placeholder: string }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex gap-2"
    >
      <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 focus-within:border-gold/50">
        <Hash className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 40))}
          enterKeyHint="search"
          aria-label={label}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent font-display text-[17px] font-bold tracking-[0.12em] text-cream placeholder:font-sans placeholder:text-[14px] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted/70 focus:outline-none"
        />
      </label>
      <Button type="submit" disabled={value.trim().length < 2}>
        Search
      </Button>
    </form>
  );
}

/** Server search (GET /api/v1/search): a 7-digit ID finds that person and that room; text searches names. */
function useIdSearch() {
  const [state, setState] = useState<{ q: string; loading: boolean; error: string | null; users: FoundUser[]; rooms: VoiceRoom[] } | null>(null);
  const run = (q: string) => {
    const term = q.trim();
    if (!term) return;
    setState({ q: term, loading: true, error: null, users: [], rooms: [] });
    searchServer(term)
      .then((r) => setState({ q: term, loading: false, error: null, ...r }))
      .catch((e) => setState({ q: term, loading: false, error: e instanceof Error && e.message ? e.message : "Search didn't work. Try again.", users: [], rooms: [] }));
  };
  return { state, run, reset: () => setState(null) };
}

function FindUserSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { push, openConversation } = useApp();
  const { rememberPeople } = useServerRooms();
  const person = usePeople();
  const myId = myUserIdFromToken();
  const [q, setQ] = useState("");
  const search = useIdSearch();
  const found = search.state?.users ?? [];
  const close = () => {
    onClose();
    setQ("");
    search.reset();
  };
  const remember = (u: FoundUser) => rememberPeople({ [userPersonId(u.id)]: { name: u.name, avatarUrl: u.avatarUrl } });
  const openProfile = (u: FoundUser) => {
    // Their name and picture show straight away; the profile loads the rest
    remember(u);
    close();
    push({ kind: "user-profile", personId: userPersonId(u.id) });
  };
  return (
    <BottomSheet open={open} onClose={close} title="Find people">
      <div className="px-5 pb-6">
        <p className="mb-3 text-[12.5px] text-muted">Search by someone&apos;s 7-digit ID (it&apos;s on their profile) or by name.</p>
        <CodeField value={q} onChange={setQ} onSubmit={() => search.run(q)} label="User ID or name" placeholder="e.g. 6372289" />
        <div className="mt-4 space-y-2" aria-live="polite">
          {search.state?.loading ? (
            <p className="py-4 text-center text-[13px] text-muted">Searching…</p>
          ) : search.state?.error ? (
            <p className="rounded-2xl bg-coral/10 p-3 text-center text-[13px] text-coral">{search.state.error}</p>
          ) : found.length ? (
            found.map((u) => {
              const me = u.id === myId;
              return (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                  <PersonAvatar person={{ ...person(userPersonId(u.id)), photo: u.avatarUrl, frame: "none" }} size={48} />
                  <button type="button" onClick={() => !me && openProfile(u)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[15px] font-bold text-cream">{u.name}</span>
                    <span className="block truncate text-[11.5px] text-muted">
                      ID {u.publicId}
                      {u.vipLevel ? ` · VIP ${u.vipLevel}` : ""}
                      {me ? " · That's you" : ""}
                    </span>
                  </button>
                  {!me ? (
                    <>
                      <button type="button" onClick={() => openProfile(u)} aria-label={`Open ${u.name}'s profile`} className="grid h-9 w-9 place-items-center rounded-full bg-coral text-white">
                        <UserPlus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          remember(u);
                          close();
                          openConversation(userPersonId(u.id));
                        }}
                        aria-label={`Message ${u.name}`}
                        className="grid h-9 w-9 place-items-center rounded-full bg-cream/[0.08] text-cream"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })
          ) : search.state ? (
            <p className="flex flex-col items-center gap-2 rounded-2xl bg-cream/[0.05] p-4 text-center text-[13px] text-muted">
              <SearchX className="h-6 w-6" aria-hidden />
              No one found for “{search.state.q}”. Check the ID and try again.
            </p>
          ) : null}
        </div>
        <p className="mt-4 text-center text-[11.5px] text-muted">
          Your ID is <span className="font-bold text-cream">{person(ME_ID).uid}</span>
        </p>
      </div>
    </BottomSheet>
  );
}

function JoinRoomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { openRoom } = useApp();
  const joinGame = useJoinGameByCode();
  const { addCreated, myId } = useServerRooms();
  const [q, setQ] = useState("");
  const search = useIdSearch();
  const found = search.state?.rooms ?? [];
  const close = () => {
    onClose();
    setQ("");
    search.reset();
  };
  const join = (v: VoiceRoom) => {
    // Keep it in your list (a private or quiet room may not be in the public one), then go in
    addCreated(v);
    close();
    openRoom(serverRoomAppId(v.id));
  };
  return (
    <BottomSheet open={open} onClose={close} title="Join by room ID">
      <div className="px-5 pb-6">
        <p className="mb-3 text-[12.5px] text-muted">Every room has a 7-digit ID under its name. Enter it (or the room&apos;s name) to jump straight in.</p>
        <CodeField
          value={q}
          onChange={setQ}
          onSubmit={() => {
            // A 6-character game code (letters and digits) opens that game table
            if (looksLikeGameCode(q)) void joinGame(q).then((ok) => ok && close());
            else search.run(q);
          }}
          label="Room ID, name or game code"
          placeholder="e.g. 8782798 or K7QX2P"
        />
        <div className="mt-4 space-y-2" aria-live="polite">
          {search.state?.loading ? (
            <p className="py-4 text-center text-[13px] text-muted">Searching…</p>
          ) : search.state?.error ? (
            <p className="rounded-2xl bg-coral/10 p-3 text-center text-[13px] text-coral">{search.state.error}</p>
          ) : found.length ? (
            found.map((v) => {
              const room = toAppRoom(v, myId);
              return (
                <div key={v.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                    <RoomCover room={room} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-cream">{room.name}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted">
                      <RoomTypeBadge type={room.type} /> ID {room.code}
                    </span>
                  </span>
                  <Button onClick={() => join(v)}>
                    <DoorOpen className="h-4 w-4" /> Join
                  </Button>
                </div>
              );
            })
          ) : search.state ? (
            <p className="flex flex-col items-center gap-2 rounded-2xl bg-cream/[0.05] p-4 text-center text-[13px] text-muted">
              <SearchX className="h-6 w-6" aria-hidden />
              No live room found for “{search.state.q}”. It may have closed, or the number is wrong.
            </p>
          ) : null}
        </div>
      </div>
    </BottomSheet>
  );
}

function RoomPasswordSheet({ roomId, onClose }: { roomId: string | null; onClose: () => void }) {
  const { roomById, unlockRoom, enterRoom, toast } = useApp();
  const room = roomId ? roomById(roomId) : undefined;
  const [pw, setPw] = useState("");
  const [wrong, setWrong] = useState(false);
  const [checking, setChecking] = useState(false);
  const submit = () => {
    if (!room || checking) return;
    // Backend rooms: the server checks it (and remembers it for joining the call)
    if (room.server) {
      const serverId = room.server.id;
      setChecking(true);
      checkRoomPassword(serverId, pw)
        .then((ok) => {
          if (ok) {
            unlockRoom(room.id);
            setWrong(false);
            enterRoom(room.id);
          } else setWrong(true);
          setPw("");
        })
        .catch((e) => toast(e instanceof Error && e.message ? e.message : "Couldn't check the password. Try again.", "error"))
        .finally(() => setChecking(false));
      return;
    }
    if (pw === room.password) {
      unlockRoom(room.id);
      setPw("");
      setWrong(false);
      enterRoom(room.id);
    } else {
      setWrong(true);
      setPw("");
    }
  };
  return (
    <BottomSheet
      open={Boolean(room)}
      onClose={() => {
        setPw("");
        setWrong(false);
        onClose();
      }}
      title="This room is locked"
    >
      {room ? (
        <form
          className="px-5 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <p className="text-[13px] text-muted">
            <span className="font-semibold text-cream">{room.name}</span> needs a 4-digit password from the owner.
          </p>
          <input
            value={pw}
            onChange={(e) => {
              setPw(e.target.value.replace(/\D/g, "").slice(0, 4));
              setWrong(false);
            }}
            inputMode="numeric"
            autoFocus
            aria-label="Room password"
            placeholder="••••"
            className={`mt-3 h-14 w-full rounded-2xl border bg-surface text-center font-display text-[26px] font-extrabold tracking-[0.5em] text-cream focus:outline-none ${wrong ? "border-coral" : "border-line focus:border-gold/50"}`}
          />
          {wrong ? <p className="mt-2 text-[12.5px] font-semibold text-pink">Wrong password. Try again.</p> : null}
          <Button type="submit" className="mt-3 w-full" disabled={pw.length !== 4}>
            Enter room
          </Button>
          {room?.server ? null : <p className="mt-3 text-center text-[11px] text-muted">Demo password for sample rooms: 2580</p>}
        </form>
      ) : null}
    </BottomSheet>
  );
}
