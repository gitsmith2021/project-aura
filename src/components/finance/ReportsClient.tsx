"use client";

import { useState, useTransition } from "react";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PLChart } from "@/components/finance/PLChart";
import { ExportButton } from "@/components/finance/ExportButton";
import { ReportFilters } from "@/components/finance/ReportFilters";
import { getMonthlyPLReport, getStudentFeeReport, getSalaryDisbursementReport, getFinancialSummaryReport } from "@/actions/reports";
import type { MonthlyPLData, StudentFeeReportRow, SalaryReportRow, FinancialSummary } from "@/types/finance";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

const cardCls = "px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm";

const AY_OPTIONS  = ["2024-25", "2025-26", "2026-27", "2027-28"];
const YEARS       = ["2024", "2025", "2026", "2027"];
const PAGE_SIZE   = 20;

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  institutionId: string;
  departments:   { id: string; name: string }[];
  initialPL:     MonthlyPLData[];
  initialSummary: FinancialSummary;
  currentYear:   string;
  currentMonth:  string;
  currentAY:     string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsClient({
  institutionId, departments,
  initialPL, initialSummary,
  currentYear, currentMonth, currentAY,
}: Props) {
  const [, startTransition] = useTransition();

  // ── Tab state ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"pl" | "fees" | "salary">("pl");

  // ── Tab 1: P&L ─────────────────────────────────────────────────────────
  const [plYear,    setPlYear]    = useState(currentYear);
  const [plData,    setPlData]    = useState<MonthlyPLData[]>(initialPL);
  const [summary,   setSummary]   = useState<FinancialSummary>(initialSummary);
  const [fetchingPL, setFetchingPL] = useState(false);

  // ── Tab 2: Student Fees ────────────────────────────────────────────────
  const [feeRows,      setFeeRows]      = useState<StudentFeeReportRow[]>([]);
  const [feeFetched,   setFeeFetched]   = useState(false);
  const [fetchingFees, setFetchingFees] = useState(false);
  const [feeAY,        setFeeAY]        = useState(currentAY);
  const [feeDept,      setFeeDept]      = useState("");
  const [feeStatus,    setFeeStatus]    = useState<"" | "fully_paid" | "partially_paid" | "unpaid">("");
  const [feePage,      setFeePage]      = useState(1);

  // ── Tab 3: Salary ──────────────────────────────────────────────────────
  const [salRows,      setSalRows]      = useState<SalaryReportRow[]>([]);
  const [salFetched,   setSalFetched]   = useState(false);
  const [fetchingSal,  setFetchingSal]  = useState(false);
  const [salMonth,     setSalMonth]     = useState(currentMonth);
  const [salDept,      setSalDept]      = useState("");
  const [salStatus,    setSalStatus]    = useState("");

  // ── Computed: P&L aggregates ───────────────────────────────────────────
  const annualIncome  = plData.reduce((s, m) => s + m.income, 0);
  const annualExpend  = plData.reduce((s, m) => s + m.expenses + m.salary, 0);
  const annualNet     = annualIncome - annualExpend;

  // ── Computed: fee pagination ───────────────────────────────────────────
  const feeTotalPages = Math.max(1, Math.ceil(feeRows.length / PAGE_SIZE));
  const feePagedRows  = feeRows.slice((feePage - 1) * PAGE_SIZE, feePage * PAGE_SIZE);

  const feeFullyPaid  = feeRows.filter(r => r.status === "fully_paid").length;
  const feePart       = feeRows.filter(r => r.status === "partially_paid").length;
  const feeUnpaid     = feeRows.filter(r => r.status === "unpaid").length;
  const feeTotalDue   = feeRows.reduce((s, r) => s + r.balance_due, 0);
  const feeTotalColl  = feeRows.reduce((s, r) => s + r.total_paid, 0);

  // ── Computed: salary summary ───────────────────────────────────────────
  const salProcessed  = salRows.filter(r => r.disbursement_status === "processed").length;
  const salPending    = salRows.filter(r => r.disbursement_status === "pending" || !r.disbursement_status).length;
  const salDisbursed  = salRows.filter(r => r.disbursement_status === "processed").reduce((s, r) => s + r.net_salary, 0);

  const salPieData = [
    { name: "Processed", value: salProcessed,        color: "#10b981" },
    { name: "Pending",   value: salPending,           color: "#f59e0b" },
    { name: "On Hold",   value: salRows.filter(r => r.disbursement_status === "on_hold").length, color: "#94a3b8" },
  ].filter(d => d.value > 0);

  // ── Data fetchers ──────────────────────────────────────────────────────

  async function fetchPL(year: string) {
    setFetchingPL(true);
    const [plRes, sumRes] = await Promise.all([
      getMonthlyPLReport(institutionId, year),
      getFinancialSummaryReport(institutionId, { from: `${year}-01-01`, to: `${year}-12-31` }),
    ]);
    setFetchingPL(false);
    if (plRes.success)  setPlData(plRes.data);
    if (sumRes.success) setSummary(sumRes.data);
  }

  async function fetchFees(ay: string, dept: string, status: string) {
    setFetchingFees(true); setFeeFetched(true);
    const res = await getStudentFeeReport(institutionId, {
      academicYear: ay   || undefined,
      departmentId: dept || undefined,
      status:       (status as "fully_paid" | "partially_paid" | "unpaid") || undefined,
    });
    setFetchingFees(false);
    if (res.success) { setFeeRows(res.data); setFeePage(1); }
  }

  async function fetchSalary(month: string, dept: string, status: string) {
    setFetchingSal(true); setSalFetched(true);
    const res = await getSalaryDisbursementReport(institutionId, {
      month:        month  || undefined,
      departmentId: dept   || undefined,
      status:       status || undefined,
    });
    setFetchingSal(false);
    if (res.success) setSalRows(res.data);
  }

  function handleTabChange(t: typeof tab) {
    setTab(t);
    if (t === "fees"   && !feeFetched) startTransition(() => fetchFees(feeAY, feeDept, feeStatus));
    if (t === "salary" && !salFetched) startTransition(() => fetchSalary(salMonth, salDept, salStatus));
  }

  // ── Export serializers ─────────────────────────────────────────────────

  const plExport = plData.map(m => ({
    Month: m.month, Income: m.income, Expenses: m.expenses, Salary: m.salary, Net: m.net,
  }));

  const feeExport = feeRows.map(r => ({
    "Roll No": r.roll_no ?? "",
    Name: r.full_name,
    Program: r.student_program ?? "",
    Year: r.student_year ?? "",
    Department: r.department_name ?? "",
    "Total Due": r.total_due,
    "Total Paid": r.total_paid,
    "Balance Due": r.balance_due,
    Status: r.status,
  }));

  const salExport = salRows.map(r => ({
    Name: `${r.title ? r.title + " " : ""}${r.full_name}`,
    Designation: r.designation ?? "",
    Department: r.department_name ?? "",
    "Net Salary": r.net_salary,
    Status: r.disbursement_status ?? "Not Generated",
    "Disbursed At": r.disbursed_at ? new Date(r.disbursed_at).toLocaleDateString("en-IN") : "",
    "Transaction Ref": r.transaction_ref ?? "",
  }));

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 px-6 pt-6 pb-6 h-full overflow-y-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Finance Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Comprehensive financial analytics and export.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-slate-200/80 dark:border-slate-700/60 shrink-0">
        {([
          { key: "pl",     label: "P&L Summary" },
          { key: "fees",   label: "Student Fees" },
          { key: "salary", label: "Salary Report" },
        ] as const).map(t => (
          <button key={t.key} type="button" onClick={() => handleTabChange(t.key)}
            className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px whitespace-nowrap ${
              tab === t.key
                ? "border-violet-600 text-violet-700 dark:text-violet-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1 — P&L SUMMARY
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "pl" && (
        <>
          {/* Year + export */}
          <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Year</label>
              <select
                value={plYear}
                onChange={e => { setPlYear(e.target.value); startTransition(() => fetchPL(e.target.value)); }}
                className="px-2.5 py-1.5 bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-400 backdrop-blur-sm appearance-none cursor-pointer"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <ExportButton data={plExport} filename={`pl-report-${plYear}`} reportTitle={`P&L Summary ${plYear}`} />
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
            <div className={`${cardCls} border-emerald-200/60 dark:border-emerald-800/40`}>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(annualIncome)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Annual Income</p>
            </div>
            <div className={`${cardCls} border-rose-200/60 dark:border-rose-800/40`}>
              <p className="text-base font-bold text-rose-600 dark:text-rose-400">{fmtINR(annualExpend)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Annual Expenditure</p>
            </div>
            <div className={`${cardCls} ${annualNet >= 0 ? "border-violet-200/60 dark:border-violet-800/40" : "border-rose-200/60 dark:border-rose-800/40"}`}>
              <p className={`text-base font-bold ${annualNet >= 0 ? "text-violet-700 dark:text-violet-400" : "text-rose-600 dark:text-rose-400"}`}>
                {fmtINR(annualNet)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Net {annualNet >= 0 ? "Surplus" : "Deficit"}</p>
            </div>
            <div className={`${cardCls} border-amber-200/60 dark:border-amber-800/40`}>
              <p className="text-base font-bold text-amber-700 dark:text-amber-400">{fmtPct(summary.feeCollectionRate)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Fee Collection Rate</p>
              <p className="text-[10px] text-slate-400 mt-0.5">All time</p>
            </div>
          </div>

          {/* Chart */}
          {fetchingPL ? (
            <div className="flex items-center justify-center h-40">
              <span className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-4">Monthly P&L — {plYear}</h3>
              <PLChart data={plData} />
            </div>
          )}

          {/* Monthly table */}
          <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                  {["Month","Income","Expenses","Salary","Net P&L","Status"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                {plData.map(m => (
                  <tr key={m.month} className="hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">{m.month}</td>
                    <td className="px-4 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtINR(m.income)}</td>
                    <td className="px-4 py-2.5 text-xs text-rose-500 dark:text-rose-400 tabular-nums">{fmtINR(m.expenses)}</td>
                    <td className="px-4 py-2.5 text-xs text-blue-600 dark:text-blue-400 tabular-nums">{fmtINR(m.salary)}</td>
                    <td className="px-4 py-2.5 text-xs font-bold tabular-nums">
                      <span className={m.net >= 0 ? "text-violet-700 dark:text-violet-400" : "text-rose-600 dark:text-rose-400"}>
                        {m.net >= 0 ? "+" : ""}{fmtINR(m.net)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {m.income > 0 || m.expenses > 0 || m.salary > 0 ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          m.net >= 0
                            ? "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40"
                            : "bg-rose-100/80 text-rose-700 border-rose-200/60 dark:bg-rose-900/25 dark:text-rose-300 dark:border-rose-800/40"
                        }`}>
                          {m.net >= 0 ? "SURPLUS" : "DEFICIT"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2 — STUDENT FEE REPORT
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "fees" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
            <ReportFilters
              filters={[
                { type: "year",   key: "ay",     label: "Academic Year", value: feeAY,     options: AY_OPTIONS },
                { type: "select", key: "dept",   label: "Department",    value: feeDept,   options: departments.map(d => ({ value: d.id, label: d.name })) },
                { type: "status", key: "status", label: "Status",        value: feeStatus, options: [{ value: "fully_paid", label: "Fully Paid" }, { value: "partially_paid", label: "Partial" }, { value: "unpaid", label: "Unpaid" }] },
              ]}
              onChange={(key, value) => {
                let ay = feeAY, dept = feeDept, status = feeStatus;
                if (key === "ay")     { ay = value;     setFeeAY(value); }
                if (key === "dept")   { dept = value;   setFeeDept(value); }
                if (key === "status") { const s = value as "" | "fully_paid" | "partially_paid" | "unpaid"; status = s; setFeeStatus(s); }
                startTransition(() => fetchFees(ay, dept, status));
              }}
              onReset={() => { setFeeAY(currentAY); setFeeDept(""); setFeeStatus(""); startTransition(() => fetchFees(currentAY, "", "")); }}
            />
            <ExportButton data={feeExport} filename={`fee-report-${feeAY}`} reportTitle={`Student Fee Report ${feeAY}`} />
          </div>

          {/* Summary cards */}
          {feeFetched && !fetchingFees && (
            <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 shrink-0">
              {[
                { label: "Total Students", value: feeRows.length, cls: "border-violet-200/60 dark:border-violet-800/40", txt: "text-violet-700 dark:text-violet-400" },
                { label: "Fully Paid",     value: feeFullyPaid,   cls: "border-emerald-200/60 dark:border-emerald-800/40", txt: "text-emerald-700 dark:text-emerald-400" },
                { label: "Partial",        value: feePart,        cls: "border-amber-200/60 dark:border-amber-800/40", txt: "text-amber-700 dark:text-amber-400" },
                { label: "Unpaid",         value: feeUnpaid,      cls: "border-rose-200/60 dark:border-rose-800/40", txt: "text-rose-600 dark:text-rose-400" },
                { label: "Outstanding",    value: fmtINR(feeTotalDue), cls: "border-rose-200/60 dark:border-rose-800/40", txt: "text-rose-600 dark:text-rose-400" },
                { label: "Collected",      value: fmtINR(feeTotalColl), cls: "border-emerald-200/60 dark:border-emerald-800/40", txt: "text-emerald-700 dark:text-emerald-400" },
              ].map(s => (
                <div key={s.label} className={`${cardCls} ${s.cls}`}>
                  <p className={`text-sm font-bold ${s.txt} leading-tight`}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {fetchingFees ? (
            <div className="flex items-center justify-center h-32"><span className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" /></div>
          ) : !feeFetched ? (
            <div className="flex items-center justify-center h-32 text-xs text-slate-400">Loading…</div>
          ) : feeRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Users className="w-8 h-8 opacity-30" />
              <p>No student fee data found.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                      {["Roll No","Name","Program","Department","Total Due","Paid","Balance","Last Payment","Status"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                    {feePagedRows.map(r => (
                      <tr key={r.student_id} className={`transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-900/10 ${
                        r.status === "fully_paid" ? "bg-emerald-50/20 dark:bg-emerald-900/5" :
                        r.status === "partially_paid" ? "bg-amber-50/20 dark:bg-amber-900/5" :
                        r.balance_due > 0 ? "bg-rose-50/20 dark:bg-rose-900/5" : ""
                      }`}>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500 font-mono">{r.roll_no ?? "—"}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 max-w-[140px] truncate">{r.full_name}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500">
                          {r.student_program ? `${r.student_program}${r.student_year ? ` Y${r.student_year}` : ""}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500 max-w-[100px] truncate">{r.department_name ?? "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 tabular-nums">{fmtINR(r.total_due)}</td>
                        <td className="px-3 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtINR(r.total_paid)}</td>
                        <td className="px-3 py-2.5 text-xs font-bold tabular-nums">
                          <span className={r.balance_due > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>{fmtINR(r.balance_due)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(r.last_payment_date)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            r.status === "fully_paid"    ? "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40" :
                            r.status === "partially_paid" ? "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40" :
                            "bg-rose-100/80 text-rose-700 border-rose-200/60 dark:bg-rose-900/25 dark:text-rose-300 dark:border-rose-800/40"
                          }`}>
                            {r.status === "fully_paid" ? "PAID" : r.status === "partially_paid" ? "PARTIAL" : "UNPAID"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {feeTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100/60 dark:border-slate-700/40">
                    <p className="text-[11px] text-slate-400">Page {feePage} of {feeTotalPages} · {feeRows.length} students</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setFeePage(p => Math.max(1, p - 1))} disabled={feePage <= 1}
                        className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors disabled:opacity-30">
                        <ChevronLeft size={14} />
                      </button>
                      <button onClick={() => setFeePage(p => Math.min(feeTotalPages, p + 1))} disabled={feePage >= feeTotalPages}
                        className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors disabled:opacity-30">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3 — SALARY REPORT
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "salary" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
            <ReportFilters
              filters={[
                { type: "month",  key: "month",  label: "Month",      value: salMonth,  },
                { type: "select", key: "dept",   label: "Department", value: salDept,   options: departments.map(d => ({ value: d.id, label: d.name })) },
                { type: "status", key: "status", label: "Status",     value: salStatus, options: [{ value: "processed", label: "Processed" }, { value: "pending", label: "Pending" }, { value: "on_hold", label: "On Hold" }] },
              ]}
              onChange={(key, value) => {
                let month = salMonth, dept = salDept, status = salStatus;
                if (key === "month")  { month = value;  setSalMonth(value); }
                if (key === "dept")   { dept = value;   setSalDept(value); }
                if (key === "status") { status = value; setSalStatus(value); }
                startTransition(() => fetchSalary(month, dept, status));
              }}
              onReset={() => { setSalMonth(currentMonth); setSalDept(""); setSalStatus(""); startTransition(() => fetchSalary(currentMonth, "", "")); }}
            />
            <ExportButton data={salExport} filename={`salary-report-${salMonth}`} reportTitle={`Salary Disbursement Report ${salMonth}`} />
          </div>

          {/* Summary cards */}
          {salFetched && !fetchingSal && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
              {[
                { label: "Total Staff",    value: salRows.length,     cls: "border-violet-200/60 dark:border-violet-800/40", txt: "text-violet-700 dark:text-violet-400" },
                { label: "Processed",      value: salProcessed,       cls: "border-emerald-200/60 dark:border-emerald-800/40", txt: "text-emerald-700 dark:text-emerald-400" },
                { label: "Pending",        value: salPending,         cls: "border-amber-200/60 dark:border-amber-800/40", txt: "text-amber-700 dark:text-amber-400" },
                { label: "Total Disbursed", value: fmtINR(salDisbursed), cls: "border-blue-200/60 dark:border-blue-800/40", txt: "text-blue-700 dark:text-blue-400" },
              ].map(s => (
                <div key={s.label} className={`${cardCls} ${s.cls}`}>
                  <p className={`text-base font-bold ${s.txt}`}>{s.value}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* This wrapper fills remaining height so the cards are viewport-constrained */}
          <div className="flex-1 min-h-0 overflow-hidden">
          {fetchingSal ? (
            <div className="flex items-center justify-center h-32"><span className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" /></div>
          ) : !salFetched ? (
            <div className="flex items-center justify-center h-32 text-xs text-slate-400">Loading…</div>
          ) : (
            <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Donut chart */}
              {salPieData.length > 0 && (
                <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm p-4 flex flex-col items-center min-h-0 overflow-y-auto custom-scrollbar">
                  <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 shrink-0">Disbursement Status</h3>
                  <div className="shrink-0 w-full">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={salPieData} innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                          {salPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 8, background: "#0f172a", border: "1px solid #334155", color: "#f1f5f9" }}
                          formatter={(v, n) => [Number(v ?? 0), String(n)]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Staff table — flex column with sticky header + scrollable body */}
              <div className={`${salPieData.length > 0 ? "lg:col-span-2" : "lg:col-span-3"} rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm flex flex-col min-h-0 overflow-hidden`}>
                <table className="w-full text-left min-w-[600px] shrink-0">
                  <thead className="bg-white/90 dark:bg-slate-800/90">
                    <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                      {["Staff","Designation","Dept","Net Salary","Status","Disbursed At","Tx Ref"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                </table>
                <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <table className="w-full text-left min-w-[600px]">
                  <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                    {salRows.map(r => (
                      <tr key={r.staff_id} className="hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors">
                        <td className="px-3 py-2.5">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                            {r.title ? `${r.title} ` : ""}{r.full_name}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{r.designation ?? "—"}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[80px]">{r.department_name ?? "—"}</td>
                        <td className="px-3 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtINR(r.net_salary)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            r.disbursement_status === "processed" ? "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40" :
                            r.disbursement_status === "pending"   ? "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40" :
                            r.disbursement_status === "on_hold"   ? "bg-slate-100/80 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" :
                            "bg-slate-100/80 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                          }`}>
                            {r.disbursement_status?.toUpperCase() ?? "N/A"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(r.disbursed_at)}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500 font-mono truncate max-w-[100px]">{r.transaction_ref ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}
          </div>
        </>
      )}

    </div>
  );
}
