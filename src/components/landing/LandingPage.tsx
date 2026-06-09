"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  GraduationCap, Users, BookOpen, Calendar, ClipboardList,
  Wallet, BarChart2, Shield, Zap, ArrowRight, Menu, X, Award,
  Briefcase, Mic2, BookText, Library, BadgePercent, Building2,
  ChevronRight, Activity, CheckCircle2, Layers, Database, Globe,
} from "lucide-react";

const FEATURES = [
  {
    icon: Calendar, label: "Smart Timetable",
    desc: "Drag-and-drop schedule builder with conflict detection and staff workload tracking.",
    color: "from-blue-500 to-cyan-500", border: "border-blue-500/20 hover:border-blue-500/40",
  },
  {
    icon: BadgePercent, label: "CIA / Internal Assessment",
    desc: "NAAC-aligned continuous internal assessment ledger with formula-based grade computation.",
    color: "from-violet-500 to-purple-500", border: "border-violet-500/20 hover:border-violet-500/40",
  },
  {
    icon: ClipboardList, label: "Exam Management",
    desc: "Hall tickets, seating plans, marks entry and automated result publication in one flow.",
    color: "from-orange-500 to-amber-500", border: "border-orange-500/20 hover:border-orange-500/40",
  },
  {
    icon: Library, label: "Curriculum & Syllabus",
    desc: "Unit-wise syllabus upload, teacher coverage tracking and student-facing progress view.",
    color: "from-emerald-500 to-teal-500", border: "border-emerald-500/20 hover:border-emerald-500/40",
  },
  {
    icon: BookText, label: "Lesson Plan Diary",
    desc: "Daily teaching log — topics, methods, hours. Admin oversight and staff accountability.",
    color: "from-pink-500 to-rose-500", border: "border-pink-500/20 hover:border-pink-500/40",
  },
  {
    icon: Mic2, label: "Guest Lectures",
    desc: "Expert talks, speaker profiles, attendance tracking. NAAC Criterion 1.3 evidence ready.",
    color: "from-indigo-500 to-blue-500", border: "border-indigo-500/20 hover:border-indigo-500/40",
  },
  {
    icon: Briefcase, label: "Internship Tracker",
    desc: "NAAC 1.2 & NIRF 5.2 ready — industrial training, certificates, PPO tracking per student.",
    color: "from-amber-500 to-yellow-500", border: "border-amber-500/20 hover:border-amber-500/40",
  },
  {
    icon: Award, label: "Results & Promotion",
    desc: "Automated promotion workflows, arrear management and graduation clearance in one place.",
    color: "from-teal-500 to-green-500", border: "border-teal-500/20 hover:border-teal-500/40",
  },
  {
    icon: Wallet, label: "Finance & Fee Management",
    desc: "Fee structures, online payments, concessions, salary processing and financial reports.",
    color: "from-green-500 to-emerald-500", border: "border-green-500/20 hover:border-green-500/40",
  },
  {
    icon: Users, label: "Staff Portal",
    desc: "Schedule, attendance, leave, salary slips and lesson diary — all in one staff hub.",
    color: "from-sky-500 to-blue-500", border: "border-sky-500/20 hover:border-sky-500/40",
  },
  {
    icon: GraduationCap, label: "Student Portal",
    desc: "Timetable, results, fees, CIA, attendance and syllabus — complete student self-service.",
    color: "from-purple-500 to-violet-500", border: "border-purple-500/20 hover:border-purple-500/40",
  },
  {
    icon: BarChart2, label: "NAAC / NIRF Reports",
    desc: "Auto-structured compliance data for NAAC accreditation and NIRF ranking submissions.",
    color: "from-rose-500 to-pink-500", border: "border-rose-500/20 hover:border-rose-500/40",
  },
];

const TECH = [
  {
    name: "Next.js 16",
    role: "App Router · Server Actions · Turbopack · Edge Runtime",
    badge: "▲",
    badgeClass: "bg-white text-black",
    cardClass: "bg-zinc-900 border-zinc-700/50 hover:border-zinc-500/60",
    nameClass: "text-white",
  },
  {
    name: "Supabase",
    role: "PostgreSQL · Auth · Realtime subscriptions · Edge Functions",
    badge: "⚡",
    badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    cardClass: "bg-emerald-950/40 border-emerald-800/30 hover:border-emerald-600/50",
    nameClass: "text-emerald-400",
  },
  {
    name: "TypeScript",
    role: "Strict end-to-end type safety · Zero `any` policy · Full inference",
    badge: "TS",
    badgeClass: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    cardClass: "bg-blue-950/30 border-blue-800/30 hover:border-blue-600/50",
    nameClass: "text-blue-400",
  },
  {
    name: "Tailwind CSS",
    role: "Utility-first · Dark mode · Responsive · Custom design system",
    badge: "🎨",
    badgeClass: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
    cardClass: "bg-cyan-950/30 border-cyan-800/30 hover:border-cyan-600/50",
    nameClass: "text-cyan-400",
  },
  {
    name: "PostgreSQL + RLS",
    role: "Row Level Security · Multi-tenant isolation · SECURITY DEFINER policies",
    badge: "🐘",
    badgeClass: "bg-sky-500/20 text-sky-400 border border-sky-500/30",
    cardClass: "bg-sky-950/30 border-sky-800/30 hover:border-sky-600/50",
    nameClass: "text-sky-400",
  },
  {
    name: "Vercel",
    role: "Global edge deployment · Instant rollbacks · CI/CD from Git",
    badge: "▼",
    badgeClass: "bg-slate-600/40 text-slate-300 border border-slate-500/30",
    cardClass: "bg-slate-800/40 border-slate-700/40 hover:border-slate-500/60",
    nameClass: "text-slate-200",
  },
];

const NAAC = [
  { code: "1.2", label: "Student Projects & Internships", module: "Internship Tracker" },
  { code: "1.3", label: "Experiential Learning / Expert Talks", module: "Guest Lecture Manager" },
  { code: "2.3", label: "Teaching-Learning Process", module: "Lesson Plan Diary" },
  { code: "2.4", label: "Teacher Quality & Syllabus Coverage", module: "Curriculum Manager" },
  { code: "2.6", label: "Student Performance & Outcomes", module: "CIA + Exam + Results" },
  { code: "5.2", label: "NIRF: Placement & Industrial Training", module: "Internship + NIRF Export" },
];

const COMPARE = [
  ["Setup Time",            "6–12 months",     "Same day"],
  ["NAAC-Aligned Modules",  "Manual export",   "Built-in, structured"],
  ["Student & Staff Portal","Separate purchase","Included — no add-ons"],
  ["Mobile Responsive",     "Rarely",          "Always — mobile-first"],
  ["Real-time Updates",     "Batch sync",      "Live via Supabase Realtime"],
  ["Multi-tenant",          "Single instance", "Native multi-institution"],
  ["Tech Stack",            "Proprietary lock","100% open: Next.js + Supabase"],
  ["Cost",                  "₹5–20L / year",   "A fraction of that"],
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled]  = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden scroll-smooth">

      {/* ── ambient glows ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-[40%] -left-40 w-[500px] h-[500px] bg-purple-700/8 rounded-full blur-3xl" />
        <div className="absolute top-[60%] -right-40 w-[500px] h-[500px] bg-indigo-700/8 rounded-full blur-3xl" />
      </div>

      {/* ══════════════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════════════ */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-slate-950/90 backdrop-blur-2xl border-b border-slate-800/70 shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center border border-violet-500 shadow-lg shadow-violet-500/30">
              <Building2 size={15} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">AURA</span>
            <span className="text-[9px] bg-violet-600/15 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded-full font-bold tracking-widest uppercase hidden sm:block">
              1.0
            </span>
          </div>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-7 text-[13px] text-slate-400 font-medium">
            {[
              { href: "#features", label: "Features" },
              { href: "#naac",     label: "NAAC / NIRF" },
              { href: "#why",      label: "Why AURA" },
              { href: "#tech",     label: "Tech Stack" },
              { href: "#contact",  label: "Contact" },
            ].map(l => (
              <a key={l.href} href={l.href} className="hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden md:flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-all border border-violet-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.03]"
            >
              Login <ArrowRight size={13} />
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden bg-slate-900/98 backdrop-blur-xl border-b border-slate-800 px-5 py-5 space-y-1">
            {[
              { href: "#features", label: "Features" },
              { href: "#naac",     label: "NAAC / NIRF" },
              { href: "#why",      label: "Why AURA" },
              { href: "#tech",     label: "Tech Stack" },
              { href: "#contact",  label: "Contact" },
            ].map(l => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                className="block py-2.5 text-sm text-slate-400 hover:text-white transition-colors border-b border-slate-800/60 last:border-none">
                {l.label}
              </a>
            ))}
            <div className="pt-3">
              <Link href="/login" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-lg w-fit transition-colors">
                Login <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center pt-12 pb-28 px-5 text-center">

        {/* Top badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/8 text-violet-300 text-xs font-semibold mb-8 backdrop-blur-sm">
          <Zap size={11} />
          Enterprise-Grade Academic Management · Built for Indian Institutions
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-[80px] font-black tracking-tighter leading-[0.92] max-w-4xl mb-6">
          The{" "}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Operating System
          </span>
          <br />
          for Modern{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Institutions
          </span>
        </h1>

        <p className="text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed mb-10">
          AURA unifies academics, finance, compliance and portals into one seamless platform —
          purpose-built for NAAC accreditation, NIRF rankings, and the way institutions actually work.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-4 mb-14">
          <Link href="/login"
            className="flex items-center gap-2 px-7 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-2xl shadow-violet-500/30 border border-violet-500 text-sm">
            Get Started Free <ArrowRight size={15} />
          </Link>
          <a href="#features"
            className="flex items-center gap-2 px-7 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
            Explore Features <ChevronRight size={15} />
          </a>
        </div>

        {/* Feature pill grid */}
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
          {[
            { Icon: Calendar,     label: "Timetable" },
            { Icon: BadgePercent, label: "CIA Ledger" },
            { Icon: ClipboardList,label: "Exam Planner" },
            { Icon: Library,      label: "Curriculum" },
            { Icon: BookText,     label: "Lesson Plans" },
            { Icon: Mic2,         label: "Guest Lectures" },
            { Icon: Briefcase,    label: "Internships" },
            { Icon: Award,        label: "Results" },
            { Icon: Wallet,       label: "Finance" },
            { Icon: Users,        label: "Staff Portal" },
            { Icon: GraduationCap,label: "Student Portal" },
            { Icon: BarChart2,    label: "NAAC Reports" },
          ].map(({ Icon, label }) => (
            <span key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/70 border border-slate-700/50 hover:border-violet-500/40 hover:bg-slate-900 rounded-full text-xs font-medium text-slate-400 hover:text-violet-300 transition-all cursor-default backdrop-blur-sm">
              <Icon size={11} className="text-violet-500 shrink-0" /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════════════ */}
      <div className="border-y border-slate-800/60 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "30+",    label: "Modules Built" },
            { value: "NAAC",   label: "Criterion Aligned" },
            { value: "4",      label: "Portal Types" },
            { value: "100%",   label: "Open-Source Stack" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                {s.value}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════ */}
      <section id="features" className="py-28 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400 mb-3">
              Platform Capabilities
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Everything an institution needs.
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                {" "}Nothing it doesn&apos;t.
              </span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
              12 tightly integrated modules covering every academic, administrative
              and compliance workflow — all in one platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {FEATURES.map(f => (
              <div key={f.label}
                className={`group relative rounded-2xl border bg-slate-900/50 hover:bg-slate-900/80 p-5 transition-all cursor-default ${f.border}`}>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <f.icon size={16} className="text-white" />
                </div>
                <h3 className="font-bold text-sm text-white mb-2">{f.label}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          NAAC / NIRF
      ══════════════════════════════════════════════════════════ */}
      <section id="naac" className="py-28 px-5 bg-gradient-to-b from-violet-950/25 via-purple-950/20 to-transparent border-y border-violet-900/20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400 mb-3">
              Compliance Built-In
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-5 leading-tight">
              NAAC &amp; NIRF ready.
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                Out of the box.
              </span>
            </h2>
            <p className="text-slate-400 leading-relaxed text-sm mb-8">
              AURA is designed around NAAC accreditation criteria and NIRF ranking parameters from day one.
              Every module captures data structured for direct evidence submission — no manual exports,
              no spreadsheet juggling, no last-minute panic before the committee visit.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full text-xs text-violet-300 font-semibold">
                <Shield size={11} /> NAAC Criteria 1–5
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs text-purple-300 font-semibold">
                <Award size={11} /> NIRF Parameters 1–9
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs text-indigo-300 font-semibold">
                <Database size={11} /> Structured Evidence Data
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {NAAC.map(item => (
              <div key={item.code}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-violet-500/30 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-violet-400">{item.code}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.module}</p>
                </div>
                <CheckCircle2 size={14} className="text-violet-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          WHY AURA
      ══════════════════════════════════════════════════════════ */}
      <section id="why" className="py-28 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400 mb-3">The Difference</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Why institutions choose{" "}
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                AURA
              </span>
            </h2>
            <p className="text-slate-400 max-w-md mx-auto text-sm">
              Modern, fast, and purpose-built — not a decade-old ERP re-skinned.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-800/80">
            {/* Header */}
            <div className="grid grid-cols-3 bg-slate-900 border-b border-slate-800">
              <div className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Capability</div>
              <div className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Legacy ERP</div>
              <div className="px-6 py-4 text-center">
                <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  AURA
                </span>
              </div>
            </div>
            {COMPARE.map(([cap, legacy, aura], i) => (
              <div key={cap}
                className={`grid grid-cols-3 border-b border-slate-800/50 last:border-none ${i % 2 === 0 ? "bg-slate-900/20" : ""}`}>
                <div className="px-6 py-3.5 text-xs font-semibold text-slate-300">{cap}</div>
                <div className="px-6 py-3.5 text-xs text-slate-500 text-center">{legacy}</div>
                <div className="px-6 py-3.5 text-center">
                  <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-violet-300">
                    <CheckCircle2 size={10} className="text-violet-400 shrink-0" />
                    {aura}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TECH STACK
      ══════════════════════════════════════════════════════════ */}
      <section id="tech" className="py-28 px-5 bg-slate-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400 mb-3">
              Built With The Best
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              A modern stack.{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Built to last.
              </span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
              AURA is built exclusively on open, battle-tested technologies.
              No vendor lock-in. No proprietary black boxes. No hidden costs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TECH.map(t => (
              <div key={t.name}
                className={`rounded-2xl border p-6 transition-all hover:scale-[1.02] cursor-default ${t.cardClass}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${t.badgeClass}`}>
                    {t.badge}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-black text-base mb-1.5 ${t.nameClass}`}>{t.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture note */}
          <div className="mt-10 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Layers size={18} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-1">Full-Stack Architecture</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Next.js App Router handles rendering. Supabase manages authentication, real-time subscriptions,
                and PostgreSQL with Row Level Security for bulletproof multi-tenant data isolation.
                TypeScript enforces correctness across the entire stack — frontend to database types.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════════════ */}
      <section className="py-28 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-violet-700/25 p-12 md:p-20 text-center">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 via-purple-950/60 to-indigo-900/50 -z-10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.25)_0%,_transparent_65%)] -z-10" />

            {/* Decorative grid */}
            <div
              className="absolute inset-0 opacity-[0.04] -z-10"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400 mb-5">
              Get Started Today
            </p>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-5 leading-tight">
              Ready to transform
              <br />
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
                your institution?
              </span>
            </h2>
            <p className="text-slate-400 mb-10 max-w-md mx-auto text-sm leading-relaxed">
              One platform. Every workflow. NAAC-ready from day one.
              Join institutions already running on AURA.
            </p>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition-all hover:scale-105 shadow-2xl shadow-violet-500/40 border border-violet-500 text-base">
              Start Now — It&apos;s Free <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CONTACT
      ══════════════════════════════════════════════════════════ */}
      <section id="contact" className="pb-12 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400">
            <Activity size={12} />
            Questions or demos? Reach us at{" "}
            <a href="mailto:hello@aura.edu.in"
              className="text-violet-400 hover:text-violet-300 hover:underline transition-colors font-semibold">
              hello@aura.edu.in
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-800/60 py-10 px-5 bg-slate-950/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center border border-violet-500">
              <Building2 size={13} className="text-white" />
            </div>
            <span className="text-sm font-black tracking-tight">AURA</span>
            <span className="text-slate-600 text-xs hidden sm:inline">
              · Academic Resource &amp; University Administration
            </span>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-5 text-xs text-slate-500">
            <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
            <a href="#naac"     className="hover:text-slate-300 transition-colors">NAAC / NIRF</a>
            <a href="#why"      className="hover:text-slate-300 transition-colors">Why AURA</a>
            <a href="#tech"     className="hover:text-slate-300 transition-colors">Tech Stack</a>
            <Link href="/login" className="hover:text-violet-400 transition-colors font-semibold text-slate-400">
              Login →
            </Link>
          </div>

          <p className="text-xs text-slate-600">
            © 2026 AURA · Built with Next.js &amp; Supabase
          </p>
        </div>
      </footer>
    </div>
  );
}
