"use client";

import { useRef } from "react";
import { ArrowRight, X, Check } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { TRANSFORMATIONS } from "../data";

export function ComparisonSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".compare-head", {
      y: 40, opacity: 0, duration: 0.8, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 88%", once: true },
    });
    gsap.from(".compare-row", {
      y: 24, opacity: 0, duration: 0.55, stagger: 0.09, ease: "power2.out", immediateRender: false,
      scrollTrigger: { trigger: ".compare-grid", start: "top 92%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="why"
      ref={sectionRef}
      aria-label="Why institutions switch to AURA"
      className="py-24 sm:py-28 px-4 sm:px-6 bg-white dark:bg-slate-950 transition-colors duration-300"
    >
      <div className="max-w-5xl mx-auto">
        <div className="compare-head text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">The Transformation</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">
            Why institutions switch
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent">
              to Aura.
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
            It&apos;s not about more features — it&apos;s about replacing daily administrative pain with calm, automated outcomes.
          </p>
        </div>

        <div className="compare-grid grid sm:grid-cols-2 gap-4">
          {TRANSFORMATIONS.map(({ from, to }) => (
            <div key={from}
              className="compare-row group rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/30 transition-all p-5 flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <X size={13} className="text-rose-500 dark:text-rose-400" />
                </span>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500 line-through decoration-rose-300/60 decoration-1">{from}</p>
              </div>
              <ArrowRight size={16} className="text-violet-400 dark:text-violet-500 ml-1 rotate-90" aria-hidden="true" />
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                </span>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{to}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
