"use client";

import { useEffect, useState } from "react";
import { X, IndianRupee, TrendingUp, TrendingDown } from "lucide-react";
import { createSalaryStructure, updateSalaryStructure } from "@/actions/salary";
import type { SalaryStructure } from "@/types/finance";

// ── Types ─────────────────────────────────────────────────────────────────────

type StaffInfo = {
  id:          string;
  full_name:   string;
  title:       string | null;
  designation: string | null;
};

type Props = {
  isOpen:        boolean;
  institutionId: string;
  mode:          "create" | "edit";
  staff:         StaffInfo | null;
  existing:      SalaryStructure | null;
  onClose:       () => void;
  onSuccess:     () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: string) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SalaryStructureDrawer({
  isOpen, institutionId, mode, staff, existing, onClose, onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Earnings
  const [basicSalary,     setBasicSalary]     = useState("");
  const [hra,             setHra]             = useState("");
  const [ta,              setTa]              = useState("");
  const [da,              setDa]              = useState("");
  const [otherAllowances, setOtherAllowances] = useState("");
  // Deductions
  const [pf,              setPf]              = useState("");
  const [esi,             setEsi]             = useState("");
  const [tds,             setTds]             = useState("");
  const [otherDeductions, setOtherDeductions] = useState("");
  // Meta
  const [effectiveFrom, setEffectiveFrom]     = useState(new Date().toISOString().split("T")[0]);

  // Populate when editing
  useEffect(() => {
    if (mode === "edit" && existing) {
      setBasicSalary(String(existing.basic_salary));
      setHra(String(existing.hra));
      setTa(String(existing.ta));
      setDa(String(existing.da));
      setOtherAllowances(String(existing.other_allowances));
      setPf(String(existing.pf_deduction));
      setEsi(String(existing.esi_deduction));
      setTds(String(existing.tds_deduction));
      setOtherDeductions(String(existing.other_deductions));
      setEffectiveFrom(existing.effective_from.split("T")[0]);
      setError("");
    }
  }, [mode, existing]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  // Live calculations
  const gross = num(basicSalary) + num(hra) + num(ta) + num(da) + num(otherAllowances);
  const totalDeductions = num(pf) + num(esi) + num(tds) + num(otherDeductions);
  const net = gross - totalDeductions;

  function reset() {
    setBasicSalary(""); setHra(""); setTa(""); setDa(""); setOtherAllowances("");
    setPf(""); setEsi(""); setTds(""); setOtherDeductions("");
    setEffectiveFrom(new Date().toISOString().split("T")[0]);
    setError("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      basic_salary:     num(basicSalary),
      hra:              num(hra),
      ta:               num(ta),
      da:               num(da),
      other_allowances: num(otherAllowances),
      pf_deduction:     num(pf),
      esi_deduction:    num(esi),
      tds_deduction:    num(tds),
      other_deductions: num(otherDeductions),
      effective_from:   effectiveFrom,
    };

    setLoading(true);

    let result;
    if (mode === "create" && staff) {
      result = await createSalaryStructure({ ...payload, institution_id: institutionId, staff_id: staff.id });
    } else if (mode === "edit" && existing) {
      result = await updateSalaryStructure(existing.id, institutionId, payload);
    } else {
      setLoading(false);
      setError("Invalid state.");
      return;
    }

    setLoading(false);

    if (!result.success) { setError(result.error); return; }
    reset(); onSuccess(); onClose();
  }

  // Shared classes
  const inp = "w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-white/30 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors";
  const lbl = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";
  const ro  = "w-full px-3 py-2 bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300";

  const staffName = mode === "edit"
    ? (existing?.staff?.full_name ?? "Staff Member")
    : (staff?.full_name ?? "Staff Member");

  const staffTitle = mode === "edit"
    ? (existing?.staff?.title ?? null)
    : (staff?.title ?? null);

  const staffDesig = mode === "edit"
    ? (existing?.staff?.designation ?? null)
    : (staff?.designation ?? null);

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
              <IndianRupee className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {mode === "create" ? "Setup Salary Structure" : "Edit Salary Structure"}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                {staffTitle ? `${staffTitle} ` : ""}{staffName}
                {staffDesig ? ` · ${staffDesig}` : ""}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form id="salary-structure-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Earnings ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={13} className="text-emerald-500" />
              <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Earnings</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Basic Salary (₹) <span className="text-violet-500 normal-case font-normal">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                  <input type="number" min="0" step="0.01" value={basicSalary} onChange={e => setBasicSalary(e.target.value)} placeholder="0.00" required className={inp + " pl-7"} />
                </div>
              </div>
              {[
                { label: "HRA — House Rent Allowance",  val: hra,             set: setHra },
                { label: "TA — Travel Allowance",       val: ta,              set: setTa },
                { label: "DA — Dearness Allowance",     val: da,              set: setDa },
                { label: "Other Allowances",            val: otherAllowances, set: setOtherAllowances },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className={lbl}>{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                    <input type="number" min="0" step="0.01" value={val} onChange={e => set(e.target.value)} placeholder="0.00" className={inp + " pl-7"} />
                  </div>
                </div>
              ))}
              <div>
                <label className={lbl}>Gross Salary <span className="text-slate-400 normal-case font-normal">(auto-calculated)</span></label>
                <input readOnly value={fmtINR(gross)} className={ro + " text-emerald-700 dark:text-emerald-400"} />
              </div>
            </div>
          </section>

          <div className="border-t border-slate-200/60 dark:border-slate-700/60" />

          {/* ── Deductions ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={13} className="text-rose-500" />
              <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Deductions</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "PF — Provident Fund",          val: pf,              set: setPf },
                { label: "ESI — Employee State Insurance", val: esi,            set: setEsi },
                { label: "TDS — Tax Deducted at Source",  val: tds,             set: setTds },
                { label: "Other Deductions",              val: otherDeductions, set: setOtherDeductions },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className={lbl}>{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                    <input type="number" min="0" step="0.01" value={val} onChange={e => set(e.target.value)} placeholder="0.00" className={inp + " pl-7"} />
                  </div>
                </div>
              ))}
              <div>
                <label className={lbl}>Total Deductions <span className="text-slate-400 normal-case font-normal">(auto-calculated)</span></label>
                <input readOnly value={fmtINR(totalDeductions)} className={ro + " text-rose-600 dark:text-rose-400"} />
              </div>
            </div>
          </section>

          <div className="border-t border-slate-200/60 dark:border-slate-700/60" />

          {/* ── Net Salary summary ── */}
          <div className="px-4 py-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40">
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Net Salary / Month</p>
            <p className={`text-2xl font-black leading-none ${net >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {fmtINR(net)}
            </p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500 mt-1">Gross {fmtINR(gross)} − Deductions {fmtINR(totalDeductions)}</p>
          </div>

          {/* ── Effective From ── */}
          <div>
            <label className={lbl}>Effective From <span className="text-violet-500 normal-case font-normal">*</span></label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={e => setEffectiveFrom(e.target.value)}
              required
              className={inp}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-white/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex justify-end gap-2.5">
          <button type="button" onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button type="submit" form="salary-structure-form" disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 border border-violet-700 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm">
            {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {mode === "create" ? "Setup Salary" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
