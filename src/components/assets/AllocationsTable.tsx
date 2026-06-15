"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import { returnAllocation } from "@/actions/assets";
import {
  ALLOCATION_TARGET_LABELS, ALLOCATION_STATUS_LABELS, allocationTargetName,
  type AssetAllocation,
} from "@/lib/assets";

const STATUS_COLORS: Record<string, string> = {
  allocated: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  returned: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  consumed: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function AllocationsTable({ institutionId, initial }: { institutionId: string; initial: AssetAllocation[] }) {
  const [rows, setRows] = useState<AssetAllocation[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doReturn = async (id: string) => {
    setBusy(id); setError(null);
    const res = await returnAllocation({ institutionId, allocationId: id });
    setBusy(null);
    if (!res.success) { setError(res.error); return; }
    const today = new Date().toISOString().slice(0, 10);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "returned", returned_qty: r.allocated_qty, returned_date: today } : r)));
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <Link href={`/institutions/${institutionId}/assets`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 font-medium mb-4">
        <ArrowLeft size={13} /> Assets
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <ArrowRightLeft size={18} className="text-purple-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Asset Allocations</h1>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Which department, lab or staff member holds each asset.</p>

      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No allocations yet. Allocate assets from the inventory page.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Asset</th>
                <th className="px-3 py-2.5 font-semibold">Allocated to</th>
                <th className="px-3 py-2.5 font-semibold">Qty</th>
                <th className="px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{a.assets?.name ?? "Asset"}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                    {allocationTargetName(a)}
                    <span className="ml-1 text-[10px] uppercase text-slate-400">{ALLOCATION_TARGET_LABELS[a.allocated_to_type]}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{a.allocated_qty} {a.assets?.unit ?? ""}</td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{a.allocated_date}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[a.status]}`}>{ALLOCATION_STATUS_LABELS[a.status]}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {a.status === "allocated" ? (
                      <button type="button" onClick={() => doReturn(a.id)} disabled={busy === a.id} className="px-2 py-1 text-[11px] font-semibold rounded-md border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50">
                        {busy === a.id ? "…" : "Return"}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">{a.returned_date ?? "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
