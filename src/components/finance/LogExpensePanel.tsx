"use client";

import { useEffect, useState } from "react";
import { X, Receipt } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Department = { id: string; name: string };

type Props = {
  isOpen: boolean;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
};

const CATEGORIES = [
  { value: "utilities",       label: "Utilities" },
  { value: "maintenance",     label: "Maintenance" },
  { value: "vendor",          label: "Vendor" },
  { value: "events",          label: "Events" },
  { value: "stationery",      label: "Stationery" },
  { value: "infrastructure",  label: "Infrastructure" },
  { value: "it",              label: "IT" },
  { value: "other",           label: "Other" },
];

const PAYMENT_MODES = [
  { value: "cash",            label: "Cash" },
  { value: "upi",             label: "UPI" },
  { value: "bank_transfer",   label: "Bank Transfer" },
  { value: "cheque",          label: "Cheque" },
  { value: "card",            label: "Card" },
];

export function LogExpensePanel({ isOpen, tenantId, onClose, onSuccess }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  const [departmentId, setDepartmentId] = useState("");
  const [category, setCategory] = useState("utilities");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [vendorName, setVendorName] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen || !tenantId) return;
    document.body.style.overflow = "hidden";

    const supabase = createClient();
    supabase
      .from("departments")
      .select("id, name")
      .eq("institution_id", tenantId)
      .order("name")
      .then(({ data }) => { if (data) setDepartments(data); });

    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, tenantId]);

  function reset() {
    setDepartmentId(""); setCategory("utilities"); setDescription("");
    setAmount(""); setPaymentMode("cash"); setVendorName("");
    setExpenseDate(new Date().toISOString().slice(0, 10)); setNotes("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description || !amount || !expenseDate) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("expenses").insert([{
      institution_id: tenantId,
      department_id:  departmentId || null,
      category,
      description:    description.trim(),
      amount:         parseFloat(amount),
      payment_mode:   paymentMode,
      vendor_name:    vendorName.trim() || null,
      expense_date:   expenseDate,
      notes:          notes.trim() || null,
    }]);

    setLoading(false);

    if (error) {
      alert("Failed to log expense: " + error.message);
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
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Log Expense</h2>
              <p className="text-[11px] text-slate-400">Record an institutional expense</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form id="log-expense-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 bg-slate-50">

          <div>
            <label className={labelCls}>Department <span className="text-slate-400">(optional)</span></label>
            <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className={inputCls + " appearance-none"}>
              <option value="">All / Institution-wide</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Category <span className="text-rose-500">*</span></label>
            <select value={category} onChange={e => setCategory(e.target.value)} required className={inputCls + " appearance-none"}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Description <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Electricity bill – April"
              required
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (₹) <span className="text-rose-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Expense Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
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
            <label className={labelCls}>Vendor Name <span className="text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={vendorName}
              onChange={e => setVendorName(e.target.value)}
              placeholder="e.g. TNEB, Sri Supplies"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-slate-400">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional details…"
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
            form="log-expense-form"
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-500 border border-rose-600 rounded-md hover:bg-rose-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Log Expense
          </button>
        </div>
      </div>
    </div>
  );
}
