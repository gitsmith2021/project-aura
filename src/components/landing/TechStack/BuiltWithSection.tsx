"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { TECH } from "../data";
import { BrandLogo } from "./brandLogos";

/**
 * "Built with" — the actual technology AURA Campus runs on, shown as a masonry
 * grid of brand-marked cards with a one-line role each. Sits just above the
 * final CTA: useful signal for technically literate decision-makers.
 */
export function BuiltWithSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".builtwith-card", {
      opacity: 0, y: 18, duration: 0.5, stagger: 0.07, ease: "power2.out",
      immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 92%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="built-with"
      ref={sectionRef}
      aria-label="Technology stack"
      className="py-16 sm:py-20 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/20 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">The Stack</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Built on a modern,
            <span className="bg-gradient-to-r from-violet-600 to-cyan-500 dark:from-violet-400 dark:to-cyan-400 bg-clip-text text-transparent"> open technology stack.</span>
          </h2>
        </div>

        {/* True masonry via CSS multi-column flow — varied sub-text lengths give
            the cards staggered heights. break-inside-avoid keeps each card whole. */}
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 sm:gap-5 [column-fill:_balance]">
          {TECH.map(t => (
            <article key={t.id}
              className={`builtwith-card mb-4 sm:mb-5 break-inside-avoid rounded-2xl border p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg cursor-default ${t.tint}`}>
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/70 dark:bg-white/5 border border-black/[0.04] dark:border-white/10 shadow-sm mb-3.5">
                <BrandLogo id={t.id} className={`w-6 h-6 ${t.logo}`} />
              </div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white mb-1.5 leading-snug">{t.name}</h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.sub}</p>
            </article>
          ))}
        </div>

        <p className="mt-9 text-center text-xs text-slate-400 dark:text-slate-500">
          Open stack, Cloud based Hosting — no proprietary lock-in.
        </p>
      </div>
    </section>
  );
}
