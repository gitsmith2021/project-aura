"use client";

import { useState } from "react";
import { X, IndianRupee } from "lucide-react";
import { processDisbursement } from "@/actions/salary";
import type { SalaryDisbursement, DisbursementMode } from "@/types/finance";

type Props = {
  isOpen:        boolean;
  disbursement:  SalaryDisbursement | null;
  institutionId: string;
  onClose:       () => void;
  onSuccess:     () => void;
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

export function ProcessDisbursementModal({
  isOpen, disbursement, institutionId, onClose, onSuccess,
}: Props) {
  const [paymentMode,    setPaymentMode]    = useState<DisbursementMode>("bank_transfer");
  const [transactionRef, setTransactionRef] = useState("");
  const [remarks,        setRemarks]        = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");

  if (!isOpen || !disbursement) return null;

  function handleClose() { setTransactionRef(""); setRemarks(""); setError(""); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await processDisbursement(disbursement!.id, institutionId, {
      payment_mode:    paymentMode,
      transaction_ref: transactionRef.trim() || undefined,
      remarks:         remarks.trim()        || undefined,
    });

    setLoading(false);
    if (!result.success) { setError(result.error); return; }

    setTransactionRef(""); setRemarks(""); setError("");
    onSuccess(); onClose();
  }

  const inp = "w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors";
  const lbl = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

  const staffName = disbursement.staff
    ? `${disbursement.staff.title ? disbursement.staff.title + " " : ""}${disbursement.staff.full_name}`
    : "Staff Member";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-sm bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/20 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-700/40 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Process Disbursement</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Mark as processed and record details</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Summary */}
        <div className="px-5 py-3 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100/60 dark:border-slate-800">
          <div className="flex justify-between items-baseline">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{staffName}</p>
              {disbursement.staff?.designation && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{disbursement.staff.designation}</p>
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Month: {disbursement.month}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Net Salary</p>
              <p className="text-base font-black text-emerald-700 dark:text-emerald-400">{fmtINR(Number(disbursement.amount_disbursed))}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form id="process-disb-form" onSubmit={handleSubmit} className="px-5 py-4 space-y-3.5">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className={lbl}>Payment Mode <span className="text-violet-500 normal-case font-normal">*</span></label>
            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value as DisbursementMode)} required className={inp + " appearance-none cursor-pointer"}>
              {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Transaction Reference <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
            <input type="text" value={transactionRef} onChange={e => setTransactionRef(e.target.value)} placeholder="e.g. NEFT ref no." className={inp} />
          </div>

          <div>
            <label className={lbl}>Remarks <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Any notes…" className={inp + " resize-none"} />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/20 dark:border-slate-800 flex justify-end gap-2.5">
          <button type="button" onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button type="submit" form="process-disb-form" disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 border border-emerald-700 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm">
            {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Mark as Processed
          </button>
        </div>
      </div>
    </div>
  );
}
