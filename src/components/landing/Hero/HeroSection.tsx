"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "../SmoothScrollProvider";
import { HeroText } from "./HeroText";
import type { DemoFormData } from "../data";

// Three.js canvas — client-only, never blocks page render.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const INPUT_CLS =
  "w-full px-3.5 py-2.5 text-sm border border-slate-700 rounded-xl bg-slate-800/80 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-colors";

type Viewport = "mobile" | "tablet" | "desktop";

function getViewport(): Viewport {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [demoForm, setDemoForm] = useState<DemoFormData>({
    institutionName: "", yourName: "", phone: "", institutionType: "",
  });
  const { scrollToId } = useLenis();

  useEffect(() => {
    const fn = () => setViewport(getViewport());
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".hero-form-panel", {
      x: 40, opacity: 0, duration: 0.8, delay: 1.0, ease: "power3.out",
    });
  }, { scope: sectionRef });

  function handleDemoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: wire to /api/demo-request or CRM webhook
    console.log("Demo request:", demoForm);
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
      className="relative min-h-screen flex items-center bg-[#030712] overflow-hidden pt-24 pb-16 px-4 sm:px-6"
    >
      {/* violet radial glow behind the text — consistent with the old hero */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.55) 0%, transparent 65%)" }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.35) 0%, transparent 70%)" }} />
      </div>

      {/* Three.js ambient layer — full-bleed behind both columns, desktop/tablet only */}
      {viewport && viewport !== "mobile" && (
        <div
          className={`absolute inset-0 z-0 transition-opacity duration-1000 ${sceneReady ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        >
          <HeroScene simple={viewport === "tablet"} onReady={() => setSceneReady(true)} />
        </div>
      )}

      {/* pulsing orb placeholder while Three.js loads */}
      {viewport && viewport !== "mobile" && !sceneReady && (
        <div className="absolute left-[28%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none" aria-hidden="true">
          <div className="w-40 h-40 rounded-full bg-violet-600/30 blur-2xl animate-pulse" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
        {/* LEFT (~55%): headline + subheadline + trust badges */}
        <HeroText />

        {/* RIGHT (~45%): glass lead-capture form */}
        <div className="hero-form-panel w-full lg:w-[420px] flex-shrink-0">
          {formSubmitted ? (
            <div className="rounded-2xl bg-green-950/40 border border-green-700/40 backdrop-blur-xl p-8 sm:p-10 text-center shadow-lg">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-black text-green-300 mb-2">Demo booked!</h3>
              <p className="text-sm text-green-400 leading-relaxed">
                We&apos;ll WhatsApp you within 2 hours to confirm your slot.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-violet-700/40 bg-slate-900/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-violet-950/40">
              <h3 className="text-lg font-black text-white mb-1">Book Your Free Demo</h3>
              <p className="text-xs text-slate-400 mb-5">Join early access institutions across India.</p>

              <form onSubmit={handleDemoSubmit} className="space-y-3">
                <input
                  type="text" name="institutionName"
                  value={demoForm.institutionName} onChange={handleFormChange}
                  placeholder="St. Joseph's College of Engineering"
                  required className={INPUT_CLS} />
                <input
                  type="text" name="yourName"
                  value={demoForm.yourName} onChange={handleFormChange}
                  placeholder="Dr. Ramesh Kumar"
                  required className={INPUT_CLS} />
                <input
                  type="tel" name="phone"
                  value={demoForm.phone} onChange={handleFormChange}
                  placeholder="+91 98765 43210"
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

                <p className="text-center text-[11px] text-slate-500">
                  ⚡ We&apos;ll call you within 2 hours on working days.
                </p>
              </form>

              <button type="button" onClick={() => scrollToId("features")}
                className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
                Explore Features
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
