"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Calendar, ClipboardCheck, CalendarOff, Wallet, Menu, Bell, Sun, Moon, ChevronDown, LogOut, ArrowLeft, ShieldAlert } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { createClient } from "@/utils/supabase/client";

type StaffViewShellProps = {
  staffId: string;
  displayName: string;
  designation?: string | null;
  department?: string | null;
  institution?: string | null;
  children: React.ReactNode;
};

function NavItem({
  href, label, icon, active, isCollapsed, exact,
}: {
  href: string; label: string; icon: React.ReactNode;
  active: boolean; isCollapsed: boolean; exact?: boolean;
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
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
          {label}
        </div>
      )}
    </div>
  );
}

export function StaffViewShell({
  staffId, displayName, designation, department, institution, children,
}: StaffViewShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const { theme, toggle } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setAdminEmail(user.email);
    });
  }, []);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    document.cookie = "aura-role=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const base = `/staff-portal/view/${staffId}`;
  const nav = [
    { key: "dashboard",  href: base,                   label: "Dashboard",   Icon: LayoutDashboard, exact: true },
    { key: "schedule",   href: `${base}/schedule`,     label: "My Schedule", Icon: Calendar },
    { key: "attendance", href: `${base}/attendance`,   label: "Attendance",  Icon: ClipboardCheck },
    { key: "leave",      href: `${base}/leave`,        label: "Leave",       Icon: CalendarOff },
    { key: "salary",     href: `${base}/salary`,       label: "Salary",      Icon: Wallet },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 text-sm transition-colors duration-200">

      {/* ── Sidebar ── */}
      <aside className={`bg-slate-100 border-r border-slate-300 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 dark:border-slate-800 h-screen fixed top-0 left-0 flex flex-col z-20 transition-all duration-300 ${collapsed ? "w-16" : "w-56"}`}>

        {/* Logo */}
        <div className={`flex items-center h-14 border-b border-slate-300 dark:border-slate-800 transition-all duration-300 ${collapsed ? "justify-center px-0" : "px-4 gap-3"}`}>
          <div className="w-7 h-7 rounded-md bg-purple-600 flex items-center justify-center shrink-0 border border-purple-500">
            <Building2 className="text-white w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight block truncate">AURA</span>
              <span className="text-[9px] font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-widest -mt-0.5 block">
                Staff Portal
              </span>
            </div>
          )}
        </div>

        {/* Staff identity */}
        {!collapsed && (
          <div className="mx-2 mt-3 mb-1 px-3 py-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/40">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={10} className="text-violet-500 shrink-0" />
              <span className="text-[9px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-widest">Admin Preview</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{displayName}</p>
            {department && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{department}</p>}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-1 overflow-y-auto px-2">
          {nav.map((item) => (
            <NavItem
              key={item.key}
              href={item.href}
              label={item.label}
              icon={<item.Icon size={18} />}
              active={isActive(item.href, item.exact)}
              isCollapsed={collapsed}
              exact={item.exact}
            />
          ))}
        </nav>

        {/* Back to Staff link */}
        <div className="px-2 pb-3 border-t border-slate-200 dark:border-slate-800 pt-2">
          <Link
            href="/users/staff"
            className={`flex items-center rounded-md text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors border border-transparent ${collapsed ? "justify-center p-2" : "gap-2 px-3 py-2"}`}
          >
            <ArrowLeft size={15} />
            {!collapsed && "Back to Staff"}
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={`min-w-0 max-w-full flex-1 overflow-x-hidden transition-all duration-300 flex flex-col ${collapsed ? "ml-16" : "ml-56"}`}>

        {/* Topbar */}
        <header className="h-14 min-w-0 max-w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400 transition-colors"
            >
              <Menu size={18} />
            </button>
            {/* Breadcrumb */}
            <div className="flex min-w-0 items-center text-xs text-slate-500 dark:text-slate-400">
              <span className="shrink-0">Staff Portal</span>
              <span className="mx-2 shrink-0 text-slate-300 dark:text-slate-600">/</span>
              <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{displayName}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
              <Bell size={16} />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="relative">
              <div
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 cursor-pointer px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 uppercase">
                  {adminEmail ? adminEmail.charAt(0) : "A"}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none truncate max-w-[120px]">
                    {adminEmail ? adminEmail.split("@")[0] : "Admin"}
                  </span>
                  <span className="text-[10px] text-violet-500 dark:text-violet-400 mt-0.5">Admin Preview</span>
                </div>
                <ChevronDown size={14} className="text-slate-400 ml-1" />
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1 z-20 shadow-lg">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100">Signed in as Admin</p>
                    <p className="text-xs text-slate-500 truncate">{adminEmail}</p>
                  </div>
                  <Link
                    href="/users/staff"
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <ArrowLeft size={14} /> Back to Staff List
                  </Link>
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
