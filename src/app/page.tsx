import { HeroSection } from "@/components/home/hero";
import {
  LiveTicker,
  SectionArena,
  SectionCTA,
  SectionDesk,
  SectionFeed,
  SectionFlow,
  SectionIdentity,
  SectionMoment,
} from "@/components/home/sections";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <LiveTicker />
      <SectionMoment />
      <SectionDesk />
      <SectionIdentity />
      <SectionFlow />
      <SectionFeed />
      <SectionArena />
      <SectionCTA />
      <Footer />
    </main>
  );
}
