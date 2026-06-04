"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, ClipboardCheck, CalendarOff,
  Wallet, Building2, Menu, X, LogOut,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  staffName:    string;
  staffTitle:   string | null;
  designation:  string | null;
  institution:  string;
};

const NAV = [
  { href: "/staff-portal",            label: "Dashboard",   Icon: LayoutDashboard },
  { href: "/staff-portal/schedule",   label: "My Schedule", Icon: Calendar },
  { href: "/staff-portal/attendance", label: "Attendance",  Icon: ClipboardCheck },
  { href: "/staff-portal/leave",      label: "Leave",       Icon: CalendarOff },
  { href: "/staff-portal/salary",     label: "Salary",      Icon: Wallet },
] as const;

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export function StaffSidebar({ staffName, staffTitle, designation, institution }: Props) {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = "aura-role=; path=/; max-age=0";
    window.location.href = "/login";
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-white/20">
        <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center shrink-0">
          <Building2 className="text-white w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">AURA</p>
          <p className="text-[9px] text-slate-400 uppercase tracking-widest">Staff Portal</p>
        </div>
      </div>

      {/* Staff identity */}
      <div className="px-4 py-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
            {initials(staffName)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
              {staffTitle ? `${staffTitle} ` : ""}{staffName}
            </p>
            {designation && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{designation}</p>
            )}
            <p className="text-[10px] text-violet-500 dark:text-violet-400 truncate">{institution}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === "/staff-portal"
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                active
                  ? "bg-violet-100/80 text-violet-700 dark:bg-violet-600/20 dark:text-violet-300 border border-violet-200/60 dark:border-violet-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/20 space-y-2">
        <p className="text-[10px] text-slate-400 dark:text-slate-500">Aura 1.0 · Staff Portal</p>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-rose-50/80 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-r border-white/20 dark:border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile: hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <Menu size={18} className="text-slate-600 dark:text-slate-300" />
      </button>

      {/* Mobile: overlay drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative w-56 h-full bg-white/90 dark:bg-slate-900 backdrop-blur-xl border-r border-white/20 dark:border-slate-800 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={15} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
