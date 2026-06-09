"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { addSubject, updateSubject, Subject } from "@/actions/subjects";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  institutionId: string;
  departmentId: string;
  onSuccess: () => void;
  subjectToEdit?: Subject | null;
};

export function SubjectForm({
  isOpen,
  onClose,
  institutionId,
  departmentId,
  onSuccess,
  subjectToEdit = null,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [subjectType, setSubjectType] = useState<Subject["subject_type"]>("theory");
  const [semester, setSemester] = useState<number>(1);
  const [credits, setCredits] = useState<number>(3);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (subjectToEdit) {
        setName(subjectToEdit.name);
        setCode(subjectToEdit.code || "");
        setSubjectType(subjectToEdit.subject_type);
        setSemester(subjectToEdit.semester);
        setCredits(subjectToEdit.credits);
        setHoursPerWeek(subjectToEdit.hours_per_week);
      } else {
        setName("");
        setCode("");
        setSubjectType("theory");
        setSemester(1);
        setCredits(3);
        setHoursPerWeek(5);
      }
      setErrorMsg("");
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, subjectToEdit]);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Subject Name is required.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    const payload = {
      institution_id: institutionId,
      department_id: departmentId,
      name: name.trim(),
      code: code.trim() || null,
      subject_type: subjectType,
      semester: Number(semester),
      credits: Number(credits),
      hours_per_week: Number(hoursPerWeek),
    };

    let result;
    if (subjectToEdit) {
      result = await updateSubject(subjectToEdit.id, institutionId, payload);
    } else {
      result = await addSubject(payload);
    }

    setLoading(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(result.error || "Failed to save subject.");
    }
  };

  const isEdit = Boolean(subjectToEdit);

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
              {isEdit ? "Edit Subject" : "Add Subject"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEdit ? "Update subject configuration." : "Register a new subject for this department."}
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

          <form id="subject-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="sub_name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Subject Name
              </label>
              <input
                type="text"
                id="sub_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Data Structures & Algorithms"
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="sub_code" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Subject Code
              </label>
              <input
                type="text"
                id="sub_code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CS301"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="sub_type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Subject Type
              </label>
              <select
                id="sub_type"
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value as Subject["subject_type"])}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="theory">Theory</option>
                <option value="lab">Lab</option>
                <option value="elective">Elective</option>
                <option value="project">Project</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="sub_sem" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Semester
                </label>
                <select
                  id="sub_sem"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Sem {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="sub_credits" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Credits
                </label>
                <input
                  type="number"
                  id="sub_credits"
                  min={1}
                  max={20}
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="sub_hours" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hours/Wk
                </label>
                <input
                  type="number"
                  id="sub_hours"
                  min={1}
                  max={40}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </form>
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
            form="subject-form"
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>}
            {isEdit ? "Save changes" : "Create Subject"}
          </button>
        </div>
      </div>
    </div>
  );
}
