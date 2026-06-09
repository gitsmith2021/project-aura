"use client";

import { X, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { grantConcession, ConcessionType } from "@/actions/concessions";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  institutionId: string;
  academicYears: { id: string; label: string }[];
  onSuccess: () => void;
};

interface StudentSearchResult {
  id: string;
  full_name: string;
  roll_no: string | null;
}

export function ConcessionDrawer({
  isOpen,
  onClose,
  institutionId,
  academicYears,
  onSuccess,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [concessionType, setConcessionType] = useState<ConcessionType>("hardship");
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [amount, setAmount] = useState<string>("");
  const [percentage, setPercentage] = useState<string>("");
  const [applicableTo, setApplicableTo] = useState<string>("");
  const [reason, setReason] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setStudentSearch("");
      setSearchResults([]);
      setSelectedStudent(null);
      setConcessionType("hardship");
      setDiscountType("amount");
      setAmount("");
      setPercentage("");
      setApplicableTo("");
      setReason("");
      setErrorMsg("");
      if (academicYears.length > 0) {
        setSelectedAcademicYearId(academicYears[0].id);
      } else {
        setSelectedAcademicYearId("");
      }
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, academicYears]);

  // Debounced search for students
  useEffect(() => {
    if (!studentSearch.trim() || selectedStudent) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, full_name, roll_no")
          .eq("institution_id", institutionId)
          .or(`full_name.ilike.%${studentSearch}%,roll_no.ilike.%${studentSearch}%`)
          .limit(10);

        if (!error && data) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [studentSearch, selectedStudent, institutionId]);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMsg("Please select a student.");
      return;
    }
    if (!selectedAcademicYearId) {
      setErrorMsg("Please select an academic year.");
      return;
    }
    if (!reason.trim()) {
      setErrorMsg("Please provide a reason for the concession.");
      return;
    }

    const amtVal = discountType === "amount" ? Number(amount) : null;
    const pctVal = discountType === "percentage" ? Number(percentage) : null;

    if (discountType === "amount" && (!amount || isNaN(Number(amount)) || Number(amount) <= 0)) {
      setErrorMsg("Please specify a valid positive amount.");
      return;
    }
    if (discountType === "percentage" && (!percentage || isNaN(Number(percentage)) || Number(percentage) <= 0 || Number(percentage) > 100)) {
      setErrorMsg("Please specify a valid percentage between 1 and 100.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const result = await grantConcession({
      institution_id: institutionId,
      student_id: selectedStudent.id,
      academic_year_id: selectedAcademicYearId,
      concession_type: concessionType,
      amount: amtVal,
      percentage: pctVal,
      applicable_to: applicableTo.trim() || null,
      reason: reason.trim(),
    });

    setLoading(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(result.error || "Failed to submit concession.");
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-sm h-full bg-white dark:bg-slate-800 flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 dark:border-slate-700 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Grant Concession
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Apply a fee concession or waiver to a student.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/40 space-y-4">
          {errorMsg && (
            <div className="p-2.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-lg">
              {errorMsg}
            </div>
          )}

          {academicYears.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs text-slate-500">
              No academic years found. Please define academic years in the calendar manager first.
            </div>
          ) : (
            <form id="concession-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Student Search */}
              <div className="space-y-1 relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Search Student
                </label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-2.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-purple-900 dark:text-purple-300 truncate">
                        {selectedStudent.full_name}
                      </p>
                      <p className="text-[10px] text-purple-600 dark:text-purple-400">
                        Roll No: {selectedStudent.roll_no || "N/A"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentSearch("");
                      }}
                      className="text-purple-400 hover:text-purple-700 text-xs font-semibold underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Type student name or roll number..."
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                    />
                    {searching && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-purple-600"></span>
                    )}

                    {/* Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 divide-y divide-slate-100 dark:divide-slate-700">
                        {searchResults.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedStudent(s)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 flex flex-col gap-0.5"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {s.full_name}
                            </span>
                            <span className="text-slate-400">
                              Roll No: {s.roll_no || "N/A"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Academic Year */}
              <div className="space-y-1">
                <label
                  htmlFor="conc_academic_year"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Academic Year
                </label>
                <select
                  id="conc_academic_year"
                  value={selectedAcademicYearId}
                  onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Concession Type */}
              <div className="space-y-1">
                <label
                  htmlFor="conc_type"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Concession Type
                </label>
                <select
                  id="conc_type"
                  value={concessionType}
                  onChange={(e) => setConcessionType(e.target.value as ConcessionType)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="hardship">Hardship Waiver</option>
                  <option value="staff_ward">Staff Ward Discount</option>
                  <option value="management_quota">Management Quota Waiver</option>
                  <option value="merit">Merit Scholarship Discount</option>
                  <option value="sports_quota">Sports Quota Discount</option>
                  <option value="other">Other Waiver</option>
                </select>
              </div>

              {/* Discount Input Toggle */}
              <div className="space-y-3 pt-1">
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("amount");
                      setPercentage("");
                    }}
                    className={`flex-1 pb-1.5 text-xs font-bold text-center border-b-2 transition-colors ${
                      discountType === "amount"
                        ? "border-purple-600 text-purple-600"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Fixed Amount (INR)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("percentage");
                      setAmount("");
                    }}
                    className={`flex-1 pb-1.5 text-xs font-bold text-center border-b-2 transition-colors ${
                      discountType === "percentage"
                        ? "border-purple-600 text-purple-600"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Percentage (%)
                  </button>
                </div>

                {discountType === "amount" ? (
                  <div className="space-y-1">
                    <label
                      htmlFor="conc_amount"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Concession Amount (₹)
                    </label>
                    <input
                      type="number"
                      id="conc_amount"
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label
                      htmlFor="conc_pct"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Percentage Discount (%)
                    </label>
                    <input
                      type="number"
                      id="conc_pct"
                      min={1}
                      max={100}
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      placeholder="e.g. 25"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>

              {/* Scoped/Applicable to */}
              <div className="space-y-1">
                <label
                  htmlFor="conc_scope"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Applicable To (Optional)
                </label>
                <select
                  id="conc_scope"
                  value={applicableTo}
                  onChange={(e) => setApplicableTo(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="">Apply to Total Dues</option>
                  <option value="tuition">Tuition Fee Only</option>
                  <option value="hostel">Hostel Fee Only</option>
                  <option value="exam">Exam Fee Only</option>
                </select>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label
                  htmlFor="conc_reason"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Reason / Remarks
                </label>
                <textarea
                  id="conc_reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide justifying comments for this concession..."
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </form>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="concession-form"
            disabled={loading || academicYears.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}
