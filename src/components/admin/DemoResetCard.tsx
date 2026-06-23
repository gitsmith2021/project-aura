"use client";

import { useState } from "react";
import { AlertTriangle, RotateCcw, X, Loader2, CheckCircle2, Database } from "lucide-react";
import { resetDemoInstitution } from "@/actions/demoAdmin";

// Phase 9B — SUPER_ADMIN-only "Reset Demo Tenant" control for /admin. Destructive,
// so it requires a right-sliding confirm drawer + type-to-confirm before it runs.
const CONFIRM_PHRASE = "aura-demo";

export function DemoResetCard() {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const flash = (ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 5000); };

  const run = async () => {
    if (phrase.trim() !== CONFIRM_PHRASE || busy) return;
    setBusy(true);
    const res = await resetDemoInstitution();
    setBusy(false);
    if (res.success) { setOpen(false); setPhrase(""); flash(true, "Demo tenant data cleared. Run `npm run reset:demo` to restore the full showcase."); }
    else flash(false, res.error);
  };

  return (
    <>
      <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/15 text-rose-600"><Database size={18} /></div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Reset Demo Tenant</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                Wipes the <span className="font-semibold">Aura Demo College</span> (<code>aura-demo</code>) tenant&apos;s data. Production and real
                institutions are never touched. Restore the full showcase with <code>npm run reset:demo</code>.
              </p>
            </div>
          </div>
          <button onClick={() => { setPhrase(""); setOpen(true); }} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-700 transition-colors">
            <RotateCcw size={15} /> Reset Demo
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={() => !busy && setOpen(false)}>
          <div className="h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 text-rose-600"><AlertTriangle size={18} /><h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Reset the demo tenant?</h2></div>
              <button onClick={() => !busy && setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-[13px] text-rose-700 dark:text-rose-300">
                This permanently deletes all data in the <strong>aura-demo</strong> tenant (students, finance, placements, Knowledge Hub, etc.).
                It is scoped to the demo tenant only and cannot affect production or real institutions.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Type <code className="text-rose-600 font-bold">{CONFIRM_PHRASE}</code> to confirm</label>
                <input autoFocus value={phrase} onChange={(e) => setPhrase(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }} placeholder={CONFIRM_PHRASE}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500" />
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center justify-end gap-2">
              <button onClick={() => !busy && setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={run} disabled={phrase.trim() !== CONFIRM_PHRASE || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-40">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} {busy ? "Resetting…" : "Reset Demo Tenant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg max-w-sm ${toast.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
          {toast.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
