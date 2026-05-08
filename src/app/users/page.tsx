"use client";

import { useEffect, useState, useMemo } from "react";
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import { Plus, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AddPersonModal } from "@/components/users/AddPersonModal";
import { Badge } from "@/components/ui/Badge";

type Person = {
  id: string;
  full_name: string;
  role: "STAFF" | "STUDENT";
  department_id: string;
  tenant_id: string;
  departments: { name: string } | null;
  tenants: { name: string } | null;
};

const PAGE_SIZE = 10;

export default function UsersPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"STAFF" | "STUDENT">("STAFF");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterDeptId, setFilterDeptId] = useState("");
  const [filterDeptOpen, setFilterDeptOpen] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string; tenant_id: string }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [page, setPage] = useState(1);

  const masterTabsRef = React.useRef<HTMLDivElement>(null);
  const [showMasterLeft, setShowMasterLeft] = useState(false);
  const [showMasterRight, setShowMasterRight] = useState(false);

  const fetchPeople = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*, departments(name), tenants(name)")
      .order("full_name", { ascending: true });
    if (!error && data) setPeople(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchPeople();
    const supabase = createClient();
    supabase.from("tenants").select("id, name").order("name").then(({ data }) => {
      if (data && data.length > 0) {
        setTenants(data);
        setSelectedTenantId(data[0].id);
      }
    });
    supabase.from("departments").select("id, name, tenant_id").order("name").then(({ data }) => {
      if (data) setDepartments(data);
    });
  }, []);

  const checkMasterScroll = React.useCallback(() => {
    const el = masterTabsRef.current;
    if (!el) return;
    setShowMasterLeft(el.scrollLeft > 4);
    setShowMasterRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkMasterScroll();
    const el = masterTabsRef.current;
    el?.addEventListener("scroll", checkMasterScroll);
    window.addEventListener("resize", checkMasterScroll);
    return () => { el?.removeEventListener("scroll", checkMasterScroll); window.removeEventListener("resize", checkMasterScroll); };
  }, [tenants, checkMasterScroll]);

  const scrollMasterTabs = (dir: "left" | "right") =>
    masterTabsRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });

  // Reset page whenever filters change
  useEffect(() => { setPage(1); }, [search, activeTab, filterDeptId, selectedTenantId]);

  const filteredDepts = useMemo(
    () => departments.filter(d => d.tenant_id === selectedTenantId),
    [departments, selectedTenantId]
  );

  // Clear department filter if it doesn't belong to the newly selected tenant
  useEffect(() => {
    if (filterDeptId && !filteredDepts.find(d => d.id === filterDeptId)) {
      setFilterDeptId("");
    }
  }, [selectedTenantId, filteredDepts, filterDeptId]);

  const filtered = useMemo(() =>
    people.filter(p =>
      p.tenant_id === selectedTenantId &&
      p.role === activeTab &&
      (filterDeptId ? p.department_id === filterDeptId : true) &&
      (
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.departments?.name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    ),
    [people, activeTab, filterDeptId, search, selectedTenantId]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeDept = departments.find(d => d.id === filterDeptId);

  return (
    <DashboardLayout>
      <div className="px-6 pt-3 pb-6 w-full relative flex flex-col h-[calc(100vh-56px)] overflow-hidden">

        {/* Master Tabs for Institutions */}
        <div className="relative flex items-stretch border-b border-slate-200 mb-4 shrink-0">
          {/* Left scroll arrow */}
          {showMasterLeft && (
            <button onClick={() => scrollMasterTabs("left")}
              className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-3 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent">
              <div className="w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <ChevronLeft size={12} className="text-slate-600" />
              </div>
            </button>
          )}

          <div ref={masterTabsRef} className="flex overflow-x-auto flex-1 custom-scrollbar" style={{ scrollbarWidth: "none" }}>
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTenantId(t.id)}
                className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  selectedTenantId === t.id
                    ? "border-violet-600 text-violet-700 bg-violet-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Right scroll arrow */}
          {showMasterRight && (
            <button onClick={() => scrollMasterTabs("right")}
              className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-3 bg-gradient-to-l from-slate-50/90 to-transparent">
              <div className="w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <ChevronRight size={12} className="text-slate-600" />
              </div>
            </button>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Users &amp; Roles</h1>
            <p className="text-slate-500 mt-1 text-xs">Manage staff and students across all institutions.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 transition-colors border border-purple-700"
          >
            <Plus size={14} strokeWidth={2.5} /> Add Person
          </button>
        </div>

        {/* Tabs + Search + Filter */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-5">
          {/* Role tabs */}
          <div className="flex bg-slate-100 p-1 rounded-md w-fit h-8 items-center">
            {(["STAFF", "STUDENT"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 h-full text-xs font-medium rounded-sm transition-colors ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {tab === "STAFF" ? "Staff" : "Students"}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            {/* Search — by name or department */}
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or department..."
                className="h-8 w-full pl-8 pr-3 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Department filter */}
            <div className="relative">
              <button
                onClick={() => setFilterDeptOpen(v => !v)}
                className={`h-8 flex items-center gap-1.5 px-3 border text-xs font-medium rounded-md transition-colors ${filterDeptId ? "border-purple-400 bg-purple-50 text-purple-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {activeDept ? activeDept.name : "Department"}
                {filterDeptId
                  ? <span onClick={e => { e.stopPropagation(); setFilterDeptId(""); }} className="ml-1 font-bold leading-none text-purple-400 hover:text-purple-700">×</span>
                  : <ChevronLeft size={12} className="-rotate-90 ml-0.5 text-slate-400" />
                }
              </button>

              {filterDeptOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-xl z-30 py-1 max-h-60 overflow-y-auto">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Filter by Department</p>
                  {filteredDepts.map(d => (
                    <button key={d.id} onClick={() => { setFilterDeptId(d.id); setFilterDeptOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${filterDeptId === d.id ? "bg-purple-50 text-purple-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                      {d.name}
                    </button>
                  ))}
                  {filterDeptId && (
                    <button onClick={() => { setFilterDeptId(""); setFilterDeptOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 border-t border-slate-100 mt-1">
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results meta */}
        {!loading && (
          <p className="text-[11px] text-slate-400 mb-3">
            Showing {paginated.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} {activeTab === "STAFF" ? "staff" : "students"}
            {filterDeptId && activeDept ? ` in ${activeDept.name}` : ""}
          </p>
        )}

        {/* Table Area */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="bg-white border border-slate-200 rounded-md flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">Department</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">Institution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto" />
                    </td>
                  </tr>
                ) : paginated.length > 0 ? (
                  paginated.map((person, i) => (
                    <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 text-xs">{person.full_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={person.role === "STAFF" ? "active" : "default"}>
                          {person.role === "STAFF" ? "Staff" : "Student"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{person.departments?.name || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{person.tenants?.name || "N/A"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400">
                      No {activeTab.toLowerCase()} found{search ? ` matching "${search}"` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 shrink-0">
            <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | "...")[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === "..." ? (
                    <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400">…</span>
                  ) : (
                    <button key={n} onClick={() => setPage(n as number)}
                      className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${page === n ? "bg-purple-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {n}
                    </button>
                  )
                )}

              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      <AddPersonModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchPeople} />
    </DashboardLayout>
  );
}
