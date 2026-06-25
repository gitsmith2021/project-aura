"use client";

import { useRef } from "react";
import { Zap } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { TRUST_BADGES } from "../data";

// Headline: "The Academic ERP that actually works." — split into words so each
// can animate independently; gradient spans preserved from the original page.
const HEADLINE_WORDS: { text: string; gradient?: string }[] = [
  { text: "The" },
  { text: "Academic", gradient: "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400" },
  { text: "ERP",      gradient: "bg-gradient-to-r from-fuchsia-500 to-pink-500 dark:from-fuchsia-400 dark:to-pink-400" },
  { text: "that" },
  { text: "actually" },
  { text: "works.",   gradient: "bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-400" },
];

export function HeroText() {
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".hero-word", {
      y: 40, opacity: 0, duration: 0.8, stagger: 0.08,
    });
    tl.from(".hero-sub", { y: 20, opacity: 0, duration: 0.7 }, "-=0.3");
    tl.from(".hero-badge", {
      scale: 0.8, opacity: 0, duration: 0.5, stagger: 0.1, ease: "back.out(1.7)",
    }, "-=0.4");
  }, { scope: scopeRef });

  return (
    <div ref={scopeRef} className="flex-1 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
      <div className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/8 text-violet-600 dark:text-violet-300 text-xs font-semibold mb-7">
        <Zap size={11} /> Purpose-built Academic Management · Trust Worthy Partner for all Educational Institutions
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[72px] font-black tracking-tighter leading-[0.95] mb-5 text-slate-900 dark:text-white">
        {HEADLINE_WORDS.map((w, i) => (
          <span key={i} className="inline-block">
            <span
              className={`hero-word inline-block will-change-transform ${
                w.gradient ? `${w.gradient} bg-clip-text text-transparent pb-1` : ""
              }`}
            >
              {w.text}
            </span>
            {i < HEADLINE_WORDS.length - 1 && <span>&nbsp;</span>}
          </span>
        ))}
      </h1>

      <p className="hero-sub text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-7">
        AURA CAMPUS™ replaces disconnected spreadsheets, outdated portals and manual accreditation work with one unified platform —
        built for colleges, universities and vocational institutes that demand more.
      </p>

      <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
        {TRUST_BADGES.map(badge => (
          <span key={badge}
            className="hero-badge inline-flex items-center px-3 py-1 rounded-full border border-slate-300 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-800/40 hover:border-teal-400 dark:hover:border-teal-500/60 hover:text-teal-700 dark:hover:text-teal-300 transition-colors cursor-default">
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
}
