"use client";

import { LayoutDashboard, Users, Settings, Building2, Calendar, GraduationCap, Layers, Landmark, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();

  const financeHref = "/finance";


  return (
    <aside
      className={`
        bg-slate-100 border-r border-slate-300
        dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 dark:border-slate-800
        h-screen fixed top-0 left-0 flex flex-col z-20 transition-all duration-300
        ${isCollapsed ? "w-16" : "w-56"}
      `}
    >
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

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
        <NavItem href="/"              icon={<LayoutDashboard size={18} />} label="Dashboard"   active={pathname === "/"}                                                                                    isCollapsed={isCollapsed} />
        <NavItem href="/institutions"  icon={<Landmark size={18} />}        label="Institutions" active={(pathname === "/institutions" || pathname.startsWith("/institutions/")) && !pathname.includes("/finance")} isCollapsed={isCollapsed} />
        <NavItem href="/departments"   icon={<Layers size={18} />}          label="Departments"  active={pathname === "/departments"  || pathname.startsWith("/departments/")}                                isCollapsed={isCollapsed} />
        <NavItem href="/users/staff"   icon={<Users size={18} />}           label="Staff"        active={pathname === "/users/staff"  || pathname === "/users"}                                               isCollapsed={isCollapsed} />
        <NavItem href="/users/students" icon={<GraduationCap size={18} />} label="Students"     active={pathname === "/users/students"}                                                                      isCollapsed={isCollapsed} />
        <NavItem href="/schedules"     icon={<Calendar size={18} />}        label="Schedules"    active={pathname === "/schedules"}                                                                           isCollapsed={isCollapsed} />
        <NavItem href={financeHref}    icon={<Wallet size={18} />}          label="Finance"      active={pathname === "/finance" || pathname.includes("/finance")}                                            isCollapsed={isCollapsed} />
        <NavItem href="/settings"      icon={<Settings size={18} />}        label="Settings"     active={pathname === "/settings"}                                                                            isCollapsed={isCollapsed} />
      </nav>
    </aside>
  );
}

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
