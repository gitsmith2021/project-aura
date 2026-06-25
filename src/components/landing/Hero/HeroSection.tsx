"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "../SmoothScrollProvider";
import { HeroText } from "./HeroText";
import type { DemoFormData } from "../data";

const INPUT_CLS =
  "w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 transition-colors";

// Simple & elegant: light gradient + dot grid + soft glows. No Three.js.
export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [demoForm, setDemoForm] = useState<DemoFormData>({
    institutionName: "", yourName: "", phone: "", institutionType: "",
  });
  const { scrollToId } = useLenis();

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".hero-form-panel", {
      x: 40, opacity: 0, duration: 0.8, delay: 1.0, ease: "power3.out",
    });
  }, { scope: sectionRef });

  async function handleDemoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await fetch("/api/demo-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(demoForm),
    });
    setFormSubmitted(true);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    const key = name as keyof DemoFormData;
    setDemoForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <section
      id="hero"
      ref={sectionRef}
      aria-label="Hero"
      className="relative min-h-[calc(100vh-64px)] flex items-center overflow-hidden pt-10 pb-20 px-4 sm:px-6 bg-gradient-to-b from-violet-50/70 via-white to-white dark:from-violet-950/25 dark:via-slate-950 dark:to-slate-950 transition-colors duration-300"
    >
      {/* subtle dot grid + soft glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-50 dark:opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(139,92,246,0.35) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)",
          }}
        />
        <div className="float-orb-1 absolute -top-24 left-[15%] w-80 h-80 bg-violet-300/25 dark:bg-violet-600/10 rounded-full blur-3xl" />
        <div className="float-orb-2 absolute bottom-0 right-[8%] w-72 h-72 bg-fuchsia-300/15 dark:bg-fuchsia-600/8 rounded-full blur-3xl" />
        <div className="float-orb-3 absolute top-1/3 right-1/3 w-56 h-56 bg-teal-300/15 dark:bg-teal-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
        {/* LEFT (~55%): headline + subheadline + trust badges */}
        <HeroText />

        {/* RIGHT (~45%): lead-capture form */}
        <div className="hero-form-panel w-full lg:w-[420px] flex-shrink-0">
          {formSubmitted ? (
            <div className="rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-700/40 p-8 sm:p-10 text-center shadow-lg">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-black text-green-800 dark:text-green-300 mb-2">Demo booked!</h3>
              <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
                We&apos;ll WhatsApp you within 2 hours to confirm your slot.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-violet-200 dark:border-violet-700/40 bg-white/95 dark:bg-slate-900/80 backdrop-blur-sm p-6 sm:p-8 shadow-2xl shadow-violet-100/40 dark:shadow-violet-900/20">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Book Your Free Demo</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Join institutions worldwide on AURA CAMPUS™.</p>

              <form onSubmit={handleDemoSubmit} className="space-y-3">
                <input
                  type="text" name="institutionName"
                  value={demoForm.institutionName} onChange={handleFormChange}
                  placeholder="e.g. Springfield University"
                  required className={INPUT_CLS} />
                <input
                  type="text" name="yourName"
                  value={demoForm.yourName} onChange={handleFormChange}
                  placeholder="e.g. Dr. Alex Morgan"
                  required className={INPUT_CLS} />
                <input
                  type="tel" name="phone"
                  value={demoForm.phone} onChange={handleFormChange}
                  placeholder="e.g. +1 555 000 0000"
                  required className={INPUT_CLS} />
                <select
                  name="institutionType"
                  value={demoForm.institutionType} onChange={handleFormChange}
                  required
                  className={INPUT_CLS}>
                  <option value="">Select institution type</option>
                  <option value="engineering">Engineering College</option>
                  <option value="arts">Arts &amp; Science</option>
                  <option value="autonomous">Autonomous College</option>
                  <option value="university">University</option>
                  <option value="school">School</option>
                  <option value="vocational">Vocational</option>
                  <option value="other">Other</option>
                </select>

                <button type="submit"
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-violet-500/25 border border-violet-500 text-sm">
                  Book My Free Demo →
                </button>

                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                  ⚡ We&apos;ll call you within 2 hours on working days.
                </p>
              </form>

              <button type="button" onClick={() => scrollToId("features")}
                className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all text-sm">
                Explore Features
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
