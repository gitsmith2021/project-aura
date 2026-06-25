"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUp, Building2 } from "lucide-react";
import { useLenis } from "./SmoothScrollProvider";
import { NAV_LINKS } from "./data";

export function Footer() {
  const [showBackTop, setShowBackTop] = useState(false);
  const { lenis, scrollToId } = useLenis();

  useEffect(() => {
    const fn = () => setShowBackTop(window.scrollY > 500);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function backToTop() {
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919884722295";

  return (
    <>
      <footer role="contentinfo" className="border-t border-slate-200 dark:border-slate-800/60 py-10 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center border border-violet-500">
              <Building2 size={13} className="text-white" />
            </div>
            <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">AURA CAMPUS<sup className="text-[9px] ml-0.5">™</sup></span>
            <span className="text-slate-400 text-xs hidden sm:inline">· Academic Management Platform</span>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center items-center gap-5 text-xs text-slate-400 dark:text-slate-500">
            {NAV_LINKS.map(l => (
              <button key={l.id} type="button" onClick={() => scrollToId(l.id)}
                className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">
                {l.label}
              </button>
            ))}
            <Link href="/privacy-policy" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/login" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors font-semibold text-slate-500 dark:text-slate-400">
              Login →
            </Link>
          </nav>
          <p className="text-xs text-slate-400 dark:text-slate-600">© 2026 AURA CAMPUS™ · Built on Next.js &amp; Supabase</p>
        </div>
      </footer>

      {/* back to top — above WhatsApp */}
      <button
        type="button"
        onClick={backToTop}
        className={`fixed bottom-20 right-6 z-50 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-500/30 border border-violet-500 flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          showBackTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="Back to top">
        <ArrowUp size={16} />
      </button>

      {/* WhatsApp floating button — wa-pulse keyframes live in LandingPage's
          style block, gated behind prefers-reduced-motion: no-preference */}
      <a
        href={`https://wa.me/${waNumber}?text=Hi,%20I%20want%20to%20know%20more%20about%20Aura%20ERP`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 group">
        <div className="wa-pulse w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-xl shadow-green-500/30 transition-colors">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <span className="absolute bottom-full right-0 mb-2 px-2.5 py-1 text-xs font-semibold bg-slate-900 dark:bg-slate-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
          Chat with us
        </span>
      </a>
    </>
  );
}
