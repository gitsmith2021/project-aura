"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, Settings, Building2, Calendar, GraduationCap,
  Layers, Landmark, Wallet, Tag, CreditCard, BarChart2, ChevronDown,
  ClipboardCheck, CalendarOff, CalendarDays, BookOpen, BadgePercent, ClipboardList, Award, BadgeCheck, Library, BookText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
// ── Admin nav (Settings rendered separately, always last) ─────────────────────

const ADMIN_MAIN = [
  { key: "dashboard",    href: "/",               label: "Dashboard",    Icon: LayoutDashboard, exact: true },
  { key: "institutions", href: "/institutions",   label: "Institutions", Icon: Landmark },
  { key: "departments",  href: "/departments",    label: "Departments",  Icon: Layers },
  { key: "staff",        href: "/users/staff",    label: "Staff",        Icon: Users },
  { key: "students",     href: "/users/students", label: "Students",     Icon: GraduationCap },
  { key: "schedules",    href: "/schedules",      label: "Schedules",    Icon: Calendar },
] as const;

const FINANCE_SUB = [
  { key: "overview",     label: "Command Center", Icon: LayoutDashboard, href: () => `/finance` },
  { key: "fees",         label: "Fee Structures",  Icon: Tag,             href: (id: string) => `/institutions/${id}/finance/fees` },
  { key: "payments",     label: "All Payments",    Icon: CreditCard,      href: (id: string) => `/institutions/${id}/finance/fees/payments` },
  { key: "concessions",  label: "Concessions",     Icon: BadgePercent,    href: (id: string) => `/institutions/${id}/finance/concessions` },
  { key: "salary",       label: "Salaries",        Icon: Users,           href: (id: string) => `/institutions/${id}/finance/salary` },
  { key: "reports",      label: "Reports",         Icon: BarChart2,       href: (id: string) => `/institutions/${id}/finance/reports` },
] as const;

// ── Staff nav ─────────────────────────────────────────────────────────────────

const STAFF_NAV = [
  { key: "dashboard",  href: "/staff-portal",            label: "Dashboard",   Icon: LayoutDashboard, exact: true },
  { key: "schedule",   href: "/staff-portal/schedule",   label: "My Schedule", Icon: Calendar },
  { key: "calendar",   href: "/staff-portal/calendar",   label: "Calendar",    Icon: CalendarDays },
  { key: "attendance", href: "/staff-portal/attendance", label: "Attendance",  Icon: ClipboardCheck },
  { key: "leave",      href: "/staff-portal/leave",      label: "Leave",       Icon: CalendarOff },
  { key: "salary",     href: "/staff-portal/salary",     label: "Salary",      Icon: Wallet },
] as const;

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({
  icon, label, active = false, isCollapsed, href,
}: {
  icon: React.ReactNode; label: string; active?: boolean; isCollapsed: boolean; href: string;
}) {
  return (
    <div className="relative group">
      <Link
        href={href}
        className={`flex items-center rounded-md text-sm font-medium transition-colors ${
          isCollapsed ? "justify-center p-2 mx-auto w-10 h-10" : "gap-3 px-3 py-2"
        } ${
          active
            ? "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-600/20 dark:text-purple-400 dark:border-purple-500/20"
            : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <div className={active ? "text-purple-700 dark:text-purple-400" : ""}>{icon}</div>
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
      {isCollapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-700 dark:bg-slate-800 text-slate-100 text-xs rounded-md border border-slate-600 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </div>
  );
}

// ── Accordion wrapper ─────────────────────────────────────────────────────────

function Accordion({
  icon, label, isActive, isOpen, onToggle, isCollapsed, children,
}: {
  icon: React.ReactNode; label: string; isActive: boolean; isOpen: boolean;
  onToggle: () => void; isCollapsed: boolean; children: React.ReactNode;
}) {
  if (isCollapsed) {
    return (
      <div className="relative group">
        <button
          type="button"
          onClick={onToggle}
          className={`flex justify-center p-2 mx-auto w-10 h-10 rounded-md text-sm font-medium transition-colors border ${
            isActive
              ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-600/20 dark:text-purple-400 dark:border-purple-500/20"
              : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <span className={isActive ? "text-purple-700 dark:text-purple-400" : ""}>{icon}</span>
        </button>
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-700 dark:bg-slate-800 text-slate-100 text-xs rounded-md border border-slate-600 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          {label}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={`flex items-center rounded-md text-sm font-medium transition-colors border ${
        isActive
          ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-600/20 dark:text-purple-400 dark:border-purple-500/20"
          : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      }`}>
        <button type="button" onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2 text-left">
          <span className={`shrink-0 ${isActive ? "text-purple-700 dark:text-purple-400" : ""}`}>{icon}</span>
          <span className="truncate">{label}</span>
        </button>
        <button type="button" onClick={onToggle} aria-label={`Toggle ${label}`} className="px-2.5 py-2 shrink-0 hover:opacity-70 transition-opacity">
          <ChevronDown size={13} strokeWidth={2.5} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      {isOpen && (
        <div className="mt-0.5 ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [userAuth, setUserAuth] = useState<{ role: string; tenant_id: string; department_id: string } | null>(null);

  // Read role from cookie on mount and path changes
  useEffect(() => {
    const cookiesList = document.cookie.split("; ");
    const roleCookie = cookiesList.find(row => row.startsWith("aura-role="));
    const currentRole = roleCookie ? roleCookie.split("=")[1] : null;
    setRole(currentRole);

    if (currentRole === "hod") {
      const supabase = createClient();
      supabase.rpc("get_user_authorizations").then(({ data }) => {
        if (data && data.length > 0) {
          setUserAuth(data[0]);
        }
      });
    }
  }, [pathname]);

  // Staff portal = the staff self-service area (/staff-portal/view/* is admin territory).
  const isStaffPortal = pathname.startsWith("/staff-portal") && !pathname.startsWith("/staff-portal/view") && role === "staff";

  // ── Finance accordion ─────────────────────────────────────────────────────
  const isFinanceActive = pathname === "/finance" || pathname.includes("/finance");
  const [financeOpen, setFinanceOpen] = useState(isFinanceActive);

  // Slugs are used for link generation; middleware rewrites them → UUID before pages run.
  // States start null on both server and client to avoid hydration mismatches.
  // A post-mount effect then reads localStorage / the aura-inst-slug login cookie.
  const [financeInstSlug, setFinanceInstSlug] = useState<string | null>(null);
  const [activeInstSlug,  setActiveInstSlug]  = useState<string | null>(null);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Post-mount only — never runs on server, so server/client HTML always matches.
  useEffect(() => {
    const slugFromCookie = document.cookie.split("; ")
      .find(r => r.startsWith("aura-inst-slug="))?.split("=")[1] ?? null;
    const storedSlug = localStorage.getItem("aura_active_inst_slug");
    // Discard any UUID accidentally stored under the slug key by an older code path
    const slug = (storedSlug && !UUID_RE.test(storedSlug)) ? storedSlug : slugFromCookie;
    if (slug) setActiveInstSlug(slug);

    const storedFinance = localStorage.getItem("aura_finance_inst_slug");
    const financeSlug = (storedFinance && !UUID_RE.test(storedFinance)) ? storedFinance : null;
    if (financeSlug) setFinanceInstSlug(financeSlug);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFinanceActive) setFinanceOpen(true);
  }, [isFinanceActive]);

  // Extract slug from pathname — only when the segment is actually a slug (not a UUID).
  // UUID URLs can appear transiently before the user re-logs in to get the slug cookie.
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
    } else if (segs.indexOf("institutions") < 0) {
      const storedSlug = localStorage.getItem("aura_active_inst_slug");
      if (storedSlug && !UUID_RE.test(storedSlug)) setActiveInstSlug(storedSlug);
      const storedFinanceSlug = localStorage.getItem("aura_finance_inst_slug");
      if (storedFinanceSlug && !UUID_RE.test(storedFinanceSlug)) setFinanceInstSlug(storedFinanceSlug);
    }
  }, [pathname]);

  // Admin: auto-load first institution slug on fresh sessions (no URL/localStorage)
  useEffect(() => {
    if (role !== "admin" || activeInstSlug) return;
    const stored = localStorage.getItem("aura_active_inst_slug");
    if (stored) { setActiveInstSlug(stored); return; }
    const supabase = createClient();
    supabase.from("institutions").select("slug").limit(1).maybeSingle().then(({ data }) => {
      if (data?.slug) {
        setActiveInstSlug(data.slug);
        localStorage.setItem("aura_active_inst_slug", data.slug);
      }
    });
  }, [role, activeInstSlug]);

  // HOD: fetch institution slug after get_user_authorizations resolves
  useEffect(() => {
    if (!userAuth?.tenant_id || activeInstSlug) return;
    const supabase = createClient();
    supabase.from("institutions").select("slug").eq("id", userAuth.tenant_id).maybeSingle().then(({ data }) => {
      if (data?.slug) {
        setActiveInstSlug(data.slug);
        localStorage.setItem("aura_active_inst_slug", data.slug);
      }
    });
  }, [userAuth?.tenant_id, activeInstSlug]);

  useEffect(() => {
    const handler = (e: Event) => {
      const slug = (e as CustomEvent<string>).detail;
      if (slug) setFinanceInstSlug(slug);
    };
    window.addEventListener("aura:finance:inst", handler);
    return () => window.removeEventListener("aura:finance:inst", handler);
  }, []);

  const isFinanceSubActive = (key: string) => {
    if (key === "overview")    return pathname === "/finance";
    if (key === "payments")    return pathname.includes("/finance/fees/payments");
    if (key === "fees")        return pathname.includes("/finance/fees") && !pathname.includes("/payments");
    if (key === "concessions") return pathname.includes("/finance/concessions");
    if (key === "salary")      return pathname.includes("/finance/salary");
    if (key === "reports")     return pathname.includes("/finance/reports");
    return false;
  };

  // ── Active detection helpers ──────────────────────────────────────────────
  const adminNavActive = (key: string, href: string, exact?: boolean) => {
    if (key === "institutions")
      return (pathname === "/institutions" || pathname.startsWith("/institutions/")) && !pathname.includes("/finance") && !pathname.includes("/calendar") && !pathname.includes("/subjects") && !pathname.includes("/exams") && !pathname.includes("/results") && !pathname.includes("/promotion") && !pathname.includes("/lesson-plans") && !pathname.includes("/curriculum") && !pathname.includes("/cia");
    if (key === "calendar")
      return pathname.includes("/calendar");
    if (key === "subjects")
      return pathname.includes("/subjects");
    if (key === "exams")
      return pathname.includes("/exams");
    if (key === "results")
      return pathname.includes("/results");
    if (key === "promotion")
      return pathname.includes("/promotion");
    if (key === "lesson-plans")
      return pathname.includes("/lesson-plans");
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const staffNavActive = (key: string, href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  // Build items based on HOD role
  const getNavItems = () => {
    const instSlug = activeInstSlug;
    const calendarHref  = instSlug ? `/institutions/${instSlug}/calendar`  : "/institutions";
    const subjectsHref  = instSlug ? `/institutions/${instSlug}/subjects`  : "/institutions";
    const examsHref     = instSlug ? `/institutions/${instSlug}/exams`     : "/institutions";
    const resultsHref   = instSlug ? `/institutions/${instSlug}/results`   : "/institutions";
    const promotionHref = instSlug ? `/institutions/${instSlug}/promotion` : "/institutions";
    const ciaHref          = instSlug ? `/institutions/${instSlug}/cia`           : "/institutions";
    const curriculumHref   = instSlug ? `/institutions/${instSlug}/curriculum`   : "/institutions";
    const lessonPlansHref  = instSlug ? `/institutions/${instSlug}/lesson-plans` : "/institutions";

    if (role === "hod") {
      const deptId = userAuth?.department_id;
      return [
        { key: "dashboard",    href: "/",               label: "Dashboard",    Icon: LayoutDashboard, exact: true },
        ...(instSlug && deptId ? [{ key: "my-department", href: `/institutions/${instSlug}/department/${deptId}`, label: "My Department", Icon: Layers }] : []),
        { key: "staff",        href: "/users/staff",    label: "Staff",        Icon: Users },
        { key: "students",     href: "/users/students", label: "Students",     Icon: GraduationCap },
        { key: "schedules",    href: "/schedules",      label: "Timetable",    Icon: Calendar },
        { key: "subjects",     href: subjectsHref,      label: "Subjects",     Icon: BookOpen },
        { key: "curriculum",   href: curriculumHref,    label: "Curriculum",   Icon: Library },
        { key: "exams",        href: examsHref,         label: "Exams",        Icon: ClipboardList },
        { key: "cia",           href: ciaHref,           label: "CIA",           Icon: BadgePercent },
        { key: "lesson-plans", href: lessonPlansHref,   label: "Lesson Plans",  Icon: BookText },
        { key: "results",      href: resultsHref,       label: "Results",       Icon: Award },
        { key: "calendar",     href: calendarHref,      label: "Calendar",      Icon: CalendarDays },
      ];
    }

    return [
      { key: "dashboard",    href: "/",               label: "Dashboard",    Icon: LayoutDashboard, exact: true },
      { key: "institutions", href: "/institutions",   label: "Institutions", Icon: Landmark },
      { key: "departments",  href: "/departments",    label: "Departments",  Icon: Layers },
      { key: "staff",        href: "/users/staff",    label: "Staff",        Icon: Users },
      { key: "students",     href: "/users/students", label: "Students",     Icon: GraduationCap },
      { key: "schedules",    href: "/schedules",      label: "Timetable",    Icon: Calendar },
      { key: "subjects",     href: subjectsHref,      label: "Subjects",     Icon: BookOpen },
      { key: "curriculum",   href: curriculumHref,    label: "Curriculum",   Icon: Library },
      { key: "exams",        href: examsHref,         label: "Exams",        Icon: ClipboardList },
      { key: "cia",          href: ciaHref,           label: "CIA",          Icon: BadgePercent },
      { key: "lesson-plans", href: lessonPlansHref,   label: "Lesson Plans", Icon: BookText },
      { key: "results",      href: resultsHref,       label: "Results",      Icon: Award },
      { key: "promotion",    href: promotionHref,     label: "Promotion",    Icon: BadgeCheck },
      { key: "calendar",     href: calendarHref,      label: "Calendar",     Icon: CalendarDays },
    ];
  };

  return (
    <aside
      className={`
        bg-slate-100 border-r border-slate-300
        dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 dark:border-slate-800
        h-screen fixed top-0 left-0 flex flex-col z-20 transition-all duration-300
        ${isCollapsed ? "w-16" : "w-56"}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 border-b border-slate-300 dark:border-slate-800 transition-all duration-300 ${
        isCollapsed ? "justify-center px-0" : "px-4 gap-3"
      }`}>
        <div className="w-7 h-7 rounded-md bg-purple-600 flex items-center justify-center shrink-0 border border-purple-500">
          <Building2 className="text-white w-4 h-4" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight block truncate">AURA</span>
            {isStaffPortal ? (
              <span className="text-[9px] font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-widest -mt-0.5 block">
                Staff Portal
              </span>
            ) : role === "hod" ? (
              <span className="text-[9px] font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-widest -mt-0.5 block">
                HOD Panel
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">

        {/* ═══ STAFF PORTAL NAV (logged in as staff) ═══ */}
        {isStaffPortal && STAFF_NAV.map(item => (
          <NavItem
            key={item.key}
            href={item.href}
            icon={<item.Icon size={18} />}
            label={item.label}
            active={staffNavActive(item.key, item.href, "exact" in item ? item.exact : undefined)}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* ═══ ADMIN / HOD NAV ═══ */}
        {!isStaffPortal && (
          <>
            {/* Main items */}
            {getNavItems().map(item => (
              <NavItem
                key={item.key}
                href={item.href}
                icon={<item.Icon size={18} />}
                label={item.label}
                active={adminNavActive(item.key, item.href, "exact" in item ? item.exact : undefined)}
                isCollapsed={isCollapsed}
              />
            ))}

            {/* Finance accordion (Admin only) */}
            {role !== "hod" && (
              <Accordion
                icon={<Wallet size={18} />}
                label="Finance"
                isActive={isFinanceActive}
                isOpen={financeOpen}
                onToggle={() => setFinanceOpen(o => !o)}
                isCollapsed={isCollapsed}
              >
                {FINANCE_SUB.map(item => {
                  const slug = financeInstSlug ?? activeInstSlug;
                  const href = item.key === "overview"
                    ? item.href()
                    : slug ? item.href(slug) : "/finance";
                  return (
                    <Link key={item.key} href={href}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                        isFinanceSubActive(item.key)
                          ? "bg-purple-100/80 text-purple-700 dark:bg-purple-600/15 dark:text-purple-400"
                          : "text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <item.Icon size={13} strokeWidth={2} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </Accordion>
            )}

            {/* Settings — Admin only */}
            {role !== "hod" && (
              <NavItem
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
    </aside>
  );
}
