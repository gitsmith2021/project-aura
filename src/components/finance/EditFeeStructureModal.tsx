"use client";

import { useEffect, useState } from "react";
import { X, IndianRupee, BookOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { updateFeeStructure } from "@/actions/feeStructures";
import type { FeeStructure, FeeType } from "@/types/finance";

type Department = { id: string; name: string };

type Props = {
  isOpen: boolean;
  institutionId: string;
  feeStructure: FeeStructure | null;
  onClose: () => void;
  onSuccess: () => void;
};

const FEE_TYPES: { value: FeeType; label: string }[] = [
  { value: "tuition",  label: "Tuition" },
  { value: "hostel",   label: "Hostel" },
  { value: "exam",     label: "Exam" },
  { value: "library",  label: "Library" },
  { value: "lab",      label: "Lab" },
  { value: "other",    label: "Other" },
];

const ACADEMIC_YEARS = ["2024-25", "2025-26", "2026-27", "2027-28"];

export function EditFeeStructureModal({ isOpen, institutionId, feeStructure, onClose, onSuccess }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  // Form state — initialised from feeStructure prop
  const [name, setName]               = useState("");
  const [feeType, setFeeType]         = useState<FeeType>("tuition");
  const [amount, setAmount]           = useState("");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [scope, setScope]             = useState<"institution" | "department">("institution");
  const [departmentId, setDepartmentId] = useState("");
  const [isActive, setIsActive]       = useState(true);

  // Populate form when feeStructure changes
  useEffect(() => {
    if (!feeStructure) return;
    setName(feeStructure.name);
    setFeeType(feeStructure.fee_type);
    setAmount(String(feeStructure.amount));
    setAcademicYear(feeStructure.academic_year);
    setScope(feeStructure.department_id ? "department" : "institution");
    setDepartmentId(feeStructure.department_id ?? "");
    setIsActive(feeStructure.is_active);
    setError("");
  }, [feeStructure]);

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

  function handleClose() { setError(""); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feeStructure) return;
    setError("");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    setLoading(true);
    const result = await updateFeeStructure(feeStructure.id, institutionId, {
      name:          name.trim(),
      fee_type:      feeType,
      amount:        parsedAmount,
      academic_year: academicYear,
      department_id: scope === "department" ? (departmentId || null) : null,
      is_active:     isActive,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setError("");
    onSuccess();
    onClose();
  }

  const inputCls = "w-full px-3 py-2 bg-white/60 border border-white/30 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors placeholder:text-slate-400 dark:bg-slate-800/60 dark:border-slate-700/50 dark:text-slate-200 dark:placeholder:text-slate-500";
  const labelCls = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className={`relative w-full max-w-md h-full flex flex-col border-l border-white/20 shadow-2xl transform transition-transform duration-300 ease-out bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 border border-violet-200/60 dark:border-violet-700/40 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Edit Fee Structure</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {feeStructure?.name ?? "—"}
              </p>
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
        <form
          id="edit-fee-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {/* Error banner */}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Fee Name */}
          <div>
            <label className={labelCls}>Fee Name <span className="text-violet-500 normal-case font-normal">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Tuition Fee — Semester 1"
              required
              className={inputCls}
            />
          </div>

          {/* Fee Type */}
          <div>
            <label className={labelCls}>Fee Type <span className="text-violet-500 normal-case font-normal">*</span></label>
            <select
              value={feeType}
              onChange={e => setFeeType(e.target.value as FeeType)}
              required
              className={inputCls + " appearance-none cursor-pointer"}
            >
              {FEE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className={labelCls}>Amount (₹) <span className="text-violet-500 normal-case font-normal">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">₹</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className={inputCls + " pl-7"}
              />
            </div>
          </div>

          {/* Academic Year */}
          <div>
            <label className={labelCls}>Academic Year <span className="text-violet-500 normal-case font-normal">*</span></label>
            <select
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              required
              className={inputCls + " appearance-none cursor-pointer"}
            >
              {ACADEMIC_YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Scope */}
          <div>
            <label className={labelCls}>Scope</label>
            <div className="flex gap-3">
              {(["institution", "department"] as const).map(s => (
                <label
                  key={s}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all flex-1 justify-center ${
                    scope === s
                      ? "border-violet-400 bg-violet-50/80 text-violet-700 dark:bg-violet-900/30 dark:border-violet-600 dark:text-violet-300"
                      : "border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="edit-scope"
                    value={s}
                    checked={scope === s}
                    onChange={() => { setScope(s); if (s === "institution") setDepartmentId(""); }}
                    className="sr-only"
                  />
                  {s === "institution" ? "Institution-wide" : "Department-specific"}
                </label>
              ))}
            </div>
          </div>

          {/* Department (conditional) */}
          {scope === "department" && (
            <div>
              <label className={labelCls}>Department <span className="text-violet-500 normal-case font-normal">*</span></label>
              {departments.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-400">
                  <BookOpen size={13} />
                  No departments found for this institution.
                </div>
              ) : (
                <select
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  required
                  className={inputCls + " appearance-none cursor-pointer"}
                >
                  <option value="" disabled>Select department…</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Status toggle */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <label className={labelCls}>Status</label>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40">
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isActive ? "Active" : "Inactive"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isActive ? "This fee structure is available for payments." : "Hidden from fee selection."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(v => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-1"}`}
                />
              </button>
            </div>
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
            form="edit-fee-form"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 border border-violet-700 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
          >
            {loading && (
              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
