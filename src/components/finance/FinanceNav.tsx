"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Tag, CreditCard, Users, Receipt, BarChart2 } from "lucide-react";

const NAV_ITEMS = [
  { key: "overview",  label: "Overview",       Icon: LayoutDashboard, href: (id: string) => `/finance` },
  { key: "fees",      label: "Fee Structures",  Icon: Tag,             href: (id: string) => `/institutions/${id}/finance/fees` },
  { key: "payments",  label: "Payments",        Icon: CreditCard,      href: (id: string) => `/institutions/${id}/finance/fees/payments` },
  { key: "salary",    label: "Salary",          Icon: Users,           href: (id: string) => `/institutions/${id}/finance/salary` },
  { key: "expenses",  label: "Expenses",        Icon: Receipt,         href: (id: string) => `/institutions/${id}/finance/expenses` },
  { key: "reports",   label: "Reports",         Icon: BarChart2,       href: (id: string) => `/institutions/${id}/finance/reports` },
] as const;

export function FinanceNav() {
  const pathname = usePathname();

  // Extract institution id from /institutions/{id}/finance/...
  const segments    = pathname.split("/");
  const instIdx     = segments.indexOf("institutions");
  const institutionId = instIdx >= 0 ? segments[instIdx + 1] : null;

  if (!institutionId) return null;

  function isActive(item: typeof NAV_ITEMS[number]): boolean {
    const href = item.href(institutionId!);
    if (item.key === "overview") return pathname === "/finance";
    if (item.key === "payments") return pathname.startsWith(`/institutions/${institutionId}/finance/fees/payments`);
    if (item.key === "fees")     return pathname.startsWith(`/institutions/${institutionId}/finance/fees`) && !pathname.includes("/payments");
    return pathname.startsWith(href);
  }

  return (
    <div className="shrink-0 border-b border-slate-200/60 dark:border-slate-700/60 -mx-6 px-6 mb-4 overflow-x-auto">
      <div className="flex gap-0 min-w-max">
        {NAV_ITEMS.map(item => {
          const active = isActive(item);
          return (
            <Link
              key={item.key}
              href={item.href(institutionId)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold border-b-2 transition-all whitespace-nowrap -mb-px ${
                active
                  ? "border-violet-600 text-violet-700 dark:text-violet-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <item.Icon size={13} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
