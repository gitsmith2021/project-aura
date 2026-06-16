"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, UserCheck, Copy, Check } from "lucide-react";
import { hireApplicant } from "@/actions/recruitment";
import type { JobApplication } from "@/lib/recruitment";

type Dept = { id: string; name: string };

export function HireDrawer({
  open,
  application,
  institutionId,
  departments,
  onClose,
}: {
  open: boolean;
  application: JobApplication;
  institutionId: string;
  departments: Dept[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [employeeId, setEmployeeId] = useState("");
  const [deptId, setDeptId] = useState(application.job_postings?.department_id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; password: string; staffId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setDesignation("");
      setJoiningDate(new Date().toISOString().slice(0, 10));
      setEmployeeId("");
      setDeptId(application.job_postings?.department_id ?? "");
      setError(null);
      setResult(null);
    }
  }, [open, application]);

  if (!open) return null;

  async function handleHire() {
    if (!designation.trim()) { setError("Designation is required."); return; }
    setBusy(true);
    setError(null);
    const res = await hireApplicant({
      institutionId,
      jobId: application.job_posting_id,
      applicationId: application.id,
      designation,
      joiningDate,
      employeeId: employeeId || null,
      departmentId: deptId || null,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setResult(res.data);
    router.refresh();
  }

  function copyCredentials() {
    if (!result) return;
    navigator.clipboard.writeText(`Email: ${result.email}\nPassword: ${result.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!result ? onClose : undefined} />

      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-emerald-500" />
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Hire Applicant</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Applicant summary */}
          <div className="mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{application.applicant_name}</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">{application.applicant_email}</p>
            {application.job_postings?.title && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Applying for: {application.job_postings.title}
              </p>
            )}
          </div>

          {/* Success state */}
          {result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                  Hired successfully!
                </p>
                <p className="text-[12px] text-emerald-700 dark:text-emerald-400">
                  Staff account and profile created. Share these credentials with the new hire:
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-[13px] space-y-1">
                <p className="text-slate-700 dark:text-slate-300">Email: <span className="font-semibold">{result.email}</span></p>
                <p className="text-slate-700 dark:text-slate-300">Password: <span className="font-semibold">{result.password}</span></p>
              </div>

              <button
                type="button"
                onClick={copyCredentials}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy credentials"}
              </button>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                The new hire should change their password on first login.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <p className="text-[12px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Designation <span className="text-rose-500">*</span>
                </label>
                <input
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  placeholder="e.g. Assistant Professor"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <select
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={deptId}
                  onChange={e => setDeptId(e.target.value)}
                >
                  <option value="">Not assigned</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Joining Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={joiningDate}
                    onChange={e => setJoiningDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Employee ID</label>
                  <input
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    placeholder="Auto-generated"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-[12px] text-amber-700 dark:text-amber-400">
                This will create a staff account and login credentials for{" "}
                <strong>{application.applicant_name}</strong> ({application.applicant_email}).
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleHire}
              disabled={busy}
              className="px-4 py-2 text-[13px] font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Hiring…" : "Confirm Hire"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
