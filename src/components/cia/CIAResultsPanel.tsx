"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calculator, CheckCircle2, Loader2, AlertTriangle, X, Send,
  Scale, Sigma, ShieldAlert,
} from "lucide-react";
import {
  computeCIAResults, publishCIAResults, getCIAResults,
  type CIAResultRow, type CIAResultScope,
} from "@/actions/cia";
import { CIA_AT_RISK_THRESHOLD } from "@/lib/ciaEngine";

/**
 * Phase 4A — CIA results tab: compute (weighted engine) → review draft →
 * publish to students. Publishing is confirmed through a right-slide drawer.
 */
export function CIAResultsPanel({ institutionId, departmentId, semester, academicYearId }: {
  institutionId: string;
  departmentId: string;
  semester: number;
  academicYearId?: string;
}) {
  const [rows, setRows] = useState<CIAResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mixedWeightage, setMixedWeightage] = useState(false);

  const scope: CIAResultScope = { institutionId, departmentId, semester, academicYearId };
  const scopeKey = `${departmentId}::${semester}::${academicYearId ?? ""}`;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getCIAResults({ institutionId, departmentId, semester, academicYearId });
    if (res.success) setRows(res.data);
    else setError(res.error);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, scopeKey]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCompute = async () => {
    setComputing(true);
    setError(null);
    setNotice(null);
    const res = await computeCIAResults(scope);
    if (res.success) {
      setMixedWeightage(res.data.mixed_weightage);
      setNotice(
        `Computed ${res.data.savedCount} draft result${res.data.savedCount === 1 ? "" : "s"} in ${res.data.mode} mode.`
      );
      await refresh();
    } else {
      setError(res.error);
    }
    setComputing(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    const res = await publishCIAResults(scope);
    if (res.success) {
      setNotice(`Published ${res.publishedCount} result${res.publishedCount === 1 ? "" : "s"} — now visible to students.`);
      setDrawerOpen(false);
      await refresh();
    } else {
      setError(res.error);
    }
    setPublishing(false);
  };

  const draftCount = rows.filter((r) => r.status === "draft").length;
  const atRiskCount = rows.filter((r) => r.final_percentage < CIA_AT_RISK_THRESHOLD).length;
  const missingTotal = rows.reduce((sum, r) => sum + r.missing_count, 0);
  const mode = rows[0]?.computation_mode;

  return (
    <div className="space-y-4">
      {/* ── Action bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleCompute}
          disabled={computing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
        >
          {computing ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />}
          {rows.length > 0 ? "Recompute" : "Compute Results"}
        </button>
        {draftCount > 0 && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            <Send size={15} /> Publish {draftCount} Draft{draftCount === 1 ? "" : "s"}
          </button>
        )}
        {mode && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700">
            {mode === "weighted" ? <Scale size={11} /> : <Sigma size={11} />}
            {mode === "weighted" ? "Weighted by component weightage" : "Raw totals (Σ scored / Σ max)"}
          </span>
        )}
      </div>

      {/* ── Notices ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertTriangle size={13} className="shrink-0" /> {error}
        </div>
      )}
      {notice && !error && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <CheckCircle2 size={13} className="shrink-0" /> {notice}
        </div>
      )}
      {mixedWeightage && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertTriangle size={13} className="shrink-0" />
          Only some components have a weightage, so raw totals were used. Set a weightage on every
          component of this semester to enable weighted scoring.
        </div>
      )}
      {missingTotal > 0 && rows.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <ShieldAlert size={13} className="shrink-0" />
          {missingTotal} mark entr{missingTotal === 1 ? "y is" : "ies are"} missing across this scope —
          missing marks count as 0. Consider completing marks entry before publishing.
        </div>
      )}

      {/* ── Results table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          No results computed yet for this department / semester. Click “Compute Results” to run the engine.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/60">
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Roll No</th>
                <th className="px-3 py-2 font-semibold">Student</th>
                <th className="px-3 py-2 font-semibold text-right">Final CIA %</th>
                <th className="px-3 py-2 font-semibold text-right">Missing</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-slate-50 ${r.final_percentage < CIA_AT_RISK_THRESHOLD ? "bg-rose-50/50" : ""}`}>
                  <td className="px-3 py-2 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 tabular-nums">{r.roll_number ?? "—"}</td>
                  <td className="px-3 py-2 text-xs font-medium text-slate-800">
                    <span className="flex items-center gap-1.5">
                      {r.full_name}
                      {r.final_percentage < CIA_AT_RISK_THRESHOLD && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-600 uppercase">At risk</span>
                      )}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-xs font-bold text-right tabular-nums ${r.final_percentage < CIA_AT_RISK_THRESHOLD ? "text-rose-600" : "text-slate-900"}`}>
                    {r.final_percentage.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-xs text-right tabular-nums">
                    {r.missing_count > 0
                      ? <span className="text-amber-600 font-semibold">{r.missing_count}</span>
                      : <span className="text-slate-300">0</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.status === "published"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Publish confirmation drawer (slides from the right) ── */}
      <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => !publishing && setDrawerOpen(false)}
        />
        {drawerOpen && (
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Publish CIA Results</h3>
              <button onClick={() => !publishing && setDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-sm text-slate-600">
              <p>
                You are about to publish <strong>{draftCount}</strong> draft result{draftCount === 1 ? "" : "s"} for
                semester <strong>{semester}</strong>. Published results become immediately visible to students in
                their portal.
              </p>
              {missingTotal > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>{missingTotal}</strong> mark entr{missingTotal === 1 ? "y is" : "ies are"} still missing and
                    counted as 0 in the published percentages.
                  </span>
                </div>
              )}
              {atRiskCount > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <ShieldAlert size={13} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>{atRiskCount}</strong> student{atRiskCount === 1 ? " is" : "s are"} below the{" "}
                    {CIA_AT_RISK_THRESHOLD}% internal threshold.
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-400">
                Publication is recorded in the audit log. Recomputing later resets results to draft and requires
                publishing again.
              </p>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex justify-end gap-2">
              <button
                onClick={() => setDrawerOpen(false)}
                disabled={publishing}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Publish
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
