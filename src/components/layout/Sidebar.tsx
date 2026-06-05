"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, Settings, Building2, Calendar, GraduationCap,
  Layers, Landmark, Wallet, Tag, CreditCard, BarChart2, ChevronDown,
  ClipboardCheck, CalendarOff,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Admin nav ─────────────────────────────────────────────────────────────────

const ADMIN_NAV = [
  { key: "dashboard",    href: "/",               label: "Dashboard",    Icon: LayoutDashboard, exact: true },
  { key: "institutions", href: "/institutions",   label: "Institutions", Icon: Landmark },
  { key: "departments",  href: "/departments",    label: "Departments",  Icon: Layers },
  { key: "staff",        href: "/users/staff",    label: "Staff",        Icon: Users },
  { key: "students",     href: "/users/students", label: "Students",     Icon: GraduationCap },
  { key: "schedules",    href: "/schedules",      label: "Schedules",    Icon: Calendar },
  { key: "settings",     href: "/settings",       label: "Settings",     Icon: Settings },
] as const;

const FINANCE_SUB = [
  { key: "overview",  label: "Command Center", Icon: LayoutDashboard, href: () => `/finance` },
  { key: "fees",      label: "Fee Structures",  Icon: Tag,             href: (id: string) => `/institutions/${id}/finance/fees` },
  { key: "payments",  label: "All Payments",    Icon: CreditCard,      href: (id: string) => `/institutions/${id}/finance/fees/payments` },
  { key: "salary",    label: "Salaries",        Icon: Users,           href: (id: string) => `/institutions/${id}/finance/salary` },
  { key: "reports",   label: "Reports",         Icon: BarChart2,       href: (id: string) => `/institutions/${id}/finance/reports` },
] as const;

// ── Staff nav ─────────────────────────────────────────────────────────────────

const STAFF_NAV = [
  { key: "dashboard",   href: "/staff-portal",            label: "Dashboard",    Icon: LayoutDashboard, exact: true },
  { key: "schedule",    href: "/staff-portal/schedule",   label: "My Schedule",  Icon: Calendar },
  { key: "attendance",  href: "/staff-portal/attendance", label: "Attendance",   Icon: ClipboardCheck },
  { key: "leave",       href: "/staff-portal/leave",      label: "Leave",        Icon: CalendarOff },
  { key: "salary",      href: "/staff-portal/salary",     label: "Salary",       Icon: Wallet },
] as const;

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({
  icon, label, active = false, isCollapsed, href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isCollapsed: boolean;
  href: string;
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

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const isStaffPortal = pathname.startsWith("/staff-portal");

  // ── Finance: institution ID for sub-links ─────────────────────────────────
  const [financeInstId, setFinanceInstId] = useState<string | null>(null);

  useEffect(() => {
    const segs   = pathname.split("/");
    const idx    = segs.indexOf("institutions");
    if (idx >= 0 && segs[idx + 1] && pathname.includes("/finance")) {
      const id = segs[idx + 1];
      setFinanceInstId(id);
      localStorage.setItem("aura_finance_inst", id);
      return;
    }
    const stored = localStorage.getItem("aura_finance_inst");
    if (stored) setFinanceInstId(stored);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setFinanceInstId(id);
    };
    window.addEventListener("aura:finance:inst", handler);
    return () => window.removeEventListener("aura:finance:inst", handler);
  }, []);

  // ── Finance accordion state ────────────────────────────────────────────────
  const isFinanceActive = pathname === "/finance" || pathname.includes("/finance");
  const [financeOpen, setFinanceOpen] = useState(isFinanceActive);

  useEffect(() => {
    if (isFinanceActive) setFinanceOpen(true);
  }, [isFinanceActive]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isFinanceSubActive = (key: string) => {
    if (key === "overview") return pathname === "/finance";
    if (key === "payments") return pathname.includes("/finance/fees/payments");
    if (key === "fees")     return pathname.includes("/finance/fees") && !pathname.includes("/payments");
    if (key === "salary")   return pathname.includes("/finance/salary");
    if (key === "reports")  return pathname.includes("/finance/reports");
    return false;
  };

  const adminNavActive = (key: string, href: string, exact?: boolean) => {
    if (key === "institutions")
      return (pathname === "/institutions" || pathname.startsWith("/institutions/")) && !pathname.includes("/finance");
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const staffNavActive = (key: string, href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
      <div
        className={`flex items-center h-14 border-b border-slate-300 dark:border-slate-800 transition-all duration-300 ${
          isCollapsed ? "justify-center px-0" : "px-4 gap-3"
        }`}
      >
        <div className="w-7 h-7 rounded-md bg-purple-600 flex items-center justify-center shrink-0 border border-purple-500">
          <Building2 className="text-white w-4 h-4" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight block truncate">AURA</span>
            {isStaffPortal && (
              <span className="text-[9px] font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-widest -mt-0.5 block">
                Staff Portal
              </span>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">

        {/* ── STAFF NAV ── */}
        {isStaffPortal && STAFF_NAV.map((item) => (
          <NavItem
            key={item.key}
            href={item.href}
            icon={<item.Icon size={18} />}
            label={item.label}
            active={staffNavActive(item.key, item.href, "exact" in item ? item.exact : undefined)}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* ── ADMIN NAV ── */}
        {!isStaffPortal && (
          <>
            {ADMIN_NAV.map((item) => (
              <NavItem
                key={item.key}
                href={item.href}
                icon={<item.Icon size={18} />}
                label={item.label}
                active={adminNavActive(item.key, item.href, "exact" in item ? item.exact : undefined)}
                isCollapsed={isCollapsed}
              />
            ))}

            {/* Finance accordion */}
            {isCollapsed ? (
              <div className="relative group">
                <Link
                  href="/finance"
                  className={`flex justify-center p-2 mx-auto w-10 h-10 rounded-md text-sm font-medium transition-colors border ${
                    isFinanceActive
                      ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-600/20 dark:text-purple-400 dark:border-purple-500/20"
                      : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Wallet size={18} className={isFinanceActive ? "text-purple-700 dark:text-purple-400" : ""} />
                </Link>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-700 dark:bg-slate-800 text-slate-100 text-xs rounded-md border border-slate-600 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  Finance
                </div>
              </div>
            ) : (
              <div>
                <div className={`flex items-center rounded-md text-sm font-medium transition-colors border ${
                  isFinanceActive
                    ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-600/20 dark:text-purple-400 dark:border-purple-500/20"
                    : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}>
                  <Link href="/finance" className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2">
                    <Wallet size={18} className={`shrink-0 ${isFinanceActive ? "text-purple-700 dark:text-purple-400" : ""}`} />
                    <span className="truncate">Finance</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setFinanceOpen(o => !o)}
                    aria-label="Toggle finance submenu"
                    className="px-2.5 py-2 shrink-0 hover:opacity-70 transition-opacity"
                  >
                    <ChevronDown size={13} strokeWidth={2.5} className={`transition-transform duration-200 ${financeOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {financeOpen && (
                  <div className="mt-0.5 ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5">
                    {FINANCE_SUB.map(item => {
                      const href = item.key === "overview"
                        ? item.href()
                        : financeInstId
                          ? item.href(financeInstId)
                          : "/finance";
                      return (
                        <Link
                          key={item.key}
                          href={href}
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
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </nav>
    </aside>
  );
}
