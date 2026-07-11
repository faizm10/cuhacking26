import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { MarqueeTicker } from "@/components/landing/MarqueeTicker";
import { DemoSection } from "@/components/landing/DemoSection";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-full bg-landing-bg">
      <Navbar />
      <main className="flex-1">
        <Hero />
        {/* <MarqueeTicker /> */}
        <DemoSection />
        <FeatureSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
