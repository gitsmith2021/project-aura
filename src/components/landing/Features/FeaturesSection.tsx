"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { FEATURE_PANELS } from "../data";
import { FeaturePanel } from "./FeaturePanel";

/**
 * Signature section: panels laid out in a horizontal track, pinned while
 * vertical scroll scrubs the track leftward. On mobile / reduced motion the
 * track falls back to a plain vertical stack (no pin, no horizontal scroll).
 */
export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: "(min-width: 768px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      context => {
        const { isDesktop, reduceMotion } =
          context.conditions as { isDesktop: boolean; reduceMotion: boolean };
        if (!isDesktop || reduceMotion) return;

        const track = trackRef.current;
        if (!track) return;
        const panels = gsap.utils.toArray<HTMLElement>(".feature-panel", track);

        const tween = gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: () => "+=" + (panels.length - 1) * window.innerWidth,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // each panel's content brightens from 0.4 → 1 as it reaches center
        panels.slice(1).forEach(panel => {
          const inner = panel.querySelector(".panel-inner");
          if (!inner) return;
          gsap.fromTo(inner, { opacity: 0.4 }, {
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: panel,
              containerAnimation: tween,
              start: "left 70%",
              end: "left 25%",
              scrub: true,
            },
          });
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section
      id="features"
      ref={sectionRef}
      aria-label="Platform features"
      className="relative overflow-hidden bg-[#030712]"
    >
      <div ref={trackRef} className="flex flex-col md:flex-row md:w-max will-change-transform">
        {FEATURE_PANELS.map((feature, i) => (
          <FeaturePanel key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
