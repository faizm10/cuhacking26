import { Navbar } from "@/components/layout/Navbar";
import { CTASection } from "@/components/landing/CTASection";
import { DemoSection } from "@/components/landing/DemoSection";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { LandingDivider } from "@/components/landing/LandingDivider";
import { MarqueeTicker } from "@/components/landing/MarqueeTicker";

export default function LandingPage() {
  return (
    <div className="min-h-full bg-landing-bg">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <LandingDivider />
        <MarqueeTicker />
        <DemoSection />
        <LandingDivider />
        <FeatureSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
