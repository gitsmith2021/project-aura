"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, FlaskConical } from "lucide-react";
import { createProject, updateProject } from "@/actions/research";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ResearchProject, type ProjectStatus } from "@/lib/research";

type Staff = { id: string; full_name: string };
type Dept = { id: string; name: string };

export function ProjectDrawer({
  open, mode, institutionId, staff, departments, project, onClose,
}: {
  open: boolean; mode: "add" | "edit"; institutionId: string;
  staff: Staff[]; departments: Dept[]; project?: ResearchProject | null; onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pi, setPi] = useState("");
  const [coInv, setCoInv] = useState("");
  const [agency, setAgency] = useState("");
  const [amount, setAmount] = useState("");
  const [spent, setSpent] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("ongoing");
  const [deptId, setDeptId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && project) {
      setTitle(project.title); setPi(project.principal_investigator ?? "");
      setCoInv((project.co_investigators ?? []).join(", "));
      setAgency(project.funding_agency ?? ""); setAmount(project.funding_amount?.toString() ?? "");
      setSpent(project.funding_spent?.toString() ?? ""); setStart(project.start_date ?? "");
      setEnd(project.end_date ?? ""); setStatus(project.status); setDeptId(project.department_id ?? "");
    } else {
      setTitle(""); setPi(""); setCoInv(""); setAgency(""); setAmount(""); setSpent("");
      setStart(""); setEnd(""); setStatus("ongoing"); setDeptId("");
    }
  }, [open, mode, project]);

  if (!open) return null;

  async function save() {
    if (!title.trim()) { setError("Project title is required."); return; }
    setBusy(true); setError(null);
    const common = {
      title, principalInvestigator: pi || null,
      coInvestigators: coInv.split(",").map((s) => s.trim()).filter(Boolean),
      fundingAgency: agency || null,
      fundingAmount: amount ? Number(amount) : null,
      fundingSpent: spent ? Number(spent) : null,
      startDate: start || null, endDate: end || null, status, departmentId: deptId || null,
    };
    const res = mode === "edit" && project
      ? await updateProject({ institutionId, id: project.id, ...common })
      : await createProject({ institutionId, ...common });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    router.refresh();
    onClose();
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2"><FlaskConical size={18} className="text-purple-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{mode === "edit" ? "Edit Project" : "New Research Project"}</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
          <div><label className={labelCls}>Title <span className="text-rose-500">*</span></label><textarea className={`${inputCls} min-h-[60px]`} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div>
            <label className={labelCls}>Principal Investigator</label>
            <select className={inputCls} value={pi} onChange={(e) => setPi(e.target.value)}>
              <option value="">Not assigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Co-investigators <span className="text-slate-400 font-normal">(comma-separated)</span></label><input className={inputCls} value={coInv} onChange={(e) => setCoInv(e.target.value)} /></div>
          <div>
            <label className={labelCls}>Department</label>
            <select className={inputCls} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              <option value="">Not assigned</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Funding agency</label><input className={inputCls} value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="e.g. DST / AICTE / UGC" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Sanctioned (₹)</label><input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><label className={labelCls}>Utilised (₹)</label><input type="number" className={inputCls} value={spent} onChange={(e) => setSpent(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Start date</label><input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><label className={labelCls}>End date</label><input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">{busy ? "Saving…" : mode === "edit" ? "Save" : "Create Project"}</button>
        </div>
      </div>
    </div>
  );
}
