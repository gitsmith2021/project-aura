"use client";

import { useEffect, useState } from "react";
import { X, CreditCard } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Student = { id: string; full_name: string };
type FeeStructure = { id: string; name: string; amount: number; fee_type: string };

type Props = {
  isOpen: boolean;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
};

const PAYMENT_MODES = [
  { value: "cash",          label: "Cash" },
  { value: "upi",           label: "UPI" },
  { value: "razorpay",      label: "Razorpay" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque",        label: "Cheque" },
  { value: "dd",            label: "Demand Draft" },
];

const STATUSES = [
  { value: "completed", label: "Completed" },
  { value: "pending",   label: "Pending" },
  { value: "failed",    label: "Failed" },
  { value: "refunded",  label: "Refunded" },
];

export function RecordPaymentPanel({ isOpen, tenantId, onClose, onSuccess }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [feeStructureId, setFeeStructureId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("completed");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen || !tenantId) return;
    document.body.style.overflow = "hidden";

    const supabase = createClient();
    Promise.all([
      supabase.from("profiles")
        .select("id, full_name")
        .eq("tenant_id", tenantId)
        .eq("role", "STUDENT")
        .order("full_name"),
      supabase.from("fee_structures")
        .select("id, name, amount, fee_type")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name"),
    ]).then(([{ data: students }, { data: fees }]) => {
      if (students) setStudents(students);
      if (fees) setFeeStructures(fees);
    });

    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, tenantId]);

  // Auto-fill amount when fee structure is selected
  useEffect(() => {
    if (!feeStructureId) return;
    const fee = feeStructures.find(f => f.id === feeStructureId);
    if (fee) setAmountPaid(String(fee.amount));
  }, [feeStructureId, feeStructures]);

  function reset() {
    setStudentId(""); setFeeStructureId(""); setAmountPaid("");
    setPaymentMode("cash"); setPaymentStatus("completed");
    setReceiptNumber(""); setPaidAt(new Date().toISOString().slice(0, 10)); setNotes("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !amountPaid) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("fee_payments").insert([{
      tenant_id:        tenantId,
      student_id:       studentId,
      fee_structure_id: feeStructureId || null,
      amount_paid:      parseFloat(amountPaid),
      payment_mode:     paymentMode,
      payment_status:   paymentStatus,
      receipt_number:   receiptNumber.trim() || null,
      paid_at:          paymentStatus === "completed" ? new Date(paidAt).toISOString() : null,
      notes:            notes.trim() || null,
    }]);

    setLoading(false);

    if (error) {
      alert("Failed to record payment: " + error.message);
    } else {
      reset();
      onSuccess();
      onClose();
    }
  }

  const inputCls = "w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-colors";
  const labelCls = "block text-[11px] font-medium text-slate-600 mb-1";

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div className={`relative w-full max-w-sm h-full bg-white flex flex-col border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Record Payment</h2>
              <p className="text-[11px] text-slate-400">Log a student fee payment</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form id="record-payment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 bg-slate-50">

          <div>
            <label className={labelCls}>Student <span className="text-rose-500">*</span></label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              required
              className={inputCls + " appearance-none"}
            >
              <option value="" disabled>Select student…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            {students.length === 0 && (
              <p className="text-[10px] text-slate-400 mt-1">No students found for this institution.</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Fee Structure <span className="text-slate-400">(optional)</span></label>
            <select
              value={feeStructureId}
              onChange={e => setFeeStructureId(e.target.value)}
              className={inputCls + " appearance-none"}
            >
              <option value="">Select fee type…</option>
              {feeStructures.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} — ₹{Number(f.amount).toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount Paid (₹) <span className="text-rose-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder="0.00"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Payment Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={paidAt}
                onChange={e => setPaidAt(e.target.value)}
                required
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Payment Mode <span className="text-rose-500">*</span></label>
            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} required className={inputCls + " appearance-none"}>
              {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Status <span className="text-rose-500">*</span></label>
            <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} required className={inputCls + " appearance-none"}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Receipt Number <span className="text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={receiptNumber}
              onChange={e => setReceiptNumber(e.target.value)}
              placeholder="e.g. RCP-2026-001"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-slate-400">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any remarks…"
              className={inputCls + " resize-none"}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex justify-end gap-2">
          <button type="button" onClick={handleClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            form="record-payment-form"
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 border border-violet-700 rounded-md hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}
