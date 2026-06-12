"use client";

import { useEffect, useState } from "react";
import {
  Wand2, Loader2, CheckCircle2, AlertCircle, ChevronDown,
  Clock, Pencil, Check, X, Eye, RotateCcw, Trash2, Upload, TriangleAlert,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fundingTypeShortLabel } from "@/lib/deptFunding";
import {
  generateDepartmentSchedule,
  getDraftSchedule,
  listDraftSchedules,
  deleteDraftSchedule,
  publishDraftSchedule,
  clearDepartmentSchedules,
  type SchedulerResult,
  type DraftScheduleData,
  type DraftSummary,
} from "@/actions/scheduler";
import { DraftPreviewPanel } from "./DraftPreviewPanel";
import { SchedulerStatusBanner } from "./SchedulerStatusBanner";

type Department = { id: string; name: string; session_type?: string | null; funding_type?: string | null };
type Props = { tenantId: string; onPublished?: () => void };
type UIState = "idle" | "loading" | "success" | "error" | "preview_loading" | "preview" | "published";

function fmtIST(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Kolkata", timeZoneName: "short",
  });
}

export function AutoSchedulerButton({ tenantId, onPublished }: Props) {
  // Department selection
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    const supabase = createClient();
    supabase
      .from("departments")
      .select("id, name, session_type, funding_type")
      .eq("institution_id", tenantId)
      .order("name")
      .then(({ data, error }) => {
        if (error) { console.error("AutoScheduler dept fetch error:", error.message); return; }
        if (data) {
          setDepartments(data);
          if (data.length > 0) setSelectedDeptId(data[0].id);
        }
      });
  }, [tenantId]);

  // Year management
  const [savedYears, setSavedYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newYearInput, setNewYearInput] = useState("");
  const [editingYear, setEditingYear] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");

  // Scheduler state
  const [uiState, setUiState] = useState<UIState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [solveTime, setSolveTime] = useState<number | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftData, setDraftData] = useState<DraftScheduleData | null>(null);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);

  // Past schedules
  const [pastDrafts, setPastDrafts] = useState<DraftSummary[]>([]);
  const [draftsExpanded, setDraftsExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  function refreshPastDrafts() {
    if (!tenantId || !selectedDeptId) return;
    listDraftSchedules(tenantId, selectedDeptId).then(({ data }) => setPastDrafts(data));
  }

  useEffect(() => {
    refreshPastDrafts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedDeptId, uiState]);

  // ── Year management ──────────────────────────────────────────────────────

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "__add_new__") { setIsAddingNew(true); setNewYearInput(""); }
    else setSelectedYear(val);
  }

  function handleSaveNew() {
    const trimmed = newYearInput.trim();
    if (!trimmed) return;
    if (!savedYears.includes(trimmed)) setSavedYears((p) => [...p, trimmed]);
    setSelectedYear(trimmed);
    setIsAddingNew(false);
    setNewYearInput("");
  }

  function handleSaveEdit() {
    const trimmed = editInput.trim();
    if (trimmed && trimmed !== editingYear) {
      setSavedYears((p) => p.map((y) => (y === editingYear ? trimmed : y)));
      setSelectedYear(trimmed);
    }
    setEditingYear(null);
    setEditInput("");
  }

  // ── Generate ─────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!selectedYear || !selectedDeptId) return;
    setUiState("loading");
    setStatusMessage("");
    setSolveTime(null);
    setDraftId(null);
    setDraftData(null);

    const result: SchedulerResult = await generateDepartmentSchedule(tenantId, selectedDeptId, selectedYear);

    if (result.success) {
      const label = result.solverStatus === "OPTIMAL" ? "Optimal" : "Feasible";
      setUiState("success");
      setSolveTime(result.solveTime);
      setDraftId(result.draftId);
      setStatusMessage(`${label} schedule generated for "${selectedYear}". Review and publish when ready.`);
    } else {
      setUiState("error");
      setStatusMessage(result.error);
    }
  }

  // ── Preview ──────────────────────────────────────────────────────────────

  async function handlePreview(id?: string) {
    const targetId = id ?? draftId;
    if (!targetId) return;
    setUiState("preview_loading");
    const { data, error } = await getDraftSchedule(targetId);
    if (error || !data) { setUiState("error"); setStatusMessage(error ?? "Could not load schedule."); return; }
    setDraftData(data);
    setDraftId(targetId);
    setUiState("preview");
  }

  function handleBackFromPreview() {
    setUiState(draftId ? "success" : "idle");
  }

  function handlePublished(count: number) {
    setPublishedCount(count);
    setUiState("published");
    onPublished?.();
  }

  // ── Past schedule actions ────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteDraftSchedule(id);
    setDeletingId(null);
    refreshPastDrafts();
  }

  async function handleReset() {
    setResetting(true);
    await clearDepartmentSchedules(tenantId, selectedDeptId);
    setResetting(false);
    setResetConfirm(false);
    setUiState("idle");
    setDraftId(null);
    setDraftData(null);
    refreshPastDrafts();
    onPublished?.();
  }

  async function handleDirectPublish(id: string) {
    setPublishingId(id);
    const result = await publishDraftSchedule(id);
    setPublishingId(null);
    if (result.success) {
      setPublishedCount(result.count);
      setUiState("published");
      onPublished?.();
    } else {
      setStatusMessage(result.error ?? "Publish failed.");
      setUiState("error");
    }
  }

  const isLoading = uiState === "loading";
  const isBusy = isLoading || isAddingNew || !!editingYear;

  // ── Full-panel states ────────────────────────────────────────────────────

  if (uiState === "preview_loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Loading schedule…</span>
      </div>
    );
  }

  if (uiState === "preview" && draftData) {
    return <DraftPreviewPanel draft={draftData} sessionType={departments.find(d => d.id === selectedDeptId)?.session_type ?? "NORMAL"} onBack={handleBackFromPreview} onPublished={handlePublished} />;
  }

  if (uiState === "published") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Published!</p>
          <p className="text-xs text-slate-500 mt-0.5">{publishedCount} class slots added to the calendar.</p>
        </div>
        <button
          onClick={() => { setUiState("idle"); setDraftId(null); setDraftData(null); }}
          className="mt-2 text-xs text-violet-600 hover:underline"
        >
          Generate another schedule
        </button>
      </div>
    );
  }

  // ── Generator form ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* Scheduler offline warning (Phase 2.5C) */}
      <SchedulerStatusBanner />

      {/* Department picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Department</label>
        <div className="relative">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            disabled={isLoading || departments.length === 0}
            className="w-full appearance-none rounded-md border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {departments.length === 0 ? (
              <option value="">{tenantId ? "No departments found" : "Loading…"}</option>
            ) : (
              departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({fundingTypeShortLabel(d.funding_type)})</option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Academic Year picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Academic Year</label>

        {isAddingNew ? (
          <div className="flex items-center gap-1.5">
            <input autoFocus type="text" value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
              placeholder="e.g. 2025-2026"
              className="flex-1 rounded-md border border-violet-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveNew();
                if (e.key === "Escape") { setIsAddingNew(false); setNewYearInput(""); }
              }}
            />
            <button onClick={handleSaveNew} disabled={!newYearInput.trim()} title="Save"
              className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setIsAddingNew(false); setNewYearInput(""); }} title="Cancel"
              className="flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : editingYear ? (
          <div className="flex items-center gap-1.5">
            <input autoFocus type="text" value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              className="flex-1 rounded-md border border-violet-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") { setEditingYear(null); setEditInput(""); }
              }}
            />
            <button onClick={handleSaveEdit} title="Save"
              className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setEditingYear(null); setEditInput(""); }} title="Cancel"
              className="flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <select value={selectedYear} onChange={handleSelectChange} disabled={isLoading}
                className="w-full appearance-none rounded-md border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <option value="" disabled>
                  {savedYears.length === 0 ? "Click '+ Add New' to begin…" : "Select a year…"}
                </option>
                {savedYears.map((y) => <option key={y} value={y}>{y}</option>)}
                <option value="__add_new__">+ Add New</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>
            {selectedYear && (
              <button onClick={() => { setEditingYear(selectedYear); setEditInput(selectedYear); }}
                disabled={isLoading} title="Edit year name"
                className="flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 disabled:opacity-40 transition-colors">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isBusy || !selectedYear || !selectedDeptId}
        className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md shadow-sm transition-all duration-150"
      >
        {isLoading ? (
          <><Loader2 className="w-3 h-3 animate-spin" />Crunching schedule…</>
        ) : uiState === "success" ? (
          <><RotateCcw className="w-3 h-3" />Regenerate</>
        ) : (
          <><Wand2 className="w-3 h-3" />Generate Auto-Schedule</>
        )}
      </button>

      {/* Success banner */}
      {uiState === "success" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-emerald-800">
                {statusMessage || "Schedule draft saved. Review and publish when ready."}
              </span>
              {solveTime !== null && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                  <Clock className="w-2.5 h-2.5" />
                  Solved in {solveTime.toFixed(2)}s
                </span>
              )}
            </div>
          </div>
          <button onClick={() => handlePreview()}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-slate-700 hover:text-violet-700 text-xs font-semibold rounded-md transition-colors">
            <Eye className="w-3 h-3" />
            Preview &amp; Publish Draft
          </button>
        </div>
      )}

      {/* Error banner */}
      {uiState === "error" && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
          <span className="text-xs text-red-800">{statusMessage}</span>
        </div>
      )}

      {/* Past Schedules */}
      {pastDrafts.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setDraftsExpanded(p => !p)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Past Schedules ({pastDrafts.length})
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${draftsExpanded ? "rotate-180" : ""}`} />
          </button>

          {draftsExpanded && (
            <div className="p-2 space-y-2 bg-slate-50">
              {pastDrafts.map((draft) => {
                const isPublished = draft.status === "PUBLISHED";
                return (
                  <div
                    key={draft.id}
                    className={`bg-white rounded-lg border px-3 py-2.5 transition-shadow ${
                      isPublished
                        ? "border-emerald-200 shadow-[0_0_0_3px_rgba(16,185,129,0.15),0_1px_4px_rgba(16,185,129,0.12)]"
                        : "border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-[11px] font-semibold text-slate-800 truncate">{draft.academic_year}</p>
                      <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                        isPublished
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-2.5">
                      {draft.slot_count} slots · {fmtIST(draft.generated_at)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePreview(draft.id)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                      {!isPublished && (
                        <button
                          onClick={() => handleDirectPublish(draft.id)}
                          disabled={publishingId === draft.id}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                        >
                          {publishingId === draft.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Upload className="w-3 h-3" />}
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(draft.id)}
                        disabled={deletingId === draft.id}
                        className="flex items-center justify-center w-6 h-6 ml-auto text-red-400 border border-red-200 rounded-md hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === draft.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Reset — only when at least one published schedule exists */}
      {pastDrafts.some(d => d.status === "PUBLISHED") && (
        <div className="pt-1 border-t border-slate-100">
          {resetConfirm ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-red-700 flex items-center gap-1.5">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                Clear all calendar slots for this department?
              </p>
              <p className="text-[10px] text-red-600">
                This removes every scheduled class and resets all drafts to unpublished. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md transition-colors"
                >
                  {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  {resetting ? "Clearing…" : "Yes, clear all"}
                </button>
                <button
                  onClick={() => setResetConfirm(false)}
                  className="px-3 py-1 text-[11px] font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <TriangleAlert className="w-3.5 h-3.5" />
              Reset All Schedules
            </button>
          )}
        </div>
      )}
    </div>
  );
}
