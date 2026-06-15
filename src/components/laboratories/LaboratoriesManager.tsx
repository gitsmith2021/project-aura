"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, X, FlaskConical, Users, ChevronRight } from "lucide-react";
import { addLaboratory, type LabInput } from "@/actions/laboratories";
import { LAB_TYPES, LAB_TYPE_COLORS, labTypeLabel, type Laboratory, type LabType } from "@/lib/laboratories";

type Dept = { id: string; name: string };
type Assistant = { id: string; name: string };

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function LaboratoriesManager({
  institutionId, initial, departments, assistants,
}: {
  institutionId: string;
  initial: Laboratory[];
  departments: Dept[];
  assistants: Assistant[];
}) {
  const [labs, setLabs] = useState<Laboratory[]>(initial);
  const [search, setSearch] = useState("");
  const [labType, setLabType] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const [f, setF] = useState({ name: "", lab_type: "physics" as LabType, department_id: "", capacity: "", lab_assistant_id: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return labs.filter((l) => {
      if (labType && l.lab_type !== labType) return false;
      if (deptFilter && l.department_id !== deptFilter) return false;
      if (!q) return true;
      return l.name.toLowerCase().includes(q) || labTypeLabel(l.lab_type).toLowerCase().includes(q);
    });
  }, [labs, search, labType, deptFilter]);

  const submitAdd = async () => {
    setSaving(true);
    setError(null);
    const payload: LabInput = {
      institution_id: institutionId,
      name: f.name,
      lab_type: f.lab_type,
      department_id: f.department_id || null,
      capacity: f.capacity ? parseInt(f.capacity, 10) : null,
      lab_assistant_id: f.lab_assistant_id || null,
      description: f.description || null,
    };
    const res = await addLaboratory(payload);
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setLabs((prev) => [res.data, ...prev]);
    setF({ name: "", lab_type: "physics", department_id: "", capacity: "", lab_assistant_id: "", description: "" });
    setAddOpen(false);
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Laboratories</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Scientific labs, batches, experiment syllabus, sessions and grading.</p>
        </div>
        <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700">
          <Plus size={14} strokeWidth={2.5} /> Add Laboratory
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search labs…" className="h-8 w-full pl-8 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 dark:text-slate-100" />
        </div>
        <select value={labType} onChange={(e) => setLabType(e.target.value)} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
          <option value="">All types</option>
          {LAB_TYPES.map((t) => <option key={t} value={t}>{labTypeLabel(t)}</option>)}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <span className="text-[11px] text-slate-400 ml-auto">{filtered.length} of {labs.length}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No laboratories found. Add the first one.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <Link
              key={l.id}
              href={`/institutions/${institutionId}/laboratories/${l.id}`}
              className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
                    <FlaskConical size={17} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{l.name}</h3>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${LAB_TYPE_COLORS[l.lab_type]}`}>
                      {labTypeLabel(l.lab_type)}
                    </span>
                  </div>
                </div>
                {!l.is_active && <span className="text-[10px] font-semibold text-slate-400">Inactive</span>}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate">{l.departments?.name ?? "No department"}</span>
                <span className="flex items-center gap-1 shrink-0">
                  {l.capacity != null && <><Users size={12} /> {l.capacity}</>}
                </span>
              </div>
              {l.staff?.full_name && (
                <p className="mt-1 text-[11px] text-slate-400 truncate">Assistant: {l.staff.full_name}</p>
              )}
              <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ChevronRight size={12} />
              </p>
            </Link>
          ))}
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setAddOpen(false)} />
          <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Laboratory</h2>
              <button type="button" onClick={() => setAddOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} placeholder="e.g. Physics Lab I" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lab type">
                  <select value={f.lab_type} onChange={(e) => setF({ ...f, lab_type: e.target.value as LabType })} className={inputCls}>
                    {LAB_TYPES.map((t) => <option key={t} value={t}>{labTypeLabel(t)}</option>)}
                  </select>
                </Field>
                <Field label="Capacity (optional)"><input type="number" min={1} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} className={inputCls} /></Field>
              </div>
              <Field label="Department (optional)">
                <select value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value })} className={inputCls}>
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Lab assistant (optional)">
                <select value={f.lab_assistant_id} onChange={(e) => setF({ ...f, lab_assistant_id: e.target.value })} className={inputCls}>
                  <option value="">None</option>
                  {assistants.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Description (optional)"><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className={`${inputCls} h-auto py-2`} /></Field>
              {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setAddOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button type="button" onClick={submitAdd} disabled={saving || !f.name.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Adding…" : "Add laboratory"}</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
