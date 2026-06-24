"use client";

import { useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "../SmoothScrollProvider";

// Fixed public pricing.
const TIERS = [
  {
    name: "Essential",
    price: "₹9,999",
    period: "/ month",
    audience: "Best for institutions up to 1,000 students",
    features: ["Admissions", "Attendance", "Timetable", "Fee Management", "Student Portal", "Staff Portal"],
    checkColor: "text-teal-500",
    highlight: false,
  },
  {
    name: "Professional",
    price: "₹24,999",
    period: "/ month",
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
    price: "Custom Pricing",
    period: " ",
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

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
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
        <div className="pricing-head text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 text-slate-900 dark:text-white">
            Simple, transparent pricing.
          </h2>
          <p className="text-lg font-semibold bg-gradient-to-r from-teal-600 to-violet-600 dark:from-teal-400 dark:to-violet-400 bg-clip-text text-transparent">
            No surprises. No consultants.
          </p>
        </div>

        <div className="pricing-grid grid sm:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          {TIERS.map(tier => (
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
              <p className="text-2xl font-black text-slate-900 dark:text-white mb-1">{tier.price}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{tier.period}</p>
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
                  Schedule Demo
                </button>
              ) : (
                <button type="button" onClick={() => scrollToId("hero")}
                  className="w-full py-2.5 rounded-xl border border-violet-200 dark:border-violet-700/40 text-sm font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                  Start Free Trial
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8 max-w-2xl mx-auto">
          Pricing may vary based on student strength, deployment model, and support requirements.
        </p>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
          No implementation fees. No 6-month setup. Cancel anytime. Prices in INR + GST.
        </p>
      </div>
    </section>
  );
}
