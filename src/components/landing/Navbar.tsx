"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Building2, Menu, X } from "lucide-react";
import { useLenis } from "./SmoothScrollProvider";
import { NAV_LINKS } from "./data";

// No JS entrance animation here — the navbar must never be hidden by a
// missed tween. Styling transitions are pure CSS.
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollToId } = useLenis();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function go(id: string) {
    setMenuOpen(false);
    scrollToId(id);
  }

  return (
    <header
      role="banner"
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-white/80 border-b border-slate-200/70 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center border border-violet-500 shadow-lg shadow-violet-500/30">
            <Building2 size={15} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
            AURA CAMPUS<sup className="text-[11px] ml-0.5 font-black not-italic">™</sup>
          </span>
        </div>

        <nav role="navigation" aria-label="Main navigation"
          className="hidden md:flex items-center gap-6 text-[13px] font-medium text-slate-500">
          {NAV_LINKS.map(l => (
            <button key={l.id} type="button" onClick={() => go(l.id)}
              className="hover:text-slate-900 transition-colors cursor-pointer">
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Login is always visible — never tucked inside the mobile menu. */}
          <Link href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-[13px] sm:text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-full transition-all border border-violet-500 shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.03]">
            Login <ArrowRight size={13} />
          </Link>
          <button type="button" onClick={() => setMenuOpen(o => !o)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="Mobile navigation"
          className="md:hidden bg-white/98 backdrop-blur-xl border-b border-slate-200 px-4 py-4 space-y-0.5">
          {NAV_LINKS.map(l => (
            <button key={l.id} type="button" onClick={() => go(l.id)}
              className="block w-full text-left py-3 text-sm text-slate-600 hover:text-slate-900 transition-colors border-b border-slate-100 last:border-none font-medium">
              {l.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
