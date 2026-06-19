"use client";

import { useState } from "react";
import { Table2, Loader2 } from "lucide-react";
import { getGradebook, type GradebookData } from "@/actions/lmsAssignments";
import { GradebookTable } from "./GradebookTable";

type SubjectOpt = { id: string; name: string };

export function GradebookView({ subjects }: { subjects: SubjectOpt[] }) {
  const [subjectId, setSubjectId] = useState("");
  const [data, setData] = useState<GradebookData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(id: string) {
    setSubjectId(id);
    setData(null); setError(null);
    if (!id) return;
    setBusy(true);
    const res = await getGradebook(id);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setData(res.data);
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Table2 size={22} className="text-violet-600" /> Gradebook</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Marks matrix per subject — student × assignment, with averages.</p>
        </div>
        <select value={subjectId} onChange={(e) => load(e.target.value)}
          className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="">Select subject…</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
      {busy && <div className="py-16 flex justify-center text-slate-400"><Loader2 size={24} className="animate-spin" /></div>}
      {!busy && !subjectId && <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">Pick a subject to view its gradebook.</div>}
      {!busy && data && (
        data.assignments.length === 0
          ? <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No assignments in {data.subjectName} yet.</div>
          : <GradebookTable assignments={data.assignments} gradebook={data.gradebook} />
      )}
    </div>
  );
}
