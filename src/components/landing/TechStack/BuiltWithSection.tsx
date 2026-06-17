"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { TECH } from "../data";

/**
 * Compact "built with" strip — the actual technology AURA Campus runs on.
 * Kept small and placed just above the final CTA: useful signal for technically
 * literate decision-makers without distracting institutional leadership above.
 */
export function BuiltWithSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".builtwith-card", {
      opacity: 0, scale: 0.92, duration: 0.5, stagger: 0.06, ease: "power2.out",
      immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 94%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="built-with"
      ref={sectionRef}
      aria-label="Technology stack"
      className="py-12 sm:py-14 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/20 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6">
          Built on a modern, open technology stack
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {TECH.map(t => (
            <article key={t.name}
              className={`builtwith-card rounded-2xl border p-4 transition-all hover:scale-[1.03] hover:shadow-lg cursor-default text-center ${t.cardL} ${t.cardD}`}>
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
