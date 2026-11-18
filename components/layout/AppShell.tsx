"use client";

import { ReferralCapture } from "@/components/rewards/ReferralCapture";
import { WelcomeGift } from "@/components/rewards/WelcomeGift";
import { DailyGift } from "@/components/rewards/DailyGift";
import { ParivarRedPacketPrompt } from "@/components/parivar/ParivarFamilyExtras";
import dynamic from "next/dynamic";
import { Activity, useEffect } from "react";
import { ReportHost } from "@/components/safety/Safety";
import { SarpanchBanner } from "@/components/sarpanch/SarpanchBanner";
import { RewardWon } from "@/components/market/RewardWon";
import { PaymentReturn } from "@/components/market/PaymentReturn";
import { AnimatePresence, motion } from "framer-motion";
import { AppProvider, useApp, type Screen } from "@/lib/app/store";
import { NativeBridge } from "@/components/system/NativeBridge";
import { BackNavigation } from "@/components/system/BackNavigation";
import { MarketProvider } from "@/lib/app/market-store";
import { ParivarProvider } from "@/lib/app/parivar-store";
import { RedPacketProvider } from "@/lib/app/redpacket-store";
import { MusicProvider } from "@/lib/app/music-store";
import { GiftNewsProvider } from "@/lib/app/gift-news-store";
import { MeProvider } from "@/lib/app/me-store";
import { ServerRoomsProvider } from "@/lib/app/server-rooms";
import { ChatProvider } from "@/lib/app/chat-store";
import { GiftBanner } from "@/components/gifts/GiftBanner";
import { RedPacketBanner } from "@/components/redpacket/RedPacket";
import { BottomNav } from "@/components/navigation/BottomNav";
import { PanchayatBackground } from "@/components/ui/PanchayatBackground";
import { HomeScreen } from "@/components/home/HomeScreen";
import { RoomsScreen } from "@/components/rooms/RoomsScreen";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { ConversationView } from "@/components/chat/ConversationView";
import { DiscoverScreen } from "@/components/discover/DiscoverScreen";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { MomentsScreen } from "@/components/social/MomentsScreen";
import { CpProposalPrompt } from "@/components/market/ServerCp";
import { AccountBans } from "@/components/safety/AccountBans";
import { VipLevelUpPrompt } from "@/components/vip/VipLevelUp";
import { VipRenewPrompt } from "@/components/vip/VipRenewPrompt";
import { GlobalSheets } from "@/components/sheets/GlobalSheets";
import { GiftOverlay } from "@/components/gifts/GiftOverlay";
import { AppUpdatePrompt } from "@/components/system/AppUpdatePrompt";
import { Toasts } from "@/components/ui/Toasts";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { FestivalBackground } from "@/components/festival/FestivalBackground";
import { FestivalPopup } from "@/components/festival/FestivalPopup";

/** The voice room (and the LiveKit voice library, about 560 KB) only downloads once someone joins a room, and is fetched quietly in the background a few seconds after the app opens. */
const loadRoomHost = () => import("@/components/rooms/ActiveRoomHost").then((m) => m.ActiveRoomHost);
const ActiveRoomHostLazy = dynamic(loadRoomHost, { ssr: false });
function ActiveRoomGate() {
  const { activeRoomId } = useApp();
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const t = window.setTimeout(() => (idle ? idle(() => void loadRoomHost(), { timeout: 8000 }) : void loadRoomHost()), 6000);
    return () => window.clearTimeout(t);
  }, []);
  return activeRoomId ? <ActiveRoomHostLazy /> : null;
}
const ReferScreen = dynamic(() => import("@/components/rewards/ReferScreen").then((m) => m.ReferScreen), { ssr: false });
const LudoScreen = dynamic(() => import("@/components/games/ludo/LudoScreen").then((m) => m.LudoScreen), { ssr: false });
const GamesHub = dynamic(() => import("@/components/games/GamesHub").then((m) => m.GamesHub), { ssr: false });
const HillScreen = dynamic(() => import("@/components/games/hill/HillScreen").then((m) => m.HillScreen), { ssr: false });
const RmcsScreen = dynamic(() => import("@/components/games/rmcs/RmcsScreen").then((m) => m.RmcsScreen), { ssr: false });
const GaddarScreen = dynamic(() => import("@/components/games/gaddar/GaddarScreen").then((m) => m.GaddarScreen), { ssr: false });
const NearbyScreen = dynamic(() => import("@/components/discover/NearbyScreen").then((m) => m.NearbyScreen), { ssr: false });
const ChessHub = dynamic(() => import("@/components/games/ChessHub").then((m) => m.ChessHub), { ssr: false });
const SarpanchScreen = dynamic(() => import("@/components/sarpanch/Sarpanch").then((m) => m.SarpanchScreen), { ssr: false });
const ParivarCreateScreen = dynamic(() => import("@/components/parivar/ParivarServer").then((m) => m.ParivarCreateScreen), { ssr: false });
const ParivarHome = dynamic(() => import("@/components/parivar/ParivarServer").then((m) => m.ParivarHome), { ssr: false });
const ParivarChatScreen = dynamic(() => import("@/components/parivar/ParivarServer").then((m) => m.ParivarChatScreen), { ssr: false });
const ParivarListScreen = dynamic(() => import("@/components/parivar/ParivarServer").then((m) => m.ParivarListScreen), { ssr: false });
const RankingScreen = dynamic(() => import("@/components/market/RankingScreen").then((m) => m.RankingScreen), { ssr: false });
const ShopScreen = dynamic(() => import("@/components/market/ShopScreen").then((m) => m.ShopScreen), { ssr: false });
const BagScreen = dynamic(() => import("@/components/market/BagScreen").then((m) => m.BagScreen), { ssr: false });
const LoveHome = dynamic(() => import("@/components/market/LoveHome").then((m) => m.LoveHome), { ssr: false });
const JackarooScreen = dynamic(() => import("@/components/games/jackaroo/JackarooScreen").then((m) => m.JackarooScreen), { ssr: false });
const IntimateSpace = dynamic(() => import("@/components/profile/IntimateSpace").then((m) => m.IntimateSpace), { ssr: false });
const GiftWallScreen = dynamic(() => import("@/components/profile/UserProfile").then((m) => m.GiftWallScreen), { ssr: false });
const GuardScreen = dynamic(() => import("@/components/profile/UserProfile").then((m) => m.GuardScreen), { ssr: false });
const UserProfileScreen = dynamic(() => import("@/components/profile/UserProfile").then((m) => m.UserProfileScreen), { ssr: false });
const UserRoomsScreen = dynamic(() => import("@/components/profile/UserProfile").then((m) => m.UserRoomsScreen), { ssr: false });
const StatsScreen = dynamic(() => import("@/components/profile/StatsScreen").then((m) => m.StatsScreen), { ssr: false });
const VisitorsScreen = dynamic(() => import("@/components/profile/VisitorsScreen").then((m) => m.VisitorsScreen), { ssr: false });
const ChessScreen = dynamic(() => import("@/components/games/ChessScreen").then((m) => m.ChessScreen), { ssr: false });
const CreateRoom = dynamic(() => import("@/components/rooms/CreateRoom").then((m) => m.CreateRoom), { ssr: false });
const VipEntry = dynamic(() => import("@/components/vip/VipEntry").then((m) => m.VipEntry), { ssr: false });
const VipBenefits = dynamic(() => import("@/components/vip/VipBenefits").then((m) => m.VipBenefits), { ssr: false });

/**
 * Desktop: a ~420px mobile app centered on a neutral backdrop with a soft shadow.
 * Phones: the app fills the screen edge to edge and respects safe-area insets.
 */
export function AppShell() {
  return (
    <AppProvider>
      <MeProvider>
      <ServerRoomsProvider>
      <ChatProvider>
      <MarketProvider>
        <ParivarProvider>
          <RedPacketProvider>
            <MusicProvider>
              <GiftNewsProvider>
                <NativeBridge />
                <BackNavigation />
                <Frame />
              </GiftNewsProvider>
            </MusicProvider>
          </RedPacketProvider>
        </ParivarProvider>
      </MarketProvider>
      </ChatProvider>
      </ServerRoomsProvider>
      </MeProvider>
    </AppProvider>
  );
}

function Frame() {
  const { activeRoomId, roomOpen, signedIn, setTab } = useApp();
  // Screens add this to their bottom padding so the mini player never covers content
  const mini = activeRoomId && !roomOpen ? "64px" : "0px";
  return (
    <>
      <div className="app-frame flex h-[100dvh] w-full justify-center overflow-clip bg-ink min-[480px]:bg-[radial-gradient(circle_at_50%_0%,#2a2a30,#18181b_70%)]">
        <div
          id="main"
          style={{ "--mini": mini } as React.CSSProperties}
          className="relative h-full w-full overflow-clip bg-ink min-[480px]:max-w-[420px] min-[480px]:shadow-[0_0_0_1px_rgb(255_255_255/0.04),0_30px_80px_-10px_rgb(0_0_0/0.75)]"
        >
          <FestivalBackground />
          {signedIn ? (
            <>
              <FestivalPopup onCta={() => setTab("rooms")} />
              {/* While a room fills the screen, the screens behind it stop drawing (React keeps their state and picks them up again after) */}
              <Activity mode={roomOpen && activeRoomId ? "hidden" : "visible"}>
                <Tabs />
              </Activity>
              <BottomNav />
              <Activity mode={roomOpen && activeRoomId ? "hidden" : "visible"}>
                <Stack />
              </Activity>
              <ActiveRoomGate />
              <GlobalSheets />
              <CpProposalPrompt />
              <VipLevelUpPrompt />
              <VipRenewPrompt />
              <SarpanchBanner />
              <WelcomeGift />
              <DailyGift />
              <ParivarRedPacketPrompt />
              <ReportHost />
              <ReferralCapture />
              <PaymentReturn />
              <GiftOverlay />
              <RedPacketBanner />
              <GiftBanner />
              <AccountBans />
              <RewardWon />
              <AppUpdatePrompt />
            </>
          ) : signedIn === false ? (
            <AuthFlow />
          ) : null}
          <Toasts />
        </div>
      </div>
    </>
  );
}

function Tabs() {
  const { tab } = useApp();
  return (
    <>
    <PanchayatBackground variant={tab} />
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tab}
        className="absolute inset-0 z-[1]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {tab === "home" ? <HomeScreen /> : tab === "rooms" ? <RoomsScreen /> : tab === "chat" ? <ChatScreen /> : tab === "discover" ? <DiscoverScreen /> : <ProfileScreen />}
      </motion.div>
    </AnimatePresence>
    </>
  );
}

function screenKey(s: Screen, i: number) {
  return `${i}-${s.kind}-${"roomId" in s ? s.roomId : "personId" in s ? s.personId : ""}`;
}

function Stack() {
  const { stack } = useApp();
  return (
    <AnimatePresence initial={false}>
      {stack.map((s, i) => (
        <motion.section
          key={screenKey(s, i)}
          className="absolute inset-0 z-40 bg-ink"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 360, damping: 40 }}
        >
          <ScreenView screen={s} />
        </motion.section>
      ))}
    </AnimatePresence>
  );
}

function ScreenView({ screen }: { screen: Screen }) {
  switch (screen.kind) {
    case "vip-entry":
      return <VipEntry roomId={screen.roomId} />;
    case "vip-benefits":
      return <VipBenefits />;
    case "create-room":
      return <CreateRoom />;
    case "conversation":
      return <ConversationView personId={screen.personId} />;
    case "intimate-space":
      return <IntimateSpace personId={screen.personId} />;
    case "user-profile":
      return <UserProfileScreen personId={screen.personId} />;
    case "guard":
      return <GuardScreen personId={screen.personId} />;
    case "user-rooms":
      return <UserRoomsScreen personId={screen.personId} />;
    case "gift-wall":
      return <GiftWallScreen personId={screen.personId} />;
    case "stats":
      return <StatsScreen personId={screen.personId} />;
    case "ranking":
      return <RankingScreen />;
    case "shop":
      return <ShopScreen initialTab={screen.tab} initialPay={screen.pay} />;
    case "bag":
      return <BagScreen />;
    case "love-home":
      return <LoveHome personId={screen.personId} />;
    case "visitors":
      return <VisitorsScreen />;
    case "parivar-list":
      return <ParivarListScreen />;
    case "parivar-create":
      return <ParivarCreateScreen />;
    case "parivar":
      return <ParivarHome id={screen.id} />;
    case "parivar-chat":
      return <ParivarChatScreen id={screen.id} />;
    case "chess":
      return <ChessHub />;
    case "moments":
      return <MomentsScreen personId={screen.personId} />;
    case "jackaroo":
      return <JackarooScreen roomId={screen.roomId} />;
    case "sarpanch":
      return <SarpanchScreen />;
    case "nearby":
      return <NearbyScreen />;
    case "ludo":
      return <LudoScreen roomId={screen.roomId} />;
    case "games":
      return <GamesHub />;
    case "hill":
      return <HillScreen />;
    case "rmcs":
      return <RmcsScreen roomId={screen.roomId} table={screen.table} />;
    case "gaddar":
      return <GaddarScreen roomId={screen.roomId} table={screen.table} />;
    case "refer":
      return <ReferScreen />;
  }
}
