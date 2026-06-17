"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LayoutDashboard, UserCircle, Users, Menu, ChevronDown, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  displayName: string;
  batch: string | null;
  department: string | null;
  institution: string | null;
  email: string;
  children: React.ReactNode;
};

const NAV = [
  { key: "dashboard", href: "/alumni-portal",           label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { key: "profile",   href: "/alumni-portal/profile",   label: "My Profile", Icon: UserCircle },
  { key: "directory", href: "/alumni-portal/directory", label: "Directory", Icon: Users },
] as const;

export function AlumniPortalShell({ displayName, batch, department, institution, email, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    await createClient().auth.signOut();
    document.cookie = "aura-role=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 text-sm">
      {/* Sidebar */}
      <aside className={`bg-slate-100 border-r border-slate-300 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 dark:border-slate-800 h-screen fixed top-0 left-0 flex flex-col z-20 transition-all duration-300 ${collapsed ? "w-16" : "w-56"}`}>
        <div className={`flex items-center h-14 border-b border-slate-300 dark:border-slate-800 ${collapsed ? "justify-center px-0" : "px-4 gap-3"}`}>
          <div className="w-7 h-7 rounded-md bg-teal-600 flex items-center justify-center shrink-0 border border-teal-500">
            <GraduationCap className="text-white w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight block truncate">AURA</span>
              <span className="text-[9px] font-semibold text-teal-500 dark:text-teal-400 uppercase tracking-widest -mt-0.5 block">Alumni Portal</span>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mx-2 mt-3 mb-1 px-3 py-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{displayName}</p>
            {batch && <p className="text-[10px] text-teal-600 dark:text-teal-400 truncate mt-0.5">Batch {batch}</p>}
            {department && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{department}</p>}
          </div>
        )}

        <nav className="flex-1 py-3 space-y-1 overflow-y-auto px-2">
          {NAV.map((item) => {
            const active = isActive(item.href, "exact" in item ? item.exact : undefined);
            return (
              <div key={item.key} className="relative group">
                <Link
                  href={item.href}
                  className={`flex items-center rounded-md text-sm font-medium transition-colors ${collapsed ? "justify-center p-2 mx-auto w-10 h-10" : "gap-3 px-3 py-2"} ${
                    active
                      ? "bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-600/20 dark:text-teal-400 dark:border-teal-500/20"
                      : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <item.Icon size={18} className={active ? "text-teal-700 dark:text-teal-400" : ""} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className={`min-w-0 max-w-full flex-1 overflow-x-hidden transition-all duration-300 flex flex-col ${collapsed ? "ml-16" : "ml-56"}`}>
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={() => setCollapsed((v) => !v)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400">
              <Menu size={18} />
            </button>
            <div className="flex min-w-0 items-center text-xs text-slate-500 dark:text-slate-400">
              <span className="shrink-0">Alumni Portal</span>
              {institution && <><span className="mx-2 shrink-0 text-slate-300 dark:text-slate-600">/</span><span className="truncate font-semibold text-slate-900 dark:text-slate-100">{institution}</span></>}
            </div>
          </div>

          <div className="relative shrink-0">
            <div onClick={() => setDropdownOpen((v) => !v)} className="flex items-center gap-2 cursor-pointer px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
              <div className="w-7 h-7 rounded-md bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-xs font-semibold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 uppercase">
                {email.charAt(0)}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none truncate max-w-[120px]">{email.split("@")[0]}</span>
                <span className="text-[10px] text-teal-500 dark:text-teal-400 mt-0.5">Alumnus</span>
              </div>
              <ChevronDown size={14} className="text-slate-400 ml-1" />
            </div>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1 z-20 shadow-lg">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{email}</p>
                </div>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
