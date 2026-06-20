"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, Send, Check, X as XIcon, RefreshCw } from "lucide-react";
import { BUDGET_STATUS_LABELS, BUDGET_STATUS_COLORS, BUDGET_LINE_CATEGORIES, BUDGET_LINE_CATEGORY_LABELS, isBudgetEditable, canSubmitBudget, canDecideBudget, budgetTotals, lineItemVariance, type DepartmentBudget, type BudgetLineCategory } from "@/lib/budgets";
import { addLineItem, updateLineItemActual, deleteLineItem, submitBudget, approveBudget, rejectBudget, refreshActuals } from "@/actions/budgets";

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function BudgetDetail({
  institutionId, instSlug, departmentName, ayLabel, isAdmin, initial,
}: {
  institutionId: string;
  instSlug: string;
  departmentName: string;
  ayLabel: string;
  isAdmin: boolean;
  initial: DepartmentBudget;
}) {
  const router = useRouter();
  const budget = initial;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState<BudgetLineCategory>("other");
  const [description, setDescription] = useState("");
  const [plannedAmt, setPlannedAmt] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const lineItems = budget.line_items ?? [];
  const totals = budgetTotals(lineItems);
  const editable = isBudgetEditable(budget.status);

  function refresh() { router.refresh(); }

  async function handleAdd() {
    if (!description.trim()) { setError("Description is required."); return; }
    const amt = Number(plannedAmt);
    if (!amt || amt <= 0) { setError("Enter a planned amount greater than 0."); return; }
    setBusy(true); setError(null);
    const res = await addLineItem({ institutionId, budgetId: budget.id, category, description, plannedAmt: amt });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setAdding(false); setDescription(""); setPlannedAmt(""); setCategory("other");
    refresh();
  }

  async function handleDelete(id: string) {
    setBusy(true); setError(null);
    const res = await deleteLineItem({ id, institutionId, budgetId: budget.id });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    refresh();
  }

  async function handleActualEdit(id: string, value: string) {
    const amt = Number(value);
    if (Number.isNaN(amt) || amt < 0) return;
    const res = await updateLineItemActual({ id, institutionId, budgetId: budget.id, actualAmt: amt });
    if (!res.success) { setError(res.error); return; }
    refresh();
  }

  async function handleSubmit() {
    setBusy(true); setError(null);
    const res = await submitBudget(institutionId, budget.id);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    refresh();
  }

  async function handleApprove() {
    setBusy(true); setError(null);
    const res = await approveBudget(institutionId, budget.id);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    refresh();
  }

  async function handleReject() {
    if (!rejectNotes.trim()) { setError("Provide a reason for rejection."); return; }
    setBusy(true); setError(null);
    const res = await rejectBudget(institutionId, budget.id, rejectNotes);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setRejectOpen(false); setRejectNotes("");
    refresh();
  }

  async function handleRefreshActuals() {
    setBusy(true); setError(null);
    const res = await refreshActuals(institutionId, budget.id);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    refresh();
  }

  return (
    <div className="w-full p-6 space-y-6">
      <Link href={`/institutions/${instSlug}/finance/budgets`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600">
        <ChevronLeft size={14} /> Department Budgets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{departmentName}</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{ayLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[12px] font-medium px-3 py-1.5 rounded-lg ${BUDGET_STATUS_COLORS[budget.status]}`}>
            {BUDGET_STATUS_LABELS[budget.status]}
          </span>
          <button onClick={handleRefreshActuals} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw size={14} /> Sync Actuals
          </button>
          {canSubmitBudget(budget.status, lineItems.length) && (
            <button onClick={handleSubmit} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
              <Send size={14} /> Submit for Approval
            </button>
          )}
          {isAdmin && canDecideBudget(budget.status) && (
            <>
              <button onClick={handleApprove} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                <Check size={14} /> Approve
              </button>
              <button onClick={() => setRejectOpen(true)} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50">
                <XIcon size={14} /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
      {budget.admin_notes && (
        <p className="text-[12px] text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">Admin note: {budget.admin_notes}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Planned", value: totals.totalPlanned },
          { label: "Actual", value: totals.totalActual },
          { label: "Variance", value: totals.variance },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">{kpi.label}</p>
            <p className="text-[16px] font-semibold text-slate-900 dark:text-white">{formatINR(kpi.value)}</p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <p className="text-[11px] text-slate-400">Utilisation</p>
          <p className={`text-[16px] font-semibold ${totals.utilisationPct > 100 ? "text-rose-600" : "text-slate-900 dark:text-white"}`}>{totals.utilisationPct}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">Line Items</h2>
          {editable && (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700">
              <Plus size={13} /> Add Item
            </button>
          )}
        </div>

        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2">Category</th>
              <th className="text-left font-medium px-4 py-2">Description</th>
              <th className="text-right font-medium px-4 py-2">Planned</th>
              <th className="text-right font-medium px-4 py-2">Actual</th>
              <th className="text-right font-medium px-4 py-2">Variance</th>
              <th className="text-right font-medium px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {lineItems.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No line items yet.</td></tr>
            ) : (
              lineItems.map((item) => {
                const v = lineItemVariance(item);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{BUDGET_LINE_CATEGORY_LABELS[item.category]}</td>
                    <td className="px-4 py-2 text-slate-900 dark:text-white">{item.description}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-white">{formatINR(item.planned_amt)}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        defaultValue={item.actual_amt}
                        onBlur={(e) => handleActualEdit(item.id, e.target.value)}
                        className="w-24 text-right px-2 py-1 text-[12px] rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${v.isOverBudget ? "text-rose-600" : "text-emerald-600"}`}>{formatINR(v.variance)}</td>
                    <td className="px-4 py-2 text-right">
                      {editable && (
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-rose-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAdding(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Add Line Item</h3>
            <div>
              <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as BudgetLineCategory)}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                {BUDGET_LINE_CATEGORIES.map((c) => <option key={c} value={c}>{BUDGET_LINE_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 10 lab microscopes"
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Planned Amount (₹)</label>
              <input type="number" value={plannedAmt} onChange={(e) => setPlannedAmt(e.target.value)} placeholder="50000"
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setAdding(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleAdd} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                {busy ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Reject Budget</h3>
            <textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} rows={3} placeholder="Reason for rejection…"
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setRejectOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleReject} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50">
                {busy ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
