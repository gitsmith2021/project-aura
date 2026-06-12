"use client";

import { useRef } from "react";
import { Award, CheckCircle2, Database, Shield } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { ACCREDITATION } from "../data";

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
      className="py-24 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-violet-50 via-purple-50/50 to-white dark:from-violet-950/25 dark:via-purple-950/20 dark:to-slate-950 border-y border-violet-100 dark:border-violet-900/20 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="naac-intro">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Compliance Built-In</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-5 leading-tight text-slate-900 dark:text-white">
            Accreditation-ready.
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent">Out of the box.</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-6">
            AURA is designed around accreditation frameworks and ranking parameters from the ground up.
            Every module captures evidence-ready structured data — no more manual exports, no spreadsheet cleanup the week before a site visit.
          </p>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {[
              "NAAC Criteria 1–7 fully mapped across all modules",
              "NIRF ranking parameters covered end-to-end",
              "NBA, ABET and other frameworks supported",
              "One-click structured data export for submissions",
            ].map(pt => (
              <li key={pt} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-violet-500 mt-0.5 shrink-0" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { Icon: Shield,   label: "NAAC Criteria 1–7",  c: "bg-violet-100 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300" },
              { Icon: Award,    label: "NIRF Rankings",       c: "bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300" },
              { Icon: Database, label: "Structured Evidence", c: "bg-indigo-100 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300" },
            ].map(b => (
              <span key={b.label} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-semibold ${b.c}`}>
                <b.Icon size={11} /> {b.label}
              </span>
            ))}
          </div>
        </div>

        <div className="naac-rows space-y-2.5">
          {ACCREDITATION.map(item => (
            <div key={item.code}
              className="naac-row flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/70 hover:border-violet-300 dark:hover:border-violet-500/30 transition-colors shadow-sm dark:shadow-none">
              <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-violet-600 dark:text-violet-400">{item.code}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-white">{item.label}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{item.module}</p>
              </div>
              <CheckCircle2 size={14} className="text-violet-500 dark:text-violet-400 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
