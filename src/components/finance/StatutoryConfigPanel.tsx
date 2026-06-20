"use client";

import { useState } from "react";
import { Settings, Loader2, Check } from "lucide-react";
import { saveStatutoryConfig } from "@/actions/statutoryPayroll";
import type { StatutoryPayrollConfig } from "@/types/finance";

type Props = {
  institutionId: string;
  config: StatutoryPayrollConfig | null;
};

const inp = "w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs transition-colors";
const lbl = "block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1";

export function StatutoryConfigPanel({ institutionId, config }: Props) {
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const [pfEmp,    setPfEmp]    = useState(String(config?.pf_employee_pct  ?? 12));
  const [pfEr,     setPfEr]     = useState(String(config?.pf_employer_pct  ?? 12));
  const [epfCeil,  setEpfCeil]  = useState(String(config?.epf_wage_ceiling ?? 15000));
  const [esiEmp,   setEsiEmp]   = useState(String(config?.esi_employee_pct ?? 0.75));
  const [esiEr,    setEsiEr]    = useState(String(config?.esi_employer_pct ?? 3.25));
  const [esiCeil,  setEsiCeil]  = useState(String(config?.esi_wage_ceiling ?? 21000));
  const [tan,      setTan]      = useState(config?.tan_number ?? "");
  const [pfNum,    setPfNum]    = useState(config?.pf_number  ?? "");
  const [esiNum,   setEsiNum]   = useState(config?.esi_number ?? "");

  const handleSave = async () => {
    setSaving(true); setError(null);
    const res = await saveStatutoryConfig({
      institutionId,
      pf_employer_pct:  parseFloat(pfEr)    || 12,
      pf_employee_pct:  parseFloat(pfEmp)   || 12,
      epf_wage_ceiling: parseFloat(epfCeil) || 15000,
      esi_employer_pct: parseFloat(esiEr)   || 3.25,
      esi_employee_pct: parseFloat(esiEmp)  || 0.75,
      esi_wage_ceiling: parseFloat(esiCeil) || 21000,
      tan_number: tan || null,
      pf_number:  pfNum || null,
      esi_number: esiNum || null,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-violet-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Statutory Configuration</span>
          {config && (
            <span className="text-[10px] text-slate-400">
              PF {config.pf_employee_pct}% · ESI {config.esi_employee_pct}% · TAN: {config.tan_number ?? "—"}
            </span>
          )}
        </div>
        <span className="text-[10px] text-violet-500">{open ? "Collapse" : "Edit"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-700/40 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* PF */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Provident Fund (EPF)</p>
              <div>
                <label className={lbl}>Employee % (default 12)</label>
                <input type="number" step="0.01" min="0" max="100" value={pfEmp} onChange={e => setPfEmp(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Employer % (default 12)</label>
                <input type="number" step="0.01" min="0" max="100" value={pfEr} onChange={e => setPfEr(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>EPF Wage Ceiling ₹ (default 15,000)</label>
                <input type="number" step="1" min="0" value={epfCeil} onChange={e => setEpfCeil(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>PF Registration Number</label>
                <input type="text" value={pfNum} onChange={e => setPfNum(e.target.value)} placeholder="MH/BOM/..." className={inp} />
              </div>
            </div>

            {/* ESI */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Employee State Insurance (ESI)</p>
              <div>
                <label className={lbl}>Employee % (default 0.75)</label>
                <input type="number" step="0.01" min="0" max="100" value={esiEmp} onChange={e => setEsiEmp(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Employer % (default 3.25)</label>
                <input type="number" step="0.01" min="0" max="100" value={esiEr} onChange={e => setEsiEr(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Gross Wage Ceiling ₹ (default 21,000)</label>
                <input type="number" step="1" min="0" value={esiCeil} onChange={e => setEsiCeil(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>ESI Code Number</label>
                <input type="text" value={esiNum} onChange={e => setEsiNum(e.target.value)} placeholder="41000..." className={inp} />
              </div>
            </div>

            {/* TDS */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">TDS (Section 192)</p>
              <div>
                <label className={lbl}>TAN Number</label>
                <input type="text" value={tan} onChange={e => setTan(e.target.value)} placeholder="MUMX12345A" className={inp} />
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2">
                <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-snug">
                  TDS is computed automatically from each staff member&#39;s declared tax regime (old/new) and 80C/80D investments. Staff submit declarations from their portal.
                </p>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Settings size={12} />}
              {saved ? "Saved" : "Save config"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
