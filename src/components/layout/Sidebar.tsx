"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, Settings, Building2, Calendar, GraduationCap,
  Layers, Landmark, Wallet, Tag, CreditCard, BarChart2, ChevronDown,
  ClipboardCheck, CalendarOff, CalendarDays, BookOpen, BadgePercent,
  ClipboardList, Award, BadgeCheck, Library, BookText, Mic2, Briefcase, BrainCircuit,
  ShieldCheck, ScrollText, ChevronsLeft, ChevronsRight, Megaphone, BedDouble, FlaskConical, Package, Truck, Nfc, DoorOpen, Receipt, Stethoscope, Trophy, Star, School, UserPlus, ListOrdered, FileText, Search, ShieldAlert, Microscope, CalendarCheck, UserCog, Bus, MonitorCheck, MessageSquareHeart, FileStack, Handshake, Scale,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// Matches a bare UUID (vs a human slug) in a URL segment. Module-scope so it's a
// stable reference and not an effect dependency.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Finance sub-items ─────────────────────────────────────────────────────────
const FINANCE_SUB = [
  { key: "overview",    label: "Command Center", Icon: LayoutDashboard, href: () => `/finance` },
  { key: "fees",        label: "Fee Structures",  Icon: Tag,            href: (id: string) => `/institutions/${id}/finance/fees` },
  { key: "demands",     label: "Fee Demands",     Icon: Receipt,        href: (id: string) => `/institutions/${id}/finance/demands` },
  { key: "payments",    label: "All Payments",    Icon: CreditCard,     href: (id: string) => `/institutions/${id}/finance/fees/payments` },
  { key: "concessions", label: "Concessions",     Icon: BadgePercent,   href: (id: string) => `/institutions/${id}/finance/concessions` },
  { key: "budgets",     label: "Dept. Budgets",   Icon: Wallet,         href: (id: string) => `/institutions/${id}/finance/budgets` },
  { key: "salary",      label: "Salaries",        Icon: Users,          href: (id: string) => `/institutions/${id}/finance/salary` },
  { key: "statutory",   label: "Statutory",       Icon: ShieldAlert,    href: (id: string) => `/institutions/${id}/finance/payroll/statutory` },
  { key: "reports",     label: "Reports",         Icon: BarChart2,      href: (id: string) => `/institutions/${id}/finance/reports` },
] as const;

// ── Academics path fragments — shared between group/active detection ──────────
// Any path containing one of these belongs to the "Academics" sidebar group,
// not "Institution". Add new Phase 3+ academic routes here only.
const ACADEMIC_PATH_FRAGMENTS = [
  "/schedules", "/subjects", "/curriculum", "/lesson-plans", "/guest-lectures",
  "/internships", "/exams", "/cia", "/results", "/promotion", "/calendar",
] as const;
const isAcademicPath = (path: string) => ACADEMIC_PATH_FRAGMENTS.some(f => path.includes(f));

const CAMPUS_PATH_FRAGMENTS = [
  "/library", "/bookings", "/hostels", "/laboratories", "/assets",
  "/vendors", "/id-cards", "/gate", "/clubs", "/infirmary", "/sports", "/events",
  "/transport", "/certificates", "/feedback", "/industry-connect",
] as const;
const isCampusPath = (path: string) => CAMPUS_PATH_FRAGMENTS.some(f => path.includes(f));

// ── Institution group — its OWN members (allowlist) ──────────────────────────
// Every institution-scoped page lives under /institutions/{slug}/…, so we can NOT
// treat "starts with /institutions" as belonging to this group — that would claim
// Research, Placements, Finance, etc. The group owns only the routes below plus the
// institution dashboard/list root; standalone leaves match their own segment.
const INSTITUTION_PATH_FRAGMENTS = [
  "/departments", "/compliance", "/audit-log", "/iqac",
  "/knowledge-hub", "/notices", "/disciplinary", "/grievances",
] as const;
// The institution dashboard root: the list (/institutions) or a single
// institution's dashboard (/institutions/{slug}) — never a deeper module route.
const isInstitutionRoot = (path: string) =>
  path === "/institutions" ||
  (path.startsWith("/institutions/") && path.split("/").filter(Boolean).length === 2);
const isInstitutionGroupPath = (path: string) =>
  isInstitutionRoot(path) || INSTITUTION_PATH_FRAGMENTS.some(f => path.includes(f));

// ── People group — its OWN members (allowlist) ───────────────────────────────
const PEOPLE_PATH_FRAGMENTS = [
  "/users", "/appraisals", "/staff-attendance", "/staff/career", "/parents",
] as const;
const isPeoplePath = (path: string) => PEOPLE_PATH_FRAGMENTS.some(f => path.includes(f));

// ── Staff portal nav (flat — already short) ───────────────────────────────────
const STAFF_NAV = [
  { key: "dashboard",  href: "/staff-portal",            label: "Dashboard",   Icon: LayoutDashboard, exact: true },
  { key: "schedule",   href: "/staff-portal/schedule",   label: "My Schedule", Icon: Calendar },
  { key: "calendar",   href: "/staff-portal/calendar",   label: "Calendar",    Icon: CalendarDays },
  { key: "notices",    href: "/staff-portal/notices",    label: "Notices",     Icon: Megaphone },
  { key: "library",    href: "/staff-portal/library",    label: "My Library",  Icon: Library },
  { key: "bookings",   href: "/staff-portal/bookings",   label: "Bookings",    Icon: Building2 },
  { key: "laboratories", href: "/staff-portal/laboratories", label: "Laboratories", Icon: FlaskConical },
  { key: "outpass",    href: "/staff-portal/outpass",    label: "Outpass",     Icon: DoorOpen },
  { key: "clubs",      href: "/staff-portal/clubs",      label: "Clubs",       Icon: Award },
  { key: "attendance", href: "/staff-portal/attendance", label: "Attendance",  Icon: ClipboardCheck },
  { key: "cia",        href: "/staff-portal/cia",        label: "CIA Marks",   Icon: ClipboardList },
  { key: "leave",      href: "/staff-portal/leave",      label: "Leave",       Icon: CalendarOff },
  { key: "appraisal",  href: "/staff-portal/appraisal",  label: "Appraisal",   Icon: ClipboardCheck },
  { key: "lms",        href: "/staff-portal/lms",        label: "E-Learning",  Icon: FileStack },
  { key: "feedback",   href: "/staff-portal/feedback",   label: "My Feedback", Icon: MessageSquareHeart },
  { key: "grievance",  href: "/staff-portal/grievance",  label: "Grievance",   Icon: Scale },
  { key: "research",   href: "/staff-portal/research",   label: "My Research", Icon: Microscope },
  { key: "my-attendance", href: "/staff-portal/my-attendance", label: "My Attendance", Icon: CalendarCheck },
  { key: "salary",          href: "/staff-portal/salary",           label: "Salary",          Icon: Wallet },
  { key: "tax-declaration", href: "/staff-portal/tax-declaration", label: "Tax Declaration", Icon: FileText },
  { key: "career",          href: "/staff-portal/career",          label: "My Career",       Icon: UserCog },
  { key: "privacy",         href: "/staff-portal/privacy",         label: "Privacy",         Icon: ShieldCheck },
] as const;

// ── Shared style tokens (sidebar is always dark, both themes) ─────────────────
const ROW_BASE   = "flex items-center rounded-lg font-medium transition-colors duration-150";
const LEAF_IDLE  = "text-slate-300 hover:bg-white/[0.07] hover:text-white";
const LEAF_ACTIVE = "bg-purple-600 text-white shadow-sm shadow-purple-950/40";
const SUB_IDLE   = "text-slate-400 hover:bg-white/[0.06] hover:text-white";
const SUB_ACTIVE = "bg-purple-600 text-white";
const POPOVER    = "rounded-xl bg-slate-800 ring-1 ring-white/10 shadow-2xl shadow-black/50";

// ── Hover tooltip / flyout (collapsed mode) ───────────────────────────────────
function Tooltip({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 rounded-md bg-slate-800 ring-1 ring-white/10 text-slate-100 text-[11px] font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
      {label}
    </div>
  );
}

// ── Leaf link (top-level standalone items) ────────────────────────────────────
function SidebarLink({
  icon, label, active = false, isCollapsed, href,
}: {
  icon: React.ReactNode; label: string; active?: boolean; isCollapsed: boolean; href: string;
}) {
  return (
    <div className="relative group">
      <Link
        href={href}
        className={`${ROW_BASE} text-[13px] ${
          isCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-2.5 py-2"
        } ${active ? LEAF_ACTIVE : LEAF_IDLE}`}
      >
        <span className={`shrink-0 ${active ? "text-white" : "text-slate-400"}`}>{icon}</span>
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
      {isCollapsed && <Tooltip label={label} />}
    </div>
  );
}

// ── Sub link (group children — uniform size everywhere) ───────────────────────
function SubLink({
  icon, label, active = false, href,
}: {
  icon: React.ReactNode; label: string; active?: boolean; href: string;
}) {
  return (
    <Link
      href={href}
      className={`${ROW_BASE} gap-2.5 px-2.5 py-1.5 text-[12px] ${active ? SUB_ACTIVE : SUB_IDLE}`}
    >
      <span className={`shrink-0 ${active ? "text-white" : "text-slate-500"}`}>{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ── Collapsible group (expanded: accordion · collapsed: hover flyout) ──────────
function NavGroup({
  icon, label, isActive, isOpen, onToggle, isCollapsed, children,
}: {
  icon: React.ReactNode; label: string;
  isActive: boolean; isOpen: boolean; onToggle: () => void;
  isCollapsed: boolean; children: React.ReactNode;
}) {
  if (isCollapsed) {
    return (
      <div className="relative group">
        <button
          type="button"
          onClick={onToggle}
          className={`${ROW_BASE} justify-center w-10 h-10 mx-auto text-[13px] ${
            isActive ? LEAF_ACTIVE : LEAF_IDLE
          }`}
        >
          <span className={`shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}>{icon}</span>
        </button>
        {/* Flyout — pl-2 (not ml) keeps a continuous hover bridge to the panel */}
        <div className="absolute left-full top-0 pl-2 hidden group-hover:block z-50">
          <div className={`min-w-[190px] p-1.5 ${POPOVER}`}>
            <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <div className="space-y-0.5">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`${ROW_BASE} w-full gap-3 px-2.5 py-2 text-[13px] ${
          isActive ? "bg-white/[0.06] text-white" : LEAF_IDLE
        }`}
      >
        <span className={`shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}>{icon}</span>
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
            isActive ? "text-slate-300" : "text-slate-500"
          }`}
        />
      </button>
      {isOpen && (
        <div className="mt-0.5 ml-[18px] pl-2.5 border-l border-white/10 space-y-0.5 py-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar({ isCollapsed, toggleSidebar }: { isCollapsed: boolean; toggleSidebar?: () => void }) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [userAuth, setUserAuth] = useState<{ role: string; tenant_id: string; department_id: string } | null>(null);
  const [userTenantId, setUserTenantId] = useState<string | null>(null);

  useEffect(() => {
    // The access-tier cookie (aura-role) is httpOnly, so it is NOT readable from
    // document.cookie — reading it here always yielded null, which collapsed
    // every non-admin into the admin sidebar. Resolve the real role from the
    // authoritative RPC instead; fall back to the readable label cookie only if
    // the user has no institution_members row.
    let active = true;
    const supabase = createClient();
    supabase.rpc("get_user_authorizations").then(({ data }) => {
      if (!active) return;
      const row = data && data.length > 0 ? data[0] : null;
      if (row?.role) {
        const r = String(row.role);
        const tier =
          r === "STAFF" ? "staff" :
          r === "STUDENT" ? "student" :
          (r === "HOD" || r === "DEPARTMENT_HEAD") ? "hod" : "admin";
        setRole(tier);
        if (row.tenant_id) setUserTenantId(String(row.tenant_id));
        if (tier === "hod") setUserAuth(row);
        return;
      }
      // Fallback: non-httpOnly display label set at login (Staff/Student/HOD/Admin/…)
      const label = document.cookie.split("; ").find(c => c.startsWith("aura-role-label="));
      const v = label ? decodeURIComponent(label.split("=")[1] ?? "") : "";
      setRole(v === "Staff" ? "staff" : v === "Student" ? "student" : v === "HOD" ? "hod" : v ? "admin" : null);
    });
    return () => { active = false; };
  }, []);

  const isStaffPortal = pathname.startsWith("/staff-portal") && !pathname.startsWith("/staff-portal/view") && role === "staff";

  // ── Finance active detection ──────────────────────────────────────────────
  const isFinanceActive = pathname === "/finance" || pathname.includes("/finance");

  // ── Slug resolution ───────────────────────────────────────────────────────
  const [financeInstSlug, setFinanceInstSlug] = useState<string | null>(null);
  const [activeInstSlug,  setActiveInstSlug]  = useState<string | null>(null);
  const [ownInstSlug,     setOwnInstSlug]     = useState<string | null>(null);

  useEffect(() => {
    const slugFromCookie = document.cookie.split("; ")
      .find(r => r.startsWith("aura-inst-slug="))?.split("=")[1] ?? null;
    const storedSlug = localStorage.getItem("aura_active_inst_slug");
    const slug = (storedSlug && !UUID_RE.test(storedSlug)) ? storedSlug : slugFromCookie;
    if (slug) setActiveInstSlug(slug);
    const storedFinance = localStorage.getItem("aura_finance_inst_slug");
    const financeSlug = (storedFinance && !UUID_RE.test(storedFinance)) ? storedFinance : null;
    if (financeSlug) setFinanceInstSlug(financeSlug);
   
  }, []);

  useEffect(() => {
    const segs = pathname.split("/");
    const idx  = segs.indexOf("institutions");
    if (idx >= 0 && segs[idx + 1] && !UUID_RE.test(segs[idx + 1])) {
      const slug = segs[idx + 1];
      setActiveInstSlug(slug);
      localStorage.setItem("aura_active_inst_slug", slug);
      if (pathname.includes("/finance")) {
        setFinanceInstSlug(slug);
        localStorage.setItem("aura_finance_inst_slug", slug);
      }
    } else if (!pathname.includes("/institutions")) {
      const storedSlug = localStorage.getItem("aura_active_inst_slug");
      if (storedSlug && !UUID_RE.test(storedSlug)) setActiveInstSlug(storedSlug);
      const storedFinanceSlug = localStorage.getItem("aura_finance_inst_slug");
      if (storedFinanceSlug && !UUID_RE.test(storedFinanceSlug)) setFinanceInstSlug(storedFinanceSlug);
    }
  }, [pathname]);

  // Resolve the LOGGED-IN user's own institution slug (once per tenant).
  useEffect(() => {
    if (!userTenantId) return;
    const supabase = createClient();
    supabase.from("institutions").select("slug").eq("id", userTenantId).maybeSingle().then(({ data }) => {
      if (data?.slug) setOwnInstSlug(data.slug);
    });
  }, [userTenantId]);

  // Authoritative default for institution-scoped nav links: the user's OWN
  // institution. Overrides any stale cross-user localStorage/cookie slug and
  // replaces the old "first institution" (`limit 1`) fallback that could leak a
  // different tenant into the menu URLs. Skipped while actively viewing a specific
  // institution's URL (a super-admin browsing another tenant — the path effect wins).
  useEffect(() => {
    if (!ownInstSlug) return;
    const segs = pathname.split("/");
    const i = segs.indexOf("institutions");
    const onInstUrl = i >= 0 && !!segs[i + 1] && !UUID_RE.test(segs[i + 1]);
    if (onInstUrl) return;
    setActiveInstSlug(ownInstSlug);
    localStorage.setItem("aura_active_inst_slug", ownInstSlug);
  }, [ownInstSlug, pathname]);

  useEffect(() => {
    const handler = (e: Event) => {
      const slug = (e as CustomEvent<string>).detail;
      if (slug) setFinanceInstSlug(slug);
    };
    window.addEventListener("aura:finance:inst", handler);
    return () => window.removeEventListener("aura:finance:inst", handler);
  }, []);

  // ── Group open state ──────────────────────────────────────────────────────
  // Determine which group the current path belongs to and auto-open it
  const detectOpenGroup = (path: string): string => {
    if (path === "/" || path.startsWith("/settings")) return "";
    if (path.includes("/admissions")) return "admissions";
    if (isAcademicPath(path)) return "academics";
    if (isCampusPath(path)) return "campus";
    if (path.includes("/finance")) return "finance";
    if (isPeoplePath(path)) return "people";
    if (isInstitutionGroupPath(path)) return "institution";
    // Standalone leaves (Research, Placements, Scholarships, Alumni, Recruitment)
    // belong to no group — leave everything collapsed.
    return "";
  };

  const [openGroup, setOpenGroup] = useState<string>(() => detectOpenGroup(pathname));

  useEffect(() => {
    const g = detectOpenGroup(pathname);
    if (g) setOpenGroup(g);
  }, [pathname]);

  function toggleGroup(key: string) {
    setOpenGroup(prev => prev === key ? "" : key);
  }

  // ── Active detection ──────────────────────────────────────────────────────
  const isItemActive = (key: string, href: string, exact?: boolean): boolean => {
    if (exact) return pathname === href;
    if (key === "institutions")   return isInstitutionRoot(pathname);
    if (key === "compliance")     return pathname.includes("/compliance");
    if (key === "audit-log")      return pathname.includes("/audit-log");
    if (key === "iqac")           return pathname.includes("/iqac");
    if (key === "notices")        return pathname.includes("/notices");
    if (key === "lesson-plans")   return pathname.includes("/lesson-plans");
    if (key === "guest-lectures") return pathname.includes("/guest-lectures");
    if (key === "internships")    return pathname.includes("/internships");
    if (key === "curriculum")   return pathname.includes("/curriculum");
    if (key === "cia")          return pathname.includes("/cia");
    if (key === "exams")        return pathname.includes("/exams");
    if (key === "results")      return pathname.includes("/results");
    if (key === "promotion")    return pathname.includes("/promotion");
    if (key === "calendar")     return pathname.includes("/calendar");
    if (key === "subjects")     return pathname.includes("/subjects");
    return pathname.startsWith(href);
  };

  const isFinanceSubActive = (key: string) => {
    if (key === "overview")    return pathname === "/finance";
    if (key === "payments")    return pathname.includes("/finance/fees/payments");
    if (key === "demands")     return pathname.includes("/finance/demands");
    if (key === "fees")        return pathname.includes("/finance/fees") && !pathname.includes("/payments");
    if (key === "concessions") return pathname.includes("/finance/concessions");
    if (key === "salary")      return pathname.includes("/finance/salary");
    if (key === "statutory")   return pathname.includes("/finance/payroll/statutory");
    if (key === "reports")     return pathname.includes("/finance/reports");
    return false;
  };

  // ── Slug-based hrefs ──────────────────────────────────────────────────────
  const slug = activeInstSlug;
  const subjectsHref     = slug ? `/institutions/${slug}/subjects`      : "/institutions";
  const examsHref        = slug ? `/institutions/${slug}/exams`         : "/institutions";
  const resultsHref      = slug ? `/institutions/${slug}/results`       : "/institutions";
  const promotionHref    = slug ? `/institutions/${slug}/promotion`     : "/institutions";
  const calendarHref     = slug ? `/institutions/${slug}/calendar`      : "/institutions";
  const ciaHref          = slug ? `/institutions/${slug}/cia`           : "/institutions";
  const curriculumHref   = slug ? `/institutions/${slug}/curriculum`    : "/institutions";
  const lessonPlansHref    = slug ? `/institutions/${slug}/lesson-plans`    : "/institutions";
  const guestLecturesHref  = slug ? `/institutions/${slug}/guest-lectures`  : "/institutions";
  const internshipsHref    = slug ? `/institutions/${slug}/internships`      : "/institutions";
  const complianceHref     = slug ? `/institutions/${slug}/compliance`       : "/institutions";
  const auditLogHref       = slug ? `/institutions/${slug}/audit-log`        : "/institutions";
  const iqacSsrHref        = slug ? `/institutions/${slug}/iqac/ssr`         : "/institutions";
  const iqacHref           = slug ? `/institutions/${slug}/iqac`             : "/institutions";
  const knowledgeHubHref   = slug ? `/institutions/${slug}/knowledge-hub`    : "/institutions";
  const noticesHref        = slug ? `/institutions/${slug}/notices`          : "/institutions";
  const libraryHref        = slug ? `/institutions/${slug}/library`          : "/institutions";
  const bookingsHref       = slug ? `/institutions/${slug}/bookings`         : "/institutions";
  const hostelsHref        = slug ? `/institutions/${slug}/hostels`          : "/institutions";
  const laboratoriesHref   = slug ? `/institutions/${slug}/laboratories`     : "/institutions";
  const transportHref      = slug ? `/institutions/${slug}/transport`        : "/institutions";
  const certificatesHref   = slug ? `/institutions/${slug}/certificates`     : "/institutions";
  const onlineExamsHref    = slug ? `/institutions/${slug}/online-exams`      : "/institutions";
  const lmsHref            = slug ? `/institutions/${slug}/lms`               : "/institutions";
  const feedbackHref       = slug ? `/institutions/${slug}/feedback`          : "/institutions";
  const industryConnectHref = slug ? `/institutions/${slug}/industry-connect`  : "/institutions";
  const assetsHref         = slug ? `/institutions/${slug}/assets`           : "/institutions";
  const vendorsHref        = slug ? `/institutions/${slug}/vendors`          : "/institutions";
  const idCardsHref        = slug ? `/institutions/${slug}/id-cards`         : "/institutions";
  const gateHref           = slug ? `/institutions/${slug}/gate`             : "/institutions";
  const infirmaryHref      = slug ? `/institutions/${slug}/infirmary`        : "/institutions";
  const sportsHref         = slug ? `/institutions/${slug}/sports`           : "/institutions";
  const eventsHref         = slug ? `/institutions/${slug}/events`           : "/institutions";
  const admissionsHref     = slug ? `/institutions/${slug}/admissions`       : "/institutions";
  const admissionsCrmHref  = slug ? `/institutions/${slug}/admissions/crm`   : "/institutions";
  const meritListHref      = slug ? `/institutions/${slug}/admissions/crm/merit-list` : "/institutions";
  const recruitmentHref    = slug ? `/institutions/${slug}/recruitment`       : "/institutions";
  const alumniHref         = slug ? `/institutions/${slug}/alumni`            : "/institutions";
  const appraisalsHref     = slug ? `/institutions/${slug}/appraisals`        : "/institutions";
  const placementsHref     = slug ? `/institutions/${slug}/placements`        : "/institutions";
  const scholarshipsHref   = slug ? `/institutions/${slug}/scholarships`      : "/institutions";
  const disciplinaryHref   = slug ? `/institutions/${slug}/disciplinary`      : "/institutions";
  const grievancesHref     = slug ? `/institutions/${slug}/grievances`        : "/institutions";
  const researchHref       = slug ? `/institutions/${slug}/research`          : "/institutions";
  const staffAttendanceHref = slug ? `/institutions/${slug}/staff-attendance`  : "/institutions";
  const parentsHref        = slug ? `/institutions/${slug}/parents`           : "/institutions";
  const staffCareerHref     = slug ? `/institutions/${slug}/staff/career`      : "/institutions";

  const deptId = userAuth?.department_id;
  const myDeptHref = slug && deptId ? `/institutions/${slug}/department/${deptId}` : "/institutions";

  // ── Academics items ───────────────────────────────────────────────────────
  const adminAcademicsItems = [
    { key: "schedules",    href: "/schedules",     label: "Timetable",     Icon: Calendar },
    { key: "subjects",     href: subjectsHref,     label: "Subjects",      Icon: BookOpen },
    { key: "curriculum",   href: curriculumHref,   label: "Curriculum",    Icon: Library },
    { key: "lesson-plans",    href: lessonPlansHref,    label: "Lesson Plans",   Icon: BookText },
    { key: "guest-lectures",  href: guestLecturesHref,  label: "Guest Lectures", Icon: Mic2 },
    { key: "internships",     href: internshipsHref,     label: "Internships",    Icon: Briefcase },
    { key: "exams",           href: examsHref,           label: "Exams",          Icon: ClipboardList },
    { key: "online-exams",    href: onlineExamsHref,     label: "Online Exams",   Icon: MonitorCheck },
    { key: "lms",             href: lmsHref,             label: "E-Learning",     Icon: FileStack },
    { key: "cia",          href: ciaHref,          label: "CIA",           Icon: BadgePercent },
    { key: "results",      href: resultsHref,      label: "Results",       Icon: Award },
    { key: "promotion",    href: promotionHref,    label: "Promotion",     Icon: BadgeCheck },
    { key: "calendar",     href: calendarHref,     label: "Calendar",      Icon: CalendarDays },
  ];

  const hodAcademicsItems = adminAcademicsItems.filter(i => i.key !== "promotion");

  // ── Finance children (shared between expanded list and collapsed flyout) ──
  const financeChildren = FINANCE_SUB.map(item => {
    const fSlug = financeInstSlug ?? activeInstSlug;
    const href = item.key === "overview" ? item.href() : fSlug ? item.href(fSlug) : "/finance";
    return (
      <SubLink
        key={item.key}
        href={href}
        icon={<item.Icon size={14} strokeWidth={2} />}
        label={item.label}
        active={isFinanceSubActive(item.key)}
      />
    );
  });

  return (
    <aside
      className={`
        bg-[linear-gradient(180deg,#1b2139_0%,#151a2d_55%,#0e1220_100%)]
        border-r border-white/5 text-slate-300
        h-screen fixed top-0 left-0 flex flex-col z-20 transition-all duration-300
        ${isCollapsed ? "w-16" : "w-56"}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 border-b border-white/5 transition-all duration-300 ${
        isCollapsed ? "justify-center px-0" : "px-4 gap-3"
      }`}>
        <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center shrink-0 ring-1 ring-purple-400/40 shadow-sm shadow-purple-950/50">
          <Building2 className="text-white w-4 h-4" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <span className="text-lg font-bold text-white tracking-tight block truncate">AURA</span>
            {isStaffPortal ? (
              <span className="text-[9px] font-semibold text-purple-400 uppercase tracking-widest -mt-0.5 block">
                Staff Portal
              </span>
            ) : role === "hod" ? (
              <span className="text-[9px] font-semibold text-purple-400 uppercase tracking-widest -mt-0.5 block">
                HOD Panel
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-3 space-y-0.5 px-2 ${
        isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden custom-scrollbar"
      }`}>

        {/* ══ STAFF PORTAL ══ */}
        {isStaffPortal && STAFF_NAV.map(item => (
          <SidebarLink
            key={item.key}
            href={item.href}
            icon={<item.Icon size={18} />}
            label={item.label}
            active={"exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href)}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* ══ ADMIN / HOD ══ */}
        {!isStaffPortal && (
          <>
            {/* Dashboard — always standalone */}
            <SidebarLink
              href="/"
              icon={<LayoutDashboard size={18} />}
              label="Dashboard"
              active={pathname === "/"}
              isCollapsed={isCollapsed}
            />

            {/* HOD: My Department standalone */}
            {role === "hod" && slug && deptId && (
              <SidebarLink
                href={myDeptHref}
                icon={<Layers size={18} />}
                label="My Department"
                active={pathname.includes("/department/")}
                isCollapsed={isCollapsed}
              />
            )}

            {/* GROUP: Institution (admin only) */}
            {role !== "hod" && (
              <NavGroup
                icon={<Landmark size={18} />}
                label="Institution"
                isActive={isInstitutionGroupPath(pathname)}
                isOpen={openGroup === "institution"}
                onToggle={() => toggleGroup("institution")}
                isCollapsed={isCollapsed}
              >
                <SubLink href="/institutions" icon={<Landmark size={14} />} label="Institutions"
                  active={isItemActive("institutions", "/institutions")} />
                <SubLink href="/departments" icon={<Layers size={14} />} label="Departments"
                  active={isItemActive("departments", "/departments")} />
                <SubLink href={complianceHref} icon={<ShieldCheck size={14} />} label="Compliance"
                  active={isItemActive("compliance", complianceHref)} />
                <SubLink href={auditLogHref} icon={<ScrollText size={14} />} label="Audit Log"
                  active={isItemActive("audit-log", auditLogHref)} />
                <SubLink href={iqacHref} icon={<ClipboardCheck size={14} />} label="IQAC Dashboard"
                  active={pathname.endsWith("/iqac") || pathname.includes("/iqac/meetings") || pathname.includes("/iqac/aqar")} />
                <SubLink href={iqacSsrHref} icon={<Landmark size={14} />} label="NAAC SSR Builder"
                  active={pathname.includes("/iqac/ssr")} />
                <SubLink href={knowledgeHubHref} icon={<BrainCircuit size={14} />} label="Knowledge Hub"
                  active={pathname.includes("/knowledge-hub")} />
                <SubLink href={noticesHref} icon={<Megaphone size={14} />} label="Notices"
                  active={isItemActive("notices", noticesHref)} />
                <SubLink href={disciplinaryHref} icon={<ShieldAlert size={14} />} label="Disciplinary"
                  active={pathname.includes("/disciplinary")} />
                <SubLink href={grievancesHref} icon={<Scale size={14} />} label="Grievances"
                  active={pathname.includes("/grievances")} />
              </NavGroup>
            )}

            {/* GROUP: People */}
            <NavGroup
              icon={<Users size={18} />}
              label="People"
              isActive={isPeoplePath(pathname)}
              isOpen={openGroup === "people"}
              onToggle={() => toggleGroup("people")}
              isCollapsed={isCollapsed}
            >
              <SubLink href="/users/staff" icon={<Users size={14} />} label="Staff"
                active={isItemActive("staff", "/users/staff")} />
              <SubLink href="/users/students" icon={<GraduationCap size={14} />} label="Students"
                active={isItemActive("students", "/users/students")} />
              {role !== "hod" && (
                <SubLink href={appraisalsHref} icon={<ClipboardCheck size={14} />} label="Appraisals"
                  active={pathname.includes("/appraisals")} />
              )}
              <SubLink href={staffAttendanceHref} icon={<CalendarCheck size={14} />} label="Staff Attendance"
                active={pathname.includes("/staff-attendance")} />
              {role !== "hod" && (
                <SubLink href={staffCareerHref} icon={<UserCog size={14} />} label="Career Lifecycle"
                  active={pathname.includes("/staff/career")} />
              )}
              {role !== "hod" && (
                <SubLink href={parentsHref} icon={<Users size={14} />} label="Parents"
                  active={pathname.includes("/parents")} />
              )}
            </NavGroup>

            {/* GROUP: Academics */}
            <NavGroup
              icon={<BookOpen size={18} />}
              label="Academics"
              isActive={isAcademicPath(pathname)}
              isOpen={openGroup === "academics"}
              onToggle={() => toggleGroup("academics")}
              isCollapsed={isCollapsed}
            >
              {(role === "hod" ? hodAcademicsItems : adminAcademicsItems).map(item => (
                <SubLink
                  key={item.key}
                  href={item.href}
                  icon={<item.Icon size={14} />}
                  label={item.label}
                  active={isItemActive(item.key, item.href)}
                />
              ))}
            </NavGroup>

            {/* GROUP: Campus Infrastructure */}
            <NavGroup
              icon={<School size={18} />}
              label="Campus"
              isActive={isCampusPath(pathname)}
              isOpen={openGroup === "campus"}
              onToggle={() => toggleGroup("campus")}
              isCollapsed={isCollapsed}
            >
              <SubLink href={libraryHref}        icon={<Library size={14} />}      label="Library"        active={pathname.includes("/library")} />
              <SubLink href={bookingsHref}       icon={<Building2 size={14} />}    label="Bookings"       active={pathname.includes("/bookings")} />
              <SubLink href={hostelsHref}        icon={<BedDouble size={14} />}    label="Hostels"        active={pathname.includes("/hostels")} />
              <SubLink href={laboratoriesHref}   icon={<FlaskConical size={14} />} label="Laboratories"   active={pathname.includes("/laboratories")} />
              <SubLink href={transportHref}      icon={<Bus size={14} />}          label="Transport"      active={pathname.includes("/transport")} />
              <SubLink href={certificatesHref}   icon={<FileText size={14} />}     label="Certificates"   active={pathname.includes("/certificates")} />
              <SubLink href={feedbackHref}       icon={<MessageSquareHeart size={14} />} label="Feedback"  active={pathname.includes("/feedback")} />
              <SubLink href={industryConnectHref} icon={<Handshake size={14} />}    label="Industry Connect" active={pathname.includes("/industry-connect")} />
              <SubLink href={assetsHref}         icon={<Package size={14} />}      label="Assets"         active={pathname.includes("/assets")} />
              <SubLink href={vendorsHref}        icon={<Truck size={14} />}        label="Vendors"        active={pathname.includes("/vendors")} />
              <SubLink href={idCardsHref}        icon={<Nfc size={14} />}          label="ID Cards"       active={pathname.includes("/id-cards")} />
              <SubLink href={gateHref}           icon={<DoorOpen size={14} />}     label="Gate & Security" active={pathname.includes("/gate")} />
              <SubLink href={slug ? `/institutions/${slug}/clubs` : "/institutions"} icon={<Award size={14} />} label="Clubs & Groups" active={pathname.includes("/clubs")} />
              <SubLink href={infirmaryHref}      icon={<Stethoscope size={14} />}  label="Infirmary"      active={pathname.includes("/infirmary")} />
              <SubLink href={sportsHref}         icon={<Trophy size={14} />}       label="Sports"         active={pathname.includes("/sports")} />
              <SubLink href={eventsHref}         icon={<Star size={14} />}         label="Events"         active={pathname.includes("/events")} />
            </NavGroup>

            {/* GROUP: Admissions (admin only) — Phase 5 */}
            {role !== "hod" && (
              <NavGroup
                icon={<UserPlus size={18} />}
                label="Admissions"
                isActive={pathname.includes("/admissions")}
                isOpen={openGroup === "admissions"}
                onToggle={() => toggleGroup("admissions")}
                isCollapsed={isCollapsed}
              >
                <SubLink href={admissionsHref} icon={<ClipboardList size={14} />} label="Applications"
                  active={pathname.includes("/admissions") && !pathname.includes("/crm")} />
                <SubLink href={admissionsCrmHref} icon={<FileText size={14} />} label="Enquiries (CRM)"
                  active={pathname.includes("/admissions/crm") && !pathname.includes("/merit-list")} />
                <SubLink href={meritListHref} icon={<ListOrdered size={14} />} label="Merit List"
                  active={pathname.includes("/merit-list")} />
              </NavGroup>
            )}

            {/* Recruitment (admin only) — Phase 5B */}
            {role !== "hod" && (
              <SidebarLink
                href={recruitmentHref}
                icon={<Search size={18} />}
                label="Recruitment"
                active={pathname.includes("/recruitment")}
                isCollapsed={isCollapsed}
              />
            )}

            {/* Alumni (admin only) — Phase 5D */}
            {role !== "hod" && (
              <SidebarLink
                href={alumniHref}
                icon={<GraduationCap size={18} />}
                label="Alumni"
                active={pathname.includes("/alumni")}
                isCollapsed={isCollapsed}
              />
            )}

            {/* Placements (admin only) — Phase 5F */}
            {role !== "hod" && (
              <SidebarLink
                href={placementsHref}
                icon={<Briefcase size={18} />}
                label="Placements"
                active={pathname.includes("/placements")}
                isCollapsed={isCollapsed}
              />
            )}

            {/* Scholarships (admin only) — Phase 5G */}
            {role !== "hod" && (
              <SidebarLink
                href={scholarshipsHref}
                icon={<Award size={18} />}
                label="Scholarships"
                active={pathname.includes("/scholarships")}
                isCollapsed={isCollapsed}
              />
            )}

            {/* Research (admin only) — Phase 5I */}
            {role !== "hod" && (
              <SidebarLink
                href={researchHref}
                icon={<Microscope size={18} />}
                label="Research"
                active={pathname.includes("/research")}
                isCollapsed={isCollapsed}
              />
            )}

            {/* Finance (admin only) */}
            {role !== "hod" && (
              <NavGroup
                icon={<Wallet size={18} />}
                label="Finance"
                isActive={isFinanceActive}
                isOpen={openGroup === "finance"}
                onToggle={() => toggleGroup("finance")}
                isCollapsed={isCollapsed}
              >
                {financeChildren}
              </NavGroup>
            )}

            {/* Settings (admin only) */}
            {role !== "hod" && (
              <SidebarLink
                href="/settings"
                icon={<Settings size={18} />}
                label="Settings"
                active={pathname === "/settings"}
                isCollapsed={isCollapsed}
              />
            )}
          </>
        )}
      </nav>

      {/* Collapse / expand toggle */}
      {toggleSidebar && (
        <div className="border-t border-white/5 p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`${ROW_BASE} w-full text-[12px] ${LEAF_IDLE} ${
              isCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-2.5 px-2.5 py-2"
            }`}
          >
            {isCollapsed ? (
              <ChevronsRight size={18} className="text-slate-400" />
            ) : (
              <>
                <ChevronsLeft size={16} className="text-slate-400" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
