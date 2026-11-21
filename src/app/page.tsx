import { HeroSection } from "@/components/home/hero";
import {
  SectionAgent,
  SectionArena,
  SectionCTA,
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
      <SectionMoment />
      <SectionAgent />
      <SectionIdentity />
      <SectionFlow />
      <SectionFeed />
      <SectionArena />
      <SectionCTA />
      <Footer />
    </main>
  );
}
