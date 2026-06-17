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
      className="py-16 sm:py-20 px-4 sm:px-6 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-800/40 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Enterprise-Grade Platform</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Built to be trusted with
            <span className="bg-gradient-to-r from-violet-600 to-cyan-500 dark:from-violet-400 dark:to-cyan-400 bg-clip-text text-transparent"> your institution&apos;s data.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {PLATFORM_TRUST.map(t => (
            <article key={t.title}
              className="tech-card rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/50 p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-500/30 cursor-default">
              <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/25 flex items-center justify-center mb-3.5">
                <t.Icon size={20} className="text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white mb-1.5">{t.title}</h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
