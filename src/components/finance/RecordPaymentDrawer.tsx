"use client";

import { useEffect, useState } from "react";
import { X, CreditCard, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { recordManualPayment } from "@/actions/feePayments";
import type { PaymentMode } from "@/types/finance";

type Student      = { id: string; full_name: string; roll_no: string | null };
type FeeStructure = { id: string; name: string; amount: number; fee_type: string };

type Props = {
  isOpen:        boolean;
  institutionId: string;
  onClose:       () => void;
  onSuccess:     () => void;
};

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash",          label: "Cash" },
  { value: "upi",           label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque",        label: "Cheque" },
  { value: "dd",            label: "Demand Draft" },
];

export function RecordPaymentDrawer({ isOpen, institutionId, onClose, onSuccess }: Props) {
  const [students,      setStudents]      = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  // ── Form state ──────────────────────────────────────────────────────────
  const [studentSearch,   setStudentSearch]   = useState("");
  const [studentId,       setStudentId]       = useState("");
  const [feeStructureId,  setFeeStructureId]  = useState("");
  const [amountPaid,      setAmountPaid]      = useState("");
  const [paymentMode,     setPaymentMode]     = useState<PaymentMode>("cash");
  const [paymentStatus,   setPaymentStatus]   = useState<"completed" | "pending">("completed");
  const [receiptNumber,   setReceiptNumber]   = useState("");
  const [paidAt,          setPaidAt]          = useState(new Date().toISOString().slice(0, 10));
  const [notes,           setNotes]           = useState("");

  // ── Load data on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !institutionId) return;
    document.body.style.overflow = "hidden";

    const sb = createClient();
    Promise.all([
      sb.from("students")
        .select("id, full_name, roll_no")
        .eq("institution_id", institutionId)
        .order("full_name"),
      sb.from("fee_structures")
        .select("id, name, amount, fee_type")
        .eq("institution_id", institutionId)
        .eq("is_active", true)
        .order("name"),
    ]).then(([{ data: s }, { data: f }]) => {
      if (s) setStudents(s);
      if (f) setFeeStructures(f);
    });

    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, institutionId]);

  // Auto-fill amount when fee structure is selected
  useEffect(() => {
    if (!feeStructureId) return;
    const fee = feeStructures.find(f => f.id === feeStructureId);
    if (fee) setAmountPaid(String(fee.amount));
  }, [feeStructureId, feeStructures]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const filteredStudents = studentSearch.trim()
    ? students.filter(s =>
        s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.roll_no ?? "").toLowerCase().includes(studentSearch.toLowerCase())
      )
    : students;

  const selectedStudent = students.find(s => s.id === studentId);

  function reset() {
    setStudentSearch(""); setStudentId(""); setFeeStructureId("");
    setAmountPaid(""); setPaymentMode("cash"); setPaymentStatus("completed");
    setReceiptNumber(""); setPaidAt(new Date().toISOString().slice(0, 10));
    setNotes(""); setError("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = parseFloat(amountPaid);
    if (!studentId)       { setError("Please select a student."); return; }
    if (isNaN(parsed) || parsed <= 0) { setError("Enter a valid amount."); return; }

    setLoading(true);
    const result = await recordManualPayment({
      student_id:       studentId,
      fee_structure_id: feeStructureId || null,
      amount_paid:      parsed,
      payment_mode:     paymentMode,
      payment_status:   paymentStatus,
      receipt_number:   receiptNumber.trim() || null,
      paid_at:          paymentStatus === "completed" ? new Date(paidAt).toISOString() : null,
      notes:            notes.trim() || null,
      institution_id:   institutionId,
    });
    setLoading(false);

    if (!result.success) { setError(result.error); return; }
    reset(); onSuccess(); onClose();
  }

  // ── Shared class strings ────────────────────────────────────────────────
  const inp = "w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-white/30 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors";
  const lbl = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className={`relative w-full max-w-md h-full flex flex-col bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-l border-white/20 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 border border-violet-200/60 dark:border-violet-700/40 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Record Payment</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Log a manual fee payment</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form id="record-payment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Student search/select */}
          <div>
            <label className={lbl}>Student <span className="text-violet-500 normal-case font-normal">*</span></label>

            {/* Selected student chip */}
            {selectedStudent ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-violet-50/80 dark:bg-violet-900/30 border border-violet-200/60 dark:border-violet-700/40">
                <div>
                  <p className="text-xs font-semibold text-violet-800 dark:text-violet-200">{selectedStudent.full_name}</p>
                  {selectedStudent.roll_no && (
                    <p className="text-[10px] text-violet-500 dark:text-violet-400">{selectedStudent.roll_no}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setStudentId(""); setStudentSearch(""); }}
                  className="text-violet-400 hover:text-violet-600 dark:hover:text-violet-300"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search by name or roll no…"
                  className={inp + " pl-8"}
                />
                {studentSearch && filteredStudents.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredStudents.slice(0, 20).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setStudentId(s.id); setStudentSearch(""); }}
                        className="w-full text-left px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors"
                      >
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{s.full_name}</p>
                        {s.roll_no && <p className="text-[10px] text-slate-400">{s.roll_no}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {studentSearch && filteredStudents.length === 0 && (
                  <p className="text-[11px] text-slate-400 mt-1.5 px-1">No students found.</p>
                )}
              </div>
            )}
          </div>

          {/* Fee Structure */}
          <div>
            <label className={lbl}>Fee Structure <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
            <select
              value={feeStructureId}
              onChange={e => setFeeStructureId(e.target.value)}
              className={inp + " appearance-none cursor-pointer"}
            >
              <option value="">Select fee structure…</option>
              {feeStructures.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} — ₹{Number(f.amount).toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className={lbl}>Amount Paid (₹) <span className="text-violet-500 normal-case font-normal">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">₹</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder="0.00"
                required
                className={inp + " pl-7"}
              />
            </div>
          </div>

          {/* Mode + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Payment Mode <span className="text-violet-500 normal-case font-normal">*</span></label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                required
                className={inp + " appearance-none cursor-pointer"}
              >
                {PAYMENT_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Status <span className="text-violet-500 normal-case font-normal">*</span></label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as "completed" | "pending")}
                required
                className={inp + " appearance-none cursor-pointer"}
              >
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Date */}
          {paymentStatus === "completed" && (
            <div>
              <label className={lbl}>Payment Date <span className="text-violet-500 normal-case font-normal">*</span></label>
              <input
                type="date"
                value={paidAt}
                onChange={e => setPaidAt(e.target.value)}
                required
                className={inp}
              />
            </div>
          )}

          {/* Receipt Number */}
          <div>
            <label className={lbl}>
              Receipt Number <span className="text-slate-400 normal-case font-normal">(auto-generated if blank)</span>
            </label>
            <input
              type="text"
              value={receiptNumber}
              onChange={e => setReceiptNumber(e.target.value)}
              placeholder="e.g. RCP-2025-00123"
              className={inp}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any remarks…"
              className={inp + " resize-none"}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-white/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="record-payment-form"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 border border-violet-700 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
          >
            {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}
