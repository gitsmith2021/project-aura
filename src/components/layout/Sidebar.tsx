"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, Settings, Building2, Calendar, GraduationCap,
  Layers, Landmark, Wallet, Tag, CreditCard, BarChart2, ChevronDown,
  ClipboardCheck, CalendarOff, CalendarDays, BookOpen, BadgePercent,
  ClipboardList, Award, BadgeCheck, Library, BookText, Mic2, Briefcase,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// ── Finance sub-items ─────────────────────────────────────────────────────────
const FINANCE_SUB = [
  { key: "overview",    label: "Command Center", Icon: LayoutDashboard, href: () => `/finance` },
  { key: "fees",        label: "Fee Structures",  Icon: Tag,            href: (id: string) => `/institutions/${id}/finance/fees` },
  { key: "payments",    label: "All Payments",    Icon: CreditCard,     href: (id: string) => `/institutions/${id}/finance/fees/payments` },
  { key: "concessions", label: "Concessions",     Icon: BadgePercent,   href: (id: string) => `/institutions/${id}/finance/concessions` },
  { key: "salary",      label: "Salaries",        Icon: Users,          href: (id: string) => `/institutions/${id}/finance/salary` },
  { key: "reports",     label: "Reports",         Icon: BarChart2,      href: (id: string) => `/institutions/${id}/finance/reports` },
] as const;

// ── Staff portal nav (flat — already short) ───────────────────────────────────
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

// ── NavGroup — collapsible parent with NavItem children ───────────────────────
function NavGroup({
  groupKey, icon, label, isActive, isOpen, onToggle, isCollapsed, children,
}: {
  groupKey: string; icon: React.ReactNode; label: string;
  isActive: boolean; isOpen: boolean; onToggle: () => void;
  isCollapsed: boolean; children: React.ReactNode;
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
      {/* Group header — no href, toggle only */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
          isActive
            ? "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-600/10 dark:text-purple-400 dark:border-purple-500/10"
            : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <span className={`shrink-0 ${isActive ? "text-purple-700 dark:text-purple-400" : ""}`}>{icon}</span>
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
            isActive ? "text-purple-500" : "text-slate-400"
          }`}
        />
      </button>

      {/* Children */}
      {isOpen && (
        <div className="mt-0.5 ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5 py-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Finance accordion (sub-links are <Link> not NavItem) ──────────────────────
function FinanceAccordion({
  isActive, isOpen, onToggle, isCollapsed, children,
}: {
  isActive: boolean; isOpen: boolean; onToggle: () => void;
  isCollapsed: boolean; children: React.ReactNode;
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
          <Wallet size={18} className={isActive ? "text-purple-700 dark:text-purple-400" : ""} />
        </button>
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-700 dark:bg-slate-800 text-slate-100 text-xs rounded-md border border-slate-600 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          Finance
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
          isActive
            ? "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-600/10 dark:text-purple-400 dark:border-purple-500/10"
            : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <Wallet size={18} className={`shrink-0 ${isActive ? "text-purple-700 dark:text-purple-400" : ""}`} />
        <span className="flex-1 text-left">Finance</span>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
            isActive ? "text-purple-500" : "text-slate-400"
          }`}
        />
      </button>
      {isOpen && (
        <div className="mt-0.5 ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5 py-0.5">
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

  useEffect(() => {
    const cookiesList = document.cookie.split("; ");
    const roleCookie = cookiesList.find(row => row.startsWith("aura-role="));
    const currentRole = roleCookie ? roleCookie.split("=")[1] : null;
    setRole(currentRole);

    if (currentRole === "hod") {
      const supabase = createClient();
      supabase.rpc("get_user_authorizations").then(({ data }) => {
        if (data && data.length > 0) setUserAuth(data[0]);
      });
    }
  }, [pathname]);

  const isStaffPortal = pathname.startsWith("/staff-portal") && !pathname.startsWith("/staff-portal/view") && role === "staff";

  // ── Finance accordion ─────────────────────────────────────────────────────
  const isFinanceActive = pathname === "/finance" || pathname.includes("/finance");
  const [financeOpen, setFinanceOpen] = useState(isFinanceActive);
  useEffect(() => { if (isFinanceActive) setFinanceOpen(true); }, [isFinanceActive]);

  // ── Slug resolution ───────────────────────────────────────────────────────
  const [financeInstSlug, setFinanceInstSlug] = useState<string | null>(null);
  const [activeInstSlug,  setActiveInstSlug]  = useState<string | null>(null);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  useEffect(() => {
    const slugFromCookie = document.cookie.split("; ")
      .find(r => r.startsWith("aura-inst-slug="))?.split("=")[1] ?? null;
    const storedSlug = localStorage.getItem("aura_active_inst_slug");
    const slug = (storedSlug && !UUID_RE.test(storedSlug)) ? storedSlug : slugFromCookie;
    if (slug) setActiveInstSlug(slug);
    const storedFinance = localStorage.getItem("aura_finance_inst_slug");
    const financeSlug = (storedFinance && !UUID_RE.test(storedFinance)) ? storedFinance : null;
    if (financeSlug) setFinanceInstSlug(financeSlug);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Group open state ──────────────────────────────────────────────────────
  // Determine which group the current path belongs to and auto-open it
  const detectOpenGroup = (path: string): string => {
    if (path === "/" || path.startsWith("/settings")) return "";
    if (path.startsWith("/institutions") || path.startsWith("/departments")) return "institution";
    if (path.startsWith("/users")) return "people";
    if (
      path.startsWith("/schedules") || path.includes("/subjects") ||
      path.includes("/curriculum") || path.includes("/lesson-plans") ||
      path.includes("/guest-lectures") || path.includes("/internships") ||
      path.includes("/exams") || path.includes("/cia") ||
      path.includes("/results") || path.includes("/promotion") ||
      path.includes("/calendar")
    ) return "academics";
    if (path.includes("/finance")) return "finance";
    return "";
  };

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const g = detectOpenGroup(pathname);
    if (g) setOpenGroups(prev => new Set([...prev, g]));
  }, [pathname]);

  function toggleGroup(key: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ── Active detection ──────────────────────────────────────────────────────
  const isItemActive = (key: string, href: string, exact?: boolean): boolean => {
    if (exact) return pathname === href;
    if (key === "institutions")
      return (pathname === "/institutions" || pathname.startsWith("/institutions/")) &&
        !pathname.includes("/finance") && !pathname.includes("/calendar") &&
        !pathname.includes("/subjects") && !pathname.includes("/exams") &&
        !pathname.includes("/results") && !pathname.includes("/promotion") &&
        !pathname.includes("/lesson-plans") && !pathname.includes("/curriculum") &&
        !pathname.includes("/cia") && !pathname.includes("/internships");
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
    if (key === "fees")        return pathname.includes("/finance/fees") && !pathname.includes("/payments");
    if (key === "concessions") return pathname.includes("/finance/concessions");
    if (key === "salary")      return pathname.includes("/finance/salary");
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
    { key: "cia",          href: ciaHref,          label: "CIA",           Icon: BadgePercent },
    { key: "results",      href: resultsHref,      label: "Results",       Icon: Award },
    { key: "promotion",    href: promotionHref,    label: "Promotion",     Icon: BadgeCheck },
    { key: "calendar",     href: calendarHref,     label: "Calendar",      Icon: CalendarDays },
  ];

  const hodAcademicsItems = adminAcademicsItems.filter(i => i.key !== "promotion");

  // ── Sub-link renderer for Finance ─────────────────────────────────────────
  const financeSubLink = (item: typeof FINANCE_SUB[number]) => {
    const fSlug = financeInstSlug ?? activeInstSlug;
    const href = item.key === "overview" ? item.href() : fSlug ? item.href(fSlug) : "/finance";
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
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2">

        {/* ══ STAFF PORTAL ══ */}
        {isStaffPortal && STAFF_NAV.map(item => (
          <NavItem
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
            <NavItem
              href="/"
              icon={<LayoutDashboard size={18} />}
              label="Dashboard"
              active={pathname === "/"}
              isCollapsed={isCollapsed}
            />

            {/* HOD: My Department standalone */}
            {role === "hod" && slug && deptId && (
              <NavItem
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
                groupKey="institution"
                icon={<Landmark size={18} />}
                label="Institution"
                isActive={
                  pathname === "/institutions" ||
                  pathname.startsWith("/departments") ||
                  (pathname.startsWith("/institutions/") &&
                    !pathname.includes("/finance") && !pathname.includes("/calendar") &&
                    !pathname.includes("/subjects") && !pathname.includes("/exams") &&
                    !pathname.includes("/results") && !pathname.includes("/promotion") &&
                    !pathname.includes("/lesson-plans") && !pathname.includes("/curriculum") &&
                    !pathname.includes("/cia") && !pathname.includes("/internships"))
                }
                isOpen={openGroups.has("institution")}
                onToggle={() => toggleGroup("institution")}
                isCollapsed={isCollapsed}
              >
                <NavItem href="/institutions" icon={<Landmark size={14} />} label="Institutions"
                  active={isItemActive("institutions", "/institutions")} isCollapsed={false} />
                <NavItem href="/departments" icon={<Layers size={14} />} label="Departments"
                  active={isItemActive("departments", "/departments")} isCollapsed={false} />
              </NavGroup>
            )}

            {/* GROUP: People */}
            <NavGroup
              groupKey="people"
              icon={<Users size={18} />}
              label="People"
              isActive={pathname.startsWith("/users")}
              isOpen={openGroups.has("people")}
              onToggle={() => toggleGroup("people")}
              isCollapsed={isCollapsed}
            >
              <NavItem href="/users/staff" icon={<Users size={14} />} label="Staff"
                active={isItemActive("staff", "/users/staff")} isCollapsed={false} />
              <NavItem href="/users/students" icon={<GraduationCap size={14} />} label="Students"
                active={isItemActive("students", "/users/students")} isCollapsed={false} />
            </NavGroup>

            {/* GROUP: Academics */}
            <NavGroup
              groupKey="academics"
              icon={<BookOpen size={18} />}
              label="Academics"
              isActive={
                pathname.startsWith("/schedules") ||
                pathname.includes("/subjects") || pathname.includes("/curriculum") ||
                pathname.includes("/lesson-plans") || pathname.includes("/guest-lectures") ||
                pathname.includes("/internships") ||
                pathname.includes("/exams") ||
                pathname.includes("/cia") || pathname.includes("/results") ||
                pathname.includes("/promotion") || pathname.includes("/calendar")
              }
              isOpen={openGroups.has("academics")}
              onToggle={() => toggleGroup("academics")}
              isCollapsed={isCollapsed}
            >
              {(role === "hod" ? hodAcademicsItems : adminAcademicsItems).map(item => (
                <NavItem
                  key={item.key}
                  href={item.href}
                  icon={<item.Icon size={14} />}
                  label={item.label}
                  active={isItemActive(item.key, item.href)}
                  isCollapsed={false}
                />
              ))}
            </NavGroup>

            {/* Finance (admin only) */}
            {role !== "hod" && (
              <FinanceAccordion
                isActive={isFinanceActive}
                isOpen={financeOpen}
                onToggle={() => setFinanceOpen(o => !o)}
                isCollapsed={isCollapsed}
              >
                {FINANCE_SUB.map(financeSubLink)}
              </FinanceAccordion>
            )}

            {/* Settings (admin only) */}
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
