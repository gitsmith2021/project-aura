"use client";

import { useState } from "react";
import { Search, Mail, Phone, MoreVertical } from "lucide-react";
import { DepartmentFundingBadge } from "@/components/departments/DepartmentFundingBadge";
import { setHOD, removeHOD } from "@/actions/departments";

interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  phone?: string | null;
  role: string;
  department?: { name: string; funding_type?: string | null } | null;
}

interface StaffDirectoryProps {
  staff: StaffMember[];
  departmentId?: string;
  institutionId?: string;
  hodId?: string | null;
  onRefresh?: () => void;
}

export function StaffDirectory({
  staff,
  departmentId,
  institutionId,
  hodId,
  onRefresh,
}: StaffDirectoryProps) {
  const [search, setSearch] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = staff.filter(
    (s) =>
      (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    if (!name) return "S";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSetHOD = async (staffId: string) => {
    if (!departmentId || !institutionId) return;
    setActionLoading(true);
    setActiveMenuId(null);
    const res = await setHOD(departmentId, staffId, institutionId);
    setActionLoading(false);
    if (res.success) {
      if (onRefresh) onRefresh();
    } else {
      alert("Failed to set HOD: " + res.error);
    }
  };

  const handleRemoveHOD = async () => {
    if (!departmentId || !institutionId) return;
    setActionLoading(true);
    setActiveMenuId(null);
    const res = await removeHOD(departmentId, institutionId);
    setActionLoading(false);
    if (res.success) {
      if (onRefresh) onRefresh();
    } else {
      alert("Failed to remove HOD: " + res.error);
    }
  };

  return (
    <div className="bg-white/75 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-100/90 dark:border-slate-700 shadow-[0_1px_8px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-full relative">
      {/* Click outside overlay for menu */}
      {activeMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
      )}

      <div className="p-4 border-b border-slate-100/90 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-0">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Faculty Directory</h3>
          <p className="text-[11px] text-slate-500">{staff.length} registered staff members</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search faculty..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:ring-offset-0 transition-colors placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-0 relative z-0">
        {filtered.length > 0 ? (
          <div className="divide-y divide-slate-100/80 dark:divide-slate-700">
            {filtered.map((member) => {
              const isMemberHOD = hodId === member.id;
              return (
                <div
                  key={member.id}
                  className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-3 group relative"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-teal-50 dark:from-purple-900/50 dark:to-teal-900/30 flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-700/50 text-purple-700 dark:text-purple-300 font-semibold text-xs">
                    {getInitials(member.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {member.full_name}
                      </p>
                      {isMemberHOD && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                          HOD
                        </span>
                      )}
                    </div>
                    {member.department?.name && (
                      <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium mt-0.5 flex items-center gap-1 min-w-0 flex-wrap">
                        <span className="truncate">{member.department.name}</span>
                        <DepartmentFundingBadge fundingType={member.department.funding_type} />
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      {member.email && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" /> {member.email}
                        </span>
                      )}
                      {member.phone && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                          <Phone className="w-3 h-3" /> {member.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {departmentId && institutionId && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                        disabled={actionLoading}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activeMenuId === member.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-150 dark:border-slate-700 py-1 z-20 text-xs">
                          {isMemberHOD ? (
                            <button
                              onClick={() => handleRemoveHOD()}
                              className="w-full text-left px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold"
                            >
                              Remove HOD
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSetHOD(member.id)}
                              className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-bold"
                            >
                              Set as HOD
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-xs text-slate-500">No faculty members found.</p>
          </div>
        )}
      </div>
    </div>
  );
}