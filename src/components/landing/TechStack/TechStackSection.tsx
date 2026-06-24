"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { PLATFORM_TRUST } from "../data";

export function TechStackSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".tech-card", {
      opacity: 0, scale: 0.92, duration: 0.6, stagger: 0.08, ease: "power2.out",
      immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 92%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="tech"
      ref={sectionRef}
      aria-label="Enterprise-grade platform"
      className="relative overflow-hidden py-16 sm:py-20 px-4 sm:px-6"
      // Purple accent strip — inline gradient so the global dark-mode
      // `.bg-gradient-to-br` override can't flatten it.
      style={{ backgroundImage: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)" }}
    >
      {/* soft glows to give the flat band some depth */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-fuchsia-400/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-200 mb-3">Enterprise-Grade Platform</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Built to be trusted with
            <span className="bg-gradient-to-r from-cyan-200 to-fuchsia-200 bg-clip-text text-transparent"> your institution&apos;s data.</span>
          </h2>
        </div>

        {/* 12-col grid: row 1 = 4 cards (span 3), row 2 = 3 cards (span 4) → both rows fill the full width. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
          {PLATFORM_TRUST.map((t, i) => (
            <article key={t.title}
              className={`tech-card rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-5 shadow-sm transition-all hover:scale-[1.02] hover:bg-white/15 hover:border-white/30 cursor-default ${i < 4 ? "lg:col-span-3" : "lg:col-span-4"}`}>
              <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center mb-3.5">
                <t.Icon size={20} className="text-white" />
              </div>
              <h3 className="font-black text-sm text-white mb-1.5">{t.title}</h3>
              <p className="text-[12px] text-violet-100/80 leading-relaxed">{t.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
