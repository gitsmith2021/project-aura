"use client";

import { useState } from "react";
import { Check, Loader2, Info } from "lucide-react";
import { upsertTaxDeclaration } from "@/actions/statutoryPayroll";
import type { StaffTaxDeclaration } from "@/types/finance";

type TaxRegime = "new" | "old";

type Props = {
  staffId:             string;
  institutionId:       string;
  currentDeclaration:  StaffTaxDeclaration | null;
};

const inp = "w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs transition-colors";
const lbl = "block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1";

export function TaxDeclarationForm({ staffId, institutionId, currentDeclaration }: Props) {
  const inv = (currentDeclaration?.declared_investments ?? {}) as Record<string, number | undefined>;

  const [regime,  setRegime]  = useState<TaxRegime>((currentDeclaration?.tax_regime as TaxRegime) ?? "new");
  const [c80c,    setC80c]    = useState(String(inv.section_80c ?? ""));
  const [c80d,    setC80d]    = useState(String(inv.section_80d ?? ""));
  const [hra,     setHra]     = useState(String(inv.hra_exempt  ?? ""));
  const [lta,     setLta]     = useState(String(inv.lta_exempt  ?? ""));

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const totalOld = (parseFloat(c80c) || 0) + (parseFloat(c80d) || 0) + (parseFloat(hra) || 0) + (parseFloat(lta) || 0);

  const handleSave = async () => {
    setSaving(true); setError(null);
    const res = await upsertTaxDeclaration({
      staffId,
      institutionId,
      taxRegime: regime,
      declared: {
        section_80c: parseFloat(c80c) || 0,
        section_80d: parseFloat(c80d) || 0,
        hra_exempt:  parseFloat(hra)  || 0,
        lta_exempt:  parseFloat(lta)  || 0,
      },
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm p-5 space-y-5">
      <div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Income Tax Regime</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">Your choice determines how TDS is computed each month. You can change this once per financial year.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["new", "old"] as TaxRegime[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRegime(r)}
              className={`px-4 py-3 rounded-xl border-2 text-left transition-all ${regime === r
                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
            >
              <p className={`text-xs font-bold ${regime === r ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-200"}`}>
                {r === "new" ? "New Regime" : "Old Regime"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {r === "new"
                  ? "Lower rates · No deductions · Standard ₹75,000 · 87A rebate ≤ ₹7L"
                  : "Higher rates · 80C/80D/HRA/LTA · Standard ₹50,000 · 87A rebate ≤ ₹5L"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Investment declarations — only relevant for old regime */}
      <div className={regime === "old" ? "" : "opacity-50 pointer-events-none"}>
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Investment Declarations</p>
          {regime === "new" && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500">(not applicable under new regime)</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Section 80C (max ₹1,50,000)</label>
            <input
              type="number" step="1000" min="0" max="150000"
              placeholder="0"
              value={c80c} onChange={e => setC80c(e.target.value)}
              className={inp}
            />
            <p className="text-[9px] text-slate-400 mt-1">EPF, PPF, ELSS, LIC, NSC, tuition fees…</p>
          </div>
          <div>
            <label className={lbl}>Section 80D — Medical Insurance (max ₹25,000)</label>
            <input
              type="number" step="1000" min="0" max="25000"
              placeholder="0"
              value={c80d} onChange={e => setC80d(e.target.value)}
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>HRA Exemption</label>
            <input
              type="number" step="1000" min="0"
              placeholder="0"
              value={hra} onChange={e => setHra(e.target.value)}
              className={inp}
            />
            <p className="text-[9px] text-slate-400 mt-1">Actual rent paid minus 10% of basic, subject to limits.</p>
          </div>
          <div>
            <label className={lbl}>LTA Exemption</label>
            <input
              type="number" step="1000" min="0"
              placeholder="0"
              value={lta} onChange={e => setLta(e.target.value)}
              className={inp}
            />
          </div>
        </div>
        {regime === "old" && totalOld > 0 && (
          <div className="mt-3 flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg">
            <Info size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Total declared deductions: <span className="font-bold">₹{totalOld.toLocaleString("en-IN")}</span>
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : null}
          {saved ? "Declaration saved" : "Save declaration"}
        </button>
      </div>
    </div>
  );
}
