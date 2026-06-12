"use client";

import { useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { COMPARE } from "../data";

export function ComparisonSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".compare-head", {
      y: 40, opacity: 0, duration: 0.8, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 88%", once: true },
    });
    gsap.from(".compare-row", {
      y: 20, opacity: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", immediateRender: false,
      scrollTrigger: { trigger: ".compare-table", start: "top 92%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="why"
      ref={sectionRef}
      aria-label="Why choose AURA"
      className="py-24 sm:py-28 px-4 sm:px-6 bg-white dark:bg-slate-950 transition-colors duration-300"
    >
      <div className="max-w-5xl mx-auto">
        <div className="compare-head text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">The Difference</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">
            Not another legacy ERP.
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent">
              Something genuinely better.
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
            Traditional academic ERP systems were built for a world that no longer exists. AURA is built for today.
          </p>
        </div>

        {/* horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="compare-table min-w-[560px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none">
            <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="px-4 sm:px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Capability</div>
              <div className="px-4 sm:px-6 py-4 text-xs font-bold text-rose-400 dark:text-rose-400/80 uppercase tracking-wider text-center">Legacy ERP</div>
              <div className="px-4 sm:px-6 py-4 text-center bg-violet-50 dark:bg-violet-950/30">
                <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">AURA</span>
              </div>
            </div>
            {COMPARE.map(([cap, legacy, aura], i) => (
              <div key={cap}
                className={`compare-row grid grid-cols-3 border-b border-slate-100 dark:border-slate-800/50 last:border-none ${
                  i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50/60 dark:bg-slate-900/20"
                }`}>
                <div className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{cap}</div>
                <div className="px-4 sm:px-6 py-3.5 text-xs text-rose-500/80 dark:text-rose-400/70 text-center">{legacy}</div>
                <div className="px-4 sm:px-6 py-3.5 text-center bg-violet-50/50 dark:bg-violet-950/20">
                  <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                    <CheckCircle2 size={10} className="text-emerald-500 dark:text-emerald-400 shrink-0" />{aura}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
