"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Award } from "lucide-react";
import { createScheme, updateScheme } from "@/actions/scholarships";
import { SCHEME_TYPES, SCHEME_TYPE_LABELS, type ScholarshipScheme, type SchemeType } from "@/lib/scholarships";

const CATEGORY_OPTIONS = ["SC", "ST", "OBC", "EWS", "Minority", "General"];

export function SchemeDrawer({
  open, mode, institutionId, scheme, onClose,
}: {
  open: boolean; mode: "add" | "edit"; institutionId: string; scheme?: ScholarshipScheme | null; onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [schemeType, setSchemeType] = useState<SchemeType>("government_central");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [renewable, setRenewable] = useState(true);
  const [deadline, setDeadline] = useState("");
  const [minMarks, setMinMarks] = useState("");
  const [incomeLimit, setIncomeLimit] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && scheme) {
      setName(scheme.name);
      setSchemeType(scheme.scheme_type);
      setDescription(scheme.description ?? "");
      setAmount(scheme.amount_per_student?.toString() ?? "");
      setRenewable(scheme.renewable);
      setDeadline(scheme.application_deadline ?? "");
      setMinMarks(scheme.eligibility_criteria?.min_marks?.toString() ?? "");
      setIncomeLimit(scheme.eligibility_criteria?.income_limit?.toString() ?? "");
      setCategories(scheme.eligibility_criteria?.categories ?? []);
    } else {
      setName(""); setSchemeType("government_central"); setDescription(""); setAmount("");
      setRenewable(true); setDeadline(""); setMinMarks(""); setIncomeLimit(""); setCategories([]);
    }
  }, [open, mode, scheme]);

  if (!open) return null;

  function toggleCat(c: string) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function save() {
    if (!name.trim()) { setError("Scheme name is required."); return; }
    setBusy(true); setError(null);
    const eligibility = {
      min_marks: minMarks ? Number(minMarks) : null,
      categories,
      income_limit: incomeLimit ? Number(incomeLimit) : null,
    };
    const common = {
      name, schemeType, description: description || null,
      amountPerStudent: amount ? Number(amount) : null,
      renewable, applicationDeadline: deadline || null, eligibility,
    };
    const res = mode === "edit" && scheme
      ? await updateScheme({ institutionId, id: scheme.id, ...common })
      : await createScheme({ institutionId, ...common });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    router.refresh();
    onClose();
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2"><Award size={18} className="text-purple-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{mode === "edit" ? "Edit Scheme" : "New Scholarship Scheme"}</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
          <div><label className={labelCls}>Scheme Name <span className="text-rose-500">*</span></label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Post-Matric SC Scholarship" /></div>
          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={schemeType} onChange={(e) => setSchemeType(e.target.value as SchemeType)}>
              {SCHEME_TYPES.map((t) => <option key={t} value={t}>{SCHEME_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Description</label><textarea className={`${inputCls} min-h-[70px]`} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Amount / student (₹)</label><input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25000" /></div>
            <div><label className={labelCls}>Deadline</label><input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={renewable} onChange={(e) => setRenewable(e.target.checked)} className="accent-purple-600" /> Renewable each year
          </label>

          <div className="pt-1 border-t border-slate-100 dark:border-slate-800" />
          <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Eligibility</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Min marks (%)</label><input type="number" className={inputCls} value={minMarks} onChange={(e) => setMinMarks(e.target.value)} placeholder="e.g. 60" /></div>
            <div><label className={labelCls}>Income limit (₹/yr)</label><input type="number" className={inputCls} value={incomeLimit} onChange={(e) => setIncomeLimit(e.target.value)} placeholder="e.g. 250000" /></div>
          </div>
          <div>
            <label className={labelCls}>Eligible categories <span className="text-slate-400 font-normal">(none = all)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((c) => (
                <button type="button" key={c} onClick={() => toggleCat(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border ${categories.includes(c) ? "bg-purple-600 text-white border-purple-600" : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">{busy ? "Saving…" : mode === "edit" ? "Save" : "Create Scheme"}</button>
        </div>
      </div>
    </div>
  );
}
