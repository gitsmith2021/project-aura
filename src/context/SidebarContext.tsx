"use client";

import { createContext, useContext, useEffect, useState } from "react";

const SidebarContext = createContext<{ collapsed: boolean; toggle: () => void }>({
  collapsed: false,
  toggle: () => {},
});

// Holds the sidebar collapsed/expanded preference. Lives at the root layout so
// it survives client-side navigation (the per-page DashboardLayout remounts,
// but reads this persistent value) and is remembered across sessions.
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("aura-sidebar-collapsed");
    if (stored === "1") {
      Promise.resolve().then(() => setCollapsed(true));
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("aura-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
