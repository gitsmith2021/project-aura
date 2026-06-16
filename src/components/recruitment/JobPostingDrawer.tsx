"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createJobPosting, updateJobPosting } from "@/actions/recruitment";
import { EMPLOYMENT_TYPE_LABELS, type JobPosting, type EmploymentType, type JobStatus } from "@/lib/recruitment";

type Dept = { id: string; name: string };

export function JobPostingDrawer({
  open,
  posting,
  institutionId,
  departments,
  onClose,
  onSaved,
}: {
  open: boolean;
  posting: JobPosting | null;
  institutionId: string;
  departments: Dept[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [deptId, setDeptId] = useState("");
  const [empType, setEmpType] = useState<EmploymentType>("full_time");
  const [expYears, setExpYears] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [vacancies, setVacancies] = useState("1");
  const [status, setStatus] = useState<JobStatus>("open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (posting) {
      setTitle(posting.title);
      setDeptId(posting.department_id ?? "");
      setEmpType(posting.employment_type);
      setExpYears(posting.experience_years != null ? String(posting.experience_years) : "");
      setQualifications(posting.qualifications ?? "");
      setDescription(posting.description ?? "");
      setDeadline(posting.deadline ?? "");
      setVacancies(String(posting.vacancies));
      setStatus(posting.status);
    } else {
      setTitle(""); setDeptId(""); setEmpType("full_time"); setExpYears("");
      setQualifications(""); setDescription(""); setDeadline(""); setVacancies("1");
      setStatus("open");
    }
    setError(null);
  }, [posting, open]);

  if (!open) return null;

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const vac = parseInt(vacancies, 10);
      const exp = expYears ? parseFloat(expYears) : null;
      let result;
      if (posting) {
        result = await updateJobPosting({
          institutionId,
          jobId: posting.id,
          title,
          departmentId: deptId || null,
          employmentType: empType,
          experienceYears: exp,
          qualifications: qualifications || null,
          description: description || null,
          deadline: deadline || null,
          vacancies: vac,
          status,
        });
      } else {
        result = await createJobPosting({
          institutionId,
          title,
          departmentId: deptId || null,
          employmentType: empType,
          experienceYears: exp,
          qualifications: qualifications || null,
          description: description || null,
          deadline: deadline || null,
          vacancies: vac,
        });
      }
      if (!result.success) { setError(result.error); return; }
      router.refresh();
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            {posting ? "Edit Job Posting" : "New Job Posting"}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* Form body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <p className="text-[12px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div>
            <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Job Title <span className="text-rose-500">*</span>
            </label>
            <input
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Assistant Professor — Mathematics"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={deptId}
                onChange={e => setDeptId(e.target.value)}
              >
                <option value="">Any / Not specified</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Employment Type</label>
              <select
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={empType}
                onChange={e => setEmpType(e.target.value as EmploymentType)}
              >
                {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map(k => (
                  <option key={k} value={k}>{EMPLOYMENT_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Min Experience (yrs)</label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={expYears}
                onChange={e => setExpYears(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Vacancies</label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={vacancies}
                onChange={e => setVacancies(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Application Deadline</label>
            <input
              type="date"
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Required Qualifications</label>
            <input
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={qualifications}
              onChange={e => setQualifications(e.target.value)}
              placeholder="e.g. M.Sc. / M.Tech., Ph.D. preferred"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Job Description</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Role responsibilities, responsibilities, and requirements..."
            />
          </div>

          {posting && (
            <div>
              <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={status}
                onChange={e => setStatus(e.target.value as JobStatus)}
              >
                <option value="open">Open</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSubmit}
            className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Saving…" : posting ? "Save Changes" : "Post Job"}
          </button>
        </div>
      </div>
    </div>
  );
}
