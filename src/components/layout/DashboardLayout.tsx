"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardLayout({ children, breadcrumb }: { children: React.ReactNode, breadcrumb?: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 text-sm">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      
      <main
        className={`min-w-0 max-w-full flex-1 overflow-x-hidden transition-all duration-300 flex flex-col ${isSidebarCollapsed ? "ml-16" : "ml-56"}`}
      >
        <Topbar 
          isSidebarCollapsed={isSidebarCollapsed} 
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          breadcrumb={breadcrumb}
        />
        {children}
      </main>
    </div>
  );
}
