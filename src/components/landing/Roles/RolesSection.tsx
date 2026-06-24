"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2, TrendingUp, Landmark, ShieldCheck, Layers, BookOpen, GraduationCap, Users, Handshake,
  type LucideIcon,
} from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "../SmoothScrollProvider";

/* ── Role data — people, not modules ──────────────────────────────────────── */

type RolePreview = {
  portal: string;
  kpis: { label: string; value: string }[];
  bars?: { label: string; pct: number }[];
  list?: { label: string; tag: string; ok?: boolean }[];
};

type Role = {
  key: string;
  label: string;
  Icon: LucideIcon;
  accent: string;       // hex — drives icon chip, bars, check marks
  headline: string;
  description: string;
  highlights: string[];
  preview: RolePreview;
};

const ROLES: Role[] = [
  {
    key: "management", label: "Management", Icon: TrendingUp, accent: "#7C3AED",
    headline: "Gain complete visibility across your institution.",
    description: "Monitor institutional performance, revenue, accreditation readiness, and operational efficiency from a single executive dashboard.",
    highlights: ["Executive Dashboards", "Fee Collection Insights", "Department Performance", "Accreditation Readiness", "Institution-wide Analytics"],
    preview: {
      portal: "executive",
      kpis: [{ label: "Revenue (YTD)", value: "₹2.4 Cr" }, { label: "Collection", value: "86%" }, { label: "NAAC Ready", value: "92%" }],
      bars: [{ label: "CSE", pct: 88 }, { label: "ECE", pct: 76 }, { label: "Mechanical", pct: 81 }, { label: "Civil", pct: 69 }],
    },
  },
  {
    key: "principal", label: "Principal", Icon: Landmark, accent: "#2563EB",
    headline: "Lead academics with confidence.",
    description: "Track attendance, examinations, faculty performance, and academic operations in real time.",
    highlights: ["Attendance Monitoring", "Academic Calendars", "Exam Oversight", "Faculty Performance", "Operational Reports"],
    preview: {
      portal: "principal",
      kpis: [{ label: "Attendance", value: "91%" }, { label: "Exams", value: "On track" }, { label: "Faculty", value: "96%" }],
      bars: [{ label: "I Year", pct: 93 }, { label: "II Year", pct: 89 }, { label: "III Year", pct: 90 }, { label: "IV Year", pct: 87 }],
    },
  },
  {
    key: "iqac", label: "IQAC", Icon: ShieldCheck, accent: "#C026D3",
    headline: "Simplify accreditation and compliance.",
    description: "Manage accreditation workflows, evidence collection, and outcome-based education from a centralized platform.",
    highlights: ["SSR Builder", "CO/PO Mapping", "OBE Analytics", "Evidence Repository", "Compliance Reports"],
    preview: {
      portal: "iqac",
      kpis: [{ label: "SSR", value: "Ready" }, { label: "CO/PO Attainment", value: "84%" }, { label: "Evidence", value: "1,240" }],
      list: [
        { label: "NAAC SSR — Criterion 2", tag: "Ready", ok: true },
        { label: "CO/PO Attainment — CSE", tag: "84%", ok: true },
        { label: "NIRF Data Extract", tag: "Ready", ok: true },
      ],
    },
  },
  {
    key: "hod", label: "HOD", Icon: Layers, accent: "#0891B2",
    headline: "Manage your department effectively.",
    description: "Monitor faculty workloads, student performance, lesson plans, and departmental outcomes.",
    highlights: ["Department Dashboard", "Faculty Workload", "Lesson Plans", "CIA Tracking", "Student Performance Analytics"],
    preview: {
      portal: "department",
      kpis: [{ label: "Faculty", value: "18" }, { label: "Avg CIA", value: "82%" }, { label: "Workload", value: "Balanced" }],
      bars: [{ label: "Dr. Rao", pct: 95 }, { label: "Prof. Iyer", pct: 88 }, { label: "Dr. Menon", pct: 78 }, { label: "Prof. Das", pct: 70 }],
    },
  },
  {
    key: "faculty", label: "Faculty", Icon: BookOpen, accent: "#059669",
    headline: "Spend more time teaching and less time managing.",
    description: "Access timetables, mark attendance, manage assessments, create lesson plans, and communicate with students efficiently.",
    highlights: ["Timetable Access", "Attendance Management", "Assessments", "Lesson Planning", "Leave Requests"],
    preview: {
      portal: "staff-portal",
      kpis: [{ label: "Classes today", value: "3" }, { label: "Leave left", value: "8d" }, { label: "Payslip", value: "Ready" }],
      list: [
        { label: "09:00 · CS101 — II Year A", tag: "Mark", ok: true },
        { label: "11:00 · CS233 — III Year B", tag: "Upcoming", ok: false },
        { label: "14:00 · LAB-2 — II Year A", tag: "Upcoming", ok: false },
      ],
    },
  },
  {
    key: "student", label: "Student", Icon: GraduationCap, accent: "#4F46E5",
    headline: "Everything you need in one place.",
    description: "Stay connected to your academic journey through a unified portal and mobile experience.",
    highlights: ["Timetable", "Attendance", "Fee Tracking", "Exam Results", "Certificates", "Mobile App Access"],
    preview: {
      portal: "student-portal",
      kpis: [{ label: "Attendance", value: "92%" }, { label: "CIA Avg", value: "84%" }, { label: "Fees", value: "Paid" }],
      list: [
        { label: "Semester Results", tag: "GPA 8.6", ok: true },
        { label: "Fee Ledger", tag: "Paid", ok: true },
        { label: "Bonafide Certificate", tag: "Download", ok: true },
      ],
    },
  },
  {
    key: "parent", label: "Parent", Icon: Users, accent: "#D97706",
    headline: "Stay informed and involved.",
    description: "Monitor attendance, academic progress, fee payments, and important institutional updates.",
    highlights: ["Attendance Monitoring", "Fee Tracking", "Academic Progress", "Notifications", "Institution Announcements"],
    preview: {
      portal: "parent",
      kpis: [{ label: "Ward Attendance", value: "90%" }, { label: "Fees Due", value: "₹12,000" }, { label: "Updates", value: "3 new" }],
      list: [
        { label: "CIA-2 marks published", tag: "New", ok: true },
        { label: "Fee reminder — Term II", tag: "Due", ok: false },
        { label: "Annual Day — 14 Mar", tag: "Notice", ok: true },
      ],
    },
  },
  {
    key: "alumni", label: "Alumni", Icon: Handshake, accent: "#E11D48",
    headline: "Stay connected to your alma mater.",
    description: "Engage with your institution for life — reunions, mentorship, a professional network and giving back, all in one alumni portal.",
    highlights: ["Alumni Directory", "Reunions & Events", "Mentorship Programs", "Career Network", "Giving & Endowments"],
    preview: {
      portal: "alumni",
      kpis: [{ label: "Network", value: "4,200+" }, { label: "Events / yr", value: "6" }, { label: "Mentors", value: "180" }],
      list: [
        { label: "Annual Alumni Meet — 12 Apr", tag: "RSVP", ok: true },
        { label: "Mentor a final-year student", tag: "Open", ok: true },
        { label: "Class of 2015 reunion", tag: "New", ok: true },
      ],
    },
  },
];

/* ── Coded portal preview (no images) ─────────────────────────────────────── */

function RoleMockup({ role }: { role: Role }) {
  const { preview, accent } = role;
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-violet-200/40 dark:shadow-black/50 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center gap-2">
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <span className="text-[11px] text-slate-400 font-mono ml-2">aura.edu/{preview.portal}</span>
      </div>

      <div className="p-4 sm:p-5">
        {/* KPI tiles */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {preview.kpis.map((k) => (
            <div key={k.label} className="rounded-xl bg-slate-800/70 px-3 py-2.5">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold leading-tight">{k.label}</p>
              <p className="text-sm font-black text-white mt-1 leading-tight">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Bars */}
        {preview.bars && (
          <div className="space-y-2.5">
            {preview.bars.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400 font-semibold">{b.label}</span>
                  <span className="text-slate-300 font-bold">{b.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${b.pct}%`, backgroundColor: accent }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {preview.list && (
          <div className="space-y-2">
            {preview.list.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2.5">
                <span className="text-[11px] text-slate-300 font-semibold">{item.label}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={item.ok
                    ? { color: accent, backgroundColor: `${accent}1f`, border: `1px solid ${accent}40` }
                    : { color: "#94a3b8", backgroundColor: "rgba(148,163,184,0.12)", border: "1px solid rgba(148,163,184,0.25)" }}>
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Section ──────────────────────────────────────────────────────────────── */

export function RolesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const role = ROLES[active];
  const { scrollToId } = useLenis();

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".roles-head", {
      y: 40, opacity: 0, duration: 0.8, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
    });
    gsap.from(".roles-tabs", {
      y: 24, opacity: 0, duration: 0.7, ease: "power3.out", immediateRender: false,
      scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="roles"
      ref={sectionRef}
      aria-label="Designed for every role"
      className="py-24 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-white via-violet-50/50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 border-y border-violet-100 dark:border-slate-800/60 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="roles-head text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">One Platform · Every Stakeholder</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">
            Designed for every role
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-violet-600 to-pink-500 dark:from-violet-400 dark:to-pink-400 bg-clip-text text-transparent"> in your institution.</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-[15px]">
            Aura Campus empowers every stakeholder with the tools, insights and experiences they need to succeed —
            from management and administrators to faculty, students and parents.
          </p>
        </div>

        {/* Tabs — horizontal scroll on mobile, centered wrap on desktop */}
        <div className="roles-tabs -mx-4 px-4 sm:mx-0 sm:px-0 mb-10">
          <div role="tablist" aria-label="Roles"
            className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ROLES.map((r, i) => {
              const isActive = i === active;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(i)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition-all border ${
                    isActive
                      ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-500/25"
                      : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/70 hover:border-violet-300 dark:hover:border-violet-500/40 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <r.Icon size={14} />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Two-column body — re-keyed for a subtle switch animation */}
        <div
          key={role.key}
          className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none"
        >
          {/* Left — role content */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundImage: `linear-gradient(135deg, ${role.accent}, ${role.accent}cc)` }}>
                <role.Icon size={20} className="text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{role.label}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
              {role.headline}
            </h3>
            <p className="text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed mb-6 max-w-lg">
              {role.description}
            </p>

            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {role.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: role.accent }} />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — coded portal preview */}
          <div className="w-full max-w-md mx-auto lg:max-w-none">
            <RoleMockup role={role} />
          </div>
        </div>

        {/* Strategic close */}
        <div className="text-center mt-14">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-black text-slate-900 dark:text-white">One platform. Every stakeholder.</span>{" "}
            Not just an ERP — a complete digital ecosystem.
          </p>
          <button type="button" onClick={() => scrollToId("hero")}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all hover:scale-[1.02] shadow-md shadow-violet-500/20 border border-violet-500">
            Book a Demo for Your Role
          </button>
        </div>
      </div>
    </section>
  );
}
