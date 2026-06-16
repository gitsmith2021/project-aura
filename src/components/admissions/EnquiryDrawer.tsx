"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Save } from "lucide-react";
import { createEnquiry, updateEnquiry } from "@/actions/admissionsCRM";
import {
  ENQUIRY_SOURCES, ENQUIRY_SOURCE_LABELS, PROGRAM_INTERESTS,
  type Enquiry, type EnquirySource, type ProgramInterest,
} from "@/lib/admissionsCRM";

type DeptOption = { id: string; name: string };

export function EnquiryDrawer({
  institutionId, departments, enquiry, onClose, onSaved,
}: {
  institutionId: string;
  departments: DeptOption[];
  enquiry: Enquiry | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const editing = !!enquiry;
  const [name, setName] = useState(enquiry?.name ?? "");
  const [phone, setPhone] = useState(enquiry?.phone ?? "");
  const [email, setEmail] = useState(enquiry?.email ?? "");
  const [program, setProgram] = useState<ProgramInterest>(enquiry?.program_interest ?? "UG");
  const [departmentId, setDepartmentId] = useState(enquiry?.department_id ?? "");
  const [source, setSource] = useState<EnquirySource>(enquiry?.source ?? "website");
  const [followUp, setFollowUp] = useState(enquiry?.follow_up_date ?? "");
  const [notes, setNotes] = useState(enquiry?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const payload = {
      name, phone, email: email || null, program_interest: program,
      department_id: departmentId || null, source, follow_up_date: followUp || null, notes: notes || null,
    };
    const res = editing
      ? await updateEnquiry({ institutionId, enquiryId: enquiry!.id, patch: payload })
      : await createEnquiry({ institutionId, ...payload });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    router.refresh();
    onSaved();
  };

  const field = "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelCls = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1";

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{editing ? "Edit enquiry" : "New enquiry"}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className={labelCls}>Name <span className="text-rose-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Prospective student name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone <span className="text-rose-500">*</span></label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="10-digit mobile" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="optional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Program interest</label>
              <select value={program} onChange={(e) => setProgram(e.target.value as ProgramInterest)} className={field}>
                {PROGRAM_INTERESTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={field}>
                <option value="">Not sure / any</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value as EnquirySource)} className={field}>
                {ENQUIRY_SOURCES.map((s) => <option key={s} value={s}>{ENQUIRY_SOURCE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Follow-up date</label>
              <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Conversation notes, requirements…" />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {editing ? "Save changes" : "Add enquiry"}
          </button>
        </div>
      </div>
    </div>
  );
}
