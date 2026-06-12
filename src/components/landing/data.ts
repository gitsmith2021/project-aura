import {
  GraduationCap, Users, Calendar, ClipboardList, Wallet, BarChart2,
  Shield, Award, Briefcase, Mic2, BookText, Library, BadgePercent,
  Activity, Database, Smartphone, type LucideIcon,
} from "lucide-react";

export type DemoFormData = {
  institutionName: string;
  yourName: string;
  phone: string;
  institutionType: string;
};

export const NAV_LINKS = [
  { id: "features", label: "Features" },
  { id: "naac",     label: "Accreditation" },
  { id: "why",      label: "Why AURA" },
  { id: "pricing",  label: "Pricing" },
  { id: "tech",     label: "Tech Stack" },
  { id: "contact",  label: "Contact" },
];

export const TRUST_BADGES = [
  "✓ UGC / AICTE Workflow Ready",
  "✓ Razorpay Payments Built-in",
  "✓ DPDP Act 2023 Compliant",
  "✓ Hosted in India (Supabase)",
];

/** Mockup variants rendered as coded UI on the right side of each feature panel. */
export type MockupVariant =
  | "timetable" | "finance" | "student" | "staff"
  | "attendance" | "cia" | "accreditation" | "mobile";

export type FeaturePanelData = {
  icon: LucideIcon;
  title: string;
  desc: string;
  bullets: string[];
  /** CSS gradient for the icon chip — inline style so the global
      `.dark .bg-gradient-to-br` override can't flatten it. */
  gradient: string;
  variant: MockupVariant;
  comingSoon?: boolean;
};

export const FEATURE_PANELS: FeaturePanelData[] = [
  {
    icon: Calendar,
    title: "Smart Timetable & AI Scheduler",
    desc: "Drag-and-drop schedule builder backed by a Python OR-Tools engine — conflict-free timetables with automatic staff workload balancing.",
    bullets: ["Conflict auto-detection", "Staff workload balancing", "Print-ready PDF export"],
    gradient: "linear-gradient(135deg, #3B82F6, #06B6D4)",
    variant: "timetable",
  },
  {
    icon: Wallet,
    title: "Finance & Fee Management",
    desc: "Fee structures, Razorpay online payments, concessions, staff payroll and live financial reports — end to end.",
    bullets: ["Razorpay payments built-in", "Concession & waiver rules", "Live financial reports"],
    gradient: "linear-gradient(135deg, #22C55E, #10B981)",
    variant: "finance",
  },
  {
    icon: GraduationCap,
    title: "Student Portal",
    desc: "Attendance rings, fee ledger with online payment, results & CIA marks, and unit-wise syllabus tracking — complete self-service.",
    bullets: ["Attendance at a glance", "Fee ledger + online pay", "Results & CIA marks"],
    gradient: "linear-gradient(135deg, #A855F7, #8B5CF6)",
    variant: "student",
  },
  {
    icon: Users,
    title: "Staff Portal",
    desc: "Personal timetable, leave management and digital payslips — a complete self-service hub for every staff member.",
    bullets: ["Personal timetable", "Leave management", "Digital payslips"],
    gradient: "linear-gradient(135deg, #0EA5E9, #3B82F6)",
    variant: "staff",
  },
  {
    icon: Activity,
    title: "Attendance System",
    desc: "NFC tap-in plus manual marking with real-time session summaries — attendance data that's always current.",
    bullets: ["NFC + manual marking", "Real-time session summaries", "Live attendance percentages"],
    gradient: "linear-gradient(135deg, #F97316, #F59E0B)",
    variant: "attendance",
  },
  {
    icon: BadgePercent,
    title: "CIA / Continuous Assessment",
    desc: "Formula-driven internal assessment ledger aligned with accreditation frameworks — components, weighting and computed internals.",
    bullets: ["Formula-driven components", "NAAC-aligned ledger", "Auto-computed internals"],
    gradient: "linear-gradient(135deg, #8B5CF6, #A855F7)",
    variant: "cia",
  },
  {
    icon: BarChart2,
    title: "Accreditation Reports",
    desc: "One-click NAAC / NIRF / NBA compliance exports built on structured, evidence-ready data from every module.",
    bullets: ["NAAC / NIRF / NBA exports", "Structured evidence data", "One-click submissions"],
    gradient: "linear-gradient(135deg, #F43F5E, #EC4899)",
    variant: "accreditation",
  },
  {
    icon: Smartphone,
    title: "Mobile App",
    desc: "NFC attendance scanning, CCTV integration and push notifications — the campus in your pocket.",
    bullets: ["NFC attendance scanning", "CCTV integration", "Push notifications"],
    gradient: "linear-gradient(135deg, #14B8A6, #22C55E)",
    variant: "mobile",
    comingSoon: true,
  },
];

export const ACCREDITATION = [
  { code: "1.2", label: "Student Projects & Internships",          module: "Internship Tracker" },
  { code: "1.3", label: "Experiential Learning / Expert Talks",    module: "Guest Lecture Manager" },
  { code: "2.3", label: "Teaching-Learning Process",               module: "Lesson Plan Diary" },
  { code: "2.4", label: "Teacher Quality & Syllabus Coverage",     module: "Curriculum Manager" },
  { code: "2.6", label: "Student Performance & Learning Outcomes", module: "CIA + Exam + Results" },
  { code: "5.2", label: "Placement & Industrial Training",         module: "Internship + Ranking Export" },
  { code: "6.4", label: "Finance & Budget Management",             module: "Finance & Fee Module" },
  { code: "7.1", label: "Institutional Values & Best Practices",   module: "Reports & Compliance" },
];

export const COMPARE: [string, string, string][] = [
  ["Setup & Go Live",        "6–18 months",           "Same day ✓"],
  ["Setup & Onboarding",     "6–12 months",           "Same day, guided setup"],
  ["Accreditation-Ready",    "Manual spreadsheets",   "Built-in, structured data"],
  ["Student & Staff Portal", "Separate purchase",     "Included — no add-ons"],
  ["Mobile Responsive",      "Rarely, if ever",       "Always — mobile-first design"],
  ["Real-time Updates",      "Nightly batch sync",    "Live via Supabase Realtime"],
  ["Multi-Institution",      "Single instance",       "Native multi-tenant, isolated"],
  ["Tech Stack",             "Proprietary lock-in",   "Open: Next.js + Supabase"],
  ["Total Cost",             "High annual contracts", "Transparent, fraction of cost"],
];

export const TESTIMONIALS = [
  { init: "EC", name: "Engineering College, Tamil Nadu",   quote: "Finally, a system that understands our NAAC workflow." },
  { init: "AC", name: "Autonomous College, Kerala",        quote: "Setup took one day. Our staff actually use it." },
  { init: "VI", name: "Vocational Institute, Maharashtra", quote: "The timetable AI alone is worth the price." },
];

export const TESTIMONIAL_MS = 4500;

export const MARQUEE_ITEMS = [
  { Icon: Calendar,      label: "Smart Timetable",       color: "from-blue-500 to-cyan-500" },
  { Icon: BadgePercent,  label: "CIA Ledger",            color: "from-violet-500 to-purple-500" },
  { Icon: ClipboardList, label: "Exam Management",       color: "from-orange-500 to-amber-500" },
  { Icon: Library,       label: "Curriculum & Syllabus", color: "from-emerald-500 to-teal-500" },
  { Icon: Mic2,          label: "Guest Lectures",        color: "from-indigo-500 to-blue-500" },
  { Icon: BookText,      label: "Lesson Plans",          color: "from-pink-500 to-rose-500" },
  { Icon: Award,         label: "Results & Promotion",   color: "from-teal-500 to-green-500" },
  { Icon: Wallet,        label: "Fee Management",        color: "from-green-500 to-emerald-500" },
  { Icon: Briefcase,     label: "Internship Tracker",    color: "from-amber-500 to-yellow-500" },
  { Icon: Users,         label: "Staff Portal",          color: "from-sky-500 to-blue-500" },
  { Icon: GraduationCap, label: "Student Portal",        color: "from-purple-500 to-violet-500" },
  { Icon: BarChart2,     label: "Accreditation Reports", color: "from-rose-500 to-pink-500" },
  { Icon: Shield,        label: "NAAC Compliance",       color: "from-violet-500 to-indigo-500" },
  { Icon: Database,      label: "Secure Data",           color: "from-sky-500 to-teal-500" },
];

export const TECH = [
  { name: "Next.js 16",       role: "App Router · Server Actions · Turbopack · Edge Runtime",
    badge: "▲", badgeL: "bg-slate-900 text-white",         cardL: "bg-slate-100 border-slate-300",      nameL: "text-slate-900",
    badgeD: "dark:bg-white dark:text-black",               cardD: "dark:bg-zinc-900 dark:border-zinc-700",             nameD: "dark:text-white" },
  { name: "Supabase",         role: "PostgreSQL · Auth · Realtime · Row Level Security · Edge Functions",
    badge: "⚡", badgeL: "bg-emerald-100 text-emerald-700", cardL: "bg-emerald-50 border-emerald-200",   nameL: "text-emerald-700",
    badgeD: "dark:bg-emerald-500/20 dark:text-emerald-400", cardD: "dark:bg-emerald-950/40 dark:border-emerald-800/30", nameD: "dark:text-emerald-400" },
  { name: "TypeScript",       role: "Strict end-to-end type safety · Zero `any` · Full-stack inference",
    badge: "TS", badgeL: "bg-blue-100 text-blue-700",      cardL: "bg-blue-50 border-blue-200",         nameL: "text-blue-700",
    badgeD: "dark:bg-blue-500/20 dark:text-blue-400",      cardD: "dark:bg-blue-950/30 dark:border-blue-800/30",       nameD: "dark:text-blue-400" },
  { name: "Tailwind CSS v4",  role: "Utility-first · Dark mode · Responsive · Design tokens",
    badge: "🎨", badgeL: "bg-cyan-100 text-cyan-700",       cardL: "bg-cyan-50 border-cyan-200",         nameL: "text-cyan-700",
    badgeD: "dark:bg-cyan-500/20 dark:text-cyan-400",      cardD: "dark:bg-cyan-950/30 dark:border-cyan-800/30",       nameD: "dark:text-cyan-400" },
  { name: "PostgreSQL + RLS", role: "Row Level Security · Multi-tenant isolation · SECURITY DEFINER",
    badge: "🐘", badgeL: "bg-sky-100 text-sky-700",         cardL: "bg-sky-50 border-sky-200",           nameL: "text-sky-700",
    badgeD: "dark:bg-sky-500/20 dark:text-sky-400",        cardD: "dark:bg-sky-950/30 dark:border-sky-800/30",         nameD: "dark:text-sky-400" },
  { name: "Vercel Edge",      role: "Global edge deployment · Instant rollbacks · Git-based CI/CD",
    badge: "▼", badgeL: "bg-slate-200 text-slate-700",     cardL: "bg-slate-100 border-slate-300",      nameL: "text-slate-800",
    badgeD: "dark:bg-slate-600/40 dark:text-slate-300",    cardD: "dark:bg-slate-800/40 dark:border-slate-700/40",     nameD: "dark:text-slate-200" },
];
