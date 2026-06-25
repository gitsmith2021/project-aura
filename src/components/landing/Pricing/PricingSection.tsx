"use client";

import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "../SmoothScrollProvider";

// Public pricing — single source of truth, mirrored into the
// subscription_plans catalog (Phase 7E). Annual billing applies a 15%
// discount; every paid tier opens with a 30-day free trial.
// AI features (Knowledge Hub summaries / RAG assistant) ship as an optional
// add-on and are not counted in any tier (see footnote).
const ANNUAL_DISCOUNT = 0.15;

type Tier = {
  name: string;
  monthly: number | null;   // null = custom / contact pricing
  audience: string;
  features: string[];
  checkColor: string;
  highlight: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Essential",
    monthly: 9999,
    audience: "Best for institutions up to 1,000 students",
    features: ["Admissions", "Attendance", "Timetable", "Fee Management", "Student Portal", "Staff Portal"],
    checkColor: "text-teal-500",
    highlight: false,
  },
  {
    name: "Professional",
    monthly: 24999,
    audience: "Best for institutions up to 5,000 students",
    features: [
      "Everything in Essential", "Admissions CRM", "Library", "Hostel", "Payroll",
      "Recruitment", "Placements", "Scholarships", "Knowledge Hub", "Events & Sports",
      "Inventory & Assets", "Accreditation Tools",
    ],
    checkColor: "text-violet-500",
    highlight: true,
  },
  {
    name: "Enterprise",
    monthly: null,
    audience: "Universities, autonomous & multi-campus groups",
    features: [
      "Everything in Professional", "Multi-campus support", "Research & Publications",
      "Alumni Network", "IQAC / AQAR Suite", "SSR Builder", "API Access",
      "Dedicated Support", "SLA", "Custom Integrations",
    ],
    checkColor: "text-teal-500",
    highlight: false,
  },
];

// Indian-grouped rupee formatting (e.g. 101990 → 1,01,990)
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [annual, setAnnual] = useState(true);
  const { scrollToId } = useLenis();

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".pricing-head", {
      y: 40, opacity: 0, duration: 0.8, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 88%", once: true },
    });
    gsap.from(".pricing-card", {
      scale: 0.92, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power2.out", immediateRender: false,
      scrollTrigger: { trigger: ".pricing-grid", start: "top 92%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="pricing"
      ref={sectionRef}
      aria-label="Pricing"
      className="py-24 sm:py-28 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/20 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto">
        <div className="pricing-head text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 text-slate-900 dark:text-white">
            Simple, transparent pricing.
          </h2>
          <p className="text-lg font-semibold bg-gradient-to-r from-teal-600 to-violet-600 dark:from-teal-400 dark:to-violet-400 bg-clip-text text-transparent">
            Start free for 30 days. No card required.
          </p>
        </div>

        {/* ── Billing toggle ── */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm font-bold transition-colors ${!annual ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            aria-label="Toggle annual billing"
            onClick={() => setAnnual(a => !a)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 border ${
              annual ? "bg-violet-600 border-violet-500" : "bg-slate-300 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${annual ? "translate-x-7" : "translate-x-0"}`} />
          </button>
          <span className={`text-sm font-bold transition-colors ${annual ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
            Annual
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
            Save 15%
          </span>
        </div>

        <div className="pricing-grid grid sm:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          {TIERS.map(tier => {
            const perMonth = tier.monthly == null
              ? null
              : annual ? Math.round(tier.monthly * (1 - ANNUAL_DISCOUNT)) : tier.monthly;
            const annualTotal = tier.monthly == null ? null : Math.round(tier.monthly * 12 * (1 - ANNUAL_DISCOUNT));

            return (
              <div
                key={tier.name}
                className={`pricing-card rounded-2xl p-6 sm:p-7 flex flex-col relative bg-white dark:bg-slate-900/80 ${
                  tier.highlight
                    ? "border-2 border-violet-500 dark:border-violet-500/70"
                    : "border border-slate-200 dark:border-slate-800/70 shadow-sm"
                }`}
                style={tier.highlight ? { boxShadow: "0 0 40px rgba(124,58,237,0.3)" } : undefined}
              >
                {tier.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}
                <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${
                  tier.highlight ? "text-violet-600 dark:text-violet-400 mt-2" : "text-slate-400 dark:text-slate-500"
                }`}>
                  {tier.name}
                </p>

                {/* Price block */}
                {perMonth == null ? (
                  <>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mb-1">Custom Pricing</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Tailored to your campus</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-end gap-1.5 mb-1">
                      <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{inr(perMonth)}</p>
                      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 mb-0.5">/ month</span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 min-h-[1rem]">
                      {annual
                        ? <>Billed annually at {inr(annualTotal!)} · <span className="line-through">{inr(tier.monthly!)}/mo</span></>
                        : "Billed monthly · switch to annual to save 15%"}
                    </p>
                  </>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{tier.audience}</p>
                <ul className="space-y-2 mb-7 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <CheckCircle2 size={12} className={`${tier.checkColor} shrink-0`} />
                      {f.startsWith("Everything in")
                        ? <span className={`font-semibold ${tier.highlight ? "text-violet-600 dark:text-violet-400" : "text-teal-600 dark:text-teal-400"}`}>{f}</span>
                        : f}
                    </li>
                  ))}
                </ul>
                {tier.name === "Enterprise" ? (
                  <a href="mailto:hello@aura.edu"
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-center block">
                    Contact Us
                  </a>
                ) : tier.highlight ? (
                  <button type="button" onClick={() => scrollToId("hero")}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all hover:scale-[1.02] shadow-md shadow-violet-500/20 border border-violet-500">
                    Start 30-Day Free Trial
                  </button>
                ) : (
                  <button type="button" onClick={() => scrollToId("hero")}
                    className="w-full py-2.5 rounded-xl border border-violet-200 dark:border-violet-700/40 text-sm font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                    Start 30-Day Free Trial
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8 max-w-2xl mx-auto">
          Every paid plan starts with a 30-day free trial — no credit card required. Pricing may vary
          based on student strength, deployment model, and support requirements.
        </p>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
          No implementation fees. No 6-month setup. Cancel anytime. Prices in INR + GST.
        </p>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
          AI features (Knowledge Hub summaries &amp; assistant) are available as an optional add-on.
        </p>
      </div>
    </section>
  );
}
