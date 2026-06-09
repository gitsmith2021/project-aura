"use client";

import { useEffect, useState, use, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import { Plus, Tag, CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { ConcessionDrawer } from "@/components/finance/ConcessionDrawer";
import { getConcessionsByInstitution, approveConcession, rejectConcession, FeeConcession } from "@/actions/concessions";

type College = { id: string; name: string };
type AcademicYear = { id: string; label: string };

type ConcessionWithDetails = FeeConcession & {
  student: { id: string; full_name: string; roll_no: string | null } | null;
  academic_year: { label: string } | null;
};

export default function ConcessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const collegeId = resolvedParams.id;

  const [college, setCollege] = useState<College | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [concessions, setConcessions] = useState<ConcessionWithDetails[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "all">("pending");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [
      { data: collegeData },
      { data: ayData },
      result,
    ] = await Promise.all([
      supabase.from("institutions").select("id, name").eq("id", collegeId).single(),
      supabase.from("academic_years").select("id, label").eq("institution_id", collegeId).order("label", { ascending: false }),
      getConcessionsByInstitution(collegeId),
    ]);

    if (collegeData) setCollege(collegeData);
    if (ayData) setAcademicYears(ayData);
    if (result.success && result.data) {
      setConcessions(result.data as unknown as ConcessionWithDetails[]);
    }

    setLoading(false);
  }, [collegeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (concessionId: string) => {
    setActionLoadingId(concessionId);
    const res = await approveConcession(concessionId, collegeId);
    setActionLoadingId(null);
    if (res.success) {
      fetchData();
    } else {
      alert("Failed to approve: " + res.error);
    }
  };

  const handleReject = async (concessionId: string) => {
    setActionLoadingId(concessionId);
    const res = await rejectConcession(concessionId, collegeId);
    setActionLoadingId(null);
    if (res.success) {
      fetchData();
    } else {
      alert("Failed to reject: " + res.error);
    }
  };

  const filteredConcessions = concessions.filter((c) => {
    if (activeTab === "pending") return c.status === "pending";
    if (activeTab === "approved") return c.status === "approved";
    return true; // "all"
  });

  const formatConcessionValue = (c: ConcessionWithDetails) => {
    if (c.amount !== null) {
      return `₹${Number(c.amount).toLocaleString("en-IN")}`;
    }
    if (c.percentage !== null) {
      return `${c.percentage}% Off`;
    }
    return "N/A";
  };

  const formatType = (type: string) => {
    return type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const breadcrumb = (
    <>
      <Link href="/" className="hover:text-slate-900 transition-colors">Command Center</Link>
      <span className="mx-2 text-slate-300">/</span>
      <Link href={`/institutions/${collegeId}`} className="hover:text-slate-900 transition-colors">
        {college?.name || "College"}
      </Link>
      <span className="mx-2 text-slate-300">/</span>
      <Link href={`/institutions/${collegeId}/finance/fees`} className="hover:text-slate-900 transition-colors">
        Finance
      </Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Concessions</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full h-[calc(100vh-56px)] min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 shrink-0">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <Tag size={22} className="text-purple-600" />
                Fee Concessions & Waivers
              </h1>
            </div>

            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              <Plus size={14} strokeWidth={2.5} />
              Apply Concession
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 mb-4">
            <div className="flex gap-4">
              {([
                { id: "pending", label: "Pending Requests" },
                { id: "approved", label: "Approved" },
                { id: "all", label: "All Records" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-2 text-xs font-bold transition-all relative ${
                    activeTab === tab.id
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400 rounded-full"></span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="text-[11px] text-slate-400 font-semibold">
              {filteredConcessions.length} concessions in this view
            </div>
          </div>

          {/* List content */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredConcessions.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-750 rounded-xl bg-white/50 backdrop-blur-sm">
                <Tag size={44} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  No concessions found.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Create concessions for student ward, management quota, merit, or hardship waivers.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-6">
                {filteredConcessions.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-100 dark:border-slate-750 p-4 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.02)] hover:border-purple-100 dark:hover:border-purple-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Student & Value */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/35 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400 font-bold text-xs">
                        {c.student?.full_name ? c.student.full_name.substring(0, 2).toUpperCase() : "ST"}
                      </div>
                      
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {c.student?.full_name || "Unknown Student"}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Roll No: {c.student?.roll_no || "N/A"} · Year: {c.academic_year?.label || "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">
                          Reason: <span className="font-normal italic">"{c.reason}"</span>
                        </p>
                      </div>
                    </div>

                    {/* Middle: Details & Scope */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <div>
                        <div className="text-right md:text-left">
                          <span className="text-sm font-extrabold text-purple-700 dark:text-purple-400">
                            -{formatConcessionValue(c)}
                          </span>
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5 text-right md:text-left">
                          {formatType(c.concession_type)}
                          {c.applicable_to && ` (${c.applicable_to.toUpperCase()})`}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40"
                            : c.status === "rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40"
                            : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40"
                        }`}
                      >
                        {c.status === "approved" ? (
                          <CheckCircle2 size={11} />
                        ) : c.status === "rejected" ? (
                          <XCircle size={11} />
                        ) : (
                          <Clock size={11} />
                        )}
                        <span className="capitalize">{c.status}</span>
                      </span>
                    </div>

                    {/* Right: Actions */}
                    {c.status === "pending" && (
                      <div className="flex gap-2 shrink-0 justify-end">
                        <button
                          type="button"
                          onClick={() => handleReject(c.id)}
                          disabled={actionLoadingId === c.id}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-[10px] font-bold text-slate-600 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(c.id)}
                          disabled={actionLoadingId === c.id}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConcessionDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        institutionId={collegeId}
        academicYears={academicYears}
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
}
