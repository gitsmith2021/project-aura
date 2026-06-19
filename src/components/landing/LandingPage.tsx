"use client";

import { SmoothScrollProvider } from "./SmoothScrollProvider";
import { Navbar } from "./Navbar";
import { HeroSection } from "./Hero/HeroSection";
import { StatsSection } from "./Stats/StatsSection";
import { TimetableSpotlight } from "./Spotlight/TimetableSpotlight";
import { FeaturesSection } from "./Features/FeaturesSection";
import { AccreditationSection } from "./Accreditation/AccreditationSection";
import { ComparisonSection } from "./Comparison/ComparisonSection";
import { RolesSection } from "./Roles/RolesSection";
import { InstitutionTypesSection } from "./Institutions/InstitutionTypesSection";
import { PricingSection } from "./Pricing/PricingSection";
import { TechStackSection } from "./TechStack/TechStackSection";
import { BuiltWithSection } from "./TechStack/BuiltWithSection";
import { CTASection } from "./CTA/CTASection";
import { Footer } from "./Footer";

export function LandingPage() {
  // No theme toggle — the page uses a fixed light/dark rhythm. The hero and the
  // top of the page are light; two sections deeper are wrapped in `.dark` to
  // create deliberate visual breaks while scrolling (see <main> below).
  return (
    <SmoothScrollProvider>
      <div>
        <style>{`
          @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-track { animation: marquee 40s linear infinite; }
          .marquee-track:hover { animation-play-state: paused; }

          @keyframes floatOrb {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33%       { transform: translate(15px, -20px) scale(1.08); }
            66%       { transform: translate(-10px, 15px) scale(0.94); }
          }
          .float-orb-1 { animation: floatOrb 10s ease-in-out infinite; }
          .float-orb-2 { animation: floatOrb 14s ease-in-out infinite reverse; }
          .float-orb-3 { animation: floatOrb 8s ease-in-out infinite 3s; }

          @keyframes waPulse {
            0%   { box-shadow: 0 0 0 0 rgba(22,163,74,0.65); }
            70%  { box-shadow: 0 0 0 14px rgba(22,163,74,0); }
            100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
          }
          @media (prefers-reduced-motion: no-preference) {
            .wa-pulse { animation: waPulse 2.2s ease-in-out infinite; }
          }
          @media (prefers-reduced-motion: reduce) {
            .marquee-track,
            .float-orb-1, .float-orb-2, .float-orb-3 { animation: none; }
          }
        `}</style>

        <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
          <Navbar />
          <main>
            {/* Storytelling flow: Hero → Trust → AI Timetable → Accreditation →
                Why Switch → Roles (every stakeholder) → Core Features →
                Institution Types → Pricing → Tech Stack → Final CTA.

                Fixed light/dark rhythm (no toggle): light intro, a dark band,
                light again, then a dark close-out — each `.dark` wrapper flips
                the section's built-in dark variants for a clean visual break. */}

            {/* ── Light: the introduction ── */}
            <HeroSection />
            <StatsSection />
            <TimetableSpotlight />
            <AccreditationSection />

            {/* ── Dark band: the pitch ── */}
            <div className="dark bg-slate-950 text-white">
              <ComparisonSection />
              <RolesSection />
              <FeaturesSection />
            </div>

            {/* ── Light: who it's for & pricing ── */}
            <InstitutionTypesSection />
            <PricingSection />

            {/* ── Dark close-out: tech + final CTA ── */}
            <div className="dark bg-slate-950 text-white">
              <TechStackSection />
              <BuiltWithSection />
              <CTASection />
            </div>
          </main>
          <div className="dark bg-slate-950 text-white">
            <Footer />
          </div>
        </div>
      </div>
    </SmoothScrollProvider>
  );
}
