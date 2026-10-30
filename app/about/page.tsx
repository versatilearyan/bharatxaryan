import { Navbar } from "@/components/sections/Navbar";
import { HeroSection } from "@/components/sections/HeroSection";
import { ComingSoonSection } from "@/components/sections/ComingSoonSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { WaitlistSection } from "@/components/sections/WaitlistSection";
import { Footer } from "@/components/sections/Footer";
import { MusicToggle } from "@/components/MusicToggle";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main">
        <HeroSection />
        <FeaturesSection />
        <ComingSoonSection />
        <WaitlistSection />
      </main>
      <Footer />
      <MusicToggle />
    </>
  );
}
