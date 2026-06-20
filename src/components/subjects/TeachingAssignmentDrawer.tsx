"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { assignTeacher } from "@/actions/subjects";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  institutionId: string;
  departmentId: string;
  subject: { id: string; name: string; semester: number } | null;
  staffList: { id: string; full_name: string }[];
  academicYears: { id: string; label: string }[];
  onSuccess: () => void;
};

export function TeachingAssignmentDrawer({
  isOpen,
  onClose,
  institutionId,
  subject,
  staffList,
  academicYears,
  onSuccess,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setSelectedStaffId("");
      
      // Auto-select current/first academic year if available
      if (academicYears.length > 0) {
        setSelectedAcademicYearId(academicYears[0].id);
      } else {
        setSelectedAcademicYearId("");
      }
      
      setIsPrimary(true);
      setErrorMsg("");
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, academicYears]);

  if (!mounted || !subject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setErrorMsg("Please select a faculty member.");
      return;
    }
    if (!selectedAcademicYearId) {
      setErrorMsg("Please select an academic year.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const result = await assignTeacher({
      institution_id: institutionId,
      staff_id: selectedStaffId,
      subject_id: subject.id,
      academic_year_id: selectedAcademicYearId,
      semester: subject.semester,
      is_primary: isPrimary,
    });

    setLoading(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(result.error || "Failed to create teaching assignment.");
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
              Assign Teacher
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assign a faculty member to <span className="font-semibold">{subject.name}</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/40">
          {errorMsg && (
            <div className="mb-4 p-2.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-lg">
              {errorMsg}
            </div>
          )}

          {academicYears.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs text-slate-500">
              No academic years found. Please define academic years in the calendar manager first.
            </div>
          ) : (
            <form id="assign-teacher-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="assign_academic_year"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Academic Year
                </label>
                <select
                  id="assign_academic_year"
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

              <div className="space-y-1">
                <label
                  htmlFor="assign_staff"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Faculty Member
                </label>
                <select
                  id="assign_staff"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select Faculty...</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="assign_primary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800"
                />
                <label
                  htmlFor="assign_primary"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Primary Instructor
                </label>
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
            form="assign-teacher-form"
            disabled={loading || academicYears.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
