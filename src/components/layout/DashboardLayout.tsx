"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useSidebar } from "@/context/SidebarContext";

export function DashboardLayout({
  children,
  breadcrumb,
}: {
  children: React.ReactNode;
  breadcrumb?: React.ReactNode;
}) {
  const { collapsed, toggle } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 text-sm transition-colors duration-200">
      <Sidebar isCollapsed={collapsed} toggleSidebar={toggle} />

      <main
        className={`min-w-0 max-w-full flex-1 overflow-x-hidden transition-all duration-300 flex flex-col ${
          collapsed ? "ml-16" : "ml-56"
        }`}
      >
        <Topbar isSidebarCollapsed={collapsed} toggleSidebar={toggle} />
        {children}
      </main>
    </div>
  );
}
