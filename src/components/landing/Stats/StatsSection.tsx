"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { TESTIMONIALS, TESTIMONIAL_MS, MARQUEE_ITEMS } from "../data";

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
  const [tIdx,    setTIdx]    = useState(0);
  const [tProg,   setTProg]   = useState(0);
  const [tPaused, setTPaused] = useState(false);

  // testimonial auto-advance with progress bar (carried over from old page)
  useEffect(() => {
    if (tPaused) return;
    setTProg(0);
    const step = 50;
    const inc  = (step / TESTIMONIAL_MS) * 100;
    const prog = setInterval(() => setTProg(p => Math.min(p + inc, 100)), step);
    const adv  = setTimeout(() => setTIdx(i => (i + 1) % TESTIMONIALS.length), TESTIMONIAL_MS);
    return () => { clearInterval(prog); clearTimeout(adv); };
  }, [tIdx, tPaused]);

  useGSAP(() => {
    if (prefersReducedMotion()) return;

    // section entrance
    gsap.from(".stats-wrap", {
      y: 60, opacity: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true },
    });

    // numeric stat counts up; text stats fade/scale in
    gsap.utils.toArray<HTMLElement>(".stat-value").forEach(el => {
      const countTo = el.dataset.countTo;
      if (countTo) {
        const target = Number(countTo);
        const suffix = el.dataset.suffix ?? "";
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target, duration: 2, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
          onUpdate: () => { el.textContent = `${Math.round(counter.val)}${suffix}`; },
        });
      } else {
        gsap.from(el, {
          scale: 0.8, opacity: 0, duration: 0.8, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      }
    });
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      aria-label="Stats and social proof"
      className="bg-white dark:bg-slate-950 py-20 sm:py-24 px-4 sm:px-6 transition-colors duration-300"
    >
      <div className="stats-wrap max-w-5xl mx-auto">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-20">
          {STATS.map(s => (
            <div key={s.label}>
              <p
                className="stat-value text-3xl md:text-4xl font-black text-slate-900 dark:text-white"
                data-count-to={s.countTo ?? undefined}
                data-suffix={s.countTo ? s.suffix : undefined}
              >
                {s.value}
              </p>
              <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-1.5 font-semibold uppercase tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Testimonial carousel ── */}
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-center text-slate-400 dark:text-slate-500 mb-8">
            Currently Onboarding Early Access Institutions
          </p>

          <div
            className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 p-7 sm:p-8 shadow-md mb-5 cursor-default"
            onMouseEnter={() => setTPaused(true)}
            onMouseLeave={() => setTPaused(false)}
          >
            <div className="h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                style={{ width: `${tProg}%`, transition: "width 50ms linear" }} />
            </div>

            <p className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-white leading-snug mb-6 italic">
              &ldquo;{TESTIMONIALS[tIdx].quote}&rdquo;
            </p>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-md"
                style={{ backgroundImage: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}>
                <span className="text-sm font-black text-white">{TESTIMONIALS[tIdx].init}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{TESTIMONIALS[tIdx].name}</p>
                <span className="inline-block text-[10px] font-semibold bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/25 px-2 py-0.5 rounded-full mt-0.5">
                  Early Access Partner
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center gap-2 mb-7">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setTIdx(i); setTProg(0); }}
                className={`rounded-full transition-all duration-300 ${
                  i === tIdx
                    ? "w-6 h-2 bg-violet-600"
                    : "w-2 h-2 bg-slate-300 dark:bg-slate-600 hover:bg-violet-400 dark:hover:bg-violet-500"
                }`}
                aria-label={`Testimonial ${i + 1}`} />
            ))}
          </div>

          <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-700/40 p-5 text-center">
            <p className="text-sm text-violet-800 dark:text-violet-300 font-medium leading-relaxed">
              🚀 Aura is currently in early access with pilot institutions across India.
              Spots are limited — join now to shape the product.
            </p>
          </div>
        </div>
      </div>

      {/* ── Workflow marquee ── */}
      <div className="overflow-hidden pt-16">
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
