"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { TESTIMONIALS, MARQUEE_ITEMS } from "../data";

// Aura's real numbers — no generic market-size placeholders.
type Stat = { value: string; label: string; countTo: number | null; suffix?: string };
const STATS: Stat[] = [
  { value: "30+",      label: "Modules",          countTo: 30, suffix: "+" },
  { value: "NAAC 1–7", label: "Criteria Covered", countTo: null },
  { value: "₹0",       label: "Setup Fee",        countTo: null },
  { value: "Same-Day", label: "Onboarding",       countTo: null },
];

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;

    // Numeric stat counts up; text stats scale in. immediateRender:false on
    // every scroll entrance — if a trigger ever misfires, content stays visible.
    gsap.utils.toArray<HTMLElement>(".stat-value").forEach(el => {
      const countTo = el.dataset.countTo;
      if (countTo) {
        const target = Number(countTo);
        const suffix = el.dataset.suffix ?? "";
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target, duration: 2, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          onUpdate: () => { el.textContent = `${Math.round(counter.val)}${suffix}`; },
        });
      } else {
        gsap.from(el, {
          scale: 0.8, opacity: 0, duration: 0.8, ease: "power2.out", immediateRender: false,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      }
    });

    gsap.from(".testimonial-card", {
      y: 24, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power2.out", immediateRender: false,
      scrollTrigger: { trigger: ".testimonial-grid", start: "top 92%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      aria-label="Stats and social proof"
      className="bg-white dark:bg-slate-950 transition-colors duration-300"
    >
      {/* ── Purple stats band — inline gradient so the global dark-mode
            `.bg-gradient-to-br` override can't flatten it ── */}
      <div style={{ backgroundImage: "linear-gradient(100deg, #7C3AED 0%, #6D28D9 50%, #7C3AED 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p
                className="stat-value text-3xl md:text-4xl font-black text-white"
                data-count-to={s.countTo ?? undefined}
                data-suffix={s.countTo ? s.suffix : undefined}
              >
                {s.value}
              </p>
              <p className="text-[11px] text-violet-200 mt-1.5 font-semibold uppercase tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Social proof ── */}
      <div className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
              Social Proof
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Early access institutions
              <span className="bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent"> already love it.</span>
            </h2>
          </div>

          <div className="testimonial-grid grid sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
            {TESTIMONIALS.map(t => (
              <figure key={t.init}
                className="testimonial-card rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/30 transition-all flex flex-col">
                <blockquote className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white leading-snug italic flex-1 mb-5">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundImage: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}>
                    <span className="text-xs font-black text-white">{t.init}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{t.name}</p>
                    <span className="inline-block text-[10px] font-semibold bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/25 px-2 py-0.5 rounded-full mt-0.5">
                      Early Access Partner
                    </span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="max-w-2xl mx-auto rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-700/40 p-5 text-center">
            <p className="text-sm text-violet-800 dark:text-violet-300 font-medium leading-relaxed">
              🚀 Aura is currently in early access with pilot institutions across India.
              Spots are limited — join now to shape the product.
            </p>
          </div>
        </div>
      </div>

      {/* ── Workflow marquee ── */}
      <div className="overflow-hidden pb-16">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 mb-5">
          Covering every academic workflow
        </p>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 sm:w-32 z-10 bg-gradient-to-r from-white dark:from-slate-950 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 sm:w-32 z-10 bg-gradient-to-l from-white dark:from-slate-950 to-transparent" />
          <div className="marquee-track flex gap-3 w-max">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map(({ Icon, label, color }, i) => (
              <span key={i}
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0 shadow-sm">
                <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon size={13} className="text-white" />
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
