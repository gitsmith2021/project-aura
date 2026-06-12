"use client";

import { useRef } from "react";
import { ArrowRight, Activity } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "../SmoothScrollProvider";

// CSS-only floating particles — no Three.js below the hero.
const PARTICLES = [
  { size: 6,  left: "12%", top: "20%", cls: "float-orb-1" },
  { size: 10, left: "78%", top: "15%", cls: "float-orb-2" },
  { size: 4,  left: "30%", top: "70%", cls: "float-orb-3" },
  { size: 8,  left: "62%", top: "62%", cls: "float-orb-1" },
  { size: 5,  left: "88%", top: "48%", cls: "float-orb-3" },
  { size: 7,  left: "8%",  top: "55%", cls: "float-orb-2" },
  { size: 4,  left: "45%", top: "30%", cls: "float-orb-2" },
  { size: 9,  left: "22%", top: "85%", cls: "float-orb-1" },
];

export function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollToId } = useLenis();

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(".cta-bg",
      { clipPath: "circle(0% at 50% 50%)" },
      {
        clipPath: "circle(150% at 50% 50%)",
        duration: 1.2,
        ease: "power3.inOut",
        scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true },
      });
    gsap.from(".cta-content", {
      y: 40, opacity: 0, duration: 0.8, delay: 0.4, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="contact"
      ref={sectionRef}
      aria-label="Call to action"
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-violet-950 px-4 sm:px-6 py-24"
    >
      {/* clip-path-revealed gradient background — inline style so the global
          `.dark .bg-gradient-to-br` override can't flatten it. The section's
          violet-950 base keeps this purple even before the reveal plays. */}
      <div
        className="cta-bg absolute inset-0"
        style={{ backgroundImage: "linear-gradient(135deg, #6D28D9 0%, #581C87 55%, #4C1D95 100%)" }}
        aria-hidden="true"
      />

      {/* floating particles */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span key={i}
            className={`absolute rounded-full bg-white/20 ${p.cls}`}
            style={{ width: p.size, height: p.size, left: p.left, top: p.top }} />
        ))}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-fuchsia-400/15 rounded-full blur-3xl" />
      </div>

      <div className="cta-content relative z-10 max-w-3xl mx-auto text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300 mb-5">Get Started Today</p>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight text-white">
          Stop managing chaos.
          <br />
          Start running your institution.
        </h2>
        <p className="text-violet-200/80 mb-10 max-w-md mx-auto text-sm leading-relaxed">
          No 6-month implementation. No ₹50L consulting fees. One platform, every workflow, accreditation-ready from day one.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <button type="button" onClick={() => scrollToId("hero")}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-violet-50 text-violet-900 font-black rounded-xl transition-all hover:scale-105 shadow-xl shadow-black/25 text-base">
            Book Your Free Demo <ArrowRight size={18} />
          </button>
          <button type="button" onClick={() => scrollToId("pricing")}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent hover:bg-white/10 text-white font-semibold rounded-xl border-2 border-white/60 hover:border-white transition-all text-base">
            View Pricing
          </button>
        </div>

        <div className="mt-12 inline-flex flex-wrap justify-center items-center gap-2 px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-xs text-white/80 backdrop-blur-sm">
          <Activity size={12} />
          Questions, demos or custom requirements?
          <a href="mailto:hello@aura.edu" className="text-white font-semibold hover:text-white/80 hover:underline transition-colors">
            hello@aura.edu
          </a>
        </div>
      </div>
    </section>
  );
}
