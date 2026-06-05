"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type StaffRow = { id: string; full_name: string; title: string | null; departments: { name: string } | null };

export function StaffSearchBar() {
  const router   = useRouter();
  const pathname = usePathname();

  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<StaffRow[]>([]);
  const [all,      setAll]      = useState<StaffRow[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [open,     setOpen]     = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all staff once on mount
  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    createClient()
      .from("staff")
      .select("id, full_name, title, departments(name)")
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => { if (data) setAll(data as unknown as StaffRow[]); });
  }, [loaded]);

  // Filter as user types
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults(all.slice(0, 6)); return; }
    setResults(
      all.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        (s.departments?.name ?? "").toLowerCase().includes(q) ||
        (s.title ?? "").toLowerCase().includes(q)
      ).slice(0, 8)
    );
  }, [query, all]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(staffId: string) {
    // Keep the current sub-page when switching staff
    const segments  = pathname.split("/");
    const viewIdx   = segments.indexOf("view");
    const subPage   = viewIdx >= 0 && segments[viewIdx + 2] ? `/${segments[viewIdx + 2]}` : "";
    router.push(`/staff-portal/view/${staffId}${subPage}`);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg min-w-[220px] max-w-[280px]">
        <Search size={13} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search staff to view portal…"
          className="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setOpen(false); }}>
            <X size={12} className="text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {!query.trim() && (
            <p className="px-3 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              Staff Members
            </p>
          )}
          {results.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                {s.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  {s.title ? `${s.title} ` : ""}{s.full_name}
                </p>
                {s.departments?.name && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{s.departments.name}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
