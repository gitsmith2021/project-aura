"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { bulkProcessDisbursements } from "@/actions/salary";
import type { SalaryDisbursement, DisbursementMode } from "@/types/finance";

type Props = {
  isOpen:          boolean;
  disbursements:   SalaryDisbursement[];   // selected pending disbursements
  institutionId:   string;
  onClose:         () => void;
  onSuccess:       () => void;
};

const MODES: { value: DisbursementMode; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "neft",          label: "NEFT" },
  { value: "rtgs",          label: "RTGS" },
  { value: "cheque",        label: "Cheque" },
  { value: "cash",          label: "Cash" },
];

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function BulkDisbursementModal({
  isOpen, disbursements, institutionId, onClose, onSuccess,
}: Props) {
  const [paymentMode, setPaymentMode] = useState<DisbursementMode>("bank_transfer");
  const [remarks,     setRemarks]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<{ processed: number; failed: number } | null>(null);
  const [error,       setError]       = useState("");

  if (!isOpen) return null;

  const total = disbursements.reduce((s, d) => s + Number(d.amount_disbursed), 0);

  function handleClose() {
    setRemarks(""); setError(""); setResult(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    const ids    = disbursements.map(d => d.id);
    const res    = await bulkProcessDisbursements(ids, institutionId, {
      payment_mode: paymentMode,
      remarks:      remarks.trim() || undefined,
    });

    setLoading(false);
    if (!res.success) { setError(res.error); return; }

    setResult(res.data);
    onSuccess();
  }

  const inp = "w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors";
  const lbl = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!loading ? handleClose : undefined} />

      <div className="relative w-full max-w-sm bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/20 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bulk Process Disbursements</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {disbursements.length} staff · {fmtINR(total)} total
            </p>
          </div>
          {!loading && (
            <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Result view */}
        {result ? (
          <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
            {result.failed === 0 ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">All done!</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {result.processed} disbursement{result.processed !== 1 ? "s" : ""} processed successfully.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Partially processed</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {result.processed} processed · {result.failed} failed
                  </p>
                </div>
              </>
            )}
            <button onClick={handleClose} className="mt-2 px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Form */}
            <form id="bulk-disb-form" onSubmit={handleSubmit} className="px-5 py-4 space-y-3.5">
              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Staff preview (first 5) */}
              {disbursements.length > 0 && (
                <div className="rounded-lg bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 p-3 space-y-1.5">
                  {disbursements.slice(0, 5).map(d => (
                    <div key={d.id} className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                        {d.staff?.title ? d.staff.title + " " : ""}{d.staff?.full_name ?? "—"}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                        {fmtINR(Number(d.amount_disbursed))}
                      </span>
                    </div>
                  ))}
                  {disbursements.length > 5 && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      +{disbursements.length - 5} more…
                    </p>
                  )}
                  <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/40 flex justify-between">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Total</span>
                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">{fmtINR(total)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className={lbl}>Payment Mode (applies to all) <span className="text-violet-500 normal-case font-normal">*</span></label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value as DisbursementMode)} required className={inp + " appearance-none cursor-pointer"}>
                  {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className={lbl}>Remarks <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Batch remarks…" className={inp + " resize-none"} />
              </div>
            </form>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-white/20 dark:border-slate-800 flex justify-end gap-2.5">
              <button type="button" onClick={handleClose} disabled={loading}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" form="bulk-disb-form" disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 border border-emerald-700 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm">
                {loading
                  ? <><Loader2 size={12} className="animate-spin" /> Processing…</>
                  : `Process ${disbursements.length} Disbursements`
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
