"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, PowerOff, AlertCircle } from "lucide-react";
import { AddFeeStructureModal } from "@/components/finance/AddFeeStructureModal";
import { EditFeeStructureModal } from "@/components/finance/EditFeeStructureModal";
import { deleteFeeStructure } from "@/actions/feeStructures";
import type { FeeStructure, FeeType } from "@/types/finance";

// ── Fee type badge colours ────────────────────────────────────────────────────

const FEE_TYPE_STYLES: Record<FeeType, string> = {
  tuition: "bg-violet-100/80 text-violet-700 border-violet-200/60 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/40",
  hostel:  "bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40",
  exam:    "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
  library: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
  lab:     "bg-cyan-100/80 text-cyan-700 border-cyan-200/60 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700/40",
  other:   "bg-slate-100/80 text-slate-600 border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

const FEE_TYPE_LABELS: Record<FeeType, string> = {
  tuition: "Tuition", hostel: "Hostel", exam: "Exam",
  library: "Library", lab: "Lab", other: "Other",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  institutionId: string;
  feeStructures: FeeStructure[];
};

// ── Component ─────────────────────────────────────────────────────────────────

export function FeeStructuresClient({ institutionId, feeStructures }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen]       = useState(false);
  const [editTarget, setEditTarget] = useState<FeeStructure | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // ── Derived stats ────────────────────────────────────────────────────────
  const active      = feeStructures.filter(f => f.is_active);
  const totalValue  = active.reduce((s, f) => s + Number(f.amount), 0);
  const feeTypeSet  = new Set(feeStructures.map(f => f.fee_type));

  // ── Group by academic year ────────────────────────────────────────────────
  const byYear = feeStructures.reduce<Record<string, FeeStructure[]>>((acc, f) => {
    (acc[f.academic_year] ??= []).push(f);
    return acc;
  }, {});
  const sortedYears = Object.keys(byYear).sort((a, b) => b.localeCompare(a));

  // ── Actions ───────────────────────────────────────────────────────────────
  function onMutationSuccess() {
    router.refresh(); // re-render server component → fresh feeStructures props
  }

  async function handleDeactivate(fee: FeeStructure) {
    if (!confirm(`Deactivate "${fee.name}"? It will be hidden from fee selection but not deleted.`)) return;
    setDeactivating(fee.id);
    setDeactivateError(null);

    const result = await deleteFeeStructure(fee.id, institutionId);
    setDeactivating(null);

    if (!result.success) {
      setDeactivateError(result.error);
      return;
    }
    router.refresh();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 px-6 pt-6 pb-6 h-full overflow-y-auto">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Fee Structures</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage tuition, hostel, exam, and other institutional fees.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg border border-violet-700 transition-colors shadow-sm"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Fee Structure
        </button>
      </div>

      {/* ── Error banner (deactivation errors) ── */}
      {deactivateError && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={13} className="shrink-0" />
          {deactivateError}
        </div>
      )}

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        {[
          { label: "Fee Types",        value: feeTypeSet.size,    sub: "distinct categories" },
          { label: "Active Structures", value: active.length,     sub: `of ${feeStructures.length} total` },
          { label: "Combined Value",    value: fmtINR(totalValue), sub: "active fees · per student" },
        ].map(stat => (
          <div
            key={stat.label}
            className="px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm"
          >
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{stat.value}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Empty state ── */}
      {feeStructures.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/20 backdrop-blur-sm py-16">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-900/30 border border-violet-200/60 dark:border-violet-700/40 flex items-center justify-center">
            <span className="text-2xl">₹</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No fee structures yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
              Create tuition, hostel, exam, or other fees to attach to student payments.
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={13} strokeWidth={2.5} />
            Add first fee structure
          </button>
        </div>
      )}

      {/* ── Year groups ── */}
      {sortedYears.map(year => (
        <section key={year} className="space-y-2">
          {/* Year header */}
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {year}
            </h2>
            <div className="flex-1 h-px bg-slate-200/60 dark:bg-slate-700/60" />
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {byYear[year].length} structure{byYear[year].length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table card */}
          <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                  {["Name", "Type", "Department", "Amount", "Status", ""].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                {byYear[year].map(fee => (
                  <tr
                    key={fee.id}
                    className={`group transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-700/30 ${!fee.is_active ? "opacity-50" : ""}`}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {fee.name}
                      </p>
                    </td>

                    {/* Type badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${FEE_TYPE_STYLES[fee.fee_type]}`}>
                        {FEE_TYPE_LABELS[fee.fee_type]}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {fee.departments?.name ?? "Institution-wide"}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                        {fmtINR(Number(fee.amount))}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        fee.is_active
                          ? "bg-emerald-50/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40"
                          : "bg-slate-100/80 text-slate-500 border-slate-200/60 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${fee.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {fee.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setEditTarget(fee)}
                          title="Edit"
                          className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50/80 dark:hover:bg-violet-900/30 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        {fee.is_active && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(fee)}
                            disabled={deactivating === fee.id}
                            title="Deactivate"
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {deactivating === fee.id
                              ? <span className="w-3 h-3 border-2 border-slate-300 border-t-red-400 rounded-full animate-spin block" />
                              : <PowerOff size={13} />
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* ── Modals ── */}
      <AddFeeStructureModal
        isOpen={addOpen}
        institutionId={institutionId}
        onClose={() => setAddOpen(false)}
        onSuccess={onMutationSuccess}
      />

      <EditFeeStructureModal
        isOpen={editTarget !== null}
        institutionId={institutionId}
        feeStructure={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={onMutationSuccess}
      />
    </div>
  );
}
