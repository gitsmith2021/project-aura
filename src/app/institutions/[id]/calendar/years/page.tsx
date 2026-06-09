"use client";

import React, { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, CheckCircle, HelpCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import {
  AcademicYear,
  getAcademicYears,
  createAcademicYear,
  setYearAsCurrent,
} from "@/actions/academicCalendar";

export default function AcademicYearsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const collegeId = resolvedParams.id;

  const [collegeName, setCollegeName] = useState("College Dashboard");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  // Form states
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch college name
    const { data: college } = await supabase
      .from("institutions")
      .select("name")
      .eq("id", collegeId)
      .single();
    if (college) {
      setCollegeName(college.name);
    }

    // Fetch Academic Years
    const res = await getAcademicYears(collegeId);
    if (res.success && res.data) {
      setAcademicYears(res.data);
    }

    setLoading(false);
  }, [collegeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!label.trim()) {
      setErrorMsg("Please enter an academic year label.");
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg("Please select both start and end dates.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg("End date must be on or after start date.");
      return;
    }

    setSubmitLoading(true);
    const res = await createAcademicYear({
      institution_id: collegeId,
      label,
      start_date: startDate,
      end_date: endDate,
      is_current: isCurrent,
    });
    setSubmitLoading(false);

    if (res.success) {
      setSuccessMsg(`Successfully created academic year: ${label}`);
      setLabel("");
      setStartDate("");
      setEndDate("");
      setIsCurrent(false);
      await fetchData();
    } else {
      setErrorMsg(res.error || "Failed to create academic year. Check if label already exists.");
    }
  };

  const handleSetCurrent = async (yearId: string, yearLabel: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    const confirmSwitch = confirm(
      `Are you sure you want to set "${yearLabel}" as the active current academic year? All other years will be set to inactive.`
    );
    if (!confirmSwitch) return;

    setLoading(true);
    const res = await setYearAsCurrent(collegeId, yearId);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(`"${yearLabel}" is now the active current academic year.`);
      await fetchData();
    } else {
      setErrorMsg(res.error || "Failed to set active academic year.");
    }
  };

  const breadcrumb = (
    <>
      <Link href="/" className="hover:text-slate-900 transition-colors">Command Center</Link>
      <span className="mx-2 text-slate-300">/</span>
      <Link href={`/institutions/${collegeId}`} className="hover:text-slate-900 transition-colors">
        {collegeName}
      </Link>
      <span className="mx-2 text-slate-300">/</span>
      <Link href={`/institutions/${collegeId}/calendar`} className="hover:text-slate-900 transition-colors">
        Academic Calendar
      </Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Academic Years</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full h-[calc(100vh-56px)] min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Header */}
          <div className="mb-4 shrink-0">
            <Link
              href={`/institutions/${collegeId}/calendar`}
              className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-purple-600 mb-1 transition-colors uppercase tracking-wider font-semibold"
            >
              <ArrowLeft size={12} /> Back to Academic Calendar
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Manage Academic Years
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Create academic years and set the active year for system-wide operations.
            </p>
          </div>

          {/* Feedback messages */}
          {(errorMsg || successMsg) && (
            <div className="shrink-0 mb-4">
              {errorMsg && (
                <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-150 dark:border-rose-900/50 rounded-lg">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-150 dark:border-emerald-900/50 rounded-lg flex items-center gap-1.5">
                  <CheckCircle size={14} />
                  {successMsg}
                </div>
              )}
            </div>
          )}

          {/* Main Layout Grid */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Left/Middle Column: Current Academic Years List */}
            <div className="lg:col-span-2 flex flex-col min-h-0 bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-100 dark:border-slate-700 rounded-xl p-5 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-150 mb-3">
                Configured Academic Years
              </h2>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : academicYears.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white/30">
                    <HelpCircle size={40} className="mx-auto text-slate-350 dark:text-slate-650 mb-2" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      No academic years registered.
                    </p>
                    <p className="text-[11px] text-slate-450 mt-0.5">
                      Use the registration form on the right to configure your first academic year.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold">
                          <th className="py-2.5 px-3">Label</th>
                          <th className="py-2.5 px-3">Start Date</th>
                          <th className="py-2.5 px-3">End Date</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {academicYears.map((ay) => (
                          <tr key={ay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                            <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {ay.label}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                              {new Date(ay.start_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                              {new Date(ay.end_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {ay.is_current ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30">
                                  Current Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {!ay.is_current && (
                                <button
                                  onClick={() => handleSetCurrent(ay.id, ay.label)}
                                  className="text-[10px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors bg-purple-50 dark:bg-purple-950/20 px-2 py-1 rounded border border-purple-100 dark:border-purple-900/30"
                                >
                                  Activate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Add Academic Year Form */}
            <div className="flex flex-col bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-100 dark:border-slate-700 rounded-xl p-5 shadow-[0_1px_8px_rgba(0,0,0,0.03)] shrink-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-150 mb-4 flex items-center gap-1">
                <Plus size={16} className="text-purple-600" />
                Add Academic Year
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  
                  {/* Label */}
                  <div className="space-y-1">
                    <label htmlFor="ay_label" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Academic Year Label *
                    </label>
                    <input
                      type="text"
                      id="ay_label"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      required
                      placeholder="e.g. 2025-2026"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                    />
                    <p className="text-[10px] text-slate-400">
                      Unique identifier matching the year group.
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="space-y-1">
                    <label htmlFor="ay_start" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      id="ay_start"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="ay_end" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      End Date *
                    </label>
                    <input
                      type="date"
                      id="ay_end"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Is Current Checkbox */}
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ay_current"
                      checked={isCurrent}
                      onChange={(e) => setIsCurrent(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <label htmlFor="ay_current" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      Set as active current year
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full mt-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {submitLoading && (
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                  )}
                  Create Academic Year
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
