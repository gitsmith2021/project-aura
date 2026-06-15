"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ChevronDown, User, Settings, LogOut, Sun, Moon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useTheme } from "@/context/ThemeContext";
import { ScrollableTabBar } from "./ScrollableTabBar";
import { useInstitution } from "@/context/InstitutionContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";



export function Topbar({
  isSidebarCollapsed,
  toggleSidebar,
}: {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState("Admin");
  const { theme, toggle } = useTheme();
  const { institutions, selectedId, setSelectedId, loading } = useInstitution();
  const pathname = usePathname();
  const router   = useRouter();

  // Detect URL-based institution routes: /institutions/[id]/...
  const urlInstMatch = pathname.match(/^\/institutions\/([^/]+)(\/.*)?$/);
  const urlInstId    = urlInstMatch?.[1];
  // Finance sub-page suffix (e.g. /finance/fees/payments)
  const urlInstSuffix = urlInstMatch?.[2] ?? "";

  // Active tab: URL-based routes carry the institution *slug*, so resolve it to
  // an id via the institutions list; other routes use the context selection.
  const activeInstId = urlInstId
    ? institutions.find(i => i.slug === urlInstId)?.id ?? null
    : selectedId;



  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
    // Real role label (e.g. "Principal") from the non-httpOnly cookie set at login
    const label = document.cookie.split("; ").find((c) => c.startsWith("aura-role-label="));
    if (label) setRoleLabel(decodeURIComponent(label.split("=")[1] ?? "Admin"));
  }, []);

  const handleTabClick = (inst: { id: string; slug: string | null }) => {
    setSelectedId(inst.id);
    // On URL-based institution routes, navigate to the equivalent page for the new institution
    if (urlInstId) {
      router.push(`/institutions/${inst.slug ?? inst.id}${urlInstSuffix}`);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = "aura-role=; path=/; max-age=0";
    window.location.href = "/login";
  };

  return (
    <header className="h-14 min-w-0 max-w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-stretch sticky top-0 z-10">

      {/* ── Hamburger ── */}
      <button
        onClick={toggleSidebar}
        className="flex shrink-0 items-center justify-center px-4 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors border-r border-slate-200 dark:border-slate-800"
      >
        <Menu size={18} />
      </button>

      {/* ── Institution tabs — fill available space ── */}
      <div className="flex-1 overflow-hidden flex items-stretch">
        {loading ? (
          <div className="flex items-center gap-3 px-5">
            <div className="h-3.5 w-28 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-3.5 w-20 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        ) : institutions.length === 0 ? (
          <div className="flex items-center px-5 text-xs text-slate-400">No institutions</div>
        ) : (
          <ScrollableTabBar innerClassName="items-center gap-0">
            {institutions.map((inst) => (
              <button
                key={inst.id}
                type="button"
                onClick={() => handleTabClick(inst)}
                className={`relative flex h-14 shrink-0 items-center whitespace-nowrap px-5 text-xs font-semibold transition-colors
                  after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 ${
                  activeInstId === inst.id
                    ? "text-violet-700 dark:text-violet-400 bg-violet-50/40 dark:bg-violet-950/15 after:bg-violet-600 dark:after:bg-violet-500"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 after:bg-transparent"
                }`}
              >
                {inst.name}
              </button>
            ))}
          </ScrollableTabBar>
        )}
      </div>

      {/* ── Right actions ── */}
      <div className="flex shrink-0 items-center gap-1 px-3 border-l border-slate-200 dark:border-slate-800">
        <button
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <NotificationBell />

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <div className="relative">
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 cursor-pointer group px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 uppercase shrink-0">
              {email ? email.charAt(0) : "S"}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none truncate max-w-[100px]">
                {email ? email.split("@")[0] : "User"}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{roleLabel}</span>
            </div>
            <ChevronDown size={14} className="text-slate-400 ml-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
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
