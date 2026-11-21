import { HeroSection } from "@/components/home/hero";
import { SectionBoard, SectionCTA, SectionFeatures, SectionFeed, SectionIdentity, SectionTimeline } from "@/components/home/sections";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <SectionBoard />
      <SectionTimeline />
      <SectionFeatures />
      <SectionIdentity />
      <SectionFeed />
      <SectionCTA />
      <Footer />
    </main>
  );
}
