"use client";

import { Printer } from "lucide-react";
import { fyLabel, fyMonths } from "@/lib/statutoryPayroll";
import type { MonthlyStatutoryDeduction } from "@/types/finance";

type Props = {
  institutionName: string;
  tanNumber:       string | null;
  pfNumber:        string | null;
  fyStart:         number;
  rows:            MonthlyStatutoryDeduction[];
};

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(n);
}

function getStaffGroups(rows: MonthlyStatutoryDeduction[], fyStart: number) {
  const months = fyMonths(fyStart);
  const byStaff = new Map<string, { name: string; empId: string | null; dept: string; regime: string; monthRows: Record<string, MonthlyStatutoryDeduction> }>();

  for (const r of rows) {
    const id = r.staff_id;
    if (!byStaff.has(id)) {
      byStaff.set(id, {
        name:      r.staff?.full_name ?? "—",
        empId:     r.staff?.employee_id ?? null,
        dept:      r.staff?.departments?.name ?? "—",
        regime:    r.tax_regime,
        monthRows: {},
      });
    }
    byStaff.get(id)!.monthRows[r.month] = r;
  }

  return { byStaff, months };
}

type StaffForm16Props = {
  name:       string;
  empId:      string | null;
  dept:       string;
  regime:     string;
  monthRows:  Record<string, MonthlyStatutoryDeduction>;
  months:     string[];
  institutionName: string;
  tanNumber:  string | null;
  fyStart:    number;
};

function StaffForm16({ name, empId, dept, regime, monthRows, months, institutionName, tanNumber, fyStart }: StaffForm16Props) {
  const totals = months.reduce((acc, m) => {
    const r = monthRows[m];
    if (!r) return acc;
    return {
      gross:       acc.gross       + Number(r.gross_salary),
      basic:       acc.basic       + Number(r.basic_salary),
      pf_emp:      acc.pf_emp      + Number(r.pf_employee),
      esi_emp:     acc.esi_emp     + Number(r.esi_employee),
      tds:         acc.tds         + Number(r.tds_deducted),
      net:         acc.net         + Number(r.net_salary),
    };
  }, { gross: 0, basic: 0, pf_emp: 0, esi_emp: 0, tds: 0, net: 0 });

  const fy = fyLabel(fyStart);

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-6 print:break-after-page space-y-4 text-[11px]">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-200 pb-3">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">FORM 16 — PART B (Certificate of Tax Deducted at Source)</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{institutionName}</p>
          <p className="text-xs text-slate-500">TAN: {tanNumber ?? "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-medium">Financial Year</p>
          <p className="text-base font-bold text-slate-800">{fy}</p>
          <p className="text-[10px] text-slate-400">Assessment Year {fyStart + 1}-{String(fyStart + 2).slice(2)}</p>
        </div>
      </div>

      {/* Employee details */}
      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <div>
          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Employee Name</p>
          <p className="font-semibold text-slate-800">{name}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Employee ID</p>
          <p className="font-semibold text-slate-800">{empId ?? "—"}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Department / Tax Regime</p>
          <p className="font-semibold text-slate-800">{dept} · {regime.toUpperCase()} regime</p>
        </div>
      </div>

      {/* Monthly breakdown */}
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Monthly Salary & Deduction Detail</p>
        <table className="w-full text-[10px] border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50">
            <tr>
              {["Month","Gross","Basic","PF (Emp)","ESI (Emp)","TDS","Net Paid"].map(h => (
                <th key={h} className="px-2 py-1.5 text-left font-semibold text-slate-600 border-b border-slate-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map(m => {
              const r = monthRows[m];
              if (!r) return (
                <tr key={m} className="border-b border-slate-100 text-slate-300">
                  <td className="px-2 py-1">{new Date(m + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                  <td colSpan={6} className="px-2 py-1 text-center text-[9px]">—</td>
                </tr>
              );
              return (
                <tr key={m} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-2 py-1">{new Date(m + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                  <td className="px-2 py-1 tabular-nums">{fmtINR(r.gross_salary)}</td>
                  <td className="px-2 py-1 tabular-nums">{fmtINR(r.basic_salary)}</td>
                  <td className="px-2 py-1 tabular-nums text-rose-600">{fmtINR(r.pf_employee)}</td>
                  <td className="px-2 py-1 tabular-nums text-rose-600">{fmtINR(r.esi_employee)}</td>
                  <td className="px-2 py-1 tabular-nums text-rose-600">{fmtINR(r.tds_deducted)}</td>
                  <td className="px-2 py-1 tabular-nums font-semibold text-emerald-700">{fmtINR(r.net_salary)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
            <tr>
              <td className="px-2 py-1.5">Annual Total</td>
              <td className="px-2 py-1.5 tabular-nums">{fmtINR(totals.gross)}</td>
              <td className="px-2 py-1.5 tabular-nums">{fmtINR(totals.basic)}</td>
              <td className="px-2 py-1.5 tabular-nums text-rose-600">{fmtINR(totals.pf_emp)}</td>
              <td className="px-2 py-1.5 tabular-nums text-rose-600">{fmtINR(totals.esi_emp)}</td>
              <td className="px-2 py-1.5 tabular-nums text-rose-600">{fmtINR(totals.tds)}</td>
              <td className="px-2 py-1.5 tabular-nums text-emerald-700">{fmtINR(totals.net)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* TDS summary */}
      <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-3">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">TDS Summary</p>
          {[
            ["Annual Gross Salary",    fmtINR(totals.gross)],
            ["Total PF Deducted (Emp)", fmtINR(totals.pf_emp)],
            ["Total ESI Deducted (Emp)", fmtINR(totals.esi_emp)],
            ["Total TDS Deducted (Sec. 192)", fmtINR(totals.tds)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-0.5 border-b border-slate-100">
              <span className="text-slate-600">{k}</span>
              <span className="font-medium text-slate-800">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-[9px] text-slate-400">This Form 16 Part B is computer-generated by AURA ERP and does not require a physical signature for internal purposes. Official Form 16 must be countersigned by the authorized signatory and issued under TAN {tanNumber ?? "—"}.</p>
        </div>
      </div>
    </div>
  );
}

export function Form16Template({ institutionName, tanNumber, pfNumber: _pfNumber, fyStart, rows }: Props) {
  const { byStaff, months } = getStaffGroups(rows, fyStart);

  if (byStaff.size === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
        No statutory deduction data for this financial year.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Form 16 — FY {fyLabel(fyStart)}
          </p>
          <p className="text-xs text-slate-400">{byStaff.size} employee{byStaff.size !== 1 ? "s" : ""} · {institutionName}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 print:hidden"
        >
          <Printer size={13} /> Print all
        </button>
      </div>

      {Array.from(byStaff.entries()).map(([staffId, staffData]) => (
        <StaffForm16
          key={staffId}
          {...staffData}
          months={months}
          institutionName={institutionName}
          tanNumber={tanNumber}
          fyStart={fyStart}
        />
      ))}
    </div>
  );
}
