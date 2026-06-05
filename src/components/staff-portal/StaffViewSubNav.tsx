"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, ClipboardCheck, CalendarOff, Wallet,
} from "lucide-react";

const SUB_NAV = [
  { label: "Dashboard",  suffix: "",            Icon: LayoutDashboard },
  { label: "Schedule",   suffix: "/schedule",   Icon: Calendar },
  { label: "Attendance", suffix: "/attendance", Icon: ClipboardCheck },
  { label: "Leave",      suffix: "/leave",      Icon: CalendarOff },
  { label: "Salary",     suffix: "/salary",     Icon: Wallet },
] as const;

export function StaffViewSubNav({ staffId }: { staffId: string }) {
  const pathname = usePathname();
  const base     = `/staff-portal/view/${staffId}`;

  return (
    <div className="flex gap-0 border-b border-slate-200/80 dark:border-slate-700/60">
      {SUB_NAV.map(({ label, suffix, Icon }) => {
        const href     = `${base}${suffix}`;
        const isActive = suffix === ""
          ? pathname === href
          : pathname.startsWith(href);
        return (
          <Link
            key={label}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold border-b-2 -mb-px whitespace-nowrap transition-all ${
              isActive
                ? "border-violet-600 text-violet-700 dark:text-violet-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            <Icon size={12} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
