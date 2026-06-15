"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview", ready: true },
  { href: "/admin/institutions", label: "Institutions", ready: true }, // Phase 7C
  // Built in Phase 7D/7E — visible now so the operator IA is stable.
  { href: "/admin/health", label: "Health", ready: false },
  { href: "/admin/billing", label: "Billing", ready: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {TABS.map((tab) =>
        tab.ready ? (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              pathname === tab.href || (tab.href !== "/admin" && pathname.startsWith(tab.href))
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        ) : (
          <span
            key={tab.href}
            title="Coming soon"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 dark:text-slate-600 cursor-not-allowed whitespace-nowrap select-none"
          >
            {tab.label}
          </span>
        )
      )}
    </nav>
  );
}
