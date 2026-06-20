"use client";

import { useEffect, useRef, useState } from "react";
import { X, Receipt, Paperclip, Upload } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { createExpense } from "@/actions/expenses";
import type { ExpenseCategory, ExpensePaymentMode } from "@/types/finance";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: "utilities",      label: "Utilities",       emoji: "🔌" },
  { value: "maintenance",    label: "Maintenance",     emoji: "🔧" },
  { value: "vendor",         label: "Vendor",          emoji: "🏪" },
  { value: "events",         label: "Events",          emoji: "🎉" },
  { value: "stationery",     label: "Stationery",      emoji: "📄" },
  { value: "infrastructure", label: "Infrastructure",  emoji: "🏗️" },
  { value: "it",             label: "IT",              emoji: "💻" },
  { value: "other",          label: "Other",           emoji: "📦" },
];

const PAYMENT_MODES: { value: ExpensePaymentMode; label: string }[] = [
  { value: "cash",          label: "Cash" },
  { value: "upi",           label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque",        label: "Cheque" },
  { value: "card",          label: "Card" },
];

type Department = { id: string; name: string };

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  isOpen:        boolean;
  institutionId: string;
  onClose:       () => void;
  onSuccess:     () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function LogExpenseDrawer({ isOpen, institutionId, onClose, onSuccess }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // Form state
  const [description,  setDescription]  = useState("");
  const [category,     setCategory]     = useState<ExpenseCategory>("utilities");
  const [amount,       setAmount]       = useState("");
  const [paymentMode,  setPaymentMode]  = useState<ExpensePaymentMode>("cash");
  const [expenseDate,  setExpenseDate]  = useState(new Date().toISOString().split("T")[0]);
  const [vendorName,   setVendorName]   = useState("");
  const [scope,        setScope]        = useState<"institution" | "department">("institution");
  const [departmentId, setDepartmentId] = useState("");
  const [notes,        setNotes]        = useState("");
  const [receiptFile,  setReceiptFile]  = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isDragging,   setIsDragging]   = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !institutionId) return;
    document.body.style.overflow = "hidden";

    createClient()
      .from("departments")
      .select("id, name")
      .eq("institution_id", institutionId)
      .order("name")
      .then(({ data }) => { if (data) setDepartments(data); });

    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, institutionId]);

  function handleFileChange(file: File | null) {
    setReceiptFile(file);
    setReceiptPreview(null);
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e => setReceiptPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      handleFileChange(file);
    }
  }

  function reset() {
    setDescription(""); setCategory("utilities"); setAmount(""); setPaymentMode("cash");
    setExpenseDate(new Date().toISOString().split("T")[0]); setVendorName("");
    setScope("institution"); setDepartmentId(""); setNotes("");
    setReceiptFile(null); setReceiptPreview(null); setError("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError("Enter a valid amount."); return; }

    setLoading(true);

    // Upload receipt if provided (client-side)
    let receiptUrl: string | null = null;
    if (receiptFile) {
      const sb    = createClient();
      const ext   = receiptFile.name.split(".").pop();
      const path  = `${institutionId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await sb.storage.from("receipts").upload(path, receiptFile);
      if (uploadErr) {
        setLoading(false);
        setError(`Receipt upload failed: ${uploadErr.message}`);
        return;
      }
      const { data: { publicUrl } } = sb.storage.from("receipts").getPublicUrl(path);
      receiptUrl = publicUrl;
    }

    const result = await createExpense({
      institution_id: institutionId,
      department_id:  scope === "department" ? (departmentId || null) : null,
      category,
      description:    description.trim(),
      amount:         parsedAmount,
      payment_mode:   paymentMode,
      vendor_name:    vendorName.trim() || null,
      receipt_url:    receiptUrl,
      expense_date:   expenseDate,
      notes:          notes.trim() || null,
    });

    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    reset(); onSuccess(); onClose();
  }

  const inp = "w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-white/30 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors";
  const lbl = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      <div className={`relative w-full max-w-md h-full flex flex-col bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-l border-white/20 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 border border-rose-200/60 dark:border-rose-700/40 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Log Expense</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Record an institutional expense</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form id="log-expense-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className={lbl}>Description <span className="text-violet-500 normal-case font-normal">*</span></label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Electricity bill – May 2026" required className={inp} />
          </div>

          <div>
            <label className={lbl}>Category <span className="text-violet-500 normal-case font-normal">*</span></label>
            <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} required className={inp + " appearance-none cursor-pointer"}>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Amount (₹) <span className="text-violet-500 normal-case font-normal">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required className={inp + " pl-7"} />
              </div>
            </div>
            <div>
              <label className={lbl}>Expense Date <span className="text-violet-500 normal-case font-normal">*</span></label>
              <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Payment Mode <span className="text-violet-500 normal-case font-normal">*</span></label>
            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value as ExpensePaymentMode)} required className={inp + " appearance-none cursor-pointer"}>
              {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Vendor Name <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
            <input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="e.g. TNEB, Sri Supplies" className={inp} />
          </div>

          {/* Scope */}
          <div>
            <label className={lbl}>Scope</label>
            <div className="flex gap-3">
              {(["institution", "department"] as const).map(s => (
                <label key={s} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${scope === s ? "border-violet-400 bg-violet-50/80 text-violet-700 dark:bg-violet-900/30 dark:border-violet-600 dark:text-violet-300" : "border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400"}`}>
                  <input type="radio" name="exp-scope" value={s} checked={scope === s} onChange={() => { setScope(s); if (s === "institution") setDepartmentId(""); }} className="sr-only" />
                  {s === "institution" ? "Institution-wide" : "Department"}
                </label>
              ))}
            </div>
          </div>

          {scope === "department" && (
            <div>
              <label className={lbl}>Department <span className="text-violet-500 normal-case font-normal">*</span></label>
              <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} required className={inp + " appearance-none cursor-pointer"}>
                <option value="" disabled>Select department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {/* Receipt Upload */}
          <div>
            <label className={lbl}>Receipt <span className="text-slate-400 normal-case font-normal">(optional — image or PDF)</span></label>

            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-lg border-2 border-dashed p-4 transition-all text-center ${isDragging ? "border-violet-400 bg-violet-50/50 dark:bg-violet-900/20" : "border-slate-200/80 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700"}`}
            >
              {receiptFile ? (
                receiptPreview ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview of a just-selected file; next/image adds no value */}
                    <img src={receiptPreview} alt="Receipt" className="w-12 h-12 object-cover rounded-md border border-slate-200 dark:border-slate-700 shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{receiptFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(receiptFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); handleFileChange(null); }} className="ml-auto p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Paperclip size={20} className="text-slate-400 shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{receiptFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(receiptFile.size / 1024).toFixed(1)} KB · PDF</p>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); handleFileChange(null); }} className="ml-auto p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Upload size={20} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Drop file here or <span className="text-violet-600 dark:text-violet-400 font-medium">browse</span>
                  </p>
                  <p className="text-[10px] text-slate-300 dark:text-slate-600">PNG, JPG, PDF up to 5MB</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className={lbl}>Notes <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional details…" className={inp + " resize-none"} />
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-white/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex justify-end gap-2.5">
          <button type="button" onClick={handleClose} className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button type="submit" form="log-expense-form" disabled={loading} className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 border border-rose-700 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm">
            {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Log Expense
          </button>
        </div>
      </div>
    </div>
  );
}
