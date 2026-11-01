"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AppProvider, useApp, type Screen } from "@/lib/app/store";
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
import { ParivarCreateScreen, ParivarHome, ParivarListScreen } from "@/components/parivar/ParivarScreens";
import { RankingScreen } from "@/components/market/RankingScreen";
import { ShopScreen } from "@/components/market/ShopScreen";
import { BagScreen } from "@/components/market/BagScreen";
import { LoveHome } from "@/components/market/LoveHome";
import { BottomNav } from "@/components/navigation/BottomNav";
import { HomeScreen } from "@/components/home/HomeScreen";
import { RoomsScreen } from "@/components/rooms/RoomsScreen";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { ConversationView } from "@/components/chat/ConversationView";
import { DiscoverScreen } from "@/components/discover/DiscoverScreen";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { IntimateSpace } from "@/components/profile/IntimateSpace";
import { GiftWallScreen, GuardScreen, UserProfileScreen, UserRoomsScreen } from "@/components/profile/UserProfile";
import { StatsScreen } from "@/components/profile/StatsScreen";
import { VisitorsScreen } from "@/components/profile/VisitorsScreen";
import { ChessScreen } from "@/components/games/ChessScreen";
import { ActiveRoomHost } from "@/components/rooms/ActiveRoomHost";
import { CreateRoom } from "@/components/rooms/CreateRoom";
import { VipEntry } from "@/components/vip/VipEntry";
import { VipBenefits } from "@/components/vip/VipBenefits";
import { GlobalSheets } from "@/components/sheets/GlobalSheets";
import { GiftOverlay } from "@/components/gifts/GiftOverlay";
import { Toasts } from "@/components/ui/Toasts";
import { AuthFlow } from "@/components/auth/AuthFlow";

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
  const { activeRoomId, roomOpen, signedIn } = useApp();
  // Screens add this to their bottom padding so the mini player never covers content
  const mini = activeRoomId && !roomOpen ? "64px" : "0px";
  return (
    <>
      <div className="flex h-[100dvh] w-full justify-center overflow-hidden bg-ink min-[480px]:bg-[radial-gradient(circle_at_50%_0%,#2a2a30,#18181b_70%)]">
        <div
          id="main"
          style={{ "--mini": mini } as React.CSSProperties}
          className="relative h-full w-full overflow-hidden bg-ink min-[480px]:max-w-[420px] min-[480px]:shadow-[0_0_0_1px_rgb(255_255_255/0.04),0_30px_80px_-10px_rgb(0_0_0/0.75)]"
        >
          {signedIn ? (
            <>
              <Tabs />
              <BottomNav />
              <Stack />
              <ActiveRoomHost />
              <GlobalSheets />
              <GiftOverlay />
              <RedPacketBanner />
              <GiftBanner />
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
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tab}
        className="absolute inset-0"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {tab === "home" ? <HomeScreen /> : tab === "rooms" ? <RoomsScreen /> : tab === "chat" ? <ChatScreen /> : tab === "discover" ? <DiscoverScreen /> : <ProfileScreen />}
      </motion.div>
    </AnimatePresence>
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
    case "chess":
      return <ChessScreen />;
  }
}
