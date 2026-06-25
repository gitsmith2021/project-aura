"use client";

import { useRef } from "react";
import { X, Check, Clock, Zap, Layers } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "../SmoothScrollProvider";
import { TRANSFORMATIONS } from "../data";

const IMPACT = [
  {
    Icon: Clock,
    value: "40+",
    unit: "hrs / week",
    label: "Saved on admin tasks",
    accent: "#7C3AED",
  },
  {
    Icon: Zap,
    value: "10×",
    unit: "faster",
    label: "Timetable generation",
    accent: "#059669",
  },
  {
    Icon: Layers,
    value: "1",
    unit: "platform",
    label: "Zero disconnected tools",
    accent: "#2563EB",
  },
];

export function ComparisonSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollToId } = useLenis();

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".compare-head", {
      y: 40, opacity: 0, duration: 0.8, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 88%", once: true },
    });
    gsap.from(".compare-table", {
      y: 28, opacity: 0, duration: 0.7, ease: "power2.out", immediateRender: false,
      scrollTrigger: { trigger: ".compare-table", start: "top 92%", once: true },
    });
    gsap.from(".compare-stat", {
      y: 20, opacity: 0, scale: 0.95, duration: 0.5, stagger: 0.12,
      ease: "back.out(1.5)", immediateRender: false,
      scrollTrigger: { trigger: ".compare-stats", start: "top 90%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="why"
      ref={sectionRef}
      aria-label="Why institutions switch to AURA CAMPUS"
      className="py-24 sm:py-32 px-4 sm:px-6 bg-white dark:bg-slate-950 transition-colors duration-300 overflow-hidden"
    >
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="compare-head text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
            The Transformation
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">
            Why institutions switch
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent">
              to AURA CAMPUS™
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm sm:text-[15px] leading-relaxed">
            Not about more features — about replacing daily administrative pain
            with calm, automated outcomes.
          </p>
        </div>

        {/* ── Before / After comparison table ── */}
        <div className="compare-table rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/60 shadow-2xl shadow-slate-100/80 dark:shadow-black/40">

          {/* Column headers */}
          <div className="grid grid-cols-2">
            <div className="flex items-center justify-center gap-2.5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/25 flex items-center justify-center shrink-0">
                <X size={11} className="text-rose-500" />
              </span>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-rose-500 dark:text-rose-400">
                The Old Way
              </span>
            </div>
            <div className="flex items-center justify-center gap-2.5 py-4 bg-violet-600 border-b border-violet-500">
              <span className="w-5 h-5 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                <Check size={11} className="text-white" />
              </span>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-white">
                With AURA CAMPUS™
              </span>
            </div>
          </div>

          {/* Transformation rows */}
          {TRANSFORMATIONS.map(({ from, to }, i) => (
            <div
              key={from}
              className={`grid grid-cols-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800/50 group transition-colors hover:bg-violet-50/30 dark:hover:bg-violet-950/10 ${
                i % 2 === 1 ? "bg-slate-50/60 dark:bg-slate-900/30" : "bg-white dark:bg-transparent"
              }`}
            >
              {/* Before */}
              <div className="flex items-center gap-3 px-5 py-4 sm:py-5 border-r border-slate-100 dark:border-slate-800/50">
                <X size={13} className="text-rose-400/50 shrink-0" />
                <span className="text-sm text-slate-400 dark:text-slate-500 font-medium leading-snug">
                  {from}
                </span>
              </div>
              {/* After */}
              <div className="flex items-center gap-3 px-5 py-4 sm:py-5 bg-violet-50/40 dark:bg-violet-950/20">
                <Check size={13} className="text-emerald-500 shrink-0" />
                <span className="text-sm text-slate-800 dark:text-white font-semibold leading-snug">
                  {to}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Impact stats ── */}
        <div className="compare-stats mt-10 grid grid-cols-3 gap-4">
          {IMPACT.map(({ Icon, value, unit, label, accent }) => (
            <div
              key={label}
              className="compare-stat text-center rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}35` }}
              >
                <Icon size={18} style={{ color: accent }} />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none">
                {value}
                <span className="text-sm font-bold text-slate-400 dark:text-slate-500 ml-1.5">{unit}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium leading-snug">{label}</p>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className="text-center mt-12">
          <button
            type="button"
            onClick={() => scrollToId("hero")}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all hover:scale-[1.02] shadow-lg shadow-violet-500/25 border border-violet-500"
          >
            See It For Your Institution →
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-600 mt-3">
            No credit card required · Live in one day
          </p>
        </div>

      </div>
    </section>
  );
}
