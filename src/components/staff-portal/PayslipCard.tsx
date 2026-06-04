"use client";

import { useState } from "react";
import { ChevronDown, Printer } from "lucide-react";
import type { SalarySlip, StaffProfile } from "@/types/staffPortal";

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

type Props = { slip: SalarySlip; staff: StaffProfile };

export function PayslipCard({ slip, staff }: Props) {
  const [expanded, setExpanded] = useState(false);

  const s = slip.salary_structure;
  const gross = s ? s.basic_salary + s.hra + s.ta + s.da + s.other_allowances : 0;
  const deductions = s ? s.pf_deduction + s.esi_deduction + s.tds_deduction + s.other_deductions : 0;

  function handlePrint() {
    if (!s) return;
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Payslip — ${fmtMonth(slip.month)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 12px; }
        th { background: #f8fafc; font-weight: 600; text-align: left; }
        .header { text-align: center; margin-bottom: 24px; }
        .net { font-size: 18px; font-weight: bold; color: #059669; text-align: right; }
      </style>
    </head><body>
      <div class="header">
        <h2>${staff.institutions?.name ?? "Institution"}</h2>
        <h3>Salary Slip — ${fmtMonth(slip.month)}</h3>
        <p>${staff.title ? staff.title + " " : ""}${staff.full_name} | ${staff.designation ?? ""} | ${staff.departments?.name ?? ""}</p>
      </div>
      <table>
        <tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr>
        <tr><td>Basic Salary</td><td>${fmtINR(s.basic_salary)}</td><td>PF</td><td>${fmtINR(s.pf_deduction)}</td></tr>
        <tr><td>HRA</td><td>${fmtINR(s.hra)}</td><td>ESI</td><td>${fmtINR(s.esi_deduction)}</td></tr>
        <tr><td>TA</td><td>${fmtINR(s.ta)}</td><td>TDS</td><td>${fmtINR(s.tds_deduction)}</td></tr>
        <tr><td>DA</td><td>${fmtINR(s.da)}</td><td>Other</td><td>${fmtINR(s.other_deductions)}</td></tr>
        <tr><td>Other Allowances</td><td>${fmtINR(s.other_allowances)}</td><td></td><td></td></tr>
        <tr><th>Gross</th><th>${fmtINR(gross)}</th><th>Total Deductions</th><th>${fmtINR(deductions)}</th></tr>
      </table>
      <p class="net">NET SALARY: ${fmtINR(s.net_salary)}</p>
      <p style="font-size:10px;color:#94a3b8;margin-top:24px;text-align:center;">Computer generated payslip — no signature required</p>
    </body></html>`);
    win.document.close(); win.focus(); win.print(); win.close();
  }

  const statusCls =
    slip.status === "processed" ? "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300 border-emerald-200/60" :
    slip.status === "pending"   ? "bg-amber-100/80 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300 border-amber-200/60" :
    "bg-slate-100/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200";

  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{fmtMonth(slip.month)}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {slip.payment_mode?.replace(/_/g, " ") ?? "—"}
              {slip.transaction_ref ? ` · ${slip.transaction_ref}` : ""}
            </p>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCls}`}>
            {slip.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(slip.amount_disbursed)}</span>
          {s && (
            <button type="button" onClick={handlePrint} title="Print payslip"
              className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50/80 dark:hover:bg-violet-900/30 transition-colors">
              <Printer size={13} />
            </button>
          )}
          <button type="button" onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors">
            <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Expanded breakdown */}
      {expanded && s && (
        <div className="px-4 pb-4 border-t border-slate-100/60 dark:border-slate-700/40 grid grid-cols-2 gap-4 pt-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Earnings</p>
            {[["Basic Salary", s.basic_salary], ["HRA", s.hra], ["TA", s.ta], ["DA", s.da], ["Other Allowances", s.other_allowances]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between py-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{k}</span>
                <span className="text-[11px] text-slate-700 dark:text-slate-300 tabular-nums">{fmtINR(v as number)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1 border-t border-slate-100 dark:border-slate-700 mt-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Gross</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtINR(gross)}</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Deductions</p>
            {[["PF", s.pf_deduction], ["ESI", s.esi_deduction], ["TDS", s.tds_deduction], ["Other", s.other_deductions]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between py-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{k}</span>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 tabular-nums">-{fmtINR(v as number)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1 border-t border-slate-100 dark:border-slate-700 mt-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total</span>
              <span className="text-xs font-bold text-rose-500 dark:text-rose-400 tabular-nums">-{fmtINR(deductions)}</span>
            </div>
          </div>
          <div className="col-span-2 flex justify-between items-center px-3 py-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Net Salary</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{fmtINR(s.net_salary)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
