"use client";

import { useRef } from "react";
import { Calendar, CheckCircle2, Sparkles, ArrowRight, Zap } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "../SmoothScrollProvider";
import { TIMETABLE_BENEFITS } from "../data";

/* Larger flagship version of the coded timetable mockup (6 days × 6 periods). */
function TimetableSpotlightMockup() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells = [
    ["CS101", "", "MA204", "", "PH110", "EN101"],
    ["", "CS101", "", "LAB-2", "", "MA204"],
    ["EN101", "", "CS233", "", "MA204", ""],
    ["", "LAB-1", "", "CS101", "", "CS233"],
    ["PH110", "", "EN101", "", "LAB-3", ""],
  ];
  const colors = ["bg-violet-500/85", "bg-cyan-500/75", "bg-emerald-500/75", "bg-amber-500/75", "bg-fuchsia-500/75"];
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-violet-300/40 dark:shadow-black/50 overflow-hidden">
      <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/60 flex items-center gap-2">
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <span className="text-[11px] text-slate-400 font-mono ml-2">aura.edu/timetable · II B.Sc CS · Section A</span>
      </div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-6 gap-2 mb-2">
          {days.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase">{d}</div>
          ))}
        </div>
        {cells.map((row, r) => (
          <div key={r} className="grid grid-cols-6 gap-2 mb-2">
            {row.map((cell, c) => (
              <div key={c}
                className={`h-11 sm:h-12 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${
                  cell ? colors[(r + c) % colors.length] : "bg-slate-800/80"
                }`}>
                {cell}
              </div>
            ))}
          </div>
        ))}

        {/* Workload balance bar */}
        <div className="mt-4 rounded-xl bg-slate-800/60 px-4 py-3">
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-2">
            <span>Faculty workload balance</span>
            <span className="text-emerald-400">Even · 18–20 hrs/wk</span>
          </div>
          <div className="flex gap-1.5">
            {[78, 92, 85, 88, 70, 95].map((p, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${p}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 size={12} /> 0 conflicts
          </span>
          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
            <Zap size={11} className="text-amber-400" /> Solved by OR-Tools in 2.4s
          </span>
          <button type="button" tabIndex={-1}
            className="ml-auto px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-black pointer-events-none">
            Publish →
          </button>
        </div>
      </div>
    </div>
  );
}

export function TimetableSpotlight() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollToId } = useLenis();

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".spot-copy", {
      y: 40, opacity: 0, duration: 0.8, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
    });
    gsap.from(".spot-mockup", {
      y: 50, opacity: 0, scale: 0.96, duration: 0.9, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="ai-timetable"
      ref={sectionRef}
      aria-label="AI Timetable Engine"
      className="py-24 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-white via-violet-50/60 to-white dark:from-slate-950 dark:via-violet-950/20 dark:to-slate-950 border-y border-violet-100 dark:border-violet-900/20 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="spot-copy">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 text-[11px] font-black uppercase tracking-widest mb-5">
            <Sparkles size={12} /> Flagship Capability
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight text-slate-900 dark:text-white">
            AI Timetable Engine
          </h2>
          <p className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-600 to-cyan-500 dark:from-violet-400 dark:to-cyan-400 bg-clip-text text-transparent mb-5">
            Build an entire semester timetable in minutes.
          </p>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-7 max-w-lg">
            A Python OR-Tools optimisation engine generates conflict-free, workload-balanced timetables
            across every department — what used to take weeks of manual juggling now takes a single click.
          </p>

          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-8">
            {TIMETABLE_BENEFITS.map(b => (
              <li key={b} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={15} className="text-violet-500 mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => scrollToId("hero")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all hover:scale-[1.02] shadow-md shadow-violet-500/20 border border-violet-500">
              Schedule a Demo <ArrowRight size={15} />
            </button>
            <button type="button" onClick={() => scrollToId("features")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-violet-200 dark:border-violet-700/40 text-sm font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
              See all features
            </button>
          </div>
        </div>

        <div className="spot-mockup w-full max-w-md mx-auto md:max-w-none">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <Calendar size={13} className="text-violet-500" /> Generated timetable preview
          </div>
          <TimetableSpotlightMockup />
        </div>
      </div>
    </section>
  );
}
