"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users, CheckCircle2, Clock, XCircle, PauseCircle,
  AlertTriangle, Pencil, IndianRupee, Zap, ChevronRight,
  CheckSquare, Square,
  type LucideIcon,
} from "lucide-react";
import { SalaryStructureDrawer }    from "@/components/finance/SalaryStructureDrawer";
import { ProcessDisbursementModal } from "@/components/finance/ProcessDisbursementModal";
import { BulkDisbursementModal }    from "@/components/finance/BulkDisbursementModal";
import {
  getSalaryStructures, getStaffWithoutSalaryStructure, getDisbursements,
  generateMonthlyDisbursements,
} from "@/actions/salary";
import type {
  SalaryStructure, SalaryDisbursement, SalarySummary,
  StaffWithoutSalary, DisbursementStatus, DisbursementMode,
} from "@/types/finance";

// ── Badge configs ─────────────────────────────────────────────────────────────

type StatusCfg = { Icon: LucideIcon; cls: string; label: string };
const STATUS_CFG: Record<DisbursementStatus, StatusCfg> = {
  pending:   { Icon: Clock,        label: "Pending",   cls: "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40" },
  processed: { Icon: CheckCircle2, label: "Processed", cls: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40" },
  failed:    { Icon: XCircle,      label: "Failed",    cls: "bg-rose-100/80 text-rose-700 border-rose-200/60 dark:bg-rose-900/25 dark:text-rose-300 dark:border-rose-800/40" },
  on_hold:   { Icon: PauseCircle,  label: "On Hold",   cls: "bg-slate-100/80 text-slate-600 border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
};

const MODE_CLS: Record<DisbursementMode, string> = {
  bank_transfer: "bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/25 dark:text-blue-300 dark:border-blue-800/40",
  neft:          "bg-cyan-100/80 text-cyan-700 border-cyan-200/60 dark:bg-cyan-900/25 dark:text-cyan-300 dark:border-cyan-800/40",
  rtgs:          "bg-violet-100/80 text-violet-700 border-violet-200/60 dark:bg-violet-900/25 dark:text-violet-300 dark:border-violet-800/40",
  cheque:        "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40",
  cash:          "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40",
};
const MODE_LBL: Record<DisbursementMode, string> = {
  bank_transfer: "Bank Transfer", neft: "NEFT", rtgs: "RTGS", cheque: "Cheque", cash: "Cash",
};

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Drawer state union ────────────────────────────────────────────────────────

type DrawerState =
  | { mode: "create"; staff: StaffWithoutSalary }
  | { mode: "edit";   structure: SalaryStructure }
  | null;

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  institutionId:    string;
  initialStructures: SalaryStructure[];
  initialStaffWithout: StaffWithoutSalary[];
  initialDisbursements: SalaryDisbursement[];
  summary:           SalarySummary;
  currentMonth:      string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SalaryClient({
  institutionId,
  initialStructures,
  initialStaffWithout,
  initialDisbursements,
  summary: initialSummary,
  currentMonth,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── Tab ────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"structures" | "disbursements">("structures");

  // ── Structures tab ─────────────────────────────────────────────────────
  const [structures,  setStructures]  = useState(initialStructures);
  const [staffWithout, setStaffWithout] = useState(initialStaffWithout);
  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [summary,     setSummary]     = useState(initialSummary);

  // ── Disbursements tab ──────────────────────────────────────────────────
  const [month,        setMonth]        = useState(currentMonth);
  const [disbursements, setDisbursements] = useState(initialDisbursements);
  const [fetchingDisb,  setFetchingDisb]  = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [generateMsg,   setGenerateMsg]   = useState("");
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [processTarget, setProcessTarget] = useState<SalaryDisbursement | null>(null);
  const [bulkOpen,      setBulkOpen]      = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────
  const pending   = disbursements.filter(d => d.status === "pending");
  const processed = disbursements.filter(d => d.status === "processed");
  const onHold    = disbursements.filter(d => d.status === "on_hold");

  const selectedPending = useMemo(
    () => pending.filter(d => selectedIds.has(d.id)),
    [pending, selectedIds]
  );

  const drawerStaff: { id: string; full_name: string; title: string | null; designation: string | null } | null =
    drawerState?.mode === "create"
      ? { id: drawerState.staff.id, full_name: drawerState.staff.full_name, title: drawerState.staff.title, designation: drawerState.staff.designation }
      : drawerState?.mode === "edit"
        ? { id: drawerState.structure.staff_id, full_name: drawerState.structure.staff?.full_name ?? "", title: drawerState.structure.staff?.title ?? null, designation: drawerState.structure.staff?.designation ?? null }
        : null;

  // ── Handlers ───────────────────────────────────────────────────────────

  async function refreshStructures() {
    const [sRes, wRes] = await Promise.all([
      getSalaryStructures(institutionId),
      getStaffWithoutSalaryStructure(institutionId),
    ]);
    if (sRes.success) setStructures(sRes.data);
    if (wRes.success) setStaffWithout(wRes.data);
    router.refresh();
  }

  async function fetchDisbursementsForMonth(m: string) {
    setFetchingDisb(true);
    const res = await getDisbursements(institutionId, m);
    setFetchingDisb(false);
    if (res.success) { setDisbursements(res.data); setSelectedIds(new Set()); }
  }

  function handleMonthChange(m: string) {
    setMonth(m); setGenerateMsg("");
    startTransition(() => { fetchDisbursementsForMonth(m); });
  }

  async function handleGenerate() {
    setGenerating(true); setGenerateMsg("");
    const res = await generateMonthlyDisbursements(institutionId, month);
    setGenerating(false);

    if (!res.success) { setGenerateMsg(`Error: ${res.error}`); return; }
    const { generated, skipped } = res.data;
    setGenerateMsg(
      generated > 0
        ? `✓ Generated ${generated} disbursement${generated !== 1 ? "s" : ""}${skipped > 0 ? ` · ${skipped} already existed` : ""}.`
        : `All ${skipped} staff already have disbursements for ${month}.`
    );
    await fetchDisbursementsForMonth(month);
    router.refresh();
  }

  // Checkbox helpers
  function toggleId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAllPending() {
    if (selectedIds.size === pending.length) { setSelectedIds(new Set()); }
    else { setSelectedIds(new Set(pending.map(d => d.id))); }
  }
  const allPendingSelected = pending.length > 0 && selectedIds.size === pending.length;

  // ── Render ─────────────────────────────────────────────────────────────

  const cardCls = "px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm";

  return (
    <div className="flex flex-col gap-4 px-6 pt-6 pb-6 h-full overflow-y-auto">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Salary Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure salary structures and process monthly disbursements.
          </p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-0 border-b border-slate-200/80 dark:border-slate-700/60 shrink-0">
        {(["structures", "disbursements"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px whitespace-nowrap ${
              tab === t
                ? "border-violet-600 text-violet-700 dark:text-violet-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t === "structures" ? "Salary Structures" : "Monthly Disbursements"}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1 — SALARY STRUCTURES
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "structures" && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
            {[
              { label: "Total Active Staff", value: summary.totalStaff, sub: "currently employed", cls: "border-violet-200/60 dark:border-violet-800/40", txt: "text-violet-700 dark:text-violet-400" },
              { label: "Structures Configured", value: summary.structuresSetup, sub: "with salary setup", cls: "border-emerald-200/60 dark:border-emerald-800/40", txt: "text-emerald-700 dark:text-emerald-400" },
              { label: "Without Structure", value: staffWithout.length, sub: staffWithout.length > 0 ? "⚠ needs attention" : "none outstanding", cls: staffWithout.length > 0 ? "border-amber-200/60 dark:border-amber-800/40" : "border-slate-200/60 dark:border-slate-700/40", txt: staffWithout.length > 0 ? "text-amber-700 dark:text-amber-400" : "text-slate-600 dark:text-slate-400" },
              { label: "Total Monthly Payroll", value: fmtINR(summary.totalPayroll), sub: "sum of all net salaries", cls: "border-blue-200/60 dark:border-blue-800/40", txt: "text-blue-700 dark:text-blue-400" },
            ].map(s => (
              <div key={s.label} className={`${cardCls} ${s.cls}`}>
                <p className={`text-base font-bold leading-tight ${s.txt}`}>{s.value}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Staff without salary — warning section */}
          {staffWithout.length > 0 && (
            <div className="shrink-0 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/15 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200/60 dark:border-amber-800/40">
                <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {staffWithout.length} staff member{staffWithout.length !== 1 ? "s" : ""} without a salary structure
                </p>
              </div>
              <div className="divide-y divide-amber-200/40 dark:divide-amber-800/30">
                {staffWithout.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors">
                    <div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {s.title ? `${s.title} ` : ""}{s.full_name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {[s.designation, s.departments?.name].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDrawerState({ mode: "create", staff: s })}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/30 border border-amber-300/60 dark:border-amber-700/40 rounded-md hover:bg-amber-200/60 dark:hover:bg-amber-900/50 transition-colors"
                    >
                      Setup Salary <ChevronRight size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Structures table */}
          {structures.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/20 py-16">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No salary structures yet</p>
                <p className="text-xs text-slate-400 mt-1">Set up salary structures from the warning section above.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                    {["Staff", "Designation", "Basic", "Allowances", "Deductions", "Net Salary", "Effective", ""].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                  {structures.map(s => {
                    const allowances = Number(s.hra) + Number(s.ta) + Number(s.da) + Number(s.other_allowances);
                    const deductions = Number(s.pf_deduction) + Number(s.esi_deduction) + Number(s.tds_deduction) + Number(s.other_deductions);
                    return (
                      <tr key={s.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                            {s.staff?.title ? `${s.staff.title} ` : ""}{s.staff?.full_name ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                            {s.staff?.designation ?? "—"}
                          </p>
                          {s.staff?.departments?.name && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{s.staff.departments.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums">{fmtINR(Number(s.basic_salary))}</td>
                        <td className="px-4 py-3 text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">+{fmtINR(allowances)}</td>
                        <td className="px-4 py-3 text-xs text-rose-500 dark:text-rose-400 tabular-nums">-{fmtINR(deductions)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtINR(Number(s.net_salary))}</span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{fmtDate(s.effective_from)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setDrawerState({ mode: "edit", structure: s })}
                            title="Edit"
                            className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50/80 dark:hover:bg-violet-900/30 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Pencil size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2 — MONTHLY DISBURSEMENTS
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "disbursements" && (
        <>
          {/* Month selector + generate */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <input
              type="month"
              value={month}
              onChange={e => handleMonthChange(e.target.value)}
              className="px-3 py-1.5 bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-400 backdrop-blur-sm"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 border border-violet-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {generating ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Zap size={13} strokeWidth={2.5} />}
              Generate Disbursements
            </button>
            {generateMsg && (
              <p className={`text-xs ${generateMsg.startsWith("Error") ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {generateMsg}
              </p>
            )}
          </div>

          {/* Disbursement summary counts */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            {[
              { label: "Pending",   count: pending.length,   cls: "border-amber-200/60 dark:border-amber-800/40",   txt: "text-amber-700 dark:text-amber-400" },
              { label: "Processed", count: processed.length, cls: "border-emerald-200/60 dark:border-emerald-800/40", txt: "text-emerald-700 dark:text-emerald-400" },
              { label: "On Hold",   count: onHold.length,    cls: "border-slate-200/60 dark:border-slate-700/40",   txt: "text-slate-600 dark:text-slate-400" },
            ].map(c => (
              <div key={c.label} className={`${cardCls} ${c.cls}`}>
                <p className={`text-xl font-black ${c.txt}`}>{c.count}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 rounded-xl bg-violet-50/80 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/40 backdrop-blur-sm">
              <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                {selectedIds.size} selected · {fmtINR(selectedPending.reduce((s, d) => s + Number(d.amount_disbursed), 0))} total
              </p>
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm"
              >
                Process All Selected
              </button>
            </div>
          )}

          {/* Disbursements table */}
          {fetchingDisb ? (
            <div className="flex items-center justify-center h-32">
              <span className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : disbursements.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/20 py-16">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No disbursements for {month}</p>
                <p className="text-xs text-slate-400 mt-1">Click &#34;Generate Disbursements&#34; to create pending rows for all active staff.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                    <th className="px-4 py-2.5 w-10">
                      <button type="button" onClick={toggleAllPending} className="text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                        {allPendingSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                    </th>
                    {["Staff", "Net Salary", "Mode", "Status", "Transaction Ref", "Disbursed At", ""].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                  {disbursements.map(d => {
                    const sc        = STATUS_CFG[d.status];
                    const isPending = d.status === "pending";
                    return (
                      <tr key={d.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          {isPending ? (
                            <button type="button" onClick={() => toggleId(d.id)} className="text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                              {selectedIds.has(d.id) ? <CheckSquare size={14} className="text-violet-600 dark:text-violet-400" /> : <Square size={14} />}
                            </button>
                          ) : <span className="w-3.5 inline-block" />}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                            {d.staff?.title ? `${d.staff.title} ` : ""}{d.staff?.full_name ?? "—"}
                          </p>
                          {d.staff?.designation && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{d.staff.designation}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtINR(Number(d.amount_disbursed))}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${MODE_CLS[d.payment_mode]}`}>
                            {MODE_LBL[d.payment_mode]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.cls}`}>
                            <sc.Icon size={10} /> {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {d.transaction_ref ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {fmtDate(d.disbursed_at)}
                        </td>
                        <td className="px-4 py-3">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => setProcessTarget(d)}
                              title="Process"
                              className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      <SalaryStructureDrawer
        isOpen={drawerState !== null}
        institutionId={institutionId}
        mode={drawerState?.mode ?? "create"}
        staff={drawerStaff}
        existing={drawerState?.mode === "edit" ? drawerState.structure : null}
        onClose={() => setDrawerState(null)}
        onSuccess={refreshStructures}
      />

      <ProcessDisbursementModal
        isOpen={processTarget !== null}
        disbursement={processTarget}
        institutionId={institutionId}
        onClose={() => setProcessTarget(null)}
        onSuccess={() => fetchDisbursementsForMonth(month)}
      />

      <BulkDisbursementModal
        isOpen={bulkOpen}
        disbursements={selectedPending}
        institutionId={institutionId}
        onClose={() => { setBulkOpen(false); setSelectedIds(new Set()); }}
        onSuccess={() => fetchDisbursementsForMonth(month)}
      />
    </div>
  );
}
