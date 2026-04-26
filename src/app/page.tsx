/**
 * @file page.tsx
 * @description The high-conversion, premium landing page for AiProctor.
 *              Built with a clinical-luxury aesthetic, featuring staggered reveals,
 *              modern typography (Outfit/Inter), and modular construction.
 */

import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { TrustMetrics } from "@/components/landing/TrustMetrics";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)] selection:bg-[var(--color-rausch)] selection:text-white overflow-x-hidden">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-rausch)] focus:text-white focus:rounded-md"
      >
        Skip to content
      </a>
      
      <LandingHeader />
      
      <article id="main-content">
        <Hero />
        <TrustMetrics />
        <FeatureHighlights />
        <CTASection />
      </article>

      <Footer />
    </main>
  );
}
