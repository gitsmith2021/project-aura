"use client";

import { useState, useEffect } from "react";
import { Menu, Bell, ChevronDown, User, Settings, LogOut, Sun, Moon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useTheme } from "@/context/ThemeContext";

export function Topbar({
  isSidebarCollapsed,
  toggleSidebar,
  breadcrumb,
}: {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  breadcrumb?: React.ReactNode;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [email, setEmail] = useState("");
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Clear the role cookie so middleware re-evaluates on next login
    document.cookie = "aura-role=; path=/; max-age=0";
    window.location.href = "/login";
  };

  return (
    <header className="h-14 min-w-0 max-w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 px-4 sticky top-0 z-10">
      <div className="flex min-w-0 flex-1 items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400 transition-colors"
        >
          <Menu size={18} />
        </button>
        <div className="flex min-w-0 items-center overflow-x-hidden text-xs">
          <span className="shrink-0 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors">
            AURA
          </span>
          <span className="mx-2 shrink-0 text-slate-300 dark:text-slate-600">/</span>
          {breadcrumb ? (
            <span className="flex min-w-0 flex-1 items-center overflow-hidden">{breadcrumb}</span>
          ) : (
            <span className="truncate text-slate-900 dark:text-slate-100">Command Center</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="p-1.5 rounded-md text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
          <Bell size={16} />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="relative">
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 cursor-pointer group px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 uppercase">
              {email ? email.charAt(0) : "S"}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none truncate max-w-[100px]">
                {email ? email.split("@")[0] : "Super Admin"}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Admin</span>
            </div>
            <ChevronDown size={14} className="text-slate-400 ml-1 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
          </div>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1 z-20 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100">Signed in as</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email || "admin@aura.edu"}</p>
              </div>
              <button className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                <User size={14} /> My Profile
              </button>
              <button className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                <Settings size={14} /> Settings
              </button>
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
  );
}
