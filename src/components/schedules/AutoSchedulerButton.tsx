"use client";

import { useEffect, useState } from "react";
import {
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Clock,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fundingTypeShortLabel } from "@/lib/deptFunding";
import {
  generateDepartmentSchedule,
  type SchedulerResult,
} from "@/actions/scheduler";

type Department = { id: string; name: string; funding_type?: string | null };
type Props = { tenantId: string };
type UIState = "idle" | "loading" | "success" | "error";

export function AutoSchedulerButton({ tenantId }: Props) {
  // Department selection
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    const supabase = createClient();
    supabase
      .from("departments")
      .select("id, name, funding_type")
      .eq("tenant_id", tenantId)
      .order("name")
      .then(({ data }) => {
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

  // ── Year management handlers ──────────────────────────────────────────────

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "__add_new__") {
      setIsAddingNew(true);
      setNewYearInput("");
    } else {
      setSelectedYear(val);
    }
  }

  function handleSaveNew() {
    const trimmed = newYearInput.trim();
    if (!trimmed) return;
    if (!savedYears.includes(trimmed)) {
      setSavedYears((p) => [...p, trimmed]);
    }
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

  // ── Generate ──────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!selectedYear || !selectedDeptId) return;
    setUiState("loading");
    setStatusMessage("");
    setSolveTime(null);

    const result: SchedulerResult = await generateDepartmentSchedule(
      tenantId,
      selectedDeptId,
      selectedYear,
    );

    if (result.success) {
      const label = result.solverStatus === "OPTIMAL" ? "Optimal" : "Feasible";
      setUiState("success");
      setSolveTime(result.solveTime);
      setStatusMessage(
        `${label} schedule saved for ${selectedYear}. Draft: ${result.draftId.slice(0, 8)}…`,
      );
    } else {
      setUiState("error");
      setStatusMessage(result.error);
    }
  }

  const isLoading = uiState === "loading";
  const isBusy = isLoading || isAddingNew || !!editingYear;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* Department picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Department
        </label>
        <div className="relative">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            disabled={isLoading || departments.length === 0}
            className="w-full appearance-none rounded-md border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {departments.length === 0 ? (
              <option value="">Loading departments…</option>
            ) : (
              departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({fundingTypeShortLabel(d.funding_type)})
                </option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Academic Year picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Academic Year
        </label>

        {isAddingNew ? (
          // ── Add new year inline input ──
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
              placeholder="e.g. 2025-2026"
              className="flex-1 rounded-md border border-violet-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveNew();
                if (e.key === "Escape") { setIsAddingNew(false); setNewYearInput(""); }
              }}
            />
            <button
              onClick={handleSaveNew}
              disabled={!newYearInput.trim()}
              title="Save"
              className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setIsAddingNew(false); setNewYearInput(""); }}
              title="Cancel"
              className="flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : editingYear ? (
          // ── Edit existing year inline input ──
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              className="flex-1 rounded-md border border-violet-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") { setEditingYear(null); setEditInput(""); }
              }}
            />
            <button
              onClick={handleSaveEdit}
              title="Save"
              className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setEditingYear(null); setEditInput(""); }}
              title="Cancel"
              className="flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          // ── Normal dropdown + optional edit button ──
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <select
                value={selectedYear}
                onChange={handleSelectChange}
                disabled={isLoading}
                className="w-full appearance-none rounded-md border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <option value="" disabled>
                  {savedYears.length === 0 ? "Click '+ Add New' to begin…" : "Select a year…"}
                </option>
                {savedYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
                <option value="__add_new__">+ Add New</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Edit button — only visible when a year is selected */}
            {selectedYear && (
              <button
                onClick={() => { setEditingYear(selectedYear); setEditInput(selectedYear); }}
                disabled={isLoading}
                title="Edit year name"
                className="flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 disabled:opacity-40 transition-colors"
              >
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
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Crunching schedule…
          </>
        ) : (
          <>
            <Wand2 className="w-3 h-3" />
            Generate Auto-Schedule
          </>
        )}
      </button>

      {/* Success notification */}
      {uiState === "success" && (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-emerald-800">{statusMessage}</span>
            {solveTime !== null && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <Clock className="w-2.5 h-2.5" />
                Solved in {solveTime.toFixed(2)}s
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error notification */}
      {uiState === "error" && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
          <span className="text-xs text-red-800">{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
