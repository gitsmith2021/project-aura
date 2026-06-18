"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, LayoutDashboard, ClipboardCheck, Award, CreditCard, Menu, ChevronDown, LogOut, GraduationCap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { LinkedStudent } from "@/lib/parentPortal";

const NAV = [
  { key: "dashboard",  href: "/parent-portal",            label: "Dashboard",  Icon: LayoutDashboard, exact: true },
  { key: "attendance", href: "/parent-portal/attendance", label: "Attendance", Icon: ClipboardCheck },
  { key: "results",    href: "/parent-portal/results",    label: "Results",    Icon: Award },
  { key: "fees",       href: "/parent-portal/fees",       label: "Fees",       Icon: CreditCard },
] as const;

export function ParentPortalShell({
  parentName, email, kids, selectedChildId, institution, children,
}: {
  parentName: string; email: string; kids: LinkedStudent[]; selectedChildId: string | null;
  institution: string | null; children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const selected = kids.find((k) => k.studentId === selectedChildId) ?? kids[0] ?? null;

  function switchChild(id: string) {
    document.cookie = `aura-parent-child=${id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    router.refresh();
  }

  const handleLogout = async () => {
    await createClient().auth.signOut();
    document.cookie = "aura-role=; path=/; max-age=0";
    document.cookie = "aura-parent-child=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 text-sm">
      {/* Sidebar */}
      <aside className={`bg-slate-100 border-r border-slate-300 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 dark:border-slate-800 h-screen fixed top-0 left-0 flex flex-col z-20 transition-all duration-300 ${collapsed ? "w-16" : "w-56"}`}>
        <div className={`flex items-center h-14 border-b border-slate-300 dark:border-slate-800 ${collapsed ? "justify-center px-0" : "px-4 gap-3"}`}>
          <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center shrink-0 border border-amber-400">
            <Users className="text-white w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight block truncate">AURA</span>
              <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest -mt-0.5 block">Parent Portal</span>
            </div>
          )}
        </div>

        {!collapsed && selected && (
          <div className="mx-2 mt-3 mb-1 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
            <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider font-bold">Viewing</p>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">{selected.name}</p>
            {selected.rollNo && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{selected.rollNo}</p>}
          </div>
        )}

        <nav className="flex-1 py-3 space-y-1 overflow-y-auto px-2">
          {NAV.map((item) => {
            const active = isActive(item.href, "exact" in item ? item.exact : undefined);
            return (
              <Link key={item.key} href={item.href}
                className={`flex items-center rounded-md text-sm font-medium transition-colors ${collapsed ? "justify-center p-2 mx-auto w-10 h-10" : "gap-3 px-3 py-2"} ${
                  active
                    ? "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-600/20 dark:text-amber-400 dark:border-amber-500/20"
                    : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}>
                <item.Icon size={18} className={active ? "text-amber-700 dark:text-amber-400" : ""} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className={`min-w-0 max-w-full flex-1 overflow-x-hidden transition-all duration-300 flex flex-col ${collapsed ? "ml-16" : "ml-56"}`}>
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={() => setCollapsed((v) => !v)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400"><Menu size={18} /></button>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{institution ?? "Parent Portal"}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Child switcher */}
            {kids.length > 0 && (
              <div className="relative">
                <select
                  value={selected?.studentId ?? ""}
                  onChange={(e) => switchChild(e.target.value)}
                  className="appearance-none pl-7 pr-7 py-1.5 text-[12px] font-semibold rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer">
                  {kids.map((k) => <option key={k.studentId} value={k.studentId}>{k.name}</option>)}
                </select>
                <GraduationCap size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
              </div>
            )}

            <div className="relative">
              <div onClick={() => setDropdownOpen((v) => !v)} className="flex items-center gap-2 cursor-pointer px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
                <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 uppercase">{(parentName || email).charAt(0)}</div>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1 z-20 shadow-lg">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{parentName}</p>
                    <p className="text-xs text-slate-500 truncate">{email}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"><LogOut size={14} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
