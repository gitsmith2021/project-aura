"use client";

import { useEffect, useState, use, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PromotionPreviewTable } from "@/components/promotion/PromotionPreviewTable";
import { createClient } from "@/utils/supabase/client";
import {
  previewPromotion, runPromotion, rollbackPromotion, getPromotionLogs,
  StudentPromotionRow, PromotionLog,
} from "@/actions/yearPromotion";
import { BadgeCheck, AlertTriangle, RotateCcw, CheckCircle2, ChevronRight, History } from "lucide-react";

type AcademicYear = { id: string; label: string };

export default function PromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [instName,     setInstName]     = useState("");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [ayId,         setAyId]         = useState("");

  const [preview,      setPreview]      = useState<StudentPromotionRow[] | null>(null);
  const [loadingPrev,  setLoadingPrev]  = useState(false);

  const [logs,         setLogs]         = useState<PromotionLog[]>([]);
  const [loadingLogs,  setLoadingLogs]  = useState(false);

  // Run state
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [running,      setRunning]      = useState(false);
  const [runResult,    setRunResult]    = useState<{ promoted: number; held: number; graduated: number } | null>(null);
  const [runError,     setRunError]     = useState("");

  // Rollback state
  const [rollingBack,  setRollingBack]  = useState<string | null>(null);

  const [activeView,   setActiveView]   = useState<"preview" | "history">("preview");

  // ── Load meta ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("institutions").select("name").eq("id", institutionId).single(),
      supabase.from("academic_years").select("id, label").eq("institution_id", institutionId).order("label", { ascending: false }),
    ]).then(([inst, years]) => {
      if (inst.data)  setInstName(inst.data.name);
      if (years.data) { setAcademicYears(years.data); if (years.data[0]) setAyId(years.data[0].id); }
    });
  }, [institutionId]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    const res = await getPromotionLogs(institutionId);
    if (res.success) setLogs(res.data);
    setLoadingLogs(false);
  }, [institutionId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Preview ────────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    setLoadingPrev(true);
    setRunResult(null);
    setRunError("");
    const res = await previewPromotion(institutionId);
    setPreview(res.success ? res.data : null);
    setLoadingPrev(false);
    setActiveView("preview");
  };

  // ── Run ────────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    setConfirmOpen(false);
    setRunning(true);
    setRunError("");
    const ayLabel = academicYears.find(a => a.id === ayId)?.label ?? "General";
    const res = await runPromotion(institutionId, ayId || null, ayLabel);
    setRunning(false);
    if (res.success) {
      setRunResult({ promoted: res.promoted, held: res.held, graduated: res.graduated });
      setPreview(null);
      fetchLogs();
    } else {
      setRunError(res.error ?? "Promotion failed.");
    }
  };

  // ── Rollback ───────────────────────────────────────────────────────────────
  const handleRollback = async (logId: string) => {
    if (!confirm("Roll back this promotion? Student years will be restored to their pre-run values.")) return;
    setRollingBack(logId);
    const res = await rollbackPromotion(logId, institutionId);
    setRollingBack(null);
    if (res.success) fetchLogs();
    else alert(res.error ?? "Rollback failed.");
  };

  const canRollback = (log: PromotionLog) =>
    !log.rolled_back_at && new Date(log.can_rollback_until) > new Date();

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const breadcrumb = (
    <>
      <span className="text-slate-400">Institutions</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-400">{instName}</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Year Promotion</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/50 flex items-center justify-center shrink-0">
              <BadgeCheck size={19} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">Year Promotion</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Promote eligible students and flag arrear hold-backs</p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            <button
              onClick={() => setActiveView("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeView === "preview" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <BadgeCheck size={13} /> Run
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeView === "history" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <History size={13} /> History {logs.length > 0 && <span className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-bold">{logs.length}</span>}
            </button>
          </div>
        </div>

        {/* ── RUN VIEW ── */}
        {activeView === "preview" && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Promotion Context</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label>
                  <select
                    value={ayId}
                    onChange={e => setAyId(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 dark:text-slate-200"
                  >
                    <option value="">General / No Year</option>
                    {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
                  </select>
                </div>

                <button
                  onClick={handlePreview}
                  disabled={loadingPrev}
                  className="flex items-center gap-2 px-4 py-2 border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 text-violet-700 dark:text-violet-400 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {loadingPrev && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-violet-600" />}
                  Preview Students <ChevronRight size={13} />
                </button>

                {preview && (
                  <button
                    onClick={() => setConfirmOpen(true)}
                    disabled={running || preview.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-sm transition-colors ml-auto"
                  >
                    {running
                      ? <><span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> Running…</>
                      : <><BadgeCheck size={14} /> Run Promotion</>
                    }
                  </button>
                )}
              </div>

              {/* Warning banner */}
              <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Always preview before running. Promotions are reversible within <strong>24 hours</strong> via the History tab.
                </p>
              </div>
            </div>

            {/* Error */}
            {runError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl text-sm text-rose-600 dark:text-rose-400">
                <AlertTriangle size={14} className="shrink-0" />
                {runError}
              </div>
            )}

            {/* Run result */}
            {runResult && (
              <div className="flex items-center gap-4 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <div className="text-sm">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">Promotion complete.</span>
                  <span className="text-emerald-600 dark:text-emerald-500 ml-2">
                    {runResult.promoted} promoted · {runResult.graduated} graduated · {runResult.held} held
                  </span>
                </div>
              </div>
            )}

            {/* Preview table */}
            {loadingPrev && (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
              </div>
            )}
            {preview && !loadingPrev && (
              <PromotionPreviewTable rows={preview} institutionId={institutionId} />
            )}
            {!preview && !loadingPrev && !runResult && (
              <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white/50 dark:bg-slate-800/30">
                <BadgeCheck size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-500">Click "Preview Students" to see the promotion plan</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Students with no arrears will be promoted. Students with active arrears will be held.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY VIEW ── */}
        {activeView === "history" && (
          <div className="space-y-3">
            {loadingLogs ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white/50 dark:bg-slate-800/30">
                <History size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-500">No promotions run yet</p>
              </div>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={`bg-white/90 dark:bg-slate-800/80 border rounded-2xl overflow-hidden shadow-sm ${log.rolled_back_at ? "border-slate-200 dark:border-slate-700 opacity-60" : "border-slate-200 dark:border-slate-700"}`}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/60">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {log.academic_year_label ?? "General Promotion"}
                        </span>
                        {log.rolled_back_at && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-[10px] font-bold rounded-full border border-rose-200 dark:border-rose-800/40">
                            Rolled back
                          </span>
                        )}
                        {!log.rolled_back_at && canRollback(log) && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800/40">
                            Undoable until {formatDate(log.can_rollback_until)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(log.run_at)}</p>
                    </div>

                    {canRollback(log) && !log.rolled_back_at && (
                      <button
                        onClick={() => handleRollback(log.id)}
                        disabled={rollingBack === log.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {rollingBack === log.id
                          ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-rose-500" />
                          : <RotateCcw size={12} />
                        }
                        Rollback
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-6 px-4 py-3">
                    <div className="text-center">
                      <div className="text-lg font-black text-emerald-600">{log.total_promoted}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Promoted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-black text-violet-600">{log.total_graduated}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Graduated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-black text-amber-600">{log.total_held}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Held</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirmOpen && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 border border-violet-200 flex items-center justify-center">
                <BadgeCheck size={19} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Confirm Promotion</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This will update student records</p>
              </div>
            </div>

            <div className="space-y-2 mb-5 text-sm text-slate-700 dark:text-slate-300">
              <p><span className="font-bold text-emerald-600">{preview.filter(r => r.action === "promote").length}</span> students will be promoted to the next year.</p>
              <p><span className="font-bold text-violet-600">{preview.filter(r => r.action === "graduate").length}</span> students will be marked as graduated.</p>
              <p><span className="font-bold text-amber-600">{preview.filter(r => r.action === "hold").length}</span> students will be held due to arrears.</p>
              <p className="text-xs text-slate-400 pt-1">This can be undone within 24 hours from the History tab.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRun}
                className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
              >
                Run Promotion
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
