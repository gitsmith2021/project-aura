"use client";

import { useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { ACCREDITATION, COMPLIANCE_FRAMEWORKS, ACCREDITATION_TOOLS } from "../data";

export function AccreditationSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".naac-intro", {
      y: 40, opacity: 0, duration: 0.8, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 88%", once: true },
    });
    gsap.from(".naac-row", {
      y: 20, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.out", immediateRender: false,
      scrollTrigger: { trigger: ".naac-rows", start: "top 92%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="naac"
      ref={sectionRef}
      aria-label="Accreditation alignment"
      className="py-24 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-violet-50 via-purple-50/50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 border-y border-violet-100 dark:border-slate-800/60 transition-colors duration-300"
    >
      {/* items-center: left column sits at the vertical midpoint of the taller right column */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-16 items-center">

        {/* Left — vertically centred against the right list by the grid */}
        <div className="naac-intro">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
            Accreditation &amp; Compliance
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-5 leading-tight text-slate-900 dark:text-white">
            Built for
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent">
              Accreditation Excellence.
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-6">
            Accreditation shouldn&apos;t mean months of late nights before a site visit. AURA CAMPUS™ captures
            evidence-ready, structured data through everyday workflows — so your IQAC team stays
            audit-ready year-round and cuts accreditation effort to a fraction.
          </p>

          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Frameworks supported
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {COMPLIANCE_FRAMEWORKS.map(f => (
              <span key={f} className="px-3 py-1.5 border rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300">
                {f}
              </span>
            ))}
          </div>

          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {ACCREDITATION_TOOLS.map(pt => (
              <li key={pt} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-violet-500 mt-0.5 shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{pt}</span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-violet-500 mt-0.5 shrink-0" />
              <span>One-click structured data export for every submission</span>
            </li>
          </ul>
        </div>

        {/* Right — the taller column that the grid uses to set the row height */}
        <div className="naac-rows space-y-3">
          {ACCREDITATION.map(item => (
            <div key={item.code}
              className="naac-row flex items-center gap-4 p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/70 hover:border-violet-300 dark:hover:border-violet-500/30 transition-colors shadow-sm dark:shadow-none">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-black text-violet-600 dark:text-violet-400">{item.code}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white leading-snug">{item.label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{item.module}</p>
              </div>
              <CheckCircle2 size={16} className="text-violet-500 dark:text-violet-400 shrink-0" />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
