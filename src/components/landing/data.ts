import {
  GraduationCap, Users, Calendar, ClipboardList, Wallet, BarChart2,
  Shield, Award, Briefcase, Mic2, BookText, Library, BadgePercent,
  Activity, Database, Smartphone, FlaskConical, Landmark, Building2,
  School, Cpu, Cloud, DatabaseBackup, KeyRound, Layers, ShieldCheck,
  RefreshCw, Microscope, UserPlus, BedDouble, BrainCircuit, type LucideIcon,
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
  { id: "tech",     label: "Platform" },
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
  | "attendance" | "cia" | "accreditation" | "mobile"
  | "admissions" | "placements";

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
    icon: UserPlus,
    title: "Admissions & CRM",
    desc: "Capture enquiries, run the full application funnel, generate merit lists and convert prospects — a built-in admissions CRM from first touch to enrolment.",
    bullets: ["Enquiry-to-enrolment funnel", "Automated merit lists", "Conversion analytics"],
    gradient: "linear-gradient(135deg, #06B6D4, #0EA5E9)",
    variant: "admissions",
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
    icon: Briefcase,
    title: "Placements & Careers",
    desc: "Run placement drives end to end — company directory, student eligibility, application tracking and offer analytics — with live placement-rate dashboards for NIRF and NAAC.",
    bullets: ["Drive & company management", "Offer & CTC analytics", "Placement-rate reporting"],
    gradient: "linear-gradient(135deg, #4F46E5, #7C3AED)",
    variant: "placements",
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
  { code: "3.4", label: "Research Publications & IPR",             module: "Research & Publications" },
  { code: "5.1", label: "Student Support & Scholarships",          module: "Scholarships Module" },
  { code: "5.2", label: "Placement & Industrial Training",         module: "Placements + Ranking Export" },
  { code: "6.4", label: "Finance & Budget Management",             module: "Finance & Fee Module" },
  { code: "6.5", label: "Internal Quality Assurance (IQAC)",       module: "IQAC Dashboard + AQAR" },
  { code: "7.1", label: "Institutional Values & Best Practices",   module: "Reports & Compliance" },
];

/** Task 1 — AI Timetable Engine flagship spotlight. */
export const TIMETABLE_BENEFITS = [
  "Faculty availability handling",
  "Room allocation",
  "Conflict detection",
  "Workload balancing",
  "Automated optimization",
  "One-click publishing",
];

/** Task 2 — accreditation frameworks + tooling highlighted in the Accreditation section. */
export const COMPLIANCE_FRAMEWORKS = ["NAAC", "NIRF", "AISHE", "OBE", "CBCS"];
export const ACCREDITATION_TOOLS = [
  "SSR Builder", "AQAR Generator", "CO/PO Mapping", "CIA Ledger", "Outcome Attainment", "IQAC Action Tracker",
];

/** Task 3 — "Why institutions switch": pain → outcome transformations (not a module list). */
export const TRANSFORMATIONS: { from: string; to: string }[] = [
  { from: "Manual timetable creation",        to: "AI-powered timetable generation" },
  { from: "NAAC documentation chaos",         to: "Built-in accreditation workflows" },
  { from: "Multiple disconnected systems",    to: "One unified platform" },
  { from: "Spreadsheet-driven administration", to: "Real-time dashboards" },
  { from: "Students standing in queues",      to: "Self-service portals" },
  { from: "Manual fee tracking",              to: "Automated fee management" },
];

/** Task 5 — institution types AURA Campus is built for. */
export const INSTITUTION_TYPES: { Icon: LucideIcon; label: string }[] = [
  { Icon: BookText,      label: "Arts & Science Colleges" },
  { Icon: Cpu,           label: "Engineering Colleges" },
  { Icon: Landmark,      label: "Autonomous Colleges" },
  { Icon: Building2,     label: "Universities" },
  { Icon: FlaskConical,  label: "Polytechnic Colleges" },
  { Icon: School,        label: "Teacher Education Institutions" },
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
  { Icon: UserPlus,      label: "Admissions CRM",        color: "from-cyan-500 to-sky-500" },
  { Icon: Briefcase,     label: "Placements & Careers",  color: "from-blue-500 to-indigo-500" },
  { Icon: Microscope,    label: "Research & Publications", color: "from-fuchsia-500 to-purple-500" },
  { Icon: BrainCircuit,  label: "Knowledge Hub",         color: "from-violet-500 to-fuchsia-500" },
  { Icon: Award,         label: "Scholarships",          color: "from-emerald-500 to-teal-500" },
  { Icon: BedDouble,     label: "Hostel & Mess",         color: "from-amber-500 to-orange-500" },
  { Icon: Library,       label: "Library & Assets",      color: "from-teal-500 to-cyan-500" },
  { Icon: BarChart2,     label: "Accreditation Reports", color: "from-rose-500 to-pink-500" },
  { Icon: Shield,        label: "NAAC Compliance",       color: "from-violet-500 to-indigo-500" },
  { Icon: Database,      label: "Secure Data",           color: "from-sky-500 to-teal-500" },
];

/** Enterprise-grade platform trust indicators (institution leadership, not developers). */
export const PLATFORM_TRUST: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Cloud,          title: "Secure Cloud Infrastructure", desc: "Hosted in India on enterprise cloud — encrypted, monitored and always on." },
  { Icon: DatabaseBackup, title: "Automated Backups",            desc: "Point-in-time backups run continuously, so your institutional data is never at risk." },
  { Icon: KeyRound,       title: "Role-Based Access Control",    desc: "Principals, HODs, staff and students each see exactly what they should — nothing more." },
  { Icon: Smartphone,     title: "Mobile Ready",                 desc: "Every portal works on any phone, tablet or desktop — no app store required." },
  { Icon: Layers,         title: "Multi-Tenant Architecture",    desc: "Run multiple campuses or institutions with fully isolated, secure data." },
  { Icon: ShieldCheck,    title: "Data Privacy & Compliance Ready", desc: "Built around the DPDP Act 2023 with audit trails and consent management." },
  { Icon: RefreshCw,      title: "Continuous Updates",           desc: "New features and improvements ship automatically — no upgrade projects, ever." },
];

/** Tech stack — `id` maps to a real brand mark in TechStack/brandLogos.tsx.
    `logo` colors the glyph; `tint` is the masonry card's bg + border. */
export type TechItem = { id: string; name: string; sub: string; logo: string; tint: string };
export const TECH: TechItem[] = [
  { id: "nextjs", name: "Next.js 16",
    sub: "React framework with the App Router, Server Actions and Turbopack — server-rendered and fast by default.",
    logo: "text-slate-900 dark:text-white",
    tint: "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60" },
  { id: "supabase", name: "Supabase",
    sub: "Postgres platform behind Auth, Realtime, Storage and Edge Functions — hosted in India.",
    logo: "text-emerald-500 dark:text-emerald-400",
    tint: "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/30" },
  { id: "typescript", name: "TypeScript",
    sub: "Strict, end-to-end type safety across the entire stack.",
    logo: "text-blue-600 dark:text-blue-400",
    tint: "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-800/30" },
  { id: "tailwind", name: "Tailwind",
    sub: "Utility-first styling with design tokens and first-class dark mode.",
    logo: "text-cyan-500 dark:text-cyan-400",
    tint: "bg-cyan-50/70 dark:bg-cyan-950/20 border-cyan-200/70 dark:border-cyan-800/30" },
  { id: "vector", name: "Vector Search",
    sub: "pgvector embeddings power semantic search across the Knowledge Hub and documents.",
    logo: "text-fuchsia-500 dark:text-fuchsia-400",
    tint: "bg-fuchsia-50/70 dark:bg-fuchsia-950/20 border-fuchsia-200/70 dark:border-fuchsia-800/30" },
  { id: "postgresql", name: "PostgreSQL + RLS",
    sub: "Row-Level Security enforces strict multi-tenant isolation right at the database layer, with SECURITY DEFINER routines.",
    logo: "text-indigo-600 dark:text-indigo-400",
    tint: "bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-800/30" },
  { id: "python", name: "Python Engines + OR-Tools",
    sub: "Google OR-Tools constraint solver generates conflict-free, workload-balanced timetables in seconds.",
    logo: "text-sky-600 dark:text-sky-400",
    tint: "bg-sky-50/70 dark:bg-sky-950/20 border-sky-200/70 dark:border-sky-800/30" },
  { id: "vercel", name: "Vercel Edge Infrastructure",
    sub: "Global edge network with instant rollbacks and Git-based continuous deployment.",
    logo: "text-slate-900 dark:text-white",
    tint: "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60" },
];
