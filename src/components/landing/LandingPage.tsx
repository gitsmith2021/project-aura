"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  GraduationCap, Users, Calendar, ClipboardList, Wallet, BarChart2,
  Shield, Zap, ArrowRight, ArrowUp, Menu, X, Award, Briefcase, Mic2,
  BookText, Library, BadgePercent, Building2, Activity, CheckCircle2,
  Layers, Database, Moon, Sun, Code2, Server, Cloud, Globe,
  Cpu, GitBranch,
} from "lucide-react";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

type DemoFormData = {
  institutionName: string;
  yourName: string;
  phone: string;
  institutionType: string;
};

const FEATURES = [
  { icon: Calendar,      label: "Smart Timetable",            span: 2,
    desc: "Drag-and-drop schedule builder with conflict detection and automatic staff workload balancing.",
    extra: ["Conflict auto-detection", "Staff workload views", "Print-ready PDF export"],
    color: "from-blue-500 to-cyan-500", light: "border-blue-200 bg-blue-50/70", dark: "dark:border-blue-500/20 dark:bg-blue-500/5" },
  { icon: BadgePercent,  label: "CIA / Continuous Assessment", span: 1,
    desc: "Formula-driven internal assessment ledger aligned with accreditation frameworks.",
    extra: [], color: "from-violet-500 to-purple-500", light: "border-violet-200 bg-violet-50/70", dark: "dark:border-violet-500/20 dark:bg-violet-500/5" },
  { icon: ClipboardList, label: "Exam Management",            span: 1,
    desc: "Hall tickets, seating arrangements, marks entry and automated result publication.",
    extra: [], color: "from-orange-500 to-amber-500", light: "border-orange-200 bg-orange-50/70", dark: "dark:border-orange-500/20 dark:bg-orange-500/5" },
  { icon: Library,       label: "Curriculum & Syllabus",      span: 1,
    desc: "Unit-wise syllabus management with real-time teacher coverage and student progress tracking.",
    extra: [], color: "from-emerald-500 to-teal-500", light: "border-emerald-200 bg-emerald-50/70", dark: "dark:border-emerald-500/20 dark:bg-emerald-500/5" },
  { icon: Mic2,          label: "Guest Lectures & Events",    span: 2,
    desc: "Expert talks, speaker profiles and attendance — accreditation evidence generated automatically.",
    extra: ["Speaker database", "Certificate generation", "Accreditation export"],
    color: "from-indigo-500 to-blue-500", light: "border-indigo-200 bg-indigo-50/70", dark: "dark:border-indigo-500/20 dark:bg-indigo-500/5" },
  { icon: BookText,      label: "Lesson Plan Diary",          span: 1,
    desc: "Daily teaching logs — topics, methods, hours — with full administrative oversight.",
    extra: [], color: "from-pink-500 to-rose-500", light: "border-pink-200 bg-pink-50/70", dark: "dark:border-pink-500/20 dark:bg-pink-500/5" },
  { icon: Award,         label: "Results & Promotion",        span: 1,
    desc: "Automated promotion workflows, backlogs management and graduation clearance.",
    extra: [], color: "from-teal-500 to-green-500", light: "border-teal-200 bg-teal-50/70", dark: "dark:border-teal-500/20 dark:bg-teal-500/5" },
  { icon: Wallet,        label: "Finance & Fee Management",   span: 2,
    desc: "Fee structures, online payments, concessions, staff payroll and financial reports — end to end.",
    extra: ["Online payment gateway", "Concession rules", "Staff payroll"],
    color: "from-green-500 to-emerald-500", light: "border-green-200 bg-green-50/70", dark: "dark:border-green-500/20 dark:bg-green-500/5" },
  { icon: Briefcase,     label: "Internship Tracker",         span: 1,
    desc: "Student training, certificate tracking and placement records for accreditation compliance.",
    extra: [], color: "from-amber-500 to-yellow-500", light: "border-amber-200 bg-amber-50/70", dark: "dark:border-amber-500/20 dark:bg-amber-500/5" },
  { icon: Users,         label: "Staff Portal",               span: 2,
    desc: "Schedule, attendance, leave applications and payslips — complete staff self-service hub.",
    extra: ["Leave management", "Digital payslips", "Personal timetable"],
    color: "from-sky-500 to-blue-500", light: "border-sky-200 bg-sky-50/70", dark: "dark:border-sky-500/20 dark:bg-sky-500/5" },
  { icon: GraduationCap, label: "Student Portal",             span: 1,
    desc: "Timetable, results, fees, assessments and syllabus — complete student self-service.",
    extra: [], color: "from-purple-500 to-violet-500", light: "border-purple-200 bg-purple-50/70", dark: "dark:border-purple-500/20 dark:bg-purple-500/5" },
  { icon: BarChart2,     label: "Accreditation Reports",      span: 1,
    desc: "Auto-structured compliance data for NAAC, NIRF, NBA and international accreditation submissions.",
    extra: [], color: "from-rose-500 to-pink-500", light: "border-rose-200 bg-rose-50/70", dark: "dark:border-rose-500/20 dark:bg-rose-500/5" },
];

const TECH = [
  { name: "Next.js 16",       role: "App Router · Server Actions · Turbopack · Edge Runtime",
    badge: "▲", badgeL: "bg-slate-900 text-white",        cardL: "bg-slate-100 border-slate-300",       nameL: "text-slate-900",
    badgeD: "dark:bg-white dark:text-black",              cardD: "dark:bg-zinc-900 dark:border-zinc-700",            nameD: "dark:text-white" },
  { name: "Supabase",         role: "PostgreSQL · Auth · Realtime · Row Level Security · Edge Functions",
    badge: "⚡", badgeL: "bg-emerald-100 text-emerald-700", cardL: "bg-emerald-50 border-emerald-200",  nameL: "text-emerald-700",
    badgeD: "dark:bg-emerald-500/20 dark:text-emerald-400", cardD: "dark:bg-emerald-950/40 dark:border-emerald-800/30", nameD: "dark:text-emerald-400" },
  { name: "TypeScript",       role: "Strict end-to-end type safety · Zero `any` · Full-stack inference",
    badge: "TS", badgeL: "bg-blue-100 text-blue-700",     cardL: "bg-blue-50 border-blue-200",          nameL: "text-blue-700",
    badgeD: "dark:bg-blue-500/20 dark:text-blue-400",     cardD: "dark:bg-blue-950/30 dark:border-blue-800/30",      nameD: "dark:text-blue-400" },
  { name: "Tailwind CSS v4",  role: "Utility-first · Dark mode · Responsive · Design tokens",
    badge: "🎨", badgeL: "bg-cyan-100 text-cyan-700",      cardL: "bg-cyan-50 border-cyan-200",          nameL: "text-cyan-700",
    badgeD: "dark:bg-cyan-500/20 dark:text-cyan-400",     cardD: "dark:bg-cyan-950/30 dark:border-cyan-800/30",      nameD: "dark:text-cyan-400" },
  { name: "PostgreSQL + RLS", role: "Row Level Security · Multi-tenant isolation · SECURITY DEFINER",
    badge: "🐘", badgeL: "bg-sky-100 text-sky-700",        cardL: "bg-sky-50 border-sky-200",            nameL: "text-sky-700",
    badgeD: "dark:bg-sky-500/20 dark:text-sky-400",       cardD: "dark:bg-sky-950/30 dark:border-sky-800/30",        nameD: "dark:text-sky-400" },
  { name: "Vercel Edge",      role: "Global edge deployment · Instant rollbacks · Git-based CI/CD",
    badge: "▼", badgeL: "bg-slate-200 text-slate-700",    cardL: "bg-slate-100 border-slate-300",       nameL: "text-slate-800",
    badgeD: "dark:bg-slate-600/40 dark:text-slate-300",   cardD: "dark:bg-slate-800/40 dark:border-slate-700/40",    nameD: "dark:text-slate-200" },
];

const ACCREDITATION = [
  { code: "1.2", label: "Student Projects & Internships",           module: "Internship Tracker" },
  { code: "1.3", label: "Experiential Learning / Expert Talks",     module: "Guest Lecture Manager" },
  { code: "2.3", label: "Teaching-Learning Process",                module: "Lesson Plan Diary" },
  { code: "2.4", label: "Teacher Quality & Syllabus Coverage",      module: "Curriculum Manager" },
  { code: "2.6", label: "Student Performance & Learning Outcomes",  module: "CIA + Exam + Results" },
  { code: "5.2", label: "Placement & Industrial Training",          module: "Internship + Ranking Export" },
  { code: "6.4", label: "Finance & Budget Management",              module: "Finance & Fee Module" },
  { code: "7.1", label: "Institutional Values & Best Practices",    module: "Reports & Compliance" },
];

const COMPARE = [
  ["Setup & Go Live",        "6–18 months",          "Same day ✓"],
  ["Setup & Onboarding",     "6–12 months",          "Same day, guided setup"],
  ["Accreditation-Ready",    "Manual spreadsheets",  "Built-in, structured data"],
  ["Student & Staff Portal", "Separate purchase",    "Included — no add-ons"],
  ["Mobile Responsive",      "Rarely, if ever",      "Always — mobile-first design"],
  ["Real-time Updates",      "Nightly batch sync",   "Live via Supabase Realtime"],
  ["Multi-Institution",      "Single instance",      "Native multi-tenant, isolated"],
  ["Tech Stack",             "Proprietary lock-in",  "Open: Next.js + Supabase"],
  ["Total Cost",             "High annual contracts","Transparent, fraction of cost"],
];

const HERO_ICONS = [
  { Icon: Code2,        s: 8,  top: "7%",  left: "4%",   color: "text-blue-400 dark:text-blue-500",      bg: "bg-blue-50/80   dark:bg-blue-500/10   border-blue-200/70 dark:border-blue-500/25",    delay: "0s",   dur: "5.2s" },
  { Icon: Zap,          s: 7,  top: "5%",  left: "22%",  color: "text-amber-400 dark:text-amber-500",    bg: "bg-amber-50/80  dark:bg-amber-500/10  border-amber-200/70 dark:border-amber-500/25",  delay: "1.1s", dur: "4.8s" },
  { Icon: Database,     s: 10, top: "9%",  left: "56%",  color: "text-sky-400 dark:text-sky-500",        bg: "bg-sky-50/80    dark:bg-sky-500/10    border-sky-200/70 dark:border-sky-500/25",      delay: "0.4s", dur: "5.6s" },
  { Icon: Globe,        s: 8,  top: "6%",  left: "76%",  color: "text-violet-400 dark:text-violet-500",  bg: "bg-violet-50/80 dark:bg-violet-500/10 border-violet-200/70 dark:border-violet-500/25",delay: "1.8s", dur: "4.5s" },
  { Icon: Cloud,        s: 9,  top: "8%",  left: "90%",  color: "text-purple-400 dark:text-purple-500",  bg: "bg-purple-50/80 dark:bg-purple-500/10 border-purple-200/70 dark:border-purple-500/25",delay: "0.7s", dur: "5.0s" },
  { Icon: Server,       s: 11, top: "22%", left: "5%",   color: "text-emerald-400 dark:text-emerald-500",bg: "bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200/70 dark:border-emerald-500/25",delay:"2.1s",dur:"5.3s" },
  { Icon: GitBranch,    s: 7,  top: "36%", left: "2%",   color: "text-orange-400 dark:text-orange-500",  bg: "bg-orange-50/80 dark:bg-orange-500/10 border-orange-200/70 dark:border-orange-500/25",delay: "0.3s", dur: "4.7s" },
  { Icon: Cpu,          s: 9,  top: "52%", left: "6%",   color: "text-pink-400 dark:text-pink-500",      bg: "bg-pink-50/80   dark:bg-pink-500/10   border-pink-200/70 dark:border-pink-500/25",    delay: "1.5s", dur: "5.8s" },
  { Icon: Layers,       s: 8,  top: "68%", left: "3%",   color: "text-teal-400 dark:text-teal-500",      bg: "bg-teal-50/80   dark:bg-teal-500/10   border-teal-200/70 dark:border-teal-500/25",    delay: "0.9s", dur: "4.4s" },
  { Icon: BookText,     s: 8,  top: "28%", left: "16%",  color: "text-indigo-400 dark:text-indigo-500",  bg: "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-200/70 dark:border-indigo-500/25",delay: "1.3s", dur: "5.1s" },
  { Icon: Library,      s: 7,  top: "72%", left: "19%",  color: "text-cyan-400 dark:text-cyan-500",      bg: "bg-cyan-50/80   dark:bg-cyan-500/10   border-cyan-200/70 dark:border-cyan-500/25",    delay: "2.4s", dur: "4.9s" },
  { Icon: Shield,       s: 8,  top: "30%", left: "80%",  color: "text-rose-400 dark:text-rose-500",      bg: "bg-rose-50/80   dark:bg-rose-500/10   border-rose-200/70 dark:border-rose-500/25",    delay: "0.6s", dur: "5.5s" },
  { Icon: BarChart2,    s: 10, top: "68%", left: "77%",  color: "text-blue-400 dark:text-blue-500",      bg: "bg-blue-50/80   dark:bg-blue-500/10   border-blue-200/70 dark:border-blue-500/25",    delay: "1.7s", dur: "4.6s" },
  { Icon: Award,        s: 9,  top: "22%", left: "91%",  color: "text-amber-400 dark:text-amber-500",    bg: "bg-amber-50/80  dark:bg-amber-500/10  border-amber-200/70 dark:border-amber-500/25",  delay: "2.2s", dur: "5.4s" },
  { Icon: Calendar,     s: 7,  top: "42%", left: "94%",  color: "text-violet-400 dark:text-violet-500",  bg: "bg-violet-50/80 dark:bg-violet-500/10 border-violet-200/70 dark:border-violet-500/25",delay: "0.2s", dur: "4.3s" },
  { Icon: Users,        s: 11, top: "58%", left: "88%",  color: "text-emerald-400 dark:text-emerald-500",bg: "bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200/70 dark:border-emerald-500/25",delay:"1.0s",dur:"5.7s" },
  { Icon: GraduationCap,s: 9,  top: "88%", left: "10%",  color: "text-purple-400 dark:text-purple-500",  bg: "bg-purple-50/80 dark:bg-purple-500/10 border-purple-200/70 dark:border-purple-500/25",delay: "1.6s", dur: "5.2s" },
  { Icon: Briefcase,    s: 8,  top: "90%", left: "38%",  color: "text-sky-400 dark:text-sky-500",        bg: "bg-sky-50/80    dark:bg-sky-500/10    border-sky-200/70 dark:border-sky-500/25",      delay: "0.5s", dur: "4.8s" },
  { Icon: Mic2,         s: 7,  top: "87%", left: "62%",  color: "text-pink-400 dark:text-pink-500",      bg: "bg-pink-50/80   dark:bg-pink-500/10   border-pink-200/70 dark:border-pink-500/25",    delay: "1.9s", dur: "5.0s" },
  { Icon: Wallet,       s: 9,  top: "89%", left: "84%",  color: "text-teal-400 dark:text-teal-500",      bg: "bg-teal-50/80   dark:bg-teal-500/10   border-teal-200/70 dark:border-teal-500/25",    delay: "0.8s", dur: "5.5s" },
];

const INPUT_CLS = "w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 transition-colors";

export function LandingPage() {
  const [isDark,        setIsDark]        = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [scrolled,      setScrolled]      = useState(false);
  const [showBackTop,   setShowBackTop]   = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [techExpanded,  setTechExpanded]  = useState(false);
  const [demoForm,      setDemoForm]      = useState<DemoFormData>({
    institutionName: "", yourName: "", phone: "", institutionType: "",
  });

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 24);
      setShowBackTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

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

  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919XXXXXXXXX";

  const NAV_LINKS = [
    { id: "features", label: "Features" },
    { id: "naac",     label: "Accreditation" },
    { id: "why",      label: "Why AURA" },
    { id: "pricing",  label: "Pricing" },
    { id: "tech",     label: "Tech Stack" },
    { id: "contact",  label: "Contact" },
  ];

  return (
    <div className={isDark ? "dark" : ""}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-10px) rotate(0.5deg); }
          66%       { transform: translateY(-5px) rotate(-0.5deg); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes waPulse {
          0%   { box-shadow: 0 0 0 0 rgba(22,163,74,0.65); }
          70%  { box-shadow: 0 0 0 14px rgba(22,163,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
        }
        .float-icon { animation: float var(--dur,5s) ease-in-out var(--delay,0s) infinite; }
        .grid-pulse  { animation: gridPulse 7s ease-in-out infinite; }
        .wa-pulse    { animation: waPulse 2.2s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden transition-colors duration-300">

        {/* ambient glows */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-violet-300/15 dark:bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute top-[40%] -left-40 w-[500px] h-[500px] bg-purple-300/10 dark:bg-purple-700/8 rounded-full blur-3xl" />
          <div className="absolute top-[60%] -right-40 w-[500px] h-[500px] bg-indigo-300/10 dark:bg-indigo-700/8 rounded-full blur-3xl" />
        </div>

        {/* ════════════════════ NAVBAR ════════════════════ */}
        <header role="banner" className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800/70 shadow-sm"
            : "bg-transparent"
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center border border-violet-500 shadow-lg shadow-violet-500/30">
                <Building2 size={15} className="text-white" />
              </div>
              <span className="text-xl font-black tracking-tight">AURA</span>
              <span className="text-[9px] bg-violet-100 dark:bg-violet-600/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/25 px-1.5 py-0.5 rounded-full font-bold tracking-widest uppercase hidden sm:block">Platform</span>
            </div>

            <nav role="navigation" aria-label="Main navigation" className="hidden md:flex items-center gap-6 text-[13px] text-slate-500 dark:text-slate-400 font-medium">
              {NAV_LINKS.map(l => (
                <button key={l.id} type="button" onClick={() => scrollTo(l.id)}
                  className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                  {l.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsDark(d => !d)}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <Link href="/login"
                className="hidden md:flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-all border border-violet-500 shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.03]">
                Login <ArrowRight size={13} />
              </Link>
              <button type="button" onClick={() => setMenuOpen(o => !o)}
                className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}>
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav aria-label="Mobile navigation" className="md:hidden bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-0.5">
              {NAV_LINKS.map(l => (
                <button key={l.id} type="button"
                  onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                  className="block w-full text-left py-3 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors border-b border-slate-100 dark:border-slate-800 last:border-none font-medium">
                  {l.label}
                </button>
              ))}
              <div className="pt-3">
                <Link href="/login" onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors">
                  Login <ArrowRight size={14} />
                </Link>
              </div>
            </nav>
          )}
        </header>

        <main>
          {/* ════════════════════ HERO ════════════════════ */}
          <section aria-label="Hero" className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center pt-10 pb-20 px-4 sm:px-6 overflow-hidden">

            <div className="absolute inset-0 -z-10 grid-pulse"
              style={{
                backgroundImage: "linear-gradient(rgba(139,92,246,0.09) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.09) 1px,transparent 1px)",
                backgroundSize: "56px 56px",
              }} />
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_55%_at_50%_45%,rgba(255,255,255,0)_30%,rgba(255,255,255,0.97)_100%)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_45%,rgba(15,23,42,0)_30%,rgba(15,23,42,0.97)_100%)]" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-violet-50/60 via-transparent to-white dark:from-violet-950/20 dark:via-transparent dark:to-slate-950" />

            {HERO_ICONS.map(({ Icon, s, top, left, color, bg, delay, dur }, i) => (
              <div key={i}
                className={`float-icon absolute hidden sm:flex items-center justify-center rounded-xl border backdrop-blur-sm shadow-sm pointer-events-none ${bg} ${color}`}
                style={{ top, left, width: `${s * 4}px`, height: `${s * 4}px`, "--delay": delay, "--dur": dur } as React.CSSProperties}
                aria-hidden="true">
                <Icon size={Math.round(s * 1.6)} />
              </div>
            ))}

            {/* 2-column hero content */}
            <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-10 lg:gap-14">

              {/* LEFT: headline + trust + pills */}
              <div className="flex-1 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/8 text-violet-600 dark:text-violet-300 text-xs font-semibold mb-7">
                  <Zap size={11} /> Purpose-built Academic Management · Trusted by Educational Institutions Worldwide
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[76px] font-black tracking-tighter leading-[0.92] mb-5">
                  The{" "}
                  <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent">
                    Academic ERP
                  </span>
                  <br className="hidden sm:block" />{" "}
                  that actually{" "}
                  <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    works.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  AURA replaces disconnected spreadsheets, outdated portals and manual accreditation work with one unified platform —
                  built for colleges, universities and vocational institutes that demand more.
                </p>

                {/* India trust badges */}
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-7">
                  {[
                    "✓ UGC / AICTE Workflow Ready",
                    "✓ Razorpay Payments Built-in",
                    "✓ DPDP Act 2023 Compliant",
                    "✓ Hosted in India (Supabase)",
                  ].map(badge => (
                    <span key={badge}
                      className="inline-flex items-center px-3 py-1 rounded-full border border-slate-300 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-800/40 hover:border-teal-400 dark:hover:border-teal-500/60 hover:text-teal-700 dark:hover:text-teal-300 transition-colors cursor-default">
                      {badge}
                    </span>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest mb-4 text-center lg:text-left">
                  Covering every academic workflow
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 max-w-2xl">
                  {[
                    { Icon: Calendar,       label: "Timetable" },
                    { Icon: BadgePercent,   label: "CIA Ledger" },
                    { Icon: ClipboardList,  label: "Exam Planner" },
                    { Icon: Library,        label: "Curriculum" },
                    { Icon: BookText,       label: "Lesson Plans" },
                    { Icon: Mic2,           label: "Guest Lectures" },
                    { Icon: Briefcase,      label: "Internships" },
                    { Icon: Award,          label: "Results" },
                    { Icon: Wallet,         label: "Finance" },
                    { Icon: Users,          label: "Staff Portal" },
                    { Icon: GraduationCap,  label: "Student Portal" },
                    { Icon: BarChart2,      label: "Reports" },
                  ].map(({ Icon, label }) => (
                    <span key={label}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/50 hover:border-violet-300 dark:hover:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-slate-900 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-300 transition-all cursor-default shadow-sm">
                      <Icon size={11} className="text-violet-500 shrink-0" /> {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* RIGHT: Demo form */}
              <div className="w-full lg:w-[420px] flex-shrink-0">
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
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Join early access institutions across India.</p>

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

                      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                        ⚡ We&apos;ll call you within 2 hours on working days.
                      </p>
                    </form>

                    <button type="button" onClick={() => scrollTo("features")}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all text-sm">
                      Explore Features
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ════════════════════ STATS BAR ════════════════════ */}
          <div className="border-y border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: "30+",       label: "Modules" },
                { value: "NAAC 1–7",  label: "Criteria Covered" },
                { value: "₹0",        label: "Setup Fee" },
                { value: "Same-Day",  label: "Onboarding" },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">{s.value}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-semibold uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════════ PRODUCT PREVIEW ════════════════════ */}
          <section aria-label="Product preview" className="py-20 sm:py-24 px-4 sm:px-6 bg-white dark:bg-transparent">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">Product Preview</p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                  Clean. Fast. Built for how you actually work.
                </h2>
              </div>

              {/* browser-frame mockup */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/60 shadow-2xl shadow-slate-200/60 dark:shadow-none">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white dark:bg-slate-700/80 rounded-md px-3 py-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    app.aura.edu/dashboard
                  </div>
                </div>
                <div className="bg-gradient-to-br from-violet-50 via-purple-50/60 to-indigo-50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-indigo-950/30 h-64 sm:h-80 flex items-center justify-center">
                  <div className="text-center px-6">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800/60 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center mx-auto mb-4 shadow-md">
                      <BarChart2 size={28} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Dashboard Preview</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Screenshot coming soon</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                {[
                  { icon: "⚡", text: "Real-time sync across all portals" },
                  { icon: "🎯", text: "Role-based access for every stakeholder" },
                  { icon: "📊", text: "One-click NAAC evidence export" },
                ].map(c => (
                  <div key={c.text} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-xl leading-none mt-0.5 shrink-0">{c.icon}</span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ════════════════════ SOCIAL PROOF ════════════════════ */}
          <section aria-label="Social proof" className="py-16 sm:py-20 px-4 sm:px-6 bg-slate-50/80 dark:bg-slate-900/20 border-y border-slate-100 dark:border-slate-800/40">
            <div className="max-w-5xl mx-auto">
              <p className="text-[11px] font-bold uppercase tracking-widest text-center text-slate-400 dark:text-slate-500 mb-8 letter-spacing-wider">
                Currently Onboarding Early Access Institutions
              </p>

              <div className="grid sm:grid-cols-3 gap-4 sm:gap-5 mb-7">
                {[
                  { init: "EC", name: "Engineering College, Tamil Nadu",   quote: "Finally, a system that understands our NAAC workflow." },
                  { init: "AC", name: "Autonomous College, Kerala",        quote: "Setup took one day. Our staff actually use it." },
                  { init: "VI", name: "Vocational Institute, Maharashtra", quote: "The timetable AI alone is worth the price." },
                ].map(t => (
                  <div key={t.name}
                    className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 p-5 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-700/40 transition-all">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-violet-600 dark:text-violet-400">{t.init}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{t.name}</p>
                        <span className="inline-block text-[10px] font-semibold bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/25 px-2 py-0.5 rounded-full mt-1">
                          Early Access Partner
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-700/40 p-5 text-center">
                <p className="text-sm text-violet-800 dark:text-violet-300 font-medium leading-relaxed">
                  🚀 Aura is currently in early access with pilot institutions across India.
                  Spots are limited — join now to shape the product.
                </p>
              </div>
            </div>
          </section>

          {/* ════════════════════ FEATURES BENTO ════════════════════ */}
          <section id="features" aria-label="Platform features" className="py-24 sm:py-28 px-4 sm:px-6 bg-white dark:bg-transparent">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Platform Capabilities</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
                  Every workflow your institution runs.
                  <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {" "}One platform.
                  </span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
                  12 tightly integrated modules — no duct-tape integrations, no data silos, no separate vendors.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {FEATURES.map(f => {
                  const isWide = f.span === 2;
                  return (
                    <article key={f.label}
                      className={`group rounded-2xl border p-4 sm:p-5 lg:p-6 transition-all cursor-default hover:shadow-lg hover:-translate-y-0.5 ${isWide ? "col-span-2" : "col-span-1"} ${f.light} ${f.dark}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-md shrink-0`}>
                          <f.icon size={18} className="text-white" />
                        </div>
                        <h3 className={`font-bold text-slate-800 dark:text-white leading-tight pt-1 ${isWide ? "text-sm sm:text-base" : "text-sm"}`}>
                          {f.label}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                      {isWide && f.extra.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-current/10">
                          {f.extra.map(e => (
                            <span key={e} className="inline-flex items-center gap-1 text-[11px] font-semibold text-current/70 bg-current/5 px-2.5 py-1 rounded-full border border-current/10">
                              <CheckCircle2 size={9} /> {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ════════════════════ WHO IS AURA FOR ════════════════════ */}
          <section id="who" aria-label="Who is Aura for" className="py-24 sm:py-28 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/20">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">For Every Institution</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
                  Built for every type of institution.
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
                  Whether you run one campus or twenty — Aura scales with you.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {[
                  { icon: "🏛️", title: "Engineering Colleges",    desc: "AICTE-affiliated. NAAC-ready. AI timetabling that handles complex lab + lecture constraints." },
                  { icon: "🎓", title: "Arts & Science Colleges", desc: "Autonomous or affiliated. CIA ledger, lesson plans, and accreditation exports out of the box." },
                  { icon: "🏫", title: "School Chains",           desc: "Multi-campus CBSE/ICSE groups. One dashboard for every campus, every class, every parent." },
                  { icon: "🔬", title: "Deemed Universities",     desc: "Multi-department. Multi-programme. Full governance, finance, and HR in one platform." },
                  { icon: "📚", title: "Vocational & ITI",        desc: "Batch management, skill tracking, NSDC-aligned reporting. Certificates auto-generated." },
                  { icon: "🏢", title: "Coaching Centres",        desc: "JEE/NEET coaching chains. Batch scheduling, fee collection, result tracking. Fast setup." },
                ].map(c => (
                  <article key={c.title}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/60 p-5 sm:p-6 hover:border-violet-300 dark:hover:border-violet-500/30 hover:shadow-md transition-all cursor-default">
                    <div className="text-3xl mb-3">{c.icon}</div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base mb-2">{c.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{c.desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ════════════════════ ACCREDITATION ════════════════════ */}
          <section id="naac" aria-label="Accreditation alignment" className="py-24 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-violet-50 via-purple-50/50 to-white dark:from-violet-950/25 dark:via-purple-950/20 dark:to-transparent border-y border-violet-100 dark:border-violet-900/20">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Compliance Built-In</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-5 leading-tight">
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
                    { Icon: Shield,   label: "NAAC Criteria 1–7",   c: "bg-violet-100 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300" },
                    { Icon: Award,    label: "NIRF Rankings",        c: "bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300" },
                    { Icon: Database, label: "Structured Evidence",  c: "bg-indigo-100 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300" },
                  ].map(b => (
                    <span key={b.label} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-semibold ${b.c}`}>
                      <b.Icon size={11} /> {b.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {ACCREDITATION.map(item => (
                  <div key={item.code}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/70 hover:border-violet-300 dark:hover:border-violet-500/30 transition-colors shadow-sm dark:shadow-none">
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

          {/* ════════════════════ WHY AURA ════════════════════ */}
          <section id="why" aria-label="Why choose AURA" className="py-24 sm:py-28 px-4 sm:px-6 bg-white dark:bg-transparent">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">The Difference</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
                  Not another legacy ERP.
                  <br />
                  <span className="bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent">
                    Something genuinely better.
                  </span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
                  Traditional academic ERP systems were built for a world that no longer exists. AURA is built for today.
                </p>
              </div>
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none">
                <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <div className="px-4 sm:px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Capability</div>
                  <div className="px-4 sm:px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Legacy ERP</div>
                  <div className="px-4 sm:px-6 py-4 text-center">
                    <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">AURA</span>
                  </div>
                </div>
                {COMPARE.map(([cap, legacy, aura], i) => (
                  <div key={cap} className={`grid grid-cols-3 border-b border-slate-100 dark:border-slate-800/50 last:border-none ${i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50/60 dark:bg-slate-900/20"}`}>
                    <div className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{cap}</div>
                    <div className="px-4 sm:px-6 py-3.5 text-xs text-slate-400 dark:text-slate-500 text-center">{legacy}</div>
                    <div className="px-4 sm:px-6 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                        <CheckCircle2 size={10} className="text-violet-500 dark:text-violet-400 shrink-0" />{aura}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ════════════════════ TECH STACK ════════════════════ */}
          <section id="tech" aria-label="Technology stack" className="py-24 sm:py-28 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/20">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Built With The Best</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
                  Enterprise-grade stack.
                  <br />
                  <span className="bg-gradient-to-r from-violet-600 to-cyan-500 dark:from-violet-400 dark:to-cyan-400 bg-clip-text text-transparent">Zero vendor lock-in.</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
                  Every piece of the stack is open, battle-tested and designed to scale from one college to a hundred.
                </p>
              </div>

              {/* collapsible summary + toggle */}
              <div className="mb-6 p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 flex items-center justify-between gap-4 shadow-sm dark:shadow-none">
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Built on <span className="font-semibold text-slate-800 dark:text-slate-200">Next.js 16 · Supabase · TypeScript · Vercel Edge</span>
                </p>
                <button
                  type="button"
                  onClick={() => setTechExpanded(e => !e)}
                  className="shrink-0 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors whitespace-nowrap">
                  {techExpanded ? "Hide stack ↑" : "See full stack ↓"}
                </button>
              </div>

              {techExpanded && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
                  {TECH.map(t => (
                    <article key={t.name} className={`rounded-2xl border p-5 sm:p-6 transition-all hover:scale-[1.02] hover:shadow-lg cursor-default ${t.cardL} ${t.cardD}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${t.badgeL} ${t.badgeD}`}>{t.badge}</div>
                        <div className="min-w-0">
                          <h3 className={`font-black text-base mb-1.5 ${t.nameL} ${t.nameD}`}>{t.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.role}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm dark:shadow-none">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center shrink-0">
                  <Layers size={18} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mb-1">Full-Stack Architecture</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Next.js App Router handles server-side rendering and edge delivery. Supabase manages authentication, real-time subscriptions and PostgreSQL with Row Level Security for bulletproof multi-tenant data isolation. TypeScript enforces correctness across the entire stack.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════ PRICING ════════════════════ */}
          <section id="pricing" aria-label="Pricing" className="py-24 sm:py-28 px-4 sm:px-6 bg-white dark:bg-transparent">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Pricing</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3">
                  Simple, transparent pricing.
                </h2>
                <p className="text-lg font-semibold bg-gradient-to-r from-teal-600 to-violet-600 dark:from-teal-400 dark:to-violet-400 bg-clip-text text-transparent">
                  No surprises. No consultants.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-5 sm:gap-6 items-stretch">

                {/* Starter */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/60 p-6 sm:p-7 flex flex-col shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Starter</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mb-1">₹3,000 – ₹8,000</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">/ month</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Coaching centres, small institutes</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-5">Up to 500 students</p>
                  <ul className="space-y-2 mb-7 flex-1">
                    {["Attendance", "Fee Collection", "Marks & Results", "Timetable", "Student Portal"].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle2 size={12} className="text-teal-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => scrollTo("contact")}
                    className="w-full py-2.5 rounded-xl border border-violet-200 dark:border-violet-700/40 text-sm font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                    Start Free Trial
                  </button>
                </div>

                {/* Growth — Most Popular */}
                <div className="rounded-2xl border-2 border-violet-500 dark:border-violet-500/70 bg-white dark:bg-slate-900/80 p-6 sm:p-7 flex flex-col shadow-xl shadow-violet-100/40 dark:shadow-violet-900/20 relative">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                      Most Popular
                    </span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-4 mt-2">Growth</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mb-1">₹15,000 – ₹40,000</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">/ month</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Colleges &amp; autonomous institutions</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-5">500 – 3,000 students</p>
                  <ul className="space-y-2 mb-7 flex-1">
                    {[
                      "Everything in Starter",
                      "NAAC Exports",
                      "CIA Ledger",
                      "Hall Tickets",
                      "HR & Payroll",
                      "Accreditation Reports",
                      "Guest Lectures",
                      "Lesson Plans",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle2 size={12} className="text-violet-500 shrink-0" />
                        {f === "Everything in Starter" ? <span className="font-semibold text-violet-600 dark:text-violet-400">{f}</span> : f}
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => scrollTo("contact")}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all hover:scale-[1.02] shadow-md shadow-violet-500/20 border border-violet-500">
                    Schedule a Demo
                  </button>
                </div>

                {/* Enterprise */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800/70 bg-white dark:bg-slate-900/60 p-6 sm:p-7 flex flex-col shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Enterprise</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mb-1">Custom pricing</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">&nbsp;</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Universities &amp; multi-campus chains</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-5">3,000+ students</p>
                  <ul className="space-y-2 mb-7 flex-1">
                    {[
                      "Everything in Growth",
                      "Multi-campus",
                      "NAAC SSR Builder",
                      "Dedicated Support",
                      "SLA Guarantee",
                      "Custom Integrations",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle2 size={12} className="text-teal-500 shrink-0" />
                        {f === "Everything in Growth" ? <span className="font-semibold text-teal-600 dark:text-teal-400">{f}</span> : f}
                      </li>
                    ))}
                  </ul>
                  <a href="mailto:hello@aura.edu"
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-center block">
                    Contact Us
                  </a>
                </div>
              </div>

              <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
                No implementation fees. No 6-month setup. Cancel anytime. Prices in INR + GST.
              </p>
            </div>
          </section>

          {/* ════════════════════ CTA BANNER ════════════════════ */}
          <section aria-label="Call to action" className="py-24 sm:py-28 px-4 sm:px-6 bg-white dark:bg-transparent">
            <div className="max-w-4xl mx-auto">
              <div className="relative rounded-3xl overflow-hidden border border-violet-200 dark:border-violet-700/25 p-10 sm:p-16 md:p-20 text-center shadow-xl shadow-violet-100/60 dark:shadow-none">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-900/50 dark:via-purple-950/60 dark:to-indigo-900/50 -z-10" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.12)_0%,_transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.25)_0%,_transparent_65%)] -z-10" />
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] -z-10"
                  style={{ backgroundImage: "linear-gradient(rgba(0,0,0,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.5) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

                <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-5">Get Started Today</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-5 leading-tight">
                  Stop managing chaos.
                  <br />
                  <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 dark:from-violet-300 dark:via-fuchsia-300 dark:to-pink-300 bg-clip-text text-transparent">
                    Start running your institution.
                  </span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto text-sm leading-relaxed">
                  No 6-month implementation. No ₹50L consulting fees. One platform, every workflow, accreditation-ready from day one.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <button type="button" onClick={() => scrollTo("features")}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition-all hover:scale-105 shadow-2xl shadow-violet-500/30 border border-violet-500 text-base">
                    Schedule a Free Demo <ArrowRight size={18} />
                  </button>
                  <button type="button" onClick={() => scrollTo("features")}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-white font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:border-violet-300 transition-all text-base">
                    See All Features
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════ CONTACT ════════════════════ */}
          <section id="contact" aria-label="Contact" className="pb-12 px-4 sm:px-6 bg-white dark:bg-transparent">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex flex-wrap justify-center items-center gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                <Activity size={12} />
                Questions, demos or custom requirements?
                <a href="mailto:hello@aura.edu" className="text-violet-600 dark:text-violet-400 hover:underline font-semibold transition-colors">
                  hello@aura.edu
                </a>
              </div>
            </div>
          </section>
        </main>

        {/* ════════════════════ FOOTER ════════════════════ */}
        <footer role="contentinfo" className="border-t border-slate-200 dark:border-slate-800/60 py-10 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950/80">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center border border-violet-500">
                <Building2 size={13} className="text-white" />
              </div>
              <span className="text-sm font-black tracking-tight">AURA</span>
              <span className="text-slate-400 text-xs hidden sm:inline">· Academic ERP for Educational Institutions</span>
            </div>
            <nav aria-label="Footer navigation" className="flex flex-wrap justify-center items-center gap-5 text-xs text-slate-400 dark:text-slate-500">
              {NAV_LINKS.map(l => (
                <button key={l.id} type="button" onClick={() => scrollTo(l.id)}
                  className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">
                  {l.label}
                </button>
              ))}
              <Link href="/login" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors font-semibold text-slate-500 dark:text-slate-400">
                Login →
              </Link>
            </nav>
            <p className="text-xs text-slate-400 dark:text-slate-600">© 2026 AURA · Built on Next.js &amp; Supabase</p>
          </div>
        </footer>

        {/* back to top — above WhatsApp */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`fixed bottom-20 right-6 z-50 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-500/30 border border-violet-500 flex items-center justify-center transition-all duration-300 hover:scale-110 ${
            showBackTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
          aria-label="Back to top">
          <ArrowUp size={16} />
        </button>

        {/* WhatsApp floating button */}
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

      </div>
    </div>
  );
}
