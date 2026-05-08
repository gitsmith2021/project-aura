"use client";

import { useState, useEffect } from "react";
import { Menu, Bell, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function Topbar({ isSidebarCollapsed, toggleSidebar, breadcrumb }: { isSidebarCollapsed: boolean, toggleSidebar: () => void, breadcrumb?: React.ReactNode }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
        <button 
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center text-xs">
          <span className="hover:text-slate-900 cursor-pointer transition-colors">AURA</span>
          <span className="mx-2 text-slate-300">/</span>
          {breadcrumb ? breadcrumb : <span className="text-slate-900">Command Center</span>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
          <Bell size={16} />
        </button>
        <div className="h-4 w-px bg-slate-200"></div>
        <div className="relative">
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 cursor-pointer group px-2 py-1 hover:bg-slate-50 rounded-md transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-700 border border-purple-200 uppercase">
              {email ? email.charAt(0) : "S"}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-none truncate max-w-[100px]">
                {email ? email.split('@')[0] : "Super Admin"}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">Admin</span>
            </div>
            <ChevronDown size={14} className="text-slate-400 ml-1 group-hover:text-slate-600" />
          </div>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md py-1 z-20 shadow-lg shadow-slate-200/50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-900">Signed in as</p>
                <p className="text-xs text-slate-500 truncate">{email || "admin@aura.edu"}</p>
              </div>
              <button className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                <User size={14} /> My Profile
              </button>
              <button className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                <Settings size={14} /> Settings
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
