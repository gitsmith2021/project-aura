"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Receipt, GraduationCap, Ban, BadgeCheck, RotateCcw } from "lucide-react";
import { generateDemands, setDemandStatus, type GenerationTargets } from "@/actions/feeDemands";
import {
  DEMAND_STATUS_COLORS, DEMAND_STATUS_LABELS, demandStatus, demandTally, balance, daysOverdue, inr,
  type FeeDemand, type DemandLiveStatus,
} from "@/lib/feeDemands";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

const FILTERS: (DemandLiveStatus | "")[] = ["", "overdue", "pending", "partial", "paid", "waived", "cancelled"];

export function DemandsManager({ institutionId, initial, targets }: {
  institutionId: string;
  initial: FeeDemand[];
  targets: GenerationTargets;
}) {
  const [demands, setDemands] = useState<FeeDemand[]>(initial);
  const [filter, setFilter] = useState<DemandLiveStatus | "">("");
  const [genOpen, setGenOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => demandTally(demands), [demands]);
  const filtered = useMemo(
    () => (filter ? demands.filter((d) => demandStatus(d, d.amount_paid ?? 0) === filter) : demands),
    [demands, filter]
  );

  const act = async (d: FeeDemand, status: "waived" | "cancelled" | "pending") => {
    setBusy(d.id); setError(null);
    const res = await setDemandStatus(institutionId, d.id, status);
    setBusy(null);
    if (!res.success) { setError(res.error); return; }
    setDemands((prev) => prev.map((x) => (x.id === d.id ? { ...x, status } : x)));
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Fee Demands</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Per-student fee obligations with due dates — generate, track outstanding &amp; overdue.</p>
        </div>
        <button type="button" onClick={() => setGenOpen(true)} disabled={targets.structures.length === 0} title={targets.structures.length === 0 ? "Create a fee structure first" : ""} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700 disabled:opacity-50">
          <Plus size={14} strokeWidth={2.5} /> Generate Demands
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Demanded" value={inr(stats.demanded)} />
        <Stat label="Collected" value={inr(stats.collected)} tone="emerald" />
        <Stat label="Outstanding" value={inr(stats.outstanding)} tone="rose" />
        <Stat label="Overdue" value={String(stats.overdue)} tone="rose" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {FILTERS.map((s) => (
          <button key={s || "all"} type="button" onClick={() => setFilter(s)} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
            filter === s ? "bg-purple-600 text-white border-purple-700" : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}>{s ? DEMAND_STATUS_LABELS[s] : "All"}</button>
        ))}
        <span className="text-[11px] text-slate-400 ml-auto">{filtered.length} of {demands.length}</span>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No demands{filter ? ` (${DEMAND_STATUS_LABELS[filter]})` : ""}. Generate demands to bill students.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Student</th>
                <th className="px-3 py-2.5 font-semibold">Fee</th>
                <th className="px-3 py-2.5 font-semibold text-right">Net due</th>
                <th className="px-3 py-2.5 font-semibold text-right">Paid</th>
                <th className="px-3 py-2.5 font-semibold text-right">Balance</th>
                <th className="px-3 py-2.5 font-semibold">Due</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((d) => {
                const paid = d.amount_paid ?? 0;
                const live = demandStatus(d, paid);
                const bal = balance(d.net_due, paid);
                const od = live === "overdue" ? daysOverdue(d.due_date) : 0;
                return (
                  <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={13} className="text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{d.students?.full_name ?? "Student"}</p>
                          {d.students?.roll_no && <p className="text-[10px] text-slate-400">{d.students.roll_no}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {d.title}
                      {d.concession_amount > 0 && <span className="ml-1 text-[10px] text-violet-500">−{inr(d.concession_amount)}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-200">{inr(d.net_due)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600 dark:text-emerald-400">{inr(Math.min(paid, d.net_due))}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">{inr(bal)}</td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {d.due_date}{od > 0 && <span className="text-rose-500"> · {od}d</span>}
                    </td>
                    <td className="px-3 py-2.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${DEMAND_STATUS_COLORS[live]}`}>{DEMAND_STATUS_LABELS[live]}</span></td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {d.status === "waived" || d.status === "cancelled" ? (
                        <button type="button" onClick={() => act(d, "pending")} disabled={busy === d.id} title="Reopen" className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"><RotateCcw size={13} /></button>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => act(d, "waived")} disabled={busy === d.id} title="Waive" className="p-1.5 rounded-md text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-40"><BadgeCheck size={13} /></button>
                          <button type="button" onClick={() => act(d, "cancelled")} disabled={busy === d.id} title="Cancel" className="p-1.5 rounded-md text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"><Ban size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {genOpen && (
        <GenerateDrawer
          institutionId={institutionId}
          targets={targets}
          onClose={() => setGenOpen(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : tone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function GenerateDrawer({ institutionId, targets, onClose }: {
  institutionId: string; targets: GenerationTargets; onClose: () => void;
}) {
  const [structureId, setStructureId] = useState(targets.structures[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [studentYear, setStudentYear] = useState("");
  const [applyConcessions, setApplyConcessions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const router = useRouter();

  const structure = targets.structures.find((s) => s.id === structureId);

  const submit = async () => {
    setSaving(true); setError(null); setResult(null);
    const res = await generateDemands({
      institutionId, feeStructureId: structureId, dueDate,
      departmentId: departmentId || null,
      studentYear: studentYear ? parseInt(studentYear, 10) : null,
      applyConcessions,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setResult(res.data);
    if (res.data.created > 0) router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Generate Fee Demands</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Fee structure</label>
            <select value={structureId} onChange={(e) => setStructureId(e.target.value)} className={inputCls}>
              {targets.structures.map((s) => <option key={s.id} value={s.id}>{s.name} — {inr(s.amount)}{s.academic_year ? ` · ${s.academic_year}` : ""}</option>)}
            </select>
            {structure && (
              <p className="mt-1 text-[11px] text-slate-400">
                Targets {structure.department_id ? "its department" : "all students"} unless overridden below.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Department override</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls}>
                <option value="">From structure</option>
                {targets.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Year (optional)</label>
              <input type="number" min={1} max={6} value={studentYear} onChange={(e) => setStudentYear(e.target.value)} className={inputCls} placeholder="All" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={applyConcessions} onChange={(e) => setApplyConcessions(e.target.checked)} className="rounded border-slate-300" />
            Apply approved concessions automatically
          </label>

          {result && (
            <p className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg px-3 py-2">
              Created {result.created} demand{result.created === 1 ? "" : "s"}{result.skipped > 0 ? ` · skipped ${result.skipped} (already billed)` : ""}.
            </p>
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">{result ? "Close" : "Cancel"}</button>
          <button type="button" onClick={submit} disabled={saving || !structureId || !dueDate} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">
            <Receipt size={13} /> {saving ? "Generating…" : "Generate"}
          </button>
        </div>
      </aside>
    </div>
  );
}
