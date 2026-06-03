"use client";

import { useEffect, useState } from "react";
import { X, Target, CheckCircle2 } from "lucide-react";
import { upsertBudget } from "@/actions/expenses";
import type { Budget, ExpenseCategory } from "@/types/finance";

const CATEGORIES: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: "utilities",      label: "Utilities",      emoji: "🔌" },
  { value: "maintenance",    label: "Maintenance",    emoji: "🔧" },
  { value: "vendor",         label: "Vendor",         emoji: "🏪" },
  { value: "events",         label: "Events",         emoji: "🎉" },
  { value: "stationery",     label: "Stationery",     emoji: "📄" },
  { value: "infrastructure", label: "Infrastructure", emoji: "🏗️" },
  { value: "it",             label: "IT",             emoji: "💻" },
  { value: "other",          label: "Other",          emoji: "📦" },
];

const ACADEMIC_YEARS = ["2024-25", "2025-26", "2026-27", "2027-28"];

type DepartmentOpt = { id: string | null; label: string };

type Props = {
  isOpen:        boolean;
  institutionId: string;
  departments:   { id: string; name: string }[];
  existingBudgets: Budget[];
  onClose:       () => void;
  onSuccess:     () => void;
};

export function BudgetSetupModal({
  isOpen, institutionId, departments, existingBudgets, onClose, onSuccess,
}: Props) {
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [scopeId,      setScopeId]      = useState<string | null>(null);  // null = institution-wide
  const [amounts,      setAmounts]      = useState<Partial<Record<ExpenseCategory, string>>>({});
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [saved,        setSaved]        = useState(false);

  const scopeOptions: DepartmentOpt[] = [
    { id: null, label: "Institution-wide" },
    ...departments.map(d => ({ id: d.id, label: d.name })),
  ];

  // Pre-fill amounts from existing budgets when scope/year changes
  useEffect(() => {
    const matching = existingBudgets.filter(
      b => b.academic_year === academicYear && b.department_id === scopeId
    );
    const filled: Partial<Record<ExpenseCategory, string>> = {};
    for (const b of matching) {
      filled[b.category as ExpenseCategory] = String(b.allocated_amount);
    }
    setAmounts(filled);
    setSaved(false); setError("");
  }, [academicYear, scopeId, existingBudgets]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  async function handleSave() {
    setError(""); setLoading(true); setSaved(false);

    const entries = CATEGORIES.map(c => ({
      category: c.value,
      amount:   parseFloat(amounts[c.value] ?? "0") || 0,
    })).filter(e => e.amount > 0);

    if (entries.length === 0) {
      setLoading(false);
      setError("Enter at least one budget amount.");
      return;
    }

    let failed = 0;
    for (const entry of entries) {
      const res = await upsertBudget({
        institution_id:   institutionId,
        department_id:    scopeId,
        category:         entry.category,
        academic_year:    academicYear,
        allocated_amount: entry.amount,
      });
      if (!res.success) failed++;
    }

    setLoading(false);
    if (failed > 0) { setError(`${failed} budget(s) failed to save.`); return; }

    setSaved(true);
    onSuccess();
    setTimeout(() => setSaved(false), 2000);
  }

  const inp = "w-full px-2.5 py-1.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40 rounded-md text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/20 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 border border-violet-200/60 dark:border-violet-700/40 flex items-center justify-center">
              <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Set Budgets</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Allocate spending limits per category</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"><X size={15} /></button>
        </div>

        {/* Controls */}
        <div className="px-5 py-3 border-b border-slate-100/60 dark:border-slate-800 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Year</label>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              className="px-2 py-1 bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40 rounded-md text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-400 appearance-none cursor-pointer">
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Scope</label>
            <select value={scopeId ?? ""} onChange={e => setScopeId(e.target.value || null)}
              className="px-2 py-1 bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40 rounded-md text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-400 appearance-none cursor-pointer">
              {scopeOptions.map(o => <option key={o.id ?? ""} value={o.id ?? ""}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Category inputs */}
        <div className="px-5 py-4 max-h-72 overflow-y-auto space-y-2.5">
          {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">{error}</div>}

          {CATEGORIES.map(c => (
            <div key={c.value} className="flex items-center gap-3">
              <div className="w-24 shrink-0 flex items-center gap-1.5">
                <span className="text-sm">{c.emoji}</span>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">{c.label}</span>
              </div>
              <div className="flex-1 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={amounts[c.value] ?? ""}
                  onChange={e => setAmounts(prev => ({ ...prev, [c.value]: e.target.value }))}
                  placeholder="0"
                  className={inp + " pl-6"}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/20 dark:border-slate-800 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
            Close
          </button>
          <button type="button" onClick={handleSave} disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 border border-violet-700 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm">
            {loading
              ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : saved
                ? <CheckCircle2 size={12} />
                : null
            }
            {saved ? "Saved!" : "Save Budgets"}
          </button>
        </div>
      </div>
    </div>
  );
}
