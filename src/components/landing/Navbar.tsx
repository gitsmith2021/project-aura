"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Building2, Menu, Moon, Sun, X } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "./SmoothScrollProvider";
import { NAV_LINKS } from "./data";

type NavbarProps = {
  isDark: boolean;
  onToggleDark: () => void;
};

export function Navbar({ isDark, onToggleDark }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { scrollToId } = useLenis();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(headerRef.current, {
      y: -64, opacity: 0, duration: 0.8, delay: 0.8, ease: "power3.out",
    });
  }, { scope: headerRef });

  function go(id: string) {
    setMenuOpen(false);
    scrollToId(id);
  }

  return (
    <header
      ref={headerRef}
      role="banner"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-white/80 dark:bg-slate-950/90 border-b border-white/20 dark:border-slate-800/70 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center border border-violet-500 shadow-lg shadow-violet-500/30">
            <Building2 size={15} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-500 to-fuchsia-400 bg-clip-text text-transparent">
            AURA
          </span>
          <span className="text-[9px] bg-violet-100 dark:bg-violet-600/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/25 px-1.5 py-0.5 rounded-full font-bold tracking-widest uppercase hidden sm:block">
            Platform
          </span>
        </div>

        <nav role="navigation" aria-label="Main navigation"
          className={`hidden md:flex items-center gap-6 text-[13px] font-medium ${
            scrolled ? "text-slate-500 dark:text-slate-400" : "text-slate-300"
          }`}>
          {NAV_LINKS.map(l => (
            <button key={l.id} type="button" onClick={() => go(l.id)}
              className={`transition-colors cursor-pointer ${
                scrolled
                  ? "hover:text-slate-900 dark:hover:text-white"
                  : "hover:text-white"
              }`}>
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onToggleDark}
            className={`p-2 rounded-lg transition-colors ${
              scrolled
                ? "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link href="/login"
            className="hidden md:flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-full transition-all border border-violet-500 shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.03]">
            Login <ArrowRight size={13} />
          </Link>
          <button type="button" onClick={() => setMenuOpen(o => !o)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled
                ? "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                : "text-slate-300 hover:bg-white/10"
            }`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="Mobile navigation"
          className="md:hidden bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-0.5">
          {NAV_LINKS.map(l => (
            <button key={l.id} type="button" onClick={() => go(l.id)}
              className="block w-full text-left py-3 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors border-b border-slate-100 dark:border-slate-800 last:border-none font-medium">
              {l.label}
            </button>
          ))}
          <div className="pt-3">
            <Link href="/login" onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-full transition-colors">
              Login <ArrowRight size={14} />
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
