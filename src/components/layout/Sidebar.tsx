"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, Settings, Building2, Calendar,
  GraduationCap, Layers, Landmark, Wallet,
  Tag, CreditCard, BarChart2, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();

  // ── Finance: reactive institution ID ────────────────────────────────────
  // Sources (in priority order):
  //  1. Current URL  — /institutions/[id]/finance/* paths
  //  2. Custom event — dispatched by /finance page when tab changes
  //  3. localStorage — persisted from any prior visit
  const [financeInstId, setFinanceInstId] = useState<string | null>(null);

  // Read URL on every navigation
  useEffect(() => {
    const segs   = pathname.split("/");
    const idx    = segs.indexOf("institutions");
    if (idx >= 0 && segs[idx + 1] && pathname.includes("/finance")) {
      const id = segs[idx + 1];
      setFinanceInstId(id);
      localStorage.setItem("aura_finance_inst", id);
      return;
    }
    // On /finance (no id in URL) fall back to localStorage
    const stored = localStorage.getItem("aura_finance_inst");
    if (stored) setFinanceInstId(stored);
  }, [pathname]);

  // Listen for the event dispatched by the Finance page when user switches tabs
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setFinanceInstId(id);
    };
    window.addEventListener("aura:finance:inst", handler);
    return () => window.removeEventListener("aura:finance:inst", handler);
  }, []);

  // ── Finance open/close state ──────────────────────────────────────────────
  const isFinanceActive = pathname === "/finance" || pathname.includes("/finance");
  const [financeOpen, setFinanceOpen] = useState(isFinanceActive);

  useEffect(() => {
    if (isFinanceActive) setFinanceOpen(true);
  }, [isFinanceActive]);

  // ── Finance sub-items ─────────────────────────────────────────────────────
  const financeSubItems = [
    {
      key:    "overview",
      label:  "Command Center",
      Icon:   LayoutDashboard,
      href:   "/finance",
      active: pathname === "/finance",
    },
    {
      key:    "fees",
      label:  "Fee Structures",
      Icon:   Tag,
      href:   financeInstId ? `/institutions/${financeInstId}/finance/fees` : "/finance",
      active: pathname.includes("/finance/fees") && !pathname.includes("/payments"),
    },
    {
      key:    "payments",
      label:  "All Payments",
      Icon:   CreditCard,
      href:   financeInstId ? `/institutions/${financeInstId}/finance/fees/payments` : "/finance",
      active: pathname.includes("/finance/fees/payments"),
    },
    {
      key:    "salary",
      label:  "Salaries",
      Icon:   Users,
      href:   financeInstId ? `/institutions/${financeInstId}/finance/salary` : "/finance",
      active: pathname.includes("/finance/salary"),
    },
    {
      key:    "reports",
      label:  "Reports",
      Icon:   BarChart2,
      href:   financeInstId ? `/institutions/${financeInstId}/finance/reports` : "/finance",
      active: pathname.includes("/finance/reports"),
    },
  ] as const;

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
          <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
            AURA
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto px-2 space-y-1">

        <NavItem href="/"               icon={<LayoutDashboard size={18} />} label="Dashboard"    active={pathname === "/"} isCollapsed={isCollapsed} />
        <NavItem href="/institutions"   icon={<Landmark size={18} />}        label="Institutions"  active={(pathname === "/institutions" || pathname.startsWith("/institutions/")) && !pathname.includes("/finance")} isCollapsed={isCollapsed} />
        <NavItem href="/departments"    icon={<Layers size={18} />}          label="Departments"   active={pathname === "/departments" || pathname.startsWith("/departments/")} isCollapsed={isCollapsed} />
        <NavItem href="/users/staff"    icon={<Users size={18} />}           label="Staff"         active={pathname === "/users/staff" || pathname === "/users"} isCollapsed={isCollapsed} />
        <NavItem href="/users/students" icon={<GraduationCap size={18} />}  label="Students"      active={pathname === "/users/students"} isCollapsed={isCollapsed} />
        <NavItem href="/schedules"      icon={<Calendar size={18} />}        label="Schedules"     active={pathname === "/schedules"} isCollapsed={isCollapsed} />

        {/* ── Finance — expandable ── */}
        {isCollapsed ? (
          // Collapsed: single icon link with tooltip
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
          // Expanded sidebar: parent + sub-items
          <div>
            {/* Finance parent row */}
            <div
              className={`flex items-center rounded-md text-sm font-medium transition-colors border ${
                isFinanceActive
                  ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-600/20 dark:text-purple-400 dark:border-purple-500/20"
                  : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {/* Label area — navigates to /finance */}
              <Link href="/finance" className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2">
                <Wallet size={18} className={`shrink-0 ${isFinanceActive ? "text-purple-700 dark:text-purple-400" : ""}`} />
                <span className="truncate">Finance</span>
              </Link>

              {/* Chevron toggle */}
              <button
                type="button"
                onClick={() => setFinanceOpen(o => !o)}
                aria-label="Toggle finance submenu"
                className="px-2.5 py-2 shrink-0 hover:opacity-70 transition-opacity"
              >
                <ChevronDown
                  size={13}
                  strokeWidth={2.5}
                  className={`transition-transform duration-200 ${financeOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Sub-items */}
            {financeOpen && (
              <div className="mt-0.5 ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5">
                {financeSubItems.map(item => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                      item.active
                        ? "bg-purple-100/80 text-purple-700 dark:bg-purple-600/15 dark:text-purple-400"
                        : "text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <item.Icon size={13} strokeWidth={2} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <NavItem href="/settings" icon={<Settings size={18} />} label="Settings" active={pathname === "/settings"} isCollapsed={isCollapsed} />
      </nav>
    </aside>
  );
}

// ── NavItem ────────────────────────────────────────────────────────────────

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
