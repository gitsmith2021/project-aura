"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { INSTITUTION_TYPES, COMPLIANCE_FRAMEWORKS } from "../data";

export function InstitutionTypesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".inst-head", {
      y: 40, opacity: 0, duration: 0.8, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 88%", once: true },
    });
    gsap.from(".inst-card", {
      y: 24, opacity: 0, duration: 0.55, stagger: 0.08, ease: "power2.out", immediateRender: false,
      scrollTrigger: { trigger: ".inst-grid", start: "top 92%", once: true },
    });
    gsap.from(".inst-chip", {
      scale: 0.85, opacity: 0, duration: 0.5, stagger: 0.06, ease: "power2.out", immediateRender: false,
      scrollTrigger: { trigger: ".inst-chips", start: "top 95%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="institutions"
      ref={sectionRef}
      aria-label="Built for Managing Higher Educational Institutions"
      className="py-24 sm:py-28 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/20 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto">
        <div className="inst-head text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Purpose-Built</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">
            Built for Managing<br/>
            <span className="bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent"> Higher Educational Institutions.</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm">
            From single-department colleges to multi-campus universities — AURA CAMPUS™ understands the
            workflows, compliance and rhythms of all academic institutions.
          </p>
        </div>

        <div className="inst-grid grid grid-cols-2 md:grid-cols-3 gap-4 mb-14">
          {INSTITUTION_TYPES.map(({ Icon, label }) => (
            <div key={label}
              className="inst-card flex items-center gap-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/50 p-5 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/30 transition-all">
              <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/25 flex items-center justify-center shrink-0">
                <Icon size={20} className="text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{label}</span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
            Compliance &amp; frameworks supported
          </p>
          <div className="inst-chips flex flex-wrap justify-center gap-2.5">
            {COMPLIANCE_FRAMEWORKS.map(f => (
              <span key={f}
                className="inst-chip px-4 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-900/60 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 shadow-sm">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
