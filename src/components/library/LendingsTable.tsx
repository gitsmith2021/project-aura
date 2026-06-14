"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { returnBook, type LendingWithBorrower } from "@/actions/library";
import { calculateFine, lendingStatus, FINE_PER_DAY } from "@/lib/library";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const STATUS_CLS: Record<string, string> = {
  issued: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  overdue: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  returned: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  lost: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

export function LendingsTable({
  institutionId, initial, overdueOnly = false,
}: {
  institutionId: string;
  initial: LendingWithBorrower[];
  overdueOnly?: boolean;
}) {
  const [rows, setRows] = useState<LendingWithBorrower[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const view = overdueOnly ? rows.filter((r) => lendingStatus(r) === "overdue") : rows;

  const doReturn = async (id: string) => {
    setBusyId(id);
    setError(null);
    const res = await returnBook(id, institutionId);
    setBusyId(null);
    if (!res.success) { setError(res.error); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (res.data.fine > 0) alert(`Returned. Overdue fine: ${inr(res.data.fine)}`);
  };

  if (view.length === 0) {
    return <p className="text-center text-xs text-slate-400 py-16">{overdueOnly ? "No overdue books. 🎉" : "No issued books."}</p>;
  }

  return (
    <>
      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Book</th>
              <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Borrower</th>
              <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Issued</th>
              <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Due</th>
              <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Status</th>
              <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Fine</th>
              <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {view.map((r) => {
              const status = lendingStatus(r);
              const fine = r.returned_date ? r.fine_amount : calculateFine(r.due_date, null, FINE_PER_DAY);
              return (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{r.library_books?.title ?? "—"}</div>
                    <div className="text-[10px] text-slate-400">{r.library_books?.author ?? ""}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {r.borrower_name}<span className="text-slate-400"> · {r.borrower_type}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{fmt(r.issued_date)}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{fmt(r.due_date)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_CLS[status]}`}>{status}</span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{fine > 0 ? inr(fine) : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {!r.returned_date && (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => doReturn(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-40 transition-colors"
                      >
                        <Undo2 size={12} /> Return
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
