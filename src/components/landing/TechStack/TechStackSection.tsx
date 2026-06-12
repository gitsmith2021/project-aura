"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { TECH } from "../data";

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
      aria-label="Technology stack"
      className="py-16 sm:py-20 px-4 sm:px-6 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-800/40 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Built With The Best</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Built on a modern, open stack.
            <span className="bg-gradient-to-r from-violet-600 to-cyan-500 dark:from-violet-400 dark:to-cyan-400 bg-clip-text text-transparent"> Zero vendor lock-in.</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {TECH.map(t => (
            <article key={t.name}
              className={`tech-card rounded-2xl border p-4 transition-all hover:scale-[1.03] hover:shadow-lg cursor-default text-center ${t.cardL} ${t.cardD}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black mx-auto mb-2.5 ${t.badgeL} ${t.badgeD}`}>
                {t.badge}
              </div>
              <h3 className={`font-black text-xs mb-1 ${t.nameL} ${t.nameD}`}>{t.name}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.role}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
