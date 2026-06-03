"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { deleteExpense } from "@/actions/expenses";
import type { Expense } from "@/types/finance";

type Props = {
  isOpen:        boolean;
  expense:       Expense | null;
  institutionId: string;
  onClose:       () => void;
  onSuccess:     () => void;
};

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function DeleteExpenseDialog({ isOpen, expense, institutionId, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  if (!isOpen || !expense) return null;

  async function handleConfirm() {
    if (!expense) return;
    setError(""); setLoading(true);

    const result = await deleteExpense(expense.id, institutionId);
    setLoading(false);

    if (!result.success) { setError(result.error); return; }
    setError(""); onSuccess(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-200/40 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-900/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Delete Expense</h2>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
            Are you sure you want to permanently delete this expense?
          </p>

          <div className="rounded-lg bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{expense.description}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {new Date(expense.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {expense.vendor_name ? ` · ${expense.vendor_name}` : ""}
              </p>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{fmtINR(Number(expense.amount))}</p>
            </div>
          </div>

          {expense.receipt_url && (
            <p className="mt-2.5 text-[10px] text-slate-400 dark:text-slate-500">
              ⚠ The attached receipt file will also be deleted from storage.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/20 dark:border-slate-800 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 border border-rose-700 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm">
            {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Delete Expense
          </button>
        </div>
      </div>
    </div>
  );
}
